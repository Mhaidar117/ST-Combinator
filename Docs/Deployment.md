# Deployment

End-to-end steps for taking StressTested from a local clone to a public,
production deployment on **Vercel + Supabase + Stripe** with the source
hosted on a public **GitHub** repository.

> Estimated time: 30-45 minutes for a fresh deploy. All commands assume
> macOS / Linux; Windows users should use WSL or adapt the shell syntax.

## 0. Prerequisites

Install once:

- [Node 20+](https://nodejs.org)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (`brew install stripe/stripe-cli/stripe`)
- [Vercel CLI](https://vercel.com/docs/cli) (`npm i -g vercel`)
- [GitHub CLI](https://cli.github.com) (`brew install gh`) and run `gh auth login`

Accounts:

- Supabase (free tier is fine)
- Stripe (test mode is fine for grading)
- Vercel (free Hobby plan is fine)
- OpenAI with billing enabled

## 1. Supabase project

1. Create a new project in [Supabase Dashboard](https://supabase.com/dashboard)
   → "New project". Pick the region closest to you.
2. Note the project's **URL** and **anon public key** (Project Settings →
   API). Note the **service_role key** as well — keep this secret.
3. Apply the migrations in `supabase/migrations/`. Easiest path:
   - In the Supabase dashboard, open **SQL Editor** → **New query**.
   - Paste the contents of `supabase/migrations/20250409000000_init.sql`,
     run.
   - Paste the contents of
     `supabase/migrations/20260418000000_traces_and_metrics.sql`, run.
4. Create a **private** storage bucket called `uploads`:
   - **Storage** → **New bucket** → name `uploads`, leave "Public" off.
5. (Optional, for live sign-up) **Authentication** → **Providers** →
   leave Email enabled. For frictionless grading, **Authentication** →
   **Settings** → toggle **Confirm email** off.

## 2. Stripe product + webhook secret

1. In the Stripe Dashboard (Test mode is fine):
   - **Products** → **New** → name "StressTested Pro" → recurring monthly
     price (any amount; $19/month works).
   - Copy the **Price ID** (starts with `price_...`). This becomes
     `STRIPE_PRICE_PRO`.
2. Get a webhook signing secret:
   - For local dev: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
     and copy the `whsec_...` printed to stdout.
   - For production: skip for now — we will configure this in step 5
     after Vercel issues the production URL.

## 3. GitHub repository

```bash
cd /path/to/StressTested
git init
git add .
git commit -m "Initial commit"
gh repo create stresstested --public --source=. --push
```

> If `gh repo create` fails with "name unavailable", pick a different
> name (e.g. `stresstested-yourname`) and adjust the command.

Verify `git status --ignored` shows `.env*` files as ignored (the
`.gitignore` already covers them). Never commit secrets.

## 4. Vercel deploy

```bash
cd /path/to/StressTested
vercel link            # answer "create new" if it asks
vercel deploy          # creates a preview deploy you can poke around
```

Set environment variables for **Production** (also recommended for
Preview so PRs work):

```bash
# Required
vercel env add NEXT_PUBLIC_SUPABASE_URL          production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY     production
vercel env add SUPABASE_SERVICE_ROLE_KEY         production
vercel env add OPENAI_API_KEY                    production
vercel env add STRIPE_SECRET_KEY                 production
vercel env add STRIPE_WEBHOOK_SECRET             production   # placeholder for now; updated in step 5
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add NEXT_PUBLIC_SITE_URL              production   # e.g. https://stresstested.vercel.app
vercel env add STRIPE_PRICE_PRO                  production
vercel env add ADMIN_EMAILS                      production   # comma-separated; controls /admin/metrics access

# Optional (PostHog product analytics + Sentry error tracking)
vercel env add POSTHOG_KEY                       production
vercel env add POSTHOG_HOST                      production
vercel env add NEXT_PUBLIC_POSTHOG_KEY           production
vercel env add NEXT_PUBLIC_POSTHOG_HOST          production
vercel env add SENTRY_DSN                        production
```

| Variable                          | Required? | Notes                                                                 |
| --------------------------------- | --------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | yes       | from Supabase Project Settings → API                                  |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | yes       | from Supabase Project Settings → API                                  |
| `SUPABASE_SERVICE_ROLE_KEY`       | yes       | secret; bypasses RLS for the pipeline + metrics                       |
| `OPENAI_API_KEY`                  | yes       | model + embeddings                                                    |
| `STRIPE_SECRET_KEY`               | yes       | `sk_test_...` or `sk_live_...`                                        |
| `STRIPE_WEBHOOK_SECRET`           | yes       | `whsec_...` from the Vercel Stripe webhook (set in step 5)            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | yes    | `pk_test_...` or `pk_live_...`                                        |
| `NEXT_PUBLIC_SITE_URL`            | yes       | the production URL Vercel issued; used for share links + Stripe redirect |
| `STRIPE_PRICE_PRO`                | yes       | the recurring price id from step 2                                    |
| `ADMIN_EMAILS`                    | yes       | comma-separated emails allowed to view `/admin/metrics`               |
| `POSTHOG_KEY` / `POSTHOG_HOST`    | optional  | server-side analytics                                                 |
| `NEXT_PUBLIC_POSTHOG_*`           | optional  | client-side analytics                                                 |
| `SENTRY_DSN`                      | optional  | error tracking                                                        |

Now ship to production:

```bash
vercel deploy --prod
```

After it finishes, Vercel prints the production URL (e.g.
`https://stresstested.vercel.app`). Re-run
`vercel env add NEXT_PUBLIC_SITE_URL production` if you didn't already
have it pointing at this URL, then `vercel deploy --prod` once more so
the env change takes effect.

## 5. Production Stripe webhook

1. In the Stripe Dashboard (Test mode):
   - **Developers** → **Webhooks** → **Add endpoint**.
   - Endpoint URL: `https://<your-vercel-url>/api/stripe/webhook`.
   - Events to send: `checkout.session.completed`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.payment_succeeded`.
   - Save → reveal the **Signing secret** (`whsec_...`).
2. In Vercel: replace the placeholder `STRIPE_WEBHOOK_SECRET` with the
   real value (`vercel env rm STRIPE_WEBHOOK_SECRET production` then
   `vercel env add ...`), then `vercel deploy --prod`.

## 6. Smoke test the live deploy

Run through the manual UI checklist in
[`Docs/Smoke_Checklist.md`](./Smoke_Checklist.md). It covers signup,
quick-roast, committee run, share link, upload, traces page,
admin metrics, and the Stripe upgrade flow with `4242 4242 4242 4242`.

If everything in the checklist passes, the deployment is grader-ready.

## Updating after the first deploy

```bash
git add . && git commit -m "..." && git push
# Vercel auto-deploys the main branch.
```

For a SQL change, write a new file in `supabase/migrations/` (timestamped
filename), apply it via the Supabase SQL Editor, then push code.

## Cost notes

- **Supabase free tier**: 500MB DB + 1GB storage. Easily sufficient for
  development and the demo.
- **Vercel Hobby**: free; the only constraint that matters is the
  per-route function duration (we set `maxDuration = 300s` on
  `/api/analyze`).
- **OpenAI**: a `committee` run costs roughly $0.005-$0.02 with
  `gpt-4o-mini`. The eval harness (8 scenarios, all `committee`) costs
  well under $1 per run.
- **Stripe**: free in test mode.

## Troubleshooting

| Symptom                                        | Likely cause                                                                |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `/api/analyze` returns 500 with "Storage upload failed" | `uploads` bucket missing in Supabase Storage.                              |
| `/api/analyze` returns "Invalid environment variables" in prod | One of the required env vars was not set in Vercel.                  |
| `/admin/metrics` shows "Forbidden" for your account | Email is not in `ADMIN_EMAILS` (comma-separated, exact match, lowercased). |
| Stripe upgrade doesn't flip plan to Pro        | Webhook signing secret stale — re-copy from Stripe and `vercel deploy --prod`. |
| Tool calls never appear in traces              | Embedding write failed silently. Check upload row exists in `startup_uploads` and that `select count(*) from embeddings where owner_id=<startupId>` > 0. |
| Pipeline times out                             | `maxDuration` exceeded; lower `MAX_TOOL_HOPS` to 2 in `lib/openai/client.ts`, or switch to a background-job model. |
