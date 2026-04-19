import type OpenAI from "openai";
import { z } from "zod";
import { getOpenAI, DEFAULT_MODEL } from "@/lib/openai/instance";
import {
  recordTrace,
  type TraceCtx,
  withTrace,
} from "@/lib/observability/trace";
import {
  dispatchTool,
  type ToolContext,
  type ToolDispatchInfo,
} from "@/lib/openai/tools";

// Re-export the singleton getter so existing imports of `getOpenAI` from
// "@/lib/openai/client" keep working.
export { getOpenAI, DEFAULT_MODEL };

export async function completeJson<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  model?: string;
  traceCtx?: TraceCtx;
}): Promise<T> {
  const openai = getOpenAI();
  const model = opts.model ?? DEFAULT_MODEL;

  const first = await withTrace(
    { ...opts.traceCtx, model, attempt: 1 },
    () =>
      openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.user },
        ],
        temperature: 0.4,
      }),
    (res) => ({
      okSchema: tryParse(opts.schema, res.choices[0]?.message?.content ?? "{}").ok,
      excerpt: res.choices[0]?.message?.content?.slice(0, 500) ?? "",
      usage: res.usage ?? undefined,
    }),
  );

  const raw = first.choices[0]?.message?.content ?? "{}";
  const parsed = tryParse(opts.schema, raw);
  if (parsed.ok) return parsed.data;

  const repair = await withTrace(
    { ...opts.traceCtx, model, attempt: 2 },
    () =>
      openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Fix the JSON to satisfy the schema. Output JSON only.",
          },
          {
            role: "user",
            content: `Invalid output:\n${raw}\n\nParse error:\n${parsed.error}\n\nOriginal task context (for repair):\n${opts.user.slice(0, 4000)}`,
          },
        ],
        temperature: 0.2,
      }),
    (res) => ({
      okSchema: tryParse(opts.schema, res.choices[0]?.message?.content ?? "{}").ok,
      excerpt: res.choices[0]?.message?.content?.slice(0, 500) ?? "",
      usage: res.usage ?? undefined,
    }),
  );

  const raw2 = repair.choices[0]?.message?.content ?? "{}";
  const parsed2 = tryParse(opts.schema, raw2);
  if (parsed2.ok) return parsed2.data;
  throw new Error(`Model output failed validation: ${parsed2.error}`);
}

export const MAX_TOOL_HOPS = 3;

/**
 * Tool-calling chat completion. The model decides whether and which of the
 * supplied `tools` to invoke (tool_choice="auto") before producing a final
 * JSON message that is validated against `schema`. Returns the validated
 * structured result and the list of tool invocations that occurred (for
 * tracing / display).
 */
export async function completeJsonWithTools<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  tools: OpenAI.Chat.Completions.ChatCompletionTool[];
  toolContext: ToolContext;
  model?: string;
  maxToolHops?: number;
  traceCtx?: TraceCtx;
  /**
   * Controls how the model is allowed to use tools on the FIRST hop:
   * - "auto" (default): model may or may not call a tool.
   * - "required": model MUST call at least one tool on hop 0.
   * Subsequent hops always fall back to "auto" so the loop can terminate.
   */
  initialToolChoice?: "auto" | "required";
}): Promise<{ data: T; toolCalls: ToolDispatchInfo[] }> {
  const openai = getOpenAI();
  const model = opts.model ?? DEFAULT_MODEL;
  const maxHops = opts.maxToolHops ?? MAX_TOOL_HOPS;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: opts.system },
    { role: "user", content: opts.user },
  ];

  const toolCalls: ToolDispatchInfo[] = [];
  let finalContent: string | null = null;

  for (let hop = 0; hop <= maxHops; hop++) {
    // On the last allowed iteration, force a final message so we never get
    // stuck looping on tool_calls.
    const forceFinal = hop === maxHops;
    const toolChoice =
      hop === 0 && opts.initialToolChoice === "required" ? "required" : "auto";

    const res = await withTrace(
      {
        ...opts.traceCtx,
        model,
        attempt: 1,
        // intermediate hops get a `_tool_hop` suffix so they don't pollute
        // the per-stage success-rate metric for the synthesis stage itself.
        stage: forceFinal
          ? opts.traceCtx?.stage
          : opts.traceCtx?.stage
            ? `${opts.traceCtx.stage}_tool_hop`
            : undefined,
      },
      () =>
        openai.chat.completions.create({
          model,
          messages,
          temperature: 0.4,
          tools: forceFinal ? undefined : opts.tools,
          tool_choice: forceFinal ? undefined : toolChoice,
          response_format: forceFinal ? { type: "json_object" } : undefined,
        }),
      (resp) => {
        const m = resp.choices[0]?.message;
        const hasTools = (m?.tool_calls?.length ?? 0) > 0;
        // Only schema-check when this hop returned a final JSON message.
        const okSchema = hasTools
          ? true
          : tryParse(opts.schema, m?.content ?? "{}").ok;
        return {
          okSchema,
          excerpt: hasTools
            ? `[tool_calls=${m?.tool_calls?.length ?? 0}]`
            : (m?.content ?? "").slice(0, 500),
          usage: resp.usage ?? undefined,
        };
      },
    );

    const msg = res.choices[0]?.message;
    if (!msg) throw new Error("OpenAI returned no message");

    const requestedToolCalls = msg.tool_calls ?? [];
    if (!forceFinal && requestedToolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: requestedToolCalls,
      });

      for (const call of requestedToolCalls) {
        if (call.type !== "function") continue;
        const t0 = Date.now();
        const result = await dispatchTool(
          call.function.name,
          call.function.arguments ?? "{}",
          opts.toolContext,
        );
        const latencyMs = Date.now() - t0;
        toolCalls.push({
          name: call.function.name,
          argsJson: call.function.arguments ?? "{}",
          result,
          latencyMs,
        });
        await recordTrace({
          ...opts.traceCtx,
          stage: `tool:${call.function.name}`,
          model: null,
          ok: result.ok,
          latencyMs,
          errorMessage: result.ok ? null : result.error ?? "unknown_tool_error",
          excerpt: safeExcerpt(result),
          toolName: call.function.name,
          toolArgs: safeJsonParse(call.function.arguments ?? "{}"),
        });
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    finalContent = msg.content ?? "{}";
    break;
  }

  if (finalContent === null) {
    throw new Error("Tool loop exited without a final message");
  }

  const parsed = tryParse(opts.schema, finalContent);
  if (parsed.ok) return { data: parsed.data, toolCalls };

  // One repair pass without tools.
  const repair = await withTrace(
    { ...opts.traceCtx, model, attempt: 2 },
    () =>
      openai.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Fix the JSON to satisfy the schema. Output JSON only.",
          },
          {
            role: "user",
            content: `Invalid output:\n${finalContent}\n\nParse error:\n${parsed.error}\n\nOriginal task context (for repair):\n${opts.user.slice(0, 4000)}`,
          },
        ],
        temperature: 0.2,
      }),
    (res) => ({
      okSchema: tryParse(opts.schema, res.choices[0]?.message?.content ?? "{}").ok,
      excerpt: res.choices[0]?.message?.content?.slice(0, 500) ?? "",
      usage: res.usage ?? undefined,
    }),
  );
  const raw2 = repair.choices[0]?.message?.content ?? "{}";
  const parsed2 = tryParse(opts.schema, raw2);
  if (parsed2.ok) return { data: parsed2.data, toolCalls };
  throw new Error(`Model output failed validation: ${parsed2.error}`);
}

function tryParse<T>(
  schema: z.ZodType<T>,
  raw: string,
): { ok: true; data: T } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: String(e) };
  }
  const r = schema.safeParse(json);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.message };
}

function safeExcerpt(result: { ok: boolean; data?: unknown; error?: string }): string {
  try {
    return JSON.stringify(result).slice(0, 500);
  } catch {
    return result.ok ? "[unserializable_data]" : result.error ?? "error";
  }
}

function safeJsonParse(raw: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(raw);
    return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
