import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/debug/traces/:analysisId
 *
 * Returns every persisted trace row for an analysis, ordered chronologically.
 * Auth-gated to the owning user. Used by /analyses/:id/traces and the smoke
 * script.
 */
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
    .select("id, startup_id, run_type, status, created_at, completed_at")
    .eq("id", params.analysisId)
    .single();

  if (aErr || !analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: startup } = await admin
    .from("startups")
    .select("user_id, name")
    .eq("id", analysis.startup_id)
    .single();

  if (!startup || startup.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: traces, error: tErr } = await admin
    .from("analysis_traces")
    .select(
      "id, stage, model, attempt, ok, latency_ms, prompt_tokens, completion_tokens, total_tokens, error_message, output_excerpt, tool_name, tool_args, created_at",
    )
    .eq("analysis_id", params.analysisId)
    .order("created_at", { ascending: true });

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 });
  }

  return NextResponse.json({
    analysis: {
      id: analysis.id,
      runType: analysis.run_type,
      status: analysis.status,
      startupName: startup.name,
      createdAt: analysis.created_at,
      completedAt: analysis.completed_at,
    },
    traces: traces ?? [],
  });
}
