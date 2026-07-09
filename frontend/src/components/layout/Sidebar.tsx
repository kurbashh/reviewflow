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

      </div>
    </aside>
  );
}
