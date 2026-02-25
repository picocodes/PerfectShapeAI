import { describe, it, expect } from "vitest";

// Inline the pure logic from gamification service to test without Firestore
function calculateLevel(total: number) {
  return Math.floor(total / 500) + 1;
}

function updateStreak(
  xp: { streak_count: number; last_active_date?: string | null },
  activityDate: string
) {
  if (!xp.last_active_date) return 1;
  const prev = new Date(xp.last_active_date);
  const next = new Date(activityDate);
  const diff = Math.floor((next.getTime() - prev.getTime()) / 86400000);
  if (diff === 1) return xp.streak_count + 1;
  if (diff <= 0) return xp.streak_count;
  return 1;
}

describe("calculateLevel", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("levels up at 500 XP", () => {
    expect(calculateLevel(500)).toBe(2);
  });

  it("returns correct level for 1250 XP", () => {
    expect(calculateLevel(1250)).toBe(3);
  });
});

describe("updateStreak", () => {
  it("starts streak at 1 when no prior activity", () => {
    expect(updateStreak({ streak_count: 0, last_active_date: null }, "2024-01-10")).toBe(1);
  });

  it("increments streak for consecutive day", () => {
    const xp = { streak_count: 5, last_active_date: "2024-01-09" };
    expect(updateStreak(xp, "2024-01-10")).toBe(6);
  });

  it("resets streak after gap > 1 day", () => {
    const xp = { streak_count: 5, last_active_date: "2024-01-06" };
    expect(updateStreak(xp, "2024-01-10")).toBe(1);
  });

  it("does not change streak for same day activity", () => {
    const xp = { streak_count: 3, last_active_date: "2024-01-10" };
    expect(updateStreak(xp, "2024-01-10")).toBe(3);
  });
});
