import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  pipelineLatencyP50P95,
  schemaSuccessRate,
  type LatencyMetric,
  type SchemaSuccessMetric,
} from "@/lib/metrics/compute";

export const dynamic = "force-dynamic";

export default async function AdminMetricsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/metrics");
  if (!isAdminEmail(user.email)) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Forbidden</h1>
        <p className="text-sm text-muted-foreground">
          Your account ({user.email}) is not in the <code>ADMIN_EMAILS</code>{" "}
          allow-list.
        </p>
      </div>
    );
  }

  const [schema, latencyAll, latencyQuick, latencyCommittee, latencyDeep] =
    await Promise.all([
      schemaSuccessRate(),
      pipelineLatencyP50P95("all"),
      pipelineLatencyP50P95("quick_roast"),
      pipelineLatencyP50P95("committee"),
      pipelineLatencyP50P95("deep"),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Metrics</h1>
        <p className="text-sm text-muted-foreground">
          Computed live from <code>analysis_traces</code>. Window: last{" "}
          {schema.windowDays} days.
        </p>
      </div>

      <SchemaCard schema={schema} />

      <div>
        <h2 className="mb-3 text-xl font-semibold">
          Pipeline latency (end-to-end p50 / p95)
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LatencyCard label="All run types" m={latencyAll} />
          <LatencyCard label="quick_roast" m={latencyQuick} />
          <LatencyCard label="committee" m={latencyCommittee} />
          <LatencyCard label="deep" m={latencyDeep} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Raw JSON: <code>GET /api/metrics</code>
      </p>
    </div>
  );
}

function SchemaCard({ schema }: { schema: SchemaSuccessMetric }) {
  const pct =
    schema.totalStages === 0 ? "—" : `${(schema.rate * 100).toFixed(1)}%`;
  const stageRows = Object.entries(schema.byStage).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Schema success rate</h2>
          <p className="text-xs text-muted-foreground">
            Fraction of LLM stages whose first attempt produced schema-valid
            JSON. Higher = prompts/schemas are robust without needing repair
            passes.
          </p>
        </div>
        <p className="text-3xl font-bold">{pct}</p>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {schema.firstAttemptOk}/{schema.totalStages} schema-checked stages
        succeeded on attempt 1.
      </p>
      {stageRows.length > 0 ? (
        <div className="mt-3 overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">Stage</th>
                <th className="px-2 py-1 text-right">Total</th>
                <th className="px-2 py-1 text-right">Ok</th>
                <th className="px-2 py-1 text-right">Rate</th>
              </tr>
            </thead>
            <tbody>
              {stageRows.map(([stage, b]) => (
                <tr key={stage} className="border-t">
                  <td className="px-2 py-1 font-mono">{stage}</td>
                  <td className="px-2 py-1 text-right">{b.total}</td>
                  <td className="px-2 py-1 text-right">{b.ok}</td>
                  <td className="px-2 py-1 text-right">
                    {(b.rate * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function LatencyCard({ label, m }: { label: string; m: LatencyMetric }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">n = {m.count}</p>
      <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">p50</p>
          <p className="font-semibold">
            {m.p50Ms === null ? "—" : `${(m.p50Ms / 1000).toFixed(1)}s`}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">p95</p>
          <p className="font-semibold">
            {m.p95Ms === null ? "—" : `${(m.p95Ms / 1000).toFixed(1)}s`}
          </p>
        </div>
      </div>
    </div>
  );
}
