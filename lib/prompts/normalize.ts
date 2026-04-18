import { jsonOnlyFooter } from "./shared";

export function buildNormalizePrompt(input: {
  rawJson: string;
  extractedUploadText?: string;
}): string {
  return `You normalize startup intake into a concise canonical brief JSON.

Input (stringified form + optional deck/notes text):
${input.rawJson}

${input.extractedUploadText ? `Extracted upload text (may be truncated):\n${input.extractedUploadText.slice(0, 12000)}` : ""}

Output JSON shape:
{
  "brief": {
    "name": string,
    "oneLiner": string,
    "problem": string,
    "targetCustomer": string,
    "whyNow": string,
    "pricingModel": string,
    "goToMarket": string,
    "competitors": string[],
    "unfairAdvantage": string,
    "stage": "idea"|"mvp"|"revenue",
    "websiteUrl": string|null,
    "founderBackground": string|null,
    "constraints": string|null,
    "normalizedNotes": string (optional, internal consistency notes)
  }
}

${jsonOnlyFooter}`;
}
