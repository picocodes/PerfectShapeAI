import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";

interface OnboardingData {
  name: string;
  age: number | "";
  gender: string;
  height: number | "";
  current_weight: number | "";
  target_weight: number | "";
  activity_level: string;
  country: string;
  dietary_preferences: string[];
  equipment: string[];
  daily_availability: number;
}

const EMPTY: OnboardingData = {
  name: "",
  age: "",
  gender: "",
  height: "",
  current_weight: "",
  target_weight: "",
  activity_level: "moderate",
  country: "",
  dietary_preferences: [],
  equipment: [],
  daily_availability: 30,
};

const TOTAL_STEPS = 5;

const DIET_OPTIONS = ["vegan", "vegetarian", "keto", "budget", "none"] as const;
const EQUIPMENT_OPTIONS = ["none", "dumbbells", "resistance bands", "skipping rope"] as const;

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i < step ? "w-6 bg-mint" : i === step ? "w-6 bg-midnight" : "w-2 bg-fog"
          }`}
        />
      ))}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border-2 px-5 py-3 text-sm font-semibold transition ${
        selected
          ? "border-mint bg-mint/10 text-mint"
          : "border-fog text-ink/60 hover:border-ink/30"
      }`}
    >
      {children}
    </button>
  );
}

function CheckboxChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold capitalize transition ${
        selected ? "border-mint bg-mint/10 text-mint" : "border-fog text-ink/50 hover:border-ink/30"
      }`}
    >
      {selected ? "✓ " : ""}{label}
    </button>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = <K extends keyof OnboardingData>(key: K, val: OnboardingData[K]) =>
    setData((d) => ({ ...d, [key]: val }));

  const toggleList = (key: "dietary_preferences" | "equipment", val: string) =>
    setData((d) => ({
      ...d,
      [key]: d[key].includes(val) ? d[key].filter((v) => v !== val) : [...d[key], val],
    }));

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await apiFetch("/users/me", { method: "PATCH", body: JSON.stringify(data) });
    } catch {
      // continue even if API unavailable
    }
    try {
      await apiFetch("/ai/weekly-plan", { method: "POST", body: JSON.stringify({}) });
    } catch {
      // plan generation failure is non-blocking
    }
    setSubmitting(false);
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-cream to-white px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-midnight px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cream">
            PerfectShape AI
          </span>
          <p className="text-sm text-ink/50">Let's set up your plan</p>
        </div>

        <div className="card float-in px-6 py-8">
          {/* Progress */}
          <div className="mb-6 flex items-center justify-between">
            <ProgressDots step={step} />
            <span className="text-xs font-semibold text-ink/30">
              {step + 1} / {TOTAL_STEPS}
            </span>
          </div>

          {/* Step 1: Name, Age, Gender */}
          {step === 0 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Nice to meet you! 👋</h2>
                <p className="mt-1 text-sm text-ink/50">Tell us a bit about yourself.</p>
              </div>
              <Field label="Your Name">
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Alex"
                  className="ob-input"
                  autoFocus
                />
              </Field>
              <Field label="Age">
                <input
                  type="number"
                  value={data.age}
                  onChange={(e) => update("age", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 28"
                  min={10}
                  max={100}
                  className="ob-input"
                />
              </Field>
              <Field label="Gender">
                <div className="flex gap-2">
                  {["male", "female", "other"].map((g) => (
                    <OptionButton key={g} selected={data.gender === g} onClick={() => update("gender", g)}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </OptionButton>
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 2: Height, Current Weight, Target Weight */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Your body metrics 📏</h2>
                <p className="mt-1 text-sm text-ink/50">We use this to calculate your calorie target.</p>
              </div>
              <Field label="Height (cm)">
                <input
                  type="number"
                  value={data.height}
                  onChange={(e) => update("height", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 175"
                  className="ob-input"
                  autoFocus
                />
              </Field>
              <Field label="Current Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  value={data.current_weight}
                  onChange={(e) => update("current_weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 85"
                  className="ob-input"
                />
              </Field>
              <Field label="Target Weight (kg)">
                <input
                  type="number"
                  step="0.1"
                  value={data.target_weight}
                  onChange={(e) => update("target_weight", e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 72"
                  className="ob-input"
                />
              </Field>
            </div>
          )}

          {/* Step 3: Activity Level + Country */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Your lifestyle ⚡</h2>
                <p className="mt-1 text-sm text-ink/50">Helps us calibrate your plan.</p>
              </div>
              <Field label="Activity Level">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "sedentary", label: "Sedentary", emoji: "🛋️" },
                    { value: "light", label: "Light", emoji: "🚶" },
                    { value: "moderate", label: "Moderate", emoji: "🏃" },
                    { value: "active", label: "Very Active", emoji: "⚡" },
                  ].map((o) => (
                    <OptionButton
                      key={o.value}
                      selected={data.activity_level === o.value}
                      onClick={() => update("activity_level", o.value)}
                    >
                      {o.emoji} {o.label}
                    </OptionButton>
                  ))}
                </div>
              </Field>
              <Field label="Country">
                <input
                  type="text"
                  value={data.country}
                  onChange={(e) => update("country", e.target.value)}
                  placeholder="e.g. United States"
                  className="ob-input"
                />
              </Field>
            </div>
          )}

          {/* Step 4: Dietary Preferences + Equipment */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Food & Equipment 🥗</h2>
                <p className="mt-1 text-sm text-ink/50">We'll personalise meal ideas and workouts.</p>
              </div>
              <Field label="Dietary Preferences">
                <div className="flex flex-wrap gap-2">
                  {DIET_OPTIONS.map((opt) => (
                    <CheckboxChip
                      key={opt}
                      label={opt}
                      selected={data.dietary_preferences.includes(opt)}
                      onClick={() => toggleList("dietary_preferences", opt)}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Available Equipment">
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <CheckboxChip
                      key={opt}
                      label={opt}
                      selected={data.equipment.includes(opt)}
                      onClick={() => toggleList("equipment", opt)}
                    />
                  ))}
                </div>
              </Field>
            </div>
          )}

          {/* Step 5: Daily Availability */}
          {step === 4 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink">Daily workout time ⏱️</h2>
                <p className="mt-1 text-sm text-ink/50">How long can you work out each day?</p>
              </div>
              <div className="grid gap-3">
                {[
                  { mins: 15, desc: "Quick & effective — perfect for busy days" },
                  { mins: 30, desc: "The sweet spot for consistent fat loss" },
                  { mins: 45, desc: "Maximum results for the dedicated" },
                ].map(({ mins, desc }) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => update("daily_availability", mins)}
                    className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition ${
                      data.daily_availability === mins
                        ? "border-mint bg-mint/10"
                        : "border-fog hover:border-ink/20"
                    }`}
                  >
                    <span
                      className={`font-display text-2xl font-bold ${
                        data.daily_availability === mins ? "text-mint" : "text-ink/40"
                      }`}
                    >
                      {mins}
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{mins} minutes</p>
                      <p className="text-xs text-ink/50">{desc}</p>
                    </div>
                    {data.daily_availability === mins && (
                      <span className="ml-auto text-mint">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-xl bg-coral/10 px-4 py-2 text-sm text-coral">{error}</p>
          )}

          {/* Navigation buttons */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={back}
                className="flex-1 rounded-full border border-ink/10 py-3 text-sm font-semibold text-ink transition hover:bg-fog"
              >
                ← Back
              </button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button
                type="button"
                onClick={next}
                className="flex-1 rounded-full bg-midnight py-3 text-sm font-semibold text-cream transition hover:opacity-90"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 rounded-full bg-mint py-3 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                {submitting ? "Setting up your plan…" : "Generate My Plan 🚀"}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-ink/30">
          Your data is used only to personalise your fitness plan.
        </p>
      </div>

      <style>{`
        .ob-input {
          width: 100%;
          border-radius: 12px;
          border: 1px solid #E2E8F0;
          background: rgba(247,243,238,0.5);
          padding: 10px 14px;
          font-size: 0.875rem;
          outline: none;
        }
        .ob-input:focus { border-color: #2EC4B6; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-[0.15em] text-ink/50">{label}</label>
      {children}
    </div>
  );
}
