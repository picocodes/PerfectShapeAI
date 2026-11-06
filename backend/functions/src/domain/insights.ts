export interface WeightPoint {
  local_date: string;
  weight_kg: number;
}

export interface Insight {
  id: string;
  title: string;
  body: string;
}

export function buildInsight(
  weights: WeightPoint[],
  daysBetween: (a: string, b: string) => number
): Insight | null {
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) => a.local_date.localeCompare(b.local_date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = daysBetween(first.local_date, last.local_date);
  const delta = last.weight_kg - first.weight_kg;

  if (span >= 7 && delta < -1.4) {
    const weekly = (delta / span) * 7;
    if (weekly < -1.1) {
      return {
        id: "too_fast",
        title: "Ease the pace",
        body: "The scale is dropping faster than about a kilogram a week. Eat a little closer to your target. Fast cuts are not the goal, and we will not lower the plan by more than 150 kcal."
      };
    }
  }

  const recent = sorted.filter((point) => daysBetween(point.local_date, last.local_date) <= 14);
  if (recent.length >= 4) {
    const oldest = recent[0];
    const window = daysBetween(oldest.local_date, last.local_date);
    const change = Math.abs(last.weight_kg - oldest.weight_kg);
    if (window >= 10 && change < 0.3) {
      return {
        id: "plateau",
        title: "A quiet week on the scale",
        body: "Weight has barely moved. Keep the same calorie target for another consistent week, log weekends honestly, and add a daily walk. A later tweak stays inside 100–150 kcal. No crash cuts."
      };
    }
  }

  if (delta <= -0.4) {
    return {
      id: "progress",
      title: "The line is moving",
      body: "You are down from where you started. Stay with the plan you can repeat next week."
    };
  }
  return null;
}

export interface Challenge {
  id: string;
  title: string;
  detail: string;
  done: boolean;
}

export function dailyChallenge(
  date: string,
  state: { workout_completed: boolean; steps: number; no_sugar_meals: number; meals: number }
): Challenge {
  const challenges: Challenge[] = [
    {
      id: "burn",
      title: "15-minute fat burn",
      detail: "Finish today's session. Short and sweaty still counts.",
      done: state.workout_completed
    },
    {
      id: "soda",
      title: "No soda today",
      detail: "Log what you eat and keep added sugar off the list.",
      done: state.meals > 0 && state.no_sugar_meals === state.meals
    },
    {
      id: "steps",
      title: "8k steps day",
      detail: "Get to 8,000 steps. A walk after dinner is enough to close the gap.",
      done: state.steps >= 8000
    }
  ];
  let hash = 0;
  for (const char of date) hash = (hash * 33 + char.charCodeAt(0)) % 997;
  return challenges[hash % challenges.length];
}
