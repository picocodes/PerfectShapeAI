import type { ActivityLevel, Gender } from "./nutrition.js";
import { weekdayKey } from "./dates.js";

export interface PlanExercise {
  id: string;
  name: string;
  cue: string;
  seconds: number;
  rest_seconds: number;
}

export interface DayPlan {
  id: string;
  weekday: string;
  name: string;
  focus: "strength" | "cardio" | "mobility" | "core";
  minutes: number;
  exercises: PlanExercise[];
  habit: string;
}

export interface Move {
  id: string;
  name: string;
  cue: string;
  focus: DayPlan["focus"] | "any";
  equipment: "bodyweight" | "dumbbells" | "bands" | "rope";
}

const MOVES: Move[] = [
  { id: "squat", name: "Bodyweight squat", cue: "Sit back, heels heavy, chest proud.", focus: "strength", equipment: "bodyweight" },
  { id: "pushup", name: "Incline push-up", cue: "Hands on a counter. Body in one line.", focus: "strength", equipment: "bodyweight" },
  { id: "bridge", name: "Glute bridge", cue: "Pause at the top and squeeze.", focus: "strength", equipment: "bodyweight" },
  { id: "lunge", name: "Reverse lunge", cue: "Step back, front knee tracks the toes.", focus: "strength", equipment: "bodyweight" },
  { id: "row-towel", name: "Towel row", cue: "Loop a towel under a table and pull your chest through.", focus: "strength", equipment: "bodyweight" },
  { id: "dip", name: "Chair dip", cue: "Shoulders down. Bend the elbows, don't shrug.", focus: "strength", equipment: "bodyweight" },
  { id: "calf", name: "Calf raise", cue: "Slow up, slower down.", focus: "strength", equipment: "bodyweight" },
  { id: "jack", name: "Low-impact jack", cue: "Step out and tap the arms overhead.", focus: "cardio", equipment: "bodyweight" },
  { id: "march", name: "Fast march", cue: "Drive the knees, swing the arms.", focus: "cardio", equipment: "bodyweight" },
  { id: "skater", name: "Skater step", cue: "Soft landing. Stay low.", focus: "cardio", equipment: "bodyweight" },
  { id: "climber", name: "Slow mountain climber", cue: "Hands planted, pull one knee in at a time.", focus: "cardio", equipment: "bodyweight" },
  { id: "walkout", name: "Walk-out", cue: "Walk the hands out, then back to standing.", focus: "cardio", equipment: "bodyweight" },
  { id: "deadbug", name: "Dead bug", cue: "Low back kisses the floor.", focus: "core", equipment: "bodyweight" },
  { id: "bird", name: "Bird dog", cue: "Reach long. Hips stay square.", focus: "core", equipment: "bodyweight" },
  { id: "plank", name: "Forearm plank", cue: "Ribs tucked, breathe.", focus: "core", equipment: "bodyweight" },
  { id: "sideplank", name: "Side plank", cue: "Knees down is completely fine.", focus: "core", equipment: "bodyweight" },
  { id: "hollow", name: "Heel tap", cue: "Reach side to side without rocking.", focus: "core", equipment: "bodyweight" },
  { id: "catcow", name: "Cat-cow", cue: "Move with the breath.", focus: "mobility", equipment: "bodyweight" },
  { id: "world", name: "World's greatest stretch", cue: "Lunge, elbow to instep, reach up.", focus: "mobility", equipment: "bodyweight" },
  { id: "hip", name: "90/90 hip switch", cue: "Sit tall and rotate both knees.", focus: "mobility", equipment: "bodyweight" },
  { id: "thread", name: "Thread the needle", cue: "Reach under the arm and open the chest.", focus: "mobility", equipment: "bodyweight" },
  { id: "superman", name: "Superman hold", cue: "Lift hands and chest an inch. Neck long.", focus: "mobility", equipment: "bodyweight" },
  { id: "goblet", name: "Goblet squat", cue: "Hold one dumbbell at the chest.", focus: "strength", equipment: "dumbbells" },
  { id: "dbrow", name: "One-arm dumbbell row", cue: "Support on a chair. Pull to the hip.", focus: "strength", equipment: "dumbbells" },
  { id: "rdl", name: "Dumbbell hip hinge", cue: "Soft knees, push the hips back.", focus: "strength", equipment: "dumbbells" },
  { id: "press", name: "Dumbbell shoulder press", cue: "Stand tall. Don't lean back.", focus: "strength", equipment: "dumbbells" },
  { id: "bandrow", name: "Band row", cue: "Elbows skim the ribs.", focus: "strength", equipment: "bands" },
  { id: "bandpull", name: "Band pull-apart", cue: "Straight arms, squeeze the shoulder blades.", focus: "strength", equipment: "bands" },
  { id: "bandpress", name: "Band chest press", cue: "Anchor the band and press forward.", focus: "strength", equipment: "bands" },
  { id: "rope", name: "Easy rope skips", cue: "Bounce quietly. March in place if you miss.", focus: "cardio", equipment: "rope" },
  { id: "ropeslow", name: "Rope singles", cue: "One jump, one turn. Rest when form goes.", focus: "cardio", equipment: "rope" }
];

const DAY_BLUEPRINT: { weekday: DayPlan["weekday"]; name: string; focus: DayPlan["focus"]; habit: string }[] = [
  { weekday: "mon", name: "Lower strength", focus: "strength", habit: "Put your shoes where you can see them tonight." },
  { weekday: "tue", name: "Brisk cardio", focus: "cardio", habit: "Take a ten-minute walk after the biggest meal." },
  { weekday: "wed", name: "Upper strength", focus: "strength", habit: "Fill a bottle and finish it by dinner." },
  { weekday: "thu", name: "Easy mobility", focus: "mobility", habit: "Lights dimmer 30 minutes earlier." },
  { weekday: "fri", name: "Full body", focus: "strength", habit: "Plate vegetables first." },
  { weekday: "sat", name: "Core and steps", focus: "core", habit: "Hit a step goal without turning it into punishment." },
  { weekday: "sun", name: "Reset", focus: "mobility", habit: "Write tomorrow's first meal before bed." }
];

function allowedEquipment(equipment: string[]): Set<Move["equipment"]> {
  const tags = new Set(equipment.map((item) => item.toLowerCase()));
  const allowed = new Set<Move["equipment"]>(["bodyweight"]);
  if (tags.has("dumbbells")) allowed.add("dumbbells");
  if (tags.has("bands") || tags.has("resistance bands")) allowed.add("bands");
  if (tags.has("skipping rope") || tags.has("rope")) allowed.add("rope");
  return allowed;
}

function hashWeek(weekId: string, variant: number): number {
  let hash = variant + 1;
  for (const char of weekId) hash = (hash * 31 + char.charCodeAt(0)) % 10007;
  return hash;
}

export function gentlerDay(_weekId: string, date: string): DayPlan {
  const picks = ["catcow", "hip", "thread", "bird", "deadbug", "superman", "bridge", "world"];
  return assembleDay({
    id: "gentler",
    weekday: weekdayKey(date),
    name: "Gentler session",
    focus: "mobility",
    minutes: 12,
    habit: "Doing the easy version keeps the streak honest.",
    moves: picks.map((id) => MOVES.find((move) => move.id === id)!),
    weekSalt: 1
  });
}

export function buildWeek(input: {
  weekId: string;
  variant: number;
  minutes: 15 | 30 | 45;
  equipment: string[];
}): DayPlan[] {
  const allowed = allowedEquipment(input.equipment);
  const salt = hashWeek(input.weekId, input.variant);
  return DAY_BLUEPRINT.map((blueprint, index) => {
    const pool = MOVES.filter((move) => allowed.has(move.equipment) && (move.focus === blueprint.focus || move.focus === "any"));
    const fallback = MOVES.filter((move) => move.equipment === "bodyweight" && (move.focus === blueprint.focus || move.focus === "core"));
    const source = pool.length >= 4 ? pool : [...pool, ...fallback];
    const count = input.minutes === 15 ? 5 : input.minutes === 30 ? 7 : 9;
    const chosen: Move[] = [];
    for (let step = 0; step < count; step += 1) {
      const move = source[(salt + index * 3 + step * 2) % source.length];
      if (!chosen.find((item) => item.id === move.id)) chosen.push(move);
    }
    while (chosen.length < Math.min(count, source.length)) {
      const move = source[chosen.length % source.length];
      if (!chosen.find((item) => item.id === move.id)) chosen.push(move);
      else break;
    }
    const minutes = blueprint.focus === "mobility" ? Math.min(input.minutes, input.minutes === 15 ? 15 : 20) : input.minutes;
    return assembleDay({
      id: `${input.weekId}_${blueprint.weekday}`,
      weekday: blueprint.weekday,
      name: blueprint.name,
      focus: blueprint.focus,
      minutes,
      habit: blueprint.habit,
      moves: chosen,
      weekSalt: salt + index
    });
  });
}

function assembleDay(input: {
  id: string;
  weekday: string;
  name: string;
  focus: DayPlan["focus"];
  minutes: number;
  habit: string;
  moves: Move[];
  weekSalt: number;
}): DayPlan {
  const budget = Math.max(180, input.minutes * 60);
  const rest = input.focus === "mobility" ? 10 : input.focus === "cardio" ? 15 : 20;
  const workEach = Math.max(25, Math.floor((budget - rest * input.moves.length) / Math.max(1, input.moves.length)));
  let exercises: PlanExercise[] = input.moves.map((move, index) => ({
    id: `${move.id}-${index}`,
    name: move.name,
    cue: move.cue,
    seconds: input.focus === "mobility" ? Math.min(workEach, 40) : Math.min(workEach, 50),
    rest_seconds: rest
  }));
  let total = exercises.reduce((sum, exercise) => sum + exercise.seconds + exercise.rest_seconds, 0);
  while (total > budget + 20 && exercises.length > 3) {
    exercises = exercises.slice(0, -1);
    total = exercises.reduce((sum, exercise) => sum + exercise.seconds + exercise.rest_seconds, 0);
  }
  return {
    id: input.id,
    weekday: input.weekday,
    name: input.name,
    focus: input.focus,
    minutes: Math.max(8, Math.round(total / 60)),
    exercises,
    habit: input.habit
  };
}

export interface WeeklyPlan {
  week_id: string;
  variant: number;
  calorie_target: number;
  caution: string | null;
  bmi: number;
  days: DayPlan[];
}

export function dayForDate(plan: WeeklyPlan, date: string, gentler: boolean): DayPlan {
  if (gentler) return gentlerDay(plan.week_id, date);
  const key = weekdayKey(date);
  return plan.days.find((day) => day.weekday === key) ?? plan.days[0];
}

export type PlanUser = {
  gender: Gender;
  activity_level: ActivityLevel;
  equipment: string[];
  daily_minutes: 15 | 30 | 45;
};
