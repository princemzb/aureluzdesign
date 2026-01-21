-- ============================================================
-- SCRIPT DE RESET COMPLET DE LA BASE DE DONNÉES AURELUZ
-- ============================================================
-- Ce script supprime toutes les tables et les recrée from scratch
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- PARTIE 1: NETTOYAGE COMPLET
-- ============================================================

-- Supprimer les vues
DROP VIEW IF EXISTS quote_payment_summary CASCADE;

-- Supprimer les triggers
DROP TRIGGER IF EXISTS appointments_updated_at ON appointments;
DROP TRIGGER IF EXISTS quotes_updated_at ON quotes;
DROP TRIGGER IF EXISTS set_quote_number ON quotes;
DROP TRIGGER IF EXISTS calculate_quote_deposit ON quotes;
DROP TRIGGER IF EXISTS set_invoice_number ON invoices;
DROP TRIGGER IF EXISTS clients_updated_at ON clients;
DROP TRIGGER IF EXISTS tasks_updated_at ON tasks;
DROP TRIGGER IF EXISTS analytics_conversions_updated_at ON analytics_conversions;
DROP TRIGGER IF EXISTS analytics_daily_stats_updated_at ON analytics_daily_stats;
DROP TRIGGER IF EXISTS trigger_quote_payments_updated_at ON quote_payments;

-- Supprimer les tables (ordre important pour les FK)
DROP TABLE IF EXISTS quote_payments CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS quotes CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS blocked_slots CASCADE;
DROP TABLE IF EXISTS open_slots CASCADE;
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS site_settings CASCADE;
DROP TABLE IF EXISTS email_templates CASCADE;
DROP TABLE IF EXISTS testimonials CASCADE;
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS analytics_page_views CASCADE;
DROP TABLE IF EXISTS analytics_conversions CASCADE;
DROP TABLE IF EXISTS analytics_daily_stats CASCADE;
DROP TABLE IF EXISTS analytics_sessions CASCADE;

-- Supprimer les fonctions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_quotes_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_clients_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_tasks_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_quote_payments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_quote_number() CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS calculate_deposit_amount() CASCADE;
DROP FUNCTION IF EXISTS create_default_payment_schedule(UUID) CASCADE;
DROP FUNCTION IF EXISTS increment_session_page_views(UUID) CASCADE;
DROP FUNCTION IF EXISTS aggregate_daily_analytics(DATE) CASCADE;

-- Supprimer les types enum
DROP TYPE IF EXISTS event_type CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS photo_category CASCADE;
DROP TYPE IF EXISTS quote_status CASCADE;
DROP TYPE IF EXISTS device_type CASCADE;
DROP TYPE IF EXISTS task_status CASCADE;
DROP TYPE IF EXISTS task_priority CASCADE;

-- ============================================================
-- PARTIE 2: CRÉATION DES TYPES ENUM
-- ============================================================

CREATE TYPE event_type AS ENUM ('signature', 'instants', 'coaching');
CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE photo_category AS ENUM ('signature', 'instants', 'coaching');
CREATE TYPE quote_status AS ENUM ('draft', 'sent', 'accepted', 'rejected', 'expired');
CREATE TYPE device_type AS ENUM ('desktop', 'mobile', 'tablet');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('urgent', 'high', 'normal', 'low');

-- ============================================================
-- PARTIE 3: FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction générique pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PARTIE 4: TABLE APPOINTMENTS
-- ============================================================

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(100) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    event_type event_type NOT NULL,
    message TEXT,
    status appointment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT unique_slot UNIQUE (date, start_time)
);

CREATE INDEX idx_appointments_date ON appointments(date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date_status ON appointments(date, status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at DESC);

CREATE TRIGGER appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create appointments" ON appointments
    FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can read all appointments" ON appointments
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update appointments" ON appointments
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete appointments" ON appointments
    FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 5: TABLE BLOCKED_SLOTS
-- ============================================================

CREATE TABLE blocked_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_blocked_time CHECK (end_time > start_time),
    CONSTRAINT unique_blocked_slot UNIQUE (date, start_time)
);

CREATE INDEX idx_blocked_slots_date ON blocked_slots(date);
CREATE INDEX idx_blocked_slots_date_range ON blocked_slots(date, start_time, end_time);

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blocked_slots" ON blocked_slots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert blocked_slots" ON blocked_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update blocked_slots" ON blocked_slots FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete blocked_slots" ON blocked_slots FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 6: TABLE OPEN_SLOTS
-- ============================================================

CREATE TABLE open_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, start_time)
);

CREATE INDEX idx_open_slots_date ON open_slots(date);
CREATE INDEX idx_open_slots_date_time ON open_slots(date, start_time, end_time);

ALTER TABLE open_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read open slots" ON open_slots FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert open slots" ON open_slots FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update open slots" ON open_slots FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete open slots" ON open_slots FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 7: TABLE PHOTOS
-- ============================================================

CREATE TABLE photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url VARCHAR(500) NOT NULL,
    alt VARCHAR(255) NOT NULL,
    category photo_category NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_photos_category ON photos(category);
CREATE INDEX idx_photos_order ON photos(display_order);
CREATE INDEX idx_photos_category_order ON photos(category, display_order);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read photos" ON photos FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert photos" ON photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update photos" ON photos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete photos" ON photos FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 8: TABLE BUSINESS_HOURS
-- ============================================================

CREATE TABLE business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '18:00',
    is_open BOOLEAN DEFAULT true,
    CONSTRAINT unique_day UNIQUE (day_of_week),
    CONSTRAINT valid_hours CHECK (close_time > open_time)
);

INSERT INTO business_hours (day_of_week, open_time, close_time, is_open) VALUES
    (0, '09:00', '18:00', false),
    (1, '09:00', '18:00', true),
    (2, '09:00', '18:00', true),
    (3, '09:00', '18:00', true),
    (4, '09:00', '18:00', true),
    (5, '09:00', '18:00', true),
    (6, '09:00', '18:00', false);

ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read business_hours" ON business_hours FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update business_hours" ON business_hours FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 9: STORAGE BUCKET PHOTOS
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('photos', 'photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete photos" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete photos" ON storage.objects FOR DELETE USING (bucket_id = 'photos' AND auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 10: TABLES ANALYTICS
-- ============================================================

CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint_hash VARCHAR(64) NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    device_type device_type,
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),
    screen_width INTEGER,
    screen_height INTEGER,
    referrer_url TEXT,
    referrer_domain VARCHAR(255),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    page_views_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    is_bounce BOOLEAN DEFAULT true,
    is_converted BOOLEAN DEFAULT false,
    is_new_visitor BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    page_referrer VARCHAR(500),
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    time_on_page_seconds INTEGER,
    max_scroll_depth INTEGER DEFAULT 0,
    load_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    page_view_id UUID REFERENCES analytics_page_views(id) ON DELETE SET NULL,
    event_category VARCHAR(50) NOT NULL,
    event_action VARCHAR(100) NOT NULL,
    event_label VARCHAR(255),
    event_value INTEGER,
    event_data JSONB,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analytics_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    step_homepage_visit TIMESTAMPTZ,
    step_booking_page_visit TIMESTAMPTZ,
    step_date_selected TIMESTAMPTZ,
    step_time_selected TIMESTAMPTZ,
    step_form_started TIMESTAMPTZ,
    step_form_submitted TIMESTAMPTZ,
    step_confirmation_viewed TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    abandoned_at_step VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_session_conversion UNIQUE (session_id)
);

CREATE TABLE analytics_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,
    total_sessions INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    new_visitors INTEGER DEFAULT 0,
    returning_visitors INTEGER DEFAULT 0,
    total_page_views INTEGER DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    avg_pages_per_session NUMERIC(5,2) DEFAULT 0,
    bounce_rate NUMERIC(5,2) DEFAULT 0,
    booking_page_views INTEGER DEFAULT 0,
    form_starts INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_fingerprint ON analytics_sessions(fingerprint_hash);
CREATE INDEX idx_sessions_started_at ON analytics_sessions(started_at);
CREATE INDEX idx_sessions_country ON analytics_sessions(country_code);
CREATE INDEX idx_sessions_device ON analytics_sessions(device_type);
CREATE INDEX idx_sessions_referrer_domain ON analytics_sessions(referrer_domain);
CREATE INDEX idx_page_views_session ON analytics_page_views(session_id);
CREATE INDEX idx_page_views_viewed_at ON analytics_page_views(viewed_at);
CREATE INDEX idx_page_views_path ON analytics_page_views(page_path);
CREATE INDEX idx_events_session ON analytics_events(session_id);
CREATE INDEX idx_events_category ON analytics_events(event_category);
CREATE INDEX idx_events_triggered_at ON analytics_events(triggered_at);
CREATE INDEX idx_conversions_session ON analytics_conversions(session_id);
CREATE INDEX idx_daily_stats_date ON analytics_daily_stats(date);

CREATE TRIGGER analytics_conversions_updated_at
    BEFORE UPDATE ON analytics_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER analytics_daily_stats_updated_at
    BEFORE UPDATE ON analytics_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION increment_session_page_views(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE analytics_sessions
    SET page_views_count = page_views_count + 1,
        is_bounce = CASE WHEN page_views_count >= 1 THEN false ELSE true END,
        last_activity_at = NOW()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION aggregate_daily_analytics(target_date DATE)
RETURNS void AS $$
DECLARE
    stats RECORD;
BEGIN
    SELECT
        COUNT(DISTINCT id) as total_sessions,
        COUNT(DISTINCT fingerprint_hash) as unique_visitors,
        COUNT(DISTINCT CASE WHEN is_new_visitor THEN fingerprint_hash END) as new_visitors,
        COUNT(DISTINCT CASE WHEN NOT is_new_visitor THEN fingerprint_hash END) as returning_visitors,
        SUM(page_views_count) as total_page_views,
        COALESCE(AVG(EXTRACT(EPOCH FROM (last_activity_at - started_at)))::INTEGER, 0) as avg_duration,
        COALESCE(AVG(page_views_count)::NUMERIC(5,2), 0) as avg_pages,
        COALESCE((COUNT(CASE WHEN is_bounce THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) * 100)::NUMERIC(5,2), 0) as bounce_rate,
        COUNT(CASE WHEN is_converted THEN 1 END) as conversions
    INTO stats
    FROM analytics_sessions
    WHERE DATE(started_at) = target_date;

    INSERT INTO analytics_daily_stats (
        date, total_sessions, unique_visitors, new_visitors, returning_visitors,
        total_page_views, avg_session_duration_seconds, avg_pages_per_session,
        bounce_rate, conversions
    ) VALUES (
        target_date,
        COALESCE(stats.total_sessions, 0),
        COALESCE(stats.unique_visitors, 0),
        COALESCE(stats.new_visitors, 0),
        COALESCE(stats.returning_visitors, 0),
        COALESCE(stats.total_page_views, 0),
        COALESCE(stats.avg_duration, 0),
        COALESCE(stats.avg_pages, 0),
        COALESCE(stats.bounce_rate, 0),
        COALESCE(stats.conversions, 0)
    )
    ON CONFLICT (date) DO UPDATE SET
        total_sessions = EXCLUDED.total_sessions,
        unique_visitors = EXCLUDED.unique_visitors,
        new_visitors = EXCLUDED.new_visitors,
        returning_visitors = EXCLUDED.returning_visitors,
        total_page_views = EXCLUDED.total_page_views,
        avg_session_duration_seconds = EXCLUDED.avg_session_duration_seconds,
        avg_pages_per_session = EXCLUDED.avg_pages_per_session,
        bounce_rate = EXCLUDED.bounce_rate,
        conversions = EXCLUDED.conversions,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert sessions" ON analytics_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert page_views" ON analytics_page_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert events" ON analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert conversions" ON analytics_conversions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin can read sessions" ON analytics_sessions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can read page_views" ON analytics_page_views FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can read events" ON analytics_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can read conversions" ON analytics_conversions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin can read daily_stats" ON analytics_daily_stats FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Service can update sessions" ON analytics_sessions FOR UPDATE USING (true);
CREATE POLICY "Service can update page_views" ON analytics_page_views FOR UPDATE USING (true);
CREATE POLICY "Service can update conversions" ON analytics_conversions FOR UPDATE USING (true);
CREATE POLICY "Service can manage daily_stats" ON analytics_daily_stats FOR ALL USING (true);

-- ============================================================
-- PARTIE 11: TABLE CLIENTS
-- ============================================================

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    company VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_created_at ON clients(created_at DESC);

CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION update_clients_updated_at();

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clients" ON clients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert clients" ON clients FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update clients" ON clients FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete clients" ON clients FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 12: TABLE TASKS
-- ============================================================

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    due_date TIMESTAMPTZ,
    description TEXT,
    status task_status DEFAULT 'pending',
    priority task_priority DEFAULT 'normal',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_client_id ON tasks(client_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        NEW.completed_at = NOW();
    END IF;
    IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_tasks_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tasks" ON tasks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert tasks" ON tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update tasks" ON tasks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete tasks" ON tasks FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- PARTIE 13: TABLE QUOTES
-- ============================================================

CREATE TABLE quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_number VARCHAR(20) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    client_phone VARCHAR(20),
    event_date DATE,
    event_type VARCHAR(100),
    items JSONB NOT NULL DEFAULT '[]',
    vat_rate DECIMAL(5,2) DEFAULT 20.00,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    vat_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total DECIMAL(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    validity_days INTEGER DEFAULT 30,
    status quote_status DEFAULT 'draft',
    deposit_percent INTEGER DEFAULT 30,
    deposit_amount DECIMAL(10,2),
    validation_token UUID DEFAULT gen_random_uuid() UNIQUE,
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    paid_at TIMESTAMPTZ,
    paid_amount DECIMAL(10,2),
    accepted_at TIMESTAMPTZ,
    payment_schedule JSONB DEFAULT '[{"label": "Acompte", "percentage": 30}, {"label": "Solde", "percentage": 70}]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_client_email ON quotes(client_email);
CREATE INDEX idx_quotes_created_at ON quotes(created_at DESC);
CREATE INDEX idx_quotes_validation_token ON quotes(validation_token);
CREATE INDEX idx_quotes_client_id ON quotes(client_id);

CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 6) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM quotes
    WHERE quote_number LIKE year_part || '-%';
    NEW.quote_number := year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_quote_number
    BEFORE INSERT ON quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
    EXECUTE FUNCTION generate_quote_number();

CREATE OR REPLACE FUNCTION update_quotes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_quotes_updated_at();

CREATE OR REPLACE FUNCTION calculate_deposit_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.deposit_percent IS NOT NULL AND NEW.total IS NOT NULL THEN
        NEW.deposit_amount := ROUND((NEW.total * NEW.deposit_percent / 100)::NUMERIC, 2);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_quote_deposit
    BEFORE INSERT OR UPDATE OF deposit_percent, total ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION calculate_deposit_amount();

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quotes" ON quotes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert quotes" ON quotes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update quotes" ON quotes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete quotes" ON quotes FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "Public can read quotes by token" ON quotes FOR SELECT USING (
    validation_token IS NOT NULL
    AND validation_token = current_setting('app.current_quote_token', true)::UUID
);

-- ============================================================
-- PARTIE 14: TABLE INVOICES
-- ============================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(20) NOT NULL UNIQUE,
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    pdf_url TEXT,
    pdf_storage_path VARCHAR(255),
    payment_method VARCHAR(50) DEFAULT 'stripe',
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    notes TEXT
);

CREATE INDEX idx_invoices_quote_id ON invoices(quote_id);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_client_email ON invoices(client_email);

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'FAC-' || year_part || '-%';
    NEW.invoice_number := 'FAC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    WHEN (NEW.invoice_number IS NULL OR NEW.invoice_number = '')
    EXECUTE FUNCTION generate_invoice_number();

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invoices" ON invoices FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert invoices" ON invoices FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update invoices" ON invoices FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Service role full access invoices" ON invoices USING (auth.role() = 'service_role');

-- ============================================================
-- PARTIE 15: TABLE QUOTE_PAYMENTS
-- ============================================================

CREATE TABLE quote_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    payment_number INT NOT NULL DEFAULT 1,
    label VARCHAR(100) NOT NULL DEFAULT 'Paiement',
    description TEXT,
    amount DECIMAL(10,2) NOT NULL,
    percentage DECIMAL(5,2),
    due_date DATE,
    sent_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'cancelled')),
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    validation_token UUID UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(quote_id, payment_number)
);

CREATE INDEX idx_quote_payments_quote_id ON quote_payments(quote_id);
CREATE INDEX idx_quote_payments_status ON quote_payments(status);
CREATE INDEX idx_quote_payments_validation_token ON quote_payments(validation_token);
CREATE INDEX idx_quote_payments_due_date ON quote_payments(due_date);

CREATE OR REPLACE FUNCTION update_quote_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_quote_payments_updated_at
    BEFORE UPDATE ON quote_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_payments_updated_at();

CREATE OR REPLACE FUNCTION create_default_payment_schedule(p_quote_id UUID)
RETURNS VOID AS $$
DECLARE
    v_quote RECORD;
BEGIN
    SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quote not found';
    END IF;
    DELETE FROM quote_payments WHERE quote_id = p_quote_id AND status = 'pending';
    INSERT INTO quote_payments (quote_id, payment_number, label, amount, percentage, status)
    VALUES (p_quote_id, 1, 'Acompte', ROUND(v_quote.total * COALESCE(v_quote.deposit_percent, 30) / 100, 2), COALESCE(v_quote.deposit_percent, 30), 'pending');
    INSERT INTO quote_payments (quote_id, payment_number, label, amount, percentage, status)
    VALUES (p_quote_id, 2, 'Solde', ROUND(v_quote.total * (100 - COALESCE(v_quote.deposit_percent, 30)) / 100, 2), 100 - COALESCE(v_quote.deposit_percent, 30), 'pending');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW quote_payment_summary AS
SELECT
    q.id AS quote_id,
    q.quote_number,
    q.total,
    COUNT(qp.id) AS total_payments,
    COUNT(qp.id) FILTER (WHERE qp.status = 'paid') AS paid_payments,
    COALESCE(SUM(qp.amount) FILTER (WHERE qp.status = 'paid'), 0) AS total_paid,
    q.total - COALESCE(SUM(qp.amount) FILTER (WHERE qp.status = 'paid'), 0) AS remaining_amount,
    CASE
        WHEN COUNT(qp.id) = COUNT(qp.id) FILTER (WHERE qp.status = 'paid') THEN 'fully_paid'
        WHEN COUNT(qp.id) FILTER (WHERE qp.status = 'paid') > 0 THEN 'partially_paid'
        ELSE 'unpaid'
    END AS payment_status
FROM quotes q
LEFT JOIN quote_payments qp ON q.id = qp.quote_id
GROUP BY q.id, q.quote_number, q.total;

ALTER TABLE quote_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage quote payments" ON quote_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can view payments by token" ON quote_payments FOR SELECT TO anon USING (validation_token IS NOT NULL);

-- ============================================================
-- PARTIE 16: TABLE SERVICES
-- ============================================================

CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    emoji VARCHAR(10) NOT NULL DEFAULT '✨',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_display_order ON services(display_order);
CREATE INDEX idx_services_active ON services(is_active);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Service role full access to services" ON services USING (auth.role() = 'service_role');

INSERT INTO services (emoji, title, description, display_order) VALUES
('💍', 'Mariage', 'Bien plus qu''une décoration, une signature visuelle complète. Nous concevons l''ambiance de votre cérémonie et de votre réception dans les moindres détails (fleurs, mobilier, mise en scène). De la conception à la dépose le jour J, nous donnons vie à vos rêves pendant que vous profitez de vos invités.', 1),
('🎂', 'Événements spéciaux', 'L''art de transformer un simple repas en une expérience esthétique et mémorable. De l''intimité d''un dîner de fiançailles à la joie d''une baby shower, en passant par vos anniversaires et EVJF chic, nous créons un écrin sur-mesure pour vos plus beaux souvenirs. Une ambiance élégante et conviviale, jusque dans les moindres détails.', 2),
('💡', 'Accompagnement "Do It Yourself"', 'L''art de faire soi-même, avec l''œil d''une experte. Pour les mariés créatifs et les organisateurs qui souhaitent piloter leur décoration, nous vous offrons une boussole esthétique. Ensemble, nous définissons une vision cohérente et impactante pour donner vie à votre projet, avec l''assurance d''un résultat professionnel.', 3);

-- ============================================================
-- PARTIE 17: TABLE SITE_SETTINGS
-- ============================================================

CREATE TABLE site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    type VARCHAR(50) DEFAULT 'text',
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_site_settings_key ON site_settings(key);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site settings" ON site_settings FOR SELECT USING (true);
CREATE POLICY "Service role full access to site settings" ON site_settings USING (auth.role() = 'service_role');

INSERT INTO site_settings (key, value, type, description) VALUES
('logo_url', '/images/aureluz-design-logo-decoration-evenementielle.png', 'image', 'Logo principal du site'),
('contact_phone', '+33661434365', 'text', 'Numéro de téléphone affiché sur le site'),
('contact_email', 'contact@aureluzdesign.fr', 'text', 'Email de contact public'),
('admin_email', 'aureluzdesign@gmail.com', 'text', 'Email pour recevoir les notifications admin'),
('social_instagram', 'https://www.instagram.com/aure_luz_design/', 'text', 'Lien vers le profil Instagram'),
('social_facebook', '', 'text', 'Lien vers la page Facebook'),
('social_linkedin', '', 'text', 'Lien vers le profil LinkedIn');

-- ============================================================
-- PARTIE 18: TABLE EMAIL_TEMPLATES
-- ============================================================

CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_templates_slug ON email_templates(slug);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to email templates" ON email_templates USING (auth.role() = 'service_role');

INSERT INTO email_templates (slug, name, subject, content) VALUES
('salon-mariage', 'Campagne Salon du Mariage', 'Suite à notre rencontre au Salon du Mariage - AureLuz', '{
    "greeting": "Bonjour {name},",
    "paragraphs": [
        "C''était un réel plaisir de vous rencontrer lors du Salon du Mariage !",
        "J''espère que cette journée vous a inspiré pour votre futur événement. Comme promis, je reviens vers vous pour vous accompagner dans la création d''une décoration unique et à votre image.",
        "Je serais ravie d''échanger avec vous sur votre projet et de vous présenter mes différentes prestations lors d''un rendez-vous personnalisé."
    ],
    "ctaText": "Prendre rendez-vous",
    "instagramText": "N''hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations !",
    "signatureName": "Aurélie",
    "signatureTitle": "Fondatrice d''AureLuz Design"
}'::jsonb);

-- ============================================================
-- PARTIE 19: TABLE TESTIMONIALS
-- ============================================================

CREATE TABLE testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_name VARCHAR(255) NOT NULL,
    client_email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_testimonials_status ON testimonials(status);
CREATE INDEX idx_testimonials_created_at ON testimonials(created_at DESC);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read approved testimonials" ON testimonials FOR SELECT USING (status = 'approved');
CREATE POLICY "Anyone can submit testimonials" ON testimonials FOR INSERT WITH CHECK (status = 'pending');
CREATE POLICY "Service role full access to testimonials" ON testimonials USING (auth.role() = 'service_role');

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
-- Base de données recréée avec succès !
-- N'oubliez pas de créer un utilisateur admin dans Supabase Auth
