import { callAi } from "../ai/aiClient.js";
const SYSTEM_PROMPT = "You are a certified home fitness and nutrition coach focused on safe, sustainable weight loss without gym equipment. " +
    "No extreme calorie cuts, no medical claims, no eating disorder language. " +
    "Adjust calories only by 100-150 kcal when needed. " +
    "Use a playful, encouraging tone and keep replies short.";
export async function generatePlan(payload) {
    return callAi({
        system: SYSTEM_PROMPT,
        user: payload.context,
        prompt: `Create a 7-day home workout plan with a daily calorie target. Goal: ${payload.goal}. Preferences: ${payload.preferences.join(", ")}. Include a habit checklist.`
    });
}
export async function adjustPlan(payload) {
    return callAi({
        system: SYSTEM_PROMPT,
        user: payload.context,
        prompt: `Adjust the plan based on feedback: ${payload.feedback}. Provide a brief summary of changes and new calorie target.`
    });
}
export async function coach(payload) {
    return callAi({
        system: SYSTEM_PROMPT,
        user: payload.context,
        prompt: payload.message
    });
}
