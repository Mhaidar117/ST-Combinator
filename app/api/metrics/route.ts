import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  pipelineLatencyP50P95,
  schemaSuccessRate,
} from "@/lib/metrics/compute";

/**
 * GET /api/metrics
 *
 * Returns the two product metrics. Auth-gated to the ADMIN_EMAILS allow-list.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [schema, latencyAll, latencyQuick, latencyCommittee, latencyDeep] =
      await Promise.all([
        schemaSuccessRate(),
        pipelineLatencyP50P95("all"),
        pipelineLatencyP50P95("quick_roast"),
        pipelineLatencyP50P95("committee"),
        pipelineLatencyP50P95("deep"),
      ]);

    return NextResponse.json({
      schemaSuccessRate: schema,
      pipelineLatencyP50P95: {
        all: latencyAll,
        quick_roast: latencyQuick,
        committee: latencyCommittee,
        deep: latencyDeep,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
