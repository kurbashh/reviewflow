import { MetricCard } from "./MetricCard";

const metrics = [
  {
    title: "Total Reviews",
    value: "12,430",
    change: "67% vs last week",
    accent: "orange" as const,
  },
  {
    title: "Average Rating",
    value: "4.8",
    change: "+0.3 vs last week",
    accent: "blue" as const,
  },
  {
    title: "Response Rate",
    value: "92%",
    change: "12% vs last week",
    accent: "purple" as const,
  },
  {
    title: "Pending Replies",
    value: "18",
    change: "-5 vs yesterday",
    accent: "green" as const,
  },
];

const periodFilters = ["Today", "This week", "This month"];

export function MetricsSection() {
  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Metrics</h3>
          <p className="mt-1 text-sm text-slate-500">Ключевые показатели за выбранный период</p>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-[var(--shadow-soft)]">
          {periodFilters.map((period, index) => (
            <button
              key={period}
              type="button"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                index === 1
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </div>
    </section>
  );
}
