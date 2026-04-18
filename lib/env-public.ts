/** Safe for client components — only public keys. */
export function getPublicEnv() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? process.env.POSTHOG_KEY,
    POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? process.env.POSTHOG_HOST,
  };
}
