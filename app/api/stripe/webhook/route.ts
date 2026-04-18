import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { getServerEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { captureServerEvent } from "@/lib/analytics/server";
import { ANALYTICS } from "@/lib/analytics/events";

export async function POST(req: Request) {
  const env = getServerEnv();
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.metadata?.supabase_user_id ?? session.client_reference_id;
        const customerId = session.customer as string;
        const subId = session.subscription as string;
        if (userId && customerId && subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await admin
            .from("users_profile")
            .update({
              plan_tier: "pro",
              stripe_customer_id: customerId,
              monthly_credit_limit: 20,
              monthly_credit_used: 0,
            })
            .eq("id", userId);
          await admin.from("subscriptions").upsert(
            {
              user_id: userId,
              stripe_subscription_id: sub.id,
              stripe_price_id: sub.items.data[0]?.price.id ?? "",
              status: sub.status,
              current_period_end: new Date(
                sub.current_period_end * 1000,
              ).toISOString(),
            },
            { onConflict: "stripe_subscription_id" },
          );
          await captureServerEvent(ANALYTICS.subscription_upgraded, { userId });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const { data: profile } = await admin
          .from("users_profile")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (!profile?.id) break;

        const active = sub.status === "active" || sub.status === "trialing";
        await admin
          .from("users_profile")
          .update({
            plan_tier: active ? "pro" : "free",
            monthly_credit_limit: active ? 20 : 3,
          })
          .eq("id", profile.id);

        await admin.from("subscriptions").upsert(
          {
            user_id: profile.id,
            stripe_subscription_id: sub.id,
            stripe_price_id: sub.items.data[0]?.price.id ?? "",
            status: sub.status,
            current_period_end: new Date(
              sub.current_period_end * 1000,
            ).toISOString(),
          },
          { onConflict: "stripe_subscription_id" },
        );
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
