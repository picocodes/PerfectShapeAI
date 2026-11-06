import { createHash, randomUUID } from "node:crypto";
import type { AiClient } from "../ai/gateway.js";
import { interpretFeedback, parseCalorieDelta, parseMealPhoto } from "../domain/aiParse.js";
import { dateAllowed, daysBetween, isoWeekId, isDateString, shiftDate } from "../domain/dates.js";
import {
  coachLimit,
  FREE_COACH_PER_DAY,
  isPremiumActive,
  PLUS_COACH_PER_DAY
} from "../domain/entitlements.js";
import { suggestMeals } from "../domain/foods.js";
import { entitlementFromAppleClaims, entitlementFromPlay, type EntitlementGrant } from "../domain/iap.js";
import { dailyChallenge, buildInsight } from "../domain/insights.js";
import { calorieFloor, clampCalorieAdjustment, planCalories, scaleEstimate, type Gender } from "../domain/nutrition.js";
import { buildWeek, dayForDate, type DayPlan } from "../domain/plans.js";
import {
  COACH_SYSTEM_PROMPT,
  crisisReply,
  fallbackCoach,
  HEALTH_DISCLAIMER,
  replyLooksUnsafe
} from "../domain/safety.js";
import {
  ACHIEVEMENTS,
  freshXpState,
  levelProgress,
  noSugarRun,
  projectStreak,
  reduceDailyAward,
  STEPS_GOAL,
  unlockedAchievementIds,
  WATER_GOAL_ML,
  XP_AWARDS,
  zoneForLevel,
  type XpState
} from "../domain/xp.js";
import { HttpError } from "../http/errors.js";
import type { AppleVerifier } from "../iap/apple.js";
import type { GoogleVerifier } from "../iap/google.js";
import {
  emptyDaily,
  freshUser,
  type AchievementDoc,
  type ConversationDoc,
  type DailyDoc,
  type MealDoc,
  type PlanDoc,
  type QuotaDoc,
  type ReceiptClaimDoc,
  type SubscriptionDoc,
  type UserDoc,
  type WeightDoc,
  type WorkoutLogDoc,
  type XpDoc
} from "../store/docs.js";
import type { DocStore, StoreTx } from "../store/types.js";

export interface ProfilePatch {
  name?: string;
  age?: number;
  gender?: UserDoc["gender"];
  height_cm?: number;
  current_weight_kg?: number;
  target_weight_kg?: number;
  activity_level?: UserDoc["activity_level"];
  country?: string;
  dietary_preferences?: string[];
  equipment?: string[];
  daily_minutes?: 15 | 30 | 45;
  units?: UserDoc["units"];
  water_reminders?: boolean;
  streak_reminders?: boolean;
  disclaimer_accepted?: boolean;
  timezone?: string;
  local_date?: string;
}

interface Loaded {
  tx: StoreTx;
  user: UserDoc;
  xp: XpDoc;
  daily: DailyDoc;
  plan: PlanDoc | null;
  achievements: AchievementDoc[];
  meals: MealDoc[];
  weights: WeightDoc[];
}

export interface IdentityAdmin {
  deleteUser(uid: string): Promise<void>;
}

export interface ServiceDeps {
  store: DocStore;
  now: () => Date;
  ai: AiClient;
  apple: AppleVerifier;
  google: GoogleVerifier;
  identity: IdentityAdmin;
  bundleId: string;
}

const MEAL_PHOTO_PROMPT =
  "Look at the meal photo. Reply with JSON only: {\"is_food\":boolean,\"name\":string,\"calories\":number,\"note\":string}. " +
  "If it is not food, is_food false. Calories are a rough midpoint, never a prescription. No shame, no diet rules, no medical claims. Keep the note under 30 words.";

export class PerfectService {
  constructor(private readonly deps: ServiceDeps) {}

  private get store() {
    return this.deps.store;
  }

  private get now() {
    return this.deps.now;
  }

  async session(uid: string, email: string | null): Promise<UserDoc> {
    const stamp = this.now().toISOString();
    const existing = await this.store.get<UserDoc>("users", uid);
    if (!existing) {
      const created = freshUser(uid, email, stamp);
      await this.store.set("users", uid, created);
      return created;
    }
    if (email && email !== existing.email) {
      const next = { ...existing, email, updated_at: stamp };
      await this.store.set("users", uid, next);
      return next;
    }
    return existing;
  }

  async getMe(uid: string): Promise<UserDoc> {
    const user = await this.store.get<UserDoc>("users", uid);
    if (!user) throw new HttpError(404, "not_found", "Account not found.");
    return user;
  }

  async updateProfile(uid: string, patch: ProfilePatch): Promise<UserDoc> {
    const date = patch.local_date ?? this.now().toISOString().slice(0, 10);
    this.assertDate(date);
    return this.mutate(uid, date, async (loaded) => {
      const next: UserDoc = {
        ...loaded.user,
        ...cleanPatch(patch),
        equipment: patch.equipment ? normalizeEquipment(patch.equipment) : loaded.user.equipment,
        updated_at: this.now().toISOString()
      };
      if (next.current_weight_kg != null && next.target_weight_kg != null && next.target_weight_kg > next.current_weight_kg + 0.5) {
        throw new HttpError(
          400,
          "target_direction",
          "This plan is for losing weight or holding steady. Set a target at or below your current weight."
        );
      }
      next.onboarding_complete = profileComplete(next);
      loaded.user = next;
      if (next.onboarding_complete && next.start_weight_kg == null && next.current_weight_kg != null) {
        next.start_weight_kg = next.current_weight_kg;
        const log: WeightDoc = {
          id: randomUUID(),
          user_id: uid,
          weight_kg: next.current_weight_kg,
          waist_cm: null,
          local_date: date,
          logged_at: this.now().toISOString()
        };
        loaded.weights = [...loaded.weights, log];
        await loaded.tx.set("weight_logs", log.id, log);
        this.applyEvent(loaded, date, "weight", XP_AWARDS.weight, true);
      }
      const unlocked = this.collectAchievements(loaded, date);
      await this.persist(loaded, unlocked);
      return loaded.user;
    });
  }

  async deleteAccount(uid: string, confirm: string): Promise<void> {
    if (confirm !== "DELETE") {
      throw new HttpError(400, "confirm_required", "Send confirm DELETE to remove the account and its health logs.");
    }
    await this.store.deleteUserCascade(uid);
    await this.deps.identity.deleteUser(uid);
  }

  async addWeight(uid: string, input: { local_date: string; weight_kg: number; waist_cm?: number | null }): Promise<WeightDoc> {
    this.assertDate(input.local_date);
    return this.mutate(uid, input.local_date, async (loaded) => {
      this.ready(loaded.user);
      const todayLogs = loaded.weights.filter((entry) => entry.local_date === input.local_date);
      if (todayLogs.length >= 8) throw new HttpError(400, "too_many", "That's enough weigh-ins for today.");
      const log: WeightDoc = {
        id: randomUUID(),
        user_id: uid,
        weight_kg: input.weight_kg,
        waist_cm: input.waist_cm ?? null,
        local_date: input.local_date,
        logged_at: this.now().toISOString()
      };
      loaded.weights = [...loaded.weights, log];
      loaded.user = { ...loaded.user, current_weight_kg: input.weight_kg, updated_at: this.now().toISOString() };
      if (loaded.user.start_weight_kg == null) loaded.user = { ...loaded.user, start_weight_kg: input.weight_kg };
      await loaded.tx.set("weight_logs", log.id, log);
      this.applyEvent(loaded, input.local_date, "weight", XP_AWARDS.weight, true);
      const unlocked = this.collectAchievements(loaded, input.local_date);
      await this.persist(loaded, unlocked);
      return log;
    });
  }

  async listWeights(uid: string): Promise<WeightDoc[]> {
    const weights = await this.store.list<WeightDoc>("weight_logs", "user_id", uid);
    return weights
      .sort((a, b) => b.local_date.localeCompare(a.local_date) || b.logged_at.localeCompare(a.logged_at))
      .slice(0, 180);
  }

  async getPlan(uid: string, date: string): Promise<PlanDoc> {
    this.assertDate(date);
    const user = await this.getMe(uid);
    this.ready(user);
    return this.ensurePlan(user, date);
  }

  async regeneratePlan(uid: string, date: string): Promise<PlanDoc> {
    this.assertDate(date);
    const user = await this.getMe(uid);
    this.ready(user);
    const weekId = isoWeekId(date);
    const existing = await this.store.get<PlanDoc>("plans", `${uid}_${weekId}`);
    const variant = (existing?.variant ?? 0) + 1;
    const plan = this.makePlan(user, weekId, variant);
    await this.store.set("plans", plan.id, plan);
    return plan;
  }

  async gentler(uid: string, date: string): Promise<DayPlan> {
    this.assertDate(date);
    const user = await this.getMe(uid);
    this.ready(user);
    await this.ensurePlan(user, date);
    return this.mutate(uid, date, async (loaded) => {
      this.ready(loaded.user);
      if (!loaded.plan) throw new HttpError(409, "plan_missing", "Open today once so we can build your week.");
      loaded.daily = { ...loaded.daily, gentler: true };
      await this.persist(loaded, []);
      return dayForDate(loaded.plan, date, true);
    });
  }

  async today(uid: string, date: string) {
    this.assertDate(date);
    const user = await this.getMe(uid);
    if (!user.onboarding_complete) {
      return { profile_complete: false as const, date, disclaimer: HEALTH_DISCLAIMER };
    }
    this.ready(user);
    const plan = await this.ensurePlan(user, date);
    const daily = (await this.store.get<DailyDoc>("daily", `${uid}_${date}`)) ?? emptyDaily(uid, date);
    const meals = (await this.store.list<MealDoc>("meal_logs", "user_id", uid)).filter((meal) => meal.local_date === date);
    const weights = await this.listWeights(uid);
    const xpDoc = (await this.store.get<XpDoc>("xp", uid)) ?? { user_id: uid, ...freshXpState() };
    const achievements = await this.store.list<AchievementDoc>("achievements", "user_id", uid);
    const day = dayForDate(plan, date, daily.gentler);
    const entitlement = await this.entitlementFor(uid, date);
    const latest = weights[0];
    const estimate =
      user.start_weight_kg != null && (latest?.weight_kg ?? user.current_weight_kg) != null
        ? scaleEstimate(user.start_weight_kg, latest?.weight_kg ?? user.current_weight_kg!)
        : null;
    return {
      profile_complete: true as const,
      date,
      disclaimer: HEALTH_DISCLAIMER,
      calorie_target: plan.calorie_target,
      caution: plan.caution,
      bmi: plan.bmi,
      week_id: plan.week_id,
      day,
      daily: {
        calories_consumed: meals.reduce((sum, meal) => sum + meal.calories, 0) || daily.calories_consumed,
        workout_completed: daily.workout_completed,
        mood: daily.mood,
        water_ml: daily.water_ml,
        water_goal_ml: WATER_GOAL_ML,
        steps: daily.steps,
        steps_goal: STEPS_GOAL,
        gentler: daily.gentler
      },
      gamification: this.viewXp(xpDoc, date),
      achievements: presentAchievements(achievements),
      challenge: dailyChallenge(date, {
        workout_completed: daily.workout_completed,
        steps: daily.steps,
        meals: meals.length,
        no_sugar_meals: meals.filter((meal) => meal.no_sugar).length
      }),
      insight: buildInsight(
        weights.map((entry) => ({ local_date: entry.local_date, weight_kg: entry.weight_kg })),
        daysBetween
      ),
      suggestions: suggestMeals(user.country, user.dietary_preferences),
      estimate,
      entitlement
    };
  }

  async completeWorkout(uid: string, input: { local_date: string; workout_id: string; duration_sec: number }) {
    this.assertDate(input.local_date);
    const user = await this.getMe(uid);
    this.ready(user);
    await this.ensurePlan(user, input.local_date);
    return this.mutate(uid, input.local_date, async (loaded) => {
      if (!loaded.plan) throw new HttpError(409, "plan_missing", "Open today once so we can build your week.");
      const day = dayForDate(loaded.plan, input.local_date, loaded.daily.gentler);
      if (input.workout_id !== day.id) throw new HttpError(400, "unknown_workout", "That session isn't on today's plan.");
      if (loaded.daily.workout_completed) {
        return {
          already_completed: true,
          xp_gained: 0,
          penalty_xp: 0,
          grace_used: false,
          streak_reset: false,
          leveled_up: false,
          achievements_unlocked: [],
          gamification: this.viewXp(loaded.xp, input.local_date)
        };
      }
      const before = loaded.xp.level;
      const applied = this.applyEvent(loaded, input.local_date, "workout", XP_AWARDS.workout, true, { countWorkout: true });
      loaded.daily = { ...loaded.daily, workout_completed: true };
      const log: WorkoutLogDoc = {
        id: randomUUID(),
        user_id: uid,
        workout_id: input.workout_id,
        local_date: input.local_date,
        duration_sec: input.duration_sec,
        completed_at: this.now().toISOString()
      };
      await loaded.tx.set("workout_logs", log.id, log);
      const unlocked = this.collectAchievements(loaded, input.local_date);
      await this.persist(loaded, unlocked);
      return {
        already_completed: false,
        xp_gained: applied.gained,
        penalty_xp: applied.penalty_xp,
        grace_used: applied.grace_used,
        streak_reset: applied.streak_reset,
        leveled_up: loaded.xp.level > before,
        achievements_unlocked: describe(unlocked),
        gamification: this.viewXp(loaded.xp, input.local_date)
      };
    });
  }

  async addMeal(uid: string, input: { local_date: string; name: string; calories: number; no_sugar: boolean; source?: "manual" | "photo" }) {
    this.assertDate(input.local_date);
    const user = await this.getMe(uid);
    this.ready(user);
    const plan = await this.ensurePlan(user, input.local_date);
    return this.mutate(uid, input.local_date, async (loaded) => {
      const meal: MealDoc = {
        id: randomUUID(),
        user_id: uid,
        name: input.name,
        calories: input.calories,
        no_sugar: input.no_sugar,
        source: input.source ?? "manual",
        local_date: input.local_date,
        logged_at: this.now().toISOString()
      };
      loaded.meals = [...loaded.meals, meal];
      const todays = loaded.meals.filter((entry) => entry.local_date === input.local_date);
      loaded.daily = {
        ...loaded.daily,
        calories_consumed: todays.reduce((sum, entry) => sum + entry.calories, 0)
      };
      await loaded.tx.set("meal_logs", meal.id, meal);
      const mealSlots = loaded.daily.events.filter((event) => event.startsWith("meal_")).length;
      let gained = 0;
      if (mealSlots < 3) {
        gained += this.applyEvent(loaded, input.local_date, `meal_${mealSlots + 1}`, XP_AWARDS.meal, true).gained;
      }
      const target = loaded.plan?.calorie_target ?? plan.calorie_target;
      const enough = loaded.daily.calories_consumed >= target * 0.5 && loaded.daily.calories_consumed <= target && todays.length >= 2;
      if (enough && !loaded.daily.events.includes("calorie_target")) {
        gained += this.applyEvent(loaded, input.local_date, "calorie_target", XP_AWARDS.calorieTarget, true).gained;
      }
      const unlocked = this.collectAchievements(loaded, input.local_date);
      await this.persist(loaded, unlocked);
      return { meal, xp_gained: gained, achievements_unlocked: describe(unlocked), gamification: this.viewXp(loaded.xp, input.local_date) };
    });
  }

  async listMeals(uid: string, date: string): Promise<MealDoc[]> {
    this.assertDate(date);
    const meals = await this.store.list<MealDoc>("meal_logs", "user_id", uid);
    return meals.filter((meal) => meal.local_date === date).sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  }

  async addWater(uid: string, input: { local_date: string; ml: number }) {
    this.assertDate(input.local_date);
    return this.mutate(uid, input.local_date, async (loaded) => {
      this.ready(loaded.user);
      const water = Math.min(6000, loaded.daily.water_ml + input.ml);
      loaded.daily = { ...loaded.daily, water_ml: water };
      let gained = 0;
      if (water >= WATER_GOAL_ML && !loaded.daily.events.includes("water_goal")) {
        gained = this.applyEvent(loaded, input.local_date, "water_goal", XP_AWARDS.waterGoal, false).gained;
      }
      const unlocked = this.collectAchievements(loaded, input.local_date);
      await this.persist(loaded, unlocked);
      return { water_ml: loaded.daily.water_ml, xp_gained: gained, gamification: this.viewXp(loaded.xp, input.local_date) };
    });
  }

  async setMood(uid: string, input: { local_date: string; mood: number }) {
    this.assertDate(input.local_date);
    return this.mutate(uid, input.local_date, async (loaded) => {
      this.ready(loaded.user);
      loaded.daily = { ...loaded.daily, mood: input.mood };
      let gained = 0;
      if (!loaded.daily.events.includes("mood")) {
        gained = this.applyEvent(loaded, input.local_date, "mood", XP_AWARDS.mood, false).gained;
      }
      await this.persist(loaded, []);
      return { mood: input.mood, xp_gained: gained, gamification: this.viewXp(loaded.xp, input.local_date) };
    });
  }

  async setSteps(uid: string, input: { local_date: string; steps: number }) {
    this.assertDate(input.local_date);
    return this.mutate(uid, input.local_date, async (loaded) => {
      this.ready(loaded.user);
      loaded.daily = { ...loaded.daily, steps: input.steps };
      let gained = 0;
      if (input.steps >= STEPS_GOAL && !loaded.daily.events.includes("steps_goal")) {
        gained = this.applyEvent(loaded, input.local_date, "steps_goal", XP_AWARDS.stepsGoal, true, { markStepsGoal: true }).gained;
      }
      const unlocked = this.collectAchievements(loaded, input.local_date);
      await this.persist(loaded, unlocked);
      return {
        steps: input.steps,
        xp_gained: gained,
        achievements_unlocked: describe(unlocked),
        gamification: this.viewXp(loaded.xp, input.local_date)
      };
    });
  }

  async gamification(uid: string, date: string) {
    this.assertDate(date);
    const xp = (await this.store.get<XpDoc>("xp", uid)) ?? { user_id: uid, ...freshXpState() };
    const achievements = await this.store.list<AchievementDoc>("achievements", "user_id", uid);
    return { ...this.viewXp(xp, date), achievements: presentAchievements(achievements), disclaimer: HEALTH_DISCLAIMER };
  }

  async coach(uid: string, input: { message: string; local_date: string; installId: string }) {
    this.assertDate(input.local_date);
    const user = await this.getMe(uid);
    this.ready(user);
    const crisis = crisisReply(input.message);
    if (crisis) {
      await this.remember(uid, "[crisis message withheld]", "user", "crisis", null);
      await this.remember(uid, crisis, "assistant", "crisis", null);
      const entitlement = await this.entitlementFor(uid, input.local_date);
      return { reply: crisis, source: "crisis" as const, disclaimer: HEALTH_DISCLAIMER, entitlement };
    }

    const entitlement = await this.entitlementFor(uid, input.local_date);
    const charged = this.deps.ai.configured;
    if (charged) {
      const slot = await this.takeQuota(uid, input.installId, input.local_date, entitlement.premium);
      if (!slot.ok) {
        throw new HttpError(
          entitlement.premium ? 429 : 402,
          entitlement.premium ? "rate_limited" : "quota_exceeded",
          entitlement.premium
            ? "You've hit today's coach limit. It resets tomorrow."
            : "You've used today's free coach notes. Plus removes that daily cap."
        );
      }
    }

    const today = await this.today(uid, input.local_date);
    const context = this.coachContext(user, today);
    let source: "cloud" | "fallback" = "fallback";
    let reply = fallbackCoach({
      name: user.name,
      message: input.message,
      streak: todayContextStreak(today),
      workoutName: todayContextWorkout(today),
      caloriesLeft: todayContextCalories(today),
      mood: todayContextMood(today),
      caution: today.profile_complete ? today.caution : null
    });

    if (charged) {
      try {
        const result = await this.deps.ai.chat({
          system: COACH_SYSTEM_PROMPT,
          user: `Context JSON:\n${JSON.stringify(context)}\n\nMember message:\n${input.message}`
        });
        if (result.text.trim() && !replyLooksUnsafe(result.text)) {
          reply = result.text.trim();
          source = "cloud";
        }
        if (result.text.trim()) await this.addTokens(uid, input.local_date, result.inputTokens, result.outputTokens);
        else await this.refundQuota(uid, input.installId, input.local_date, entitlement.premium);
      } catch {
        await this.refundQuota(uid, input.installId, input.local_date, entitlement.premium);
        source = "fallback";
      }
    }

    await this.remember(uid, input.message, "user", source, context);
    await this.remember(uid, reply, "assistant", source, null);
    const after = await this.entitlementFor(uid, input.local_date);
    return { reply, source, disclaimer: HEALTH_DISCLAIMER, entitlement: after };
  }

  async adjustPlan(uid: string, input: { feedback: string; local_date: string; installId: string }) {
    this.assertDate(input.local_date);
    const user = await this.getMe(uid);
    this.ready(user);
    const entitlement = await this.entitlementFor(uid, input.local_date);
    if (!entitlement.premium) {
      throw new HttpError(402, "premium_required", "Plan adjustments from the coach are part of PerfectShape Plus.");
    }
    const plan = await this.ensurePlan(user, input.local_date);
    if (this.deps.ai.configured) {
      const slot = await this.takeQuota(uid, input.installId, input.local_date, true);
      if (!slot.ok) throw new HttpError(429, "rate_limited", "You've hit today's coach limit. It resets tomorrow.");
    }

    let interpreted = interpretFeedback(input.feedback);
    let source: "cloud" | "fallback" = "fallback";
    if (this.deps.ai.configured) {
      try {
        const result = await this.deps.ai.chat({
          system: COACH_SYSTEM_PROMPT,
          user:
            `Current calorie target: ${plan.calorie_target}. Floor: ${calorieFloor(user.gender as Gender)}. ` +
            `Reply with JSON only: {"summary":string,"calorie_delta":number}. calorie_delta must be between -150 and 150. Feedback: ${input.feedback}`
        });
        const parsed = parseCalorieDelta(result.text);
        if (parsed) {
          interpreted = { delta: parsed.delta, summary: parsed.summary || interpreted.summary };
          source = "cloud";
        }
        if (result.text.trim()) await this.addTokens(uid, input.local_date, result.inputTokens, result.outputTokens);
        else await this.refundQuota(uid, input.installId, input.local_date, true);
      } catch {
        await this.refundQuota(uid, input.installId, input.local_date, true);
      }
    }

    const target = clampCalorieAdjustment(plan.calorie_target, plan.calorie_target + interpreted.delta, calorieFloor(user.gender as Gender));
    const next = { ...plan, calorie_target: target };
    await this.store.set("plans", plan.id, next);
    return { summary: interpreted.summary, calorie_target: target, source, disclaimer: HEALTH_DISCLAIMER };
  }

  async mealPhoto(uid: string, input: { imageBase64: string; mediaType: string; local_date: string; installId: string }) {
    this.assertDate(input.local_date);
    const user = await this.getMe(uid);
    this.ready(user);
    const entitlement = await this.entitlementFor(uid, input.local_date);
    if (!entitlement.premium) {
      throw new HttpError(402, "premium_required", "Meal photo analysis is part of PerfectShape Plus.");
    }
    const bytes = approxDecodedBytes(input.imageBase64);
    if (bytes > 1_500_000) throw new HttpError(400, "image_too_large", "Use a photo under 1.5 MB.");
    if (!this.deps.ai.configured) {
      throw new HttpError(503, "ai_unconfigured", "The coach service isn't configured on this server yet.");
    }
    const slot = await this.takeQuota(uid, input.installId, input.local_date, true);
    if (!slot.ok) throw new HttpError(429, "rate_limited", "You've hit today's coach limit. It resets tomorrow.");
    try {
      const result = await this.deps.ai.chat({
        system: COACH_SYSTEM_PROMPT,
        user: MEAL_PHOTO_PROMPT,
        imageDataUrl: `data:${input.mediaType};base64,${input.imageBase64}`
      });
      await this.addTokens(uid, input.local_date, result.inputTokens, result.outputTokens);
      const parsed = parseMealPhoto(result.text);
      return { ...parsed, source: "cloud" as const, disclaimer: HEALTH_DISCLAIMER };
    } catch {
      await this.refundQuota(uid, input.installId, input.local_date, true);
      throw new HttpError(502, "ai_unavailable", "The coach couldn't read that photo. You can still log the meal yourself.");
    }
  }

  async history(uid: string): Promise<Pick<ConversationDoc, "id" | "role" | "text" | "source" | "created_at">[]> {
    const all = await this.store.list<ConversationDoc>("conversations", "user_id", uid);
    return all
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-40)
      .map(({ id, role, text, source, created_at }) => ({ id, role, text, source, created_at }));
  }

  async subscription(uid: string, date: string) {
    this.assertDate(date);
    return this.entitlementFor(uid, date);
  }

  async verifyApple(uid: string, signedTransaction: string) {
    await this.getMe(uid);
    const claims = this.deps.apple.verify(signedTransaction, this.now());
    const grant = entitlementFromAppleClaims(claims, this.deps.bundleId, this.now());
    if (!grant.ok) throw new HttpError(400, grant.error, grantMessage(grant.error));
    const claimKey = grant.original_transaction_id ?? grant.latest_transaction_id ?? signedTransaction.slice(0, 32);
    await this.persistGrant(uid, "apple", grant, claimKey, null);
    return this.entitlementFor(uid, this.now().toISOString().slice(0, 10));
  }

  async verifyGoogle(uid: string, purchaseToken: string) {
    await this.getMe(uid);
    const subscription = await this.deps.google.verifyToken(purchaseToken);
    const grant = entitlementFromPlay(subscription, this.now());
    if (!grant.ok) throw new HttpError(400, grant.error, grantMessage(grant.error));
    await this.persistGrant(uid, "google", grant, purchaseToken, purchaseToken);
    if (grant.acknowledge) {
      try {
        await this.deps.google.acknowledge(purchaseToken, grant.product_id);
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
      }
    }
    return this.entitlementFor(uid, this.now().toISOString().slice(0, 10));
  }

  async refreshSubscription(uid: string, signedTransaction?: string) {
    if (signedTransaction) return this.verifyApple(uid, signedTransaction);
    const sub = await this.store.get<SubscriptionDoc>("subscriptions", uid);
    if (sub?.platform === "google" && sub.purchase_token) {
      const subscription = await this.deps.google.verifyToken(sub.purchase_token);
      const grant = entitlementFromPlay(subscription, this.now());
      if (!grant.ok) {
        await this.store.set("subscriptions", uid, { ...sub, status: "expired", updated_at: this.now().toISOString() });
      } else {
        await this.persistGrant(uid, "google", grant, sub.purchase_token, sub.purchase_token);
      }
    } else if (sub?.platform === "apple" && sub.original_transaction_id) {
      const claims = await this.deps.apple.refresh(sub.original_transaction_id, this.now());
      if (claims) {
        const grant = entitlementFromAppleClaims(claims, this.deps.bundleId, this.now());
        if (grant.ok) await this.persistGrant(uid, "apple", grant, grant.original_transaction_id ?? sub.original_transaction_id, null);
      }
    }
    return this.entitlementFor(uid, this.now().toISOString().slice(0, 10));
  }

  private async mutate<T>(uid: string, date: string, fn: (loaded: Loaded) => Promise<T>): Promise<T> {
    return this.store.transaction(async (tx) => {
      const loaded = await this.load(tx, uid, date);
      return fn(loaded);
    });
  }

  private async load(tx: StoreTx, uid: string, date: string): Promise<Loaded> {
    const weekId = isoWeekId(date);
    const [user, xp, daily, plan, achievements, meals, weights] = await Promise.all([
      tx.get<UserDoc>("users", uid),
      tx.get<XpDoc>("xp", uid),
      tx.get<DailyDoc>("daily", `${uid}_${date}`),
      tx.get<PlanDoc>("plans", `${uid}_${weekId}`),
      tx.list<AchievementDoc>("achievements", "user_id", uid),
      tx.list<MealDoc>("meal_logs", "user_id", uid),
      tx.list<WeightDoc>("weight_logs", "user_id", uid)
    ]);
    if (!user) throw new HttpError(404, "not_found", "Account not found.");
    return {
      tx,
      user,
      xp: xp ?? { user_id: uid, ...freshXpState() },
      daily: daily ?? emptyDaily(uid, date),
      plan,
      achievements,
      meals,
      weights
    };
  }

  private applyEvent(
    loaded: Loaded,
    today: string,
    event: string,
    amount: number,
    checkIn: boolean,
    options?: { countWorkout?: boolean; markStepsGoal?: boolean }
  ) {
    const result = reduceDailyAward(loaded.xp, loaded.daily.events, today, event, amount, checkIn, daysBetween, options);
    loaded.xp = { ...result.xp, user_id: loaded.user.id };
    loaded.daily = { ...loaded.daily, events: result.events };
    return result;
  }

  private collectAchievements(loaded: Loaded, today: string): AchievementDoc[] {
    const owned = new Set(loaded.achievements.map((item) => item.achievement_id));
    let latest: WeightDoc | undefined;
    for (const entry of loaded.weights) {
      if (
        !latest ||
        entry.local_date > latest.local_date ||
        (entry.local_date === latest.local_date && entry.logged_at >= latest.logged_at)
      ) {
        latest = entry;
      }
    }
    const grouped = new Map<string, { no_sugar: boolean }[]>();
    for (const meal of loaded.meals) {
      const list = grouped.get(meal.local_date) ?? [];
      list.push({ no_sugar: meal.no_sugar });
      grouped.set(meal.local_date, list);
    }
    const ids = unlockedAchievementIds({
      xp: loaded.xp,
      startWeightKg: loaded.user.start_weight_kg,
      latestWeightKg: latest?.weight_kg ?? loaded.user.current_weight_kg,
      noSugarRun: noSugarRun(
        [...grouped.entries()].map(([entryDate, meals]) => ({ date: entryDate, meals })),
        today,
        shiftDate
      )
    });
    const stamp = this.now().toISOString();
    return ids
      .filter((id) => !owned.has(id))
      .map((id) => ({ id: `${loaded.user.id}_${id}`, user_id: loaded.user.id, achievement_id: id, unlocked_at: stamp }));
  }

  private async persist(loaded: Loaded, unlocked: AchievementDoc[]) {
    await loaded.tx.set("users", loaded.user.id, loaded.user);
    await loaded.tx.set("xp", loaded.user.id, loaded.xp);
    await loaded.tx.set("daily", loaded.daily.id, loaded.daily);
    for (const achievement of unlocked) {
      await loaded.tx.set("achievements", achievement.id, achievement);
    }
  }

  private async ensurePlan(user: UserDoc, date: string): Promise<PlanDoc> {
    const weekId = isoWeekId(date);
    const id = `${user.id}_${weekId}`;
    const existing = await this.store.get<PlanDoc>("plans", id);
    if (existing) return existing;
    const plan = this.makePlan(user, weekId, 0);
    await this.store.set("plans", plan.id, plan);
    return plan;
  }

  private makePlan(user: UserDoc, weekId: string, variant: number): PlanDoc {
    this.ready(user);
    const calories = planCalories({
      gender: user.gender,
      age: user.age,
      height_cm: user.height_cm,
      weight_kg: user.current_weight_kg,
      target_weight_kg: user.target_weight_kg,
      activity_level: user.activity_level
    });
    return {
      id: `${user.id}_${weekId}`,
      user_id: user.id,
      week_id: weekId,
      variant,
      calorie_target: calories.target,
      caution: calories.caution,
      bmi: calories.bmi,
      days: buildWeek({ weekId, variant, minutes: user.daily_minutes, equipment: user.equipment }),
      created_at: this.now().toISOString()
    };
  }

  private ready(user: UserDoc): asserts user is ReadyUser {
    if (
      !user.onboarding_complete ||
      !user.gender ||
      user.age == null ||
      user.height_cm == null ||
      user.current_weight_kg == null ||
      user.target_weight_kg == null ||
      !user.activity_level ||
      user.daily_minutes == null
    ) {
      throw new HttpError(409, "profile_incomplete", "Finish setting up your profile first.");
    }
  }

  private assertDate(date: string): void {
    if (!isDateString(date)) throw new HttpError(400, "bad_date", "Use a YYYY-MM-DD date.");
    if (!dateAllowed(date, this.now())) {
      throw new HttpError(400, "date_out_of_range", "That date is outside the window we can log.");
    }
  }

  private viewXp(xp: XpState, today: string) {
    const projected = projectStreak(xp, today, daysBetween);
    const zones = zoneForLevel(xp.level);
    return {
      total_xp: xp.total_xp,
      level: xp.level,
      ...levelProgress(xp.total_xp, xp.level),
      zone: zones.current,
      next_zone: zones.next,
      streak_count: projected.streak_count,
      streak_at_risk: projected.at_risk,
      streak_pending_reset: projected.pending_reset,
      grace_tokens: projected.grace_tokens,
      best_streak: xp.best_streak,
      workouts_completed: xp.workouts_completed
    };
  }

  private async entitlementFor(uid: string, date: string) {
    const sub = await this.currentSub(uid);
    const premium = isPremiumActive(sub, this.now());
    const quota = await this.store.get<QuotaDoc>("ai_quota", `uid:${uid}:${date}`);
    const limit = coachLimit(premium);
    const used = quota?.count ?? 0;
    return {
      premium,
      status: premium ? sub?.status ?? "active" : "free",
      product_id: premium ? sub?.product_id ?? null : null,
      expires_at: premium ? sub?.expires_at ?? null : null,
      platform: premium ? sub?.platform ?? null : null,
      coach_remaining: Math.max(0, limit - used),
      coach_limit: limit,
      coach_per_day_free: FREE_COACH_PER_DAY,
      coach_per_day_plus: PLUS_COACH_PER_DAY
    };
  }

  private async currentSub(uid: string): Promise<SubscriptionDoc | null> {
    const sub = await this.store.get<SubscriptionDoc>("subscriptions", uid);
    if (!sub?.expires_at) return sub;
    if (Date.parse(sub.expires_at) <= this.now().getTime() && sub.status !== "expired" && sub.status !== "free") {
      const expired: SubscriptionDoc = { ...sub, status: "expired", updated_at: this.now().toISOString() };
      await this.store.set("subscriptions", uid, expired);
      return expired;
    }
    return sub;
  }

  private async takeQuota(uid: string, installId: string, date: string, premium: boolean) {
    const limit = coachLimit(premium);
    const uidKey = `uid:${uid}:${date}`;
    const installKey = `install:${installId}:${date}`;
    return this.store.transaction(async (tx) => {
      const uidDoc = (await tx.get<QuotaDoc>("ai_quota", uidKey)) ?? {
        id: uidKey,
        count: 0,
        date,
        user_id: uid,
        tokens_in: 0,
        tokens_out: 0
      };
      const installDoc = (await tx.get<QuotaDoc>("ai_quota", installKey)) ?? {
        id: installKey,
        count: 0,
        date,
        install_id: installId
      };
      if (uidDoc.count >= limit || (!premium && installDoc.count >= FREE_COACH_PER_DAY)) {
        return { ok: false as const, remaining: 0, limit };
      }
      const next = uidDoc.count + 1;
      await tx.set("ai_quota", uidKey, { ...uidDoc, id: uidKey, count: next, date, user_id: uid });
      if (!premium) {
        await tx.set("ai_quota", installKey, {
          id: installKey,
          count: installDoc.count + 1,
          date,
          install_id: installId
        });
      }
      return { ok: true as const, remaining: limit - next, limit };
    });
  }

  private async refundQuota(uid: string, installId: string, date: string, premium: boolean) {
    const uidKey = `uid:${uid}:${date}`;
    const installKey = `install:${installId}:${date}`;
    await this.store.transaction(async (tx) => {
      const uidDoc = await tx.get<QuotaDoc>("ai_quota", uidKey);
      if (uidDoc && uidDoc.count > 0) await tx.set("ai_quota", uidKey, { ...uidDoc, count: uidDoc.count - 1 });
      if (!premium) {
        const installDoc = await tx.get<QuotaDoc>("ai_quota", installKey);
        if (installDoc && installDoc.count > 0) {
          await tx.set("ai_quota", installKey, { ...installDoc, count: installDoc.count - 1 });
        }
      }
    });
  }

  private async addTokens(uid: string, date: string, inputTokens: number, outputTokens: number) {
    const uidKey = `uid:${uid}:${date}`;
    await this.store.transaction(async (tx) => {
      const doc = await tx.get<QuotaDoc>("ai_quota", uidKey);
      if (!doc) return;
      await tx.set("ai_quota", uidKey, {
        ...doc,
        tokens_in: (doc.tokens_in ?? 0) + inputTokens,
        tokens_out: (doc.tokens_out ?? 0) + outputTokens
      });
    });
  }

  private async persistGrant(
    uid: string,
    platform: "apple" | "google",
    grant: EntitlementGrant,
    claimKey: string,
    purchaseToken: string | null
  ) {
    const stamp = this.now().toISOString();
    const id = createHash("sha256").update(`${platform}:${claimKey}`).digest("hex");
    await this.store.transaction(async (tx) => {
      const existing = await tx.get<ReceiptClaimDoc>("receipt_claims", id);
      if (existing && existing.user_id !== uid) {
        throw new HttpError(409, "receipt_in_use", "That subscription is already linked to another PerfectShape account.");
      }
      const claim: ReceiptClaimDoc = existing ?? { id, user_id: uid, platform, created_at: stamp };
      const sub: SubscriptionDoc = {
        user_id: uid,
        status: grant.status,
        product_id: grant.product_id,
        platform,
        expires_at: grant.expires_at,
        original_transaction_id: grant.original_transaction_id,
        latest_transaction_id: grant.latest_transaction_id,
        purchase_token: purchaseToken,
        environment: grant.environment,
        updated_at: stamp
      };
      await tx.set("receipt_claims", id, claim);
      await tx.set("subscriptions", uid, sub);
    });
  }

  private async remember(
    uid: string,
    text: string,
    role: ConversationDoc["role"],
    source: ConversationDoc["source"],
    snapshot: Record<string, unknown> | null
  ) {
    const doc: ConversationDoc = {
      id: randomUUID(),
      user_id: uid,
      role,
      text,
      source,
      created_at: this.now().toISOString(),
      context_snapshot: snapshot
    };
    await this.store.set("conversations", doc.id, doc);
    const all = await this.store.list<ConversationDoc>("conversations", "user_id", uid);
    if (all.length > 40) {
      const extra = all.sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(0, all.length - 40);
      for (const item of extra) await this.store.delete("conversations", item.id);
    }
  }

  private coachContext(user: UserDoc, today: Awaited<ReturnType<PerfectService["today"]>>) {
    if (!today.profile_complete) return { name: user.name };
    return {
      name: user.name,
      weight_kg: user.current_weight_kg,
      target_weight_kg: user.target_weight_kg,
      calorie_target: today.calorie_target,
      calories_consumed: today.daily.calories_consumed,
      streak: today.gamification.streak_count,
      level: today.gamification.level,
      mood: today.daily.mood,
      workout: today.day.name,
      bmi: today.bmi,
      caution: today.caution,
      compliance_note: "Home workouts only. No extreme cuts."
    };
  }
}

type ReadyUser = UserDoc & {
  gender: NonNullable<UserDoc["gender"]>;
  age: number;
  height_cm: number;
  current_weight_kg: number;
  target_weight_kg: number;
  activity_level: NonNullable<UserDoc["activity_level"]>;
  daily_minutes: NonNullable<UserDoc["daily_minutes"]>;
};

function cleanPatch(patch: ProfilePatch): Partial<UserDoc> {
  const { local_date: _localDate, equipment: _equipment, ...rest } = patch;
  return rest;
}

function profileComplete(user: UserDoc): boolean {
  return Boolean(
    user.name &&
      user.age &&
      user.gender &&
      user.height_cm &&
      user.current_weight_kg &&
      user.target_weight_kg &&
      user.activity_level &&
      user.country &&
      user.daily_minutes &&
      user.disclaimer_accepted
  );
}

function normalizeEquipment(items: string[]): string[] {
  const map: Record<string, string> = {
    none: "none",
    dumbbells: "dumbbells",
    bands: "bands",
    "resistance bands": "bands",
    rope: "rope",
    "skipping rope": "rope"
  };
  return [...new Set(items.map((item) => map[item.toLowerCase()] ?? item))];
}

function presentAchievements(docs: AchievementDoc[]) {
  return ACHIEVEMENTS.map((item) => ({
    ...item,
    unlocked_at: docs.find((doc) => doc.achievement_id === item.id)?.unlocked_at ?? null
  }));
}

function describe(docs: AchievementDoc[]) {
  return docs.map((doc) => {
    const item = ACHIEVEMENTS.find((achievement) => achievement.id === doc.achievement_id);
    return { id: doc.achievement_id, title: item?.title ?? doc.achievement_id, detail: item?.detail ?? "" };
  });
}

function grantMessage(error: string): string {
  if (error === "expired") return "That subscription has expired.";
  if (error === "unknown_product") return "That product is not PerfectShape Plus.";
  if (error === "bundle_mismatch") return "That purchase belongs to a different app.";
  if (error === "revoked") return "That purchase was revoked.";
  if (error === "inactive") return "That subscription is not active.";
  if (error === "not_owned") return "That purchase isn't owned by this Apple ID.";
  return "The store could not confirm an active subscription.";
}

function approxDecodedBytes(value: string): number {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function todayContextStreak(today: Awaited<ReturnType<PerfectService["today"]>>): number {
  return today.profile_complete ? today.gamification.streak_count : 0;
}

function todayContextWorkout(today: Awaited<ReturnType<PerfectService["today"]>>): string | null {
  return today.profile_complete ? today.day.name : null;
}

function todayContextCalories(today: Awaited<ReturnType<PerfectService["today"]>>): number | null {
  if (!today.profile_complete) return null;
  return Math.max(0, today.calorie_target - today.daily.calories_consumed);
}

function todayContextMood(today: Awaited<ReturnType<PerfectService["today"]>>): number | null {
  return today.profile_complete ? today.daily.mood : null;
}
