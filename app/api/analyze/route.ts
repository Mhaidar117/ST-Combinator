import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runAnalysisJob } from "@/lib/analysis/pipeline";
import { canRunAnalysis } from "@/lib/usage/limits";
import { runTypeSchema, toneSchema } from "@/types/analysis";
import type { PlanTier } from "@/types/analysis";
import { captureServerEvent } from "@/lib/analytics/server";
import { ANALYTICS } from "@/lib/analytics/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
  startupId: z.string().uuid(),
  runType: runTypeSchema,
  tone: toneSchema,
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { startupId, runType, tone } = parsed.data;

  const { data: profile } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile missing" }, { status: 400 });
  }

  const plan = profile.plan_tier as PlanTier;
  const check = canRunAnalysis({
    plan,
    runType,
    monthlyCreditUsed: profile.monthly_credit_used,
    monthlyCreditLimit: profile.monthly_credit_limit,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 403 });
  }

  const { data: startup, error: suErr } = await supabase
    .from("startups")
    .select("*")
    .eq("id", startupId)
    .eq("user_id", user.id)
    .single();

  if (suErr || !startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  const input_snapshot = {
    name: startup.name,
    one_liner: startup.one_liner,
    problem: startup.problem,
    target_customer: startup.target_customer,
    why_now: startup.why_now,
    pricing_model: startup.pricing_model,
    go_to_market: startup.go_to_market,
    competitors: startup.competitors,
    unfair_advantage: startup.unfair_advantage,
    stage: startup.stage,
    website_url: startup.website_url,
    founder_background: startup.founder_background,
    constraints: startup.constraints,
  };

  const admin = createSupabaseAdminClient();
  const { data: analysis, error: insErr } = await admin
    .from("analyses")
    .insert({
      startup_id: startupId,
      run_type: runType,
      tone,
      status: "queued",
      input_snapshot,
    })
    .select("id")
    .single();

  if (insErr || !analysis) {
    return NextResponse.json({ error: "Could not create analysis" }, { status: 500 });
  }

  await captureServerEvent(ANALYTICS.analysis_started, {
    analysisId: analysis.id,
    runType,
  });

  // Fire-and-forget: kick off the pipeline WITHOUT blocking the HTTP
  // response so the client can render a live progress UI by polling
  // /api/analyses/[id]/status.
  //
  // CRITICAL: on Vercel, serverless functions are killed the moment they
  // return a response. `waitUntil` tells the runtime to keep the function
  // alive until this promise settles (up to maxDuration), which is the only
  // way to do background work in serverless. Locally `waitUntil` is a no-op
  // and the Node process keeps running anyway.
  //
  // Errors are written to analyses.status = "failed" inside
  // markAnalysisFailed, so the polling client can detect them.
  waitUntil(
    runAnalysisJob(analysis.id)
      .then(() =>
        captureServerEvent(ANALYTICS.analysis_completed, {
          analysisId: analysis.id,
        }),
      )
      .catch((e) =>
        captureServerEvent(ANALYTICS.analysis_failed, {
          analysisId: analysis.id,
          message: e instanceof Error ? e.message : String(e),
        }),
      ),
  );

  return NextResponse.json({ analysisId: analysis.id, status: "queued" });
}
