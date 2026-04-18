# How to run StressTested

**Last reviewed:** 2026-04-09 12:00 UTC

This guide walks you through running the app locally and connecting each external service. Follow the sections in order unless you already have accounts ready.

---

## 1. What you need installed


| Requirement                       | Purpose               |
| --------------------------------- | --------------------- |
| **Node.js 18+** (LTS recommended) | Runs Next.js          |
| **npm** (comes with Node)         | Installs dependencies |
| A code editor                     | Optional              |


Optional but useful:


| Tool                                                 | Purpose                                            |
| ---------------------------------------------------- | -------------------------------------------------- |
| [Supabase CLI](https://supabase.com/docs/guides/cli) | Apply migrations from the terminal                 |
| [Stripe CLI](https://stripe.com/docs/stripe-cli)     | Forward webhooks to your laptop during development |


---

## 2. Get the code and install dependencies

From the project root (the folder that contains `package.json`):

```bash
npm install
```

This installs Next.js, React, Supabase clients, Stripe, OpenAI SDK, and everything else listed in `package.json`.

---

## 3. External services overview

The app talks to:


| Service      | Required for               | What it does in this app                                                   |
| ------------ | -------------------------- | -------------------------------------------------------------------------- |
| **Supabase** | **Yes** (core)             | Postgres database, email/password auth, file storage for uploads           |
| **OpenAI**   | **Yes** (analyses)         | Runs the analysis pipeline (JSON outputs)                                  |
| **Stripe**   | **Billing / Pro features** | Checkout for Pro plan; webhooks update `users_profile` and `subscriptions` |
| **PostHog**  | No                         | Product analytics in the browser (optional)                                |
| **Sentry**   | No                         | Error reporting hook (optional; stub logs if `SENTRY_DSN` is set)          |


You can start the dev server with **only Supabase** configured if you only want to browse the UI—but **creating an analysis** requires a valid **OpenAI API key**.

---

## 4. Supabase setup

### 4.1 Create a project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Create a **new project** (pick a region, set a database password, and wait until it is ready).

### 4.2 Get API keys

In the Supabase dashboard: **Project Settings → API**.

Copy:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- `**anon` `public` key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `**service_role` `secret` key** → `SUPABASE_SERVICE_ROLE_KEY` (never expose this in the browser or commit it)

The **service role** key is required for server-side jobs that bypass Row Level Security (RLS): analysis pipeline writes, some API routes, and the public share page loader.

### 4.3 Apply database migrations

The schema lives in:

- `supabase/migrations/20250409000000_init.sql` — tables, pgvector, RLS
- `supabase/migrations/20250409000001_auth_profile.sql` — trigger to create `users_profile` when a user signs up

**Option A — SQL Editor (simplest for humans)**

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the contents of `20250409000000_init.sql`, run it.
3. Paste the contents of `20250409000001_auth_profile.sql`, run it.

**Option B — Supabase CLI**

If you use the CLI linked to this project, apply the same files in order using your usual `db push` / migration workflow.

### 4.4 Auth settings (recommended for local dev)

1. Go to **Authentication → Providers → Email**.
2. For quick testing, you can **disable “Confirm email”** so new signups can log in immediately without clicking a link.

If you keep confirmation on, users must confirm via email (or use the magic link flow) before sessions work.

### 4.5 Storage bucket (required for Pro uploads)

The upload API uses a bucket named `**uploads`**.

1. Go to **Storage** in the dashboard.
2. **New bucket** → name: `uploads` → set **Public** to **off** (private).
3. The app uploads via the **service role** in API routes; ensure your RLS policies for storage match your security model. If uploads fail with a storage error, check Supabase Storage docs for policies on the `uploads` bucket (the README also mentions creating this bucket).

---

## 5. OpenAI setup

1. Go to [https://platform.openai.com](https://platform.openai.com) and sign in.
2. Open **API keys** and create a key.
3. Set `OPENAI_API_KEY` in your environment file (next section).

The app uses the Chat Completions API with JSON mode (`lib/openai/client.ts`). Billing is on your OpenAI account; running many committee/deep analyses uses more tokens than a single quick roast.

---

## 6. Stripe setup (optional until you test billing)

Use **Test mode** keys for local development.

### 6.1 Keys

In the [Stripe Dashboard](https://dashboard.stripe.com) (Test mode):

- **Developers → API keys**
  - **Secret key** → `STRIPE_SECRET_KEY`
  - **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### 6.2 Pro subscription price

1. **Products → Add product** (e.g. “StressTested Pro”).
2. Add a recurring **Price** (monthly or yearly—your choice for testing).
3. Copy the Price ID (starts with `price_...`) → `STRIPE_PRICE_PRO`

Checkout is implemented in `app/api/stripe/checkout/route.ts` and expects this env var.

### 6.3 Webhook secret (local development)

Stripe must POST events to `/api/stripe/webhook`. Locally, your machine is not on the public internet, so use the **Stripe CLI**:

1. [Install Stripe CLI](https://stripe.com/docs/stripe-cli).
2. Log in: `stripe login`
3. Forward events to your Next app (default dev port **3000**):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

1. The CLI prints a **webhook signing secret** (starts with `whsec_...`). Put that value in `**STRIPE_WEBHOOK_SECRET`** in `.env.local`.

Restart `stripe listen` whenever you need subscription events while developing.

### 6.4 Production webhooks

In Stripe Dashboard → **Developers → Webhooks**, add an endpoint:

- URL: `https://YOUR_DOMAIN/api/stripe/webhook`
- Events (at minimum): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

Use the signing secret Stripe gives you for that endpoint as `STRIPE_WEBHOOK_SECRET` in production.

---

## 7. PostHog (optional)

If you skip PostHog, the app still runs; analytics helpers no-op when keys are missing.

To enable:

1. Create a project on [PostHog](https://posthog.com).
2. Set either:
  - `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`, or
  - `POSTHOG_KEY` / `POSTHOG_HOST` (see `lib/env-public.ts` for fallback behavior).

`components/providers.tsx` initializes PostHog on the client when a public key exists.

---

## 8. Environment variables (`.env.local`)

1. Copy the example file:

```bash
cp .env.example .env.local
```

1. Edit `**.env.local**` (this file is gitignored) and fill in values.


| Variable                              | Required to run UI          | Required for analyses | Notes                                                                          |
| ------------------------------------- | --------------------------- | --------------------- | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`            | Yes                         | Yes                   | Supabase project URL                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`       | Yes                         | Yes                   | Public anon key                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`           | Yes (APIs/pipeline)         | Yes                   | Server-only secret                                                             |
| `OPENAI_API_KEY`                      | No                          | Yes                   | Without it, analysis API will fail when calling OpenAI                         |
| `NEXT_PUBLIC_SITE_URL`                | Yes                         | Yes                   | e.g. `http://localhost:3000` locally; used in Stripe redirects and share links |
| `STRIPE_SECRET_KEY`                   | For checkout                | For checkout          | Test key in dev                                                                |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | For checkout UI if extended | —                     | Already in example                                                             |
| `STRIPE_WEBHOOK_SECRET`               | For subscription sync       | —                     | From `stripe listen` locally                                                   |
| `STRIPE_PRICE_PRO`                    | For checkout                | —                     | Stripe Price ID                                                                |
| `POSTHOG_*` / `NEXT_PUBLIC_POSTHOG_*` | No                          | No                    | Optional analytics                                                             |
| `SENTRY_DSN`                          | No                          | No                    | Optional                                                                       |


**Production builds:** `lib/env.ts` validates these with Zod. In **development**, if validation fails, the app may fall back to **placeholder** values so `next dev` can start—but **real keys are still required** for Supabase auth, DB, and OpenAI to work correctly. Treat placeholders as a convenience, not a substitute for configuration.

---

## 9. Run the development server

From the project root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- Marketing site: `/`, `/pricing`, `/demo`
- Sign up: `/signup` → then `/dashboard`
- Create a startup: `/startups/new`
- Run an analysis: open a startup → **Run analysis** → pick mode and tone (calls `POST /api/analyze`)

If the dev server fails on startup, check the terminal for missing env vars and compare with `.env.example`.

---

## 10. Quick verification checklist


| Step | What to check                                                        |
| ---- | -------------------------------------------------------------------- |
| 1    | Homepage loads at `/`                                                |
| 2    | Sign up / sign in works (Supabase Auth)                              |
| 3    | Create a startup (`/startups/new`)                                   |
| 4    | Run **Quick Roast** (needs OpenAI + migrations applied)              |
| 5    | Open the analysis at `/analyses/[id]`                                |
| 6    | (Optional) `stripe listen` + upgrade from `/settings` or `/pricing`  |
| 7    | (Optional) Upload a PDF on Pro startup page (needs `uploads` bucket) |


---

## 11. Other useful commands


| Command         | Meaning                                                   |
| --------------- | --------------------------------------------------------- |
| `npm run build` | Production build (validates types and env for production) |
| `npm run start` | Run production server after `npm run build`               |
| `npm run lint`  | ESLint                                                    |
| `npm test`      | Vitest unit tests                                         |


### Seed script (optional)

If you have a real user UUID from `auth.users`:

```bash
SEED_USER_ID=<paste-user-uuid-here> npm run db:seed
```

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the environment (e.g. in `.env.local` when using `npx tsx` with dotenv, or export vars manually—see `scripts/seed.ts`).

---

## 12. Troubleshooting


| Symptom                                            | Likely cause                                                 | What to do                                                             |
| -------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Redirect to login forever                          | Wrong Supabase keys or cookies blocked                       | Check URL/anon key; use same site URL; try incognito                   |
| “Invalid environment variables” on `npm run build` | Missing required env in production mode                      | Set all vars in `.env.local` or hosting dashboard                      |
| Analysis hangs or 500                              | OpenAI key missing/invalid, or DB migration not applied      | Check server terminal logs; verify `OPENAI_API_KEY`; re-run migrations |
| Stripe checkout error                              | `STRIPE_PRICE_PRO` unset or wrong mode                       | Use test Price ID with test secret key                                 |
| Webhook never updates plan                         | `stripe listen` not running or wrong `STRIPE_WEBHOOK_SECRET` | Restart CLI; copy new `whsec_` into `.env.local`                       |
| Upload fails                                       | Bucket `uploads` missing or storage policy                   | Create bucket; check Storage policies                                  |


---

## 13. Where configuration is documented elsewhere

- **[README.md](README.md)** — short setup summary  
- **[CONTRACTS.md](CONTRACTS.md)** — API shapes and enums  
- **[checkpoint.md](checkpoint.md)** — architecture for developers/agents

---

*Last updated to match the repository layout and env example as of this document’s addition.*