import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RunType } from "@/types/analysis";

/**
 * Bump the user's monthly credit counter after a successful analysis.
 *
 * With the relaxed gating (see lib/usage/limits.ts) every successful run
 * costs one credit, regardless of plan or run type. The single exception is
 * Pro + quick_roast, which is unlimited as a perk — to preserve that flow if
 * Stripe is re-enabled, we leave it free.
 */
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

  if (opts.runType === "quick_roast" && p.plan_tier === "pro") return;

  await admin
    .from("users_profile")
    .update({ monthly_credit_used: p.monthly_credit_used + 1 })
    .eq("id", opts.userId);
}
