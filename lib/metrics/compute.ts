/**
 * Two product metrics computed from the `analysis_traces` table.
 *
 *  1. Quality   — schemaSuccessRate: fraction of LLM stages where the model's
 *                 first attempt produced schema-valid JSON. A direct proxy
 *                 for prompt/schema robustness.
 *  2. Operational — pipelineLatencyP50P95: per run_type, the p50 and p95
 *                   end-to-end latency (sum of stage latencies per
 *                   analysis). Captures the user-perceived speed SLO.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RunType } from "@/types/analysis";

const WINDOW_DAYS = 30;

/**
 * Stages that we schema-validate (and therefore have a meaningful "okSchema"
 * signal). Excludes intermediate tool-hop rows, tool dispatch rows, and any
 * unknown stage.
 */
const SCHEMA_STAGES_PREFIX = [
  "normalize",
  "quick_roast",
  "committee:",
  "contradictions",
  "assumptions",
  "synthesis",
];

export type SchemaSuccessMetric = {
  windowDays: number;
  totalStages: number;
  firstAttemptOk: number;
  rate: number;
  byStage: Record<string, { total: number; ok: number; rate: number }>;
};

export type LatencyMetric = {
  runType: RunType | "all";
  windowDays: number;
  count: number;
  p50Ms: number | null;
  p95Ms: number | null;
  meanMs: number | null;
};

type MinimalTrace = {
  analysis_id: string;
  stage: string;
  attempt: number;
  ok: boolean;
  latency_ms: number;
};

type MinimalAnalysisRow = {
  id: string;
  run_type: string;
  created_at: string;
};

function isSchemaStage(stage: string): boolean {
  if (stage.endsWith("_tool_hop")) return false;
  if (stage.startsWith("tool:")) return false;
  return SCHEMA_STAGES_PREFIX.some((p) =>
    p.endsWith(":") ? stage.startsWith(p) : stage === p,
  );
}

export async function schemaSuccessRate(): Promise<SchemaSuccessMetric> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("analysis_traces")
    .select("stage, attempt, ok")
    .gte("created_at", since);

  if (error) throw new Error(`schemaSuccessRate query failed: ${error.message}`);

  const rows = (data ?? []) as Pick<MinimalTrace, "stage" | "attempt" | "ok">[];
  return computeSchemaSuccess(rows, WINDOW_DAYS);
}

export function computeSchemaSuccess(
  rows: Pick<MinimalTrace, "stage" | "attempt" | "ok">[],
  windowDays: number,
): SchemaSuccessMetric {
  const filtered = rows.filter(
    (r) => r.attempt === 1 && isSchemaStage(r.stage),
  );

  const byStage: Record<string, { total: number; ok: number; rate: number }> = {};
  let totalOk = 0;
  for (const r of filtered) {
    const bucket = (byStage[r.stage] ??= { total: 0, ok: 0, rate: 0 });
    bucket.total += 1;
    if (r.ok) {
      bucket.ok += 1;
      totalOk += 1;
    }
  }
  for (const k of Object.keys(byStage)) {
    const b = byStage[k];
    b.rate = b.total === 0 ? 0 : b.ok / b.total;
  }

  return {
    windowDays,
    totalStages: filtered.length,
    firstAttemptOk: totalOk,
    rate: filtered.length === 0 ? 0 : totalOk / filtered.length,
    byStage,
  };
}

export async function pipelineLatencyP50P95(
  runType: RunType | "all" = "all",
): Promise<LatencyMetric> {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let analysesQuery = admin
    .from("analyses")
    .select("id, run_type, created_at")
    .gte("created_at", since)
    .eq("status", "completed");

  if (runType !== "all") {
    analysesQuery = analysesQuery.eq("run_type", runType);
  }

  const { data: analyses, error: aErr } = await analysesQuery;
  if (aErr) throw new Error(`pipelineLatency analyses query failed: ${aErr.message}`);

  if (!analyses || analyses.length === 0) {
    return {
      runType,
      windowDays: WINDOW_DAYS,
      count: 0,
      p50Ms: null,
      p95Ms: null,
      meanMs: null,
    };
  }

  const ids = (analyses as MinimalAnalysisRow[]).map((a) => a.id);

  const { data: traces, error: tErr } = await admin
    .from("analysis_traces")
    .select("analysis_id, latency_ms")
    .in("analysis_id", ids);

  if (tErr) throw new Error(`pipelineLatency traces query failed: ${tErr.message}`);

  return computePipelineLatency(
    runType,
    WINDOW_DAYS,
    (traces ?? []) as Pick<MinimalTrace, "analysis_id" | "latency_ms">[],
  );
}

export function computePipelineLatency(
  runType: RunType | "all",
  windowDays: number,
  rows: Pick<MinimalTrace, "analysis_id" | "latency_ms">[],
): LatencyMetric {
  const sums = new Map<string, number>();
  for (const r of rows) {
    sums.set(r.analysis_id, (sums.get(r.analysis_id) ?? 0) + r.latency_ms);
  }
  const totals = Array.from(sums.values()).sort((a, b) => a - b);
  if (totals.length === 0) {
    return {
      runType,
      windowDays,
      count: 0,
      p50Ms: null,
      p95Ms: null,
      meanMs: null,
    };
  }
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
  return {
    runType,
    windowDays,
    count: totals.length,
    p50Ms: percentile(totals, 0.5),
    p95Ms: percentile(totals, 0.95),
    meanMs: Math.round(mean),
  };
}

/** Linear-interpolation percentile on a pre-sorted array of numbers. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return Math.round(sorted[lo] * (1 - frac) + sorted[hi] * frac);
}
