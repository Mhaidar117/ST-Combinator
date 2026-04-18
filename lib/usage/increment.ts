import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RunType } from "@/types/analysis";

/** Call after a successful analysis run. */
export async function incrementUsageAfterAnalysis(opts: {
  userId: string;
  runType: RunType;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: p } = await admin
    .from("users_profile")
    .select("plan_tier, monthly_credit_used")
    .eq("id", opts.userId)
    .single();

  if (!p) return;

  if (opts.runType === "quick_roast") {
    if (p.plan_tier === "pro") return;
    await admin
      .from("users_profile")
      .update({ monthly_credit_used: p.monthly_credit_used + 1 })
      .eq("id", opts.userId);
    return;
  }

  if (p.plan_tier === "pro") {
    await admin
      .from("users_profile")
      .update({ monthly_credit_used: p.monthly_credit_used + 1 })
      .eq("id", opts.userId);
  }
}
