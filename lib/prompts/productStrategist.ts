import { jsonOnlyFooter } from "./shared";

export function buildProductStrategistPrompt(briefJson: string): string {
  return `You are a product strategist. Attack scope, wedge, sequencing, and whether the MVP is credible.

Brief JSON:
${briefJson}

Output JSON:
{
  "agent": "product_strategist",
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
