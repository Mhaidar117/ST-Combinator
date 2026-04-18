"use client";

import posthog from "posthog-js";

export function initPosthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  if (!key || typeof window === "undefined") return;
  posthog.init(key, {
    api_host: host,
    person_profiles: "identified_only",
  });
}

export function captureEvent(
  event: string,
  props?: Record<string, unknown>,
) {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  posthog.capture(event, props);
}
