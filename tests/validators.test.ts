import { describe, it, expect } from "vitest";
import { committeeOutputSchema } from "@/types/llm";

describe("validators", () => {
  it("parses committee output", () => {
    const r = committeeOutputSchema.safeParse({
      agent: "vc_partner",
      score: 5,
      strongestAngle: "x",
      biggestConcern: "y",
      concerns: ["a"],
      whatWouldChangeMyMind: ["b"],
      punchyLine: "z",
      rationale: "r",
    });
    expect(r.success).toBe(true);
  });
});
