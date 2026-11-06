import { describe, expect, it } from "vitest";
import { interpretFeedback, parseCalorieDelta, parseMealPhoto } from "./aiParse.js";
import { dateAllowed, daysBetween, isoWeekId } from "./dates.js";
import { featureAllowed, isPremiumActive, themeAllowed } from "./entitlements.js";
import { suggestMeals } from "./foods.js";
import { entitlementFromAppleClaims, entitlementFromPlay } from "./iap.js";
import { dailyChallenge } from "./insights.js";
import { clampCalorieAdjustment, planCalories, scaleEstimate } from "./nutrition.js";
import { buildWeek } from "./plans.js";
import { COACH_SYSTEM_PROMPT, crisisReply, replyLooksUnsafe } from "./safety.js";
import { freshXpState, noSugarRun, projectStreak, reduceDailyAward, XP_AWARDS } from "./xp.js";
import { shiftDate } from "./dates.js";

describe("calorie safety", () => {
  it("keeps a small person at or above the floor", () => {
    const plan = planCalories({
      gender: "female",
      age: 25,
      height_cm: 150,
      weight_kg: 45,
      target_weight_kg: 44,
      activity_level: "sedentary"
    });
    expect(plan.target).toBeGreaterThanOrEqual(1400);
    expect(plan.target).toBeGreaterThanOrEqual(plan.floor);
  });

  it("does not prescribe a deficit under a low BMI and asks for a clinician", () => {
    const plan = planCalories({
      gender: "female",
      age: 25,
      height_cm: 175,
      weight_kg: 45,
      target_weight_kg: 44,
      activity_level: "light"
    });
    expect(plan.bmi).toBeLessThan(18.5);
    expect(plan.deficit).toBe(0);
    expect(plan.caution).toMatch(/clinician/i);
    expect(plan.target).toBeGreaterThanOrEqual(1400);
  });

  it("caps an AI calorie change at 150 kcal and the floor", () => {
    expect(clampCalorieAdjustment(2000, 1000, 1400)).toBe(1850);
    expect(clampCalorieAdjustment(1450, 1000, 1400)).toBe(1400);
    expect(clampCalorieAdjustment(1800, 2400, 1400)).toBe(1950);
  });
});

describe("streaks and xp", () => {
  it("starts a streak and never lets a penalty drop a level", () => {
    const first = reduceDailyAward(freshXpState(), [], "2026-11-06", "weight", XP_AWARDS.weight, true, daysBetween);
    expect(first.xp.streak_count).toBe(1);
    expect(first.xp.total_xp).toBe(XP_AWARDS.weight + 5);
    expect(first.xp.level).toBe(1);

    const rich = {
      ...freshXpState(),
      total_xp: 520,
      level: 2,
      streak_count: 4,
      last_active_date: "2026-11-01",
      grace_tokens: 0,
      best_streak: 4
    };
    const broken = reduceDailyAward(rich, [], "2026-11-05", "workout", 40, true, daysBetween, { countWorkout: true });
    expect(broken.streak_reset).toBe(true);
    expect(broken.penalty_xp).toBe(20);
    expect(broken.xp.level).toBe(2);
    expect(broken.xp.total_xp).toBe(545);
    expect(broken.xp.workouts_completed).toBe(1);
  });

  it("spends one grace day for a single miss and refills at day 7", () => {
    const held = reduceDailyAward(
      { ...freshXpState(), streak_count: 3, last_active_date: "2026-11-01", grace_tokens: 1, best_streak: 3 },
      [],
      "2026-11-03",
      "workout",
      40,
      true,
      daysBetween
    );
    expect(held.grace_used).toBe(true);
    expect(held.xp.streak_count).toBe(3);
    expect(held.xp.grace_tokens).toBe(0);
    expect(held.penalty_xp).toBe(0);

    const week = reduceDailyAward(
      { ...freshXpState(), streak_count: 6, last_active_date: "2026-11-06", grace_tokens: 0, best_streak: 6, total_xp: 100 },
      [],
      "2026-11-07",
      "meal_1",
      15,
      true,
      daysBetween
    );
    expect(week.xp.streak_count).toBe(7);
    expect(week.xp.grace_tokens).toBe(1);
    expect(week.gained).toBe(15 + 35);
  });

  it("does not move the streak when the event is not a check-in", () => {
    const mood = reduceDailyAward(freshXpState(), [], "2026-11-06", "mood", 5, false, daysBetween);
    expect(mood.xp.streak_count).toBe(0);
    expect(mood.xp.last_active_date).toBeNull();
    expect(mood.xp.total_xp).toBe(5);
  });

  it("projects an at-risk streak without writing it", () => {
    const state = { ...freshXpState(), streak_count: 4, last_active_date: "2026-11-05", grace_tokens: 1 };
    expect(projectStreak(state, "2026-11-06", daysBetween).at_risk).toBe(true);
    expect(projectStreak(state, "2026-11-06", daysBetween).streak_count).toBe(4);
    expect(projectStreak({ ...state, grace_tokens: 0, last_active_date: "2026-11-03" }, "2026-11-06", daysBetween).pending_reset).toBe(
      true
    );
  });

  it("counts a no-sugar run only on fully clean days", () => {
    const days = [0, 1, 2].map((offset) => ({
      date: shiftDate("2026-11-06", -offset),
      meals: [{ no_sugar: true }]
    }));
    days.push({ date: "2026-11-02", meals: [{ no_sugar: false }] });
    expect(noSugarRun(days, "2026-11-06", shiftDate)).toBe(3);
  });
});

describe("plans, meals, and entitlements", () => {
  it("builds a home plan without equipment the user does not own", () => {
    const days = buildWeek({ weekId: "2026-W45", variant: 0, minutes: 15, equipment: ["none"] });
    expect(days).toHaveLength(7);
    const names = days.flatMap((day) => day.exercises.map((exercise) => exercise.name));
    expect(names.join(" ")).not.toMatch(/dumbbell|band|rope/i);
    expect(days.reduce((sum, day) => sum + day.exercises.length, 0)).toBeGreaterThan(20);
  });

  it("filters local meals by diet", () => {
    const meals = suggestMeals("Nigeria", ["none"]);
    expect(meals.some((meal) => /jollof|plantain|beans|suya|moi moi/i.test(meal.name))).toBe(true);
    const strict = suggestMeals("US", ["vegan", "keto"]);
    expect(strict.every((meal) => meal.diets.includes("vegan") && meal.diets.includes("keto"))).toBe(true);
  });

  it("treats a canceled subscription as paid until it expires", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(isPremiumActive({ status: "canceled", product_id: "perfectshape_plus_monthly", expires_at: future }, new Date())).toBe(true);
    expect(isPremiumActive({ status: "active", product_id: "perfectshape_plus_monthly", expires_at: "2020-01-01T00:00:00Z" }, new Date())).toBe(
      false
    );
    expect(featureAllowed("meal_photo", false, 0).code).toBe("premium_required");
    expect(featureAllowed("coach", false, 3).allowed).toBe(false);
    expect(featureAllowed("coach", false, 2).remaining).toBe(1);
    expect(themeAllowed("dawn", false)).toBe(true);
    expect(themeAllowed("summit", false)).toBe(false);
    expect(themeAllowed("summit", true)).toBe(true);
  });

  it("maps Apple and Play purchases without trusting a client premium flag", () => {
    const now = new Date("2026-11-06T00:00:00Z");
    const apple = entitlementFromAppleClaims(
      {
        productId: "perfectshape_plus_monthly",
        bundleId: "com.perfectshapeai.app",
        expiresDate: Date.parse("2027-01-01T00:00:00Z"),
        originalTransactionId: "orig",
        transactionId: "tx",
        type: "Auto-Renewable Subscription",
        inAppOwnershipType: "PURCHASED"
      },
      "com.perfectshapeai.app",
      now
    );
    expect(apple.ok).toBe(true);
    expect(entitlementFromAppleClaims({ productId: "coins", bundleId: "com.perfectshapeai.app", expiresDate: Date.parse("2027-01-01") }, "com.perfectshapeai.app", now).ok).toBe(
      false
    );

    expect(
      entitlementFromPlay(
        {
          subscriptionState: "SUBSCRIPTION_STATE_CANCELED",
          lineItems: [{ productId: "perfectshape_plus_yearly", expiryTime: "2027-01-01T00:00:00Z" }]
        },
        now
      ).ok
    ).toBe(true);
    const paused = entitlementFromPlay(
      {
        subscriptionState: "SUBSCRIPTION_STATE_PAUSED",
        acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
        lineItems: [{ productId: "perfectshape_plus_monthly", expiryTime: "2027-01-01T00:00:00Z" }]
      },
      now
    );
    expect(paused.ok).toBe(false);
  });
});

describe("coach safety", () => {
  it("keeps the system prompt inside the product rules", () => {
    expect(COACH_SYSTEM_PROMPT).toContain("certified home fitness and nutrition coach");
    expect(COACH_SYSTEM_PROMPT).toMatch(/100-150 kcal/);
    expect(crisisReply("I want to die")).toMatch(/988/);
    expect(crisisReply("what should I eat")).toBeNull();
    expect(replyLooksUnsafe("Try to starve for two days")).toBe(true);
    expect(replyLooksUnsafe("Have a snack and a short walk")).toBe(false);
  });

  it("clamps model JSON before it can reach the member", () => {
    expect(parseCalorieDelta('{"summary":"cut","calorie_delta":-800}')?.delta).toBe(-150);
    expect(interpretFeedback("I am too hungry").delta).toBe(100);
    expect(parseMealPhoto('{"is_food":true,"name":"Rice","calories":9000,"note":"x"}').calories).toBe(2000);
    expect(parseMealPhoto('{"is_food":false}').is_food).toBe(false);
  });

  it("rejects backfilled dates and estimates fat loss as a range", () => {
    expect(dateAllowed("2026-11-06", new Date("2026-11-06T23:00:00Z"))).toBe(true);
    expect(dateAllowed("2026-10-01", new Date("2026-11-06T23:00:00Z"))).toBe(false);
    expect(isoWeekId("2026-11-06")).toMatch(/^2026-W/);
    const estimate = scaleEstimate(82, 79.4);
    expect(estimate.delta_kg).toBeLessThan(0);
    expect(estimate.fat_low_kg).toBeLessThan(estimate.fat_high_kg!);
    expect(estimate.note).toMatch(/not a body-fat/i);
  });

  it("marks the daily challenge done only when the log supports it", () => {
    const challenge = dailyChallenge("2026-11-06", { workout_completed: false, steps: 100, meals: 0, no_sugar_meals: 0 });
    expect(["burn", "soda", "steps"]).toContain(challenge.id);
    expect(challenge.done).toBe(false);
  });
});
