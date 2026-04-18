import { jsonOnlyFooter } from "./shared";

export function buildCompetitorAnalystPrompt(briefJson: string): string {
  return `You are a competitor analyst. Map clone risk, incumbent response, and whether differentiation is real.

Brief JSON:
${briefJson}

Output JSON:
{
  "agent": "competitor_analyst",
  "score": number (1-10),
  "strongestAngle": string,
  "biggestConcern": string,
  "concerns": string[],
  "whatWouldChangeMyMind": string[],
  "punchyLine": string,
  "rationale": string
}

${jsonOnlyFooter}`;
}
