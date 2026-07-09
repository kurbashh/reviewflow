import { useState } from "react";
import {

  IconAnalytics,
  IconLocations,
  IconMoon,
  IconOverview,
  IconReviews,
  IconSettings,
  IconSun,
  LogoMark,
} from "../ui/icons";
import { RiLogoutBoxRLine } from "@remixicon/react";

const navItems = [
  { id: "overview", label: "Обзор", icon: IconOverview },
  { id: "reviews", label: "Отзывы", icon: IconReviews },
  { id: "locations", label: "Локации", icon: IconLocations },
  { id: "settings", label: "Настройки", icon: IconSettings },
  { id: "billing", label: "Биллинг", icon: IconAnalytics },
];

export function Sidebar({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onLogout,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onLogout?: () => void;
}) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  return (

    <aside className="flex shrink-0 items-center justify-between bg-[var(--surface)] transition-colors border-t md:border-t-0 md:border-r border-[var(--border-subtle)] w-full h-[64px] md:h-full flex-row px-2 sm:px-4 md:w-[88px] md:flex-col md:px-0 md:py-8 lg:w-[104px] z-40">
      
      {/* Desktop Logo */}
      <div className="hidden md:flex flex-col items-center">
        <LogoMark className="h-11 w-11 text-[var(--brand)]" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-row md:flex-col gap-1 sm:gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-center items-center md:mt-10">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex h-12 w-12 items-center justify-center transition-all ${
                isActive
                  ? "text-[var(--brand)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              }`}
              title={label}
            >
              <Icon className="h-5 w-5" />
            </button>
          );
        })}
        
      </nav>

      {/* Desktop Bottom Actions */}
      <div className="hidden md:flex flex-col items-center gap-4 mt-auto">
        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--text-muted)] transition-colors hover:text-[var(--text-main)]"
          aria-label="Переключить тему"
          title="Переключить тему"
        >
          {darkMode ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
        </button>

        {onLogout && (
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--text-muted)] transition-colors hover:bg-red-500/10 hover:text-red-500"
            aria-label="Выйти"
            title="Выйти из аккаунта"
          >
            <RiLogoutBoxRLine className="h-5 w-5" />
          </button>
        )}
      </div>

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[var(--surface)] p-8 shadow-2xl border border-[var(--border-subtle)] text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Выход из аккаунта</h2>
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Вы уверены, что хотите выйти из аккаунта?
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 rounded-full bg-slate-100 dark:bg-zinc-800 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setShowLogoutModal(false);
                  if (onLogout) onLogout();
                }}
                className="flex-1 rounded-full bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
