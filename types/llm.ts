import { z } from "zod";

export const committeeRoleSchema = z.enum([
  "vc_partner",
  "customer_skeptic",
  "growth_lead",
  "product_strategist",
  "technical_reviewer",
  "competitor_analyst",
]);
export type CommitteeRole = z.infer<typeof committeeRoleSchema>;

export const committeeOutputSchema = z.object({
  agent: committeeRoleSchema,
  score: z.number().min(1).max(10),
  strongestAngle: z.string(),
  biggestConcern: z.string(),
  concerns: z.array(z.string()),
  whatWouldChangeMyMind: z.array(z.string()),
  punchyLine: z.string(),
  rationale: z.string(),
});

export type CommitteeOutput = z.infer<typeof committeeOutputSchema>;

export const contradictionSeveritySchema = z.enum(["low", "medium", "high"]);

export const contradictionItemSchema = z.object({
  title: z.string(),
  severity: contradictionSeveritySchema,
  explanation: z.string(),
  conflictingClaims: z.array(z.string()),
  suggestedFix: z.string(),
});

export type ContradictionItem = z.infer<typeof contradictionItemSchema>;

export const assumptionCategorySchema = z.enum([
  "customer",
  "distribution",
  "pricing",
  "competition",
  "technical",
  "timing",
]);

export const assumptionItemSchema = z.object({
  assumption: z.string(),
  category: assumptionCategorySchema,
  fragility: z.number().min(1).max(10),
  confidence: z.number().min(1).max(10),
  test: z.string(),
});

export type AssumptionItem = z.infer<typeof assumptionItemSchema>;

export const scoreDimensionsSchema = z.object({
  problemSeverity: z.number().min(1).max(10),
  customerClarity: z.number().min(1).max(10),
  marketTiming: z.number().min(1).max(10),
  distributionPlausibility: z.number().min(1).max(10),
  monetizationStrength: z.number().min(1).max(10),
  defensibility: z.number().min(1).max(10),
  founderMarketFit: z.number().min(1).max(10),
  speedToMvp: z.number().min(1).max(10),
  retentionPotential: z.number().min(1).max(10),
  investorAttractiveness: z.number().min(1).max(10),
});

export const finalAnalysisSchema = z.object({
  verdict: z.string(),
  summary: z.string(),
  confidenceScore: z.number().min(0).max(1),
  scores: scoreDimensionsSchema,
  killReasons: z.array(z.string()),
  surviveReasons: z.array(z.string()),
  contradictions: z.array(contradictionItemSchema),
  assumptions: z.array(assumptionItemSchema),
  experiments: z.array(z.string()),
  repositioningOptions: z.array(z.string()),
  uiQuotes: z.array(z.string()),
});

export type FinalAnalysis = z.infer<typeof finalAnalysisSchema>;
