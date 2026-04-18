import { jsonOnlyFooter } from "./shared";

export function buildContradictionsPrompt(briefJson: string, committeeJson: string): string {
  return `You detect internal inconsistencies between the brief and committee outputs.

Canonical brief JSON:
${briefJson}

Committee outputs (JSON array):
${committeeJson}

Output JSON:
{
  "contradictions": [
    {
      "title": string,
      "severity": "low"|"medium"|"high",
      "explanation": string,
      "conflictingClaims": string[],
      "suggestedFix": string
    }
  ]
}

Focus on: ICP vs GTM mismatch, pricing vs value, moat vs acquisition, SMB vs enterprise contradictions, weak defensibility claims.

${jsonOnlyFooter}`;
}
