"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { RunType, Tone } from "@/types/analysis";

type StatusResponse = {
  analysisId: string;
  status: "queued" | "processing" | "completed" | "failed";
  runType: RunType;
  percent: number;
  completedStages: string[];
  pendingStages: string[];
  currentStageLabel: string;
  lastError: string | null;
  completedAt: string | null;
};

const POLL_INTERVAL_MS = 1500;

export function RunAnalysisClient({ startupId }: { startupId: string }) {
  const router = useRouter();
  const [tone, setTone] = useState<Tone>("direct");
  const [loading, setLoading] = useState<RunType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const cancelRef = useRef(false);

  useEffect(() => () => {
    cancelRef.current = true;
  }, []);

  async function pollUntilDone(analysisId: string) {
    while (!cancelRef.current) {
      try {
        const r = await fetch(`/api/analyses/${analysisId}/status`, {
          cache: "no-store",
        });
        if (!r.ok) {
          await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
          continue;
        }
        const j = (await r.json()) as StatusResponse;
        setStatus(j);
        if (j.status === "completed") {
          router.push(`/analyses/${analysisId}`);
          router.refresh();
          return;
        }
        if (j.status === "failed") {
          setError(j.lastError ?? "Analysis failed");
          setLoading(null);
          return;
        }
      } catch {
        // network blip; keep polling
      }
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
    }
  }

  async function run(runType: RunType) {
    setError(null);
    setStatus(null);
    setLoading(runType);
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId, runType, tone }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Analysis failed");
        setLoading(null);
        return;
      }
      await pollUntilDone(j.analysisId as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setLoading(null);
    }
  }

  const showProgress = loading !== null && status !== null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Tone</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          disabled={loading !== null}
        >
          <option value="polite">Polite</option>
          <option value="direct">Direct</option>
          <option value="brutal">Brutal</option>
        </select>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">Analysis failed</p>
          <p className="mt-1 break-words text-xs opacity-90">{error}</p>
        </div>
      )}

      {showProgress && status && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">{status.currentStageLabel}</span>
            <span className="tabular-nums text-muted-foreground">
              {status.percent}%
            </span>
          </div>
          <Progress value={status.percent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {status.completedStages.length} / {status.completedStages.length +
              status.pendingStages.length}{" "}
            stages complete
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          disabled={loading !== null}
          onClick={() => run("quick_roast")}
        >
          {loading === "quick_roast" ? "Running…" : "Quick Roast"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={loading !== null}
          onClick={() => run("committee")}
        >
          {loading === "committee" ? "Running…" : "Investor Committee"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading !== null}
          onClick={() => run("deep")}
        >
          {loading === "deep" ? "Running…" : "Deep Stress Test"}
        </Button>
      </div>
    </div>
  );
}
