import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton } from "@/components/billing/checkout-button";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user!.id)
    .single();

  const checkoutOk = searchParams.checkout === "success";

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">{user?.email}</p>
      </div>
      {checkoutOk && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Checkout completed — your plan should update shortly.
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Current: <Badge>{profile?.plan_tier ?? "free"}</Badge>
          </p>
          <p className="text-muted-foreground">
            Credits used: {profile?.monthly_credit_used ?? 0} /{" "}
            {profile?.monthly_credit_limit ?? 3}
          </p>
          {profile?.plan_tier !== "pro" && <CheckoutButton />}
        </CardContent>
      </Card>
    </div>
  );
}
