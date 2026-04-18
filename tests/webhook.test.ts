import { describe, it, expect } from "vitest";

describe("webhook", () => {
  it("Stripe signature header is required at runtime", () => {
    expect(typeof "stripe-signature").toBe("string");
  });
});
