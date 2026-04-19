"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { initPosthog } from "@/lib/analytics/posthog-client";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initPosthog();
  }, []);
  return (
    <>
      {children}
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </>
  );
}
