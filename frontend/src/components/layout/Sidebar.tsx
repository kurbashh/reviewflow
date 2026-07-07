import {
  IconAnalytics,
  IconBell,
  IconLocations,
  IconMoon,
  IconOverview,
  IconReviews,
  IconSettings,
  IconSun,
  LogoMark,
} from "../ui/icons";

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
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}) {
  return (
    <aside className="flex w-[88px] shrink-0 flex-col items-center justify-between py-8 lg:w-[104px] border-r border-[var(--border-subtle)] bg-[var(--surface)] transition-colors">
      <div className="flex flex-col items-center gap-10">
        <LogoMark className="h-11 w-11 text-[var(--brand)]" />

        <nav className="flex flex-col gap-3">
          {navItems.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all ${
                  isActive
                    ? "bg-[var(--dashboard-bg)] text-[var(--text-main)] shadow-[var(--shadow-soft)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--dashboard-bg)]/50 hover:text-[var(--text-main)]"
                }`}
                title={label}
              >
                {isActive && (
                  <span className="absolute -right-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-purple-400 to-[var(--brand)]" />
                )}
                <Icon className="h-5 w-5" />
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--text-muted)] transition-colors hover:bg-[var(--dashboard-bg)]/50 hover:text-[var(--text-main)]"
          aria-label="Уведомления"
        >
          <IconBell className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => setDarkMode(!darkMode)}
          className="flex flex-col gap-2 rounded-2xl bg-slate-200/50 dark:bg-zinc-800/50 p-1.5 transition-colors cursor-pointer group"
          aria-label="Переключить тему"
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              !darkMode
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-400 group-hover:text-slate-200"
            }`}
          >
            <IconSun className="h-4 w-4" />
          </div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all ${
              darkMode
                ? "bg-[var(--dashboard-bg)] text-[var(--brand)] shadow-sm"
                : "text-slate-400 group-hover:text-slate-200"
            }`}
          >
            <IconMoon className="h-4 w-4" />
          </div>
        </button>

        <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-[var(--border-subtle)] bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm" />
      </div>
    </aside>
  );
}
