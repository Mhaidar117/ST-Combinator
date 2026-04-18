# **StressTested — Coding Agent Build Spec**

## **Mission**

Build a production-ready MVP for **StressTested**, a SaaS web app that evaluates startup ideas through an adversarial, multi-agent analysis pipeline.

The product is **not** a generic idea validator. It should feel like an **investment committee trying to kill the idea**. The output must be structured, punchy, and useful. The user should leave with a clear sense of:

- why the startup might fail
- what assumptions are weakest
- where the wedge is strongest
- what to test next
- how version 2 compares to version 1

The app should be deployable and usable by a real user with authentication, subscriptions, saved analyses, and a polished report UI.

---

## **Non-negotiable product requirements**

### **Product positioning**

Position the app as:

**Pitch your idea. Get attacked before the market does.**

Do **not** frame it as a friendly startup coach. It should be skeptical, structured, and sharp.

### **Market gap this app must hit**

Existing tools are often:

- too generic
- too polite
- too optimistic
- weak on distribution realism
- weak on contradiction detection
- weak on assumption sensitivity

This app must differentiate through:

- multi-agent critique
- structured scorecards
- contradiction detection
- explicit assumption mapping
- sharp pass / weak / dead style verdicts
- saved version history and analysis comparison

### **MVP feature set**

The MVP must include:

1. marketing landing page
2. authentication
3. pricing page
4. user dashboard
5. startup intake form
6. analysis pipeline with three run modes
7. saved analysis reports
8. Stripe subscription support
9. report sharing
10. comparison of report versions for the same startup

---

## **Required tech stack**

Use this exact stack unless blocked by a real implementation issue:

- **Frontend:** Next.js 14+ with App Router and TypeScript
- **Styling:** Tailwind CSS
- **UI components:** shadcn/ui
- **Backend runtime:** Next.js route handlers and server actions
- **Database:** Supabase Postgres
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Vector search:** pgvector in Supabase Postgres
- **Payments:** Stripe
- **LLM provider:** OpenAI Responses API
- **Analytics:** PostHog
- **Error monitoring:** Sentry
- **Hosting target:** Vercel + Supabase

Use clean abstractions so the LLM provider can be swapped later.

---

## **Build constraints**

### **Must do**

- Use strict TypeScript
- Use zod validation for all external inputs and model outputs
- Use JSON-first LLM outputs
- Persist analysis results in normalized tables
- Enforce usage limits on the server side
- Make the UI feel premium and intentional
- Include seeded demo content for development

### **Must not do**

- Do not build this as a chat interface
- Do not render giant essay blobs as the primary result
- Do not rely on client-side secrets
- Do not store raw LLM output only; always store structured parsed results
- Do not make the product overly friendly in tone

---

## **User experience requirements**

### **Landing page**

Build a high-conviction SaaS landing page with:

- hero section
- short explanation of what the app does
- 3 analysis modes
- sample output teaser
- pricing preview
- CTA to sign up

Suggested hero copy:

- Headline: **Pitch your idea. Get attacked before the market does.**
- Subheadline: **StressTested simulates the room that tells you why your startup fails, before you waste months building it.**

### **Intake flow**

Create a startup creation flow with progressive disclosure.

#### **Required fields**

- startup name
- one-line idea
- problem being solved
- target customer
- why now
- pricing model
- go-to-market strategy
- known competitors
- unfair advantage / moat
- stage (idea, mvp, revenue)

#### **Optional fields**

- website URL
- uploaded deck / notes
- founder background
- constraints

### **Analysis modes**

Implement exactly these three modes:

#### **1. Quick Roast**

Fast and sharp.

- 1 lightweight critique pass
- 1 synthesis pass
- results in under ~20 seconds when possible

#### **2. Investor Committee**

Parallel multi-agent evaluation.

- multiple specialist evaluators
- contradiction pass
- synthesis pass

#### **3. Deep Stress Test**

Everything in Investor Committee, plus:

- explicit assumption map
- fragility scoring
- suggested validation experiments
- repositioning options

### **Results page**

Results must be displayed as a structured dashboard with cards, accordions, and visual scoring.

Top-level sections:

1. verdict banner
2. scorecard
3. why this dies
4. why it might live
5. contradiction panel
6. assumption map
7. next best experiments
8. alternative wedges / repositioning options
9. raw committee view (collapsible)

### **Tone selector**

Support a report tone selector with:

- polite
- direct
- brutal

This affects display copy, not core scoring logic.

### **Comparison view**

Users must be able to compare two analyses of the same startup and see:

- score differences
- improved sections
- worsened sections
- changed assumptions
- new contradictions

### **Share page**

Allow generation of a public share page for an analysis. Public links must expose only that report and no account information.

---

## **Data model**

Create Supabase migrations for the following schema.

### **users_profile**

This extends auth users.

Fields:

- id uuid primary key references auth.users(id)
- email text
- full_name text nullable
- plan_tier text not null default ‘free’
- monthly_credit_limit int not null default 3
- monthly_credit_used int not null default 0
- stripe_customer_id text nullable
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### **startups**

Fields:

- id uuid primary key default gen_random_uuid()
- user_id uuid not null references users_profile(id)
- name text not null
- one_liner text not null
- problem text not null
- target_customer text not null
- why_now text not null
- pricing_model text not null
- go_to_market text not null
- competitors text[] not null default ‘{}’
- unfair_advantage text not null
- stage text not null check stage in (‘idea’,‘mvp’,‘revenue’)
- website_url text nullable
- founder_background text nullable
- constraints text nullable
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### **startup_uploads**

Fields:

- id uuid primary key default gen_random_uuid()
- startup_id uuid not null references startups(id) on delete cascade
- storage_path text not null
- original_filename text not null
- mime_type text not null
- extracted_text text nullable
- created_at timestamptz not null default now()

### **analyses**

Fields:

- id uuid primary key default gen_random_uuid()
- startup_id uuid not null references startups(id) on delete cascade
- run_type text not null check run_type in (‘quick_roast’,‘committee’,‘deep’)
- tone text not null check tone in (‘polite’,‘direct’,‘brutal’) default ‘direct’
- status text not null check status in (‘queued’,‘processing’,‘completed’,‘failed’) default ‘queued’
- input_snapshot jsonb not null
- canonical_brief jsonb nullable
- verdict text nullable
- summary text nullable
- confidence_score numeric nullable
- share_token text unique nullable
- created_at timestamptz not null default now()
- completed_at timestamptz nullable

### **analysis_scores**

Fields:

- id uuid primary key default gen_random_uuid()
- analysis_id uuid not null references analyses(id) on delete cascade
- problem_severity int not null
- customer_clarity int not null
- market_timing int not null
- distribution_plausibility int not null
- monetization_strength int not null
- defensibility int not null
- founder_market_fit int not null
- speed_to_mvp int not null
- retention_potential int not null
- investor_attractiveness int not null
- overall_score numeric not null
- created_at timestamptz not null default now()

### **analysis_sections**

Fields:

- id uuid primary key default gen_random_uuid()
- analysis_id uuid not null references analyses(id) on delete cascade
- section_type text not null
- content jsonb not null
- created_at timestamptz not null default now()

Expected section_type values:

- kill_reasons
- survive_reasons
- contradiction_report
- assumptions
- experiments
- repositioning
- committee_outputs
- ui_quotes
- scoring_rationale

### **subscriptions**

Fields:

- id uuid primary key default gen_random_uuid()
- user_id uuid not null references users_profile(id) on delete cascade
- stripe_subscription_id text unique not null
- stripe_price_id text not null
- status text not null
- current_period_end timestamptz nullable
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()

### **embeddings**

Fields:

- id uuid primary key default gen_random_uuid()
- owner_type text not null
- owner_id uuid not null
- chunk_text text not null
- metadata jsonb not null default ‘{}’::jsonb
- embedding vector(1536)
- created_at timestamptz not null default now()

Add appropriate indexes. Enable pgvector.

---

## **Row-level security**

Set up RLS policies in Supabase.

Requirements:

- users can only access their own startups, analyses, uploads, and subscriptions
- public share pages may read an analysis only through a share_token lookup and only expose sanitized data
- service role can perform analysis writes

Implement policies, not just app-side checks.

---

## **Application structure**

Use a structure close to this:

```
app/
  (marketing)/
    page.tsx
    pricing/page.tsx
    demo/page.tsx
  (app)/
    dashboard/page.tsx
    startups/new/page.tsx
    startups/[startupId]/page.tsx
    startups/[startupId]/analyze/page.tsx
    analyses/[analysisId]/page.tsx
    compare/[startupId]/page.tsx
    settings/page.tsx
  share/[token]/page.tsx
  api/
    analyze/route.ts
    uploads/route.ts
    stripe/checkout/route.ts
    stripe/webhook/route.ts
    share/route.ts
components/
  landing/
  dashboard/
  reports/
  startup/
  comparison/
  billing/
  ui/
lib/
  auth/
  db/
  supabase/
  stripe/
  openai/
  analysis/
  scoring/
  prompts/
  validators/
  usage/
  uploads/
  analytics/
  errors/
types/
  db.ts
  startup.ts
  analysis.ts
  llm.ts
supabase/
  migrations/
```

---

## **Core domain types**

Create strongly typed domain models and zod schemas.

### **StartupBrief**

Include:

- id
- name
- oneLiner
- problem
- targetCustomer
- whyNow
- pricingModel
- goToMarket
- competitors
- unfairAdvantage
- stage
- websiteUrl
- founderBackground
- constraints

### **CommitteeOutput**

Fields:

- agent
- score
- strongestAngle
- biggestConcern
- concerns[]
- whatWouldChangeMyMind[]
- punchyLine
- rationale

### **ContradictionItem**

Fields:

- title
- severity (low,medium,high)
- explanation
- conflictingClaims[]
- suggestedFix

### **AssumptionItem**

Fields:

- assumption
- category (customer,distribution,pricing,competition,technical,timing)
- fragility
- confidence
- test

### **FinalAnalysis**

Fields:

- verdict
- summary
- confidenceScore
- scores
- killReasons[]
- surviveReasons[]
- contradictions[]
- assumptions[]
- experiments[]
- repositioningOptions[]
- uiQuotes[]

---

## **LLM architecture**

The app must use a structured multi-stage pipeline. Do not collapse everything into one call.

### **Stage 1: Canonical brief normalization**

Input: raw startup form data and extracted upload text

Output: a canonical startup brief JSON with consistent terminology and no fluff

Purpose:

- normalize user input
- resolve ambiguous wording
- make later evaluations more stable

### **Stage 2: Committee evaluators**

Run specialist evaluators in parallel. Each must produce strict JSON.

Required evaluator roles:

1. vc_partner
2. customer_skeptic
3. growth_lead
4. product_strategist
5. technical_reviewer
6. competitor_analyst

Each evaluator must output:

- score (1-10)
- strongestAngle
- biggestConcern
- concerns[]
- whatWouldChangeMyMind[]
- punchyLine
- rationale

### **Stage 3: Contradiction detector**

Input:

- canonical brief
- committee outputs

Output:

- contradictions[]

This agent must focus on internal inconsistency such as:

- target customer mismatch with GTM
- pricing mismatch with value proposition
- moat claims unsupported by acquisition path
- SMB vs enterprise contradictions
- “AI wrapper” claims with weak defensibility

### **Stage 4: Assumption extractor**

Required for committee and deep modes. Stronger detail for deep mode.

Output:

- assumption list
- fragility and confidence scores
- recommended validation test per assumption

### **Stage 5: Synthesis**

Combine all prior outputs into a final structured report.

The synthesis agent must produce:

- final verdict
- concise summary
- scorecard
- kill reasons
- survive reasons
- experiments
- repositioning options
- short UI quotes

### **Stage 6: Optional embeddings**

Store embeddings for:

- canonical brief
- extracted uploads
- final analysis summary
- assumptions

This is to support future semantic retrieval and comparison.

---

## **LLM prompt requirements**

Create prompt files for each stage under lib/prompts/.

### **General prompt rules**

- prompts must instruct the model to return valid JSON only
- prompts must include output schema requirements
- prompts must be role-specific and skeptical
- prompts must explicitly ban generic encouragement
- prompts must prefer concrete and falsifiable critique

### **Prompt files to create**

- normalize.ts
- vcPartner.ts
- customerSkeptic.ts
- growthLead.ts
- productStrategist.ts
- technicalReviewer.ts
- competitorAnalyst.ts
- contradictions.ts
- assumptions.ts
- synthesis.ts

### **Example evaluator behavior**

The vc_partner evaluator should distrust:

- weak moats
- small markets
- feature businesses pretending to be companies
- no clear urgency
- unclear path to repeatable acquisition

The growth_lead evaluator should attack:

- customer acquisition assumptions
- paid channel fantasy
- “we’ll go viral” claims
- no distribution wedge

The customer_skeptic evaluator should attack:

- whether pain is real
- whether buying urgency exists
- whether the product is a nice-to-have

---

## **Scoring system**

Implement a deterministic score assembly layer in code. The model may propose sub-scores, but final displayed scores must be passed through a rubric layer.

Create score rubrics for:

- problem severity
- customer clarity
- market timing
- distribution plausibility
- monetization strength
- defensibility
- founder-market fit
- speed to MVP
- retention potential
- investor attractiveness

Each rubric must define 1-2, 3-4, 5-6, 7-8, 9-10 anchors.

### **Overall score**

Compute weighted overall score using a configurable weight map. Store both individual scores and overall score.

Suggested defaults:

- problem severity: 0.14
- customer clarity: 0.12
- market timing: 0.08
- distribution plausibility: 0.16
- monetization strength: 0.10
- defensibility: 0.14
- founder-market fit: 0.10
- speed to MVP: 0.06
- retention potential: 0.05
- investor attractiveness: 0.05

Make this configurable in a central module.

---

## **Billing and access control**

Implement subscription gating with Stripe.

### **Plans**

#### **Free**

- 3 quick roasts per month
- no deep stress test
- no comparison feature
- no upload support

#### **Pro**

- unlimited quick roasts
- 20 committee or deep analyses per month
- report history
- comparisons
- uploads
- PDF export placeholder support in UI even if PDF export is not fully implemented yet

### **Billing requirements**

- Stripe checkout session endpoint
- Stripe webhook handler
- update subscriptions table on events
- sync plan tier in user profile
- server-side usage checks before analysis starts

### **Webhook events to support**

- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted

---

## **File upload requirements**

Support uploads for Pro users.

Allowed types for MVP:

- pdf
- txt
- md

Requirements:

- upload to Supabase Storage
- store metadata in startup_uploads
- extract text server-side
- sanitize content
- save extracted text to DB
- feed extracted text into canonical brief normalization

Gracefully handle extraction failures.

---

## **API and server behavior**

### **POST /api/analyze**

Purpose: trigger an analysis run

Request body:

- startupId
- runType
- tone

Server flow:

1. authenticate user
2. load startup
3. enforce permissions
4. enforce usage limits
5. create analysis row with queued
6. transition to processing
7. gather uploads and extracted text
8. normalize to canonical brief
9. run committee evaluators as needed
10. run contradiction detector
11. run assumption extractor
12. run synthesis
13. compute rubric-adjusted scorecard
14. persist all sections
15. mark analysis completed
16. return analysis id

On failure:

- mark analysis failed
- store diagnostic metadata if safe
- return meaningful error

### **POST /api/uploads**

- authenticate user
- verify plan tier
- verify startup ownership
- upload file
- extract text
- create startup_uploads row

### **POST /api/share**

- authenticate owner
- create share token if missing
- return public URL

### **POST /api/stripe/checkout**

- create Stripe Checkout Session

### **POST /api/stripe/webhook**

- verify signature
- process supported events
- update subscription state

---

## **UI requirements**

Use a modern SaaS design with crisp spacing, rounded cards, subtle gradients, and clear hierarchy.

### **Design rules**

- use Tailwind and shadcn/ui
- avoid visual clutter
- no giant paragraphs by default
- use cards, progress bars, badges, and accordions
- make the verdict visually obvious
- support dark mode if feasible with little added complexity

### **Dashboard**

Show:

- user plan
- credits used
- startups list
- recent analyses
- CTA to create startup

### **Startup detail page**

Show:

- core startup info
- uploaded files
- analysis history
- buttons to run each analysis mode
- compare analyses CTA

### **Analysis report page**

Must include:

- verdict header with badge
- overall score card
- score breakdown bars
- why this dies card
- why it might live card
- contradictions list with severity badges
- assumptions table
- next experiments list
- repositioning cards
- collapsible committee outputs
- actions: rerun, compare, share

### **Comparison page**

Visualize differences cleanly.

At minimum:

- side-by-side top-line summary
- changed score bars
- added/removed contradictions
- assumption diffs
- verdict change

---

## **Observability**

Integrate:

- PostHog for product analytics
- Sentry for error tracking

Track at least these events:

- signed_up
- startup_created
- analysis_started
- analysis_completed
- analysis_failed
- share_link_created
- checkout_started
- subscription_upgraded
- comparison_viewed

---

## **Seed data and demo mode**

Provide a seed script that creates:

- one demo user profile
- two sample startups
- multiple analyses across versions

Also create a /demo page with a mocked but realistic sample report so the marketing page can link to a live example.

---

## **Environment variables**

Implement env validation using zod.

Expected variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- NEXT_PUBLIC_SITE_URL
- POSTHOG_KEY
- POSTHOG_HOST
- SENTRY_DSN

---

## **Testing requirements**

At minimum, add:

- schema validation tests for model outputs
- rubric scoring unit tests
- permission tests for protected routes
- webhook signature handling tests where feasible
- analysis orchestration tests with mocked model responses

Use a practical test setup. Prefer lightweight, high-value coverage over exhaustive setup.

---

## **Acceptance criteria**

The build is complete when all of the following are true:

1. a new user can sign up and log in
2. the user can create a startup profile
3. the user can run a quick roast and see a structured report
4. the user can upgrade via Stripe checkout
5. a Pro user can upload a PDF or text file to a startup
6. the user can run committee and deep analyses
7. analysis results are saved and visible in history
8. the user can compare two analyses for the same startup
9. the user can create a public share link
10. usage limits are enforced server-side
11. RLS protects user data correctly
12. the app builds successfully and is ready for deployment

---

## **Implementation notes**

### **Keep orchestration modular**

Create a dedicated analysis service, for example:

- runQuickRoast()
- runCommitteeAnalysis()
- runDeepStressTest()

Use shared lower-level helpers:

- normalizeStartupBrief()
- runEvaluator()
- detectContradictions()
- extractAssumptions()
- synthesizeAnalysis()
- applyScoreRubric()
- persistAnalysis()

### **Parse model outputs defensively**

Every model response must be validated with zod. Retry parsing once with a repair prompt if needed. If still invalid, fail gracefully.

### **Make the product feel opinionated**

Use strong labels and microcopy like:

- “Likely dead”
- “Weak wedge”
- “Distribution fantasy”
- “Clone risk”
- “Nice-to-have trap”

Do not overdo gimmicks, but do make the app memorable.

---

## **Deliverables**

Build the full app in one pass with:

- complete Next.js codebase
- Supabase SQL migrations
- Stripe integration
- analysis pipeline
- polished UI
- seed/demo content
- README with setup instructions

The result should be coherent, runnable, and organized so a human engineer could continue from it without re-architecting.

---

## **Final instruction**

Do not return a partial scaffold. Build the app as a real MVP with working flows, clear code organization, strong typing, and production-minded defaults.