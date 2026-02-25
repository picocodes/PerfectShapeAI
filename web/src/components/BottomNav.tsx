import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Home", icon: "⊞" },
  { to: "/workout", label: "Workout", icon: "◉" },
  { to: "/weight", label: "Weight", icon: "↑" },
  { to: "/coach", label: "Coach", icon: "✦" },
  { to: "/profile", label: "Profile", icon: "◎" },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="sticky bottom-0 z-50 flex items-center justify-around border-t border-fog bg-white/90 px-2 py-2 backdrop-blur">
      {NAV_ITEMS.map(({ to, label, icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              active ? "bg-mint/10 text-mint" : "text-ink/40 hover:text-ink/70"
            }`}
          >
            <span className="text-lg leading-none">{icon}</span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
