/**
 * Smoke test for Office Hours: runs one real round-trip against OpenAI
 * with a hard-coded brief + critic section.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npm run smoke:office-hours
 *
 * Requires OPENAI_API_KEY. Exits 1 if missing.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error(
      "OPENAI_API_KEY is not set. This smoke test makes a real OpenAI call.",
    );
    process.exit(1);
  }

  const { buildOfficeHoursSystemPrompt } = await import(
    "@/lib/prompts/officeHours"
  );
  const { getOpenAI, DEFAULT_MODEL } = await import("@/lib/openai/instance");
  const { SYNTHESIS_TOOLS, dispatchTool } = await import(
    "@/lib/openai/tools"
  );

  const brief = JSON.stringify({
    name: "Pageful",
    oneLiner: "Better workspace docs for SMBs",
    problem: "Knowledge workers waste time in fragmented tools",
    targetCustomer: "SMB knowledge workers",
    competitors: ["Notion", "Coda"],
    unfairAdvantage: "Better UX",
    stage: "idea",
  });

  const criticSection = JSON.stringify({
    agent: "vc_partner",
    score: 3,
    strongestAngle: "Large TAM in productivity tools",
    biggestConcern:
      "No defensible moat — 'better UX' is not a moat against Notion's network effects and ecosystem.",
    concerns: [
      "Feature business risk",
      "Notion has raised $300M+ and is deeply entrenched",
      "No distribution wedge",
    ],
    whatWouldChangeMyMind: [
      "Evidence of a segment Notion badly under-serves",
      "A unique data or workflow moat",
    ],
    punchyLine: "This is a feature, not a company.",
  });

  const systemPrompt = buildOfficeHoursSystemPrompt(
    "vc_partner",
    brief,
    criticSection,
  );

  const openai = getOpenAI();
  const userMessage = `You said "this is a feature, not a company." But we have a unique collaboration engine that Notion doesn't support — real-time co-editing on structured databases with computed columns. Our beta has 200 teams with 60% weekly retention. How is that a feature?`;

  console.log("--- Office Hours Smoke Test ---");
  console.log(`Role: vc_partner`);
  console.log(`User: ${userMessage.slice(0, 120)}...`);
  console.log("");

  const t0 = Date.now();

  const messages: Array<{ role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: unknown[]; tool_call_id?: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  // Tool-calling loop (max 3 hops, same as synthesis)
  let assistantContent: string | null = null;
  const MAX_HOPS = 3;
  const fakeCtx = {
    startupId: "00000000-0000-0000-0000-000000000000",
    analysisId: "00000000-0000-0000-0000-000000000000",
  };

  for (let hop = 0; hop <= MAX_HOPS; hop++) {
    const forceFinal = hop === MAX_HOPS;
    const res = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: messages as Parameters<typeof openai.chat.completions.create>[0]["messages"],
      temperature: 0.5,
      tools: forceFinal ? undefined : SYNTHESIS_TOOLS,
      tool_choice: forceFinal ? undefined : "auto",
    });

    const msg = res.choices[0]?.message;
    if (!msg) throw new Error("No response from OpenAI");

    const toolCalls = msg.tool_calls ?? [];
    if (!forceFinal && toolCalls.length > 0) {
      console.log(`  [hop ${hop}] Tool calls: ${toolCalls.map((tc) => tc.function.name).join(", ")}`);
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        const result = await dispatchTool(
          call.function.name,
          call.function.arguments ?? "{}",
          fakeCtx,
        );
        console.log(
          `  [tool] ${call.function.name} → ${result.ok ? "ok" : "error"}`,
        );
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    assistantContent = msg.content ?? "";
    break;
  }

  const elapsed = Date.now() - t0;

  console.log(`\nAssistant response (${elapsed}ms):`);
  console.log(assistantContent ?? "(empty)");
  console.log(`\nSmoke test passed.`);
}

main().catch((e) => {
  console.error("Smoke test failed:", e);
  process.exit(1);
});
