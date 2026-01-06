-- Migration 006: Tables Analytics
-- Système d'analytics custom pour AureLuz (GDPR compliant)

-- ============================================
-- Enum pour le type d'appareil
-- ============================================
CREATE TYPE device_type AS ENUM ('desktop', 'mobile', 'tablet');

-- ============================================
-- Table: analytics_sessions
-- Sessions visiteurs uniques
-- ============================================
CREATE TABLE analytics_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification session (hashé, pas de données personnelles)
    fingerprint_hash VARCHAR(64) NOT NULL,

    -- Données temporelles
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),

    -- Géolocalisation (depuis IP, IP non stockée)
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),

    -- Informations appareil
    device_type device_type,
    browser VARCHAR(50),
    browser_version VARCHAR(20),
    os VARCHAR(50),
    os_version VARCHAR(20),

    -- Dimensions écran
    screen_width INTEGER,
    screen_height INTEGER,

    -- Source du trafic
    referrer_url TEXT,
    referrer_domain VARCHAR(255),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),

    -- Métriques session (mises à jour au fil de la session)
    page_views_count INTEGER DEFAULT 0,
    events_count INTEGER DEFAULT 0,
    is_bounce BOOLEAN DEFAULT true,
    is_converted BOOLEAN DEFAULT false,

    -- Type de visiteur
    is_new_visitor BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: analytics_page_views
-- Pages visitées individuellement
-- ============================================
CREATE TABLE analytics_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,

    -- Informations page
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(255),
    page_referrer VARCHAR(500),

    -- Timing
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    time_on_page_seconds INTEGER,

    -- Profondeur de scroll (pourcentage)
    max_scroll_depth INTEGER DEFAULT 0,

    -- Performance
    load_time_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: analytics_events
-- Événements custom (clics, formulaires, etc.)
-- ============================================
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,
    page_view_id UUID REFERENCES analytics_page_views(id) ON DELETE SET NULL,

    -- Identification événement
    event_category VARCHAR(50) NOT NULL,
    event_action VARCHAR(100) NOT NULL,
    event_label VARCHAR(255),
    event_value INTEGER,

    -- Données additionnelles (JSON)
    event_data JSONB,

    -- Timing
    triggered_at TIMESTAMPTZ DEFAULT NOW(),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: analytics_conversions
-- Funnel de conversion
-- ============================================
CREATE TABLE analytics_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES analytics_sessions(id) ON DELETE CASCADE,

    -- Étapes du funnel (timestamps quand atteint)
    step_homepage_visit TIMESTAMPTZ,
    step_booking_page_visit TIMESTAMPTZ,
    step_date_selected TIMESTAMPTZ,
    step_time_selected TIMESTAMPTZ,
    step_form_started TIMESTAMPTZ,
    step_form_submitted TIMESTAMPTZ,
    step_confirmation_viewed TIMESTAMPTZ,

    -- Métadonnées conversion
    converted_at TIMESTAMPTZ,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

    -- Tracking abandon
    abandoned_at_step VARCHAR(50),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_session_conversion UNIQUE (session_id)
);

-- ============================================
-- Table: analytics_daily_stats
-- Stats pré-agrégées par jour (performance)
-- ============================================
CREATE TABLE analytics_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE UNIQUE NOT NULL,

    -- Métriques visiteurs
    total_sessions INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    new_visitors INTEGER DEFAULT 0,
    returning_visitors INTEGER DEFAULT 0,

    -- Métriques engagement
    total_page_views INTEGER DEFAULT 0,
    avg_session_duration_seconds INTEGER DEFAULT 0,
    avg_pages_per_session NUMERIC(5,2) DEFAULT 0,
    bounce_rate NUMERIC(5,2) DEFAULT 0,

    -- Métriques conversion
    booking_page_views INTEGER DEFAULT 0,
    form_starts INTEGER DEFAULT 0,
    form_submissions INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_rate NUMERIC(5,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Index pour performance
-- ============================================
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

-- ============================================
-- Triggers pour updated_at
-- ============================================
CREATE TRIGGER analytics_conversions_updated_at
    BEFORE UPDATE ON analytics_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER analytics_daily_stats_updated_at
    BEFORE UPDATE ON analytics_daily_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- ============================================
-- Fonction helper pour incrémenter page_views_count
-- ============================================
CREATE OR REPLACE FUNCTION increment_session_page_views(p_session_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE analytics_sessions
    SET
        page_views_count = page_views_count + 1,
        is_bounce = CASE WHEN page_views_count >= 1 THEN false ELSE true END,
        last_activity_at = NOW()
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Fonction pour agréger les stats quotidiennes
-- ============================================
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

-- ============================================
-- RLS (Row Level Security)
-- ============================================
ALTER TABLE analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_stats ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut insérer (pour le tracking)
CREATE POLICY "Anyone can insert sessions" ON analytics_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert page_views" ON analytics_page_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert events" ON analytics_events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can insert conversions" ON analytics_conversions
    FOR INSERT WITH CHECK (true);

-- Seul admin peut lire
CREATE POLICY "Admin can read sessions" ON analytics_sessions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can read page_views" ON analytics_page_views
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can read events" ON analytics_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can read conversions" ON analytics_conversions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can read daily_stats" ON analytics_daily_stats
    FOR SELECT USING (auth.role() = 'authenticated');

-- Service role peut tout faire (pour les mises à jour)
CREATE POLICY "Service can update sessions" ON analytics_sessions
    FOR UPDATE USING (true);

CREATE POLICY "Service can update page_views" ON analytics_page_views
    FOR UPDATE USING (true);

CREATE POLICY "Service can update conversions" ON analytics_conversions
    FOR UPDATE USING (true);

CREATE POLICY "Service can manage daily_stats" ON analytics_daily_stats
    FOR ALL USING (true);
