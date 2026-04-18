/**
 * Best-effort embedding writer for uploaded documents.
 *
 * Called from `app/api/uploads/route.ts` after a `startup_uploads` row is
 * persisted. Failures here are swallowed (logged in dev) so a transient
 * embedding model error never blocks an upload — the synthesis stage's
 * `search_uploaded_docs` tool gracefully reports `{ kind: "no_docs" }` if
 * embeddings are missing.
 */
import { getOpenAI } from "@/lib/openai/instance";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const EMBED_MODEL = "text-embedding-3-small";
const CHUNK_CHARS = 1200; // ~300 tokens; fine for 3-small (1536 dim, 8k context)
const CHUNK_OVERLAP = 200;
const MAX_CHUNKS = 60; // hard cap so a giant PDF doesn't burn the budget

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < cleaned.length && chunks.length < MAX_CHUNKS) {
    chunks.push(cleaned.slice(i, i + CHUNK_CHARS));
    if (i + CHUNK_CHARS >= cleaned.length) break;
    i += CHUNK_CHARS - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * Embeds the given text and writes one row per chunk into `embeddings`
 * with `owner_type='startup_upload'`, `owner_id=<startupId>`. The upload row
 * id is stored in `metadata.upload_id` for traceability.
 */
export async function writeUploadEmbeddings(opts: {
  startupId: string;
  uploadId: string;
  text: string | null | undefined;
}): Promise<{ written: number; skipped?: string }> {
  if (!opts.text || opts.text.trim().length < 50) {
    return { written: 0, skipped: "empty_or_too_short" };
  }
  const chunks = chunkText(opts.text);
  if (chunks.length === 0) return { written: 0, skipped: "no_chunks" };

  try {
    const openai = getOpenAI();
    const res = await openai.embeddings.create({
      model: EMBED_MODEL,
      input: chunks,
    });
    const vectors = res.data
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);

    const admin = createSupabaseAdminClient();
    const rows = vectors.map((v, i) => ({
      owner_type: "startup_upload",
      owner_id: opts.startupId,
      chunk_text: chunks[i],
      // pgvector accepts the textual "[1,2,3]" form via supabase-js
      embedding: `[${v.join(",")}]`,
      metadata: { upload_id: opts.uploadId, chunk_index: i, model: EMBED_MODEL },
    }));

    const { error } = await admin.from("embeddings").insert(rows);
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[embeddings] insert failed:", error.message);
      }
      return { written: 0, skipped: `db_insert_failed: ${error.message}` };
    }
    return { written: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (process.env.NODE_ENV !== "production") {
      console.warn("[embeddings] embed failed:", msg);
    }
    return { written: 0, skipped: `embed_failed: ${msg}` };
  }
}
