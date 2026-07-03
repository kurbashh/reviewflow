import { Sparkline, IconTrendUp } from "../ui/icons";

type MetricCardProps = {
  title: string;
  value: string;
  change: string;
  accent?: "orange" | "blue" | "purple" | "green";
};

const accentStyles = {
  orange: "bg-orange-50 text-brand",
  blue: "bg-blue-50 text-blue-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-emerald-50 text-emerald-600",
};

export function MetricCard({ title, value, change, accent = "orange" }: MetricCardProps) {
  return (
    <article className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accentStyles[accent]}`}>
              <IconTrendUp className="h-4 w-4" />
            </span>
            <p className="text-sm font-medium text-slate-500">{title}</p>
          </div>

          <p className="mt-5 text-3xl font-bold tracking-tight text-slate-900">{value}</p>

          <p className="mt-2 flex items-center gap-1 text-sm font-medium text-emerald-600">
            <IconTrendUp className="h-3.5 w-3.5" />
            {change}
          </p>
        </div>

        <Sparkline className="hidden h-16 w-28 sm:block" />
      </div>
    </article>
  );
}
