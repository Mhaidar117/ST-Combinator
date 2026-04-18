import { describe, it, expect, vi } from "vitest";
import {
  computeSchemaSuccess,
  computePipelineLatency,
} from "@/lib/metrics/compute";

describe("computeSchemaSuccess", () => {
  it("counts only first-attempt schema-validated stages", () => {
    const m = computeSchemaSuccess(
      [
        { stage: "normalize", attempt: 1, ok: true },
        { stage: "committee:vc_partner", attempt: 1, ok: true },
        { stage: "committee:vc_partner", attempt: 1, ok: false },
        { stage: "committee:vc_partner", attempt: 2, ok: true }, // repair, ignored
        { stage: "synthesis", attempt: 1, ok: true },
      ],
      30,
    );
    expect(m.totalStages).toBe(4);
    expect(m.firstAttemptOk).toBe(3);
    expect(m.rate).toBeCloseTo(0.75);
    expect(m.byStage["committee:vc_partner"]).toEqual({
      total: 2,
      ok: 1,
      rate: 0.5,
    });
  });

  it("excludes intermediate tool-hop and tool dispatch rows", () => {
    const m = computeSchemaSuccess(
      [
        { stage: "synthesis_tool_hop", attempt: 1, ok: true },
        { stage: "tool:lookup_competitors", attempt: 1, ok: true },
        { stage: "synthesis", attempt: 1, ok: true },
      ],
      30,
    );
    expect(m.totalStages).toBe(1);
    expect(m.byStage.synthesis).toEqual({ total: 1, ok: 1, rate: 1 });
  });

  it("returns rate=0 when no rows match", () => {
    const m = computeSchemaSuccess([], 30);
    expect(m.rate).toBe(0);
    expect(m.totalStages).toBe(0);
  });
});

describe("computePipelineLatency", () => {
  it("sums latency per analysis, then takes p50/p95", () => {
    // Three analyses with totals 100, 500, 5000 ms.
    const rows = [
      { analysis_id: "a", latency_ms: 50 },
      { analysis_id: "a", latency_ms: 50 },
      { analysis_id: "b", latency_ms: 500 },
      { analysis_id: "c", latency_ms: 2000 },
      { analysis_id: "c", latency_ms: 3000 },
    ];
    const m = computePipelineLatency("all", 30, rows);
    expect(m.count).toBe(3);
    expect(m.p50Ms).toBe(500); // middle of [100, 500, 5000]
    // p95 of 3 sorted points with linear-interp: idx = 1.9 → 0.1*500 + 0.9*5000 = 4550
    expect(m.p95Ms).toBe(4550);
    expect(m.meanMs).toBe(Math.round((100 + 500 + 5000) / 3));
  });

  it("returns nulls when no traces exist", () => {
    const m = computePipelineLatency("committee", 30, []);
    expect(m.count).toBe(0);
    expect(m.p50Ms).toBeNull();
    expect(m.p95Ms).toBeNull();
    expect(m.meanMs).toBeNull();
  });
});

describe("recordTrace", () => {
  it("is a no-op when analysisId is missing (never throws)", async () => {
    vi.resetModules();
    const insert = vi.fn(async () => ({ error: null }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({ insert }),
      }),
    }));
    const { recordTrace } = await import("@/lib/observability/trace");
    await expect(
      recordTrace({ ok: true, latencyMs: 1 } as never),
    ).resolves.toBeUndefined();
    expect(insert).not.toHaveBeenCalled();
  });

  it("inserts a single row into analysis_traces when analysisId is set", async () => {
    vi.resetModules();
    const insert = vi.fn(async () => ({ error: null }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("analysis_traces");
          return { insert };
        },
      }),
    }));
    const { recordTrace } = await import("@/lib/observability/trace");
    await recordTrace({
      analysisId: "11111111-1111-1111-1111-111111111111",
      stage: "tool:lookup_competitors",
      ok: true,
      latencyMs: 42,
      toolName: "lookup_competitors",
      toolArgs: { names: ["Acme"] },
    });
    expect(insert).toHaveBeenCalledTimes(1);
    const calls = insert.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const payload = calls[0][0];
    expect(payload.stage).toBe("tool:lookup_competitors");
    expect(payload.tool_name).toBe("lookup_competitors");
    expect(payload.latency_ms).toBe(42);
    expect(payload.attempt).toBe(1);
    expect(payload.ok).toBe(true);
  });
});

describe("withTrace", () => {
  it("records ok=true and returns the value on success", async () => {
    vi.resetModules();
    const insert = vi.fn(async () => ({ error: null }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({ insert }),
      }),
    }));
    const { withTrace } = await import("@/lib/observability/trace");
    const out = await withTrace(
      { analysisId: "x", stage: "normalize" },
      async () => ({ value: 1 }),
      () => ({ okSchema: true, excerpt: "ok" }),
    );
    expect(out).toEqual({ value: 1 });
    expect(insert).toHaveBeenCalledTimes(1);
    const calls = insert.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const payload = calls[0][0];
    expect(payload.ok).toBe(true);
    expect(payload.stage).toBe("normalize");
  });

  it("records ok=false with error_message when the wrapped fn throws", async () => {
    vi.resetModules();
    const insert = vi.fn(async () => ({ error: null }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({ insert }),
      }),
    }));
    const { withTrace } = await import("@/lib/observability/trace");
    await expect(
      withTrace({ analysisId: "x", stage: "synthesis" }, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(insert).toHaveBeenCalledTimes(1);
    const calls = insert.mock.calls as unknown as Array<[Record<string, unknown>]>;
    const payload = calls[0][0];
    expect(payload.ok).toBe(false);
    expect(payload.error_message).toBe("boom");
  });
});
