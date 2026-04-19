const MAX_CHARS = 50_000;

// NOTE: We deliberately do NOT do `import pdfParse from "pdf-parse"`. The
// package's index.js runs a debug-mode block at module load that tries to read
// a hardcoded test PDF, which crashes inside Vercel's serverless runtime. The
// deep path skips that block entirely. The dynamic import also defers loading
// so cold starts for non-PDF requests stay cheap.
async function loadPdfParse(): Promise<(b: Buffer) => Promise<{ text: string }>> {
  // @ts-expect-error pdf-parse ships no types for the deep path.
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  return (mod.default ?? mod) as (b: Buffer) => Promise<{ text: string }>;
}

export async function extractTextFromBuffer(
  buf: Buffer,
  mimeType: string,
): Promise<{ text: string; error?: string }> {
  try {
    if (mimeType === "application/pdf") {
      const pdfParse = await loadPdfParse();
      const data = await pdfParse(buf);
      return { text: sanitize(data.text).slice(0, MAX_CHARS) };
    }
    if (
      mimeType === "text/plain" ||
      mimeType === "text/markdown" ||
      mimeType === "application/octet-stream"
    ) {
      return { text: sanitize(buf.toString("utf8")).slice(0, MAX_CHARS) };
    }
    return { text: "", error: "Unsupported type" };
  } catch (e) {
    return { text: "", error: String(e) };
  }
}

function sanitize(s: string): string {
  return s.replace(/\u0000/g, "").trim();
}
