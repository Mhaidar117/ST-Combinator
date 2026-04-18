export {
  committeeOutputSchema,
  contradictionItemSchema,
  assumptionItemSchema,
  finalAnalysisSchema,
  scoreDimensionsSchema,
} from "@/types/llm";

import { z } from "zod";
import { startupBriefSchema } from "@/types/startup";

export const canonicalBriefSchema = startupBriefSchema.extend({
  normalizedNotes: z.string().optional(),
});

export const normalizeOutputSchema = z.object({
  brief: canonicalBriefSchema,
});

export const contradictionsOutputSchema = z.object({
  contradictions: z.array(
    z.object({
      title: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      explanation: z.string(),
      conflictingClaims: z.array(z.string()),
      suggestedFix: z.string(),
    }),
  ),
});

export const assumptionsOutputSchema = z.object({
  assumptions: z.array(
    z.object({
      assumption: z.string(),
      category: z.enum([
        "customer",
        "distribution",
        "pricing",
        "competition",
        "technical",
        "timing",
      ]),
      fragility: z.number().min(1).max(10),
      confidence: z.number().min(1).max(10),
      test: z.string(),
    }),
  ),
});
