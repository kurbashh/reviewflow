import { BarChartPlaceholder, CardShell } from "../ui/icons";

export function ReviewsSnapshotCard() {
  return (
    <CardShell className="h-full">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Reviews Snapshot</p>
          <p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">92,500</p>
          <p className="mt-1 text-sm text-slate-500">Current reviews volume</p>
        </div>

        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600">
          This Week
          <span aria-hidden="true">▾</span>
        </label>
      </div>

      <div className="relative mt-8">
        <BarChartPlaceholder className="h-52 w-full" />

        <div className="absolute left-[58%] top-[28%] rounded-2xl bg-slate-900 px-4 py-3 text-xs text-white shadow-lg">
          <p className="font-medium text-slate-300">Saturday</p>
          <p className="mt-1 text-sm font-semibold">559,128</p>
        </div>
      </div>
    </CardShell>
  );
}
