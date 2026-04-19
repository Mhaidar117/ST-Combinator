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

const SCORES = [
  { label: "Problem severity", value: 6 },
  { label: "Customer clarity", value: 4 },
  { label: "Market timing", value: 5 },
  { label: "Distribution plausibility", value: 3 },
  { label: "Monetization strength", value: 5 },
  { label: "Defensibility", value: 3 },
  { label: "Founder–market fit", value: 7 },
  { label: "Speed to MVP", value: 6 },
  { label: "Retention potential", value: 4 },
  { label: "Investor attractiveness", value: 4 },
] as const;

const COMMITTEE = [
  {
    agent: "vc_partner",
    score: 4,
    punchyLine: "Wedge is real but moat is positioning, not product.",
    strongest: "Founder has unfair access in one vertical; can land 3-5 logos quickly.",
    concern: "TAM math relies on category expansion that competitors will own first.",
  },
  {
    agent: "customer_skeptic",
    score: 3,
    punchyLine: "I cannot tell which user this is for.",
    strongest: "Pain is acute when it shows up.",
    concern: "ICP says SMB ops lead; GTM says enterprise outbound. Pick one.",
  },
  {
    agent: "growth_lead",
    score: 3,
    punchyLine: "CAC story is hand-wavy; payback assumes 95% retention.",
    strongest: "Founder-led sales can clear first 10 customers.",
    concern: "No repeatable channel beyond cold outbound. Will cap at $1M ARR.",
  },
  {
    agent: "product_strategist",
    score: 5,
    punchyLine: "Workflow wedge is sharp; surface is too broad.",
    strongest: "If they ship the import-then-enrich loop, sticky in week one.",
    concern: "Roadmap leaks into 4 adjacent products; team will fragment.",
  },
  {
    agent: "technical_reviewer",
    score: 6,
    punchyLine: "Buildable in 8 weeks by 2 engineers; nothing exotic.",
    strongest: "No model training risk — purely orchestration over commodity APIs.",
    concern: "Vendor lock-in to one LLM provider; pricing-margin sensitivity.",
  },
  {
    agent: "competitor_analyst",
    score: 3,
    punchyLine: "Two YC W25 cos have 6-month head starts on the same ICP.",
    strongest: "Incumbents (Salesforce, Hubspot) will not move down-market here.",
    concern: "Direct competitors are already shipping. Differentiation is unclear.",
  },
] as const;

const CONTRADICTIONS = [
  {
    title: "ICP says SMB; GTM says enterprise outbound",
    severity: "high",
    explanation:
      "The brief lists 'SMB operators (5-50 ppl)' as the customer but the GTM plan is 'outbound to VPs at $50M+ ARR companies'. These two motions need different products and different teams.",
    fixes: [
      "If SMB: switch GTM to PLG + community. Drop outbound spend.",
      "If enterprise: rewrite the ICP, the pricing, and the onboarding.",
    ],
  },
  {
    title: "Pricing model conflicts with retention claim",
    severity: "medium",
    explanation:
      "Pricing is one-time perpetual but the retention narrative depends on weekly habit formation. One-time buyers do not generate weekly active usage signals to optimize against.",
    fixes: [
      "Move to seat-based subscription if weekly active usage is the success metric.",
    ],
  },
];

const ASSUMPTIONS = [
  {
    assumption: "Older Excel users will adopt AI-native workflows within 90 days.",
    category: "customer",
    fragility: 8,
    confidence: 4,
    test: "5 user interviews this week with target persona; ship a clickable Figma; measure stated intent.",
  },
  {
    assumption: "Personalized service is a durable differentiator vs. self-serve incumbents.",
    category: "competition",
    fragility: 7,
    confidence: 5,
    test: "Cold-email 50 prospects with two variants (high-touch vs. self-serve trial); measure reply rate.",
  },
  {
    assumption: "Cold outbound CAC will stay below $1,200 at the target ICP.",
    category: "distribution",
    fragility: 6,
    confidence: 5,
    test: "Run a 200-prospect outbound sprint; measure booked-meeting rate. Below 3% kills the channel.",
  },
];

const EXPERIMENTS = [
  "5 customer-discovery calls with the exact ICP this week.",
  "Ship a 1-page landing + waitlist; measure conversion against $5/click cold traffic.",
  "Build a 2-week clickable prototype; charge $200 deposits to validate willingness-to-pay.",
  "A/B two pricing pages: $49/mo seat vs. $1,500 one-time; measure interest, not revenue.",
];

const REPOSITIONING = [
  "Reposition as a vertical-specific tool for one named industry (e.g., commercial roofing ops) rather than horizontal AI for older Excel users.",
  "Rebrand from 'AI for Excel users' to 'Quote-to-cash for solo trades' — same engine, sharper wedge.",
];

const QUOTES = [
  "Wedge is real but moat is positioning, not product.",
  "I cannot tell which user this is for.",
  "Buildable in 8 weeks by 2 engineers — but two W25 cos already shipped it.",
  "Pick SMB or pick enterprise. You cannot do both with this team.",
];

export default function DemoPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sample report</h1>
          <p className="text-muted-foreground">
            Mocked data for marketing — not a live analysis. Run your own to
            see real, brief-specific output.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/signup">Run your own</Link>
        </Button>
      </div>

      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Verdict</CardTitle>
          <Badge variant="destructive">Weak wedge</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-base">
            Distribution assumptions collapse under modest CAC stress. Moat
            narrative is mostly positioning. The team can ship something real
            in 8 weeks, but two YC W25 companies are already shipping the same
            ICP wedge.
          </p>
          <p className="text-xs text-muted-foreground">
            Confidence: 0.62 · Run type: investor committee · Tone: direct
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scorecard — overall 4.2</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SCORES.map((s) => (
            <div key={s.label} className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{s.label}</span>
                <span className="tabular-nums">{s.value} / 10</span>
              </div>
              <Progress value={s.value * 10} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">Why this dies</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Paid acquisition story is hand-wavy — no proven channel.</p>
            <p>• ICP says SMB; GTM says enterprise outbound.</p>
            <p>• Two direct competitors already shipping in this ICP.</p>
            <p>• Defensibility ranks 3/10 — moat is positioning, not product.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-emerald-500">Why it might live</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Founder has unfair distribution access in one niche vertical.</p>
            <p>• Problem is acute and frequent for the narrow workflow targeted.</p>
            <p>• Build is 8 weeks with 2 engineers — fast time-to-feedback.</p>
            <p>• Founder-market fit ranks 7/10 — credible operator.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {QUOTES.map((q, i) => (
          <Card key={i} className="bg-muted/30">
            <CardContent className="py-4 text-sm italic">&ldquo;{q}&rdquo;</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contradictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {CONTRADICTIONS.map((c, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{c.title}</span>
                <Badge variant={c.severity === "high" ? "destructive" : "default"}>
                  {c.severity}
                </Badge>
              </div>
              <p className="text-muted-foreground">{c.explanation}</p>
              <ul className="ml-4 list-disc text-xs text-muted-foreground space-y-1">
                {c.fixes.map((f, j) => (
                  <li key={j}>{f}</li>
                ))}
              </ul>
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
              {ASSUMPTIONS.map((a, i) => (
                <tr key={i} className="border-t border-border/40 align-top">
                  <td className="py-2 pr-2">{a.assumption}</td>
                  <td className="py-2 pr-2 text-muted-foreground">{a.category}</td>
                  <td className="py-2 pr-2 tabular-nums">{a.fragility}</td>
                  <td className="py-2 pr-2 tabular-nums">{a.confidence}</td>
                  <td className="py-2 text-muted-foreground">{a.test}</td>
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
          {EXPERIMENTS.map((e) => (
            <p key={e}>• {e}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Repositioning options</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {REPOSITIONING.map((r) => (
            <p key={r}>• {r}</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Investor committee</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {COMMITTEE.map((m) => (
            <div
              key={m.agent}
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
              <p className="italic text-muted-foreground">&ldquo;{m.punchyLine}&rdquo;</p>
              <div>
                <p className="text-xs font-medium text-emerald-500">Strongest angle</p>
                <p className="text-xs text-muted-foreground">{m.strongest}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-destructive">Biggest concern</p>
                <p className="text-xs text-muted-foreground">{m.concern}</p>
              </div>
            </div>
          ))}
        </CardContent>
        <Accordion type="single" collapsible className="w-full px-6 pb-4">
          <AccordionItem value="raw" className="border-0">
            <AccordionTrigger className="text-xs text-muted-foreground">
              Raw committee JSON (sample)
            </AccordionTrigger>
            <AccordionContent>
              <pre className="text-xs overflow-x-auto text-muted-foreground">
                {JSON.stringify(COMMITTEE, null, 2)}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <div className="flex justify-center pt-2">
        <Button asChild size="lg">
          <Link href="/signup">Run a real analysis on your idea →</Link>
        </Button>
      </div>
    </div>
  );
}
