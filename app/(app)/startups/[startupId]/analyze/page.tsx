import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunAnalysisClient } from "@/components/startup/run-analysis-client";

export default async function AnalyzePage({
  params,
}: {
  params: { startupId: string };
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: startup, error } = await supabase
    .from("startups")
    .select("id, name")
    .eq("id", params.startupId)
    .eq("user_id", user!.id)
    .single();

  if (error || !startup) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analyze</h1>
        <p className="text-muted-foreground text-sm">{startup.name}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Choose mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RunAnalysisClient startupId={startup.id} />
          <Button variant="outline" asChild>
            <Link href={`/startups/${startup.id}`}>Back</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
