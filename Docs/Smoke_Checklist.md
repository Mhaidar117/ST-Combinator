# Manual smoke checklist

Run through these against `http://localhost:3000` for local dev and
against the production URL after each `vercel deploy --prod`. Used by
`Docs/Deployment.md` step 6.

| #   | Step                                                                                  | Pass? |
| --- | ------------------------------------------------------------------------------------- | ----- |
| 1   | `/` loads, the marketing page renders, the primary CTA navigates to signup or dash.  |       |
| 2   | Sign up a new email/password user. Land on the dashboard.                              |       |
| 3   | Click "New startup", fill all fields, submit. The startup appears on the dashboard.    |       |
| 4   | From the startup page, run **Quick Roast**. Report renders within ~30s.                |       |
| 5   | Run **Committee** on the same startup. Report renders within ~3 min, scorecard shows.  |       |
| 6   | Click **View trace** from the analysis header → `/analyses/[id]/traces` shows the trace table with token counts and per-stage rows. |       |
| 7   | Generate a share link → open in an incognito window → confirm the report renders without auth. |       |
| 8   | (Optional, requires `ADMIN_EMAILS` to include your account) Visit `/admin/metrics` → see two metric cards with finite numbers. |       |
| 9   | Upload a small `.txt` or `.pdf` file via the upload form on the startup page. Run **Committee** again, then on the new analysis's trace page confirm a `tool:search_uploaded_docs` row is present. |       |
| 10  | Click **Upgrade**, complete Stripe checkout with card `4242 4242 4242 4242`, any future date and CVC. Back in `/settings`, confirm plan flipped to **Pro**. |       |

## When to run

- After every code change touching `lib/analysis/pipeline.ts`,
  `lib/openai/*`, or `app/api/*`.
- Before every `vercel deploy --prod`.
- After applying a new SQL migration.

## Automated companion

For a code-driven (non-UI) version of the same flow, run:

```bash
SMOKE_USER_ID=<auth.users.id> npm run smoke
```

It exercises the pipeline, trace persistence, and metrics computation
directly via the lib code (no HTTP, no auth). See `scripts/smoke.ts`.
