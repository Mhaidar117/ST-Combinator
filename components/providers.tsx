"use client";

import { useEffect } from "react";
import { initPosthog } from "@/lib/analytics/posthog-client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPosthog();
  }, []);
  return <>{children}</>;
}
