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
              <li>20 quick roasts per month</li>
              <li>20 committee runs per month</li>
              <li>20 deep roasts per month</li>
              <li>20 uploads per month</li>
              <li>20 AI prompt exports per month</li>
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
              <li>50 committee runs per month</li>
              <li>50 deep roasts per month</li>
              <li>50 AI prompt exports per month</li>
              <li>Report history, comparisons, uploads</li>
            </ul>
            <CheckoutButton />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
