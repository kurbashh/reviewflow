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
  { label: "Обзор", icon: IconOverview, active: true },
  { label: "Отзывы", icon: IconReviews, active: false },
  { label: "Аналитика", icon: IconAnalytics, active: false },
  { label: "Локации", icon: IconLocations, active: false },
  { label: "Настройки", icon: IconSettings, active: false },
];

export function Sidebar() {
  return (
    <aside className="flex w-[88px] shrink-0 flex-col items-center justify-between py-8 lg:w-[104px]">
      <div className="flex flex-col items-center gap-10">
        <LogoMark className="h-11 w-11" />

        <nav className="flex flex-col gap-3">
          {navItems.map(({ label, icon: Icon, active }) => (
            <button
              key={label}
              type="button"
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                active
                  ? "bg-white text-slate-900 shadow-[var(--shadow-soft)]"
                  : "text-slate-400 hover:bg-white/70 hover:text-slate-700"
              }`}
              title={label}
            >
              {active && (
                <span className="absolute -right-1 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-orange-300 to-brand" />
              )}
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
          aria-label="Уведомления"
        >
          <IconBell className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-2 rounded-2xl bg-white/70 p-1.5">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm"
            aria-label="Светлая тема"
          >
            <IconSun className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400"
            aria-label="Тёмная тема"
          >
            <IconMoon className="h-4 w-4" />
          </button>
        </div>

        <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-slate-200 to-slate-300 shadow-sm" />
      </div>
    </aside>
  );
}
