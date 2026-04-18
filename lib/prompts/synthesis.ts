import { jsonOnlyFooter } from "./shared";

export function buildSynthesisPrompt(payload: {
  briefJson: string;
  committeeJson: string;
  contradictionsJson: string;
  assumptionsJson: string;
  runType: "quick_roast" | "committee" | "deep";
  tone: "polite" | "direct" | "brutal";
}): string {
  return `Synthesize a final adversarial investment committee report. Tone for display copy: ${payload.tone}. Run type: ${payload.runType}.

Canonical brief:
${payload.briefJson}

Committee outputs:
${payload.committeeJson}

Contradictions:
${payload.contradictionsJson}

Assumptions:
${payload.assumptionsJson}

Output JSON:
{
  "verdict": string (sharp, e.g. "Likely dead", "Weak wedge", "Clone risk"),
  "summary": string (2-4 sentences),
  "confidenceScore": number (0-1),
  "scores": {
    "problemSeverity": number (1-10),
    "customerClarity": number (1-10),
    "marketTiming": number (1-10),
    "distributionPlausibility": number (1-10),
    "monetizationStrength": number (1-10),
    "defensibility": number (1-10),
    "founderMarketFit": number (1-10),
    "speedToMvp": number (1-10),
    "retentionPotential": number (1-10),
    "investorAttractiveness": number (1-10)
  },
  "killReasons": string[],
  "surviveReasons": string[],
  "contradictions": [same shape as input list, may refine],
  "assumptions": [same shape as input list, may refine],
  "experiments": string[],
  "repositioningOptions": string[],
  "uiQuotes": string[] (very short pull quotes)
}

${jsonOnlyFooter}`;
}
