import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { extractTextFromBuffer } from "@/lib/uploads/extract";
import { completeJson } from "@/lib/openai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ALLOWED = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/octet-stream",
]);

// Mirror of the create-startup form fields. All optional because the
// document may not cover every field; the user can fill the rest by hand.
const parsedStartupSchema = z.object({
  name: z.string().nullable().optional(),
  one_liner: z.string().nullable().optional(),
  problem: z.string().nullable().optional(),
  target_customer: z.string().nullable().optional(),
  why_now: z.string().nullable().optional(),
  pricing_model: z.string().nullable().optional(),
  go_to_market: z.string().nullable().optional(),
  competitors: z.array(z.string()).nullable().optional(),
  unfair_advantage: z.string().nullable().optional(),
  stage: z.enum(["idea", "mvp", "revenue"]).nullable().optional(),
  website_url: z.string().nullable().optional(),
  founder_background: z.string().nullable().optional(),
  constraints: z.string().nullable().optional(),
});

export type ParsedStartup = z.infer<typeof parsedStartupSchema>;

export async function POST(req: Request) {
  // Wrap the ENTIRE handler so any unexpected throw becomes a structured 500
  // instead of letting Vercel return a bare 502 with no useful info.
  try {
    console.log("[parse] start");

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.log("[parse] unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[parse] user ok", user.id);

    const form = await req.formData().catch((e) => {
      console.log("[parse] formData failed", e);
      return null;
    });
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing file (multipart form field 'file')" },
        { status: 400 },
      );
    }
    console.log("[parse] file received", {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    const mime = file.type || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mime}. Use PDF, TXT, or MD.` },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    console.log("[parse] buf bytes", buf.length);

    const extracted = await extractTextFromBuffer(buf, mime);
    console.log("[parse] extracted chars", extracted.text.length, "err?", extracted.error);

    if (!extracted.text || extracted.text.length < 50) {
      return NextResponse.json(
        {
          error:
            extracted.error ??
            "Could not extract enough text from this file. Try a different PDF.",
        },
        { status: 422 },
      );
    }

    try {
      const parsed = await completeJson({
        system:
          "You extract structured startup-pitch metadata from founder documents. Output JSON only. Use null for fields the document does not cover; never invent details.",
        user: buildPrompt(extracted.text),
        schema: parsedStartupSchema,
      });
      console.log("[parse] llm ok");
      return NextResponse.json({ parsed, charCount: extracted.text.length });
    } catch (e) {
      console.log("[parse] llm failed", e);
      return NextResponse.json(
        {
          error:
            e instanceof Error ? e.message : "Could not parse document with LLM",
        },
        { status: 502 },
      );
    }
  } catch (e) {
    console.error("[parse] fatal", e);
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `${e.name}: ${e.message}`
            : "Unexpected server error in /api/startups/parse",
      },
      { status: 500 },
    );
  }
}

function buildPrompt(text: string): string {
  return `Read this founder pitch document and extract the following structured fields. Return JSON matching this exact shape — every field is optional; use null when the document does not contain the information. NEVER invent details that are not supported by the text.

{
  "name": string | null,                    // company / product name
  "one_liner": string | null,               // 1 sentence pitch
  "problem": string | null,                 // problem the company solves (1-3 sentences)
  "target_customer": string | null,         // who specifically pays / uses
  "why_now": string | null,                 // why this moment in time, what changed
  "pricing_model": string | null,           // e.g. "$49/mo seat", "20% take rate"
  "go_to_market": string | null,            // distribution / acquisition plan (1-3 sentences)
  "competitors": string[] | null,           // ONLY real, named companies; OMIT category names like "incumbents"
  "unfair_advantage": string | null,        // moat / why this team wins
  "stage": "idea" | "mvp" | "revenue" | null,
  "website_url": string | null,             // include only if the doc states one explicitly
  "founder_background": string | null,      // 1-2 sentences on team
  "constraints": string | null              // budget, time, regulatory, technical constraints
}

Document text:
"""
${text}
"""

Output JSON only. No markdown fences. No commentary.`;
}
