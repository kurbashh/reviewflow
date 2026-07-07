import { useState, useEffect, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function DashboardLayout({
  children,
  activeTab,
  setActiveTab,
}: {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
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
    <div className="min-h-screen bg-[var(--dashboard-bg)] p-3 sm:p-4 lg:p-6 transition-colors duration-200">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[var(--radius-shell)] bg-[var(--surface)] shadow-[var(--shadow-card)] lg:min-h-[calc(100vh-3rem)] transition-colors duration-200">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />

        <main className="flex-1 overflow-auto rounded-[calc(var(--radius-shell)-0.5rem)] bg-[var(--dashboard-bg)] p-6 sm:p-8 lg:p-10 transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
