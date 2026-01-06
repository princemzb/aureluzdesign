'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';
import type {
  AnalyticsOverview,
  GeographicData,
  DeviceData,
  BrowserData,
  TopPage,
  TrafficSource,
  FunnelStep,
  RecentActivity,
} from '@/lib/types';

interface DateRange {
  from: string;
  to: string;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  dailyVisitors: { date: string; visitors: number; pageViews: number }[];
  geographic: GeographicData[];
  devices: DeviceData[];
  browsers: BrowserData[];
  topPages: TopPage[];
  trafficSources: TrafficSource[];
  funnel: FunnelStep[];
  recentActivity: RecentActivity[];
}

/**
 * Récupère toutes les données analytics pour le dashboard
 */
export async function getAnalyticsData(dateRange?: DateRange): Promise<AnalyticsData> {
  const supabase = createAdminClient();

  // Dates par défaut : 30 derniers jours
  const to = dateRange?.to || format(new Date(), 'yyyy-MM-dd');
  const from = dateRange?.from || format(subDays(new Date(), 30), 'yyyy-MM-dd');

  // Période précédente pour comparaison
  const daysDiff = Math.ceil(
    (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24)
  );
  const prevTo = format(subDays(new Date(from), 1), 'yyyy-MM-dd');
  const prevFrom = format(subDays(new Date(from), daysDiff + 1), 'yyyy-MM-dd');

  // Exécuter les requêtes en parallèle
  const [
    overviewData,
    prevOverviewData,
    dailyData,
    geoData,
    deviceData,
    browserData,
    pageData,
    sourceData,
    funnelData,
    activityData,
  ] = await Promise.all([
    getOverviewStats(supabase, from, to),
    getOverviewStats(supabase, prevFrom, prevTo),
    getDailyStats(supabase, from, to),
    getGeographicStats(supabase, from, to),
    getDeviceStats(supabase, from, to),
    getBrowserStats(supabase, from, to),
    getTopPages(supabase, from, to),
    getTrafficSources(supabase, from, to),
    getFunnelStats(supabase, from, to),
    getRecentActivity(supabase),
  ]);

  // Calculer les comparaisons
  const comparison = {
    visitorsChange: calculateChange(overviewData.uniqueVisitors, prevOverviewData.uniqueVisitors),
    pageViewsChange: calculateChange(overviewData.pageViews, prevOverviewData.pageViews),
    bounceRateChange: calculateChange(overviewData.bounceRate, prevOverviewData.bounceRate),
    conversionsChange: calculateChange(overviewData.conversions, prevOverviewData.conversions),
  };

  return {
    overview: { ...overviewData, comparison },
    dailyVisitors: dailyData,
    geographic: geoData,
    devices: deviceData,
    browsers: browserData,
    topPages: pageData,
    trafficSources: sourceData,
    funnel: funnelData,
    recentActivity: activityData,
  };
}

/**
 * Calcule le pourcentage de changement
 */
function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Stats générales pour la période
 */
async function getOverviewStats(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<Omit<AnalyticsOverview, 'comparison'>> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('id, fingerprint_hash, page_views_count, is_bounce, is_converted, started_at, last_activity_at')
    .gte('started_at', fromDate)
    .lte('started_at', toDate);

  if (!sessions || sessions.length === 0) {
    return {
      totalVisitors: 0,
      uniqueVisitors: 0,
      pageViews: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      conversions: 0,
      conversionRate: 0,
    };
  }

  const totalVisitors = sessions.length;
  const uniqueVisitors = new Set(sessions.map((s) => s.fingerprint_hash)).size;
  const pageViews = sessions.reduce((sum, s) => sum + (s.page_views_count || 0), 0);
  const bounces = sessions.filter((s) => s.is_bounce).length;
  const conversions = sessions.filter((s) => s.is_converted).length;

  // Calculer la durée moyenne de session
  const durations = sessions
    .filter((s) => s.started_at && s.last_activity_at)
    .map((s) => {
      const start = new Date(s.started_at).getTime();
      const end = new Date(s.last_activity_at).getTime();
      return Math.max(0, (end - start) / 1000); // en secondes
    });

  const avgSessionDuration =
    durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

  return {
    totalVisitors,
    uniqueVisitors,
    pageViews,
    avgSessionDuration,
    bounceRate: totalVisitors > 0 ? Math.round((bounces / totalVisitors) * 100) : 0,
    conversions,
    conversionRate: totalVisitors > 0 ? Math.round((conversions / totalVisitors) * 100) : 0,
  };
}

/**
 * Stats quotidiennes pour les graphiques
 */
async function getDailyStats(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<{ date: string; visitors: number; pageViews: number }[]> {
  const { data: dailyStats } = await supabase
    .from('analytics_daily_stats')
    .select('date, unique_visitors, total_page_views')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  // Si pas de stats pré-agrégées, calculer à partir des sessions
  if (!dailyStats || dailyStats.length === 0) {
    const fromDate = startOfDay(new Date(from)).toISOString();
    const toDate = endOfDay(new Date(to)).toISOString();

    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('started_at, fingerprint_hash, page_views_count')
      .gte('started_at', fromDate)
      .lte('started_at', toDate);

    if (!sessions) return [];

    // Grouper par jour
    const byDay = new Map<string, { visitors: Set<string>; pageViews: number }>();

    sessions.forEach((session) => {
      const day = format(new Date(session.started_at), 'yyyy-MM-dd');
      if (!byDay.has(day)) {
        byDay.set(day, { visitors: new Set(), pageViews: 0 });
      }
      const dayData = byDay.get(day)!;
      dayData.visitors.add(session.fingerprint_hash);
      dayData.pageViews += session.page_views_count || 0;
    });

    return Array.from(byDay.entries())
      .map(([date, data]) => ({
        date,
        visitors: data.visitors.size,
        pageViews: data.pageViews,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return dailyStats.map((d) => ({
    date: d.date,
    visitors: d.unique_visitors,
    pageViews: d.total_page_views,
  }));
}

/**
 * Répartition géographique
 */
async function getGeographicStats(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<GeographicData[]> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('country_code, country_name')
    .gte('started_at', fromDate)
    .lte('started_at', toDate)
    .not('country_code', 'is', null);

  if (!sessions || sessions.length === 0) return [];

  // Compter par pays
  const countByCountry = new Map<string, { name: string; count: number }>();

  sessions.forEach((session) => {
    const code = session.country_code || 'XX';
    const name = session.country_name || 'Unknown';
    if (!countByCountry.has(code)) {
      countByCountry.set(code, { name, count: 0 });
    }
    countByCountry.get(code)!.count++;
  });

  const total = sessions.length;

  return Array.from(countByCountry.entries())
    .map(([code, data]) => ({
      country_code: code,
      country_name: data.name,
      visitors: data.count,
      percentage: Math.round((data.count / total) * 100),
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
}

/**
 * Répartition par appareil
 */
async function getDeviceStats(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<DeviceData[]> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('device_type')
    .gte('started_at', fromDate)
    .lte('started_at', toDate);

  if (!sessions || sessions.length === 0) return [];

  const countByDevice = new Map<string, number>();

  sessions.forEach((session) => {
    const device = session.device_type || 'unknown';
    countByDevice.set(device, (countByDevice.get(device) || 0) + 1);
  });

  const total = sessions.length;

  return Array.from(countByDevice.entries())
    .map(([device, count]) => ({
      device_type: device as DeviceData['device_type'],
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Répartition par navigateur
 */
async function getBrowserStats(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<BrowserData[]> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('browser')
    .gte('started_at', fromDate)
    .lte('started_at', toDate);

  if (!sessions || sessions.length === 0) return [];

  const countByBrowser = new Map<string, number>();

  sessions.forEach((session) => {
    const browser = session.browser || 'Unknown';
    countByBrowser.set(browser, (countByBrowser.get(browser) || 0) + 1);
  });

  const total = sessions.length;

  return Array.from(countByBrowser.entries())
    .map(([browser, count]) => ({
      browser,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

/**
 * Pages les plus visitées
 */
async function getTopPages(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<TopPage[]> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: pageViews } = await supabase
    .from('analytics_page_views')
    .select('page_path, session_id, time_on_page_seconds')
    .gte('viewed_at', fromDate)
    .lte('viewed_at', toDate);

  if (!pageViews || pageViews.length === 0) return [];

  const pageStats = new Map<
    string,
    { views: number; sessions: Set<string>; totalTime: number; timeCount: number }
  >();

  pageViews.forEach((pv) => {
    if (!pageStats.has(pv.page_path)) {
      pageStats.set(pv.page_path, { views: 0, sessions: new Set(), totalTime: 0, timeCount: 0 });
    }
    const stats = pageStats.get(pv.page_path)!;
    stats.views++;
    stats.sessions.add(pv.session_id);
    if (pv.time_on_page_seconds) {
      stats.totalTime += pv.time_on_page_seconds;
      stats.timeCount++;
    }
  });

  return Array.from(pageStats.entries())
    .map(([path, stats]) => ({
      page_path: path,
      views: stats.views,
      unique_views: stats.sessions.size,
      avg_time_seconds: stats.timeCount > 0 ? Math.round(stats.totalTime / stats.timeCount) : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);
}

/**
 * Sources de trafic
 */
async function getTrafficSources(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<TrafficSource[]> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: sessions } = await supabase
    .from('analytics_sessions')
    .select('referrer_domain, utm_source, is_converted')
    .gte('started_at', fromDate)
    .lte('started_at', toDate);

  if (!sessions || sessions.length === 0) return [];

  const sourceStats = new Map<string, { visitors: number; conversions: number }>();

  sessions.forEach((session) => {
    let source = 'Direct';

    if (session.utm_source) {
      source = session.utm_source;
    } else if (session.referrer_domain) {
      // Catégoriser les domaines connus
      const domain = session.referrer_domain.toLowerCase();
      if (domain.includes('google')) source = 'Google';
      else if (domain.includes('facebook') || domain.includes('fb.')) source = 'Facebook';
      else if (domain.includes('instagram')) source = 'Instagram';
      else if (domain.includes('twitter') || domain.includes('x.com')) source = 'Twitter/X';
      else if (domain.includes('linkedin')) source = 'LinkedIn';
      else if (domain.includes('pinterest')) source = 'Pinterest';
      else source = session.referrer_domain;
    }

    if (!sourceStats.has(source)) {
      sourceStats.set(source, { visitors: 0, conversions: 0 });
    }
    const stats = sourceStats.get(source)!;
    stats.visitors++;
    if (session.is_converted) stats.conversions++;
  });

  const total = sessions.length;

  return Array.from(sourceStats.entries())
    .map(([source, stats]) => ({
      source,
      visitors: stats.visitors,
      percentage: Math.round((stats.visitors / total) * 100),
      conversions: stats.conversions,
    }))
    .sort((a, b) => b.visitors - a.visitors)
    .slice(0, 10);
}

/**
 * Stats du funnel de conversion
 */
async function getFunnelStats(
  supabase: ReturnType<typeof createAdminClient>,
  from: string,
  to: string
): Promise<FunnelStep[]> {
  const fromDate = startOfDay(new Date(from)).toISOString();
  const toDate = endOfDay(new Date(to)).toISOString();

  const { data: conversions } = await supabase
    .from('analytics_conversions')
    .select('*')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  if (!conversions || conversions.length === 0) {
    return getEmptyFunnel();
  }

  const total = conversions.length;

  const steps = [
    { step: 'homepage_visit', label: 'Visite homepage', field: 'step_homepage_visit' },
    { step: 'booking_page_visit', label: 'Page réservation', field: 'step_booking_page_visit' },
    { step: 'date_selected', label: 'Date sélectionnée', field: 'step_date_selected' },
    { step: 'time_selected', label: 'Créneau sélectionné', field: 'step_time_selected' },
    { step: 'form_started', label: 'Formulaire commencé', field: 'step_form_started' },
    { step: 'form_submitted', label: 'Formulaire soumis', field: 'step_form_submitted' },
    { step: 'confirmation_viewed', label: 'Confirmation', field: 'step_confirmation_viewed' },
  ];

  let previousCount = total;

  return steps.map((stepDef) => {
    const count = conversions.filter(
      (c) => c[stepDef.field as keyof typeof c] !== null
    ).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    const dropoff = previousCount > 0 ? Math.round(((previousCount - count) / previousCount) * 100) : 0;

    previousCount = count;

    return {
      step: stepDef.step,
      label: stepDef.label,
      count,
      percentage,
      dropoff,
    };
  });
}

function getEmptyFunnel(): FunnelStep[] {
  return [
    { step: 'homepage_visit', label: 'Visite homepage', count: 0, percentage: 0, dropoff: 0 },
    { step: 'booking_page_visit', label: 'Page réservation', count: 0, percentage: 0, dropoff: 0 },
    { step: 'date_selected', label: 'Date sélectionnée', count: 0, percentage: 0, dropoff: 0 },
    { step: 'time_selected', label: 'Créneau sélectionné', count: 0, percentage: 0, dropoff: 0 },
    { step: 'form_started', label: 'Formulaire commencé', count: 0, percentage: 0, dropoff: 0 },
    { step: 'form_submitted', label: 'Formulaire soumis', count: 0, percentage: 0, dropoff: 0 },
    { step: 'confirmation_viewed', label: 'Confirmation', count: 0, percentage: 0, dropoff: 0 },
  ];
}

/**
 * Activité récente
 */
async function getRecentActivity(
  supabase: ReturnType<typeof createAdminClient>
): Promise<RecentActivity[]> {
  const activities: RecentActivity[] = [];

  // Dernières pages vues
  const { data: recentPageViews } = await supabase
    .from('analytics_page_views')
    .select('id, page_path, viewed_at, session_id')
    .order('viewed_at', { ascending: false })
    .limit(10);

  if (recentPageViews) {
    // Récupérer les infos de session pour ces page views
    const sessionIds = [...new Set(recentPageViews.map((pv) => pv.session_id))];
    const { data: sessions } = await supabase
      .from('analytics_sessions')
      .select('id, country_name, device_type')
      .in('id', sessionIds);

    const sessionMap = new Map(sessions?.map((s) => [s.id, s]) || []);

    recentPageViews.forEach((pv) => {
      const session = sessionMap.get(pv.session_id);
      activities.push({
        id: pv.id,
        type: 'page_view',
        description: `Visite de ${pv.page_path}`,
        timestamp: pv.viewed_at,
        country: session?.country_name || undefined,
        device: session?.device_type || undefined,
      });
    });
  }

  // Dernières conversions
  const { data: recentConversions } = await supabase
    .from('analytics_conversions')
    .select('id, converted_at')
    .not('converted_at', 'is', null)
    .order('converted_at', { ascending: false })
    .limit(5);

  if (recentConversions) {
    recentConversions.forEach((conv) => {
      activities.push({
        id: conv.id,
        type: 'conversion',
        description: 'Nouvelle réservation',
        timestamp: conv.converted_at!,
      });
    });
  }

  // Trier par timestamp et limiter
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}

/**
 * Agrège les stats quotidiennes (à appeler via cron job)
 */
export async function aggregateDailyStats(date?: string): Promise<void> {
  const supabase = createAdminClient();
  const targetDate = date || format(subDays(new Date(), 1), 'yyyy-MM-dd');

  await supabase.rpc('aggregate_daily_analytics', { target_date: targetDate });
}
