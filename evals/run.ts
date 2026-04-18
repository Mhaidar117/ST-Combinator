/**
 * Evaluation harness.
 *
 * Usage:
 *   npm run evals
 *
 * For each scenario in `evals/scenarios.json`:
 *   1. Insert a `startups` row under EVAL_USER_ID via the service-role client.
 *   2. Insert a queued `analyses` row, then run `runAnalysisJob` directly
 *      (no HTTP, no auth) for speed.
 *   3. Read the resulting verdict + scores + sections back out.
 *   4. Score against the scenario's `expectations`.
 *   5. Write `evals/results-<timestamp>.json` and a human-readable summary.
 *
 * Required env:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - OPENAI_API_KEY
 *   - EVAL_USER_ID  (a real auth.users.id you control; reuse across runs)
 *
 * Cleanup: rows are NOT deleted automatically; see evals/README.md.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runAnalysisJob } from "@/lib/analysis/pipeline";
import { scoreScenario, type Expectations } from "./score";

type Scenario = {
  id: string;
  category: string;
  label: string;
  brief: Record<string, unknown>;
  expectations: Expectations;
};

type ScenarioResult = {
  id: string;
  label: string;
  category: string;
  startupId: string;
  analysisId: string;
  status: string;
  durationMs: number;
  verdict: string | null;
  summary: string | null;
  passed: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  toolCallSummary: { name: string; count: number }[];
  errorMessage?: string;
};

async function main() {
  const userId = process.env.EVAL_USER_ID;
  if (!userId) {
    console.error("EVAL_USER_ID is required (a real auth.users.id you control).");
    process.exit(2);
  }

  const scenariosPath = join(__dirname, "scenarios.json");
  const scenarios = JSON.parse(readFileSync(scenariosPath, "utf-8")) as Scenario[];
  console.log(`[evals] running ${scenarios.length} scenarios as user ${userId}`);

  const admin = createSupabaseAdminClient();
  const results: ScenarioResult[] = [];

  for (const sc of scenarios) {
    process.stdout.write(`\n[evals] ${sc.id} (${sc.label}) ... `);
    const t0 = Date.now();
    try {
      const startupId = await insertStartup(admin, userId, sc);
      const analysisId = await insertAnalysisRow(admin, startupId);

      await runAnalysisJob(analysisId);

      const out = await readAnalysisResult(admin, analysisId);
      const tools = await summarizeToolCalls(admin, analysisId);

      const score = scoreScenario(out.final, sc.expectations);
      const dur = Date.now() - t0;
      console.log(score.passed ? `PASS (${(dur / 1000).toFixed(1)}s)` : `FAIL (${(dur / 1000).toFixed(1)}s)`);
      results.push({
        id: sc.id,
        label: sc.label,
        category: sc.category,
        startupId,
        analysisId,
        status: out.status,
        durationMs: dur,
        verdict: out.final.verdict,
        summary: out.final.summary,
        passed: score.passed,
        checks: score.checks,
        toolCallSummary: tools,
      });
    } catch (e) {
      const dur = Date.now() - t0;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`ERROR (${(dur / 1000).toFixed(1)}s): ${msg}`);
      results.push({
        id: sc.id,
        label: sc.label,
        category: sc.category,
        startupId: "",
        analysisId: "",
        status: "error",
        durationMs: dur,
        verdict: null,
        summary: null,
        passed: false,
        checks: [],
        toolCallSummary: [],
        errorMessage: msg,
      });
    }
  }

  const passed = results.filter((r) => r.passed).length;
  const summary = {
    runAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length === 0 ? 0 : passed / results.length,
    results,
  };

  const outDir = join(__dirname, "results");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `results-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(summary, null, 2));

  // Also write a stable "latest" pointer for the docs/eval generator.
  writeFileSync(join(outDir, "latest.json"), JSON.stringify(summary, null, 2));

  console.log(
    `\n[evals] ${passed}/${results.length} passed — wrote ${outPath.replace(dirname(outDir), "evals")}`,
  );

  if (passed < results.length) process.exitCode = 1;
}

async function insertStartup(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  sc: Scenario,
): Promise<string> {
  // Ensure the eval user has a profile row so the foreign key resolves.
  await admin
    .from("users_profile")
    .upsert(
      { id: userId, email: `eval-${userId.slice(0, 8)}@local`, plan_tier: "pro" },
      { onConflict: "id" },
    );

  const b = sc.brief;
  const { data, error } = await admin
    .from("startups")
    .insert({
      user_id: userId,
      name: `[eval:${sc.id}] ${b.name}`,
      one_liner: b.oneLiner,
      problem: b.problem,
      target_customer: b.targetCustomer,
      why_now: b.whyNow,
      pricing_model: b.pricingModel,
      go_to_market: b.goToMarket,
      competitors: b.competitors ?? [],
      unfair_advantage: b.unfairAdvantage,
      stage: b.stage,
      website_url: b.websiteUrl ?? null,
      founder_background: b.founderBackground ?? null,
      constraints: b.constraints ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insert startup: ${error?.message}`);
  return data.id as string;
}

async function insertAnalysisRow(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  startupId: string,
): Promise<string> {
  const { data, error } = await admin
    .from("analyses")
    .insert({
      startup_id: startupId,
      run_type: "committee",
      tone: "direct",
      status: "queued",
      input_snapshot: { eval: true },
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`insert analysis: ${error?.message}`);
  return data.id as string;
}

async function readAnalysisResult(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  analysisId: string,
) {
  const { data: row, error } = await admin
    .from("analyses")
    .select("status, verdict, summary, confidence_score")
    .eq("id", analysisId)
    .single();
  if (error || !row) throw new Error(`read analysis: ${error?.message}`);

  const { data: sections } = await admin
    .from("analysis_sections")
    .select("section_type, content")
    .eq("analysis_id", analysisId);

  const sec: Record<string, unknown> = {};
  for (const r of sections ?? []) sec[r.section_type] = r.content;

  return {
    status: row.status as string,
    final: {
      verdict: (row.verdict ?? "") as string,
      summary: (row.summary ?? "") as string,
      killReasons: (sec.kill_reasons as string[] | undefined) ?? [],
      surviveReasons: (sec.survive_reasons as string[] | undefined) ?? [],
      contradictions:
        (sec.contradiction_report as { severity: "low" | "medium" | "high" }[] | undefined) ?? [],
      assumptions:
        (sec.assumptions as { category: string; fragility: number }[] | undefined) ?? [],
    },
  };
}

async function summarizeToolCalls(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  analysisId: string,
) {
  const { data } = await admin
    .from("analysis_traces")
    .select("stage")
    .eq("analysis_id", analysisId)
    .like("stage", "tool:%");
  const counts = new Map<string, number>();
  for (const r of data ?? []) {
    const name = String(r.stage).slice(5);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
