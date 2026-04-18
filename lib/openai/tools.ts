import type OpenAI from "openai";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOpenAI } from "@/lib/openai/instance";

/**
 * Tool execution context — supplied by the synthesis stage so each tool
 * can scope its data access to the current analysis without exposing IDs
 * to the model.
 */
export type ToolContext = {
  startupId: string;
  analysisId: string;
};

export type ToolResult = {
  ok: boolean;
  data?: unknown;
  error?: string;
};

export type ToolDispatchInfo = {
  name: string;
  argsJson: string;
  result: ToolResult;
  latencyMs: number;
};

/**
 * OpenAI tool specs the synthesis agent may choose to invoke.
 * The model decides whether to use any of these (tool_choice="auto") and which
 * arguments to pass.
 */
export const SYNTHESIS_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "lookup_competitors",
      description:
        "Look up brief market context for one or more SPECIFIC competitor COMPANY names that are explicitly listed in the brief (e.g. 'Notion', 'Stripe'). Use this when the brief names ≥1 real competitor and you want sharper grounding for a defensibility critique. Do NOT call this with category labels like 'roofing software', industry segments, or hypothetical/unknown company names — if the brief names no real competitors, skip this tool.",
      parameters: {
        type: "object",
        properties: {
          names: {
            type: "array",
            items: { type: "string" },
            description: "1-5 competitor company names exactly as listed in the brief.",
            minItems: 1,
            maxItems: 5,
          },
        },
        required: ["names"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_uploaded_docs",
      description:
        "Semantic search over the startup's uploaded supporting documents (pitch deck, notes). Use when you need evidence to support or refute a specific claim. If no documents are uploaded, the tool returns { kind: 'no_docs' } and you should skip and proceed.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Concrete question or claim to ground in the docs.",
          },
          k: {
            type: "integer",
            description: "Number of chunks to retrieve (1-5).",
            minimum: 1,
            maximum: 5,
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_prior_analyses",
      description:
        "Fetch verdicts and summaries of previous analyses of the SAME startup so you can detect whether the founder is iterating away from prior weaknesses. Returns an empty array if this is the first analysis.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

/**
 * Server-side dispatcher. The model never sees IDs; we resolve them via the
 * supplied ToolContext.
 */
export async function dispatchTool(
  name: string,
  argsJson: string,
  ctx: ToolContext,
): Promise<ToolResult> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch (e) {
    return { ok: false, error: `invalid_arguments_json: ${String(e)}` };
  }

  try {
    switch (name) {
      case "lookup_competitors": {
        const names = (args.names as unknown[] | undefined)?.filter(
          (n): n is string => typeof n === "string" && n.trim().length > 0,
        );
        if (!names || names.length === 0) {
          return { ok: false, error: "no_names_provided" };
        }
        const data = await lookupCompetitors(names.slice(0, 5));
        return { ok: true, data };
      }
      case "search_uploaded_docs": {
        const query = typeof args.query === "string" ? args.query : "";
        const k = typeof args.k === "number" ? Math.min(Math.max(1, args.k), 5) : 3;
        if (!query.trim()) return { ok: false, error: "empty_query" };
        const data = await searchUploadedDocs(query, k, ctx);
        return { ok: true, data };
      }
      case "get_prior_analyses": {
        const data = await getPriorAnalyses(ctx);
        return { ok: true, data };
      }
      default:
        return { ok: false, error: `unknown_tool: ${name}` };
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function lookupCompetitors(names: string[]) {
  // Deliberately lightweight: a focused gpt-4o-mini call that returns short
  // factual blurbs. Falls back to a stub if the API call fails so the
  // synthesis pass is never blocked by this tool.
  const openai = getOpenAI();
  const prompt = `For each competitor name below, return a 1-2 sentence factual description (positioning, target market, business model). If you do not know the company, say "unknown" — do not guess. Output JSON: { "results": [{ "name": string, "description": string }] }.

Competitors:
${names.map((n) => `- ${n}`).join("\n")}`;
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You answer factually about companies. Output JSON only.",
        },
        { role: "user", content: prompt },
      ],
    });
    const raw = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      results?: { name: string; description: string }[];
    };
    return {
      kind: "competitors" as const,
      results: parsed.results ?? names.map((n) => ({ name: n, description: "unknown" })),
    };
  } catch (_e) {
    return {
      kind: "competitors" as const,
      results: names.map((n) => ({ name: n, description: "unknown" })),
    };
  }
}

async function searchUploadedDocs(
  query: string,
  k: number,
  ctx: ToolContext,
): Promise<
  | { kind: "no_docs" }
  | { kind: "matches"; query: string; matches: { excerpt: string; similarity: number }[] }
> {
  const admin = createSupabaseAdminClient();

  const { count } = await admin
    .from("embeddings")
    .select("id", { count: "exact", head: true })
    .eq("owner_type", "startup_upload")
    .eq("owner_id", ctx.startupId);

  if (!count || count === 0) {
    return { kind: "no_docs" };
  }

  let queryEmbedding: number[] | null = null;
  try {
    const openai = getOpenAI();
    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query.slice(0, 8000),
    });
    queryEmbedding = emb.data[0]?.embedding ?? null;
  } catch (_e) {
    queryEmbedding = null;
  }

  if (!queryEmbedding) {
    // Fall back to chronological chunks so the LLM still gets something
    // grounded rather than nothing.
    const { data } = await admin
      .from("embeddings")
      .select("chunk_text")
      .eq("owner_type", "startup_upload")
      .eq("owner_id", ctx.startupId)
      .limit(k);
    return {
      kind: "matches",
      query,
      matches: (data ?? []).map((d) => ({
        excerpt: String(d.chunk_text).slice(0, 600),
        similarity: 0,
      })),
    };
  }

  // Try the SQL RPC if present; otherwise gracefully degrade to in-memory
  // cosine over a capped fetch (small upload corpus expected).
  const rpc = await admin.rpc("match_startup_embeddings", {
    p_startup_id: ctx.startupId,
    p_query: queryEmbedding,
    p_match_count: k,
  });

  if (!rpc.error && Array.isArray(rpc.data)) {
    return {
      kind: "matches",
      query,
      matches: rpc.data.map((d: { chunk_text: string; similarity: number }) => ({
        excerpt: String(d.chunk_text).slice(0, 600),
        similarity: Number(d.similarity ?? 0),
      })),
    };
  }

  const { data: rows } = await admin
    .from("embeddings")
    .select("chunk_text, embedding")
    .eq("owner_type", "startup_upload")
    .eq("owner_id", ctx.startupId)
    .limit(200);

  const scored = (rows ?? [])
    .map((r) => {
      const v = parseEmbedding(r.embedding);
      return v
        ? { excerpt: String(r.chunk_text).slice(0, 600), similarity: cosine(queryEmbedding!, v) }
        : null;
    })
    .filter((x): x is { excerpt: string; similarity: number } => x !== null)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return { kind: "matches", query, matches: scored };
}

async function getPriorAnalyses(ctx: ToolContext) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("analyses")
    .select("id, run_type, verdict, summary, confidence_score, created_at")
    .eq("startup_id", ctx.startupId)
    .neq("id", ctx.analysisId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    kind: "prior_analyses" as const,
    count: data?.length ?? 0,
    analyses: (data ?? []).map((a) => ({
      id: a.id,
      runType: a.run_type,
      verdict: a.verdict,
      summary: a.summary,
      confidenceScore: a.confidence_score,
      createdAt: a.created_at,
    })),
  };
}

function parseEmbedding(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw.map((n) => Number(n));
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map((n) => Number(n));
    } catch {
      return null;
    }
  }
  return null;
}

function cosine(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
