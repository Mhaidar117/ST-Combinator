"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST" });
      const text = await r.text();
      let j: { url?: string; error?: string } = {};
      try {
        j = text ? JSON.parse(text) : {};
      } catch {
        // Non-JSON body (typically an empty 500 from the framework).
      }
      if (r.ok && j.url) {
        window.location.href = j.url;
        return;
      }
      setError(
        j.error ??
          (r.status === 503
            ? "Stripe isn't configured in this environment yet."
            : `Checkout failed (HTTP ${r.status}).`),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        onClick={onClick}
        disabled={loading}
      >
        {loading ? "Redirecting…" : "Upgrade with Stripe"}
      </Button>
      {error && (
        <p className="text-xs text-destructive break-words">{error}</p>
      )}
    </div>
  );
}
