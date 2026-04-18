import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type TraceRow = {
  id: string;
  stage: string;
  model: string | null;
  attempt: number;
  ok: boolean;
  latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  error_message: string | null;
  output_excerpt: string | null;
  tool_name: string | null;
  tool_args: Record<string, unknown> | null;
  created_at: string;
};

export const dynamic = "force-dynamic";

export default async function AnalysisTracesPage({
  params,
}: {
  params: { analysisId: string };
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const admin = createSupabaseAdminClient();

  const { data: analysis, error: aErr } = await admin
    .from("analyses")
    .select("id, startup_id, run_type, status, created_at, completed_at")
    .eq("id", params.analysisId)
    .single();

  if (aErr || !analysis) notFound();

  const { data: startup } = await admin
    .from("startups")
    .select("user_id, name")
    .eq("id", analysis.startup_id)
    .single();

  if (!startup || startup.user_id !== user.id) notFound();

  const { data: traceRows } = await admin
    .from("analysis_traces")
    .select(
      "id, stage, model, attempt, ok, latency_ms, prompt_tokens, completion_tokens, total_tokens, error_message, output_excerpt, tool_name, tool_args, created_at",
    )
    .eq("analysis_id", params.analysisId)
    .order("created_at", { ascending: true });

  const traces: TraceRow[] = (traceRows ?? []) as TraceRow[];

  const totals = traces.reduce(
    (acc, t) => {
      acc.latency += t.latency_ms;
      acc.tokens += t.total_tokens ?? 0;
      acc.calls += 1;
      if (!t.ok) acc.failures += 1;
      if (t.stage.startsWith("tool:")) acc.toolCalls += 1;
      return acc;
    },
    { latency: 0, tokens: 0, calls: 0, failures: 0, toolCalls: 0 },
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link
            href={`/analyses/${analysis.id}`}
            className="hover:underline"
          >
            ← Back to {startup.name} analysis
          </Link>
        </p>
        <h1 className="text-3xl font-bold">Trace</h1>
        <p className="text-sm text-muted-foreground">
          Run type: {analysis.run_type} · Status: {analysis.status} ·
          Started: {new Date(analysis.created_at).toLocaleString()}
          {analysis.completed_at
            ? ` · Completed: ${new Date(analysis.completed_at).toLocaleString()}`
            : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Calls" value={String(totals.calls)} />
        <Stat label="Failures" value={String(totals.failures)} />
        <Stat label="Tool calls" value={String(totals.toolCalls)} />
        <Stat
          label="Total latency"
          value={`${(totals.latency / 1000).toFixed(1)}s`}
        />
        <Stat label="Total tokens" value={String(totals.tokens)} />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">#</th>
              <th className="px-3 py-2 text-left">Stage</th>
              <th className="px-3 py-2 text-left">Model</th>
              <th className="px-3 py-2 text-right">Attempt</th>
              <th className="px-3 py-2 text-right">Latency</th>
              <th className="px-3 py-2 text-right">Tokens</th>
              <th className="px-3 py-2 text-left">OK</th>
              <th className="px-3 py-2 text-left">Excerpt / error</th>
            </tr>
          </thead>
          <tbody>
            {traces.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-8 text-center text-muted-foreground"
                >
                  No trace rows for this analysis yet.
                </td>
              </tr>
            ) : (
              traces.map((t, i) => (
                <tr key={t.id} className="border-t align-top">
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="px-3 py-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {t.stage}
                    </code>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {t.model ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-xs">{t.attempt}</td>
                  <td className="px-3 py-2 text-right text-xs">
                    {t.latency_ms}ms
                  </td>
                  <td className="px-3 py-2 text-right text-xs">
                    {t.total_tokens ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {t.ok ? (
                      <span className="text-green-600">ok</span>
                    ) : (
                      <span className="text-red-600">fail</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {t.error_message ? (
                      <pre className="whitespace-pre-wrap text-red-700">
                        {t.error_message.slice(0, 200)}
                      </pre>
                    ) : (
                      <pre className="whitespace-pre-wrap text-muted-foreground">
                        {(t.output_excerpt ?? "").slice(0, 200)}
                      </pre>
                    )}
                    {t.tool_args ? (
                      <pre className="mt-1 whitespace-pre-wrap text-[11px] text-muted-foreground">
                        args: {JSON.stringify(t.tool_args)}
                      </pre>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Raw JSON: <code>GET /api/debug/traces/{analysis.id}</code>
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-card px-3 py-2">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
