import { IconArrowRight, IconPlus } from "../ui/icons";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] bg-white p-8 shadow-[var(--shadow-card)] lg:p-10">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-orange-400" />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-xl">
          <p className="text-sm font-medium text-slate-500">Welcome Back</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.65rem] lg:leading-[1.08]">
            Today&apos;s Review Performance
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
            Отслеживайте отзывы, рейтинг и скорость ответа по всем локациям в одном месте.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <IconPlus className="h-4 w-4" />
              Add New Review
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300"
            >
              View Reports
              <IconArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative mx-auto flex h-56 w-full max-w-md items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-slate-50 via-orange-50 to-purple-50 lg:h-64">
          <div className="absolute inset-8 rounded-[1.5rem] border border-white/70 bg-white/60 backdrop-blur-sm" />
          <div className="relative grid grid-cols-3 gap-4 p-8">
            {["★", "☰", "◎"].map((symbol, index) => (
              <div
                key={symbol}
                className={`flex h-16 w-16 items-center justify-center rounded-2xl text-xl shadow-sm ${
                  index === 1 ? "bg-brand text-white" : "bg-white text-slate-700"
                }`}
              >
                {symbol}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
