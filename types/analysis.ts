import { z } from "zod";

export const runTypeSchema = z.enum(["quick_roast", "committee", "deep"]);
export type RunType = z.infer<typeof runTypeSchema>;

export const toneSchema = z.enum(["polite", "direct", "brutal"]);
export type Tone = z.infer<typeof toneSchema>;

export const analysisStatusSchema = z.enum([
  "queued",
  "processing",
  "completed",
  "failed",
]);
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;

export const sectionTypeSchema = z.enum([
  "kill_reasons",
  "survive_reasons",
  "contradiction_report",
  "assumptions",
  "experiments",
  "repositioning",
  "committee_outputs",
  "ui_quotes",
  "scoring_rationale",
]);
export type SectionType = z.infer<typeof sectionTypeSchema>;

export const planTierSchema = z.enum(["free", "pro"]);
export type PlanTier = z.infer<typeof planTierSchema>;
