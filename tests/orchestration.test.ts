import { describe, it, expect, vi } from "vitest";

describe("analysis orchestration (mocked)", () => {
  it("fails fast when analysis row is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: null,
                error: { message: "not found" },
              }),
            }),
          }),
        }),
      }),
    }));

    const { runAnalysisJob } = await import("@/lib/analysis/pipeline");
    await expect(runAnalysisJob("00000000-0000-0000-0000-000000000000")).rejects.toThrow(
      "Analysis not found",
    );
  });
});

describe("synthesis tool specs", () => {
  it("exports the three agentic tools with required parameters", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({}),
    }));
    vi.doMock("@/lib/openai/instance", () => ({
      getOpenAI: () => ({}),
      DEFAULT_MODEL: "gpt-4o-mini",
    }));
    const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");
    const names = SYNTHESIS_TOOLS.map((t) => t.function.name).sort();
    expect(names).toEqual([
      "get_prior_analyses",
      "lookup_competitors",
      "search_uploaded_docs",
    ]);

    const lookup = SYNTHESIS_TOOLS.find(
      (t) => t.function.name === "lookup_competitors",
    );
    expect(lookup?.function.parameters).toMatchObject({
      type: "object",
      required: ["names"],
    });

    const search = SYNTHESIS_TOOLS.find(
      (t) => t.function.name === "search_uploaded_docs",
    );
    expect(search?.function.parameters).toMatchObject({
      type: "object",
      required: ["query"],
    });
  });

  it("dispatchTool returns a structured error for unknown tool names", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({}),
    }));
    vi.doMock("@/lib/openai/instance", () => ({
      getOpenAI: () => ({}),
      DEFAULT_MODEL: "gpt-4o-mini",
    }));
    const { dispatchTool } = await import("@/lib/openai/tools");
    const out = await dispatchTool("does_not_exist", "{}", {
      startupId: "s",
      analysisId: "a",
    });
    expect(out.ok).toBe(false);
    expect(out.error).toMatch(/unknown_tool/i);
  });

  it("dispatchTool surfaces a structured error when arguments are not valid JSON", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({}),
    }));
    vi.doMock("@/lib/openai/instance", () => ({
      getOpenAI: () => ({}),
      DEFAULT_MODEL: "gpt-4o-mini",
    }));
    const { dispatchTool } = await import("@/lib/openai/tools");
    const out = await dispatchTool("lookup_competitors", "{not json", {
      startupId: "s",
      analysisId: "a",
    });
    expect(out.ok).toBe(false);
  });
});
