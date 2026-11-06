export function interpretFeedback(feedback: string): { delta: number; summary: string } {
  const text = feedback.toLowerCase();
  if (/hungry|tired|low energy|too hard|sore|dizzy/.test(text)) {
    return { delta: 100, summary: "Adding about 100 kcal so this week is easier to repeat." };
  }
  if (/too easy|plateau|stuck|no change/.test(text)) {
    return { delta: -100, summary: "Trimming about 100 kcal. That is the biggest step we'll take." };
  }
  return { delta: 0, summary: "Keeping the calorie target steady and letting the training plan stand." };
}

export function parseCalorieDelta(text: string): { delta: number; summary: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[0]) as { calorie_delta?: unknown; summary?: unknown };
    const delta = Number(data.calorie_delta);
    if (!Number.isFinite(delta)) return null;
    const summary = String(data.summary ?? "").trim().slice(0, 280);
    return { delta: Math.max(-150, Math.min(150, Math.round(delta))), summary };
  } catch {
    return null;
  }
}

export function parseMealPhoto(text: string): { is_food: boolean; name: string; calories: number; note: string } {
  const match = text.match(/\{[\s\S]*\}/);
  const fallback = {
    is_food: false,
    name: "Meal",
    calories: 0,
    note: "We couldn't read that photo. Log the meal yourself — the number is only an estimate anyway."
  };
  if (!match) return fallback;
  try {
    const data = JSON.parse(match[0]) as { is_food?: unknown; name?: unknown; calories?: unknown; note?: unknown };
    if (!data.is_food) {
      return { is_food: false, name: "Not a meal", calories: 0, note: "That doesn't look like food. Try a clearer photo of the plate." };
    }
    return {
      is_food: true,
      name: String(data.name || "Meal").slice(0, 80),
      calories: Math.max(0, Math.min(2000, Math.round(Number(data.calories) || 0))),
      note: String(data.note || "Estimate only. Change the number before you save it.").slice(0, 240)
    };
  } catch {
    return fallback;
  }
}
