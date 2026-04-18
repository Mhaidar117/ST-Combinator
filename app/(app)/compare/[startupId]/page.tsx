import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canCompare } from "@/lib/usage/limits";
import type { PlanTier } from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComparePicker } from "@/components/comparison/compare-picker";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: { startupId: string };
  searchParams: Record<string, string | undefined>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users_profile")
    .select("plan_tier")
    .eq("id", user!.id)
    .single();

  if (!profile || !canCompare(profile.plan_tier as PlanTier)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparisons are Pro-only</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <Link href="/pricing" className="text-primary underline">
            Upgrade
          </Link>{" "}
          to compare two analyses side by side.
        </CardContent>
      </Card>
    );
  }

  const { data: startup, error } = await supabase
    .from("startups")
    .select("id, name")
    .eq("id", params.startupId)
    .eq("user_id", user!.id)
    .single();

  if (error || !startup) notFound();

  const { data: analyses } = await supabase
    .from("analyses")
    .select("id, verdict, summary, run_type, created_at")
    .eq("startup_id", startup.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false });

  const leftId = searchParams.left;
  const rightId = searchParams.right;

  const left = (analyses ?? []).find((a) => a.id === leftId);
  const right = (analyses ?? []).find((a) => a.id === rightId);

  type ScoreRow = {
    overall_score: string | number;
    distribution_plausibility: number;
  };

  let leftScore: ScoreRow | null = null;
  let rightScore: ScoreRow | null = null;

  if (left) {
    const { data } = await supabase
      .from("analysis_scores")
      .select("*")
      .eq("analysis_id", left.id)
      .maybeSingle();
    if (data) leftScore = data as ScoreRow;
  }
  if (right) {
    const { data } = await supabase
      .from("analysis_scores")
      .select("*")
      .eq("analysis_id", right.id)
      .maybeSingle();
    if (data) rightScore = data as ScoreRow;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compare analyses</h1>
        <p className="text-muted-foreground text-sm">{startup.name}</p>
      </div>

      <ComparePicker
        startupId={startup.id}
        analyses={(analyses ?? []).map((a) => ({
          id: a.id,
          label: `${a.run_type} · ${new Date(a.created_at).toLocaleDateString()}`,
        }))}
        leftId={leftId}
        rightId={rightId}
      />

      {left && right && leftScore && rightScore && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version A</CardTitle>
              <Badge variant="outline">{left.run_type}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{left.verdict}</p>
              <p className="text-muted-foreground">{left.summary}</p>
              <p>Overall: {Number(leftScore.overall_score)}</p>
              <p className="text-xs text-muted-foreground">
                Distribution: {leftScore.distribution_plausibility} vs{" "}
                {rightScore.distribution_plausibility}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Version B</CardTitle>
              <Badge variant="outline">{right.run_type}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">{right.verdict}</p>
              <p className="text-muted-foreground">{right.summary}</p>
              <p>Overall: {Number(rightScore.overall_score)}</p>
              <p className="text-xs text-muted-foreground">
                Verdict delta: compare sections in each full report for detail.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
