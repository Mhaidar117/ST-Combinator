"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStartup } from "@/app/actions/startup";

type Stage = "idea" | "mvp" | "revenue";

type FormState = {
  name: string;
  one_liner: string;
  problem: string;
  target_customer: string;
  why_now: string;
  pricing_model: string;
  go_to_market: string;
  competitors: string;
  unfair_advantage: string;
  stage: Stage;
  website_url: string;
  founder_background: string;
  constraints: string;
};

const EMPTY: FormState = {
  name: "",
  one_liner: "",
  problem: "",
  target_customer: "",
  why_now: "",
  pricing_model: "",
  go_to_market: "",
  competitors: "",
  unfair_advantage: "",
  stage: "idea",
  website_url: "",
  founder_background: "",
  constraints: "",
};

type ParsedFields = Partial<{
  name: string | null;
  one_liner: string | null;
  problem: string | null;
  target_customer: string | null;
  why_now: string | null;
  pricing_model: string | null;
  go_to_market: string | null;
  competitors: string[] | null;
  unfair_advantage: string | null;
  stage: Stage | null;
  website_url: string | null;
  founder_background: string | null;
  constraints: string | null;
}>;

export function NewStartupForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [autofillState, setAutofillState] = useState<
    "idle" | "uploading" | "parsing" | "filled" | "error"
  >("idle");
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [filledFieldCount, setFilledFieldCount] = useState(0);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onAutofillFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAutofillError(null);
    setAutofillState("uploading");
    const fd = new FormData();
    fd.append("file", file);

    try {
      setAutofillState("parsing");
      const r = await fetch("/api/startups/parse", {
        method: "POST",
        body: fd,
      });
      const text = await r.text();
      let j: { parsed?: ParsedFields; error?: string } = {};
      try {
        j = text ? JSON.parse(text) : {};
      } catch {
        // non-JSON body
      }
      if (!r.ok || !j.parsed) {
        setAutofillError(j.error ?? `Auto-fill failed (HTTP ${r.status})`);
        setAutofillState("error");
        return;
      }
      const filled = applyParsedToForm(j.parsed);
      setFilledFieldCount(filled);
      setAutofillState("filled");
    } catch (err) {
      setAutofillError(err instanceof Error ? err.message : "Network error");
      setAutofillState("error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function applyParsedToForm(p: ParsedFields): number {
    let count = 0;
    setForm((current) => {
      const next: FormState = { ...current };
      const setStr = (k: keyof FormState, v: string | null | undefined) => {
        if (typeof v === "string" && v.trim().length > 0) {
          (next as Record<string, string>)[k as string] = v.trim();
          count += 1;
        }
      };
      setStr("name", p.name);
      setStr("one_liner", p.one_liner);
      setStr("problem", p.problem);
      setStr("target_customer", p.target_customer);
      setStr("why_now", p.why_now);
      setStr("pricing_model", p.pricing_model);
      setStr("go_to_market", p.go_to_market);
      setStr("unfair_advantage", p.unfair_advantage);
      setStr("website_url", p.website_url);
      setStr("founder_background", p.founder_background);
      setStr("constraints", p.constraints);

      if (Array.isArray(p.competitors) && p.competitors.length > 0) {
        const real = p.competitors.filter(
          (c) => c && c.trim() && c.trim().toLowerCase() !== "unknown",
        );
        if (real.length > 0) {
          next.competitors = real.join(", ");
          count += 1;
        }
      }
      if (p.stage === "idea" || p.stage === "mvp" || p.stage === "revenue") {
        next.stage = p.stage;
        count += 1;
      }
      return next;
    });
    return count;
  }

  return (
    <div className="space-y-6">
      <AutofillCard
        state={autofillState}
        error={autofillError}
        filledFieldCount={filledFieldCount}
        fileInputRef={fileInputRef}
        onChange={onAutofillFile}
      />

      <form action={createStartup} className="space-y-4">
        <Field
          id="name"
          label="Name"
          value={form.name}
          onChange={(v) => setField("name", v)}
          required
        />
        <Field
          id="one_liner"
          label="One-line idea"
          value={form.one_liner}
          onChange={(v) => setField("one_liner", v)}
          required
        />
        <Field
          id="problem"
          label="Problem being solved"
          value={form.problem}
          onChange={(v) => setField("problem", v)}
          required
        />
        <Field
          id="target_customer"
          label="Target customer"
          value={form.target_customer}
          onChange={(v) => setField("target_customer", v)}
          required
        />
        <Field
          id="why_now"
          label="Why now"
          value={form.why_now}
          onChange={(v) => setField("why_now", v)}
          required
        />
        <Field
          id="pricing_model"
          label="Pricing model"
          value={form.pricing_model}
          onChange={(v) => setField("pricing_model", v)}
          required
        />
        <Field
          id="go_to_market"
          label="Go-to-market strategy"
          value={form.go_to_market}
          onChange={(v) => setField("go_to_market", v)}
          required
        />
        <Field
          id="competitors"
          label="Known competitors (comma-separated)"
          value={form.competitors}
          onChange={(v) => setField("competitors", v)}
          placeholder="A, B, C"
        />
        <Field
          id="unfair_advantage"
          label="Unfair advantage / moat"
          value={form.unfair_advantage}
          onChange={(v) => setField("unfair_advantage", v)}
          required
        />

        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <select
            id="stage"
            name="stage"
            required
            value={form.stage}
            onChange={(e) => setField("stage", e.target.value as Stage)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="idea">Idea</option>
            <option value="mvp">MVP</option>
            <option value="revenue">Revenue</option>
          </select>
        </div>

        <Field
          id="website_url"
          label="Website URL (optional)"
          type="url"
          value={form.website_url}
          onChange={(v) => setField("website_url", v)}
        />
        <Field
          id="founder_background"
          label="Founder background (optional)"
          value={form.founder_background}
          onChange={(v) => setField("founder_background", v)}
        />
        <Field
          id="constraints"
          label="Constraints (optional)"
          value={form.constraints}
          onChange={(v) => setField("constraints", v)}
        />

        <div className="flex gap-2 pt-2">
          <Button type="submit">Save startup</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  required,
  type,
  placeholder,
}: {
  id: keyof FormState;
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        type={type}
        placeholder={placeholder}
      />
    </div>
  );
}

function AutofillCard({
  state,
  error,
  filledFieldCount,
  fileInputRef,
  onChange,
}: {
  state: "idle" | "uploading" | "parsing" | "filled" | "error";
  error: string | null;
  filledFieldCount: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const busy = state === "uploading" || state === "parsing";
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-sm">Auto-fill from a pitch doc</p>
          <p className="text-xs text-muted-foreground">
            Upload a PDF, TXT, or Markdown file. We&apos;ll extract the text
            and ask the LLM to populate the fields below. You can edit
            anything before saving.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
            className="hidden"
            id="autofill-file"
            onChange={onChange}
            disabled={busy}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {state === "uploading"
              ? "Uploading…"
              : state === "parsing"
                ? "Parsing with LLM…"
                : "Choose file"}
          </Button>
        </div>
      </div>

      {state === "filled" && (
        <p className="text-xs text-emerald-500">
          Auto-filled {filledFieldCount} field{filledFieldCount === 1 ? "" : "s"}.
          Review below and edit anything before saving.
        </p>
      )}
      {state === "error" && (
        <p className="text-xs text-destructive break-words">{error}</p>
      )}
    </div>
  );
}
