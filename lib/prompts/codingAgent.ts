/**
 * Build a concise, high-level prompt for a coding agent (Cursor, Claude Code,
 * v0, Replit Ghostwriter, etc.) to scaffold an MVP of the analyzed startup.
 *
 * Intentionally NOT an exhaustive architectural plan: the goal is to drop the
 * prompt into a fresh agent session and have it produce a runnable, opinionated
 * MVP in one shot. The agent fills in the details.
 */
export function buildCodingAgentPrompt(opts: {
  startup: {
    name?: string | null;
    one_liner?: string | null;
    problem?: string | null;
    target_customer?: string | null;
    why_now?: string | null;
    pricing_model?: string | null;
    go_to_market?: string | null;
    competitors?: string[] | null;
    unfair_advantage?: string | null;
    stage?: string | null;
    constraints?: string | null;
  };
  verdict?: string | null;
  summary?: string | null;
  killReasons?: string[];
  surviveReasons?: string[];
}): string {
  const s = opts.startup;
  const name = s.name?.trim() || "the startup";

  const lines: string[] = [];

  lines.push(
    `You are a senior full-stack engineer. Build a runnable MVP for **${name}** in a single coding session. Keep scope ruthless: ship the smallest version that proves the core loop, nothing more.`,
  );
  lines.push("");
  lines.push("## What it is");
  if (s.one_liner) lines.push(`- **One-liner:** ${s.one_liner}`);
  if (s.problem) lines.push(`- **Problem it solves:** ${s.problem}`);
  if (s.target_customer)
    lines.push(`- **Primary user:** ${s.target_customer}`);
  if (s.why_now) lines.push(`- **Why now:** ${s.why_now}`);
  if (s.pricing_model)
    lines.push(`- **Monetization:** ${s.pricing_model}`);
  if (s.unfair_advantage)
    lines.push(`- **Edge:** ${s.unfair_advantage}`);
  if (s.competitors?.length)
    lines.push(`- **Competitors to differentiate from:** ${s.competitors.join(", ")}`);

  if (opts.verdict || opts.summary) {
    lines.push("");
    lines.push("## What the founder already heard from a critic");
    if (opts.verdict) lines.push(`- **Verdict:** ${opts.verdict}`);
    if (opts.summary) lines.push(`- **Summary:** ${opts.summary}`);
    if (opts.killReasons?.length) {
      lines.push(
        `- **Top risks to design around:** ${opts.killReasons.slice(0, 3).join("; ")}`,
      );
    }
    if (opts.surviveReasons?.length) {
      lines.push(
        `- **What's actually working in the idea:** ${opts.surviveReasons.slice(0, 3).join("; ")}`,
      );
    }
  }

  lines.push("");
  lines.push("## MVP scope");
  lines.push(
    "Ship the **single core loop** end-to-end. A user should be able to sign up, do the one valuable thing this product promises, and see a result. Cut everything else.",
  );
  lines.push("");
  lines.push(
    "Target stack (use unless you have a strong reason not to): **Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui + Supabase (auth + Postgres + storage)**. Deploy to Vercel.",
  );

  lines.push("");
  lines.push("## Deliverables");
  lines.push(
    "1. A working app at `localhost:3000` with auth (email magic link) and the one core flow.",
  );
  lines.push(
    "2. A minimal landing page that explains the value prop in one sentence and has a single CTA.",
  );
  lines.push(
    "3. A README with setup steps (env vars, `npm install`, `npm run dev`, schema migration command).",
  );
  lines.push(
    "4. Database schema in `/supabase/migrations/` — only the tables strictly needed for the core loop.",
  );

  lines.push("");
  lines.push("## Hard constraints");
  lines.push("- No paid SaaS dependencies beyond Supabase + Vercel (both have free tiers).");
  lines.push("- No auth providers besides Supabase email magic link.");
  lines.push("- No analytics, no email automation, no admin panel, no settings page beyond log-out.");
  lines.push("- No tests yet; ship working code first.");
  if (s.constraints) lines.push(`- Founder-stated constraints: ${s.constraints}`);

  lines.push("");
  lines.push("## How to work");
  lines.push("1. Start by writing a 5-bullet plan of the data model and the core loop. Show it before coding.");
  lines.push("2. Then scaffold the project, write the schema, write the auth flow, write the core loop.");
  lines.push("3. Stop after the core loop runs end-to-end. Do not build secondary features.");
  lines.push(
    "4. End with a numbered list of the next 3 features the founder should build after validating this MVP.",
  );

  return lines.join("\n");
}
