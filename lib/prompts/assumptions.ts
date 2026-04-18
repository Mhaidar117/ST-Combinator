import { jsonOnlyFooter } from "./shared";

export function buildAssumptionsPrompt(
  briefJson: string,
  committeeJson: string,
  depth: "committee" | "deep",
): string {
  return `Extract explicit assumptions, fragility (1-10), confidence (1-10), and a falsifiable test per assumption.
Depth: ${depth}

Brief:
${briefJson}

Committee:
${committeeJson}

Output JSON:
{
  "assumptions": [
    {
      "assumption": string,
      "category": "customer"|"distribution"|"pricing"|"competition"|"technical"|"timing",
      "fragility": number,
      "confidence": number,
      "test": string
    }
  ]
}

${jsonOnlyFooter}`;
}
