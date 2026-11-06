export type DietTag = "any" | "vegan" | "vegetarian" | "keto" | "budget";

export interface MealSuggestion {
  id: string;
  slot: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  detail: string;
  calories: number;
  diets: DietTag[];
  countries: string[];
}

const INT = ["INT"];

export const MEAL_LIBRARY: MealSuggestion[] = [
  { id: "oats-berries", slot: "breakfast", name: "Oats, milk, and berries", detail: "A bowl that actually holds you until lunch.", calories: 380, diets: ["vegetarian", "budget"], countries: ["US", "CA", "GB", "AU", ...INT] },
  { id: "eggs-greens", slot: "breakfast", name: "Eggs and greens", detail: "Two eggs, spinach, and tomatoes.", calories: 320, diets: ["vegetarian", "keto"], countries: [...INT, "US", "GB", "NG", "KE"] },
  { id: "yogurt-fruit", slot: "breakfast", name: "Yogurt and fruit", detail: "Plain yogurt, banana or berries, spoon of oats.", calories: 340, diets: ["vegetarian"], countries: [...INT, "US", "EU"] },
  { id: "tofu-scramble", slot: "breakfast", name: "Tofu scramble", detail: "Tofu, pepper, onion, and a little oil.", calories: 360, diets: ["vegan"], countries: [...INT] },
  { id: "upma", slot: "breakfast", name: "Vegetable upma", detail: "Semolina, peas, carrot, and a handful of peanuts.", calories: 390, diets: ["vegan", "budget"], countries: ["IN"] },
  { id: "poha", slot: "breakfast", name: "Poha with peanuts", detail: "Flattened rice, onion, lemon, and peanuts.", calories: 360, diets: ["vegan", "budget"], countries: ["IN"] },
  { id: "porridge-ng", slot: "breakfast", name: "Pap or oats with milk", detail: "Warm pap or oats, milk, and a banana.", calories: 370, diets: ["vegetarian", "budget"], countries: ["NG", "GH"] },
  { id: "uji", slot: "breakfast", name: "Uji and a boiled egg", detail: "Fermented porridge plus an egg if you eat them.", calories: 350, diets: ["budget"], countries: ["KE"] },
  { id: "huevos", slot: "breakfast", name: "Huevos a la mexicana", detail: "Eggs, tomato, onion, and a small tortilla.", calories: 420, diets: ["vegetarian"], countries: ["MX"] },
  { id: "tapioca", slot: "breakfast", name: "Tapioca and eggs", detail: "Tapioca flatbread with eggs or cheese.", calories: 400, diets: ["vegetarian"], countries: ["BR"] },
  { id: "beans-toast", slot: "breakfast", name: "Beans on toast", detail: "One slice of bread, beans, and tomato.", calories: 360, diets: ["vegan", "budget"], countries: ["GB"] },
  { id: "turkey-box", slot: "lunch", name: "Turkey or chicken box", detail: "Lean meat, rice, and a big pile of vegetables.", calories: 560, diets: ["any"], countries: ["US", "CA", "AU", "GB"] },
  { id: "bean-chili", slot: "lunch", name: "Bean chili", detail: "Beans, tomato, pepper, and a little rice.", calories: 520, diets: ["vegan", "budget"], countries: ["US", "CA", "GB", ...INT] },
  { id: "dal-rice", slot: "lunch", name: "Dal, rice, and cucumber", detail: "A cup of dal, a modest scoop of rice, raw salad.", calories: 540, diets: ["vegan", "budget"], countries: ["IN"] },
  { id: "chana", slot: "lunch", name: "Chana masala and roti", detail: "Chickpeas and one roti. Filling, not heavy.", calories: 560, diets: ["vegan", "budget"], countries: ["IN"] },
  { id: "jollof-chicken", slot: "lunch", name: "Jollof and grilled chicken", detail: "A smaller scoop of jollof, chicken, and salad.", calories: 640, diets: ["any"], countries: ["NG", "GH"] },
  { id: "beans-plantain", slot: "lunch", name: "Beans and ripe plantain", detail: "Stewed beans with a few slices of plantain.", calories: 580, diets: ["vegan", "budget"], countries: ["NG", "GH"] },
  { id: "githeri", slot: "lunch", name: "Githeri and greens", detail: "Maize and beans with sukuma wiki.", calories: 560, diets: ["vegan", "budget"], countries: ["KE"] },
  { id: "waakye", slot: "lunch", name: "Waakye bowl", detail: "Rice and beans, egg or fish, and shredded salad.", calories: 620, diets: ["budget"], countries: ["GH"] },
  { id: "tinga", slot: "lunch", name: "Chicken tinga bowl", detail: "Shredded chicken, beans, salsa, and a small tortilla.", calories: 580, diets: ["any"], countries: ["MX"] },
  { id: "prato", slot: "lunch", name: "Rice, beans, and salad", detail: "The Brazilian plate, with chicken or eggs and extra salad.", calories: 600, diets: ["budget"], countries: ["BR"] },
  { id: "tinola", slot: "lunch", name: "Chicken tinola", detail: "Ginger chicken soup, greens, and a half cup of rice.", calories: 520, diets: ["any"], countries: ["PH"] },
  { id: "lentil-soup", slot: "lunch", name: "Lentil soup and bread", detail: "A deep bowl of lentils and one slice of bread.", calories: 480, diets: ["vegan", "budget"], countries: ["GB", "US", ...INT] },
  { id: "salmon-plate", slot: "dinner", name: "Fish, potato, and greens", detail: "Grilled fish, a small potato, and a heap of vegetables.", calories: 560, diets: ["any", "keto"], countries: [...INT, "US", "GB", "KE"] },
  { id: "tofu-stir", slot: "dinner", name: "Tofu vegetable stir-fry", detail: "Tofu, cabbage, pepper, and a modest scoop of rice.", calories: 520, diets: ["vegan"], countries: [...INT, "US", "PH"] },
  { id: "chicken-salad", slot: "dinner", name: "Big chicken salad", detail: "Chicken, leaves, cucumber, olive oil, and lemon.", calories: 480, diets: ["keto", "any"], countries: [...INT] },
  { id: "red-red", slot: "dinner", name: "Red red", detail: "Black-eyed peas in tomato sauce with a little plantain.", calories: 590, diets: ["vegan", "budget"], countries: ["GH"] },
  { id: "suya-salad", slot: "dinner", name: "Suya spice chicken and salad", detail: "Grilled spiced chicken, onions, tomato, and cucumber.", calories: 510, diets: ["keto", "any"], countries: ["NG"] },
  { id: "egg-bhurji", slot: "dinner", name: "Egg bhurji and roti", detail: "Spiced scrambled eggs and one roti.", calories: 500, diets: ["vegetarian"], countries: ["IN"] },
  { id: "moimoi-fish", slot: "dinner", name: "Moi moi and grilled fish", detail: "Steamed bean pudding with fish and a side salad.", calories: 540, diets: ["any"], countries: ["NG"] },
  { id: "tortang", slot: "dinner", name: "Tortang talong and rice", detail: "Eggplant omelette and a smaller scoop of rice.", calories: 480, diets: ["vegetarian"], countries: ["PH"] },
  { id: "snack-fruit", slot: "snack", name: "Fruit and peanuts", detail: "A piece of fruit and a small handful of peanuts.", calories: 220, diets: ["vegan", "budget"], countries: [...INT] },
  { id: "snack-yogurt", slot: "snack", name: "Yogurt cup", detail: "Plain yogurt. Add cinnamon if you want it to feel like dessert.", calories: 150, diets: ["vegetarian"], countries: [...INT] },
  { id: "snack-egg", slot: "snack", name: "Boiled eggs", detail: "Two eggs and a pinch of salt.", calories: 160, diets: ["vegetarian", "keto"], countries: [...INT] },
  { id: "snack-avocado", slot: "snack", name: "Avocado and tomato", detail: "Half an avocado, tomato, lemon, salt.", calories: 200, diets: ["vegan", "keto"], countries: ["KE", "MX", "US", ...INT] },
  { id: "tofu-greens", slot: "dinner", name: "Tofu and leafy greens", detail: "Crisped tofu, olive oil, and a large salad. Low carb and fully plant-based.", calories: 460, diets: ["vegan", "keto"], countries: [...INT] },
  { id: "egg-avocado", slot: "breakfast", name: "Eggs and avocado", detail: "Two eggs and half an avocado.", calories: 380, diets: ["vegetarian", "keto"], countries: [...INT, "US", "MX", "KE"] }
];

const COUNTRY_CODES: Record<string, string> = {
  us: "US",
  usa: "US",
  "united states": "US",
  america: "US",
  uk: "GB",
  gb: "GB",
  "united kingdom": "GB",
  britain: "GB",
  england: "GB",
  nigeria: "NG",
  ng: "NG",
  india: "IN",
  in: "IN",
  kenya: "KE",
  ke: "KE",
  ghana: "GH",
  gh: "GH",
  mexico: "MX",
  mx: "MX",
  brazil: "BR",
  br: "BR",
  philippines: "PH",
  ph: "PH",
  canada: "CA",
  ca: "CA",
  australia: "AU",
  au: "AU",
  "south africa": "ZA",
  za: "ZA"
};

export function countryCode(input: string | null | undefined): string {
  if (!input) return "INT";
  const key = input.trim().toLowerCase();
  if (COUNTRY_CODES[key]) return COUNTRY_CODES[key];
  if (/^[a-z]{2}$/i.test(key)) return key.toUpperCase();
  return "INT";
}

function dietMatch(item: MealSuggestion, preferences: string[]): boolean {
  const prefs = new Set(preferences.map((entry) => entry.toLowerCase()));
  prefs.delete("none");
  const tags = new Set(item.diets);
  if (prefs.has("vegan") && !tags.has("vegan")) return false;
  if (prefs.has("vegetarian") && !prefs.has("vegan") && !(tags.has("vegetarian") || tags.has("vegan"))) return false;
  if (prefs.has("keto") && !tags.has("keto")) return false;
  return true;
}

export function suggestMeals(country: string | null, preferences: string[], limit = 4): MealSuggestion[] {
  const code = countryCode(country);
  const filtered = MEAL_LIBRARY.filter((item) => dietMatch(item, preferences));
  const local = filtered.filter((item) => item.countries.includes(code));
  const pool = local.length >= 3 ? local : filtered.filter((item) => item.countries.includes(code) || item.countries.includes("INT"));
  const source = (pool.length > 0 ? pool : filtered).slice().sort((a, b) => {
    if (!preferences.map((entry) => entry.toLowerCase()).includes("budget")) return 0;
    return Number(b.diets.includes("budget")) - Number(a.diets.includes("budget"));
  });
  const slots: MealSuggestion["slot"][] = ["breakfast", "lunch", "dinner", "snack"];
  const picked: MealSuggestion[] = [];
  for (const slot of slots) {
    const found = source.find((item) => item.slot === slot && !picked.includes(item));
    if (found) picked.push(found);
  }
  for (const item of source) {
    if (picked.length >= limit) break;
    if (!picked.includes(item)) picked.push(item);
  }
  return picked.slice(0, limit);
}
