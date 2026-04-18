import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Stage labels in the rough order they fire. Used to compute a percent
// for the progress bar without hard-coding a per-run-type schedule.
const STAGE_ORDER = [
  "normalize",
  "committee:vc_partner",
  "committee:customer_skeptic",
  "committee:growth_lead",
  "committee:product_strategist",
  "committee:technical_reviewer",
  "committee:competitor_analyst",
  "contradictions",
  "assumptions",
  "synthesis",
];

const QUICK_ROAST_ORDER = ["normalize", "quick_roast"];

function prettyStage(stage: string): string {
  if (stage === "normalize") return "Normalizing brief";
  if (stage === "contradictions") return "Finding contradictions";
  if (stage === "assumptions") return "Surfacing assumptions";
  if (stage === "synthesis") return "Synthesizing verdict";
  if (stage === "quick_roast") return "Running quick roast";
  if (stage.startsWith("committee:")) {
    const role = stage.slice("committee:".length).replace(/_/g, " ");
    return `Committee · ${role}`;
  }
  if (stage.startsWith("tool:")) {
    return `Tool · ${stage.slice("tool:".length)}`;
  }
  return stage;
}

export async function GET(
  _req: Request,
  { params }: { params: { analysisId: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();

  const { data: analysis, error: aErr } = await admin
    .from("analyses")
    .select("id, startup_id, run_type, status, completed_at")
    .eq("id", params.analysisId)
    .single();

  if (aErr || !analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check via startup -> user.
  const { data: startup } = await admin
    .from("startups")
    .select("user_id")
    .eq("id", analysis.startup_id)
    .single();
  if (!startup || startup.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: traces } = await admin
    .from("analysis_traces")
    .select("stage, ok, error_message, created_at, latency_ms")
    .eq("analysis_id", analysis.id)
    .order("created_at", { ascending: true });

  const completedStages = new Set<string>();
  let lastStage: string | null = null;
  let lastError: string | null = null;
  for (const t of traces ?? []) {
    if (!t.stage.endsWith("_tool_hop")) {
      completedStages.add(t.stage);
      lastStage = t.stage;
    }
    if (!t.ok && t.error_message) lastError = t.error_message;
  }

  const order =
    analysis.run_type === "quick_roast" ? QUICK_ROAST_ORDER : STAGE_ORDER;
  const total = order.length;
  const done = order.filter((s) => completedStages.has(s)).length;
  const percent =
    analysis.status === "completed"
      ? 100
      : analysis.status === "failed"
        ? 100
        : Math.min(95, Math.round((done / total) * 100));

  return NextResponse.json({
    analysisId: analysis.id,
    status: analysis.status,
    runType: analysis.run_type,
    percent,
    completedStages: order.filter((s) => completedStages.has(s)),
    pendingStages: order.filter((s) => !completedStages.has(s)),
    currentStageLabel: lastStage ? prettyStage(lastStage) : "Starting…",
    lastError,
    completedAt: analysis.completed_at,
  });
}
