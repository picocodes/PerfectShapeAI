export default function DashboardPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50">Welcome back</p>
          <h2 className="font-display text-3xl font-semibold text-ink">Your PerfectShape dashboard</h2>
        </div>
        <button className="rounded-full bg-midnight px-5 py-2 text-sm font-semibold text-cream">
          Sync Mobile App
        </button>
      </header>

      <section className="grid gap-5 lg:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Today</p>
          <p className="mt-2 text-xl font-semibold">Bodyweight Flow</p>
          <p className="text-sm text-ink/60">20 min · Strength + Mobility</p>
          <button className="mt-4 rounded-full bg-mint px-4 py-2 text-sm font-semibold">Start workout</button>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Calories</p>
          <p className="mt-2 text-3xl font-semibold">1,780</p>
          <p className="text-sm text-ink/60">Target for today</p>
          <div className="mt-4 h-2 rounded-full bg-fog">
            <div className="h-2 w-2/3 rounded-full bg-coral" />
          </div>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Streak</p>
          <p className="mt-2 text-3xl font-semibold">12</p>
          <p className="text-sm text-ink/60">Days in a row</p>
          <p className="mt-3 text-xs text-ink/50">You are 3 days from a new badge.</p>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <h3 className="font-display text-xl font-semibold">AI Coach</h3>
          <p className="mt-2 text-sm text-ink/60">Short, supportive check-ins and quick plan tweaks.</p>
          <div className="mt-4 rounded-card border border-fog p-4">
            <p className="text-sm text-ink/70">
              "You crushed three workouts this week. Want to bump Saturday to a 15-minute recovery flow?"
            </p>
          </div>
          <button className="mt-4 rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold">
            Open coach chat
          </button>
        </div>
        <div className="card p-5">
          <h3 className="font-display text-xl font-semibold">Daily challenge</h3>
          <p className="mt-2 text-sm text-ink/60">Complete the 8k steps day for +80 XP.</p>
          <div className="mt-4 rounded-card bg-midnight p-4 text-cream">
            <p className="text-xs uppercase tracking-[0.2em] text-cream/60">Challenge</p>
            <p className="mt-1 text-lg font-semibold">8k steps day</p>
            <p className="text-sm text-cream/70">Keep moving and log it tonight.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
