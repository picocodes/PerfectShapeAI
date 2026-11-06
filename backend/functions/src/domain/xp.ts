export const LEVEL_XP = 500;

export const XP_AWARDS = {
  workout: 40,
  meal: 15,
  calorieTarget: 25,
  weight: 10,
  mood: 5,
  waterGoal: 10,
  stepsGoal: 15,
  streakBonusPerDay: 5,
  streakBonusCap: 50
} as const;

export const MEAL_XP_CAP = 3;
export const WATER_GOAL_ML = 2000;
export const STEPS_GOAL = 8000;

export const ZONES = [
  { id: "foundation", name: "Foundation", min_level: 1, line: "Learn the shape of a good day." },
  { id: "ember", name: "Ember", min_level: 3, line: "The habit is catching." },
  { id: "momentum", name: "Momentum", min_level: 5, line: "Your week has a rhythm." },
  { id: "forge", name: "Forge", min_level: 8, line: "Strength is starting to look like you." },
  { id: "summit", name: "Summit", min_level: 12, line: "Quiet consistency. Loud results." }
] as const;

export interface XpState {
  total_xp: number;
  level: number;
  streak_count: number;
  last_active_date: string | null;
  grace_tokens: number;
  best_streak: number;
  workouts_completed: number;
  steps_goal_hit: boolean;
}

export function freshXpState(): XpState {
  return {
    total_xp: 0,
    level: 1,
    streak_count: 0,
    last_active_date: null,
    grace_tokens: 1,
    best_streak: 0,
    workouts_completed: 0,
    steps_goal_hit: false
  };
}

export function levelForXp(total: number): number {
  return Math.floor(Math.max(0, total) / LEVEL_XP) + 1;
}

export function zoneForLevel(level: number): {
  current: (typeof ZONES)[number];
  next: (typeof ZONES)[number] | null;
} {
  let current: (typeof ZONES)[number] = ZONES[0];
  for (const zone of ZONES) {
    if (level >= zone.min_level) current = zone;
  }
  const next = ZONES.find((zone) => zone.min_level > level) ?? null;
  return { current, next };
}

export function levelProgress(totalXp: number, level: number): {
  xp_into_level: number;
  xp_for_level: number;
  xp_to_next: number;
} {
  const floor = (Math.max(1, level) - 1) * LEVEL_XP;
  const into = Math.min(LEVEL_XP, Math.max(0, totalXp - floor));
  return { xp_into_level: into, xp_for_level: LEVEL_XP, xp_to_next: LEVEL_XP - into };
}

export interface StreakProjection {
  streak_count: number;
  at_risk: boolean;
  pending_reset: boolean;
  grace_tokens: number;
}

export function projectStreak(state: XpState, today: string, daysBetween: (a: string, b: string) => number): StreakProjection {
  if (!state.last_active_date) {
    return { streak_count: 0, at_risk: false, pending_reset: false, grace_tokens: state.grace_tokens };
  }
  const diff = daysBetween(state.last_active_date, today);
  if (diff <= 0) {
    return { streak_count: state.streak_count, at_risk: false, pending_reset: false, grace_tokens: state.grace_tokens };
  }
  if (diff === 1) {
    return { streak_count: state.streak_count, at_risk: true, pending_reset: false, grace_tokens: state.grace_tokens };
  }
  if (diff === 2 && state.grace_tokens > 0) {
    return { streak_count: state.streak_count, at_risk: true, pending_reset: false, grace_tokens: state.grace_tokens };
  }
  return { streak_count: 0, at_risk: false, pending_reset: true, grace_tokens: state.grace_tokens };
}

export interface AwardResult {
  xp: XpState;
  events: string[];
  gained: number;
  duplicate: boolean;
  streak_incremented: boolean;
  grace_used: boolean;
  streak_reset: boolean;
  penalty_xp: number;
}

/**
 * Server-side XP and streak reducer.
 * Level never falls. A penalty only spends progress inside the current level.
 * One grace token saves a single missed day. A new token refills when the streak hits a multiple of 7.
 */
export function reduceDailyAward(
  state: XpState,
  events: string[],
  today: string,
  event: string,
  xpAmount: number,
  checkIn: boolean,
  daysBetween: (a: string, b: string) => number,
  options?: { countWorkout?: boolean; markStepsGoal?: boolean }
): AwardResult {
  if (events.includes(event) || xpAmount < 0) {
    return {
      xp: state,
      events,
      gained: 0,
      duplicate: events.includes(event),
      streak_incremented: false,
      grace_used: false,
      streak_reset: false,
      penalty_xp: 0
    };
  }

  let next: XpState = { ...state };
  let gained = 0;
  let streakIncremented = false;
  let graceUsed = false;
  let streakReset = false;
  let penalty = 0;

  if (checkIn) {
    const resolved = resolveCheckIn(next, today, daysBetween);
    next = resolved.state;
    graceUsed = resolved.grace_used;
    streakReset = resolved.streak_reset;
    penalty = resolved.penalty_xp;
    streakIncremented = resolved.streak_incremented;
    if (streakIncremented) {
      const bonus = Math.min(XP_AWARDS.streakBonusCap, XP_AWARDS.streakBonusPerDay * next.streak_count);
      next = addXp(next, bonus);
      gained += bonus;
    }
  }

  next = addXp(next, xpAmount);
  gained += xpAmount;

  if (options?.countWorkout) next = { ...next, workouts_completed: next.workouts_completed + 1 };
  if (options?.markStepsGoal) next = { ...next, steps_goal_hit: true };

  return {
    xp: next,
    events: [...events, event],
    gained,
    duplicate: false,
    streak_incremented: streakIncremented,
    grace_used: graceUsed,
    streak_reset: streakReset,
    penalty_xp: penalty
  };
}

function addXp(state: XpState, amount: number): XpState {
  const total = state.total_xp + amount;
  return { ...state, total_xp: total, level: Math.max(state.level, levelForXp(total)) };
}

function resolveCheckIn(
  state: XpState,
  today: string,
  daysBetween: (a: string, b: string) => number
): { state: XpState; grace_used: boolean; streak_reset: boolean; penalty_xp: number; streak_incremented: boolean } {
  if (!state.last_active_date) {
    const streak = 1;
    return {
      state: finishStreak(state, today, streak),
      grace_used: false,
      streak_reset: false,
      penalty_xp: 0,
      streak_incremented: true
    };
  }

  const diff = daysBetween(state.last_active_date, today);
  if (diff <= 0) {
    return { state, grace_used: false, streak_reset: false, penalty_xp: 0, streak_incremented: false };
  }

  if (diff === 1) {
    return {
      state: finishStreak(state, today, state.streak_count + 1),
      grace_used: false,
      streak_reset: false,
      penalty_xp: 0,
      streak_incremented: true
    };
  }

  if (diff === 2 && state.grace_tokens > 0) {
    const held = finishStreak({ ...state, grace_tokens: state.grace_tokens - 1 }, today, state.streak_count);
    return { state: held, grace_used: true, streak_reset: false, penalty_xp: 0, streak_incremented: false };
  }

  const missed = diff - 1;
  const rawPenalty = Math.min(100, 12 * missed);
  const floor = (state.level - 1) * LEVEL_XP;
  const penalized = Math.max(floor, state.total_xp - rawPenalty);
  const applied = state.total_xp - penalized;
  const reset = finishStreak({ ...state, total_xp: penalized }, today, 1);
  return {
    state: reset,
    grace_used: false,
    streak_reset: true,
    penalty_xp: applied,
    streak_incremented: true
  };
}

function finishStreak(state: XpState, today: string, streak: number): XpState {
  let grace = state.grace_tokens;
  if (streak > 0 && streak % 7 === 0) grace = Math.max(grace, 1);
  return {
    ...state,
    streak_count: streak,
    last_active_date: today,
    grace_tokens: grace,
    best_streak: Math.max(state.best_streak, streak)
  };
}

export const ACHIEVEMENTS = [
  { id: "first_session", title: "First session", detail: "Finish a workout." },
  { id: "streak_7", title: "Week of fire", detail: "Keep a 7-day streak." },
  { id: "streak_30", title: "Unbreakable", detail: "Keep a 30-day streak." },
  { id: "first_2kg", title: "First 2 kg", detail: "See the scale drop by 2 kilograms." },
  { id: "workouts_30", title: "Thirty strong", detail: "Complete 30 workouts." },
  { id: "no_sugar_week", title: "No sugar week", detail: "Seven days of meals with no added sugar." },
  { id: "level_5", title: "Momentum", detail: "Reach level 5." },
  { id: "steps_8k", title: "8k day", detail: "Log 8,000 steps in a day." }
] as const;

export interface AchievementInput {
  xp: XpState;
  startWeightKg: number | null;
  latestWeightKg: number | null;
  noSugarRun: number;
}

export function unlockedAchievementIds(input: AchievementInput): string[] {
  const ids: string[] = [];
  if (input.xp.workouts_completed >= 1) ids.push("first_session");
  if (Math.max(input.xp.streak_count, input.xp.best_streak) >= 7) ids.push("streak_7");
  if (Math.max(input.xp.streak_count, input.xp.best_streak) >= 30) ids.push("streak_30");
  if (
    input.startWeightKg != null &&
    input.latestWeightKg != null &&
    input.startWeightKg - input.latestWeightKg >= 2
  ) {
    ids.push("first_2kg");
  }
  if (input.xp.workouts_completed >= 30) ids.push("workouts_30");
  if (input.noSugarRun >= 7) ids.push("no_sugar_week");
  if (input.xp.level >= 5) ids.push("level_5");
  if (input.xp.steps_goal_hit) ids.push("steps_8k");
  return ids;
}

export function noSugarRun(
  days: { date: string; meals: { no_sugar: boolean }[] }[],
  today: string,
  shiftDate: (date: string, days: number) => string
): number {
  const byDate = new Map(days.map((day) => [day.date, day.meals]));
  let run = 0;
  for (let index = 0; index < 30; index += 1) {
    const date = shiftDate(today, -index);
    const meals = byDate.get(date);
    if (!meals || meals.length === 0) break;
    if (meals.some((meal) => !meal.no_sugar)) break;
    run += 1;
  }
  return run;
}
