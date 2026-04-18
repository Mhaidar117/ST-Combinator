# StressTested — frozen contracts (Wave 0)

Agents MUST NOT change migrations, public API shapes, or env keys without updating this file.

## Environment (zod-validated)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `POSTHOG_KEY`
- `POSTHOG_HOST`
- `SENTRY_DSN`

## Domain enums

- `run_type`: `quick_roast` | `committee` | `deep`
- `tone`: `polite` | `direct` | `brutal`
- `stage`: `idea` | `mvp` | `revenue`
- `plan_tier`: `free` | `pro` (stored as text)
- `analysis.status`: `queued` | `processing` | `completed` | `failed`
- `section_type`: `kill_reasons` | `survive_reasons` | `contradiction_report` | `assumptions` | `experiments` | `repositioning` | `committee_outputs` | `ui_quotes` | `scoring_rationale`

## HTTP API

### `POST /api/analyze`

**Body:** `{ startupId: string (uuid), runType: run_type, tone: tone }`

**Success:** `{ analysisId: string }`

**Errors:** 401, 403 (limits/plan), 404, 500

### `POST /api/uploads`

**Body:** `multipart/form-data` — `file`, `startupId`

**Success:** `{ uploadId: string }`

### `POST /api/share`

**Body:** `{ analysisId: string }`

**Success:** `{ shareUrl: string, token: string }`

### `POST /api/stripe/checkout`

**Body:** `{ priceId?: string }` (optional; default from env)

**Success:** `{ url: string }`

### `POST /api/stripe/webhook`

Stripe signature; no JSON body for clients.

## File ownership (merge rules)

| Path | Owner |
|------|--------|
| `package.json`, `tsconfig.json` | Platform (single PR) |
| `supabase/migrations/*` | DB only |
| `middleware.ts`, `lib/supabase/*` | Auth layer |
| `lib/analysis/*` | Pipeline |
| `app/api/*` | API routes |

## Public analysis export (`share/[token]`)

Expose only: verdict, summary, scores, sections needed for report UI — no `user_id`, email, or Stripe ids.
