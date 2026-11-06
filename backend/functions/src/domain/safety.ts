const CRISIS = [
  /suicid/i,
  /kill myself/i,
  /self[- ]harm/i,
  /want to die/i,
  /end my life/i
];

const UNSAFE_REPLY = [
  /pro-?ana/i,
  /\bstarv(e|ing|ation)\b/i,
  /\bpurge\b/i,
  /laxative/i,
  /empty stomach/i,
  /you (don't|do not) deserve (food|to eat)/i,
  /skip (all )?(meals|eating)/i
];

export const HEALTH_DISCLAIMER =
  "PerfectShape AI is a fitness and habit coach, not a medical service. It does not diagnose, treat, or prescribe. Talk with a qualified clinician before changing diet or exercise, especially if you are pregnant, under 18, or managing a health condition.";

export const COACH_SYSTEM_PROMPT = [
  "You are a certified home fitness and nutrition coach focused on safe, sustainable weight loss without gym equipment.",
  "No extreme calorie cuts, no medical claims, no eating disorder language.",
  "Adjust calories only by 100-150 kcal when a change is truly useful, and never recommend intake under the calorie floor you are given.",
  "Do not tell anyone to purge, starve, skip meals, or use laxatives.",
  "If BMI is under 18.5 or at least 40, encourage a conversation with a clinician.",
  "Use a playful, encouraging tone. Keep replies under 120 words.",
  "Never claim to be a doctor. Invite medical care for pain, dizziness, pregnancy, or disordered eating.",
  HEALTH_DISCLAIMER
].join(" ");

export function crisisReply(message: string): string | null {
  if (!CRISIS.some((pattern) => pattern.test(message))) return null;
  return [
    "I'm glad you said something. I'm a workout coach, not a crisis service, and you deserve real help right now.",
    "If you might act on these thoughts, contact local emergency services.",
    "In the US, call or text 988 (Suicide & Crisis Lifeline). If you're elsewhere, use the IASP site at https://www.iasp.info/suicidalthoughts/ to find a local line.",
    "When you're safe, you can come back and we'll keep the plan gentle."
  ].join(" ");
}

export function replyLooksUnsafe(text: string): boolean {
  return UNSAFE_REPLY.some((pattern) => pattern.test(text));
}

export function fallbackCoach(input: {
  name: string | null;
  message: string;
  streak: number;
  workoutName: string | null;
  caloriesLeft: number | null;
  mood: number | null;
  caution: string | null;
}): string {
  const who = input.name?.trim() || "friend";
  const lowMood = (input.mood ?? 3) <= 2;
  if (lowMood) {
    return `${who}, low days still count. Do the short mobility session, drink a glass of water, and leave the streak in one piece. You don't have to be impressive today.`;
  }
  if (/hungry|snack|crav/i.test(input.message)) {
    return `${who}, eat a real snack: protein plus fruit or yogurt. Hunger is a signal, not a failure. ${input.caloriesLeft != null ? `You have about ${input.caloriesLeft} kcal left in today's target.` : "Stay near today's target."}`;
  }
  if (/hard|tired|sore|easy/i.test(input.message)) {
    return `${who}, sore means we adjust, not that we quit. ${input.workoutName ? `Today is ${input.workoutName}. ` : ""}Make the next round slower, or take the gentler session. Consistency beats heroics.`;
  }
  const streakLine = input.streak > 0 ? `You're on a ${input.streak}-day streak. Protect it with one honest log.` : "Log one meal or finish the session and the streak starts.";
  const caution = input.caution ? ` ${input.caution}` : "";
  return `${who}, ${streakLine} Keep portions steady and the workout short enough to repeat tomorrow.${caution}`;
}
