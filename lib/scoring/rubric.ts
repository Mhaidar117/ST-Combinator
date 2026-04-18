import type { ScoreWeightKey } from "./weights";
import { DEFAULT_SCORE_WEIGHTS } from "./weights";

/** 1–2, 3–4, 5–6, 7–8, 9–10 band descriptions per dimension (deterministic rubric layer). */
export const SCORE_RUBRICS: Record<
  ScoreWeightKey,
  { band: [number, number]; label: string }[]
> = {
  problemSeverity: [
    { band: [1, 2], label: "No acute pain; nice-to-have" },
    { band: [3, 4], label: "Weak urgency; crowded symptom" },
    { band: [5, 6], label: "Real pain; unclear severity" },
    { band: [7, 8], label: "Sharp, recurring pain" },
    { band: [9, 10], label: "Mission-critical, budgeted" },
  ],
  customerClarity: [
    { band: [1, 2], label: "Everyone / no ICP" },
    { band: [3, 4], label: "Vague persona" },
    { band: [5, 6], label: "Decent ICP; loose wedge" },
    { band: [7, 8], label: "Specific buyer + context" },
    { band: [9, 10], label: "Named workflow + budget holder" },
  ],
  marketTiming: [
    { band: [1, 2], label: "Why now is missing" },
    { band: [3, 4], label: "Hand-wavy tailwinds" },
    { band: [5, 6], label: "Some catalysts" },
    { band: [7, 8], label: "Clear regulatory/tech shift" },
    { band: [9, 10], label: "Inevitable platform shift" },
  ],
  distributionPlausibility: [
    { band: [1, 2], label: "Distribution fantasy" },
    { band: [3, 4], label: "Generic inbound hope" },
    { band: [5, 6], label: "One plausible channel" },
    { band: [7, 8], label: "Repeatable GTM motion sketched" },
    { band: [9, 10], label: "Proven acquisition path" },
  ],
  monetizationStrength: [
    { band: [1, 2], label: "No pricing logic" },
    { band: [3, 4], label: "Underpriced or vague" },
    { band: [5, 6], label: "Reasonable unit economics guess" },
    { band: [7, 8], label: "Clear willingness-to-pay signals" },
    { band: [9, 10], label: "Validated pricing power" },
  ],
  defensibility: [
    { band: [1, 2], label: "Clone risk; no moat" },
    { band: [3, 4], label: "Weak differentiation" },
    { band: [5, 6], label: "Some network/data angle" },
    { band: [7, 8], label: "Credible compounding advantage" },
    { band: [9, 10], label: "Defensible asset + execution" },
  ],
  founderMarketFit: [
    { band: [1, 2], label: "No relevant edge" },
    { band: [3, 4], label: "Generic operator" },
    { band: [5, 6], label: "Some domain exposure" },
    { band: [7, 8], label: "Clear founder-market fit story" },
    { band: [9, 10], label: "Unfair access + insight" },
  ],
  speedToMvp: [
    { band: [1, 2], label: "Years to v1" },
    { band: [3, 4], label: "Heavy build; unclear scope" },
    { band: [5, 6], label: "MVP in months" },
    { band: [7, 8], label: "Lean scope; fast iteration" },
    { band: [9, 10], label: "Weeks to validated wedge" },
  ],
  retentionPotential: [
    { band: [1, 2], label: "One-off use" },
    { band: [3, 4], label: "Low switching costs" },
    { band: [5, 6], label: "Some habit or data lock-in" },
    { band: [7, 8], label: "Workflow embedding" },
    { band: [9, 10], label: "System-of-record dynamics" },
  ],
  investorAttractiveness: [
    { band: [1, 2], label: "Likely dead for VC" },
    { band: [3, 4], label: "Niche or unclear TAM" },
    { band: [5, 6], label: "Interesting but early" },
    { band: [7, 8], label: "VC-credible with gaps" },
    { band: [9, 10], label: "Clear venture path" },
  ],
};

export function clampScore(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)));
}

export function bandLabelFor(
  key: ScoreWeightKey,
  score: number,
): string {
  const s = clampScore(score);
  const rubric = SCORE_RUBRICS[key];
  for (const row of rubric) {
    const [lo, hi] = row.band;
    if (s >= lo && s <= hi) return row.label;
  }
  return rubric[rubric.length - 1]!.label;
}

export type DimensionScores = Record<ScoreWeightKey, number>;

export function weightedOverall(dim: DimensionScores): number {
  let sum = 0;
  (Object.keys(DEFAULT_SCORE_WEIGHTS) as ScoreWeightKey[]).forEach((k) => {
    sum += dim[k] * DEFAULT_SCORE_WEIGHTS[k];
  });
  return Math.round(sum * 10) / 10;
}

/** Map model-proposed sub-scores through clamp + rubric consistency. */
export function applyScoreRubric(input: DimensionScores): DimensionScores {
  const out = {} as DimensionScores;
  (Object.keys(input) as ScoreWeightKey[]).forEach((k) => {
    out[k] = clampScore(input[k]);
  });
  return out;
}
