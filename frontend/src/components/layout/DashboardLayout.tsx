import type { ReactNode } from "react";
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
  return (
    <div className="min-h-screen bg-slate-100 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[var(--radius-shell)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] lg:min-h-[calc(100vh-3rem)]">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <main className="flex-1 overflow-auto rounded-[calc(var(--radius-shell)-0.5rem)] bg-[var(--color-surface)] p-6 sm:p-8 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
