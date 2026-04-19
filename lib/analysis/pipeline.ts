import { z } from "zod";
import { completeJson, completeJsonWithTools } from "@/lib/openai/client";
import { SYNTHESIS_TOOLS, type ToolDispatchInfo } from "@/lib/openai/tools";
import { normalizeOutputSchema, contradictionsOutputSchema, assumptionsOutputSchema } from "@/lib/validators/output";
import { finalAnalysisSchema, committeeOutputSchema, type CommitteeOutput } from "@/types/llm";
import { buildNormalizePrompt } from "@/lib/prompts/normalize";
import { buildVcPartnerPrompt } from "@/lib/prompts/vcPartner";
import { buildCustomerSkepticPrompt } from "@/lib/prompts/customerSkeptic";
import { buildGrowthLeadPrompt } from "@/lib/prompts/growthLead";
import { buildProductStrategistPrompt } from "@/lib/prompts/productStrategist";
import { buildTechnicalReviewerPrompt } from "@/lib/prompts/technicalReviewer";
import { buildCompetitorAnalystPrompt } from "@/lib/prompts/competitorAnalyst";
import { buildContradictionsPrompt } from "@/lib/prompts/contradictions";
import { buildAssumptionsPrompt } from "@/lib/prompts/assumptions";
import { buildSynthesisPrompt } from "@/lib/prompts/synthesis";
import { buildQuickRoastPrompt } from "@/lib/prompts/quickRoast";
import { persistCompletedAnalysis, markAnalysisFailed } from "@/lib/analysis/persist";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { RunType, Tone } from "@/types/analysis";
import { incrementUsageAfterAnalysis } from "@/lib/usage/increment";

const systemSkeptic = "You are a skeptical analyst. Output JSON only.";

function buildSynthesisSystemPrompt(runType: RunType): string {
  const baseRoleAndTools = `You are the synthesis lead of an adversarial investor committee. You receive a canonical brief, six committee critiques, contradictions, and assumptions. Your job is to produce one final structured report.

You have three tools available:
- get_prior_analyses(): ALWAYS safe. Returns prior verdicts on this same startup, or an empty list. Useful framing for whether this is a first pass vs. iteration.
- lookup_competitors(names): Looks up brief market context for SPECIFIC competitor company names listed in the brief. Skip if the brief lists no real competitors.
- search_uploaded_docs(query): Semantic search over the founder's uploaded supporting docs. Returns { kind: "no_docs" } if nothing was uploaded — in that case, skip and proceed.

Workflow:
1. Decide which tools (if any) would sharpen your final report.
2. Call them. Tools are cheap; prefer calling over guessing.
3. Once you have what you need, output JSON ONLY matching the schema. No prose outside JSON. No markdown fences.`;

  if (runType === "deep") {
    return `${baseRoleAndTools}

This is a DEEP STRESS TEST. You are EXPECTED to use tools. At minimum, call get_prior_analyses() at the start so you can frame this analysis in context. If the brief lists ≥1 specific competitor company name, also call lookup_competitors(). If the brief mentions uploaded materials or a specific testable claim, call search_uploaded_docs(). Skipping tools entirely on a deep run is a quality failure.`;
  }

  return `${baseRoleAndTools}

This is an INVESTOR COMMITTEE run. Use tools whenever the brief gives you a hook — naming a real competitor, a testable claim, or being a follow-up to a prior analysis. A first call to get_prior_analyses() is almost always worth it.`;
}

const committeeListSchema = z.array(committeeOutputSchema);

export async function runAnalysisJob(analysisId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { data: analysis, error: aErr } = await admin
    .from("analyses")
    .select("*")
    .eq("id", analysisId)
    .single();

  if (aErr || !analysis) {
    throw new Error("Analysis not found");
  }

  const { data: startup, error: sErr } = await admin
    .from("startups")
    .select("*")
    .eq("id", analysis.startup_id)
    .single();

  if (sErr || !startup) {
    throw new Error("Startup not found");
  }
  const runType = analysis.run_type as RunType;
  const tone = analysis.tone as Tone;

  await admin
    .from("analyses")
    .update({ status: "processing" })
    .eq("id", analysisId);

  try {
    const { data: uploads } = await admin
      .from("startup_uploads")
      .select("extracted_text")
      .eq("startup_id", startup.id as string);

    const uploadText = uploads
      ?.map((u) => u.extracted_text)
      .filter(Boolean)
      .join("\n\n");

    const rawJson = JSON.stringify(snapshotFromStartup(startup));

    if (runType === "quick_roast") {
      const norm = await completeJson({
        system: systemSkeptic,
        user: buildNormalizePrompt({ rawJson, extractedUploadText: uploadText }),
        schema: normalizeOutputSchema,
        traceCtx: { analysisId, stage: "normalize" },
      });
      const briefJson = JSON.stringify(norm.brief);
      const final = await completeJson({
        system: systemSkeptic,
        user: buildQuickRoastPrompt(briefJson),
        schema: finalAnalysisSchema,
        traceCtx: { analysisId, stage: "quick_roast" },
      });
      const pseudoCommittee: CommitteeOutput[] = [];
      await persistCompletedAnalysis({
        analysisId,
        startupId: startup.id as string,
        runType,
        tone,
        canonicalBrief: norm.brief as unknown as Record<string, unknown>,
        final,
        committee: pseudoCommittee,
      });
      await incrementUsageAfterAnalysis({
        userId: startup.user_id as string,
        runType,
      });
      return;
    }

    const norm = await completeJson({
      system: systemSkeptic,
      user: buildNormalizePrompt({ rawJson, extractedUploadText: uploadText }),
      schema: normalizeOutputSchema,
      traceCtx: { analysisId, stage: "normalize" },
    });
    const briefJson = JSON.stringify(norm.brief);

    const [
      vc,
      cust,
      growth,
      prod,
      tech,
      comp,
    ] = await Promise.all([
      completeJson({
        system: systemSkeptic,
        user: buildVcPartnerPrompt(briefJson),
        schema: committeeOutputSchema,
        traceCtx: { analysisId, stage: "committee:vc_partner" },
      }),
      completeJson({
        system: systemSkeptic,
        user: buildCustomerSkepticPrompt(briefJson),
        schema: committeeOutputSchema,
        traceCtx: { analysisId, stage: "committee:customer_skeptic" },
      }),
      completeJson({
        system: systemSkeptic,
        user: buildGrowthLeadPrompt(briefJson),
        schema: committeeOutputSchema,
        traceCtx: { analysisId, stage: "committee:growth_lead" },
      }),
      completeJson({
        system: systemSkeptic,
        user: buildProductStrategistPrompt(briefJson),
        schema: committeeOutputSchema,
        traceCtx: { analysisId, stage: "committee:product_strategist" },
      }),
      completeJson({
        system: systemSkeptic,
        user: buildTechnicalReviewerPrompt(briefJson),
        schema: committeeOutputSchema,
        traceCtx: { analysisId, stage: "committee:technical_reviewer" },
      }),
      completeJson({
        system: systemSkeptic,
        user: buildCompetitorAnalystPrompt(briefJson),
        schema: committeeOutputSchema,
        traceCtx: { analysisId, stage: "committee:competitor_analyst" },
      }),
    ]);

    const committee: CommitteeOutput[] = [vc, cust, growth, prod, tech, comp];
    committeeListSchema.parse(committee);

    const committeeJson = JSON.stringify(committee);

    const contradictions = await completeJson({
      system: systemSkeptic,
      user: buildContradictionsPrompt(briefJson, committeeJson),
      schema: contradictionsOutputSchema,
      traceCtx: { analysisId, stage: "contradictions" },
    });

    const assumptions = await completeJson({
      system: systemSkeptic,
      user: buildAssumptionsPrompt(
        briefJson,
        committeeJson,
        runType === "deep" ? "deep" : "committee",
      ),
      schema: assumptionsOutputSchema,
      traceCtx: { analysisId, stage: "assumptions" },
    });

    const synthesisPrompt = buildSynthesisPrompt({
      briefJson,
      committeeJson,
      contradictionsJson: JSON.stringify(contradictions.contradictions),
      assumptionsJson: JSON.stringify(assumptions.assumptions),
      runType,
      tone,
    });

    const { data: synthesis, toolCalls } = await completeJsonWithTools({
      system: buildSynthesisSystemPrompt(runType),
      user: synthesisPrompt,
      schema: finalAnalysisSchema,
      tools: SYNTHESIS_TOOLS,
      toolContext: {
        startupId: startup.id as string,
        analysisId,
      },
      // Deep mode: force at least one tool call on the first hop so the
      // deliverable always shows agentic behavior. Committee mode lets the
      // model decide.
      initialToolChoice: runType === "deep" ? "required" : "auto",
      traceCtx: { analysisId, stage: "synthesis" },
    });

    logToolUsage(analysisId, toolCalls);

    await persistCompletedAnalysis({
      analysisId,
      startupId: startup.id as string,
      runType,
      tone,
      canonicalBrief: norm.brief as unknown as Record<string, unknown>,
      final: {
        ...synthesis,
        contradictions: contradictions.contradictions as typeof synthesis.contradictions,
        assumptions: assumptions.assumptions as typeof synthesis.assumptions,
      },
      committee,
    });
    await incrementUsageAfterAnalysis({
      userId: startup.user_id as string,
      runType,
    });
  } catch (e) {
    await markAnalysisFailed(analysisId, e instanceof Error ? e.message : String(e));
    throw e;
  }
}

function logToolUsage(analysisId: string, toolCalls: ToolDispatchInfo[]) {
  if (process.env.NODE_ENV !== "production") {
    if (toolCalls.length === 0) {
      console.info("[pipeline] synthesis used no tools", { analysisId });
    } else {
      console.info(
        "[pipeline] synthesis tool calls",
        toolCalls.map((t) => ({
          name: t.name,
          ok: t.result.ok,
          ms: t.latencyMs,
        })),
      );
    }
  }
}

function snapshotFromStartup(s: Record<string, unknown>) {
  return {
    name: s.name,
    oneLiner: s.one_liner,
    problem: s.problem,
    targetCustomer: s.target_customer,
    whyNow: s.why_now,
    pricingModel: s.pricing_model,
    goToMarket: s.go_to_market,
    competitors: s.competitors,
    unfairAdvantage: s.unfair_advantage,
    stage: s.stage,
    websiteUrl: s.website_url,
    founderBackground: s.founder_background,
    constraints: s.constraints,
  };
}
