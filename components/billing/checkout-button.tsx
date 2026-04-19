"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CheckoutButton() {
  function onClick() {
    toast.error("Pro not available at this time");
  }

  return (
    <div className="space-y-2">
      <Button type="button" className="w-full" onClick={onClick}>
        Upgrade with Stripe
      </Button>
    </div>
  );
}
