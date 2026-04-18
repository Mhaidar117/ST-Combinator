# StressTested

SaaS web app that puts a startup idea through an adversarial,
multi-agent investment-committee critique and returns a structured
verdict, scorecard, and 10-stage report. The synthesis stage uses
**OpenAI tool-calling** to optionally ground its judgment in a
competitor lookup, a pgvector search over uploaded supporting docs, and
prior analyses of the same startup.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind, shadcn-style UI
- Supabase (Auth, Postgres, Storage), `pgvector` for upload embeddings
- OpenAI `gpt-4o-mini` (chat + tool-calling) and `text-embedding-3-small`
- Stripe subscriptions, optional PostHog + Sentry

## Setup

1. Copy `.env.example` to `.env.local` and fill values (see
   [`Docs/Deployment.md`](Docs/Deployment.md) for the full env-var matrix
   including which are required vs optional).
2. Apply SQL migrations in `supabase/migrations/` to your Supabase
   project (SQL editor or CLI). Both `20250409000000_init.sql` and
   `20260418000000_traces_and_metrics.sql` are required.
3. Create a **private** Storage bucket named `uploads`.
4. In Stripe, create a recurring Price and set `STRIPE_PRICE_PRO`.
5. `npm install` then `npm run dev`.

### Stripe webhooks (local)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the printed secret as `STRIPE_WEBHOOK_SECRET`.

### Auth

Email/password signup is supported. For frictionless local dev, disable
**Confirm email** in Supabase Auth settings.

### Seed data

After you have a real `auth.users` id:

```bash
SEED_USER_ID=<uuid> npx tsx scripts/seed.ts
```

## Scripts

| Command              | What it does                                                   |
| -------------------- | -------------------------------------------------------------- |
| `npm run dev`        | development server                                             |
| `npm run build`      | production build                                               |
| `npm run typecheck`  | strict `tsc --noEmit`                                          |
| `npm run lint`       | `next lint`                                                    |
| `npm run test`       | Vitest unit tests (`tests/*.test.ts`)                          |
| `npm run smoke`      | end-to-end smoke test (see `scripts/smoke.ts` and `Docs/Smoke_Checklist.md`) |
| `npm run evals`      | scenario-based evaluation harness (see `evals/README.md`)      |
| `npm run demo`       | live agentic-loop demo against OpenAI; prints tool decisions   |
| `npm run db:seed`    | runs `scripts/seed.ts` (requires env)                          |

Pre-deploy sequence: `npm run typecheck && npm run lint && npm run test && npm run smoke && npm run evals`.

## Agentic synthesis

The committee/deep pipelines end with a synthesis stage that uses OpenAI
tool-calling (`tool_choice: "auto"`) over three tools:

- `lookup_competitors(names)` — short factual descriptions for
  competitor names listed in the brief.
- `search_uploaded_docs(query, k)` — pgvector search over the founder's
  uploaded supporting docs; returns `{ kind: "no_docs" }` if none.
- `get_prior_analyses()` — verdict/summary of previous analyses of the
  same startup so the model can spot iteration progress.

The model decides whether to call any tool, which tool, and with what
arguments. See `lib/openai/tools.ts`, `lib/openai/client.ts`
(`completeJsonWithTools`), and the technical report for details.

## Observability

Every LLM call and tool dispatch writes one row to `analysis_traces`
(stage, attempt, ok, latency, tokens, output excerpt, tool args). Two
surfaces consume it:

- `/analyses/[id]/traces` — per-analysis chronological table.
- `/api/debug/traces/[id]` — same data as JSON.

See `lib/observability/trace.ts` and the `analysis_traces` migration.

## Metrics

Two metrics, computed live from `analysis_traces` and exposed at
`/api/metrics` and `/admin/metrics` (gated by the `ADMIN_EMAILS`
allow-list):

1. **Schema success rate** — fraction of LLM stages whose first attempt
   produced schema-valid JSON.
2. **Pipeline latency p50 / p95** — per `run_type`, end-to-end summed
   latency.

See `lib/metrics/compute.ts` and the discussion in
`Docs/Technical_Report.md`.

## Evaluation

8 hand-crafted scenarios in `evals/scenarios.json` exercise the most
important failure modes (vague idea, no-moat clone, internal
contradiction, regulated vertical, ...). Each carries rule-based
checks. Run with `npm run evals`. Baseline results and discussion live
in [`Docs/Evaluation.md`](Docs/Evaluation.md).

## Documentation

- [`Docs/Technical_Report.md`](Docs/Technical_Report.md) — the full
  technical report (problem, design, agentic-ness, metrics, eval,
  reflection).
- [`Docs/Deployment.md`](Docs/Deployment.md) — step-by-step Vercel +
  Supabase + Stripe + GitHub deployment.
- [`Docs/Smoke_Checklist.md`](Docs/Smoke_Checklist.md) — manual
  10-step UI checklist.
- [`Docs/Evaluation.md`](Docs/Evaluation.md) — eval methodology and
  baseline results.
- [`CONTRACTS.md`](CONTRACTS.md) — frozen API and schema conventions.

## Contracts

See [`CONTRACTS.md`](CONTRACTS.md) for frozen API and schema
conventions.
