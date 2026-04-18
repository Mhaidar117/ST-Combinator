import type { PlanTier } from "@/types/analysis";
import type { RunType } from "@/types/analysis";

export function creditsForPlan(plan: PlanTier): {
  monthlyCommitteeDeep: number;
  quickRoastUnlimited: boolean;
} {
  if (plan === "pro") {
    return { monthlyCommitteeDeep: 20, quickRoastUnlimited: true };
  }
  return { monthlyCommitteeDeep: 0, quickRoastUnlimited: false };
}

export function canRunAnalysis(opts: {
  plan: PlanTier;
  runType: RunType;
  monthlyCreditUsed: number;
  monthlyCreditLimit: number;
}): { ok: true } | { ok: false; reason: string } {
  const { plan, runType, monthlyCreditUsed, monthlyCreditLimit } = opts;

  if (runType === "quick_roast") {
    if (plan === "pro") return { ok: true };
    if (monthlyCreditUsed >= monthlyCreditLimit) {
      return { ok: false, reason: "Monthly quick roast limit reached" };
    }
    return { ok: true };
  }

  if (plan !== "pro") {
    return { ok: false, reason: "Committee and deep analyses require Pro" };
  }

  if (monthlyCreditUsed >= monthlyCreditLimit) {
    return { ok: false, reason: "Monthly committee/deep analysis limit reached" };
  }

  return { ok: true };
}

export function canUpload(plan: PlanTier): boolean {
  return plan === "pro";
}

export function canCompare(plan: PlanTier): boolean {
  return plan === "pro";
}
