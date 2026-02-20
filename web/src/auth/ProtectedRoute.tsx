import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="card p-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-ink/50">Loading</p>
          <p className="mt-2 text-lg font-semibold">Checking your session</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
