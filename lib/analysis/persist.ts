import type { FinalAnalysis } from "@/types/llm";
import type { RunType, Tone } from "@/types/analysis";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { applyScoreRubric, weightedOverall, type DimensionScores } from "@/lib/scoring/rubric";
import type { CommitteeOutput } from "@/types/llm";

export async function persistCompletedAnalysis(opts: {
  analysisId: string;
  startupId: string;
  runType: RunType;
  tone: Tone;
  canonicalBrief: Record<string, unknown>;
  final: FinalAnalysis;
  committee: CommitteeOutput[];
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const dims = applyScoreRubric(opts.final.scores as DimensionScores);
  const overall = weightedOverall(dims);

  const { error: aErr } = await admin
    .from("analyses")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      canonical_brief: opts.canonicalBrief,
      verdict: opts.final.verdict,
      summary: opts.final.summary,
      confidence_score: opts.final.confidenceScore,
    })
    .eq("id", opts.analysisId);

  if (aErr) throw aErr;

  await admin.from("analysis_scores").delete().eq("analysis_id", opts.analysisId);

  const { error: sErr } = await admin.from("analysis_scores").insert({
    analysis_id: opts.analysisId,
    problem_severity: dims.problemSeverity,
    customer_clarity: dims.customerClarity,
    market_timing: dims.marketTiming,
    distribution_plausibility: dims.distributionPlausibility,
    monetization_strength: dims.monetizationStrength,
    defensibility: dims.defensibility,
    founder_market_fit: dims.founderMarketFit,
    speed_to_mvp: dims.speedToMvp,
    retention_potential: dims.retentionPotential,
    investor_attractiveness: dims.investorAttractiveness,
    overall_score: overall,
  });

  if (sErr) throw sErr;

  await admin.from("analysis_sections").delete().eq("analysis_id", opts.analysisId);

  const rows = [
    { section_type: "kill_reasons", content: opts.final.killReasons },
    { section_type: "survive_reasons", content: opts.final.surviveReasons },
    { section_type: "contradiction_report", content: opts.final.contradictions },
    { section_type: "assumptions", content: opts.final.assumptions },
    { section_type: "experiments", content: opts.final.experiments },
    { section_type: "repositioning", content: opts.final.repositioningOptions },
    { section_type: "committee_outputs", content: opts.committee },
    { section_type: "ui_quotes", content: opts.final.uiQuotes },
    {
      section_type: "scoring_rationale",
      content: { tone: opts.tone, runType: opts.runType },
    },
  ];

  const { error: secErr } = await admin.from("analysis_sections").insert(
    rows.map((r) => ({
      analysis_id: opts.analysisId,
      section_type: r.section_type,
      content: r.content as unknown as Record<string, unknown>,
    })),
  );

  if (secErr) throw secErr;
}

export async function markAnalysisFailed(
  analysisId: string,
  message: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin
    .from("analyses")
    .update({
      status: "failed",
      completed_at: new Date().toISOString(),
      summary: message.slice(0, 500),
    })
    .eq("id", analysisId);
}
