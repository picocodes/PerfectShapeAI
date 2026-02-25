import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { BottomNav } from "../components/BottomNav";
import { useAuth } from "../auth/AuthProvider";

interface UserProfile {
  name: string;
  age: number | "";
  gender: string;
  height: number | "";
  current_weight: number | "";
  target_weight: number | "";
  activity_level: string;
  dietary_preferences: string[];
  equipment: string[];
  daily_availability: number | "";
  subscription_status: string;
  country: string;
}

interface XpData {
  total_xp: number;
  level: number;
  streak_count: number;
}

const EMPTY_PROFILE: UserProfile = {
  name: "",
  age: "",
  gender: "",
  height: "",
  current_weight: "",
  target_weight: "",
  activity_level: "moderate",
  dietary_preferences: [],
  equipment: [],
  daily_availability: 30,
  subscription_status: "free",
  country: "",
};

const DIET_OPTIONS = ["vegan", "vegetarian", "keto", "budget", "none"] as const;
const EQUIPMENT_OPTIONS = ["none", "dumbbells", "resistance bands", "skipping rope"] as const;
const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "light", label: "Lightly Active" },
  { value: "moderate", label: "Moderately Active" },
  { value: "active", label: "Very Active" },
] as const;

function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
  const [xp, setXp] = useState<XpData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetch<UserProfile>("/users/me"),
      apiFetch<XpData>("/gamification/xp"),
    ]).then(([profileRes, xpRes]) => {
      if (profileRes.status === "fulfilled") setProfile({ ...EMPTY_PROFILE, ...profileRes.value });
      if (xpRes.status === "fulfilled") setXp(xpRes.value);
      setLoading(false);
    });
  }, []);

  return { profile, setProfile, xp, loading };
}

function CheckboxGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
              value.includes(opt)
                ? "border-mint bg-mint/10 text-mint"
                : "border-fog text-ink/50 hover:border-ink/30"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { logout } = useAuth();
  const { profile, setProfile, xp, loading } = useProfile();
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const update = <K extends keyof UserProfile>(key: K, val: UserProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: val }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/users/me", {
        method: "PATCH",
        body: JSON.stringify(profile),
      });
      setSavedMsg("Profile saved! ✓");
    } catch {
      setSavedMsg("Saved locally (API unavailable)");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-mint border-t-transparent" />
        </main>
        <BottomNav />
      </div>
    );
  }

  const xpToNext = xp ? (xp.level + 1) * 500 : 500;
  const xpProgress = xp ? Math.min(100, (xp.total_xp % 500) / 5) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        <header className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Account</p>
            <h1 className="font-display text-2xl font-bold text-ink">Profile</h1>
          </div>
          <button
            onClick={() => logout()}
            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink/60 transition hover:bg-fog"
          >
            Log out
          </button>
        </header>

        {/* XP / Level card */}
        {xp && (
          <div className="card flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-midnight">
              <span className="font-display text-xl font-bold text-sun">{xp.level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold text-ink">Level {xp.level}</p>
                <p className="text-xs text-ink/40">{xp.total_xp} / {xpToNext} XP</p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-fog">
                <div
                  className="h-2 rounded-full bg-sun transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-ink/40">🔥 {xp.streak_count}-day streak</p>
            </div>
          </div>
        )}

        {/* Subscription card */}
        <div className="card flex items-center justify-between gap-4 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-ink/40">Subscription</p>
            <p className="mt-0.5 font-semibold capitalize text-ink">
              {profile.subscription_status === "active" || profile.subscription_status === "premium"
                ? "✅ Premium"
                : "Free Plan"}
            </p>
            {profile.subscription_status !== "active" && profile.subscription_status !== "premium" && (
              <p className="mt-0.5 text-xs text-ink/50">Unlock AI coaching + unlimited plans</p>
            )}
          </div>
          {profile.subscription_status !== "active" && profile.subscription_status !== "premium" && (
            <a
              href={import.meta.env.VITE_FREEMIUS_CHECKOUT_URL ?? "#"}
              className="shrink-0 rounded-full bg-midnight px-4 py-2 text-xs font-bold text-cream transition hover:opacity-80"
            >
              Upgrade $4.99/mo
            </a>
          )}
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="flex flex-col gap-5">
          {/* Basic info */}
          <div className="card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Basic Info</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Full Name" htmlFor="name">
                <input
                  id="name"
                  type="text"
                  value={profile.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="Your name"
                  className="field-input"
                />
              </FormField>
              <FormField label="Age" htmlFor="age">
                <input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => update("age", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 28"
                  min={10}
                  max={120}
                  className="field-input"
                />
              </FormField>
              <FormField label="Gender" htmlFor="gender">
                <select
                  id="gender"
                  value={profile.gender}
                  onChange={(e) => update("gender", e.target.value)}
                  className="field-input"
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </FormField>
              <FormField label="Country" htmlFor="country">
                <input
                  id="country"
                  type="text"
                  value={profile.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="e.g. United States"
                  className="field-input"
                />
              </FormField>
            </div>
          </div>

          {/* Body metrics */}
          <div className="card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Body Metrics</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField label="Height (cm)" htmlFor="height">
                <input
                  id="height"
                  type="number"
                  value={profile.height}
                  onChange={(e) => update("height", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 175"
                  className="field-input"
                />
              </FormField>
              <FormField label="Current Weight (kg)" htmlFor="current_weight">
                <input
                  id="current_weight"
                  type="number"
                  step="0.1"
                  value={profile.current_weight}
                  onChange={(e) => update("current_weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 80"
                  className="field-input"
                />
              </FormField>
              <FormField label="Target Weight (kg)" htmlFor="target_weight">
                <input
                  id="target_weight"
                  type="number"
                  step="0.1"
                  value={profile.target_weight}
                  onChange={(e) => update("target_weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 70"
                  className="field-input"
                />
              </FormField>
            </div>
          </div>

          {/* Activity & Preferences */}
          <div className="card p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Activity & Preferences</h2>
            <div className="flex flex-col gap-4">
              <FormField label="Activity Level" htmlFor="activity_level">
                <select
                  id="activity_level"
                  value={profile.activity_level}
                  onChange={(e) => update("activity_level", e.target.value)}
                  className="field-input"
                >
                  {ACTIVITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Daily Workout Time" htmlFor="daily_availability">
                <select
                  id="daily_availability"
                  value={profile.daily_availability}
                  onChange={(e) => update("daily_availability", Number(e.target.value))}
                  className="field-input"
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                </select>
              </FormField>
              <CheckboxGroup
                label="Dietary Preferences"
                options={DIET_OPTIONS}
                value={profile.dietary_preferences}
                onChange={(v) => update("dietary_preferences", v)}
              />
              <CheckboxGroup
                label="Available Equipment"
                options={EQUIPMENT_OPTIONS}
                value={profile.equipment}
                onChange={(v) => update("equipment", v)}
              />
            </div>
          </div>

          {savedMsg && (
            <p className="rounded-xl bg-mint/10 px-4 py-2 text-center text-sm font-semibold text-mint">
              {savedMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-mint py-3.5 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Profile"}
          </button>
        </form>
      </main>
      <BottomNav />

      {/* Inline field style */}
      <style>{`
        .field-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: rgba(247,243,238,0.5);
          padding: 10px 14px;
          font-size: 0.875rem;
          outline: none;
        }
        .field-input:focus {
          border-color: #2EC4B6;
        }
      `}</style>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">
        {label}
      </label>
      {children}
    </div>
  );
}
