import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { onSessionExpired } from "./lib/apiClient";

export default function App() {
  const { user, loading, isAuthenticated, login, register, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem("rf_active_tab") || "overview";
  });
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("rf_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    return onSessionExpired(() => {
      setShowExpiredModal(true);
    });
  }, []);
  const businessId = user?.businesses?.[0]?.id || "";
  let content = null;
  if (loading) {
    content = (
      <div className="flex h-screen items-center justify-center bg-[var(--dashboard-bg)]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--border-subtle)] border-t-[var(--brand)]" />
      </div>
    );
  } else if (!isAuthenticated) {
    content = <LoginPage onLogin={login} onRegister={register} />;
  } else if (!user?.businesses || user.businesses.length === 0) {
    content = <OnboardingPage onComplete={refreshUser} />;
  } else {
    content = (
      <DashboardPage
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        businessId={businessId}
        onLogout={logout}
        user={user!}
        refreshUser={refreshUser}
      />
    );
  }

  return (
    <>
      {showExpiredModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border-subtle)]">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white text-center">Сессия истекла</h2>
            <p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
              В целях безопасности мы завершили вашу сессию. Пожалуйста, войдите снова, чтобы продолжить работу.
            </p>
            <button
              onClick={() => setShowExpiredModal(false)}
              className="mt-8 flex w-full items-center justify-center rounded-full bg-brand py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-brand-hover"
            >
              Войти снова
            </button>
          </div>
        </div>
      )}
      {content}
    </>
  );
}
