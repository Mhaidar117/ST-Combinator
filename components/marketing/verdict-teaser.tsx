"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Verdict = {
  label: string;
  oneLiner: string;
  tone: "destructive" | "warning" | "neutral" | "promising" | "strong";
};

const VERDICTS: Verdict[] = [
  {
    label: "Likely dead",
    oneLiner: "Distribution fantasy meets SMB claims with enterprise GTM.",
    tone: "destructive",
  },
  {
    label: "Clone risk",
    oneLiner:
      "Notion-shaped UX with no underlying data moat or distribution edge.",
    tone: "warning",
  },
  {
    label: "Weak wedge",
    oneLiner:
      "Niche pain is real, but TAM tops out before hitting venture-scale.",
    tone: "neutral",
  },
  {
    label: "Promising",
    oneLiner:
      "Specific buyer, painful workflow, plausible PLG hook. Worth a 90-day MVP.",
    tone: "promising",
  },
  {
    label: "Strong fit",
    oneLiner:
      "Founder-market fit is rare; price tested at $2k MRR. Investor-ready.",
    tone: "strong",
  },
];

const TONE_CLASSES: Record<Verdict["tone"], string> = {
  destructive: "text-destructive",
  warning: "text-orange-400 dark:text-orange-300",
  neutral: "text-amber-400 dark:text-amber-300",
  promising: "text-sky-400 dark:text-sky-300",
  strong: "text-emerald-400 dark:text-emerald-300",
};

const ROTATION_INTERVAL_MS = 3500;

export function VerdictTeaser() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % VERDICTS.length);
      setFadeKey((k) => k + 1);
    }, ROTATION_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  const current = VERDICTS[index];

  return (
    <Card
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-live="polite"
    >
      <CardHeader>
        <CardTitle className="text-base text-muted-foreground">
          Verdict preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div
          key={fadeKey}
          className="space-y-2 motion-safe:animate-[fadeIn_400ms_ease-out]"
        >
          <p className={cn("font-semibold", TONE_CLASSES[current.tone])}>
            {current.label}
          </p>
          <p className="text-muted-foreground min-h-[2.5rem]">
            {current.oneLiner}
          </p>
        </div>
        <div className="flex items-center gap-1.5 pt-2">
          {VERDICTS.map((v, i) => (
            <button
              key={v.label}
              type="button"
              aria-label={`Show verdict: ${v.label}`}
              onClick={() => {
                setIndex(i);
                setFadeKey((k) => k + 1);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index
                  ? "w-6 bg-foreground/70"
                  : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
              )}
            />
          ))}
        </div>
      </CardContent>

      {/* Local fade-in keyframes; scoped via JSX style to avoid touching globals.css */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </Card>
  );
}
