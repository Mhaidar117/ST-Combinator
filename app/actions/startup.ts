"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/analytics/server";
import { ANALYTICS } from "@/lib/analytics/events";

export async function createStartup(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const competitorsRaw = String(formData.get("competitors") ?? "");
  const competitors = competitorsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const { data, error } = await supabase
    .from("startups")
    .insert({
      user_id: user.id,
      name: String(formData.get("name")),
      one_liner: String(formData.get("one_liner")),
      problem: String(formData.get("problem")),
      target_customer: String(formData.get("target_customer")),
      why_now: String(formData.get("why_now")),
      pricing_model: String(formData.get("pricing_model")),
      go_to_market: String(formData.get("go_to_market")),
      competitors,
      unfair_advantage: String(formData.get("unfair_advantage")),
      stage: String(formData.get("stage")),
      website_url: String(formData.get("website_url") || "") || null,
      founder_background: String(formData.get("founder_background") || "") || null,
      constraints: String(formData.get("constraints") || "") || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Could not create startup");
  }

  await captureServerEvent(ANALYTICS.startup_created, { startupId: data.id });
  redirect(`/startups/${data.id}`);
}
