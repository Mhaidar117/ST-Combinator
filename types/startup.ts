import { z } from "zod";

export const stageSchema = z.enum(["idea", "mvp", "revenue"]);
export type Stage = z.infer<typeof stageSchema>;

export const startupBriefSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string(),
  oneLiner: z.string(),
  problem: z.string(),
  targetCustomer: z.string(),
  whyNow: z.string(),
  pricingModel: z.string(),
  goToMarket: z.string(),
  competitors: z.array(z.string()),
  unfairAdvantage: z.string(),
  stage: stageSchema,
  websiteUrl: z.string().nullable().optional(),
  founderBackground: z.string().nullable().optional(),
  constraints: z.string().nullable().optional(),
});

export type StartupBrief = z.infer<typeof startupBriefSchema>;

export const startupFormSchema = startupBriefSchema
  .omit({ id: true })
  .extend({
    websiteUrl: z.string().url().optional().or(z.literal("")),
    founderBackground: z.string().optional(),
    constraints: z.string().optional(),
  });

export type StartupFormInput = z.infer<typeof startupFormSchema>;
