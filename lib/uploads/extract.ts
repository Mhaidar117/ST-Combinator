const MAX_CHARS = 50_000;

// We use `unpdf` (a serverless-friendly fork of pdfjs) instead of `pdf-parse`.
// `pdf-parse` ships sample test data, runs a debug code path at module load
// that crashes on Vercel, and pulls in heavy worker bundles that blow past the
// serverless memory budget. `unpdf` is dependency-free and works in Node /
// edge / browser uniformly.
async function loadUnpdf() {
  return await import("unpdf");
}

export async function extractTextFromBuffer(
  buf: Buffer,
  mimeType: string,
): Promise<{ text: string; error?: string }> {
  try {
    if (mimeType === "application/pdf") {
      const { extractText, getDocumentProxy } = await loadUnpdf();
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const { text } = await extractText(pdf, { mergePages: true });
      const joined = Array.isArray(text) ? text.join("\n") : text;
      return { text: sanitize(joined).slice(0, MAX_CHARS) };
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
    return {
      text: "",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function sanitize(s: string): string {
  return s.replace(/\u0000/g, "").trim();
}
