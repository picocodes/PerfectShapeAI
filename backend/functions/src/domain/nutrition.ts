export type Gender = "female" | "male" | "other";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export interface BodyProfile {
  gender: Gender;
  age: number;
  height_cm: number;
  weight_kg: number;
  target_weight_kg: number;
  activity_level: ActivityLevel;
}

export interface CaloriePlan {
  bmr: number;
  tdee: number;
  target: number;
  deficit: number;
  bmi: number;
  floor: number;
  caution: string | null;
}

const ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725
};

export function bmi(weightKg: number, heightCm: number): number {
  const meters = heightCm / 100;
  return weightKg / (meters * meters);
}

export function bmr(profile: Pick<BodyProfile, "gender" | "weight_kg" | "height_cm" | "age">): number {
  const base = 10 * profile.weight_kg + 6.25 * profile.height_cm - 5 * profile.age;
  if (profile.gender === "male") return base + 5;
  if (profile.gender === "female") return base - 161;
  return base - 78;
}

export function calorieFloor(gender: Gender): number {
  if (gender === "female") return 1400;
  if (gender === "male") return 1600;
  return 1500;
}

/**
 * Steady loss only. Deficits stay at or under 500 kcal and targets never drop below a sex-aware floor.
 * Very low or very high BMI adds a clinician note instead of a more aggressive plan.
 */
export function planCalories(profile: BodyProfile): CaloriePlan {
  const personBmr = bmr(profile);
  const tdee = personBmr * ACTIVITY[profile.activity_level];
  const personBmi = bmi(profile.weight_kg, profile.height_cm);
  const floor = calorieFloor(profile.gender);
  const maintaining = profile.target_weight_kg >= profile.weight_kg - 0.4;

  let caution: string | null = null;
  let deficit = 0;

  if (personBmi < 18.5) {
    caution = "Your BMI is below the usual range. This plan holds maintenance calories. Please talk with a clinician before trying to lose weight.";
    deficit = 0;
  } else if (maintaining) {
    deficit = 0;
  } else if (personBmi >= 40) {
    caution = "A clinician is the right partner at this BMI. The deficit stays modest — never more than 500 kcal.";
    deficit = Math.min(500, Math.round(tdee * 0.15));
  } else {
    deficit = Math.min(500, Math.max(250, Math.round(tdee * 0.15)));
  }

  let target = Math.round(tdee - deficit);
  if (target < floor) {
    target = floor;
    deficit = Math.max(0, Math.round(tdee - target));
  }

  return {
    bmr: Math.round(personBmr),
    tdee: Math.round(tdee),
    target,
    deficit,
    bmi: Math.round(personBmi * 10) / 10,
    floor,
    caution
  };
}

/** AI may suggest a change. We keep it inside ±150 kcal and above the floor. */
export function clampCalorieAdjustment(current: number, proposed: number, floor: number): number {
  const delta = Math.max(-150, Math.min(150, proposed - current));
  return Math.max(floor, Math.round(current + delta));
}

export interface ScaleEstimate {
  delta_kg: number;
  fat_low_kg: number | null;
  fat_high_kg: number | null;
  note: string;
}

export function scaleEstimate(startKg: number, currentKg: number): ScaleEstimate {
  const delta = Math.round((currentKg - startKg) * 10) / 10;
  if (delta <= -0.3) {
    const lost = -delta;
    return {
      delta_kg: delta,
      fat_low_kg: Math.round(lost * 0.7 * 10) / 10,
      fat_high_kg: Math.round(lost * 0.85 * 10) / 10,
      note: "A rough share of steady scale loss is body fat, often about 70–85%. Water, food, and hormones move the scale too. This is not a body-fat test."
    };
  }
  if (delta >= 0.3) {
    return {
      delta_kg: delta,
      fat_low_kg: null,
      fat_high_kg: null,
      note: "The scale is up. A single rise is often water or a later meal. Use the weekly line, not one morning."
    };
  }
  return {
    delta_kg: delta,
    fat_low_kg: null,
    fat_high_kg: null,
    note: "Weight is steady. That can still hide fat loss if measurements or photos are changing."
  };
}
