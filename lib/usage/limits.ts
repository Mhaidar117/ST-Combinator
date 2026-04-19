import type { PlanTier } from "@/types/analysis";
import type { RunType } from "@/types/analysis";

// ---------------------------------------------------------------------------
// Plan-gate relaxation
// ---------------------------------------------------------------------------
// During development we want every signed-in user to access the full feature
// surface (committee, deep, uploads, compare) without going through Stripe
// checkout. We do NOT remove Stripe — webhook + checkout code paths still
// exist — we just flip these gating helpers so the rest of the app reads as
// "everyone can do everything, capped by the shared monthly_credit_limit".
//
// To re-introduce a paywall later, restore the original `plan === "pro"`
// branches below.
// ---------------------------------------------------------------------------

const FEATURES_UNLOCKED_FOR_FREE_USERS = true;

export function creditsForPlan(plan: PlanTier): {
  monthlyCommitteeDeep: number;
  quickRoastUnlimited: boolean;
} {
  if (plan === "pro") {
    return { monthlyCommitteeDeep: 20, quickRoastUnlimited: true };
  }
  return { monthlyCommitteeDeep: 20, quickRoastUnlimited: false };
}

export function canRunAnalysis(opts: {
  plan: PlanTier;
  runType: RunType;
  monthlyCreditUsed: number;
  monthlyCreditLimit: number;
}): { ok: true } | { ok: false; reason: string } {
  const { plan, runType, monthlyCreditUsed, monthlyCreditLimit } = opts;

  // Pro keeps quick_roast unlimited (no credit burn) — same as before.
  if (runType === "quick_roast" && plan === "pro") return { ok: true };

  if (monthlyCreditUsed >= monthlyCreditLimit) {
    return {
      ok: false,
      reason: `Monthly credit limit reached (${monthlyCreditUsed}/${monthlyCreditLimit}).`,
    };
  }

  return { ok: true };
}

export function canUpload(plan: PlanTier): boolean {
  if (FEATURES_UNLOCKED_FOR_FREE_USERS) return true;
  return plan === "pro";
}

export function canCompare(plan: PlanTier): boolean {
  if (FEATURES_UNLOCKED_FOR_FREE_USERS) return true;
  return plan === "pro";
}
