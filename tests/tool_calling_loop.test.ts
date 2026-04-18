/**
 * Integration test for the agentic tool-calling loop in
 * `completeJsonWithTools`. We mock only the OpenAI HTTP boundary and the
 * Supabase admin client so the test exercises the real:
 *
 *  - tool-call detection,
 *  - dispatcher invocation against `lib/openai/tools.ts`,
 *  - tool message appending into the chat history,
 *  - multi-hop continuation,
 *  - schema validation of the final message,
 *  - repair pass when the final JSON is invalid,
 *  - bail-out when MAX_TOOL_HOPS is exhausted.
 *
 * This is the closest we can get to a live agentic run without burning
 * an OpenAI key.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
};

type CreateArgs = {
  model: string;
  messages: ChatMessage[];
  tools?: unknown[];
  tool_choice?: unknown;
  response_format?: unknown;
};

const finalSchema = z.object({
  verdict: z.string(),
  notes: z.array(z.string()),
});

function setupMocks(opts: {
  /** Sequential mock OpenAI responses, returned in order on each create() call. */
  responses: Array<{
    tool_calls?: Array<{
      id: string;
      name: string;
      arguments: string;
    }>;
    content?: string;
  }>;
  /** Counts within the supabase mocks (so tests can assert tool side effects). */
  embeddingsCount?: number;
  priorAnalyses?: Array<Record<string, unknown>>;
}) {
  vi.resetModules();

  // OpenAI mock: returns from the responses array in order. If a follow-up
  // call exceeds the array length, repeat the last response (lets the
  // bail-out test keep returning tool_calls forever).
  const createCalls: CreateArgs[] = [];
  let idx = 0;
  const create = vi.fn(async (args: CreateArgs) => {
    createCalls.push(args);
    const r = opts.responses[Math.min(idx, opts.responses.length - 1)];
    idx += 1;
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: r.content ?? null,
            tool_calls: r.tool_calls
              ? r.tool_calls.map((tc) => ({
                  id: tc.id,
                  type: "function",
                  function: { name: tc.name, arguments: tc.arguments },
                }))
              : undefined,
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };
  });

  // Embeddings mock for search_uploaded_docs (returns a fake 1536-dim vector).
  const embeddingsCreate = vi.fn(async () => ({
    data: [{ embedding: new Array(1536).fill(0.01) }],
  }));

  vi.doMock("@/lib/openai/instance", () => ({
    getOpenAI: () => ({
      chat: { completions: { create } },
      embeddings: { create: embeddingsCreate },
    }),
    DEFAULT_MODEL: "gpt-4o-mini",
  }));

  // Supabase admin mock — minimal surface: select/eq/in/order/limit/neq
  // chains return predictable rows for the three real tools.
  const insertSpy = vi.fn(async () => ({ error: null }));
  const rpcSpy = vi.fn(async () => ({
    data: [
      { chunk_text: "Onboarding takes 3 weeks for new clinics.", similarity: 0.91 },
    ],
    error: null,
  }));

  const embeddingsCount = opts.embeddingsCount ?? 0;
  const priorAnalyses = opts.priorAnalyses ?? [];

  vi.doMock("@/lib/supabase/admin", () => ({
    createSupabaseAdminClient: () => ({
      from: (table: string) => {
        if (table === "analysis_traces") {
          return { insert: insertSpy };
        }
        if (table === "embeddings") {
          // Used by search_uploaded_docs to count, then to fall back.
          const builder = {
            select: (_cols: string, opts2?: { count?: string; head?: boolean }) => {
              const eq1 = (_c: string, _v: unknown) => eq1Builder;
              const eq1Builder = {
                eq: (_c: string, _v: unknown) =>
                  opts2?.head
                    ? Promise.resolve({ count: embeddingsCount, error: null })
                    : limitBuilder,
                limit: (_n: number) =>
                  Promise.resolve({ data: [], error: null }),
              };
              const limitBuilder = {
                limit: (_n: number) =>
                  Promise.resolve({ data: [], error: null }),
              };
              return { eq: eq1 };
            },
          };
          return builder;
        }
        if (table === "analyses") {
          return {
            select: () => ({
              eq: () => ({
                neq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: async () => ({ data: priorAnalyses, error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({}), insert: insertSpy };
      },
      rpc: rpcSpy,
    }),
  }));

  return { create, createCalls, insertSpy, rpcSpy, embeddingsCreate };
}

describe("completeJsonWithTools — agentic loop", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("hop 1: returns final JSON immediately when the model uses no tools", async () => {
    const { create, createCalls } = setupMocks({
      responses: [
        {
          content: JSON.stringify({
            verdict: "Sharp wedge",
            notes: ["clear ICP", "credible founder"],
          }),
        },
      ],
    });

    const { completeJsonWithTools } = await import("@/lib/openai/client");
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

    const out = await completeJsonWithTools({
      system: "You are a synthesis agent.",
      user: "Brief: tight vertical SaaS.",
      schema: finalSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: { startupId: "s1", analysisId: "a1" },
    });

    expect(out.data.verdict).toBe("Sharp wedge");
    expect(out.toolCalls).toHaveLength(0);
    expect(create).toHaveBeenCalledTimes(1);
    expect(createCalls[0].tools).toBeDefined();
    expect(createCalls[0].tool_choice).toBe("auto");
  });

  it("hop 2: dispatches lookup_competitors then returns final JSON", async () => {
    const { create, createCalls } = setupMocks({
      responses: [
        {
          tool_calls: [
            {
              id: "call_1",
              name: "lookup_competitors",
              arguments: JSON.stringify({ names: ["Notion", "Coda"] }),
            },
          ],
        },
        {
          content: JSON.stringify({
            verdict: "Clone risk",
            notes: ["Notion already owns this surface"],
          }),
        },
      ],
    });

    // lookup_competitors itself makes a nested OpenAI call. Our mock
    // returns the same shape regardless of args, so the third create call
    // here is the one inside the tool. We append a 3rd response so it
    // doesn't break.
    const { completeJsonWithTools } = await import("@/lib/openai/client");
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

    const out = await completeJsonWithTools({
      system: "You are a synthesis agent.",
      user: "Brief: another Notion clone.",
      schema: finalSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: { startupId: "s2", analysisId: "a2" },
    });

    expect(out.data.verdict).toBe("Clone risk");
    expect(out.toolCalls).toHaveLength(1);
    expect(out.toolCalls[0].name).toBe("lookup_competitors");
    expect(out.toolCalls[0].result.ok).toBe(true);
    // 1 synthesis call + 1 nested call inside lookup_competitors + 1 final synthesis call
    expect(create.mock.calls.length).toBeGreaterThanOrEqual(3);

    // The second synthesis call must include both the assistant tool_call
    // message and the tool result in the conversation history.
    const secondSynthesisCall = createCalls.find(
      (c, i) =>
        i > 0 &&
        c.tools !== undefined &&
        c.messages.some((m) => m.role === "tool"),
    );
    expect(secondSynthesisCall).toBeDefined();
    const toolMsg = secondSynthesisCall!.messages.find((m) => m.role === "tool");
    expect(toolMsg?.tool_call_id).toBe("call_1");
    expect(toolMsg?.content).toContain("competitors");
  });

  it("search_uploaded_docs returns no_docs when the startup has zero embeddings", async () => {
    setupMocks({
      embeddingsCount: 0,
      responses: [
        {
          tool_calls: [
            {
              id: "call_x",
              name: "search_uploaded_docs",
              arguments: JSON.stringify({ query: "what is onboarding time?", k: 3 }),
            },
          ],
        },
        {
          content: JSON.stringify({
            verdict: "No grounded docs",
            notes: ["fell back to brief only"],
          }),
        },
      ],
    });

    const { completeJsonWithTools } = await import("@/lib/openai/client");
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

    const out = await completeJsonWithTools({
      system: "You are a synthesis agent.",
      user: "Brief: clinical workflow tool",
      schema: finalSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: { startupId: "s3", analysisId: "a3" },
    });

    expect(out.toolCalls).toHaveLength(1);
    const result = out.toolCalls[0].result;
    expect(result.ok).toBe(true);
    expect((result.data as { kind: string }).kind).toBe("no_docs");
  });

  it("get_prior_analyses returns prior verdict rows", async () => {
    setupMocks({
      priorAnalyses: [
        {
          id: "old1",
          run_type: "committee",
          verdict: "Likely dead",
          summary: "v1 was vague",
          confidence_score: 0.32,
          created_at: "2026-04-01T00:00:00Z",
        },
      ],
      responses: [
        {
          tool_calls: [
            {
              id: "call_y",
              name: "get_prior_analyses",
              arguments: "{}",
            },
          ],
        },
        {
          content: JSON.stringify({
            verdict: "Improved over v1",
            notes: ["addresses prior kill_reasons"],
          }),
        },
      ],
    });

    const { completeJsonWithTools } = await import("@/lib/openai/client");
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

    const out = await completeJsonWithTools({
      system: "You are a synthesis agent.",
      user: "Revision 2 of the brief.",
      schema: finalSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: { startupId: "s4", analysisId: "a4" },
    });

    expect(out.toolCalls).toHaveLength(1);
    const data = out.toolCalls[0].result.data as { count: number };
    expect(data.count).toBe(1);
  });

  it("repairs invalid final JSON in a no-tools repair pass", async () => {
    const { create } = setupMocks({
      responses: [
        // First synthesis call: returns a JSON-shaped string that fails the schema.
        { content: JSON.stringify({ verdict: 123, notes: "not-an-array" }) },
        // Repair pass returns valid JSON.
        {
          content: JSON.stringify({
            verdict: "fixed",
            notes: ["repaired"],
          }),
        },
      ],
    });

    const { completeJsonWithTools } = await import("@/lib/openai/client");
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

    const out = await completeJsonWithTools({
      system: "synthesis",
      user: "brief",
      schema: finalSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: { startupId: "s5", analysisId: "a5" },
    });

    expect(out.data.verdict).toBe("fixed");
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("bails out cleanly when the model keeps requesting tools past MAX_TOOL_HOPS", async () => {
    // Use get_prior_analyses because it does NOT make a nested OpenAI
    // call inside the dispatcher — keeps the mocked response stream
    // 1:1 with the synthesis loop's create() calls.
    setupMocks({
      priorAnalyses: [],
      responses: [
        { tool_calls: [{ id: "c1", name: "get_prior_analyses", arguments: "{}" }] },
        { tool_calls: [{ id: "c2", name: "get_prior_analyses", arguments: "{}" }] },
        { tool_calls: [{ id: "c3", name: "get_prior_analyses", arguments: "{}" }] },
        // Forced final hop (tools=undefined, json_object): valid JSON.
        { content: JSON.stringify({ verdict: "max_hops reached", notes: ["forced final"] }) },
      ],
    });

    const { completeJsonWithTools } = await import("@/lib/openai/client");
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

    const out = await completeJsonWithTools({
      system: "synthesis",
      user: "brief",
      schema: finalSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: { startupId: "s6", analysisId: "a6" },
      maxToolHops: 3,
    });

    expect(out.data.verdict).toBe("max_hops reached");
    // 3 tool dispatches recorded (hops 0, 1, 2). Hop 3 is the forced final.
    expect(out.toolCalls.filter((tc) => tc.name === "get_prior_analyses").length).toBe(3);
  });
});
