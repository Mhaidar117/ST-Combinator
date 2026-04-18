/** Optional Sentry wiring — log server-side until DSN integration is added. */
export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    console.error("[sentry]", context, error);
  }
}
