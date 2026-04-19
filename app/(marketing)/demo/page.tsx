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
  { label: "Problem severity", value: 8 },
  { label: "Customer clarity", value: 9 },
  { label: "Market timing", value: 7 },
  { label: "Distribution plausibility", value: 6 },
  { label: "Monetization strength", value: 8 },
  { label: "Defensibility", value: 6 },
  { label: "Founder–market fit", value: 9 },
  { label: "Speed to MVP", value: 8 },
  { label: "Retention potential", value: 7 },
  { label: "Investor attractiveness", value: 7 },
] as const;

const COMMITTEE = [
  {
    agent: "vc_partner",
    score: 7,
    punchyLine: "Vertical wedge with a credible founder is exactly the shape I want.",
    strongest:
      "Founder is a former roofing operator with 11 years in the trade. That opens doors no salesperson can.",
    concern:
      "Vertical SaaS is great until you cap at $10M ARR. Path to $100M needs a second product.",
  },
  {
    agent: "customer_skeptic",
    score: 8,
    punchyLine: "I'd buy this if I were a roofing GC tomorrow.",
    strongest:
      "Photo-to-quote in 60 seconds is a 10x time saver. Existing pilot already has paying customers.",
    concern:
      "15-minute per-project onboarding still feels long. Half your churn will live there.",
  },
  {
    agent: "growth_lead",
    score: 6,
    punchyLine: "PLG won't work here, but outbound + associations is tractable.",
    strongest:
      "Roofing associations are tight-knit and have member discount programs that scale acquisition.",
    concern:
      "Outbound CAC could swing 3x if association partnerships don't materialize. Run that test first.",
  },
  {
    agent: "product_strategist",
    score: 8,
    punchyLine: "Photo-to-quote is the wedge. Don't fragment it.",
    strongest:
      "The import → enrich → quote loop is sticky from day one. Hard to copy without trade context.",
    concern:
      "Roadmap mentions 'every commercial trade.' Stay in roofing until 100 paying GCs.",
  },
  {
    agent: "technical_reviewer",
    score: 7,
    punchyLine: "OCR + LLM orchestration over commodity APIs. Build risk is low.",
    strongest:
      "No model training risk. Two engineers can ship the v1 in 6 weeks.",
    concern:
      "Margin sensitivity to OpenAI pricing — at scale, fine-tuned smaller models become a moat.",
  },
  {
    agent: "competitor_analyst",
    score: 6,
    punchyLine: "Incumbents won't move down-market here. JobNimbus is the only real threat.",
    strongest:
      "ServiceTitan is enterprise; Procore is GC-side. Both ignore the $2-10M commercial roofing GC.",
    concern:
      "JobNimbus is horizontal but could ship a roofing module within 12 months.",
  },
] as const;

const CONTRADICTIONS = [
  {
    title: "Pricing tier collides with the time-savings narrative",
    severity: "medium",
    explanation:
      "Pricing is $399/mo flat across all GC sizes. But the time-savings narrative scales with project volume — a $5M GC saves 10x more than a $500k GC and should pay accordingly.",
    fixes: [
      "Add a per-quote-generated metered tier on top of the $399 base.",
      "Offer a $999/mo plan for GCs doing >40 quotes/mo with included credits.",
    ],
  },
  {
    title: "Outbound headcount plan understates ramp time",
    severity: "low",
    explanation:
      "GTM plan assumes 1 BDR ramps to 20 booked meetings/mo in month 2. Realistic ramp in vertical SaaS is 4-5 months even for an experienced rep, especially in a relationship-driven trade.",
    fixes: [
      "Hire a former roofing-industry sales rep, not a generalist BDR.",
      "Plan for 5-month ramp in the cash model; raise accordingly.",
    ],
  },
];

const ASSUMPTIONS = [
  {
    assumption:
      "Roofing GCs will adopt a quoting tool that requires 15-min onboarding per project.",
    category: "customer",
    fragility: 5,
    confidence: 7,
    test: "Run 5 onboarding sessions with existing pilots; measure to-completion rate. Below 80% means the loop needs work.",
  },
  {
    assumption:
      "Association partnerships will yield 2x the lead flow of cold outbound.",
    category: "distribution",
    fragility: 6,
    confidence: 5,
    test: "Pitch 3 regional roofing associations on a member-discount program; measure intro rate and conversion.",
  },
  {
    assumption:
      "$399/mo will retain >90% MoM after the 60-day promo expires.",
    category: "monetization",
    fragility: 4,
    confidence: 7,
    test: "Cohort the existing 8 paying pilots; measure retention through promo-end on Aug 1.",
  },
];

const EXPERIMENTS = [
  "Sign 10 paid pilots at $99/mo for 60 days to compress the sales cycle and prove the retention curve.",
  "Pitch 3 regional roofing associations on a member-discount program; track intro → demo → close rate.",
  "Ship the 'photo-to-quote in 60 seconds' demo loop publicly; gate access to leave a real email.",
  "Run one upmarket pilot with a $5M+ GC to test whether the price ceiling moves above $999/mo.",
];

const REPOSITIONING = [
  "Stay vertical: name the wedge 'Quote-to-Cash for Commercial Roofing' explicitly. Don't dilute to 'all trades' until 100 paying GCs.",
  "Add per-quote metered pricing on top of the flat $399 base so the price scales with the value the GC actually receives.",
];

const QUOTES = [
  "Vertical wedge with a credible founder is exactly the shape I want.",
  "I'd buy this if I were a roofing GC tomorrow.",
  "Photo-to-quote is the wedge. Don't fragment into 'AI for trades'.",
  "Distribution is the only real risk — and it's a 30-day test.",
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

      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Verdict</CardTitle>
          <Badge variant="success">Promising</Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-base">
            Sharp ICP, credible founder, and a wedge that incumbents will not
            touch. The photo-to-quote loop is a 10x time saver with paying
            pilots already on the books. Distribution is the only real risk,
            and it&rsquo;s a testable 30-day question — pitch the roofing
            associations before you scale outbound.
          </p>
          <p className="text-xs text-muted-foreground">
            Confidence: 0.78 · Run type: investor committee · Tone: direct
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scorecard — overall 7.5</CardTitle>
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
            <CardTitle className="text-base text-emerald-500">
              Why this works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Founder is a former roofing operator — 11 years in the trade.</p>
            <p>• ICP is sharp, painful, underserved, and has real budget.</p>
            <p>• Price tested at $399/mo with 8 paying pilots already on the books.</p>
            <p>• Founder-market fit ranks 9/10 — credibility opens doors no rep can.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              Why it might still die
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• Outbound CAC could exceed $1,500 if association partnerships don&rsquo;t land.</p>
            <p>• JobNimbus could ship a competitive roofing module within 12 months.</p>
            <p>• Roofing season cyclicality could create cash-flow gaps in Q4-Q1.</p>
            <p>• Founder-led sales doesn&rsquo;t scale beyond ~50 logos without a hire.</p>
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
          <CardTitle className="text-lg">Sharpening moves</CardTitle>
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
