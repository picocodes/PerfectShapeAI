import { useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { BottomNav } from "../components/BottomNav";

interface Exercise {
  name: string;
  reps?: number;
  duration_seconds?: number;
  description?: string;
}

interface TodayWorkout {
  workout_id: string;
  title: string;
  duration_minutes: number;
  exercises: Exercise[];
  xp_reward: number;
}

const MOCK_WORKOUT: TodayWorkout = {
  workout_id: "mock-1",
  title: "Core Ignition",
  duration_minutes: 20,
  xp_reward: 120,
  exercises: [
    { name: "Jumping Jacks", duration_seconds: 45, description: "Full-body warm-up" },
    { name: "Push-Ups", reps: 12, description: "Keep your core tight" },
    { name: "Bodyweight Squats", reps: 15, description: "Feet shoulder-width apart" },
    { name: "Plank Hold", duration_seconds: 30, description: "Breathe steadily" },
    { name: "Mountain Climbers", duration_seconds: 30, description: "Drive knees to chest" },
    { name: "Glute Bridges", reps: 15, description: "Squeeze at the top" },
    { name: "Burpees", reps: 8, description: "Full effort, rest after" },
    { name: "Cool-Down Stretch", duration_seconds: 60, description: "Hold each stretch" },
  ],
};

function useWorkout() {
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TodayWorkout>("/workouts/today")
      .then(setWorkout)
      .catch(() => {
        setWorkout(MOCK_WORKOUT);
        setError(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return { workout, loading, error };
}

function Timer({ totalSeconds }: { totalSeconds: number }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const mins = Math.floor(remaining / 60).toString().padStart(2, "0");
  const secs = (remaining % 60).toString().padStart(2, "0");
  const progress = 1 - remaining / totalSeconds;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <svg className="absolute inset-0" viewBox="0 0 112 112">
          <circle cx="56" cy="56" r="50" fill="none" stroke="#E2E8F0" strokeWidth="8" />
          <circle
            cx="56"
            cy="56"
            r="50"
            fill="none"
            stroke="#2EC4B6"
            strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 50}`}
            strokeDashoffset={`${(1 - progress) * 2 * Math.PI * 50}`}
            strokeLinecap="round"
            transform="rotate(-90 56 56)"
          />
        </svg>
        <span className="font-display text-2xl font-bold text-ink">
          {mins}:{secs}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-full bg-mint px-5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5"
        >
          {running ? "Pause" : remaining === totalSeconds ? "Start" : "Resume"}
        </button>
        <button
          onClick={() => { setRemaining(totalSeconds); setRunning(false); }}
          className="rounded-full border border-ink/10 px-5 py-2 text-sm font-semibold text-ink transition hover:bg-fog"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function WorkoutPage() {
  const { workout, loading } = useWorkout();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [xpEarned, setXpEarned] = useState<number | null>(null);

  const handleComplete = async () => {
    if (!workout) return;
    setCompleting(true);
    try {
      await apiFetch("/workouts/complete", {
        method: "POST",
        body: JSON.stringify({ workout_id: workout.workout_id }),
      });
    } catch {
      // Accept even if API unavailable (mock mode)
    }
    setXpEarned(workout.xp_reward);
    setCompleted(true);
    setCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-mint border-t-transparent" />
            <p className="text-sm text-ink/50">Loading your workout…</p>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (completed && xpEarned !== null) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
          <div className="float-in flex flex-col items-center gap-4 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-mint/10 text-5xl">🎉</div>
            <h2 className="font-display text-3xl font-bold text-ink">Workout Complete!</h2>
            <p className="text-ink/60">You crushed it. Keep that streak alive!</p>
            <div className="card flex items-center gap-4 px-8 py-5">
              <div className="text-4xl">⚡</div>
              <div>
                <p className="text-xs uppercase tracking-widest text-ink/40">XP Earned</p>
                <p className="font-display text-4xl font-bold text-mint">+{xpEarned}</p>
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!workout) return null;

  const exercise = workout.exercises[currentStep];
  const timerSeconds = exercise.duration_seconds ?? 30;
  const isLast = currentStep === workout.exercises.length - 1;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Today's Workout</p>
            <h1 className="font-display text-2xl font-bold text-ink">{workout.title}</h1>
          </div>
          <span className="rounded-full bg-sun/20 px-3 py-1 text-xs font-semibold text-ink/70">
            {workout.duration_minutes} min
          </span>
        </header>

        {/* Progress bar */}
        <div>
          <div className="mb-1 flex justify-between text-xs text-ink/40">
            <span>Step {currentStep + 1} of {workout.exercises.length}</span>
            <span>{Math.round(((currentStep + 1) / workout.exercises.length) * 100)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-fog">
            <div
              className="h-2 rounded-full bg-mint transition-all duration-300"
              style={{ width: `${((currentStep + 1) / workout.exercises.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current exercise card */}
        <div className="card flex flex-col items-center gap-5 px-6 py-8 text-center">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-coral/10 text-2xl">
            💪
          </span>
          <div>
            <h2 className="font-display text-2xl font-bold text-ink">{exercise.name}</h2>
            {exercise.description && (
              <p className="mt-1 text-sm text-ink/60">{exercise.description}</p>
            )}
          </div>
          {exercise.reps ? (
            <div className="rounded-full bg-mint/10 px-6 py-2 text-lg font-bold text-mint">
              {exercise.reps} reps
            </div>
          ) : (
            <Timer totalSeconds={timerSeconds} />
          )}
        </div>

        {/* Exercise list */}
        <div className="card overflow-hidden p-0">
          <p className="px-5 pt-4 pb-2 text-xs uppercase tracking-[0.2em] text-ink/40">All Exercises</p>
          <ul>
            {workout.exercises.map((ex, i) => (
              <li
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`flex cursor-pointer items-center gap-3 border-t border-fog px-5 py-3 transition-colors hover:bg-cream/50 ${
                  i === currentStep ? "bg-mint/5" : ""
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i < currentStep
                      ? "bg-mint text-white"
                      : i === currentStep
                      ? "bg-midnight text-cream"
                      : "bg-fog text-ink/40"
                  }`}
                >
                  {i < currentStep ? "✓" : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${i === currentStep ? "text-ink" : "text-ink/60"}`}>
                    {ex.name}
                  </p>
                  <p className="text-xs text-ink/40">
                    {ex.reps ? `${ex.reps} reps` : `${ex.duration_seconds}s`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 pb-4">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="flex-1 rounded-full border border-ink/10 py-3 text-sm font-semibold text-ink transition hover:bg-fog"
            >
              ← Previous
            </button>
          )}
          {!isLast ? (
            <button
              onClick={() => setCurrentStep((s) => s + 1)}
              className="flex-1 rounded-full bg-midnight py-3 text-sm font-semibold text-cream transition hover:opacity-90"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex-1 rounded-full bg-mint py-3 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {completing ? "Saving…" : "Complete Workout 🎉"}
            </button>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
