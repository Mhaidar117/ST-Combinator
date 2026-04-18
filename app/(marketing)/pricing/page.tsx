import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutButton } from "@/components/billing/checkout-button";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">Pricing</h1>
        <p className="text-muted-foreground">
          Pay for depth. Quick roasts stay accessible on Free.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Free</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>3 quick roasts per month</li>
              <li>No committee or deep stress test</li>
              <li>No comparisons or uploads</li>
            </ul>
            <Button asChild variant="outline" className="w-full">
              <Link href="/signup">Get started</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-disc pl-5 space-y-1">
              <li>Unlimited quick roasts</li>
              <li>20 committee or deep analyses per month</li>
              <li>Report history, comparisons, uploads</li>
              <li>PDF export placeholder in UI</li>
            </ul>
            <CheckoutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
