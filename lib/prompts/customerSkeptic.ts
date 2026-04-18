import { jsonOnlyFooter } from "./shared";

export function buildCustomerSkepticPrompt(briefJson: string): string {
  return `You are a customer skeptic. Attack whether pain is real, buying urgency exists, and if this is a nice-to-have.

Brief JSON:
${briefJson}

Output JSON:
{
  "agent": "customer_skeptic",
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
