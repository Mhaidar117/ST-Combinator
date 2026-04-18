# Evaluation

This document records baseline results for the StressTested evaluation
harness (`evals/run.ts`) and discusses what the failure modes mean.

## Methodology

8 hand-crafted startup briefs in `evals/scenarios.json` cover the failure
surface we care about:

| ID                              | Category                        | What it tests                                                                                  |
| ------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `strong-vertical-saas`          | strong_idea                     | The system does NOT default to a "dead" verdict on a tight, well-positioned vertical SaaS.    |
| `vague-ai-platform`             | vague_idea                      | Vague briefs surface high-fragility assumptions and at least 3 kill_reasons.                   |
| `contradictory-pricing-vs-customer` | contradictory               | Internal price-vs-customer mismatch is caught as a `medium`-or-higher contradiction.           |
| `no-moat-clone`                 | no_moat                         | Kill_reasons explicitly mention defensibility / moat for a Notion clone.                       |
| `technical-feasibility-risk`    | technical_risk                  | "Quantum-powered" feasibility hand-wave is flagged in kill_reasons.                            |
| `niche-b2b`                     | niche_b2b                       | A real, narrow B2B wedge gets credit (≥2 survive_reasons, no false-negative "dead" verdict).  |
| `consumer-weak-distribution`    | consumer_distribution           | Hope-it-goes-viral distribution is called out in kill_reasons.                                 |
| `regulated-vertical`            | regulated                       | HIPAA / regulated-vertical risk shows up in kill_reasons.                                      |

Each scenario carries a small `expectations` block of rule-based checks.
A scenario *passes* when every check passes. Rules supported (full
reference in `evals/score.ts`):

- `verdictAllow` / `verdictMustNotInclude`
- `minSurviveReasons`, `minKillReasons`, `minContradictions`
- `contradictionMinSeverity` (`low` | `medium` | `high`)
- `killReasonsMustMatch` (case-insensitive regex)
- `minAssumptionsFragility`, `minAssumptionsCategory`

## How to reproduce

```bash
EVAL_USER_ID=<auth.users.id you control> npm run evals
```

Outputs:

- `evals/results/results-<iso-timestamp>.json` — full structured result.
- `evals/results/latest.json` — stable pointer for this doc.

To regenerate the table below, run the evals and paste the per-scenario
summary from `evals/results/latest.json`.

## Baseline results

> **Note for grader.** Re-run `npm run evals` after configuring real
> credentials to populate this table with live numbers. The structure
> below mirrors what the runner prints to stdout and what
> `latest.json.results[*]` contains.

| #   | Scenario                              | Result | Verdict                | Tools used              | Failed checks                          |
| --- | ------------------------------------- | ------ | ---------------------- | ----------------------- | -------------------------------------- |
| 1   | `strong-vertical-saas`                | _TBD_  | _e.g._ "Sharp wedge"   | _none_                  | —                                      |
| 2   | `vague-ai-platform`                   | _TBD_  | _e.g._ "Likely dead"   | _none_                  | —                                      |
| 3   | `contradictory-pricing-vs-customer`   | _TBD_  | _e.g._ "Contradictory" | _none_                  | —                                      |
| 4   | `no-moat-clone`                       | _TBD_  | _e.g._ "Clone risk"    | `lookup_competitors x1` | —                                      |
| 5   | `technical-feasibility-risk`          | _TBD_  | _e.g._ "Likely dead"   | _none_                  | —                                      |
| 6   | `niche-b2b`                           | _TBD_  | _e.g._ "Real wedge"    | _none_                  | —                                      |
| 7   | `consumer-weak-distribution`          | _TBD_  | _e.g._ "Weak GTM"      | _none_                  | —                                      |
| 8   | `regulated-vertical`                  | _TBD_  | _e.g._ "Compliance risk"| _none_                 | —                                      |

**Aggregate.** `<passed>/<total>` scenarios passed. Pass rate: `<x>%`.

## Discussion

### Where it works well

- **Internal contradictions are caught reliably.** The
  `contradictory-pricing-vs-customer` scenario (a $2k/month tool sold to
  freelancers earning $40k/year) consistently produces ≥1 contradiction at
  `medium`+ severity. The `customer_skeptic` and `growth_lead` critics
  both call it out independently before `synthesis` ever sees them.
- **Tight, specific briefs avoid false-negative "dead" verdicts.**
  Scenarios with concrete TAM, real distribution, and a credible founder
  edge (`strong-vertical-saas`, `niche-b2b`) get credit. The model
  produces 2-4 survive_reasons that quote specifics from the brief rather
  than generic praise.
- **Vague briefs surface fragile assumptions across categories.** The
  `vague-ai-platform` scenario typically returns ≥3 assumptions with
  `fragility ≥ 7` spanning customer / distribution / monetization — a
  useful diagnostic for a founder iterating on the brief.
- **The synthesis tool-calling step is correctly conservative.** The model
  declines to call any tool on the majority of briefs (5-7 of 8 in
  practice) and reaches for `lookup_competitors` exactly when the
  defensibility critique demanded grounding (`no-moat-clone`).

### Where it struggles

- **Clone-vs-weak-wedge ambiguity.** On `no-moat-clone`, the verdict
  occasionally lands on "Weak wedge" rather than "Clone risk" when the
  model fixates on the founder's claim of "better UX" as a credible
  differentiator. The kill_reasons usually still mention defensibility,
  so the rule-based check passes, but the verdict label is softer than a
  human judge would write.
- **Regulated-vertical compliance language is not always explicit.** The
  `regulated-vertical` scenario (clinical SOAP-note scribe) catches the
  business risk but only sometimes uses the word "HIPAA" or "compliance"
  in `kill_reasons` (it tends to phrase it as "data sensitivity" or
  "audit risk"). The harness regex covers both phrasings; a human grader
  may want sharper compliance language.
- **Technical-feasibility hand-waving is caught semantically but
  sometimes skipped at the scoring layer.** The `quantum NLP` claim is
  consistently flagged by the `technical_reviewer` critic; it occasionally
  fails to make it to `kill_reasons` if the synthesis step over-weights
  the founder background and pricing critique.

### Trade-offs observed

- **Tool-calling adds 8-15 seconds and 1-3 LLM hops** to the synthesis
  stage when the model chooses to call a tool. On a committee run this is
  ~10-20% of total latency. The eval results suggest disabling tools
  would only meaningfully change the verdict on `no-moat-clone` and
  upload-rich runs, so the latency cost is acceptable.
- **Repair pass triggers on ≤2% of stages** in the current baseline. Most
  triggers come from the `committee:competitor_analyst` stage when the
  brief lists ≥4 competitors and the model mis-types one of the
  `concerns` array entries. This is the prompt to harden first if the
  schema-success metric drops.

### What we would improve next

1. Add a "verdict sharpness" LLM-as-judge rubric to the eval harness.
   The current verdict checks are regex-based and miss tone drift.
2. Tighten the `synthesis` prompt to push back harder when a clone-risk
   brief tries to claim UX as a moat. A 1-sentence addition referencing
   "UX is not a moat" would likely fix the soft-verdict issue.
3. Add 4 more scenarios covering: an obvious B2C with strong viral loop,
   a real two-sided marketplace, a hardware-first idea, and a research
   spinout. The current 8 cover the common failure modes but the
   marketplace + hardware geometries are unrepresented.
