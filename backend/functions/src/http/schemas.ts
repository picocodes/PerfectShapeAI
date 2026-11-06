import { z } from "zod";

export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(40).optional(),
    age: z.number().int().min(16).max(90).optional(),
    gender: z.enum(["female", "male", "other"]).optional(),
    height_cm: z.number().min(120).max(230).optional(),
    current_weight_kg: z.number().min(35).max(300).optional(),
    target_weight_kg: z.number().min(35).max(300).optional(),
    activity_level: z.enum(["sedentary", "light", "moderate", "active"]).optional(),
    country: z.string().trim().min(2).max(56).optional(),
    dietary_preferences: z.array(z.enum(["vegan", "vegetarian", "keto", "budget", "none"])).max(5).optional(),
    equipment: z.array(z.enum(["none", "dumbbells", "bands", "rope", "resistance bands", "skipping rope"])).max(4).optional(),
    daily_minutes: z.union([z.literal(15), z.literal(30), z.literal(45)]).optional(),
    units: z.enum(["metric", "imperial"]).optional(),
    water_reminders: z.boolean().optional(),
    streak_reminders: z.boolean().optional(),
    disclaimer_accepted: z.boolean().optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    local_date: z.string().optional()
  })
  .strict();

export const weightSchema = z
  .object({
    local_date: z.string(),
    weight_kg: z.number().min(35).max(300),
    waist_cm: z.number().min(40).max(200).nullable().optional()
  })
  .strict();

export const workoutSchema = z
  .object({
    local_date: z.string(),
    workout_id: z.string().min(1).max(80),
    duration_sec: z.number().int().min(0).max(7200)
  })
  .strict();

export const mealSchema = z
  .object({
    local_date: z.string(),
    name: z.string().trim().min(1).max(80),
    calories: z.number().int().min(0).max(2500),
    no_sugar: z.boolean(),
    source: z.enum(["manual", "photo"]).optional()
  })
  .strict();

export const waterSchema = z.object({ local_date: z.string(), ml: z.number().int().min(50).max(1000) }).strict();
export const moodSchema = z.object({ local_date: z.string(), mood: z.number().int().min(1).max(5) }).strict();
export const stepsSchema = z.object({ local_date: z.string(), steps: z.number().int().min(0).max(150_000) }).strict();
export const dateBodySchema = z.object({ local_date: z.string() }).strict();

export const coachSchema = z
  .object({
    local_date: z.string(),
    message: z.string().trim().min(1).max(800)
  })
  .strict();

export const adjustSchema = z
  .object({
    local_date: z.string(),
    feedback: z.string().trim().min(1).max(500)
  })
  .strict();

export const photoSchema = z
  .object({
    local_date: z.string(),
    image_base64: z.string().min(8).max(2_200_000),
    media_type: z.enum(["image/jpeg", "image/png", "image/webp"])
  })
  .strict();

export const appleSchema = z.object({ signed_transaction: z.string().min(20).max(20_000) }).strict();
export const googleSchema = z
  .object({
    purchase_token: z.string().min(8).max(4096),
    product_id: z.string().min(3).max(120)
  })
  .strict();

export const refreshSchema = z.object({ signed_transaction: z.string().min(20).max(20_000).optional() }).strict();
export const deleteSchema = z.object({ confirm: z.string() }).strict();
