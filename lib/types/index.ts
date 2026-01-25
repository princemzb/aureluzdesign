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

export interface OpenSlot {
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
  isExceptional?: boolean; // True if this is an exceptional opening slot
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
// Types Clients
// ============================================

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
}

export interface UpdateClientInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  notes?: string;
}

export interface ClientWithStats extends Client {
  quotes_count: number;
  tasks_count: number;
  total_amount: number;
  pending_tasks: number;
}

// ============================================
// Types Tâches (Tasks)
// ============================================

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low';

export interface TaskAttachment {
  id: string;
  filename: string;
  url: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  name: string;
  location: string | null;
  due_date: string | null;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  attachments: TaskAttachment[];
  auto_complete: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskDetail {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskSubtask {
  id: string;
  task_id: string;
  content: string;
  is_completed: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface TaskWithDetails extends Task {
  details: TaskDetail[];
}

export interface TaskWithSubtasks extends Task {
  subtasks: TaskSubtask[];
}

export interface TaskFull extends Task {
  details: TaskDetail[];
  subtasks: TaskSubtask[];
}

export interface CreateTaskInput {
  client_id: string;
  name: string;
  location?: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  attachments?: TaskAttachment[];
  auto_complete?: boolean;
}

export interface UpdateTaskInput {
  name?: string;
  location?: string;
  due_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  attachments?: TaskAttachment[];
  auto_complete?: boolean;
}

export interface CreateTaskDetailInput {
  task_id: string;
  content: string;
}

export interface UpdateTaskDetailInput {
  content: string;
}

export interface CreateTaskSubtaskInput {
  task_id: string;
  content: string;
  position?: number;
}

export interface UpdateTaskSubtaskInput {
  content?: string;
  is_completed?: boolean;
  position?: number;
}

export interface ReorderSubtasksInput {
  subtask_ids: string[];
}

export interface TaskWithClient extends Task {
  client: Client;
}

// ============================================
// Types Devis (Quotes)
// ============================================

// Statuts du devis :
// - draft: Brouillon en cours d'édition
// - sent: Envoyé, en attente d'acceptation par le client
// - accepted: Accepté par le client, en attente de paiement
// - paid: Paiement(s) reçu(s)
// - rejected: Refusé par le client
// - expired: Délai de validité dépassé
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'expired';

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
  client_id: string;
  // Informations client (copie au moment de la création pour l'historique)
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
  accepted_at: string | null;
  expires_at: string | null;
  // Champs paiement
  deposit_percent: number;
  deposit_amount: number | null;
  validation_token: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  paid_at: string | null;
  paid_amount: number | null;
  // Échéancier de paiement personnalisé
  payment_schedule: PaymentScheduleItem[] | null;
}

// Configuration d'une échéance de paiement
export interface PaymentScheduleItem {
  label: string;
  percentage: number;
}

export interface CreateQuoteInput {
  client_id: string;
  // Informations client (copiées depuis le client sélectionné)
  client_name: string;
  client_email: string;
  client_phone?: string;
  event_date?: string;
  event_type?: string;
  items: Omit<QuoteItem, 'id' | 'total'>[];
  vat_rate: number;
  notes?: string;
  validity_days?: number;
  deposit_percent?: number;
  // Échéancier de paiement personnalisé
  payment_schedule?: PaymentScheduleItem[];
}

export interface QuoteWithClient extends Quote {
  client: Client;
}

export interface UpdateQuoteInput extends Partial<CreateQuoteInput> {
  status?: QuoteStatus;
}

// ============================================
// Types Échéances de paiement (Quote Payments)
// ============================================

export type QuotePaymentStatus = 'pending' | 'sent' | 'paid' | 'cancelled';

export interface QuotePayment {
  id: string;
  quote_id: string;
  payment_number: number;
  label: string;
  description: string | null;
  amount: number;
  percentage: number | null;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  status: QuotePaymentStatus;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  validation_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateQuotePaymentInput {
  quote_id: string;
  payment_number: number;
  label: string;
  description?: string;
  amount: number;
  percentage?: number;
  due_date?: string;
}

export interface UpdateQuotePaymentInput {
  label?: string;
  description?: string;
  amount?: number;
  percentage?: number;
  due_date?: string;
  status?: QuotePaymentStatus;
}

export interface QuotePaymentSummary {
  quote_id: string;
  quote_number: string;
  total: number;
  total_payments: number;
  paid_payments: number;
  total_paid: number;
  remaining_amount: number;
  payment_status: 'fully_paid' | 'partially_paid' | 'unpaid';
}

// ============================================
// Types Factures (Invoices)
// ============================================

export interface Invoice {
  id: string;
  invoice_number: string;
  quote_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  pdf_url: string | null;
  pdf_storage_path: string | null;
  payment_method: 'stripe' | 'paypal';
  stripe_payment_intent_id: string | null;
  created_at: string;
  sent_at: string | null;
  notes: string | null;
}

export interface CreateInvoiceInput {
  quote_id: string;
  client_name: string;
  client_email: string;
  amount: number;
  vat_amount?: number;
  total_amount: number;
  payment_method?: 'stripe' | 'paypal';
  stripe_payment_intent_id?: string;
  notes?: string;
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
