/**
 * Live demo of the agentic synthesis loop.
 *
 * Builds a realistic dummy startup brief in-memory, drives
 * `completeJsonWithTools` against the real OpenAI API (so the model
 * really chooses whether to call any tools), and prints every tool
 * decision in order.
 *
 * Two modes:
 *
 *   1. Lightweight demo (no DB needed):
 *        OPENAI_API_KEY=sk-... npx tsx scripts/demo-agentic.ts
 *      Uses an in-memory tool context where:
 *        - lookup_competitors hits OpenAI directly,
 *        - search_uploaded_docs always returns no_docs (no Supabase),
 *        - get_prior_analyses returns an empty list.
 *      Sufficient to *prove* the model picks tools dynamically.
 *
 *   2. Full demo (real Supabase + persisted traces):
 *        Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *        EVAL_USER_ID and run the same command. Tool dispatches
 *        write to analysis_traces and `get_prior_analyses`/
 *        `search_uploaded_docs` actually query the DB.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

import { z } from "zod";

const STARTUPS = [
  {
    id: "demo-clone",
    label: "Notion clone (should reach for lookup_competitors)",
    user: `You are evaluating a startup brief.

Brief:
- Product: A workspace doc tool called "Pageful" — pages, databases, and AI write-helpers.
- Target customer: Knowledge workers at SMBs.
- Differentiation (founder claim): "Better UX than Notion."
- Competitors: Notion, Coda, Microsoft Loop.
- TAM: $20B / 200M knowledge workers.
- Founder: ex-design lead at a Series A SaaS.

Output a JSON object with:
{ "verdict": "<short verdict>", "notes": ["...","..."] }

You have access to tools. Use lookup_competitors if grounding the
defensibility critique would meaningfully change your verdict.`,
  },
  {
    id: "demo-niche",
    label: "Tight vertical wedge (should NOT need any tool)",
    user: `Brief:
- Product: Inspection-photo manager for commercial roofing crews.
- Target: 50-200-employee roofing contractors in the US southeast.
- Wedge: Replaces 3 manual steps per job; founder did this for 8 years.
- Competitors: None named (founder spoke to 30 contractors, none use SaaS).
- Pricing: $200/site/year, ~50 sites per contractor.
- Distribution: warm intros via roofing trade associations.

Output JSON: { "verdict": "<short>", "notes": ["...","..."] }
You have tools available; use them only if you genuinely need grounding.`,
  },
];

const finalSchema = z.object({
  verdict: z.string(),
  notes: z.array(z.string()),
});

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "OPENAI_API_KEY is not set. This demo makes a real OpenAI call.",
    );
    process.exit(1);
  }

  // Lazy-import after env loaded so the OpenAI singleton picks up the key.
  const { completeJsonWithTools } = await import("@/lib/openai/client");
  const { SYNTHESIS_TOOLS } = await import("@/lib/openai/tools");

  const fakeStartupId = "00000000-0000-0000-0000-000000000000";
  const fakeAnalysisId = "00000000-0000-0000-0000-000000000000";

  for (const sc of STARTUPS) {
    console.log("\n────────────────────────────────────────");
    console.log(`Scenario: ${sc.label}`);
    console.log("────────────────────────────────────────");

    const t0 = Date.now();
    let out;
    try {
      out = await completeJsonWithTools({
        system:
          "You are the synthesis agent. Decide whether any tool is worth calling. If yes, call it; if not, output the final JSON directly.",
        user: sc.user,
        schema: finalSchema,
        tools: SYNTHESIS_TOOLS,
        toolContext: {
          startupId: fakeStartupId,
          analysisId: fakeAnalysisId,
        },
      });
    } catch (e) {
      console.error("FAILED:", e instanceof Error ? e.message : e);
      continue;
    }
    const elapsed = Date.now() - t0;

    console.log(`\nTool decisions: ${out.toolCalls.length}`);
    for (const [i, tc] of out.toolCalls.entries()) {
      console.log(`  [${i + 1}] ${tc.name} (${tc.latencyMs}ms)`);
      console.log(`      args: ${truncate(tc.argsJson, 160)}`);
      const summary = tc.result.ok
        ? truncate(JSON.stringify(tc.result.data), 200)
        : `ERROR ${tc.result.error}`;
      console.log(`      result: ${summary}`);
    }

    console.log(`\nFinal verdict: ${out.data.verdict}`);
    console.log(`Notes:`);
    for (const n of out.data.notes) console.log(`  - ${n}`);
    console.log(`\nTotal latency: ${elapsed}ms`);
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
