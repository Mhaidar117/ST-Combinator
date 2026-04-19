import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AnalysisReport } from "@/components/reports/analysis-report";

export default async function AnalysisPage({
  params,
}: {
  params: { analysisId: string };
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: analysis, error: aErr } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", params.analysisId)
    .single();

  if (aErr || !analysis) notFound();

  const { data: startup, error: sErr } = await supabase
    .from("startups")
    .select("id, user_id, name")
    .eq("id", analysis.startup_id)
    .single();

  if (sErr || !startup || startup.user_id !== user!.id) notFound();

  const { data: scoreRow } = await supabase
    .from("analysis_scores")
    .select("*")
    .eq("analysis_id", analysis.id)
    .maybeSingle();

  const { data: sectionRows } = await supabase
    .from("analysis_sections")
    .select("section_type, content")
    .eq("analysis_id", analysis.id);

  const sections: Record<string, unknown> = {};
  for (const row of sectionRows ?? []) {
    sections[row.section_type] = row.content;
  }

  const scores = scoreRow
    ? {
        overall_score: Number(scoreRow.overall_score),
        problem_severity: scoreRow.problem_severity,
        customer_clarity: scoreRow.customer_clarity,
        market_timing: scoreRow.market_timing,
        distribution_plausibility: scoreRow.distribution_plausibility,
        monetization_strength: scoreRow.monetization_strength,
        defensibility: scoreRow.defensibility,
        founder_market_fit: scoreRow.founder_market_fit,
        speed_to_mvp: scoreRow.speed_to_mvp,
        retention_potential: scoreRow.retention_potential,
        investor_attractiveness: scoreRow.investor_attractiveness,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/startups/${startup.id}`} className="hover:underline">
              {startup.name}
            </Link>
          </p>
          <h1 className="text-3xl font-bold">Analysis</h1>
        </div>
        <Link
          href={`/analyses/${analysis.id}/traces`}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          View trace →
        </Link>
      </div>
      <AnalysisReport
        analysisId={analysis.id}
        startupId={startup.id}
        verdict={analysis.verdict}
        summary={analysis.summary}
        runType={analysis.run_type}
        status={analysis.status}
        scores={scores}
        sections={sections}
        inputSnapshot={
          (analysis.input_snapshot ?? {}) as Record<string, unknown>
        }
      />
    </div>
  );
}
