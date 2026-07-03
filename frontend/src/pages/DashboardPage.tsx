import { DashboardTopBar } from "../components/dashboard/DashboardTopBar";
import { HeroSection } from "../components/dashboard/HeroSection";
import { MetricsSection } from "../components/dashboard/MetricsSection";
import {
  EarningsOverviewCard,
  ShipmentTrackerCard,
} from "../components/dashboard/ChartCards";
import { ReviewsSnapshotCard } from "../components/dashboard/ReviewsSnapshotCard";
import { RecentReviewsList } from "../components/dashboard/RecentReviewsList";
import { DashboardLayout } from "../components/layout/DashboardLayout";

export function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        <DashboardTopBar />
        <HeroSection />
        <MetricsSection />

        <section className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <ReviewsSnapshotCard />
          <ShipmentTrackerCard />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          <EarningsOverviewCard />
          <RecentReviewsList />
        </section>
      </div>
    </DashboardLayout>
  );
}
