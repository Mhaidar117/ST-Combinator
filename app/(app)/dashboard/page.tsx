import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user!.id)
    .single();

  const { data: startups } = await supabase
    .from("startups")
    .select("id, name, one_liner, created_at")
    .order("created_at", { ascending: false });

  const { data: analyses } = await supabase
    .from("analyses")
    .select("id, run_type, status, verdict, created_at, startup_id")
    .order("created_at", { ascending: false })
    .limit(15);

  const startupNames = new Map(
    (startups ?? []).map((s) => [s.id, s.name] as const),
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Plan:{" "}
            <Badge variant="secondary">{profile?.plan_tier ?? "free"}</Badge>
            {" · "}
            Credits used: {profile?.monthly_credit_used ?? 0} /{" "}
            {profile?.monthly_credit_limit ?? 3}
          </p>
        </div>
        <Button asChild>
          <Link href="/startups/new">New startup</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your startups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(startups ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              No startups yet — create one to run an analysis.
            </p>
          )}
          {(startups ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/startups/${s.id}`}
              className="block rounded-lg border border-border/60 p-4 hover:bg-accent/30 transition-colors"
            >
              <div className="font-medium">{s.name}</div>
              <div className="text-sm text-muted-foreground">{s.one_liner}</div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent analyses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(analyses ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No analyses yet.</p>
          )}
          {(analyses ?? []).map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm"
            >
              <div>
                <span className="text-muted-foreground">
                  {startupNames.get(a.startup_id) ?? "Startup"}
                </span>
                {" · "}
                <span>{a.run_type}</span>
                {" · "}
                <Badge variant="outline">{a.status}</Badge>
              </div>
              <Button asChild size="sm" variant="ghost">
                <Link href={`/analyses/${a.id}`}>Open</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
