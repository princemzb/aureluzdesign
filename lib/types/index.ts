// Types d'énumérations
export type EventType = 'signature' | 'instants' | 'coaching';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled';
export type PhotoCategory = 'signature' | 'instants' | 'coaching';
export type TestimonialStatus = 'pending' | 'approved' | 'rejected';

// Entités de base de données
export interface Appointment {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  event_type: EventType;
  message: string | null;
  status: AppointmentStatus;
  created_at: string;
  updated_at: string;
}

export interface BlockedSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  url: string;
  alt: string;
  category: PhotoCategory;
  display_order: number;
  created_at: string;
}

export interface BusinessHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_open: boolean;
}

export interface Testimonial {
  id: string;
  client_name: string;
  client_email: string;
  event_type: string;
  event_date: string | null;
  rating: number;
  title: string;
  content: string;
  photo_url: string | null;
  status: TestimonialStatus;
  created_at: string;
  approved_at: string | null;
  updated_at: string;
}

// Types pour les formulaires (input)
export interface CreateAppointmentInput {
  client_name: string;
  client_email: string;
  client_phone: string;
  date: string;
  start_time: string;
  event_type: EventType;
  message?: string;
}

export interface UpdateAppointmentInput {
  status?: AppointmentStatus;
}

// Types pour les créneaux disponibles
export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface DayAvailability {
  date: string;
  slots: TimeSlot[];
  isOpen: boolean;
}

// Types pour les résultats d'actions
export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Types Analytics
// ============================================

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface AnalyticsSession {
  id: string;
  fingerprint_hash: string;
  started_at: string;
  last_activity_at: string;
  country_code: string | null;
  country_name: string | null;
  region: string | null;
  city: string | null;
  device_type: DeviceType | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  os_version: string | null;
  screen_width: number | null;
  screen_height: number | null;
  referrer_url: string | null;
  referrer_domain: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  page_views_count: number;
  events_count: number;
  is_bounce: boolean;
  is_converted: boolean;
  is_new_visitor: boolean;
  created_at: string;
}

export interface AnalyticsPageView {
  id: string;
  session_id: string;
  page_path: string;
  page_title: string | null;
  page_referrer: string | null;
  viewed_at: string;
  time_on_page_seconds: number | null;
  max_scroll_depth: number;
  load_time_ms: number | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  session_id: string;
  page_view_id: string | null;
  event_category: string;
  event_action: string;
  event_label: string | null;
  event_value: number | null;
  event_data: Record<string, unknown> | null;
  triggered_at: string;
  created_at: string;
}

export interface AnalyticsConversion {
  id: string;
  session_id: string;
  step_homepage_visit: string | null;
  step_booking_page_visit: string | null;
  step_date_selected: string | null;
  step_time_selected: string | null;
  step_form_started: string | null;
  step_form_submitted: string | null;
  step_confirmation_viewed: string | null;
  converted_at: string | null;
  appointment_id: string | null;
  abandoned_at_step: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsDailyStats {
  id: string;
  date: string;
  total_sessions: number;
  unique_visitors: number;
  new_visitors: number;
  returning_visitors: number;
  total_page_views: number;
  avg_session_duration_seconds: number;
  avg_pages_per_session: number;
  bounce_rate: number;
  booking_page_views: number;
  form_starts: number;
  form_submissions: number;
  conversions: number;
  conversion_rate: number;
  created_at: string;
  updated_at: string;
}

// Types pour le tracking (input)
export interface TrackSessionInput {
  fingerprintHash: string;
  deviceType?: DeviceType;
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
  referrerUrl?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface TrackPageViewInput {
  sessionId: string;
  pagePath: string;
  pageTitle?: string;
  pageReferrer?: string;
  loadTimeMs?: number;
}

export interface TrackEventInput {
  sessionId: string;
  pageViewId?: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  data?: Record<string, unknown>;
}

// Types pour le dashboard analytics
export interface AnalyticsOverview {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  avgSessionDuration: number;
  bounceRate: number;
  conversions: number;
  conversionRate: number;
  comparison: {
    visitorsChange: number;
    pageViewsChange: number;
    bounceRateChange: number;
    conversionsChange: number;
  };
}

export interface GeographicData {
  country_code: string;
  country_name: string;
  visitors: number;
  percentage: number;
}

export interface DeviceData {
  device_type: DeviceType;
  count: number;
  percentage: number;
}

export interface BrowserData {
  browser: string;
  count: number;
  percentage: number;
}

export interface TopPage {
  page_path: string;
  views: number;
  unique_views: number;
  avg_time_seconds: number;
}

export interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
  conversions: number;
}

export interface FunnelStep {
  step: string;
  label: string;
  count: number;
  percentage: number;
  dropoff: number;
}

export interface RecentActivity {
  id: string;
  type: 'page_view' | 'event' | 'conversion';
  description: string;
  timestamp: string;
  country?: string;
  device?: string;
}

// ============================================
// Types Devis (Quotes)
// ============================================

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  quote_number: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  event_date: string | null;
  event_type: string | null;
  items: QuoteItem[];
  vat_rate: number;
  subtotal: number;
  vat_amount: number;
  total: number;
  notes: string | null;
  validity_days: number;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  expires_at: string | null;
}

export interface CreateQuoteInput {
  client_name: string;
  client_email: string;
  client_phone?: string;
  event_date?: string;
  event_type?: string;
  items: Omit<QuoteItem, 'id' | 'total'>[];
  vat_rate: number;
  notes?: string;
  validity_days?: number;
}

export interface UpdateQuoteInput extends Partial<CreateQuoteInput> {
  status?: QuoteStatus;
}

// ============================================
// Types Services (Configurable service cards)
// ============================================

export interface Service {
  id: string;
  emoji: string;
  title: string;
  description: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  emoji: string;
  title: string;
  description: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdateServiceInput {
  emoji?: string;
  title?: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}
