import { jsonOnlyFooter } from "./shared";

export function buildQuickRoastPrompt(briefJson: string): string {
  return `You are a one-shot adversarial reviewer. Read the canonical brief and output a single JSON object that matches the exact schema below. No prose outside JSON. No markdown fences.

Brief JSON:
${briefJson}

Required schema (every field is REQUIRED unless marked optional):

{
  "verdict": string,                  // 1-2 sentence overall judgement
  "summary": string,                  // 3-6 sentence executive summary
  "confidenceScore": number,          // YOUR confidence in this verdict, FLOAT between 0 and 1 inclusive (e.g. 0.62). NEVER use percentages. NEVER exceed 1.
  "scores": {                         // every dimension is INTEGER 1-10 inclusive
    "problemSeverity": number,
    "customerClarity": number,
    "marketTiming": number,
    "distributionPlausibility": number,
    "monetizationStrength": number,
    "defensibility": number,
    "founderMarketFit": number,
    "speedToMvp": number,
    "retentionPotential": number,
    "investorAttractiveness": number
  },
  "killReasons": string[],            // 2-5 short bullet phrases
  "surviveReasons": string[],         // 2-5 short bullet phrases
  "contradictions": [                 // 0-3 ITEMS, each an OBJECT (NOT a plain string)
    {
      "title": string,
      "severity": "low" | "medium" | "high",
      "explanation": string,
      "conflictingClaims": string[],  // 2 strings showing the conflict
      "suggestedFix": string
    }
  ],
  "assumptions": [                    // 2-5 ITEMS, each an OBJECT (NOT a plain string)
    {
      "assumption": string,
      "category": "customer" | "distribution" | "pricing" | "competition" | "technical" | "timing",
      "fragility": number,            // INTEGER 1-10
      "confidence": number,           // INTEGER 1-10
      "test": string                  // a concrete cheap test the founder can run this week
    }
  ],
  "experiments": string[],            // 2-5 short experiment ideas
  "repositioningOptions": string[],   // 1-3 alternative positionings
  "uiQuotes": string[]                // 2-4 punchy 1-line quotes UI can show as cards
}

Rules:
- "confidenceScore" MUST be a decimal in [0, 1]. If you find yourself writing a number > 1, divide by 100.
- Every "scores.*" field is REQUIRED. Do not omit any.
- "contradictions" and "assumptions" entries MUST be OBJECTS shaped exactly as above. Never put bare strings in those arrays.
- Be concrete and skeptical. Reference details from the brief.

${jsonOnlyFooter}`;
}
