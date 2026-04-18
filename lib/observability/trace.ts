/**
 * Observability layer: persists one row per LLM / tool call to
 * `analysis_traces` so we can inspect failures, latency, token usage, and
 * which tools the agent chose to invoke.
 *
 * Writes are best-effort: if the DB write itself fails we log and continue —
 * observability must never break the user-facing pipeline.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type TraceCtx = {
  /** Owning analysis row; required to attribute the trace. */
  analysisId?: string;
  /** Logical pipeline stage, e.g. "normalize", "committee:vc_partner", "synthesis". */
  stage?: string;
  /** Repair attempt number (1 first try, 2 repair). Defaults to 1. */
  attempt?: number;
  /** Model name (e.g. "gpt-4o-mini") or null for non-LLM rows. */
  model?: string | null;
};

export type TraceMetadata = {
  okSchema: boolean;
  excerpt: string;
  usage?: {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    total_tokens?: number | null;
  };
};

export type RecordTraceArgs = TraceCtx & {
  ok: boolean;
  latencyMs: number;
  errorMessage?: string | null;
  excerpt?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  toolName?: string | null;
  toolArgs?: Record<string, unknown> | null;
};

/**
 * Wrap an async LLM/tool call so that timing, success/failure, token usage,
 * and an output excerpt are recorded as a single row.
 */
export async function withTrace<T>(
  ctx: TraceCtx,
  fn: () => Promise<T>,
  extract?: (value: T) => TraceMetadata,
): Promise<T> {
  const t0 = Date.now();
  try {
    const value = await fn();
    const meta = extract ? extract(value) : undefined;
    await recordTrace({
      ...ctx,
      ok: meta?.okSchema ?? true,
      latencyMs: Date.now() - t0,
      excerpt: meta?.excerpt ?? null,
      promptTokens: meta?.usage?.prompt_tokens ?? null,
      completionTokens: meta?.usage?.completion_tokens ?? null,
      totalTokens: meta?.usage?.total_tokens ?? null,
    });
    return value;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await recordTrace({
      ...ctx,
      ok: false,
      latencyMs: Date.now() - t0,
      errorMessage: message,
    });
    throw e;
  }
}

/**
 * Direct trace insert (used by the tool dispatcher and any caller that
 * already measured its own latency).
 */
export async function recordTrace(args: RecordTraceArgs): Promise<void> {
  if (!args.analysisId) return; // No analysis context → skip silently.
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("analysis_traces").insert({
      analysis_id: args.analysisId,
      stage: args.stage ?? "unknown",
      model: args.model ?? null,
      attempt: args.attempt ?? 1,
      ok: args.ok,
      latency_ms: Math.max(0, Math.round(args.latencyMs)),
      prompt_tokens: args.promptTokens ?? null,
      completion_tokens: args.completionTokens ?? null,
      total_tokens: args.totalTokens ?? null,
      error_message: args.errorMessage ?? null,
      output_excerpt: args.excerpt ? String(args.excerpt).slice(0, 500) : null,
      tool_name: args.toolName ?? null,
      tool_args: args.toolArgs ?? null,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[trace] failed to record:", e);
    }
  }
}
