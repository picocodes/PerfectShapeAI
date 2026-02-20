export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";
export type SubscriptionStatus = "free" | "active" | "expired" | "canceled";

export interface UserProfile {
  id: string;
  firebase_uid: string;
  email?: string | null;
  name?: string | null;
  age?: number | null;
  gender?: string | null;
  height?: number | null;
  current_weight?: number | null;
  target_weight?: number | null;
  activity_level?: ActivityLevel | null;
  country?: string | null;
  dietary_preferences?: string[];
  equipment?: string[];
  daily_availability?: number | null;
  subscription_status: SubscriptionStatus;
  credits: number;
  free_plan_used: boolean;
  created_at: FirebaseFirestore.FieldValue | Date;
}

export interface XPState {
  user_id: string;
  total_xp: number;
  level: number;
  streak_count: number;
  last_active_date?: string | null;
}
