import { jsonOnlyFooter } from "./shared";

export function buildGrowthLeadPrompt(briefJson: string): string {
  return `You are a growth lead attacking customer acquisition assumptions: paid channel fantasy, viral hope, missing distribution wedge.

Brief JSON:
${briefJson}

Output JSON:
{
  "agent": "growth_lead",
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
