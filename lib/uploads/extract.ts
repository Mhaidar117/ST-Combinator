import pdfParse from "pdf-parse";

const MAX_CHARS = 50_000;

export async function extractTextFromBuffer(
  buf: Buffer,
  mimeType: string,
): Promise<{ text: string; error?: string }> {
  try {
    if (mimeType === "application/pdf") {
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
