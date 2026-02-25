import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../lib/api";
import { BottomNav } from "../components/BottomNav";

interface TodayWorkout {
  title: string;
  duration_minutes: number;
}

interface XpData {
  total_xp: number;
  level: number;
  streak_count: number;
}

interface StreakData {
  streak_count: number;
  next_badge_at: number;
}

interface MealSummary {
  calories_consumed: number;
  calorie_target: number;
}

const MOCK_WORKOUT: TodayWorkout = { title: "Bodyweight Flow", duration_minutes: 20 };
const MOCK_XP: XpData = { total_xp: 840, level: 3, streak_count: 12 };
const MOCK_STREAK: StreakData = { streak_count: 12, next_badge_at: 15 };
const MOCK_MEALS: MealSummary = { calories_consumed: 1240, calorie_target: 1780 };

function useDashboard() {
  const [workout, setWorkout] = useState<TodayWorkout | null>(null);
  const [xp, setXp] = useState<XpData | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [meals, setMeals] = useState<MealSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    Promise.allSettled([
      apiFetch<TodayWorkout>("/workouts/today"),
      apiFetch<XpData>("/gamification/xp"),
      apiFetch<StreakData>("/gamification/streak"),
      apiFetch<MealSummary>(`/meals/summary?date=${today}`),
    ]).then(([w, x, s, m]) => {
      setWorkout(w.status === "fulfilled" ? w.value : MOCK_WORKOUT);
      setXp(x.status === "fulfilled" ? x.value : MOCK_XP);
      setStreak(s.status === "fulfilled" ? s.value : MOCK_STREAK);
      setMeals(m.status === "fulfilled" ? m.value : MOCK_MEALS);
      setLoading(false);
    });
  }, []);

  return { workout, xp, streak, meals, loading };
}

export function DashboardPage() {
  const { user } = useAuth();
  const { workout, xp, streak, meals, loading } = useDashboard();

  const firstName = user?.displayName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const caloriePercent = meals
    ? Math.min(100, Math.round((meals.calories_consumed / meals.calorie_target) * 100))
    : 0;
  const xpToNext = xp ? (xp.level + 1) * 500 : 500;
  const xpProgress = xp ? Math.min(100, (xp.total_xp % 500) / 5) : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Welcome back</p>
            <h1 className="font-display text-2xl font-bold text-ink capitalize">Hey, {firstName} 👋</h1>
          </div>
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-midnight text-sm font-bold text-cream transition hover:opacity-80"
          >
            {firstName.charAt(0).toUpperCase()}
          </Link>
        </header>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-mint border-t-transparent" />
              <p className="text-sm text-ink/40">Loading your dashboard…</p>
            </div>
          </div>
        ) : (
          <>
            {/* XP bar */}
            {xp && (
              <div className="card flex items-center gap-4 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-midnight">
                  <span className="font-display text-base font-bold text-sun">{xp.level}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold text-ink">Level {xp.level}</p>
                    <p className="text-xs text-ink/40">{xp.total_xp} / {xpToNext} XP</p>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fog">
                    <div
                      className="h-2 rounded-full bg-sun transition-all duration-700"
                      style={{ width: `${xpProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Top cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              {/* Today's workout */}
              <Link to="/workout" className="card block p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Today</p>
                <p className="mt-2 font-display text-xl font-semibold text-ink">
                  {workout?.title ?? "Rest Day"}
                </p>
                <p className="text-sm text-ink/50">
                  {workout ? `${workout.duration_minutes} min · Bodyweight` : "Recovery & stretch"}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-semibold text-ink">
                  <span>▶</span> Start
                </div>
              </Link>

              {/* Calories */}
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Calories</p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {meals?.calories_consumed.toLocaleString() ?? "—"}
                </p>
                <p className="text-sm text-ink/50">
                  of {meals?.calorie_target.toLocaleString() ?? "—"} target
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-fog">
                  <div
                    className="h-2 rounded-full bg-coral transition-all duration-500"
                    style={{ width: `${caloriePercent}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink/30">{caloriePercent}% consumed</p>
              </div>

              {/* Streak */}
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Streak</p>
                <p className="mt-2 font-display text-3xl font-bold text-ink">
                  {streak?.streak_count ?? xp?.streak_count ?? "—"}
                </p>
                <p className="text-sm text-ink/50">Days in a row 🔥</p>
                {streak && streak.next_badge_at > streak.streak_count && (
                  <p className="mt-3 text-xs text-ink/40">
                    {streak.next_badge_at - streak.streak_count} days until next badge
                  </p>
                )}
              </div>
            </section>

            {/* Coach + challenge */}
            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-midnight text-sm text-cream">✦</div>
                  <h3 className="font-display text-lg font-semibold text-ink">AI Coach</h3>
                </div>
                <p className="mt-2 text-sm text-ink/60">
                  Short, supportive check-ins and quick plan tweaks.
                </p>
                <div className="mt-3 rounded-2xl border border-fog bg-cream/40 p-4">
                  <p className="text-sm text-ink/70 italic">
                    "You crushed three workouts this week. Want to bump Saturday to a 15-minute recovery flow?"
                  </p>
                </div>
                <Link
                  to="/coach"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-fog"
                >
                  Open coach chat →
                </Link>
              </div>

              <div className="card p-5">
                <h3 className="font-display text-lg font-semibold text-ink">Daily challenge</h3>
                <p className="mt-1 text-sm text-ink/50">Complete for +80 XP</p>
                <div className="mt-3 rounded-2xl bg-midnight p-4 text-cream">
                  <p className="text-xs uppercase tracking-[0.2em] text-cream/50">Challenge</p>
                  <p className="mt-1 text-lg font-semibold">8k steps day</p>
                  <p className="text-sm text-cream/60">Keep moving and log it tonight.</p>
                </div>
              </div>
            </section>

            {/* Quick links */}
            <section>
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-ink/30">Quick Access</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { to: "/workout", label: "Workout", emoji: "💪", color: "bg-mint/10 text-mint" },
                  { to: "/weight", label: "Log Weight", emoji: "📊", color: "bg-coral/10 text-coral" },
                  { to: "/coach", label: "AI Coach", emoji: "✦", color: "bg-midnight/10 text-midnight" },
                  { to: "/profile", label: "Profile", emoji: "◎", color: "bg-sun/20 text-ink" },
                ].map(({ to, label, emoji, color }) => (
                  <Link
                    key={to}
                    to={to}
                    className={`card flex flex-col items-center gap-2 p-4 text-center transition hover:-translate-y-0.5 ${color}`}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold">{label}</span>
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
