import { Avatar, CardShell } from "../ui/icons";

const recentReviews = [
  {
    name: "Aigerim S.",
    category: "Restaurant • 5★",
    status: "Approve",
  },
  {
    name: "Daniyar K.",
    category: "Hotel • 4★",
    status: "Review",
  },
  {
    name: "Madina T.",
    category: "Retail • 5★",
    status: "Approve",
  },
  {
    name: "Arman B.",
    category: "Cafe • 3★",
    status: "Review",
  },
];

export function RecentReviewsList() {
  return (
    <CardShell className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Recent Reviews</h3>
          <p className="mt-1 text-sm text-slate-500">Последние запросы на модерацию</p>
        </div>

        <button type="button" className="text-sm font-medium text-brand hover:text-brand-hover">
          View all
        </button>
      </div>

      <ul className="mt-6 space-y-4">
        {recentReviews.map((review) => (
          <li
            key={review.name}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 px-4 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={review.name} className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{review.name}</p>
                <p className="truncate text-xs text-slate-500">{review.category}</p>
              </div>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              {review.status}
            </button>
          </li>
        ))}
      </ul>
    </CardShell>
  );
}
