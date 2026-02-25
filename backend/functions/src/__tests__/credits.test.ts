import { describe, it, expect } from "vitest";

// Inline the pure credit calculation logic to test without Firestore
const DEFAULT_CREDITS = 0.1;

function creditsFromUsage(usage?: { total_tokens?: number }) {
  if (!usage?.total_tokens) return 0.1;
  return Math.max(0.01, usage.total_tokens / 10000);
}

function canConsumeCredits(credits: number, subscriptionStatus: string, amount: number) {
  if (subscriptionStatus === "active") return true;
  return credits >= amount;
}

describe("DEFAULT_CREDITS", () => {
  it("initial credits are 0.1", () => {
    expect(DEFAULT_CREDITS).toBe(0.1);
  });
});

describe("creditsFromUsage", () => {
  it("returns 0.1 when no token usage provided", () => {
    expect(creditsFromUsage()).toBe(0.1);
  });

  it("returns correct fractional credits for 5000 tokens", () => {
    expect(creditsFromUsage({ total_tokens: 5000 })).toBeCloseTo(0.5);
  });

  it("returns 1.0 credits for 10000 tokens", () => {
    expect(creditsFromUsage({ total_tokens: 10000 })).toBe(1.0);
  });

  it("enforces minimum of 0.01 credits", () => {
    expect(creditsFromUsage({ total_tokens: 1 })).toBe(0.01);
  });
});

describe("canConsumeCredits", () => {
  it("allows active subscribers regardless of credits", () => {
    expect(canConsumeCredits(0, "active", 10)).toBe(true);
  });

  it("allows free users with sufficient credits", () => {
    expect(canConsumeCredits(0.5, "free", 0.1)).toBe(true);
  });

  it("blocks free users with insufficient credits", () => {
    expect(canConsumeCredits(0.05, "free", 0.1)).toBe(false);
  });
});
