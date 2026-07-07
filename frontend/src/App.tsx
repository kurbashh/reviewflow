import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OnboardingPage } from "./pages/OnboardingPage";

export default function App() {
  const { user, token, loading, isAuthenticated, login, register, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("rf_active_tab") || "overview";
  });

  useEffect(() => {
    localStorage.setItem("rf_active_tab", activeTab);
  }, [activeTab]);

  // Determine businessId from user's businesses (first one)
  const businessId = user?.businesses?.[0]?.id || "";

  // Loading spinner
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--dashboard-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--brand)]" />
      </div>
    );
  }

  // Not authenticated -> Login page
  if (!isAuthenticated) {
    return <LoginPage onLogin={login} onRegister={register} />;
  }

  // Authenticated, but no businesses -> Onboarding
  if (!user?.businesses || user.businesses.length === 0) {
    return <OnboardingPage token={token || ""} onComplete={refreshUser} />;
  }

  // Authenticated -> Dashboard
  return (
    <DashboardPage
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      businessId={businessId}
      onLogout={logout}
    />
  );
}
