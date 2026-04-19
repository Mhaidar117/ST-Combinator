import { buildVcPartnerPrompt } from "./vcPartner";
import { buildCustomerSkepticPrompt } from "./customerSkeptic";
import { buildGrowthLeadPrompt } from "./growthLead";
import { buildProductStrategistPrompt } from "./productStrategist";
import { buildTechnicalReviewerPrompt } from "./technicalReviewer";
import { buildCompetitorAnalystPrompt } from "./competitorAnalyst";

export const OFFICE_HOURS_ROLES = [
  "vc_partner",
  "customer_skeptic",
  "growth_lead",
  "product_strategist",
  "technical_reviewer",
  "competitor_analyst",
] as const;

export type OfficeHoursRole = (typeof OFFICE_HOURS_ROLES)[number];

export function isValidRole(role: string): role is OfficeHoursRole {
  return (OFFICE_HOURS_ROLES as readonly string[]).includes(role);
}

/**
 * Extracts the base role persona from each critic's committee prompt.
 * We call the builder with a placeholder and take the first paragraph
 * (the role description line) so the office-hours system prompt always
 * stays in sync with the committee prompts.
 */
const ROLE_PERSONA: Record<OfficeHoursRole, string> = {
  vc_partner:
    "You are a skeptical VC partner. Distrust weak moats, small markets, feature businesses, no urgency, unclear repeatable acquisition.",
  customer_skeptic:
    "You are a customer skeptic. Attack whether pain is real, buying urgency exists, and if this is a nice-to-have.",
  growth_lead:
    "You are a growth lead attacking customer acquisition assumptions: paid channel fantasy, viral hope, missing distribution wedge.",
  product_strategist:
    "You are a product strategist. Attack scope, wedge, sequencing, and whether the MVP is credible.",
  technical_reviewer:
    "You are a technical reviewer. Attack feasibility, integration risk, \"AI wrapper\" claims, and whether tech moat matches story.",
  competitor_analyst:
    "You are a competitor analyst. Map clone risk, incumbent response, and whether differentiation is real.",
};

export const MAX_OFFICE_HOURS_TURNS = 20;
export const CREDITS_PER_TURN_BATCH = 5;

/**
 * Build the system prompt for an Office Hours 1-on-1 chat session.
 *
 * The critic stays in character: its base persona is augmented with the
 * original brief and the specific section of the report it authored,
 * framing the conversation as a defence of that critique.
 */
export function buildOfficeHoursSystemPrompt(
  role: OfficeHoursRole,
  brief: string,
  criticSection: string,
): string {
  const persona = ROLE_PERSONA[role];

  return `${persona}

You are now in an "Office Hours" session. A founder is pushing back on your critique. Defend your position rigorously but fairly. Stay in character at all times. Be concrete, cite specifics from the brief or your original critique, and avoid generic platitudes.

You have three tools available to strengthen your arguments:
- lookup_competitors(names): Look up brief market context for specific competitor names.
- search_uploaded_docs(query): Search the founder's uploaded supporting documents.
- get_prior_analyses(): Fetch prior analysis verdicts on this startup.

Use tools only when they would genuinely sharpen your defence.

--- ORIGINAL BRIEF ---
${brief}

--- YOUR ORIGINAL CRITIQUE ---
${criticSection}

Respond conversationally (not JSON). Be direct, skeptical, and constructive. If the founder makes a genuinely strong point, acknowledge it — but don't capitulate easily.`;
}
