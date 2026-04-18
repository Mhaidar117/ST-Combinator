/** Configurable dimension weights for overall score (must sum to 1). */
export const DEFAULT_SCORE_WEIGHTS = {
  problemSeverity: 0.14,
  customerClarity: 0.12,
  marketTiming: 0.08,
  distributionPlausibility: 0.16,
  monetizationStrength: 0.1,
  defensibility: 0.14,
  founderMarketFit: 0.1,
  speedToMvp: 0.06,
  retentionPotential: 0.05,
  investorAttractiveness: 0.05,
} as const;

export type ScoreWeightKey = keyof typeof DEFAULT_SCORE_WEIGHTS;
