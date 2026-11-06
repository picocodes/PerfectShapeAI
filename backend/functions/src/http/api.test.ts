import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { AiClient } from "../ai/gateway.js";
import type { PlaySubscription } from "../domain/iap.js";
import { AppleJwsVerifier } from "../iap/apple.js";
import type { GoogleVerifier } from "../iap/google.js";
import { MemoryStore } from "../store/memory.js";
import type { QuotaDoc } from "../store/docs.js";
import { makeTestPki } from "../testing/pki.js";
import { devAuthVerifier } from "./auth.js";
import { createApp } from "./createApp.js";
import { SlidingWindowLimiter } from "./limiter.js";

const DATE = "2026-11-06";
const INSTALL = "11111111-1111-4111-8111-111111111111";
const INSTALL_B = "22222222-2222-4222-8222-222222222222";

const profile = {
  name: "Ada",
  age: 32,
  gender: "female",
  height_cm: 168,
  current_weight_kg: 82,
  target_weight_kg: 72,
  activity_level: "light",
  country: "Nigeria",
  dietary_preferences: ["none"],
  equipment: ["none"],
  daily_minutes: 30,
  disclaimer_accepted: true,
  timezone: "Africa/Lagos",
  local_date: DATE
};

describe("HTTP API", () => {
  let pki: ReturnType<typeof makeTestPki>;

  beforeAll(() => {
    pki = makeTestPki();
  });

  function harness(limit = 50) {
    const store = new MemoryStore();
    let now = new Date("2026-11-06T15:00:00.000Z");
    const deleted: string[] = [];
    const ai: AiClient & { configured: boolean } = {
      configured: false,
      async chat() {
        return { text: "Steady and kind. Keep the next meal honest.", inputTokens: 11, outputTokens: 7 };
      }
    };
    let play: PlaySubscription = {
      subscriptionState: "SUBSCRIPTION_STATE_ACTIVE",
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED",
      lineItems: [{ productId: "perfectshape_plus_monthly", expiryTime: "2027-02-01T00:00:00.000Z" }]
    };
    const google: GoogleVerifier = {
      async verifyToken() {
        return play;
      },
      async acknowledge() {
        return undefined;
      }
    };
    const app = createApp({
      store,
      now: () => now,
      ai,
      apple: new AppleJwsVerifier([pki.rootPem], "com.perfectshapeai.app"),
      google,
      identity: {
        async deleteUser(uid: string) {
          deleted.push(uid);
        }
      },
      bundleId: "com.perfectshapeai.app",
      auth: devAuthVerifier(),
      limiter: new SlidingWindowLimiter(limit, 60 * 60 * 1000, () => now.getTime())
    });
    return {
      app,
      store,
      ai,
      deleted,
      setNow(value: Date) {
        now = value;
      },
      setPlay(value: PlaySubscription) {
        play = value;
      }
    };
  }

  const auth = (uid = "ada_1", email = "ada@example.com") => `Bearer dev:${uid}:${email}`;

  async function onboard(app: ReturnType<typeof harness>["app"], uid = "ada_1", body: Record<string, unknown> = profile) {
    await request(app).post("/v1/session").set("authorization", auth(uid)).expect(200);
    const saved = await request(app).put("/v1/me").set("authorization", auth(uid)).send(body);
    expect(saved.status).toBe(200);
    return saved.body.user;
  }

  function signed(overrides: Record<string, unknown> = {}) {
    return pki.sign({
      transactionId: "tx-1",
      originalTransactionId: "orig-1",
      bundleId: "com.perfectshapeai.app",
      productId: "perfectshape_plus_yearly",
      purchaseDate: Date.parse("2026-11-01T00:00:00Z"),
      expiresDate: Date.parse("2027-11-01T00:00:00Z"),
      type: "Auto-Renewable Subscription",
      environment: "Sandbox",
      inAppOwnershipType: "PURCHASED",
      ...overrides
    });
  }

  it("answers health without a token and rejects anonymous API calls", async () => {
    const { app } = harness();
    await request(app).get("/health").expect(200);
    const denied = await request(app).get("/v1/me");
    expect(denied.status).toBe(401);
  });

  it("onboards into a safe calorie target and a real home plan", async () => {
    const { app } = harness();
    const user = await onboard(app);
    expect(user.onboarding_complete).toBe(true);
    expect(user.water_reminders).toBe(false);
    expect(user.streak_reminders).toBe(true);
    expect(user.start_weight_kg).toBe(82);

    const today = await request(app).get("/v1/today").query({ date: DATE }).set("authorization", auth()).expect(200);
    expect(today.body.profile_complete).toBe(true);
    expect(today.body.calorie_target).toBeGreaterThanOrEqual(1400);
    expect(today.body.day.exercises.length).toBeGreaterThan(3);
    expect(JSON.stringify(today.body.day)).not.toMatch(/dumbbell|band|rope/i);
    expect(today.body.suggestions.some((meal: { name: string }) => /jollof|plantain|beans|suya|moi moi/i.test(meal.name))).toBe(true);
    expect(today.body.disclaimer).toMatch(/not a medical/i);
    expect(today.body.gamification.streak_count).toBe(1);
    expect(today.body.gamification.total_xp).toBe(15);
    expect(today.body.entitlement.premium).toBe(false);
    expect(today.body.entitlement.coach_limit).toBe(3);
  });

  it("refuses underage profiles, weight-gain targets, client XP, and old dates", async () => {
    const { app } = harness();
    await request(app).post("/v1/session").set("authorization", auth()).expect(200);
    const young = await request(app).put("/v1/me").set("authorization", auth()).send({ ...profile, age: 15 });
    expect(young.status).toBe(400);
    const gain = await request(app).put("/v1/me").set("authorization", auth()).send({ ...profile, target_weight_kg: 90 });
    expect(gain.status).toBe(400);
    expect(gain.body.error).toBe("target_direction");
    await onboard(app);
    const cheated = await request(app)
      .post("/v1/workouts/complete")
      .set("authorization", auth())
      .send({ local_date: DATE, workout_id: "x", duration_sec: 10, xp: 99999 });
    expect(cheated.status).toBe(400);
    expect(cheated.body.error).toBe("invalid_body");
    const old = await request(app).post("/v1/mood").set("authorization", auth()).send({ local_date: "2020-01-01", mood: 3 });
    expect(old.status).toBe(400);
  });

  it("awards workout XP on the server and keeps a low-BMI plan at maintenance", async () => {
    const { app } = harness();
    await onboard(app, "ada_1", {
      ...profile,
      height_cm: 175,
      current_weight_kg: 48,
      target_weight_kg: 47
    });
    const today = await request(app).get("/v1/today").query({ date: DATE }).set("authorization", auth()).expect(200);
    expect(today.body.caution).toMatch(/clinician/i);
    expect(today.body.calorie_target).toBeGreaterThanOrEqual(1400);
    const done = await request(app).post("/v1/workouts/complete").set("authorization", auth()).send({
      local_date: DATE,
      workout_id: today.body.day.id,
      duration_sec: 400
    });
    expect(done.status).toBe(200);
    expect(done.body.xp_gained).toBe(40);
    expect(done.body.gamification.total_xp).toBe(55);
    expect(done.body.achievements_unlocked.map((item: { id: string }) => item.id)).toContain("first_session");
    const again = await request(app).post("/v1/workouts/complete").set("authorization", auth()).send({
      local_date: DATE,
      workout_id: today.body.day.id,
      duration_sec: 400
    });
    expect(again.body.already_completed).toBe(true);
    expect(again.body.gamification.total_xp).toBe(55);
    const unknown = await request(app)
      .post("/v1/workouts/complete")
      .set("authorization", auth())
      .send({ local_date: DATE, workout_id: "not-a-session", duration_sec: 100 });
    expect(unknown.status).toBe(400);
  });

  it("pays the calorie bonus only for an honest day and caps meal XP", async () => {
    const { app } = harness();
    await onboard(app);
    const today = await request(app).get("/v1/today").query({ date: DATE }).set("authorization", auth());
    const target = today.body.calorie_target as number;
    const tiny = await request(app).post("/v1/meals").set("authorization", auth()).send({
      local_date: DATE,
      name: "Tea",
      calories: 20,
      no_sugar: true
    });
    expect(tiny.body.xp_gained).toBe(15);
    const second = await request(app).post("/v1/meals").set("authorization", auth()).send({
      local_date: DATE,
      name: "Tea again",
      calories: 20,
      no_sugar: true
    });
    expect(second.body.xp_gained).toBe(15);
    const half = Math.round(target * 0.3);
    const real = await request(app).post("/v1/meals").set("authorization", auth()).send({
      local_date: DATE,
      name: "Beans and plantain",
      calories: half,
      no_sugar: true
    });
    const other = await request(app).post("/v1/meals").set("authorization", auth()).send({
      local_date: DATE,
      name: "Jollof and chicken",
      calories: half,
      no_sugar: true
    });
    const gained = [real.body.xp_gained, other.body.xp_gained] as number[];
    expect(gained.reduce((sum, value) => sum + value, 0)).toBe(15 + 25);
    const extra = await request(app).post("/v1/meals").set("authorization", auth()).send({
      local_date: DATE,
      name: "Orange",
      calories: 80,
      no_sugar: true
    });
    expect(extra.body.xp_gained).toBe(0);
  });

  it("uses grace for one missed day and a light XP penalty after a longer gap", async () => {
    const box = harness();
    await onboard(box.app);
    box.setNow(new Date("2026-11-08T15:00:00.000Z"));
    const today = await request(box.app).get("/v1/today").query({ date: "2026-11-08" }).set("authorization", auth());
    const saved = await request(box.app).post("/v1/workouts/complete").set("authorization", auth()).send({
      local_date: "2026-11-08",
      workout_id: today.body.day.id,
      duration_sec: 500
    });
    expect(saved.body.grace_used).toBe(true);
    expect(saved.body.penalty_xp).toBe(0);
    expect(saved.body.gamification.streak_count).toBe(1);

    box.setNow(new Date("2026-11-11T15:00:00.000Z"));
    const later = await request(box.app).get("/v1/today").query({ date: "2026-11-11" }).set("authorization", auth());
    const broken = await request(box.app).post("/v1/workouts/complete").set("authorization", auth()).send({
      local_date: "2026-11-11",
      workout_id: later.body.day.id,
      duration_sec: 500
    });
    expect(broken.body.streak_reset).toBe(true);
    expect(broken.body.penalty_xp).toBeGreaterThan(0);
    expect(broken.body.gamification.level).toBe(1);
    expect(broken.body.gamification.streak_count).toBe(1);
    expect(broken.body.gamification.total_xp).toBeGreaterThan(0);
  });

  it("does not let mood alone extend a streak, and unlocks 2 kg plus an 8k day", async () => {
    const box = harness();
    await onboard(box.app);
    box.setNow(new Date("2026-11-07T15:00:00.000Z"));
    const mood = await request(box.app).post("/v1/mood").set("authorization", auth()).send({ local_date: "2026-11-07", mood: 2 });
    expect(mood.body.xp_gained).toBe(5);
    expect(mood.body.gamification.streak_count).toBe(1);
    expect(mood.body.gamification.streak_at_risk).toBe(true);

    const quiet = await request(box.app).post("/v1/steps").set("authorization", auth()).send({ local_date: "2026-11-07", steps: 1000 });
    expect(quiet.body.xp_gained).toBe(0);
    const walked = await request(box.app).post("/v1/steps").set("authorization", auth()).send({ local_date: "2026-11-07", steps: 8000 });
    expect(walked.body.xp_gained).toBe(15 + 10);
    expect(walked.body.achievements_unlocked.map((item: { id: string }) => item.id)).toContain("steps_8k");
    expect(walked.body.gamification.streak_count).toBe(2);

    box.setNow(new Date("2026-11-07T16:00:00.000Z"));
    await request(box.app).post("/v1/weight").set("authorization", auth()).send({ local_date: "2026-11-07", weight_kg: 79.5 });
    const game = await request(box.app).get("/v1/gamification").query({ date: "2026-11-07" }).set("authorization", auth());
    expect(game.body.achievements.some((item: { id: string; unlocked_at: string | null }) => item.id === "first_2kg" && item.unlocked_at)).toBe(
      true
    );
  });

  it("keeps a no-sugar week and a 7-day streak honest", async () => {
    const box = harness();
    let cursor = new Date("2026-11-01T12:00:00.000Z");
    box.setNow(cursor);
    await request(box.app).post("/v1/session").set("authorization", auth("streak_user")).expect(200);
    await request(box.app)
      .put("/v1/me")
      .set("authorization", auth("streak_user"))
      .send({ ...profile, local_date: "2026-11-01" })
      .expect(200);
    for (let day = 0; day < 7; day += 1) {
      cursor = new Date(Date.parse("2026-11-01T12:00:00.000Z") + day * 86_400_000);
      box.setNow(cursor);
      const date = cursor.toISOString().slice(0, 10);
      await request(box.app)
        .post("/v1/meals")
        .set("authorization", auth("streak_user"))
        .send({ local_date: date, name: "Beans", calories: 500, no_sugar: true })
        .expect(200);
    }
    const game = await request(box.app).get("/v1/gamification").query({ date: "2026-11-07" }).set("authorization", auth("streak_user"));
    const unlocked = game.body.achievements.filter((item: { unlocked_at: string | null }) => item.unlocked_at).map((item: { id: string }) => item.id);
    expect(unlocked).toEqual(expect.arrayContaining(["streak_7", "no_sugar_week"]));
  });

  it("serves a fallback coach without burning the free quota, and stops crisis text", async () => {
    const box = harness();
    await onboard(box.app);
    const coach = await request(box.app)
      .post("/v1/ai/coach")
      .set("authorization", auth())
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, message: "I feel hungry" });
    expect(coach.status).toBe(200);
    expect(coach.body.source).toBe("fallback");
    expect(coach.body.reply.toLowerCase()).toMatch(/snack|hungry/);
    expect(coach.body.entitlement.coach_remaining).toBe(3);
    expect(coach.body.disclaimer).toMatch(/not a medical/i);

    let calls = 0;
    box.ai.configured = true;
    box.ai.chat = async () => {
      calls += 1;
      return { text: "nope", inputTokens: 1, outputTokens: 1 };
    };
    const crisis = await request(box.app)
      .post("/v1/ai/coach")
      .set("authorization", auth())
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, message: "I want to die" });
    expect(crisis.body.source).toBe("crisis");
    expect(crisis.body.reply).toMatch(/988/);
    expect(calls).toBe(0);
    const history = await request(box.app).get("/v1/coach/history").set("authorization", auth());
    expect(JSON.stringify(history.body)).not.toMatch(/want to die/i);
  });

  it("enforces the free coach cap per account and per install, then lets Plus through", async () => {
    const box = harness();
    await onboard(box.app, "ada_1");
    await onboard(box.app, "bola_2", { ...profile, name: "Bola" });
    box.ai.configured = true;
    box.ai.chat = async () => ({ text: "Nice work. One more honest meal.", inputTokens: 4, outputTokens: 5 });
    for (let count = 0; count < 3; count += 1) {
      const ok = await request(box.app)
        .post("/v1/ai/coach")
        .set("authorization", auth("ada_1"))
        .set("x-install-id", INSTALL)
        .send({ local_date: DATE, message: `Note ${count}` });
      expect(ok.status).toBe(200);
      expect(ok.body.source).toBe("cloud");
    }
    const blocked = await request(box.app)
      .post("/v1/ai/coach")
      .set("authorization", auth("ada_1"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, message: "One more" });
    expect(blocked.status).toBe(402);
    expect(blocked.body.error).toBe("quota_exceeded");

    const shared = await request(box.app)
      .post("/v1/ai/coach")
      .set("authorization", auth("bola_2"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, message: "New account same phone" });
    expect(shared.status).toBe(402);

    box.ai.chat = async () => ({ text: "You should starve today.", inputTokens: 2, outputTokens: 2 });
    const unsafe = await request(box.app)
      .post("/v1/ai/coach")
      .set("authorization", auth("bola_2"))
      .set("x-install-id", INSTALL_B)
      .send({ local_date: DATE, message: "Be harsh" });
    expect(unsafe.body.source).toBe("fallback");
    expect(unsafe.body.reply).not.toMatch(/starve/i);

    const plus = await request(box.app)
      .post("/v1/subscription/apple")
      .set("authorization", auth("ada_1"))
      .send({ signed_transaction: signed({ originalTransactionId: "orig-ada", transactionId: "tx-ada" }) });
    expect(plus.status).toBe(200);
    expect(plus.body.premium).toBe(true);
    expect(plus.body.product_id).toBe("perfectshape_plus_yearly");
    const after = await request(box.app)
      .post("/v1/ai/coach")
      .set("authorization", auth("ada_1"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, message: "Now with Plus" });
    expect(after.status).toBe(200);
    const quota = await box.store.get<QuotaDoc>("ai_quota", `uid:ada_1:${DATE}`);
    expect(quota?.tokens_in).toBeGreaterThan(0);
  });

  it("gates photo analysis and clamps plan edits, and will not share a receipt", async () => {
    const box = harness();
    await onboard(box.app, "ada_1");
    await onboard(box.app, "bola_2", { ...profile, name: "Bola" });
    const photoDenied = await request(box.app)
      .post("/v1/ai/meal-photo")
      .set("authorization", auth("ada_1"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, image_base64: "aaaaaaaa", media_type: "image/jpeg" });
    expect(photoDenied.status).toBe(402);
    const adjustDenied = await request(box.app)
      .post("/v1/ai/adjust-plan")
      .set("authorization", auth("ada_1"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, feedback: "too easy" });
    expect(adjustDenied.status).toBe(402);

    const receipt = signed({ originalTransactionId: "shared-orig", transactionId: "shared-tx" });
    await request(box.app).post("/v1/subscription/apple").set("authorization", auth("ada_1")).send({ signed_transaction: receipt }).expect(200);
    const stolen = await request(box.app).post("/v1/subscription/apple").set("authorization", auth("bola_2")).send({ signed_transaction: receipt });
    expect(stolen.status).toBe(409);

    box.ai.configured = true;
    box.ai.chat = async (input) => {
      if (input.imageDataUrl) return { text: '{"is_food":true,"name":"Jollof","calories":9000,"note":"rough"}', inputTokens: 8, outputTokens: 4 };
      return { text: '{"summary":"Cut hard","calorie_delta":-800}', inputTokens: 6, outputTokens: 4 };
    };
    const before = await request(box.app).get("/v1/plan").query({ date: DATE }).set("authorization", auth("ada_1"));
    const adjusted = await request(box.app)
      .post("/v1/ai/adjust-plan")
      .set("authorization", auth("ada_1"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, feedback: "too easy" });
    expect(adjusted.status).toBe(200);
    expect(before.body.plan.calorie_target - adjusted.body.calorie_target).toBe(150);
    expect(adjusted.body.calorie_target).toBeGreaterThanOrEqual(1400);

    const photo = await request(box.app)
      .post("/v1/ai/meal-photo")
      .set("authorization", auth("ada_1"))
      .set("x-install-id", INSTALL)
      .send({ local_date: DATE, image_base64: "aaaaaaaa", media_type: "image/jpeg" });
    expect(photo.body.calories).toBe(2000);
    expect(photo.body.disclaimer).toMatch(/not a medical/i);

    const expired = await request(box.app)
      .post("/v1/subscription/apple")
      .set("authorization", auth("bola_2"))
      .send({ signed_transaction: signed({ originalTransactionId: "old", transactionId: "old-tx", expiresDate: Date.parse("2020-01-01T00:00:00Z") }) });
    expect(expired.status).toBe(400);

    box.setPlay({
      subscriptionState: "SUBSCRIPTION_STATE_EXPIRED",
      lineItems: [{ productId: "perfectshape_plus_monthly", expiryTime: "2020-01-01T00:00:00.000Z" }]
    });
    const googleDenied = await request(box.app)
      .post("/v1/subscription/google")
      .set("authorization", auth("bola_2"))
      .send({ purchase_token: "token-expired", product_id: "perfectshape_plus_monthly" });
    expect(googleDenied.status).toBe(400);

    box.setPlay({
      subscriptionState: "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
      lineItems: [{ productId: "perfectshape_plus_monthly", expiryTime: "2027-03-01T00:00:00.000Z" }]
    });
    const googleOk = await request(box.app)
      .post("/v1/subscription/google")
      .set("authorization", auth("bola_2"))
      .send({ purchase_token: "token-grace", product_id: "some-client-hint" });
    expect(googleOk.status).toBe(200);
    expect(googleOk.body.premium).toBe(true);
    expect(googleOk.body.platform).toBe("google");
    expect(googleOk.body.product_id).toBe("perfectshape_plus_monthly");
  });

  it("releases a receipt when the account is deleted and rate limits the coach", async () => {
    const box = harness(2);
    await onboard(box.app, "ada_1");
    const receipt = signed({ originalTransactionId: "delete-me", transactionId: "delete-tx" });
    await request(box.app).post("/v1/subscription/apple").set("authorization", auth("ada_1")).send({ signed_transaction: receipt }).expect(200);
    const missing = await request(box.app).delete("/v1/me").set("authorization", auth("ada_1")).send({ confirm: "no" });
    expect(missing.status).toBe(400);
    await request(box.app).delete("/v1/me").set("authorization", auth("ada_1")).send({ confirm: "DELETE" }).expect(200);
    expect(box.deleted).toEqual(["ada_1"]);
    await onboard(box.app, "bola_2", { ...profile, name: "Bola" });
    const moved = await request(box.app).post("/v1/subscription/apple").set("authorization", auth("bola_2")).send({ signed_transaction: receipt });
    expect(moved.status).toBe(200);
    expect(moved.body.premium).toBe(true);

    const first = await request(box.app).post("/v1/ai/coach").set("authorization", auth("bola_2")).set("x-install-id", INSTALL_B).send({
      local_date: DATE,
      message: "Hi"
    });
    const second = await request(box.app).post("/v1/ai/coach").set("authorization", auth("bola_2")).set("x-install-id", INSTALL_B).send({
      local_date: DATE,
      message: "Hi again"
    });
    const third = await request(box.app).post("/v1/ai/coach").set("authorization", auth("bola_2")).set("x-install-id", INSTALL_B).send({
      local_date: DATE,
      message: "Stop"
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
  });

  it("swaps in a gentler session and rotates next week's variant", async () => {
    const { app } = harness();
    await onboard(app);
    const gentle = await request(app).post("/v1/plan/gentler").set("authorization", auth()).send({ local_date: DATE }).expect(200);
    expect(gentle.body.day.id).toBe("gentler");
    await request(app)
      .post("/v1/workouts/complete")
      .set("authorization", auth())
      .send({ local_date: DATE, workout_id: "gentler", duration_sec: 300 })
      .expect(200);
    const rotated = await request(app).post("/v1/plan/regenerate").set("authorization", auth()).send({ local_date: DATE }).expect(200);
    expect(rotated.body.plan.variant).toBe(1);
    const water = await request(app).post("/v1/water").set("authorization", auth()).send({ local_date: DATE, ml: 1000 });
    expect(water.body.xp_gained).toBe(0);
    const done = await request(app).post("/v1/water").set("authorization", auth()).send({ local_date: DATE, ml: 1000 });
    expect(done.body.water_ml).toBe(2000);
    expect(done.body.xp_gained).toBe(10);
  });
});
