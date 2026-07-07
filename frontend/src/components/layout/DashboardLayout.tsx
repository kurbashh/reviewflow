import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({
  children,
  activeTab,
  setActiveTab,
  onLogout,
}: {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout?: () => void;
}) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("rf_theme") === "dark";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("rf_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("rf_theme", "light");
    }
  }, [darkMode]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[var(--dashboard-bg)] text-[var(--text-main)] transition-colors duration-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onLogout={onLogout}
      />

      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 transition-colors duration-200">
        {children}
      </main>
    </div>
  );
}
