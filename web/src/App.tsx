import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { WorkoutPage } from "./pages/WorkoutPage";
import { WeightPage } from "./pages/WeightPage";
import { CoachPage } from "./pages/CoachPage";
import { ProfilePage } from "./pages/ProfilePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { AuthProvider } from "./auth/AuthProvider";
import { ProtectedRoute } from "./auth/ProtectedRoute";

function Protected({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<Protected><DashboardPage /></Protected>} />
          <Route path="/workout" element={<Protected><WorkoutPage /></Protected>} />
          <Route path="/weight" element={<Protected><WeightPage /></Protected>} />
          <Route path="/coach" element={<Protected><CoachPage /></Protected>} />
          <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
          <Route path="/onboarding" element={<Protected><OnboardingPage /></Protected>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
