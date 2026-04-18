# Evaluation harness

Hand-crafted scenarios that exercise the agentic synthesis pipeline against
8 representative startup briefs (strong idea, vague idea, internal
contradiction, no-moat clone, technical-feasibility risk, niche B2B,
consumer with weak distribution, regulated vertical).

## Run

```bash
EVAL_USER_ID=<an auth.users.id you control> npm run evals
```

Required env (in addition to standard app env):

| Variable                        | Why                                              |
| ------------------------------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | DB target                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | bypasses RLS to insert eval rows                 |
| `OPENAI_API_KEY`                | LLM calls                                        |
| `EVAL_USER_ID`                  | the user_id under which eval startups are created|

## Output

- `evals/results/results-<iso-timestamp>.json` — full results for the run.
- `evals/results/latest.json` — same content, stable filename used by
  `Docs/Evaluation.md` regeneration.

Each scenario row reports:

- `passed`: boolean across all per-scenario checks
- `checks`: list of individual rule results with detail strings
- `verdict`, `summary`: from the persisted analysis
- `toolCallSummary`: which synthesis tools the LLM chose to invoke
- `durationMs`, `analysisId`, `startupId` for cross-referencing traces

## Scoring rules

Defined per scenario in `scenarios.json` under `expectations`. Supported
rules (see `score.ts`):

- `verdictMustNotInclude` / `verdictAllow`
- `minSurviveReasons` / `minKillReasons`
- `minContradictions` / `contradictionMinSeverity`
- `killReasonsMustMatch` (regex strings)
- `minAssumptionsFragility`
- `minAssumptionsCategory`

Add a new scenario by appending a JSON object with an `expectations` block
that captures the failure mode you want to guard against.

## Cleanup

Eval rows are *not* auto-deleted so failures can be triaged through the
debug trace UI. To purge them later:

```sql
delete from public.startups
where name like '[eval:%]'
  and user_id = '<EVAL_USER_ID>';
-- analyses, sections, scores, traces cascade.
```

## Cost & runtime

Each `committee` scenario fires ~10-13 LLM calls (`gpt-4o-mini`) plus 0-3
tool calls. A full 8-scenario run typically completes in 6-12 minutes and
costs well under $1.
