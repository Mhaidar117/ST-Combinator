"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useState } from "react";
import { buildCodingAgentPrompt } from "@/lib/prompts/codingAgent";

type SectionMap = Record<string, unknown>;

export function AnalysisReport(props: {
  analysisId: string;
  startupId: string;
  verdict: string | null;
  summary: string | null;
  runType: string;
  status: string;
  scores: {
    overall_score: number;
    problem_severity: number;
    customer_clarity: number;
    market_timing: number;
    distribution_plausibility: number;
    monetization_strength: number;
    defensibility: number;
    founder_market_fit: number;
    speed_to_mvp: number;
    retention_potential: number;
    investor_attractiveness: number;
  } | null;
  sections: SectionMap;
  inputSnapshot?: Record<string, unknown>;
}) {
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const [aiPromptCopied, setAiPromptCopied] = useState(false);

  async function share() {
    setShareMsg(null);
    const r = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ analysisId: props.analysisId }),
    });
    const j = await r.json();
    if (!r.ok) {
      setShareMsg(j.error ?? "Could not share");
      return;
    }
    await navigator.clipboard.writeText(j.shareUrl);
    setShareMsg("Link copied to clipboard.");
  }

  async function exportAiPrompt() {
    const snap = (props.inputSnapshot ?? {}) as Record<string, unknown>;
    const prompt = buildCodingAgentPrompt({
      startup: {
        name: snap.name as string | undefined,
        one_liner: snap.one_liner as string | undefined,
        problem: snap.problem as string | undefined,
        target_customer: snap.target_customer as string | undefined,
        why_now: snap.why_now as string | undefined,
        pricing_model: snap.pricing_model as string | undefined,
        go_to_market: snap.go_to_market as string | undefined,
        competitors: snap.competitors as string[] | undefined,
        unfair_advantage: snap.unfair_advantage as string | undefined,
        stage: snap.stage as string | undefined,
        constraints: snap.constraints as string | undefined,
      },
      verdict: props.verdict,
      summary: props.summary,
      killReasons: kill,
      surviveReasons: survive,
    });
    setAiPrompt(prompt);
    setAiPromptCopied(false);
    try {
      await navigator.clipboard.writeText(prompt);
      setAiPromptCopied(true);
    } catch {
      // clipboard may be unavailable (insecure context) — user can still copy
      // from the textarea below.
    }
  }

  const kill = props.sections.kill_reasons as string[] | undefined;
  const survive = props.sections.survive_reasons as string[] | undefined;
  const contradictions = props.sections.contradiction_report as
    | {
        title: string;
        severity: string;
        explanation?: string;
        conflictingClaims?: string[];
        suggestedFix?: string;
      }[]
    | undefined;
  const assumptions = props.sections.assumptions as
    | {
        assumption: string;
        fragility: number;
        confidence?: number;
        category?: string;
        test?: string;
      }[]
    | undefined;
  const experiments = props.sections.experiments as string[] | undefined;
  const reposition = props.sections.repositioning as string[] | undefined;
  const committee = props.sections.committee_outputs as
    | Array<{
        agent: string;
        score: number;
        strongestAngle: string;
        biggestConcern: string;
        concerns?: string[];
        whatWouldChangeMyMind?: string[];
        punchyLine: string;
        rationale?: string;
      }>
    | undefined;
  const quotes = props.sections.ui_quotes as string[] | undefined;
  const hasCommittee = (committee?.length ?? 0) > 0;

  const dim = (label: string, key: keyof NonNullable<typeof props.scores>) => {
    if (!props.scores) return null;
    const v = props.scores[key] as number;
    return (
      <div key={key} className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>{label}</span>
          <span>
            {v} / 10
          </span>
        </div>
        <Progress value={v * 10} />
      </div>
    );
  };

  if (props.status !== "completed") {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Status: {props.status}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/startups/${props.startupId}/analyze`}>Rerun</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/compare/${props.startupId}`}>Compare</Link>
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={share}>
          Share link
        </Button>
        <Button type="button" variant="outline" size="sm" disabled title="PDF export coming soon">
          Export PDF
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={exportAiPrompt}
          className="bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700"
          title="Generate an MVP-build prompt you can paste into Cursor, Claude Code, or v0"
        >
          Export AI Prompt
        </Button>
        {shareMsg && (
          <span className="text-xs text-muted-foreground self-center">{shareMsg}</span>
        )}
      </div>

      {aiPrompt && (
        <Card className="border-emerald-700/40 bg-emerald-700/5">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Coding-agent MVP prompt</CardTitle>
            <div className="flex items-center gap-2">
              {aiPromptCopied && (
                <span className="text-xs text-emerald-700">
                  Copied to clipboard
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(aiPrompt);
                    setAiPromptCopied(true);
                  } catch {
                    // ignore
                  }
                }}
              >
                Copy
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setAiPrompt(null);
                  setAiPromptCopied(false);
                }}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              Paste this into a fresh Cursor / Claude Code / v0 session to
              scaffold an MVP grounded in this analysis.
            </p>
            <textarea
              readOnly
              value={aiPrompt}
              onClick={(e) => e.currentTarget.select()}
              className="w-full h-64 resize-y rounded-md border border-border/40 bg-background p-3 font-mono text-xs leading-relaxed"
            />
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Verdict</CardTitle>
          <Badge>{props.runType}</Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xl font-semibold">{props.verdict}</p>
          {props.summary && (
            <p className="text-sm text-muted-foreground">{props.summary}</p>
          )}
        </CardContent>
      </Card>

      {props.scores && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Scorecard — overall {props.scores.overall_score}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dim("Problem severity", "problem_severity")}
            {dim("Customer clarity", "customer_clarity")}
            {dim("Market timing", "market_timing")}
            {dim("Distribution plausibility", "distribution_plausibility")}
            {dim("Monetization strength", "monetization_strength")}
            {dim("Defensibility", "defensibility")}
            {dim("Founder–market fit", "founder_market_fit")}
            {dim("Speed to MVP", "speed_to_mvp")}
            {dim("Retention potential", "retention_potential")}
            {dim("Investor attractiveness", "investor_attractiveness")}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Why this dies</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            {(kill ?? []).map((k) => (
              <p key={k}>• {k}</p>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-500">Why it might live</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            {(survive ?? []).map((k) => (
              <p key={k}>• {k}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      {quotes && quotes.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {quotes.slice(0, 4).map((q, i) => (
            <Card key={i} className="bg-muted/30">
              <CardContent className="py-4 text-sm italic">&ldquo;{q}&rdquo;</CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contradictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(contradictions ?? []).length === 0 && (
            <p className="text-muted-foreground">
              No internal contradictions surfaced.
            </p>
          )}
          {(contradictions ?? []).map((c, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{c.title}</span>
                <Badge
                  variant={
                    c.severity === "high"
                      ? "destructive"
                      : c.severity === "medium"
                        ? "default"
                        : "outline"
                  }
                >
                  {c.severity}
                </Badge>
              </div>
              {c.explanation && (
                <p className="text-muted-foreground">{c.explanation}</p>
              )}
              {c.conflictingClaims && c.conflictingClaims.length > 0 && (
                <ul className="ml-4 list-disc text-xs text-muted-foreground space-y-1">
                  {c.conflictingClaims.map((cc, j) => (
                    <li key={j}>{cc}</li>
                  ))}
                </ul>
              )}
              {c.suggestedFix && (
                <p className="text-xs">
                  <span className="font-medium">Fix:</span>{" "}
                  <span className="text-muted-foreground">{c.suggestedFix}</span>
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2 pr-2">Assumption</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Fragility</th>
                <th className="py-2 pr-2">Confidence</th>
                <th className="py-2">Cheap test</th>
              </tr>
            </thead>
            <tbody>
              {(assumptions ?? []).map((a, i) => (
                <tr key={i} className="border-t border-border/40 align-top">
                  <td className="py-2 pr-2">{a.assumption}</td>
                  <td className="py-2 pr-2 text-muted-foreground">
                    {a.category ?? "—"}
                  </td>
                  <td className="py-2 pr-2 tabular-nums">{a.fragility}</td>
                  <td className="py-2 pr-2 tabular-nums">
                    {a.confidence ?? "—"}
                  </td>
                  <td className="py-2 text-muted-foreground">{a.test ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Next experiments</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {(experiments ?? []).map((e) => (
            <p key={e}>• {e}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Repositioning options</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          {(reposition ?? []).map((e) => (
            <p key={e}>• {e}</p>
          ))}
        </CardContent>
      </Card>

      {hasCommittee ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Investor committee</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {committee!.map((m, i) => (
              <div
                key={i}
                className="rounded-lg border border-border/50 p-3 space-y-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">
                    {m.agent.replace(/_/g, " ")}
                  </span>
                  <Badge variant="outline" className="tabular-nums">
                    {m.score} / 10
                  </Badge>
                </div>
                {m.punchyLine && (
                  <p className="italic text-muted-foreground">&ldquo;{m.punchyLine}&rdquo;</p>
                )}
                <div>
                  <p className="text-xs font-medium text-emerald-500">
                    Strongest angle
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.strongestAngle}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-destructive">
                    Biggest concern
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {m.biggestConcern}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
          <Accordion type="single" collapsible className="w-full px-6 pb-4">
            <AccordionItem value="raw" className="border-0">
              <AccordionTrigger className="text-xs text-muted-foreground">
                Raw committee JSON
              </AccordionTrigger>
              <AccordionContent>
                <pre className="text-xs overflow-x-auto text-muted-foreground">
                  {JSON.stringify(committee, null, 2)}
                </pre>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-4 text-xs text-muted-foreground">
            <span className="font-medium">No committee output:</span> this run
            was a <code>{props.runType}</code>, which is a single-pass
            adversarial roast and does not invoke the six committee agents.
            Choose <strong>Investor Committee</strong> or <strong>Deep Stress Test</strong>{" "}
            on a new analysis to see role-by-role critiques.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
