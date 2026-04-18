import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { randomToken } from "@/lib/utils";
import { getPublicEnv } from "@/lib/env-public";
import { captureServerEvent } from "@/lib/analytics/server";
import { ANALYTICS } from "@/lib/analytics/events";

const bodySchema = z.object({
  analysisId: z.string().uuid(),
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

  const { data: analysis, error: aErr } = await supabase
    .from("analyses")
    .select("id, share_token, startup_id")
    .eq("id", parsed.data.analysisId)
    .single();

  if (aErr || !analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: startup, error: sErr } = await supabase
    .from("startups")
    .select("user_id")
    .eq("id", analysis.startup_id)
    .single();

  if (sErr || !startup || startup.user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  let token = analysis.share_token;
  if (!token) {
    token = randomToken(16);
    const { error: uErr } = await admin
      .from("analyses")
      .update({ share_token: token })
      .eq("id", analysis.id);
    if (uErr) {
      return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
    }
  }

  const site = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  await captureServerEvent(ANALYTICS.share_link_created, { analysisId: analysis.id });

  return NextResponse.json({
    token,
    shareUrl: `${site.replace(/\/$/, "")}/share/${token}`,
  });
}
