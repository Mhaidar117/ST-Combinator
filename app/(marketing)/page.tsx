import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VerdictTeaser } from "@/components/marketing/verdict-teaser";

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 space-y-20">
      <section className="text-center space-y-6">
        <Badge variant="secondary" className="mx-auto">
          Investment committee simulator
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
          Pitch your idea. Get attacked before the market does.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          StressTested simulates the room that tells you why your startup fails,
          before you waste months building it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start free</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/demo">View sample report</Link>
          </Button>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        {[
          {
            title: "Quick Roast",
            body: "One fast critique pass plus synthesis — under ~20 seconds when possible.",
          },
          {
            title: "Investor Committee",
            body: "Parallel specialist evaluators, contradiction pass, synthesis.",
          },
          {
            title: "Deep Stress Test",
            body: "Committee depth plus assumption map, fragility, experiments, repositioning.",
          },
        ].map((m) => (
          <Card key={m.title} className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">{m.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {m.body}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-8 md:p-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Sample output teaser</h2>
            <p className="text-muted-foreground mb-4">
              Structured verdict, scorecard, contradictions, and what to test next —
              not a giant essay blob.
            </p>
            <Button asChild variant="secondary">
              <Link href="/demo">Open interactive demo</Link>
            </Button>
          </div>
          <VerdictTeaser />
        </div>
      </section>

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">Pricing preview</h2>
        <p className="text-muted-foreground">
          Free tier for quick roasts. Pro unlocks committee, deep tests, uploads, and
          comparisons.
        </p>
        <Button asChild>
          <Link href="/pricing">See plans</Link>
        </Button>
      </section>
    </div>
  );
}
