import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UploadForm } from "@/components/startup/upload-form";
import { AnalysisRow } from "@/components/analysis/analysis-row";

export default async function StartupDetailPage({
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
    .select("*")
    .eq("id", params.startupId)
    .eq("user_id", user!.id)
    .single();

  if (error || !startup) notFound();

  const { data: analyses } = await supabase
    .from("analyses")
    .select("id, run_type, status, verdict, created_at")
    .eq("startup_id", startup.id)
    .order("created_at", { ascending: false });

  const { data: uploads } = await supabase
    .from("startup_uploads")
    .select("id, original_filename, created_at")
    .eq("startup_id", startup.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{startup.name}</h1>
          <p className="text-muted-foreground">{startup.one_liner}</p>
          <Badge className="mt-2" variant="outline">
            {startup.stage}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={`/startups/${startup.id}/analyze`}>Run analysis</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/compare/${startup.id}`}>Compare analyses</Link>
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Problem:</span>{" "}
              {startup.problem}
            </p>
            <p>
              <span className="font-medium text-foreground">Customer:</span>{" "}
              {startup.target_customer}
            </p>
            <p>
              <span className="font-medium text-foreground">GTM:</span>{" "}
              {startup.go_to_market}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Uploads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <UploadForm startupId={startup.id} />
            <ul className="text-sm text-muted-foreground space-y-1">
              {(uploads ?? []).map((u) => (
                <li key={u.id}>{u.original_filename}</li>
              ))}
              {(uploads ?? []).length === 0 && (
                <li>No files uploaded.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analysis history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(analyses ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No analyses yet.</p>
          )}
          {(analyses ?? []).map((a) => (
            <AnalysisRow
              key={a.id}
              id={a.id}
              runType={a.run_type}
              status={a.status}
              verdict={a.verdict}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
