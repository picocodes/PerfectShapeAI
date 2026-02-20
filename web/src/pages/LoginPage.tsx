import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const title = useMemo(
    () => (mode === "login" ? "Welcome back" : "Create your account"),
    [mode]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="glow" />
      <form onSubmit={handleSubmit} className="card w-full max-w-md space-y-5 p-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink/50">PerfectShape AI</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{title}</h1>
          <p className="text-sm text-ink/60">
            {mode === "login"
              ? "Log in to view your personalized dashboard."
              : "Sign up to unlock your free AI-generated plan."}
          </p>
        </div>

        <label className="block text-sm font-medium text-ink">
          Email
          <input
            className="mt-2 w-full rounded-full border border-ink/10 px-4 py-3 text-sm outline-none focus:border-mint"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block text-sm font-medium text-ink">
          Password
          <input
            className="mt-2 w-full rounded-full border border-ink/10 px-4 py-3 text-sm outline-none focus:border-mint"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
        </label>

        {error && <p className="text-sm text-coral">{error}</p>}

        <button
          type="submit"
          className="w-full rounded-full bg-mint px-6 py-3 text-sm font-semibold text-ink shadow-tight"
          disabled={busy}
        >
          {busy ? "Working..." : mode === "login" ? "Log in" : "Create account"}
        </button>

        <button
          type="button"
          className="w-full rounded-full border border-ink/10 px-6 py-3 text-sm font-semibold text-ink"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </form>
    </main>
  );
}
