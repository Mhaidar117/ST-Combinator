import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function devPlaceholder(): Env {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "dev-anon-key",
    SUPABASE_SERVICE_ROLE_KEY:
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-service-role",
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? "sk-dev-placeholder",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder",
    STRIPE_WEBHOOK_SECRET:
      process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_placeholder",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "pk_test_placeholder",
    NEXT_PUBLIC_SITE_URL: site,
    POSTHOG_KEY: process.env.POSTHOG_KEY,
    POSTHOG_HOST: process.env.POSTHOG_HOST,
    SENTRY_DSN: process.env.SENTRY_DSN,
    STRIPE_PRICE_PRO: process.env.STRIPE_PRICE_PRO,
  };
}

/** Server-only. Call from API routes / server actions — not at module top level in client components. */
export function getServerEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  if (process.env.NODE_ENV !== "production") {
    return devPlaceholder();
  }
  console.error(parsed.error.flatten());
  throw new Error("Invalid environment variables");
}
