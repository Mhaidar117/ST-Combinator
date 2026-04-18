import { describe, it, expect } from "vitest";
import { applyScoreRubric, weightedOverall } from "@/lib/scoring/rubric";

describe("rubric", () => {
  it("clamps and weights overall", () => {
    const dim = applyScoreRubric({
      problemSeverity: 11,
      customerClarity: 2,
      marketTiming: 5,
      distributionPlausibility: 4,
      monetizationStrength: 6,
      defensibility: 7,
      founderMarketFit: 5,
      speedToMvp: 8,
      retentionPotential: 4,
      investorAttractiveness: 6,
    });
    expect(dim.customerClarity).toBe(2);
    const overall = weightedOverall(dim);
    expect(overall).toBeGreaterThan(0);
    expect(overall).toBeLessThanOrEqual(10);
  });
});
