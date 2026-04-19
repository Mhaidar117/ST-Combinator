import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOpenAI, DEFAULT_MODEL } from "@/lib/openai/instance";
import { SYNTHESIS_TOOLS, dispatchTool } from "@/lib/openai/tools";
import { recordTrace } from "@/lib/observability/trace";
import {
  buildOfficeHoursSystemPrompt,
  isValidRole,
  MAX_OFFICE_HOURS_TURNS,
  CREDITS_PER_TURN_BATCH,
  type OfficeHoursRole,
} from "@/lib/prompts/officeHours";
import { MAX_TOOL_HOPS } from "@/lib/openai/client";
import type OpenAI from "openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * POST /api/critics/[role]/chat
 *
 * Accepts { analysisId, messages: ChatMessage[] } and returns the next
 * assistant turn. The critic stays in character and can invoke the
 * existing synthesis tools when defending its position.
 */
export async function POST(
  req: Request,
  { params }: { params: { role: string } },
) {
  // 1. Validate role
  const { role } = params;
  if (!isValidRole(role)) {
    return NextResponse.json(
      { error: `Invalid role: ${role}` },
      { status: 400 },
    );
  }

  // 2. Auth check
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Parse body
  let body: { analysisId: string; messages: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { analysisId, messages } = body;
  if (!analysisId || !Array.isArray(messages)) {
    return NextResponse.json(
      { error: "Missing analysisId or messages" },
      { status: 400 },
    );
  }

  // 4. Count user turns and enforce turn cap
  const userTurns = messages.filter((m) => m.role === "user").length;
  if (userTurns > MAX_OFFICE_HOURS_TURNS) {
    return NextResponse.json(
      {
        error: `Turn limit reached. Maximum ${MAX_OFFICE_HOURS_TURNS} user turns per thread.`,
      },
      { status: 429 },
    );
  }

  // 5. Ownership check — use user-scoped client (RLS enforces ownership).
  //    If the caller doesn't own the analysis, RLS returns null → 404.
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, startup_id, canonical_brief")
    .eq("id", analysisId)
    .single();

  if (!analysis) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 6. Fetch the critic's section from analysis_sections (committee_outputs)
  const { data: sectionRow } = await supabase
    .from("analysis_sections")
    .select("content")
    .eq("analysis_id", analysisId)
    .eq("section_type", "committee_outputs")
    .maybeSingle();

  const committeeOutputs = (sectionRow?.content ?? []) as Array<{
    agent: string;
    score: number;
    strongestAngle: string;
    biggestConcern: string;
    concerns?: string[];
    whatWouldChangeMyMind?: string[];
    punchyLine: string;
    rationale?: string;
  }>;
  const criticSection = committeeOutputs.find((c) => c.agent === role);
  const criticSectionText = criticSection
    ? JSON.stringify(criticSection, null, 2)
    : "No critique available for this role.";

  // 7. Credit check — 1 credit per CREDITS_PER_TURN_BATCH user turns
  const admin = createSupabaseAdminClient();
  if (userTurns > 0 && userTurns % CREDITS_PER_TURN_BATCH === 0) {
    const { data: profile } = await admin
      .from("users_profile")
      .select("plan_tier, monthly_credit_used, monthly_credit_limit")
      .eq("id", user.id)
      .single();

    if (profile) {
      if (profile.monthly_credit_used >= profile.monthly_credit_limit) {
        return NextResponse.json(
          { error: "Monthly credit limit reached." },
          { status: 429 },
        );
      }
      await admin
        .from("users_profile")
        .update({ monthly_credit_used: profile.monthly_credit_used + 1 })
        .eq("id", user.id);
    }
  }

  // 8. Build system prompt
  const briefText =
    typeof analysis.canonical_brief === "string"
      ? analysis.canonical_brief
      : JSON.stringify(analysis.canonical_brief ?? {});

  const systemPrompt = buildOfficeHoursSystemPrompt(
    role as OfficeHoursRole,
    briefText,
    criticSectionText,
  );

  // 9. Call OpenAI with tool-calling loop
  const openai = getOpenAI();
  const t0 = Date.now();

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let assistantContent: string | null = null;

  try {
    for (let hop = 0; hop <= MAX_TOOL_HOPS; hop++) {
      const forceFinal = hop === MAX_TOOL_HOPS;

      const res = await openai.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: chatMessages,
        temperature: 0.5,
        tools: forceFinal ? undefined : SYNTHESIS_TOOLS,
        tool_choice: forceFinal ? undefined : "auto",
      });

      const msg = res.choices[0]?.message;
      if (!msg) throw new Error("OpenAI returned no message");

      const requestedToolCalls = msg.tool_calls ?? [];
      if (!forceFinal && requestedToolCalls.length > 0) {
        chatMessages.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: requestedToolCalls,
        });

        for (const call of requestedToolCalls) {
          if (call.type !== "function") continue;
          const result = await dispatchTool(
            call.function.name,
            call.function.arguments ?? "{}",
            {
              startupId: analysis.startup_id,
              analysisId,
            },
          );
          chatMessages.push({
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
  } catch (e) {
    const latencyMs = Date.now() - t0;
    await recordTrace({
      analysisId,
      stage: `office_hours:${role}`,
      ok: false,
      latencyMs,
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }

  if (!assistantContent) {
    assistantContent = "I was unable to formulate a response. Please try again.";
  }

  const latencyMs = Date.now() - t0;

  // 10. Record trace
  await recordTrace({
    analysisId,
    stage: `office_hours:${role}`,
    model: DEFAULT_MODEL,
    ok: true,
    latencyMs,
    excerpt: assistantContent.slice(0, 500),
  });

  // 11. Persist conversation to office_hours_threads (upsert)
  const updatedMessages = [
    ...messages,
    { role: "assistant" as const, content: assistantContent },
  ];

  await admin.from("office_hours_threads").upsert(
    {
      analysis_id: analysisId,
      role,
      messages: updatedMessages,
      user_turns: userTurns,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "analysis_id,role" },
  );

  return NextResponse.json({
    message: assistantContent,
    userTurns,
    maxTurns: MAX_OFFICE_HOURS_TURNS,
  });
}
