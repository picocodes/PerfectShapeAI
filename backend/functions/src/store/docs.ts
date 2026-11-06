import type { DayPlan } from "../domain/plans.js";
import type { XpState } from "../domain/xp.js";

export interface UserDoc {
  id: string;
  email: string | null;
  name: string | null;
  age: number | null;
  gender: "female" | "male" | "other" | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  target_weight_kg: number | null;
  start_weight_kg: number | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | null;
  country: string | null;
  dietary_preferences: string[];
  equipment: string[];
  daily_minutes: 15 | 30 | 45 | null;
  units: "metric" | "imperial";
  water_reminders: boolean;
  streak_reminders: boolean;
  disclaimer_accepted: boolean;
  timezone: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeightDoc {
  id: string;
  user_id: string;
  weight_kg: number;
  waist_cm: number | null;
  local_date: string;
  logged_at: string;
}

export interface MealDoc {
  id: string;
  user_id: string;
  name: string;
  calories: number;
  no_sugar: boolean;
  source: "manual" | "photo";
  local_date: string;
  logged_at: string;
}

export interface WorkoutLogDoc {
  id: string;
  user_id: string;
  workout_id: string;
  local_date: string;
  duration_sec: number;
  completed_at: string;
}

export interface DailyDoc {
  id: string;
  user_id: string;
  date: string;
  calories_consumed: number;
  workout_completed: boolean;
  mood: number | null;
  water_ml: number;
  steps: number;
  gentler: boolean;
  events: string[];
}

export interface XpDoc extends XpState {
  user_id: string;
}

export interface AchievementDoc {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
}

export interface PlanDoc {
  id: string;
  user_id: string;
  week_id: string;
  variant: number;
  calorie_target: number;
  caution: string | null;
  bmi: number;
  days: DayPlan[];
  created_at: string;
}

export interface SubscriptionDoc {
  user_id: string;
  status: "active" | "grace" | "canceled" | "expired" | "free";
  product_id: string | null;
  platform: "apple" | "google" | null;
  expires_at: string | null;
  original_transaction_id: string | null;
  latest_transaction_id: string | null;
  purchase_token: string | null;
  environment: string | null;
  updated_at: string;
}

export interface ReceiptClaimDoc {
  id: string;
  user_id: string;
  platform: "apple" | "google";
  created_at: string;
}

export interface ConversationDoc {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  text: string;
  source: "cloud" | "fallback" | "crisis";
  created_at: string;
  context_snapshot: Record<string, unknown> | null;
}

export interface QuotaDoc {
  id: string;
  count: number;
  date: string;
  user_id?: string;
  install_id?: string;
  tokens_in?: number;
  tokens_out?: number;
}

export function emptyDaily(userId: string, date: string): DailyDoc {
  return {
    id: `${userId}_${date}`,
    user_id: userId,
    date,
    calories_consumed: 0,
    workout_completed: false,
    mood: null,
    water_ml: 0,
    steps: 0,
    gentler: false,
    events: []
  };
}

export function freshUser(id: string, email: string | null, now: string): UserDoc {
  return {
    id,
    email,
    name: null,
    age: null,
    gender: null,
    height_cm: null,
    current_weight_kg: null,
    target_weight_kg: null,
    start_weight_kg: null,
    activity_level: null,
    country: null,
    dietary_preferences: [],
    equipment: [],
    daily_minutes: null,
    units: "metric",
    water_reminders: false,
    streak_reminders: true,
    disclaimer_accepted: false,
    timezone: "UTC",
    onboarding_complete: false,
    created_at: now,
    updated_at: now
  };
}
