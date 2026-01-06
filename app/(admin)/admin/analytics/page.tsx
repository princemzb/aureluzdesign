import { BarChart3 } from 'lucide-react';
import { getAnalyticsData } from '@/lib/actions/analytics.actions';
import { AnalyticsOverviewCards } from '@/components/analytics/analytics-overview';
import { VisitorsChart } from '@/components/analytics/visitors-chart';
import { ConversionFunnel } from '@/components/analytics/conversion-funnel';
import { GeographicBreakdown } from '@/components/analytics/geographic-breakdown';
import { DeviceBreakdown } from '@/components/analytics/device-breakdown';
import { TrafficSources } from '@/components/analytics/traffic-sources';
import { TopPagesTable } from '@/components/analytics/top-pages-table';
import { RecentActivityFeed } from '@/components/analytics/recent-activity';

interface AnalyticsPageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const params = await searchParams;
  const dateRange = params.from && params.to ? { from: params.from, to: params.to } : undefined;

  const data = await getAnalyticsData(dateRange);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <BarChart3 className="h-5 w-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-medium text-foreground">
              Analytiques
            </h1>
            <p className="text-muted-foreground mt-1">
              Statistiques de votre site web (30 derniers jours)
            </p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <AnalyticsOverviewCards data={data.overview} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VisitorsChart data={data.dailyVisitors} />
        <ConversionFunnel data={data.funnel} />
      </div>

      {/* Data Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GeographicBreakdown data={data.geographic} />
        <DeviceBreakdown devices={data.devices} browsers={data.browsers} />
        <TrafficSources data={data.trafficSources} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopPagesTable data={data.topPages} />
        <RecentActivityFeed data={data.recentActivity} />
      </div>
    </div>
  );
}
