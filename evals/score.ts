export type ScoredFinalAnalysis = {
  verdict: string;
  killReasons: string[];
  surviveReasons: string[];
  contradictions: { severity: "low" | "medium" | "high" }[];
  assumptions: { category: string; fragility: number }[];
};

export type Expectations = {
  verdictMustNotInclude?: string[];
  verdictAllow?: string[];
  minSurviveReasons?: number;
  minKillReasons?: number;
  minContradictions?: number;
  contradictionMinSeverity?: "low" | "medium" | "high";
  killReasonsMustMatch?: string[];
  minAssumptionsFragility?: number;
  minAssumptionsCategory?: string[];
};

export type ScoreResult = {
  passed: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
};

const SEVERITY_RANK = { low: 1, medium: 2, high: 3 } as const;

export function scoreScenario(
  final: ScoredFinalAnalysis,
  exp: Expectations,
): ScoreResult {
  const checks: { name: string; passed: boolean; detail?: string }[] = [];
  const verdictLc = (final.verdict ?? "").toLowerCase();
  const killStr = (final.killReasons ?? []).join(" \u2581 ").toLowerCase();

  if (exp.verdictMustNotInclude) {
    const hit = exp.verdictMustNotInclude.find((w) => verdictLc.includes(w.toLowerCase()));
    checks.push({
      name: `verdict_excludes(${exp.verdictMustNotInclude.join("|")})`,
      passed: !hit,
      detail: hit ? `verdict contained "${hit}": ${final.verdict}` : undefined,
    });
  }

  if (exp.verdictAllow && exp.verdictAllow.length > 0) {
    const ok = exp.verdictAllow.some((w) => verdictLc.includes(w.toLowerCase()));
    checks.push({
      name: `verdict_allows_one_of(${exp.verdictAllow.join("|")})`,
      passed: ok,
      detail: ok ? undefined : `verdict was "${final.verdict}"`,
    });
  }

  if (typeof exp.minSurviveReasons === "number") {
    const n = final.surviveReasons?.length ?? 0;
    checks.push({
      name: `surviveReasons>=${exp.minSurviveReasons}`,
      passed: n >= exp.minSurviveReasons,
      detail: `got ${n}`,
    });
  }

  if (typeof exp.minKillReasons === "number") {
    const n = final.killReasons?.length ?? 0;
    checks.push({
      name: `killReasons>=${exp.minKillReasons}`,
      passed: n >= exp.minKillReasons,
      detail: `got ${n}`,
    });
  }

  if (typeof exp.minContradictions === "number") {
    const n = final.contradictions?.length ?? 0;
    checks.push({
      name: `contradictions>=${exp.minContradictions}`,
      passed: n >= exp.minContradictions,
      detail: `got ${n}`,
    });
  }

  if (exp.contradictionMinSeverity) {
    const minRank = SEVERITY_RANK[exp.contradictionMinSeverity];
    const ok = (final.contradictions ?? []).some(
      (c) => SEVERITY_RANK[c.severity] >= minRank,
    );
    checks.push({
      name: `contradiction_severity>=${exp.contradictionMinSeverity}`,
      passed: ok,
      detail: ok
        ? undefined
        : `severities: ${(final.contradictions ?? []).map((c) => c.severity).join(",") || "none"}`,
    });
  }

  if (exp.killReasonsMustMatch) {
    for (const pattern of exp.killReasonsMustMatch) {
      const re = new RegExp(pattern, "i");
      const ok = re.test(killStr);
      checks.push({
        name: `killReasons matches /${pattern}/i`,
        passed: ok,
        detail: ok ? undefined : `kill reasons: ${(final.killReasons ?? []).slice(0, 3).join(" | ")}`,
      });
    }
  }

  if (typeof exp.minAssumptionsFragility === "number") {
    const ok = (final.assumptions ?? []).some(
      (a) => a.fragility >= exp.minAssumptionsFragility!,
    );
    checks.push({
      name: `assumption_fragility>=${exp.minAssumptionsFragility}`,
      passed: ok,
      detail: ok
        ? undefined
        : `max fragility: ${Math.max(0, ...(final.assumptions ?? []).map((a) => a.fragility))}`,
    });
  }

  if (exp.minAssumptionsCategory) {
    const cats = new Set((final.assumptions ?? []).map((a) => a.category));
    for (const want of exp.minAssumptionsCategory) {
      checks.push({
        name: `assumption_category_includes:${want}`,
        passed: cats.has(want as never),
        detail: `categories: ${Array.from(cats).join(",") || "none"}`,
      });
    }
  }

  const passed = checks.every((c) => c.passed);
  return { passed, checks };
}
