import { ANALYTICS } from "@/lib/analytics/events";

type EventName = (typeof ANALYTICS)[keyof typeof ANALYTICS];

/** Server-side analytics hook — extend with PostHog server SDK if needed. */
export async function captureServerEvent(
  event: EventName,
  props?: Record<string, unknown>,
): Promise<void> {
  if (process.env.NODE_ENV === "development") {
    console.info("[analytics]", event, props);
  }
}
