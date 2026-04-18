import { notFound } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default async function PublicSharePage({
  params,
}: {
  params: { token: string };
}) {
  const admin = createSupabaseAdminClient();
  const { data: analysis, error } = await admin
    .from("analyses")
    .select("id, verdict, summary, run_type, status, startup_id")
    .eq("share_token", params.token)
    .single();

  if (error || !analysis || analysis.status !== "completed") {
    notFound();
  }

  const { data: startup } = await admin
    .from("startups")
    .select("name")
    .eq("id", analysis.startup_id)
    .single();

  const { data: scoreRow } = await admin
    .from("analysis_scores")
    .select("*")
    .eq("analysis_id", analysis.id)
    .maybeSingle();

  const { data: sectionRows } = await admin
    .from("analysis_sections")
    .select("section_type, content")
    .eq("analysis_id", analysis.id);

  const sections: Record<string, unknown> = {};
  for (const row of sectionRows ?? []) {
    sections[row.section_type] = row.content;
  }

  const kill = sections.kill_reasons as string[] | undefined;
  const survive = sections.survive_reasons as string[] | undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">Shared report</p>
        <h1 className="text-3xl font-bold">{startup?.name ?? "Startup"}</h1>
        <Badge className="mt-2" variant="outline">
          {analysis.run_type}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verdict</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xl font-semibold">{analysis.verdict}</p>
          {analysis.summary && (
            <p className="text-sm text-muted-foreground">{analysis.summary}</p>
          )}
        </CardContent>
      </Card>

      {scoreRow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Overall {Number(scoreRow.overall_score)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Distribution plausibility</span>
              <span>{scoreRow.distribution_plausibility} / 10</span>
            </div>
            <Progress value={scoreRow.distribution_plausibility * 10} />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Why this dies</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {(kill ?? []).map((k) => (
              <p key={k}>• {k}</p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-500">Why it might live</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            {(survive ?? []).map((k) => (
              <p key={k}>• {k}</p>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
