import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/analyses/[analysisId]
 *
 * Removes an analysis the caller owns. RLS on `public.analyses` enforces
 * ownership (analyses_all_own → joins through startups.user_id = auth.uid()),
 * so we deliberately use the user-scoped Supabase client (NOT the admin
 * client) and let Postgres reject cross-user deletes. The FK chain has
 * `on delete cascade` for analysis_traces / analysis_scores / analysis_sections,
 * so children are cleaned up automatically.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { analysisId: string } },
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error, count } = await supabase
    .from("analyses")
    .delete({ count: "exact" })
    .eq("id", params.analysisId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!count) {
    // RLS silently filtered the row out — either the analysis doesn't exist or
    // the caller doesn't own it. Surface as 404 either way.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
