import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { extractTextFromBuffer } from "@/lib/uploads/extract";
import { writeUploadEmbeddings } from "@/lib/embeddings/writer";
import { canUpload } from "@/lib/usage/limits";
import type { PlanTier } from "@/types/analysis";
import { randomToken } from "@/lib/utils";

const ALLOWED = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (!profile || !canUpload(profile.plan_tier as PlanTier)) {
    return NextResponse.json(
      { error: "Uploads require Pro plan" },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  const startupId = form.get("startupId");
  if (!(file instanceof File) || typeof startupId !== "string") {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const { data: startup, error: suErr } = await supabase
    .from("startups")
    .select("id")
    .eq("id", startupId)
    .eq("user_id", user.id)
    .single();

  if (suErr || !startup) {
    return NextResponse.json({ error: "Startup not found" }, { status: 404 });
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED.has(mime)) {
    return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = mime === "application/pdf" ? "pdf" : mime.includes("markdown") ? "md" : "txt";
  const storagePath = `${startupId}/${randomToken()}.${ext}`;

  const admin = createSupabaseAdminClient();
  const { error: upErr } = await admin.storage
    .from("uploads")
    .upload(storagePath, buf, {
      contentType: mime,
      upsert: false,
    });

  if (upErr) {
    return NextResponse.json(
      { error: "Storage upload failed — create bucket `uploads` in Supabase" },
      { status: 500 },
    );
  }

  const extracted = await extractTextFromBuffer(buf, mime);

  const { data: row, error: insErr } = await admin
    .from("startup_uploads")
    .insert({
      startup_id: startupId,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: mime,
      extracted_text: extracted.text || null,
    })
    .select("id")
    .single();

  if (insErr || !row) {
    return NextResponse.json({ error: "Could not save upload" }, { status: 500 });
  }

  // Best-effort embedding write so the synthesis tool `search_uploaded_docs`
  // has chunks to retrieve. Never blocks the upload response.
  void writeUploadEmbeddings({
    startupId,
    uploadId: row.id as string,
    text: extracted.text,
  });

  return NextResponse.json({ uploadId: row.id });
}
