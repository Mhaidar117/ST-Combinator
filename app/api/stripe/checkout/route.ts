import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { getServerEnv } from "@/lib/env";
import { captureServerEvent } from "@/lib/analytics/server";
import { ANALYTICS } from "@/lib/analytics/events";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const env = getServerEnv();
  const priceId = env.STRIPE_PRICE_PRO;

  // Local-dev guard: detect missing or placeholder Stripe credentials and
  // return a friendly JSON error instead of crashing inside the Stripe SDK
  // (which would yield an empty 500 body and a "Unexpected end of JSON
  // input" client error).
  const looksPlaceholder =
    !env.STRIPE_SECRET_KEY ||
    env.STRIPE_SECRET_KEY.includes("placeholder") ||
    !priceId ||
    priceId === "price_xxx" ||
    priceId.includes("placeholder");
  if (looksPlaceholder) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured in this environment. Set STRIPE_SECRET_KEY and STRIPE_PRICE_PRO in .env.local to enable checkout.",
      },
      { status: 503 },
    );
  }

  const stripe = getStripe();
  const site = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");

  await captureServerEvent(ANALYTICS.checkout_started, { userId: user.id });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${site}/settings?checkout=success`,
      cancel_url: `${site}/pricing`,
      metadata: { supabase_user_id: user.id },
    });

    if (!session.url) {
      return NextResponse.json({ error: "No checkout URL" }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Stripe checkout session failed",
      },
      { status: 502 },
    );
  }
}
