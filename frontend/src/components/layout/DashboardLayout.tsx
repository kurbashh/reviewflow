import { type ReactNode } from "react";
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
    <div className="fixed inset-0 flex flex-col-reverse md:flex-row w-full overflow-hidden bg-[var(--dashboard-bg)] text-[var(--text-main)] transition-colors duration-200">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 min-w-0 min-h-0 overflow-auto p-[var(--spacing-fluid-md)] lg:p-[var(--spacing-fluid-lg)] pt-0 lg:pt-0 transition-colors duration-200 pb-20 md:pb-[var(--spacing-fluid-md)] lg:pb-[var(--spacing-fluid-lg)]">
        {children}
      </main>
    </div>
  );
}
