import { IconBell, IconSearch, IconStar } from "../ui/icons";

export function DashboardTopBar() {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
          Merchant Dashboard
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <label className="relative hidden min-w-[280px] md:block">
          <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search anything"
            className="w-full rounded-full border-0 bg-slate-100 py-3 pl-11 pr-4 text-sm text-slate-700 outline-none ring-brand/20 placeholder:text-slate-400 focus:ring-2"
          />
        </label>

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-[var(--shadow-soft)] transition-colors hover:text-slate-800"
          aria-label="Избранное"
        >
          <IconStar className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-[var(--shadow-soft)] transition-colors hover:text-slate-800"
          aria-label="Уведомления"
        >
          <IconBell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
        </button>
      </div>
    </header>
  );
}
