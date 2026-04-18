import { jsonOnlyFooter } from "./shared";

export function buildTechnicalReviewerPrompt(briefJson: string): string {
  return `You are a technical reviewer. Attack feasibility, integration risk, "AI wrapper" claims, and whether tech moat matches story.

Brief JSON:
${briefJson}

Output JSON:
{
  "agent": "technical_reviewer",
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
