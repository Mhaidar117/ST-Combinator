/**
 * Office Hours feature tests.
 *
 * Covers:
 * 1. System prompt construction
 * 2. Role validation
 * 3. Ownership enforcement
 * 4. Turn cap
 * 5. Trace persistence
 * 6. Tool dispatch parity
 * 7. Credit decrement
 *
 * Mocking style mirrors tests/tool_calling_loop.test.ts and
 * tests/orchestration.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// 1. System prompt construction
// ---------------------------------------------------------------------------
describe("buildOfficeHoursSystemPrompt", () => {
  it("includes the brief verbatim, the critic section, and the role persona", async () => {
    const { buildOfficeHoursSystemPrompt } = await import(
      "@/lib/prompts/officeHours"
    );

    const brief = '{"name":"Acme","problem":"Widget gap"}';
    const section = '{"agent":"customer_skeptic","score":4,"biggestConcern":"No pain"}';

    const prompt = buildOfficeHoursSystemPrompt(
      "customer_skeptic",
      brief,
      section,
    );

    // Role persona present
    expect(prompt).toContain("customer skeptic");
    // Brief included verbatim
    expect(prompt).toContain(brief);
    // Critic section included verbatim
    expect(prompt).toContain(section);
    // Office hours framing
    expect(prompt).toContain("Office Hours");
    expect(prompt).toContain("pushing back");
    // Tool descriptions present
    expect(prompt).toContain("lookup_competitors");
    expect(prompt).toContain("search_uploaded_docs");
    expect(prompt).toContain("get_prior_analyses");

    // Snapshot test on the assembled string structure
    expect(prompt).toMatchSnapshot();
  });

  it("uses different personas for each role", async () => {
    const { buildOfficeHoursSystemPrompt, OFFICE_HOURS_ROLES } = await import(
      "@/lib/prompts/officeHours"
    );

    const prompts = OFFICE_HOURS_ROLES.map((role) =>
      buildOfficeHoursSystemPrompt(role, "brief", "section"),
    );

    // Each role should produce a unique first line (the persona)
    const firstLines = prompts.map((p) => p.split("\n")[0]);
    const unique = new Set(firstLines);
    expect(unique.size).toBe(OFFICE_HOURS_ROLES.length);
  });
});

// ---------------------------------------------------------------------------
// 2. Role validation
// ---------------------------------------------------------------------------
describe("role validation", () => {
  it("isValidRole accepts all six committee roles", async () => {
    const { isValidRole, OFFICE_HOURS_ROLES } = await import(
      "@/lib/prompts/officeHours"
    );
    for (const role of OFFICE_HOURS_ROLES) {
      expect(isValidRole(role)).toBe(true);
    }
  });

  it("isValidRole rejects invalid role values", async () => {
    const { isValidRole } = await import("@/lib/prompts/officeHours");
    expect(isValidRole("ceo")).toBe(false);
    expect(isValidRole("")).toBe(false);
    expect(isValidRole("VC_PARTNER")).toBe(false);
    expect(isValidRole("admin")).toBe(false);
  });

  it("OFFICE_HOURS_ROLES contains exactly the six committee roles", async () => {
    const { OFFICE_HOURS_ROLES } = await import("@/lib/prompts/officeHours");
    expect(OFFICE_HOURS_ROLES).toEqual([
      "vc_partner",
      "customer_skeptic",
      "growth_lead",
      "product_strategist",
      "technical_reviewer",
      "competitor_analyst",
    ]);
  });
});

// ---------------------------------------------------------------------------
// Shared mock setup helper
// ---------------------------------------------------------------------------
type MockSetupOpts = {
  /** Whether the user owns the analysis (RLS simulation) */
  userOwnsAnalysis?: boolean;
  /** OpenAI response content for the chat completion */
  assistantResponse?: string;
  /** Tool calls to return from the mocked OpenAI */
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: string;
  }>;
  /** Profile data for credit checks */
  profileData?: {
    plan_tier: string;
    monthly_credit_used: number;
    monthly_credit_limit: number;
  };
};

function setupRouteMocks(opts: MockSetupOpts = {}) {
  vi.resetModules();

  const userOwnsAnalysis = opts.userOwnsAnalysis ?? true;
  const assistantResponse =
    opts.assistantResponse ?? "I stand by my critique because...";
  const profile = opts.profileData ?? {
    plan_tier: "free",
    monthly_credit_used: 0,
    monthly_credit_limit: 20,
  };

  // Track inserts for assertion
  const traceInsertSpy = vi.fn(async () => ({ error: null }));
  const upsertSpy = vi.fn(async () => ({ error: null }));
  const profileUpdateSpy = vi.fn(async () => ({ error: null }));

  // OpenAI mock
  let openaiCallIdx = 0;
  const openaiCreateSpy = vi.fn(async () => {
    openaiCallIdx++;
    // If toolCalls provided and this is the first call, return tool_calls
    if (opts.toolCalls && openaiCallIdx === 1) {
      return {
        choices: [
          {
            message: {
              role: "assistant",
              content: null,
              tool_calls: opts.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              })),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
      };
    }
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: assistantResponse,
            tool_calls: undefined,
          },
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    };
  });

  vi.doMock("@/lib/openai/instance", () => ({
    getOpenAI: () => ({
      chat: { completions: { create: openaiCreateSpy } },
      embeddings: {
        create: async () => ({
          data: [{ embedding: new Array(1536).fill(0.01) }],
        }),
      },
    }),
    DEFAULT_MODEL: "gpt-4o-mini",
  }));

  // User-scoped supabase client mock (for auth + RLS queries)
  const mockUser = { id: "user-1" };
  vi.doMock("@/lib/supabase/server", () => ({
    createSupabaseServerClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: mockUser } }),
      },
      from: (table: string) => {
        if (table === "analyses") {
          return {
            select: () => ({
              eq: () => ({
                single: async () =>
                  userOwnsAnalysis
                    ? {
                        data: {
                          id: "analysis-1",
                          startup_id: "startup-1",
                          canonical_brief: { name: "TestCo", problem: "Testing" },
                        },
                        error: null,
                      }
                    : { data: null, error: { message: "not found" } },
              }),
            }),
          };
        }
        if (table === "analysis_sections") {
          return {
            select: () => ({
              eq: (_col: string, _val: string) => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      content: [
                        {
                          agent: "vc_partner",
                          score: 5,
                          strongestAngle: "Clear wedge",
                          biggestConcern: "Small TAM",
                          punchyLine: "Too niche.",
                        },
                        {
                          agent: "customer_skeptic",
                          score: 4,
                          strongestAngle: "Real pain",
                          biggestConcern: "No urgency",
                          punchyLine: "Nice to have.",
                        },
                      ],
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { select: () => ({}) };
      },
    }),
  }));

  // Admin supabase client mock (for traces, threads, profile)
  vi.doMock("@/lib/supabase/admin", () => ({
    createSupabaseAdminClient: () => ({
      from: (table: string) => {
        if (table === "analysis_traces") {
          return { insert: traceInsertSpy };
        }
        if (table === "office_hours_threads") {
          return { upsert: upsertSpy };
        }
        if (table === "users_profile") {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { ...profile },
                  error: null,
                }),
              }),
            }),
            update: (_data: unknown) => ({
              eq: profileUpdateSpy,
            }),
          };
        }
        if (table === "embeddings") {
          return {
            select: (_cols: string, opts2?: { count?: string; head?: boolean }) => {
              const eq1 = (_c: string, _v: unknown) => eq1Builder;
              const eq1Builder = {
                eq: (_c: string, _v: unknown) =>
                  opts2?.head
                    ? Promise.resolve({ count: 0, error: null })
                    : { limit: async () => ({ data: [], error: null }) },
                limit: async () => ({ data: [], error: null }),
              };
              return { eq: eq1 };
            },
          };
        }
        if (table === "analyses") {
          return {
            select: () => ({
              eq: () => ({
                neq: () => ({
                  eq: () => ({
                    order: () => ({
                      limit: async () => ({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        return { insert: vi.fn(async () => ({ error: null })) };
      },
      rpc: async () => ({ data: [], error: null }),
    }),
  }));

  return {
    traceInsertSpy,
    upsertSpy,
    profileUpdateSpy,
    openaiCreateSpy,
  };
}

// Helper to create a mock Request for the route handler
function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/critics/vc_partner/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// 3. Ownership enforcement
// ---------------------------------------------------------------------------
describe("ownership enforcement", () => {
  beforeEach(() => vi.resetModules());

  it("returns 404 when the caller does not own the analysis", async () => {
    setupRouteMocks({ userOwnsAnalysis: false });

    const { POST } = await import("@/app/api/critics/[role]/chat/route");
    const req = makeRequest({
      analysisId: "analysis-1",
      messages: [{ role: "user", content: "Why did you score low?" }],
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("Not found");
  });
});

// ---------------------------------------------------------------------------
// 4. Turn cap
// ---------------------------------------------------------------------------
describe("turn cap", () => {
  beforeEach(() => vi.resetModules());

  it("returns 429 when messages contain more than 20 user turns", async () => {
    setupRouteMocks();

    const { POST } = await import("@/app/api/critics/[role]/chat/route");

    // Build messages with 21 user turns
    const messages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < 21; i++) {
      messages.push({ role: "user", content: `Turn ${i + 1}` });
      messages.push({ role: "assistant", content: `Reply ${i + 1}` });
    }

    const req = makeRequest({
      analysisId: "analysis-1",
      messages,
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("Turn limit");
    expect(json.error).toContain("20");
  });

  it("allows exactly 20 user turns", async () => {
    setupRouteMocks();

    const { POST } = await import("@/app/api/critics/[role]/chat/route");

    const messages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < 20; i++) {
      messages.push({ role: "user", content: `Turn ${i + 1}` });
      messages.push({ role: "assistant", content: `Reply ${i + 1}` });
    }

    const req = makeRequest({
      analysisId: "analysis-1",
      messages,
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// 5. Trace persistence
// ---------------------------------------------------------------------------
describe("trace persistence", () => {
  beforeEach(() => vi.resetModules());

  it("writes one trace row with stage='office_hours:<role>' and latency_ms populated", async () => {
    const { traceInsertSpy } = setupRouteMocks();

    const { POST } = await import("@/app/api/critics/[role]/chat/route");
    const req = makeRequest({
      analysisId: "analysis-1",
      messages: [{ role: "user", content: "Convince me." }],
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(200);

    expect(traceInsertSpy).toHaveBeenCalledTimes(1);
    const calls = traceInsertSpy.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const payload = calls[0][0];
    expect(payload.stage).toBe("office_hours:vc_partner");
    expect(payload.analysis_id).toBe("analysis-1");
    expect(payload.ok).toBe(true);
    expect(typeof payload.latency_ms).toBe("number");
    expect(payload.latency_ms).toBeGreaterThanOrEqual(0);
    // output_excerpt should be <= 500 chars
    expect(
      typeof payload.output_excerpt === "string"
        ? payload.output_excerpt.length <= 500
        : payload.output_excerpt === null,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 6. Tool dispatch parity
// ---------------------------------------------------------------------------
describe("tool dispatch parity", () => {
  beforeEach(() => vi.resetModules());

  it("invokes the tool dispatcher when OpenAI returns tool_calls for lookup_competitors", async () => {
    const { openaiCreateSpy } = setupRouteMocks({
      toolCalls: [
        {
          id: "call_1",
          name: "lookup_competitors",
          arguments: JSON.stringify({ names: ["Notion"] }),
        },
      ],
      assistantResponse: "After checking competitors, I still believe...",
    });

    const { POST } = await import("@/app/api/critics/[role]/chat/route");
    const req = makeRequest({
      analysisId: "analysis-1",
      messages: [{ role: "user", content: "What about Notion?" }],
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.message).toContain("After checking competitors");

    // OpenAI should have been called at least twice:
    // 1st: tool_calls response
    // 2nd (nested lookup_competitors call inside the tool) + final response
    expect(openaiCreateSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 7. Credit decrement
// ---------------------------------------------------------------------------
describe("credit decrement", () => {
  beforeEach(() => vi.resetModules());

  it("decrements credits when user turns hit a multiple of 5", async () => {
    const { profileUpdateSpy } = setupRouteMocks({
      profileData: {
        plan_tier: "free",
        monthly_credit_used: 2,
        monthly_credit_limit: 20,
      },
    });

    const { POST } = await import("@/app/api/critics/[role]/chat/route");

    // Build exactly 5 user turns (the 5th triggers credit decrement)
    const messages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < 5; i++) {
      messages.push({ role: "user", content: `Turn ${i + 1}` });
      if (i < 4) messages.push({ role: "assistant", content: `Reply ${i + 1}` });
    }

    const req = makeRequest({
      analysisId: "analysis-1",
      messages,
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(200);

    // Profile update should have been called (credit decrement)
    expect(profileUpdateSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT decrement credits when user turns are not a multiple of 5", async () => {
    const { profileUpdateSpy } = setupRouteMocks();

    const { POST } = await import("@/app/api/critics/[role]/chat/route");

    // 3 user turns — not a multiple of 5
    const messages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < 3; i++) {
      messages.push({ role: "user", content: `Turn ${i + 1}` });
      if (i < 2) messages.push({ role: "assistant", content: `Reply ${i + 1}` });
    }

    const req = makeRequest({
      analysisId: "analysis-1",
      messages,
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(200);

    // No credit decrement
    expect(profileUpdateSpy).not.toHaveBeenCalled();
  });

  it("returns 429 when monthly credits are exhausted", async () => {
    setupRouteMocks({
      profileData: {
        plan_tier: "free",
        monthly_credit_used: 20,
        monthly_credit_limit: 20,
      },
    });

    const { POST } = await import("@/app/api/critics/[role]/chat/route");

    // 10 user turns (multiple of 5, triggers credit check)
    const messages: Array<{ role: string; content: string }> = [];
    for (let i = 0; i < 10; i++) {
      messages.push({ role: "user", content: `Turn ${i + 1}` });
      if (i < 9) messages.push({ role: "assistant", content: `Reply ${i + 1}` });
    }

    const req = makeRequest({
      analysisId: "analysis-1",
      messages,
    });

    const res = await POST(req, { params: { role: "vc_partner" } });
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain("credit");
  });
});

// ---------------------------------------------------------------------------
// Additional: role validation at route level (400 for bad roles)
// ---------------------------------------------------------------------------
describe("route-level role validation", () => {
  beforeEach(() => vi.resetModules());

  it("returns 400 for invalid role parameter", async () => {
    setupRouteMocks();

    const { POST } = await import("@/app/api/critics/[role]/chat/route");
    const req = new Request("http://localhost/api/critics/ceo/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analysisId: "analysis-1",
        messages: [{ role: "user", content: "hi" }],
      }),
    });

    const res = await POST(req, { params: { role: "ceo" } });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("Invalid role");
  });

  it("accepts all six valid roles", async () => {
    const { OFFICE_HOURS_ROLES } = await import("@/lib/prompts/officeHours");

    for (const role of OFFICE_HOURS_ROLES) {
      vi.resetModules();
      setupRouteMocks();
      const { POST } = await import("@/app/api/critics/[role]/chat/route");
      const req = new Request(`http://localhost/api/critics/${role}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: "analysis-1",
          messages: [{ role: "user", content: "Defend yourself." }],
        }),
      });

      const res = await POST(req, { params: { role } });
      expect(res.status).toBe(200);
    }
  });
});
