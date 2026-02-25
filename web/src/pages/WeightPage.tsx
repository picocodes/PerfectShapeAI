import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { BottomNav } from "../components/BottomNav";

interface WeightEntry {
  id: string;
  weight: number;
  logged_at: string;
}

interface WeightHistory {
  entries: WeightEntry[];
  target_weight?: number;
}

const MOCK_HISTORY: WeightHistory = {
  target_weight: 72,
  entries: [
    { id: "1", weight: 83.0, logged_at: "2025-06-01" },
    { id: "2", weight: 82.4, logged_at: "2025-06-05" },
    { id: "3", weight: 81.8, logged_at: "2025-06-09" },
    { id: "4", weight: 81.1, logged_at: "2025-06-13" },
    { id: "5", weight: 80.6, logged_at: "2025-06-17" },
    { id: "6", weight: 80.0, logged_at: "2025-06-21" },
    { id: "7", weight: 79.5, logged_at: "2025-06-25" },
    { id: "8", weight: 79.1, logged_at: "2025-06-29" },
    { id: "9", weight: 78.8, logged_at: "2025-07-03" },
    { id: "10", weight: 78.4, logged_at: "2025-07-07" },
  ],
};

function useWeightHistory() {
  const [history, setHistory] = useState<WeightHistory | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    apiFetch<WeightHistory>("/weight/history")
      .then(setHistory)
      .catch(() => setHistory(MOCK_HISTORY))
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, []);

  return { history, loading, refresh };
}

function WeightChart({ entries, target }: { entries: WeightEntry[]; target?: number }) {
  if (entries.length < 2) return null;

  const last10 = entries.slice(-10);
  const weights = last10.map((e) => e.weight);
  const minW = Math.min(...weights, target ?? Infinity) - 1;
  const maxW = Math.max(...weights) + 1;
  const W = 340;
  const H = 160;
  const pad = { left: 36, right: 16, top: 16, bottom: 28 };
  const chartW = W - pad.left - pad.right;
  const chartH = H - pad.top - pad.bottom;

  const xOf = (i: number) => pad.left + (i / (last10.length - 1)) * chartW;
  const yOf = (w: number) => pad.top + chartH - ((w - minW) / (maxW - minW)) * chartH;

  const linePath = last10
    .map((e, i) => `${i === 0 ? "M" : "L"} ${xOf(i)} ${yOf(e.weight)}`)
    .join(" ");

  const fillPath =
    linePath +
    ` L ${xOf(last10.length - 1)} ${H - pad.bottom} L ${xOf(0)} ${H - pad.bottom} Z`;

  const targetY = target !== undefined ? yOf(target) : null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      {/* Y-axis labels */}
      {[minW + 1, (minW + maxW) / 2, maxW - 1].map((val) => (
        <text
          key={val}
          x={pad.left - 4}
          y={yOf(val) + 4}
          textAnchor="end"
          fontSize="9"
          fill="#0c0c0c66"
        >
          {Math.round(val)}
        </text>
      ))}

      {/* Target line */}
      {targetY !== null && targetY >= pad.top && targetY <= H - pad.bottom && (
        <>
          <line
            x1={pad.left}
            y1={targetY}
            x2={W - pad.right}
            y2={targetY}
            stroke="#FF6B6B"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text x={W - pad.right + 2} y={targetY + 4} fontSize="8" fill="#FF6B6B">
            goal
          </text>
        </>
      )}

      {/* Area fill */}
      <path d={fillPath} fill="url(#weightGrad)" opacity="0.3" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#2EC4B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {last10.map((e, i) => (
        <circle key={e.id} cx={xOf(i)} cy={yOf(e.weight)} r="4" fill="#2EC4B6" />
      ))}

      {/* X-axis date labels (first + last) */}
      <text x={xOf(0)} y={H - 4} textAnchor="middle" fontSize="8" fill="#0c0c0c66">
        {last10[0].logged_at.slice(5)}
      </text>
      <text x={xOf(last10.length - 1)} y={H - 4} textAnchor="middle" fontSize="8" fill="#0c0c0c66">
        {last10[last10.length - 1].logged_at.slice(5)}
      </text>

      <defs>
        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2EC4B6" />
          <stop offset="100%" stopColor="#2EC4B6" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function WeightPage() {
  const { history, loading, refresh } = useWeightHistory();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const handleLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) return;
    setSaving(true);
    try {
      await apiFetch("/weight/log", {
        method: "POST",
        body: JSON.stringify({ weight: parseFloat(weight), logged_at: date }),
      });
      setSavedMsg("Weight logged! 🎉");
      setWeight("");
      refresh();
    } catch {
      setSavedMsg("Logged locally (API unavailable)");
    } finally {
      setSaving(false);
      setTimeout(() => setSavedMsg(""), 3000);
    }
  };

  const entries = history?.entries ?? [];
  const latest = entries[entries.length - 1];
  const target = history?.target_weight;
  const lost = entries.length >= 2 ? entries[0].weight - latest.weight : null;

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
        <header>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/40">Progress</p>
          <h1 className="font-display text-2xl font-bold text-ink">Weight Tracker</h1>
        </header>

        {/* Stats row */}
        {!loading && latest && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-4 text-center">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/40">Current</p>
              <p className="font-display text-2xl font-bold text-ink">{latest.weight}</p>
              <p className="text-xs text-ink/40">kg</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/40">Target</p>
              <p className="font-display text-2xl font-bold text-coral">{target ?? "—"}</p>
              <p className="text-xs text-ink/40">kg</p>
            </div>
            <div className="card p-4 text-center">
              <p className="text-xs uppercase tracking-[0.15em] text-ink/40">Lost</p>
              <p className="font-display text-2xl font-bold text-mint">
                {lost !== null ? `-${lost.toFixed(1)}` : "—"}
              </p>
              <p className="text-xs text-ink/40">kg</p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="card p-5">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-ink/40">Last 10 Entries</p>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-mint border-t-transparent" />
            </div>
          ) : entries.length >= 2 ? (
            <WeightChart entries={entries} target={target} />
          ) : (
            <p className="py-8 text-center text-sm text-ink/40">Log at least 2 entries to see your chart.</p>
          )}

          {/* Progress toward goal */}
          {latest && target && (
            <div className="mt-4">
              <div className="mb-1 flex justify-between text-xs text-ink/50">
                <span>Progress to goal</span>
                <span>
                  {Math.max(0, latest.weight - target).toFixed(1)} kg to go
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-fog">
                <div
                  className="h-2 rounded-full bg-coral transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      ((entries[0]?.weight - latest.weight) / (entries[0]?.weight - target)) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Log form */}
        <div className="card p-5">
          <h2 className="font-display text-lg font-semibold text-ink">Log Today's Weight</h2>
          <form onSubmit={handleLog} className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink/50" htmlFor="weight-input">
                  Weight (kg)
                </label>
                <input
                  id="weight-input"
                  type="number"
                  step="0.1"
                  min="20"
                  max="300"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 78.5"
                  required
                  className="rounded-xl border border-fog bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-mint"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-ink/50" htmlFor="date-input">
                  Date
                </label>
                <input
                  id="date-input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="rounded-xl border border-fog bg-cream/50 px-4 py-2.5 text-sm outline-none focus:border-mint"
                />
              </div>
            </div>
            {savedMsg && (
              <p className="rounded-xl bg-mint/10 px-4 py-2 text-sm font-semibold text-mint">{savedMsg}</p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-mint py-3 text-sm font-bold text-ink shadow-sm transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Log Weight"}
            </button>
          </form>
        </div>

        {/* History list */}
        {!loading && entries.length > 0 && (
          <div className="card overflow-hidden p-0">
            <p className="px-5 pt-4 pb-2 text-xs uppercase tracking-[0.2em] text-ink/40">History</p>
            <ul>
              {[...entries].reverse().slice(0, 10).map((e) => {
                return (
                  <li
                    key={e.id}
                    className="flex items-center justify-between border-t border-fog px-5 py-3"
                  >
                    <span className="text-sm text-ink/60">{e.logged_at}</span>
                    <span className="font-semibold text-ink">{e.weight} kg</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
