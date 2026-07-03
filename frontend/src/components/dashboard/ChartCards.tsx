import { CardShell, IconArrowRight, LineChartPlaceholder } from "../ui/icons";

export function EarningsOverviewCard() {
  return (
    <CardShell className="h-full">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Earnings Overview</h3>
          <p className="mt-1 text-sm text-slate-500">Динамика новых отзывов и среднего рейтинга</p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            Revenue
          </span>
          <span className="flex items-center gap-2 text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            Last month
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-slate-50/70 p-4">
        <LineChartPlaceholder className="h-56 w-full" />
      </div>
    </CardShell>
  );
}

export function ShipmentTrackerCard() {
  return (
    <CardShell className="relative h-full overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Location Tracker</h3>
          <p className="mt-1 text-sm text-slate-500">Активность по филиалам</p>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
        >
          Track Order
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="relative mt-6">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-100 bg-slate-50">
          <svg className="h-52 w-full" viewBox="0 0 320 220" fill="none">
            <rect width="320" height="220" fill="#F8FAFC" />
            <path
              d="M40 170 C 80 120, 120 150, 160 95 S 240 130, 280 70"
              stroke="url(#routeGradient)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="40" cy="170" r="8" fill="#FF6B35" />
            <circle cx="280" cy="70" r="8" fill="#3B82F6" />
            <defs>
              <linearGradient id="routeGradient" x1="40" y1="170" x2="280" y2="70">
                <stop stopColor="#3B82F6" />
                <stop offset="1" stopColor="#A855F7" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <span className="absolute right-6 top-6 flex h-8 min-w-8 items-center justify-center rounded-full bg-brand px-2 text-xs font-bold text-white shadow-md">
          5
        </span>
      </div>
    </CardShell>
  );
}
