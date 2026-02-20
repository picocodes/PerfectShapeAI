import { Link } from "react-router-dom";

const features = [
  "AI workouts built for your living room",
  "Meal guidance with local foods",
  "XP, streaks, and daily challenges",
  "A coach that keeps you moving"
];

export function HomePage() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="glow" />
      <section className="float-in grid w-full max-w-5xl gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-midnight px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-cream">
            PerfectShape AI
          </span>
          <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
            Playful coaching that makes weight loss feel like a game.
          </h1>
          <p className="text-lg text-ink/70">
            Build a bodyweight routine, lock in a calorie target, and keep your streak alive. Your AI coach adapts
            every week so you never plateau.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              className="rounded-full bg-mint px-6 py-3 text-sm font-semibold text-ink shadow-tight transition hover:-translate-y-0.5"
              to="/dashboard"
            >
              Log In
            </Link>
            <a
              className="rounded-full border border-ink/10 bg-white px-6 py-3 text-sm font-semibold text-ink"
              href="https://perfectshapeai.com"
            >
              Get Mobile App
            </a>
          </div>
          <div className="grid gap-3 pt-2 text-sm text-ink/70">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-coral" />
                {feature}
              </div>
            ))}
          </div>
        </div>
        <div className="card flex flex-col gap-4 p-6">
          <div className="rounded-card bg-midnight p-4 text-cream">
            <p className="text-xs uppercase tracking-[0.2em] text-cream/70">Today</p>
            <p className="text-xl font-semibold">15-min Core Ignition</p>
            <p className="text-sm text-cream/70">Goal: -320 kcal</p>
          </div>
          <div className="rounded-card border border-fog p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Streak</p>
            <p className="text-2xl font-semibold text-ink">4 days</p>
            <p className="text-sm text-ink/60">Keep it alive with a quick walk.</p>
          </div>
          <div className="rounded-card border border-fog p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Challenge</p>
            <p className="text-lg font-semibold text-ink">No soda today</p>
            <p className="text-sm text-ink/60">Earn 50 XP when you check in.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
