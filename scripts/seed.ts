/**
 * Seed demo data for a user that already exists in auth.users.
 * Usage: SEED_USER_ID=<uuid> npm run db:seed
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.SEED_USER_ID;
  if (!url || !key || !userId) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_USER_ID");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await admin.from("users_profile").upsert({
    id: userId,
    email: "demo@example.com",
    plan_tier: "pro",
    monthly_credit_limit: 20,
    monthly_credit_used: 0,
  });

  const { data: s1 } = await admin
    .from("startups")
    .insert({
      user_id: userId,
      name: "Demo Atlas",
      one_liner: "AI compliance copilot for mid-market finance teams",
      problem: "Teams drown in policy updates",
      target_customer: "VP Compliance at 200–2000 employee companies",
      why_now: "Regulatory velocity increasing; headcount flat",
      pricing_model: "Seat-based SaaS + audit module",
      go_to_market: "Founder-led outbound + niche events",
      competitors: ["Legacy GRC", "Horizontal LLM wrappers"],
      unfair_advantage: "Workflow graph from customer uploads",
      stage: "mvp",
    })
    .select("id")
    .single();

  const { data: s2 } = await admin
    .from("startups")
    .insert({
      user_id: userId,
      name: "Northwind Labs",
      one_liner: "Usage-based billing for API products",
      problem: "Founders ship pricing that breaks at scale",
      target_customer: "Seed–Series B API-first startups",
      why_now: "AI APIs exploding usage variance",
      pricing_model: "Take rate on invoiced usage",
      go_to_market: "PLG + solution partners",
      competitors: ["Stripe Billing", "Metronome"],
      unfair_advantage: "Agent-native metering",
      stage: "idea",
    })
    .select("id")
    .single();

  if (s1?.id) {
    await admin.from("analyses").insert({
      startup_id: s1.id,
      run_type: "quick_roast",
      tone: "direct",
      status: "completed",
      input_snapshot: {},
      verdict: "Weak wedge",
      summary: "Distribution story is thin; pain is real but crowded.",
      confidence_score: 0.62,
    });
  }

  if (s2?.id) {
    await admin.from("analyses").insert({
      startup_id: s2.id,
      run_type: "committee",
      tone: "brutal",
      status: "completed",
      input_snapshot: {},
      verdict: "Likely dead",
      summary: "Pricing power unclear; incumbent can bundle.",
      confidence_score: 0.55,
    });
  }

  console.log("Seed complete for user", userId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
