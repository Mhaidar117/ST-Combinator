/**
 * End-to-end smoke test for the analysis pipeline + observability layer.
 *
 * Usage:
 *   SMOKE_USER_ID=<auth.users.id> npm run smoke              # runs against the lib (no HTTP)
 *   SMOKE_BASE_URL=http://localhost:3000 SMOKE_USER_ID=... npm run smoke
 *
 * What it checks:
 *   1. A `committee` analysis runs end-to-end via `runAnalysisJob`
 *   2. Trace rows are persisted in the expected stages
 *   3. `schemaSuccessRate` and `pipelineLatencyP50P95` return finite numbers
 *   4. Optional: HTTP HEAD to `SMOKE_BASE_URL` returns 200 (verifies that the
 *      Next.js process is reachable; auth-gated routes are not exercised)
 *
 * Cleanup: deletes the startup row at the end (cascades to analyses, traces,
 * scores, sections).
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               OPENAI_API_KEY, SMOKE_USER_ID.
 */
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runAnalysisJob } from "@/lib/analysis/pipeline";
import {
  pipelineLatencyP50P95,
  schemaSuccessRate,
} from "@/lib/metrics/compute";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const tag = ok ? "PASS" : "FAIL";
  console.log(`  [${tag}] ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const userId = process.env.SMOKE_USER_ID;
  if (!userId) {
    console.error("SMOKE_USER_ID is required (an auth.users.id you control).");
    process.exit(2);
  }
  const baseUrl = process.env.SMOKE_BASE_URL ?? null;

  console.log(
    `[smoke] starting — user=${userId} baseUrl=${baseUrl ?? "(skipped)"}\n`,
  );

  const admin = createSupabaseAdminClient();

  await admin
    .from("users_profile")
    .upsert(
      { id: userId, email: `smoke-${userId.slice(0, 8)}@local`, plan_tier: "pro" },
      { onConflict: "id" },
    );

  let startupId = "";
  let analysisId = "";

  try {
    console.log("→ creating smoke startup");
    const { data: s, error: sErr } = await admin
      .from("startups")
      .insert({
        user_id: userId,
        name: "[smoke] PocketAuditor",
        one_liner: "AI bookkeeping co-pilot for solo accountants serving 10-50 SMB clients.",
        problem: "Solo accountants spend ~20 hrs/week reconciling QuickBooks transactions across clients.",
        target_customer: "Solo CPAs and EAs in the US with 10-50 SMB clients.",
        why_now: "QBO API maturity + reliable OCR for receipts at <$0.01/page.",
        pricing_model: "$199/month per accountant, unlimited clients.",
        go_to_market: "Sponsor AICPA newsletters and partner with QBO ProAdvisor program.",
        competitors: ["Bench", "Pilot", "Botkeeper"],
        unfair_advantage: "Founder is a former Big-4 senior with 1k-CPA email list.",
        stage: "mvp",
      })
      .select("id")
      .single();
    if (sErr || !s) throw new Error(`insert startup: ${sErr?.message}`);
    startupId = s.id as string;
    record("create startup", true, startupId);

    console.log("→ creating analysis row + running pipeline (committee)");
    const { data: a, error: aErr } = await admin
      .from("analyses")
      .insert({
        startup_id: startupId,
        run_type: "committee",
        tone: "direct",
        status: "queued",
        input_snapshot: { smoke: true },
      })
      .select("id")
      .single();
    if (aErr || !a) throw new Error(`insert analysis: ${aErr?.message}`);
    analysisId = a.id as string;

    const t0 = Date.now();
    await runAnalysisJob(analysisId);
    const dur = Date.now() - t0;
    record("runAnalysisJob completed", true, `${(dur / 1000).toFixed(1)}s`);

    const { data: ar } = await admin
      .from("analyses")
      .select("status, verdict, summary")
      .eq("id", analysisId)
      .single();
    record(
      "analysis row marked completed",
      ar?.status === "completed",
      `status=${ar?.status} verdict="${ar?.verdict ?? ""}"`,
    );

    const { data: scoreRow } = await admin
      .from("analysis_scores")
      .select("overall_score")
      .eq("analysis_id", analysisId)
      .maybeSingle();
    record(
      "score row written",
      !!scoreRow && Number(scoreRow.overall_score) >= 0,
      `overall=${scoreRow?.overall_score}`,
    );

    const { data: traces } = await admin
      .from("analysis_traces")
      .select("stage, ok")
      .eq("analysis_id", analysisId);
    const stages = (traces ?? []).map((t) => t.stage);
    const failures = (traces ?? []).filter((t) => !t.ok).length;

    record(
      "normalize trace exists",
      stages.includes("normalize"),
      `stages=${stages.length}`,
    );
    record(
      "6 committee traces exist",
      stages.filter((s) => s.startsWith("committee:")).length === 6,
      `count=${stages.filter((s) => s.startsWith("committee:")).length}`,
    );
    record("contradictions trace exists", stages.includes("contradictions"));
    record("assumptions trace exists", stages.includes("assumptions"));
    record("synthesis trace exists", stages.includes("synthesis"));
    record(
      "no failed trace rows",
      failures === 0,
      `failures=${failures}`,
    );
    const toolStages = stages.filter((s) => s.startsWith("tool:"));
    console.log(
      `  [info] synthesis used ${toolStages.length} tool call(s)${
        toolStages.length ? `: ${toolStages.join(", ")}` : ""
      }`,
    );

    console.log("→ checking metrics computation");
    const sr = await schemaSuccessRate();
    record(
      "schemaSuccessRate is finite",
      Number.isFinite(sr.rate) && sr.totalStages > 0,
      `rate=${sr.rate.toFixed(3)} n=${sr.totalStages}`,
    );
    const lat = await pipelineLatencyP50P95("committee");
    record(
      "pipelineLatencyP50P95 returns numbers",
      lat.p50Ms !== null && lat.p95Ms !== null,
      `p50=${lat.p50Ms}ms p95=${lat.p95Ms}ms n=${lat.count}`,
    );

    if (baseUrl) {
      console.log(`→ HTTP HEAD ${baseUrl}`);
      try {
        const res = await fetch(baseUrl, { method: "GET" });
        record(
          "homepage returns 200",
          res.ok,
          `status=${res.status}`,
        );
      } catch (e) {
        record(
          "homepage reachable",
          false,
          e instanceof Error ? e.message : String(e),
        );
      }
    }
  } finally {
    if (startupId) {
      console.log("\n→ cleanup: deleting smoke startup");
      await admin.from("startups").delete().eq("id", startupId);
    }
  }

  const passed = checks.filter((c) => c.ok).length;
  console.log(
    `\n[smoke] ${passed}/${checks.length} checks passed${
      passed === checks.length ? " — OK" : " — FAIL"
    }`,
  );
  if (passed !== checks.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error("\n[smoke] unhandled error:", e);
  process.exit(1);
});
