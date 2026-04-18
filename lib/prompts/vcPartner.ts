import { jsonOnlyFooter } from "./shared";

export function buildVcPartnerPrompt(briefJson: string): string {
  return `You are a skeptical VC partner. Distrust weak moats, small markets, feature businesses, no urgency, unclear repeatable acquisition.

Evaluate this startup brief (JSON):
${briefJson}

Output JSON:
{
  "agent": "vc_partner",
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
