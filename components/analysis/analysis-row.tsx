"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type AnalysisRowProps = {
  id: string;
  /** Optional left label, e.g. startup name on the dashboard. */
  contextLabel?: string;
  runType: string;
  status: string;
  verdict?: string | null;
};

export function AnalysisRow({
  id,
  contextLabel,
  runType,
  status,
  verdict,
}: AnalysisRowProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (
      !window.confirm(
        "Delete this analysis? This will permanently remove its scorecard, sections, and traces.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
      const text = await r.text();
      let body: { error?: string } = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        // non-JSON body
      }
      if (!r.ok) {
        setError(body.error ?? `Delete failed (HTTP ${r.status}).`);
        setBusy(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-sm">
      <div className="min-w-0">
        {contextLabel ? (
          <>
            <span className="text-muted-foreground">{contextLabel}</span>
            {" · "}
          </>
        ) : null}
        <span>{runType}</span>
        {" · "}
        <Badge variant="outline">{status}</Badge>
        {verdict ? (
          <span className="text-muted-foreground"> — {verdict}</span>
        ) : null}
        {error ? (
          <p className="mt-1 text-xs text-destructive">{error}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Button asChild size="sm" variant="ghost">
          <Link href={`/analyses/${id}`}>Open</Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDelete}
          disabled={busy}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {busy ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}
