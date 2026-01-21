--
-- PostgreSQL database dump
--

\restrict TT019zk72VzLT3npW3JYWCnydWagXtm4hT3Q3kLAGf6qRoYVM38hd0oxJs5q2la

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: appointment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.appointment_status AS ENUM (
    'pending',
    'confirmed',
    'cancelled'
);


--
-- Name: device_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_type AS ENUM (
    'desktop',
    'mobile',
    'tablet'
);


--
-- Name: event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.event_type AS ENUM (
    'mariage',
    'table',
    'autre'
);


--
-- Name: photo_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.photo_category AS ENUM (
    'mariage',
    'evenement',
    'table'
);


--
-- Name: quote_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.quote_status AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'expired'
);


--
-- Name: aggregate_daily_analytics(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aggregate_daily_analytics(target_date date) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: calculate_deposit_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_deposit_amount() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Calculer le montant d'acompte si le pourcentage ou le total change
    IF NEW.deposit_percent IS NOT NULL AND NEW.total IS NOT NULL THEN
        NEW.deposit_amount := ROUND((NEW.total * NEW.deposit_percent / 100)::NUMERIC, 2);
    END IF;
    RETURN NEW;
END;
$$;


--
-- Name: create_default_payment_schedule(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_payment_schedule(p_quote_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_quote RECORD;
BEGIN
  SELECT * INTO v_quote FROM quotes WHERE id = p_quote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quote not found';
  END IF;

  -- Supprimer les anciens paiements pending
  DELETE FROM quote_payments WHERE quote_id = p_quote_id AND status = 'pending';

  -- Créer l'acompte (30%)
  INSERT INTO quote_payments (quote_id, payment_number, label, amount, percentage, status)
  VALUES (
    p_quote_id,
    1,
    'Acompte',
    ROUND(v_quote.total * COALESCE(v_quote.deposit_percent, 30) / 100, 2),
    COALESCE(v_quote.deposit_percent, 30),
    'pending'
  );

  -- Créer le solde (70%)
  INSERT INTO quote_payments (quote_id, payment_number, label, amount, percentage, status)
  VALUES (
    p_quote_id,
    2,
    'Solde',
    ROUND(v_quote.total * (100 - COALESCE(v_quote.deposit_percent, 30)) / 100, 2),
    100 - COALESCE(v_quote.deposit_percent, 30),
    'pending'
  );
END;
$$;


--
-- Name: generate_invoice_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invoice_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    year_part VARCHAR(4);
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5 FOR 4) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'FAC-' || year_part || '-%';

    NEW.invoice_number := 'FAC-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');

    RETURN NEW;
END;
$$;


--
-- Name: generate_quote_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_quote_number() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: increment_session_page_views(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_session_page_views(p_session_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE analytics_sessions
    SET
        page_views_count = page_views_count + 1,
        is_bounce = CASE WHEN page_views_count >= 1 THEN false ELSE true END,
        last_activity_at = NOW()
    WHERE id = p_session_id;
END;
$$;


--
-- Name: update_quote_payments_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quote_payments_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_quotes_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_quotes_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: analytics_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_conversions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    step_homepage_visit timestamp with time zone,
    step_booking_page_visit timestamp with time zone,
    step_date_selected timestamp with time zone,
    step_time_selected timestamp with time zone,
    step_form_started timestamp with time zone,
    step_form_submitted timestamp with time zone,
    step_confirmation_viewed timestamp with time zone,
    converted_at timestamp with time zone,
    appointment_id uuid,
    abandoned_at_step character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: analytics_daily_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_daily_stats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    total_sessions integer DEFAULT 0,
    unique_visitors integer DEFAULT 0,
    new_visitors integer DEFAULT 0,
    returning_visitors integer DEFAULT 0,
    total_page_views integer DEFAULT 0,
    avg_session_duration_seconds integer DEFAULT 0,
    avg_pages_per_session numeric(5,2) DEFAULT 0,
    bounce_rate numeric(5,2) DEFAULT 0,
    booking_page_views integer DEFAULT 0,
    form_starts integer DEFAULT 0,
    form_submissions integer DEFAULT 0,
    conversions integer DEFAULT 0,
    conversion_rate numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    page_view_id uuid,
    event_category character varying(50) NOT NULL,
    event_action character varying(100) NOT NULL,
    event_label character varying(255),
    event_value integer,
    event_data jsonb,
    triggered_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: analytics_page_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_page_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    page_path character varying(500) NOT NULL,
    page_title character varying(255),
    page_referrer character varying(500),
    viewed_at timestamp with time zone DEFAULT now(),
    time_on_page_seconds integer,
    max_scroll_depth integer DEFAULT 0,
    load_time_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: analytics_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analytics_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fingerprint_hash character varying(64) NOT NULL,
    started_at timestamp with time zone DEFAULT now(),
    last_activity_at timestamp with time zone DEFAULT now(),
    country_code character varying(2),
    country_name character varying(100),
    region character varying(100),
    city character varying(100),
    device_type public.device_type,
    browser character varying(50),
    browser_version character varying(20),
    os character varying(50),
    os_version character varying(20),
    screen_width integer,
    screen_height integer,
    referrer_url text,
    referrer_domain character varying(255),
    utm_source character varying(100),
    utm_medium character varying(100),
    utm_campaign character varying(100),
    page_views_count integer DEFAULT 0,
    events_count integer DEFAULT 0,
    is_bounce boolean DEFAULT true,
    is_converted boolean DEFAULT false,
    is_new_visitor boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: appointments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_name character varying(100) NOT NULL,
    client_email character varying(255) NOT NULL,
    client_phone character varying(20) NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    event_type public.event_type NOT NULL,
    message text,
    status public.appointment_status DEFAULT 'pending'::public.appointment_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_time_range CHECK ((end_time > start_time))
);


--
-- Name: blocked_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blocked_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT valid_blocked_time CHECK ((end_time > start_time))
);


--
-- Name: business_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    day_of_week integer NOT NULL,
    open_time time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
    close_time time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
    is_open boolean DEFAULT true,
    CONSTRAINT business_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT valid_hours CHECK ((close_time > open_time))
);


--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    subject character varying(500) NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE email_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_templates IS 'Editable email templates for campaigns';


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    invoice_number character varying(20) NOT NULL,
    quote_id uuid NOT NULL,
    client_name character varying(255) NOT NULL,
    client_email character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    vat_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    pdf_url text,
    pdf_storage_path character varying(255),
    payment_method character varying(50) DEFAULT 'stripe'::character varying,
    stripe_payment_intent_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    notes text
);


--
-- Name: open_slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.open_slots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    reason character varying(255),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.photos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    url character varying(500) NOT NULL,
    alt character varying(255) NOT NULL,
    category public.photo_category NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: quote_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    payment_number integer DEFAULT 1 NOT NULL,
    label character varying(100) DEFAULT 'Paiement'::character varying NOT NULL,
    description text,
    amount numeric(10,2) NOT NULL,
    percentage numeric(5,2),
    due_date date,
    sent_at timestamp with time zone,
    paid_at timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    stripe_session_id character varying(255),
    stripe_payment_intent_id character varying(255),
    validation_token uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT quote_payments_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'sent'::character varying, 'paid'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number character varying(20) NOT NULL,
    client_name character varying(255) NOT NULL,
    client_email character varying(255) NOT NULL,
    client_phone character varying(20),
    event_date date,
    event_type character varying(100),
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    vat_rate numeric(5,2) DEFAULT 20.00,
    subtotal numeric(10,2) DEFAULT 0 NOT NULL,
    vat_amount numeric(10,2) DEFAULT 0 NOT NULL,
    total numeric(10,2) DEFAULT 0 NOT NULL,
    notes text,
    validity_days integer DEFAULT 30,
    status public.quote_status DEFAULT 'draft'::public.quote_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    sent_at timestamp with time zone,
    expires_at timestamp with time zone,
    deposit_percent integer DEFAULT 30,
    deposit_amount numeric(10,2),
    validation_token uuid DEFAULT gen_random_uuid(),
    stripe_payment_intent_id character varying(255),
    stripe_session_id character varying(255),
    paid_at timestamp with time zone,
    paid_amount numeric(10,2),
    payment_schedule jsonb DEFAULT '[{"label": "Acompte", "percentage": 30}, {"label": "Solde", "percentage": 70}]'::jsonb,
    accepted_at timestamp with time zone
);


--
-- Name: COLUMN quotes.payment_schedule; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes.payment_schedule IS 'Custom payment schedule with label and percentage for each installment';


--
-- Name: COLUMN quotes.accepted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quotes.accepted_at IS 'Timestamp when the client accepted the quote';


--
-- Name: quote_payment_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.quote_payment_summary AS
 SELECT q.id AS quote_id,
    q.quote_number,
    q.total,
    count(qp.id) AS total_payments,
    count(qp.id) FILTER (WHERE ((qp.status)::text = 'paid'::text)) AS paid_payments,
    COALESCE(sum(qp.amount) FILTER (WHERE ((qp.status)::text = 'paid'::text)), (0)::numeric) AS total_paid,
    (q.total - COALESCE(sum(qp.amount) FILTER (WHERE ((qp.status)::text = 'paid'::text)), (0)::numeric)) AS remaining_amount,
        CASE
            WHEN (count(qp.id) = count(qp.id) FILTER (WHERE ((qp.status)::text = 'paid'::text))) THEN 'fully_paid'::text
            WHEN (count(qp.id) FILTER (WHERE ((qp.status)::text = 'paid'::text)) > 0) THEN 'partially_paid'::text
            ELSE 'unpaid'::text
        END AS payment_status
   FROM (public.quotes q
     LEFT JOIN public.quote_payments qp ON ((q.id = qp.quote_id)))
  GROUP BY q.id, q.quote_number, q.total;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    emoji character varying(10) DEFAULT '✨'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE services; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.services IS 'Configurable service cards displayed on the homepage';


--
-- Name: site_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    type character varying(50) DEFAULT 'text'::character varying,
    description character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE site_settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_settings IS 'Configurable site settings (logo, etc.)';


--
-- Data for Name: analytics_conversions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_conversions (id, session_id, step_homepage_visit, step_booking_page_visit, step_date_selected, step_time_selected, step_form_started, step_form_submitted, step_confirmation_viewed, converted_at, appointment_id, abandoned_at_step, created_at, updated_at) FROM stdin;
a676d9ac-40db-4e87-99db-877e60a0c74f	1ef08781-61ea-4155-8dd8-b16f635d9a7c	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 19:41:40.686745+00	2026-01-13 19:41:40.686745+00
e13ed6f8-228d-4291-a822-73887730b3a7	bd4b652a-dcf7-464f-aba7-191c66104740	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-13 19:48:15.285041+00	2026-01-13 19:48:15.285041+00
889a2217-0b3b-41a2-82f2-cd648e66df8a	ae07cb05-a3e6-464d-bc24-b030c1089828	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-14 17:00:00.380357+00	2026-01-14 17:00:00.380357+00
6f2e9ea3-bc0c-4843-9748-cf3b6a499f7a	95642d6e-628f-40f1-a811-51c5b9ecbbbd	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-14 18:49:32.401191+00	2026-01-14 18:49:32.401191+00
48f2ddae-ac47-476a-b9c1-2dc74b98c033	d6b4a9e2-0a81-4b2a-be14-197d901ca19b	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-14 18:50:24.278052+00	2026-01-14 18:50:24.278052+00
14b321d8-5cce-4ffb-a8e0-1a06bd185cdb	8047dd19-6f6f-4f4c-8492-9ed5c34b9f7e	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-14 18:58:36.287793+00	2026-01-14 18:58:36.287793+00
0b1537da-0f09-4a42-b270-c916a138663c	71a8e463-c930-4b90-a0d4-32927192a309	2026-01-16 11:12:53.165+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-16 11:12:53.057894+00	2026-01-16 11:12:53.175511+00
6ee225f0-f775-4a48-93a6-e7b20479b1f6	423239bc-62d4-4d8b-9988-78481d4e4727	2026-01-16 12:53:43.97+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-16 12:52:28.510109+00	2026-01-16 12:53:43.972605+00
443290b4-bd38-430e-8993-4e898e57db5d	4f98221a-9c91-4712-8063-0b3df1a7cf52	2026-01-16 18:07:38.199+00	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-16 11:12:25.030259+00	2026-01-16 18:07:38.200188+00
f3fec781-6d3e-4ac5-92da-b62b1d513dbc	9a503c16-1266-412f-a146-f2e255eff6ae	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-17 11:12:15.024041+00	2026-01-17 11:12:15.024041+00
9e285e9c-5fff-4ae3-803a-9a12ecf67c64	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	2026-01-17 11:14:42.62+00	2026-01-17 11:14:46.916+00	2026-01-17 11:15:11.258+00	2026-01-17 11:15:14.13+00	2026-01-17 11:15:14.131+00	\N	\N	\N	\N	\N	2026-01-17 11:14:42.321118+00	2026-01-17 11:15:14.131815+00
49637739-134b-413a-8e71-8c2fa8197f49	d122aed4-e65c-4fa9-8257-918e75e2393e	2026-01-17 11:34:41.492+00	2026-01-17 11:32:24.582+00	2026-01-17 11:34:31.802+00	\N	\N	\N	\N	\N	\N	\N	2026-01-17 11:32:22.098174+00	2026-01-17 11:34:41.493375+00
203d3caa-a083-4251-8794-3c43b2ade92c	67b550b2-77ce-4f9d-b200-db2452a01ee8	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-17 12:25:39.464829+00	2026-01-17 12:25:39.464829+00
adf35554-2e76-4c3a-b73c-92b3300e629a	ef194f60-3f5b-4e33-b41d-156514ac8e9b	2026-01-17 17:30:55.26+00	2026-01-17 17:33:28.442+00	2026-01-17 17:39:31.005+00	\N	\N	\N	\N	\N	\N	\N	2026-01-17 12:25:41.2919+00	2026-01-17 17:39:31.010491+00
cc043069-b6ea-4fe0-b6d7-50ea4a3ccc68	837365d8-c377-406d-8fb3-f2eb3f72b103	2026-01-17 17:40:10.485+00	2026-01-17 17:39:56.023+00	2026-01-17 17:40:00.27+00	\N	\N	\N	\N	\N	\N	\N	2026-01-17 17:39:53.547628+00	2026-01-17 17:40:10.486521+00
54a39cac-f401-4636-b01e-15f7ce7ed81d	3e7b138f-37f7-4544-a7b7-d0489fece42f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-17 17:52:02.34161+00	2026-01-17 17:52:02.34161+00
e7ab48c7-0b67-460d-9c4b-35a45860d830	3df35a38-ba6b-47b7-a9d5-1c3334fdb9aa	\N	2026-01-17 17:53:07.67+00	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-17 17:52:52.57431+00	2026-01-17 17:53:07.678423+00
c6337dfa-e75d-4951-a9df-f2452d5a03bf	f6842b95-f9ec-4194-ab8d-db2166d9ffee	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-18 16:15:57.51217+00	2026-01-18 16:15:57.51217+00
6718b107-66d1-4f14-89a5-27b2ec2c3a5a	5356f396-4df0-44cb-b685-9a6167cf76e7	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-18 17:08:25.323112+00	2026-01-18 17:08:25.323112+00
4668c2f8-e1a2-42be-a26c-673876d9380f	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-19 06:02:52.984414+00	2026-01-19 06:02:52.984414+00
55761ab2-9788-450f-b85e-4ecd0c0f5e96	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-19 06:47:13.397974+00	2026-01-19 06:47:13.397974+00
b3307408-7904-4daf-961f-25157dd8d21b	c9fe5f1c-b2be-4529-a2f0-b73c6d7bf206	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2026-01-19 06:54:12.833243+00	2026-01-19 06:54:12.833243+00
\.


--
-- Data for Name: analytics_daily_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_daily_stats (id, date, total_sessions, unique_visitors, new_visitors, returning_visitors, total_page_views, avg_session_duration_seconds, avg_pages_per_session, bounce_rate, booking_page_views, form_starts, form_submissions, conversions, conversion_rate, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: analytics_events; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_events (id, session_id, page_view_id, event_category, event_action, event_label, event_value, event_data, triggered_at, created_at) FROM stdin;
\.


--
-- Data for Name: analytics_page_views; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_page_views (id, session_id, page_path, page_title, page_referrer, viewed_at, time_on_page_seconds, max_scroll_depth, load_time_ms, created_at) FROM stdin;
37a92152-bd04-4821-b7dd-29e2942d9ec3	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 17:00:06.085877+00	9	0	13535	2026-01-14 17:00:06.085877+00
03b3f14f-25b0-494d-8dbb-0df51274f8dd	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/nouveau	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 18:51:01.254086+00	86	100	26356	2026-01-14 18:51:01.254086+00
65fac740-cac5-4510-b64d-e13e429384c8	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 17:00:15.045324+00	24	100	22634	2026-01-14 17:00:15.045324+00
09d4b56e-488b-4862-99b0-7a715c33cf26	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 17:00:39.131125+00	10	0	46724	2026-01-14 17:00:39.131125+00
71ba811b-133a-495c-a687-eaec56ef5a74	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 18:52:27.786869+00	\N	0	112873	2026-01-14 18:52:27.786869+00
1347616d-a855-4487-9333-76399990b812	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/nouveau	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 17:00:48.950224+00	433	100	56537	2026-01-14 17:00:48.950224+00
cac943f1-d309-4ccf-a0db-4a449acc0136	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 17:08:01.780663+00	5	0	432833	2026-01-14 17:08:01.780663+00
0ca3dfd3-2e50-48af-a735-b19dd5447530	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/5452a33f-1725-4988-8b45-0afabdddc2f0	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 17:08:06.786776+00	\N	100	437827	2026-01-14 17:08:06.786776+00
7b905e66-c8e3-4751-be0c-01b32ee37500	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/5452a33f-1725-4988-8b45-0afabdddc2f0	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 18:50:36.896394+00	7	0	1892	2026-01-14 18:50:36.896394+00
87e997df-ff73-4bba-ae05-0340fc7d2bfd	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-14 18:50:44.539179+00	17	0	9616	2026-01-14 18:50:44.539179+00
cca65995-245b-4a34-95c0-74436958154b	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/5452a33f-1725-4988-8b45-0afabdddc2f0	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 13:00:59.191921+00	56	0	1710	2026-01-16 13:00:59.191921+00
606994e8-ec2f-4ebc-8863-e67070f27745	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis	2026-01-14 18:54:07.255428+00	\N	0	2056	2026-01-14 18:54:07.255428+00
f981f4e3-f781-43cf-a44d-81991c0e04af	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis	2026-01-14 18:54:35.264879+00	23	0	1208	2026-01-14 18:54:35.264879+00
18bf0550-89da-4aad-9b09-177713a464c8	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis	2026-01-14 18:54:58.602796+00	\N	100	24560	2026-01-14 18:54:58.602796+00
bdc6acc1-a803-4b8f-8e36-822c1968ae0f	ae07cb05-a3e6-464d-bc24-b030c1089828	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis	2026-01-14 18:57:58.137576+00	\N	0	2758	2026-01-14 18:57:58.137576+00
e286b869-18b1-499e-a180-88cf751a5809	8047dd19-6f6f-4f4c-8492-9ed5c34b9f7e	/devis/42eb18a5-3e70-4d77-9ae3-858690896dfe/success	Paiement confirmé - AureLuz Design | Aureluz Design	\N	2026-01-14 18:59:54.416158+00	\N	0	4290	2026-01-14 18:59:54.416158+00
d392051a-8b96-41b4-bb2a-bad0d37c32f3	71a8e463-c930-4b90-a0d4-32927192a309	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 11:12:53.11025+00	\N	0	1579	2026-01-16 11:12:53.11025+00
3bc52762-3cfa-4814-b9ec-1c27baef7227	71a8e463-c930-4b90-a0d4-32927192a309	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 11:14:33.313908+00	101	0	2784	2026-01-16 11:14:33.313908+00
fba257de-cbb5-451d-91ba-6cd7d154fe96	71a8e463-c930-4b90-a0d4-32927192a309	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 11:16:13.952261+00	15	0	104073	2026-01-16 11:16:13.952261+00
4d9a5172-6187-4cc9-bfc5-c00a28442147	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 11:16:29.201664+00	149	0	119318	2026-01-16 11:16:29.201664+00
913ffd3d-6c52-4aea-90ae-640c057deaca	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 11:18:59.197811+00	27	31	269292	2026-01-16 11:18:59.197811+00
a2d4396e-976d-490e-8781-c963d35c2554	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 11:19:26.303455+00	\N	0	296447	2026-01-16 11:19:26.303455+00
84754297-15e8-42df-89c0-2510cc5a6775	423239bc-62d4-4d8b-9988-78481d4e4727	/devis/42eb18a5-3e70-4d77-9ae3-858690896dfe/success	Paiement confirmé - AureLuz Design | Aureluz Design	\N	2026-01-16 12:53:05.716453+00	38	0	3415	2026-01-16 12:53:05.716453+00
25472c20-5b9b-490f-9eb7-c7e3842f1f6f	423239bc-62d4-4d8b-9988-78481d4e4727	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 12:53:43.93738+00	\N	0	41705	2026-01-16 12:53:43.93738+00
c56d2cef-df96-457a-9f44-9a0199cebfe3	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 13:01:54.471102+00	2	0	58037	2026-01-16 13:01:54.471102+00
39474eee-8c96-48fb-b4df-7686cc67eb87	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 12:48:59.131103+00	525	100	359838	2026-01-16 12:48:59.131103+00
15652e03-27c7-46f2-9e7b-7df2e41eeb34	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 12:57:42.914424+00	2	0	885477	2026-01-16 12:57:42.914424+00
bc4b63f1-4ef0-46c8-bfc2-989c4832ea2c	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/5452a33f-1725-4988-8b45-0afabdddc2f0	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 12:57:44.940037+00	\N	0	887503	2026-01-16 12:57:44.940037+00
4acaa076-a4fe-48fa-b8e8-90801525e973	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 13:01:56.897815+00	\N	0	60419	2026-01-16 13:01:56.897815+00
4cdba840-f7c5-479c-a7a0-bf7699951a4c	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 13:04:03.051905+00	\N	0	1488	2026-01-16 13:04:03.051905+00
64c70be3-6dfe-4b05-a340-656aef9431bc	71a8e463-c930-4b90-a0d4-32927192a309	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-16 13:04:05.435844+00	\N	0	1517	2026-01-16 13:04:05.435844+00
fdff4df3-47b9-4b0e-8f58-923df11dcd66	4f98221a-9c91-4712-8063-0b3df1a7cf52	/	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/	2026-01-16 18:07:38.138154+00	\N	0	1760	2026-01-16 18:07:38.138154+00
13c40e38-3ea6-4f9e-9ea9-d4a228231e63	9a503c16-1266-412f-a146-f2e255eff6ae	/admin/settings	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 11:12:22.574808+00	\N	0	11376	2026-01-17 11:12:22.574808+00
65131738-5c8a-47bc-85da-b78662d751e6	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 11:14:42.578786+00	4	0	1063	2026-01-17 11:14:42.578786+00
6b31e635-9923-41ec-9a7f-b81d96f81bf2	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:31:41.261892+00	\N	34	2735	2026-01-17 11:31:41.261892+00
fce1aeae-a709-4d4f-a59b-bcaa3a005c5a	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:14:46.896366+00	32	100	5461	2026-01-17 11:14:46.896366+00
e5916368-d6ca-4ced-a2f8-b2b3743977a2	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 11:15:19.583672+00	\N	0	38166	2026-01-17 11:15:19.583672+00
1e19baf3-b0d3-42fd-a448-11051221d9e1	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 11:31:40.071218+00	2	0	787	2026-01-17 11:31:40.071218+00
22df186e-6d60-44bd-b389-0230706e6bd4	68928f66-5d1c-42e0-82f2-7ccf39a67f1a	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:31:47.369525+00	\N	0	803	2026-01-17 11:31:47.369525+00
f915b00a-e31b-41bc-b924-a8c092c9c668	d122aed4-e65c-4fa9-8257-918e75e2393e	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:32:24.55227+00	\N	0	4101	2026-01-17 11:32:24.55227+00
21f7c312-a742-44ca-8a1f-2914d84cca5c	d122aed4-e65c-4fa9-8257-918e75e2393e	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:34:28.900233+00	13	0	816	2026-01-17 11:34:28.900233+00
826370cd-09f3-4f1c-aa5b-40b1e6dbac03	d122aed4-e65c-4fa9-8257-918e75e2393e	/	\N	\N	2026-01-17 11:34:41.476711+00	2	0	14214	2026-01-17 11:34:41.476711+00
f8b9b642-83ec-44df-91ea-1dd99be92202	d122aed4-e65c-4fa9-8257-918e75e2393e	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:34:43.925074+00	181	62	16692	2026-01-17 11:34:43.925074+00
9deef2d2-8d93-460c-9b8b-4deb7f096f4c	d122aed4-e65c-4fa9-8257-918e75e2393e	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 11:37:45.539073+00	2	0	198220	2026-01-17 11:37:45.539073+00
6833735b-44a1-457b-bd34-90cdd7022fc7	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-17 17:52:06.340984+00	10	0	10315	2026-01-17 17:52:06.340984+00
77059df2-8f35-421f-a709-ce71c70c166b	d122aed4-e65c-4fa9-8257-918e75e2393e	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:37:47.28605+00	294	42	200061	2026-01-17 11:37:47.28605+00
480b7383-2442-49fd-8dfa-0dee35d99164	d122aed4-e65c-4fa9-8257-918e75e2393e	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 11:42:41.391325+00	2	0	494072	2026-01-17 11:42:41.391325+00
5cce367d-c098-4a0a-b8e3-140556d1a847	d122aed4-e65c-4fa9-8257-918e75e2393e	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 11:42:43.195522+00	\N	100	495963	2026-01-17 11:42:43.195522+00
551945b3-cde5-40ca-80df-b24d8d32cc0b	d122aed4-e65c-4fa9-8257-918e75e2393e	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 12:04:36.936669+00	\N	0	1528	2026-01-17 12:04:36.936669+00
fadbd8c7-72dd-40f7-bef5-e7d65c6db7e2	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/admin/settings	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 12:25:44.437996+00	\N	0	4181	2026-01-17 12:25:44.437996+00
af2506e2-d7b7-4ba2-8d0e-c6820cfc0f76	d122aed4-e65c-4fa9-8257-918e75e2393e	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 12:38:28.38768+00	22	0	2693	2026-01-17 12:38:28.38768+00
08fbcb15-b316-40c5-9f8e-f1d722189cf6	d122aed4-e65c-4fa9-8257-918e75e2393e	/admin/settings	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 12:38:50.701645+00	\N	0	25170	2026-01-17 12:38:50.701645+00
e5586253-ea23-49c8-a012-c9c783c8dfb2	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:30:55.20775+00	\N	0	2888	2026-01-17 17:30:55.20775+00
88bc5f6e-2c05-467e-b50c-f9de2467ceaf	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:31:04.852798+00	49	0	1275	2026-01-17 17:31:04.852798+00
85521b29-33dd-4847-a6b4-368c05e36e75	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/admin/site	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:31:54.271642+00	73	100	50728	2026-01-17 17:31:54.271642+00
7e173ba3-5905-425e-8479-e19cf07034a6	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/preview	2026-01-17 17:33:24.077439+00	4	0	1296	2026-01-17 17:33:24.077439+00
1303be2a-7349-40bf-921d-5cc95c871e43	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/admin/preview	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:33:08.152877+00	39	0	124599	2026-01-17 17:33:08.152877+00
38baf824-7951-432a-afae-1e12717273e0	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/admin/site	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:33:47.117025+00	\N	0	163590	2026-01-17 17:33:47.117025+00
31c29294-8e6b-40df-9860-aa93b8b15b32	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/booking	Réserver une consultation | Aureluz Design	http://localhost:3000/admin/preview	2026-01-17 17:33:28.416234+00	\N	56	5668	2026-01-17 17:33:28.416234+00
01d995b0-b30e-4326-97fe-a66ab35365fc	ef194f60-3f5b-4e33-b41d-156514ac8e9b	/booking	Réserver une consultation | Aureluz Design	http://localhost:3000/admin/preview	2026-01-17 17:39:26.541811+00	\N	0	1276	2026-01-17 17:39:26.541811+00
bc5709ca-0a52-4fe0-8872-189294b09f07	837365d8-c377-406d-8fb3-f2eb3f72b103	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 17:39:55.971887+00	14	0	3693	2026-01-17 17:39:55.971887+00
934abf96-1964-4cb8-a35e-d0406ddafca1	837365d8-c377-406d-8fb3-f2eb3f72b103	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:40:10.439424+00	2	0	18128	2026-01-17 17:40:10.439424+00
aa8ff2da-10e8-47ce-b170-cdddf7519f6d	3df35a38-ba6b-47b7-a9d5-1c3334fdb9aa	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 17:53:07.622679+00	\N	0	17989	2026-01-17 17:53:07.622679+00
f3c3346c-7ef3-4675-bbb7-46e9f7a33646	837365d8-c377-406d-8fb3-f2eb3f72b103	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 17:40:12.495789+00	9	38	20217	2026-01-17 17:40:12.495789+00
49ff9193-6749-41a4-8038-4a6695b520c9	837365d8-c377-406d-8fb3-f2eb3f72b103	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:40:21.975188+00	2	0	29686	2026-01-17 17:40:21.975188+00
8612aa1f-d47f-4a35-ba01-17a3c1cf82ef	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin/settings	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-17 17:52:16.367779+00	\N	100	20386	2026-01-17 17:52:16.367779+00
5afc1cdd-8417-4b91-9040-8b30ab2797e8	837365d8-c377-406d-8fb3-f2eb3f72b103	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 17:40:24.007552+00	13	49	31742	2026-01-17 17:40:24.007552+00
9320a9fe-8765-4424-b0ba-3499d6d1637e	837365d8-c377-406d-8fb3-f2eb3f72b103	/	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-17 17:40:37.02748+00	2	0	44749	2026-01-17 17:40:37.02748+00
1ccd0a2d-cf60-40f8-9969-b7ef9589d634	837365d8-c377-406d-8fb3-f2eb3f72b103	/booking	Réserver une consultation | Aureluz Design	\N	2026-01-17 17:40:38.950685+00	\N	0	46672	2026-01-17 17:40:38.950685+00
91db4a22-9cb7-40b8-ae18-bfb17c313a21	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin/settings	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 04:55:12.440465+00	7	0	7858	2026-01-18 04:55:12.440465+00
2bc67ccb-57ec-42cc-95c2-ecb4a1fd29a5	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 04:55:20.967715+00	4	0	16391	2026-01-18 04:55:20.967715+00
bb892e84-5d63-4e42-a756-800286aad462	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin/preview	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 04:55:24.946926+00	\N	0	20421	2026-01-18 04:55:24.946926+00
e0705155-651a-4cc1-9782-2ec5fe4347dc	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 16:01:32.960145+00	6	0	875	2026-01-18 16:01:32.960145+00
81bd8e46-868a-4faa-a1de-faacd846178c	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:16:25.315274+00	5	0	33823	2026-01-18 16:16:25.315274+00
fbe87185-185a-484a-9e80-f6c1ba873f08	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:16:31.048328+00	235	0	39344	2026-01-18 16:16:31.048328+00
18ddbdf7-dc9d-4c05-8904-8ef147140c0a	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:20:27.516243+00	\N	0	276113	2026-01-18 16:20:27.516243+00
39241e0c-961d-4a63-a613-cf7668811ff0	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:20:27.535925+00	33	0	276137	2026-01-18 16:20:27.535925+00
a059e376-fd6d-4ae2-b0e4-5e2ec109689a	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:21:00.31372+00	\N	0	308915	2026-01-18 16:21:00.31372+00
6887100e-6ee4-4d3b-8fbe-5c12c7c1f1f1	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:21:00.405865+00	70	0	309009	2026-01-18 16:21:00.405865+00
151cdad1-efa0-4212-b45b-09a1857d99a2	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:22:10.395944+00	\N	0	379001	2026-01-18 16:22:10.395944+00
2d7533ba-5eab-435b-8d67-0708f26cec58	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:22:10.526762+00	86	0	379132	2026-01-18 16:22:10.526762+00
e6ed0055-0d12-418b-9f6f-8173eb1d424d	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:23:36.16976+00	\N	0	464775	2026-01-18 16:23:36.16976+00
0f2e916b-0a7e-4ff4-afa2-51e56e5be579	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:23:36.262988+00	131	0	464874	2026-01-18 16:23:36.262988+00
33ae24b9-9787-499e-9051-3fbe28ecaaf5	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:25:48.004676+00	4	0	596532	2026-01-18 16:25:48.004676+00
0659c391-9492-407b-80b1-130976d4f6a5	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/preview	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:25:52.833268+00	27	0	601367	2026-01-18 16:25:52.833268+00
d38346d3-4a85-4289-8cec-49e5da40db87	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:26:20.240412+00	1044	0	628852	2026-01-18 16:26:20.240412+00
508346eb-3201-46b2-9305-48101a91b22b	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin/settings	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 16:01:37.585241+00	2175	100	6684	2026-01-18 16:01:37.585241+00
b905dc61-67a4-4d98-8ad2-37cfa43f70ee	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 16:37:53.647142+00	\N	0	1771206	2026-01-18 16:37:53.647142+00
ae744975-cadf-4cd2-b6c6-625d2020c2cb	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 16:38:25.965637+00	75	0	1348	2026-01-18 16:38:25.965637+00
a9995e85-40f7-472d-800b-0d4a755eee41	3e7b138f-37f7-4544-a7b7-d0489fece42f	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin	2026-01-18 16:39:41.485758+00	\N	0	76895	2026-01-18 16:39:41.485758+00
d112938c-835b-484c-b34f-c7bdbf96be3f	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:43:45.157872+00	6	0	1673724	2026-01-18 16:43:45.157872+00
afda9960-d94e-4bb4-adb9-6accf209cbb3	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:43:51.454914+00	10	0	1680024	2026-01-18 16:43:51.454914+00
ad059a5a-3f78-4fc0-9269-fda6256c356e	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:00:27.924075+00	6	0	2676506	2026-01-18 17:00:27.924075+00
dc2e493e-5646-4054-9b90-4accabe459c2	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:44:01.991495+00	48	100	1690448	2026-01-18 16:44:01.991495+00
e27b7a9b-3cec-4ad5-86d6-f3f2b7c317c2	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:44:50.111142+00	235	0	1738708	2026-01-18 16:44:50.111142+00
641e08c5-0340-4604-8f49-f2768984893e	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:48:46.337237+00	4	0	1974910	2026-01-18 16:48:46.337237+00
fadff1f5-9e31-4075-98cd-38f9fdf31103	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:48:50.615557+00	5	0	1979166	2026-01-18 16:48:50.615557+00
9c0713d1-ecc6-4074-8b41-2ef7a5f42b6e	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:48:55.38782+00	54	100	1983961	2026-01-18 16:48:55.38782+00
e612d6fc-ca0a-4a2b-bb07-c3edce9d5c0f	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:49:49.691473+00	168	0	2038309	2026-01-18 16:49:49.691473+00
3e5a40fb-c280-4d85-9227-5ebbeb6748e7	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:52:38.088313+00	7	0	2206649	2026-01-18 16:52:38.088313+00
e2b68f55-4b12-425f-bf6c-938919224ce7	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:52:44.987011+00	5	0	2213522	2026-01-18 16:52:44.987011+00
51abeba1-016e-4777-87fe-1db0b94b3bbf	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:30:29.810448+00	\N	100	1250508	2026-01-18 17:30:29.810448+00
31f75232-a78a-45af-861e-434e5ed56d24	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:52:50.291661+00	76	100	2218684	2026-01-18 16:52:50.291661+00
79c8e6df-5ec3-4a16-9e03-3fc52741ad86	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:54:06.574153+00	258	0	2295152	2026-01-18 16:54:06.574153+00
db4161e4-8d08-4698-b0a2-63bc07604dd5	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:58:25.041169+00	8	0	2553608	2026-01-18 16:58:25.041169+00
85855b64-2c42-415f-bcc2-fb955f6c4cab	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/devis/5452a33f-1725-4988-8b45-0afabdddc2f0	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:00:33.67315+00	37	100	2682244	2026-01-18 17:00:33.67315+00
c7f27ee2-f09b-4acd-b6b6-524af7531429	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/preview	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:58:33.287786+00	80	100	2561865	2026-01-18 16:58:33.287786+00
31fbbf80-d37d-45b3-be93-fc37086748da	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 16:59:53.532574+00	22	0	2642160	2026-01-18 16:59:53.532574+00
c84285ce-b667-4a5c-832f-03b232c5dd2d	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:00:15.771434+00	12	0	2664326	2026-01-18 17:00:15.771434+00
5f809529-7f14-4312-b1af-b503d55a9b07	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:01:11.077953+00	32	0	2718998	2026-01-18 17:01:11.077953+00
70d63e2a-1b80-4d8f-926f-a9b9df4b6e0d	f6842b95-f9ec-4194-ab8d-db2166d9ffee	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:01:42.841331+00	\N	0	2751469	2026-01-18 17:01:42.841331+00
b608d47e-50c7-4b21-a820-4468fef8c543	5356f396-4df0-44cb-b685-9a6167cf76e7	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:08:32.388155+00	21	0	1922	2026-01-18 17:08:32.388155+00
71ab9c9a-a700-4353-bbeb-4e1f22c827f0	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:08:53.72217+00	9	0	23308	2026-01-18 17:08:53.72217+00
dcbf181b-5296-4025-9071-3f173c3b0693	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:09:03.25388+00	10	0	32182	2026-01-18 17:09:03.25388+00
4e6cf363-e3aa-4c96-9e3f-1a30df7349a4	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:09:12.617955+00	6	0	42194	2026-01-18 17:09:12.617955+00
a3632924-c974-4522-812f-e0f3f3e9e311	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:09:18.526259+00	1267	0	48118	2026-01-18 17:09:18.526259+00
e33aa040-05f4-419c-883a-1cb350fb8b5f	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/appointments	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:30:27.378795+00	\N	0	1247848	2026-01-18 17:30:27.378795+00
28c06a13-380a-43fb-9fcb-04f8d3c5c2ef	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:30:27.752371+00	2	0	1248247	2026-01-18 17:30:27.752371+00
a3b49cab-03b6-41d8-94aa-2ea94937bc86	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:45:53.675604+00	\N	0	4319	2026-01-18 17:45:53.675604+00
0c626acf-65d7-4521-a81b-0f647e5a5982	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-18 17:57:23.403906+00	\N	0	1398	2026-01-18 17:57:23.403906+00
d7ff60a4-210d-410e-9902-20ae5f85f5ce	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:00:16.630961+00	\N	0	2971	2026-01-18 18:00:16.630961+00
2138f50e-410c-49e0-bd60-f3f18ea1e5d2	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:03:39.354958+00	\N	0	1768	2026-01-18 18:03:39.354958+00
7275b7b2-948e-4929-a508-c396ce2d296e	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:07:25.581281+00	\N	0	1779	2026-01-18 18:07:25.581281+00
2680880b-a330-4474-9f2c-1eb78ca37ff6	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:13:17.786981+00	\N	0	1821	2026-01-18 18:13:17.786981+00
6bb5e36a-70a9-4e21-98b6-d8df31e79de4	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:16:01.107091+00	4	0	1793	2026-01-18 18:16:01.107091+00
0bf541cd-2eab-433e-8cb8-9b94bdde5c7a	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:16:04.817501+00	3	0	5639	2026-01-18 18:16:04.817501+00
aca8e96a-1913-4e11-87fe-9fd57c239281	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:16:07.970714+00	\N	0	8674	2026-01-18 18:16:07.970714+00
55dc60f2-bf8b-4933-8e80-8df14df6d0ef	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:18:47.446616+00	\N	0	1729	2026-01-18 18:18:47.446616+00
d10ecb29-5342-4e65-a547-b4261a11ced8	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-18 18:20:18.055227+00	\N	0	1761	2026-01-18 18:20:18.055227+00
90776d6e-6963-461d-a318-5347c6c61071	5356f396-4df0-44cb-b685-9a6167cf76e7	/login	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 03:16:29.523644+00	2870	0	1821375	2026-01-19 03:16:29.523644+00
300c6739-f8f1-4e1b-8fc9-76c0667a947a	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:04:16.333471+00	2	0	4679925	2026-01-19 04:04:16.333471+00
14f9c980-972e-4de0-b769-3f5ccdbaf8ae	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:04:18.924757+00	3	0	4682480	2026-01-19 04:04:18.924757+00
fb67a381-6f5e-4942-8688-30fda7188b26	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/841edfd9-2ef4-48e5-98ec-109f3b80eddf	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:04:22.212545+00	19	0	4685770	2026-01-19 04:04:22.212545+00
a4a64b96-f6d9-48b2-9641-ff10db4ba85b	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:04:41.447633+00	15	0	4705050	2026-01-19 04:04:41.447633+00
1bf156c4-50a6-4269-b07a-26a8f72468b6	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:04:53.514478+00	2	0	2746	2026-01-19 06:04:53.514478+00
804fc67d-8030-42bc-b7dc-8360e1cc2ad3	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/nouveau	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:04:59.068566+00	140	95	4722352	2026-01-19 04:04:59.068566+00
2fd92879-1c70-4006-8975-64f76ef35793	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:07:18.949703+00	2	0	4862539	2026-01-19 04:07:18.949703+00
f05e0e7b-1089-4728-973c-7d84cf037d03	5356f396-4df0-44cb-b685-9a6167cf76e7	/admin/devis/74f35ba5-6ba2-41a5-a01e-90ecb1c3b134	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:07:21.759771+00	1845	100	4865300	2026-01-19 04:07:21.759771+00
01c50169-67f0-4a9a-a5fc-85c2d1ed4a0a	5356f396-4df0-44cb-b685-9a6167cf76e7	/login	Aureluz Design | Décoration Événementielle sur Mesure	http://localhost:3000/admin/devis/7d517747-6988-47c3-89c4-dbea9a0af65d	2026-01-19 04:38:08.727946+00	\N	0	6712334	2026-01-19 04:38:08.727946+00
cfb1c6b6-378c-4503-95e8-6e3b6a409d5e	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/login	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:03:00.317767+00	78	0	1130	2026-01-19 06:03:00.317767+00
126557c9-189e-44cd-8436-16b0d8a4e957	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:04:20.131612+00	15	0	80897	2026-01-19 06:04:20.131612+00
727ee3f1-41f7-4fa9-bebd-a494ff74e422	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:04:55.444479+00	\N	100	4718	2026-01-19 06:04:55.444479+00
4379ec3f-c8b2-4fce-b485-bea0d986cda2	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:08:23.012371+00	\N	0	2633	2026-01-19 06:08:23.012371+00
648ee076-27ac-4c18-8754-bba892543788	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:08:25.618358+00	1980	0	1033	2026-01-19 06:08:25.618358+00
a11c9628-2073-4462-b04f-7f3fccbbe8c8	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/analytics	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:41:48.910315+00	\N	0	2003630	2026-01-19 06:41:48.910315+00
0e7055fa-62a7-432b-bef7-6fb0801901e0	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:04:34.870221+00	\N	100	95665	2026-01-19 06:04:34.870221+00
e14ce4a3-2730-4823-b26a-3d24957450dc	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:41:48.883235+00	5	0	2003419	2026-01-19 06:41:48.883235+00
a0f3e0ef-5334-4378-a04a-08600b29ac11	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:41:53.516826+00	3	0	2008883	2026-01-19 06:41:53.516826+00
c3cfae87-3100-465f-b548-604e8288241e	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/analytics	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:41:56.351884+00	2	0	2011837	2026-01-19 06:41:56.351884+00
78e233a2-b39f-4cff-a643-38c41a459f2e	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:41:58.24492+00	2	0	2013760	2026-01-19 06:41:58.24492+00
3bce911a-2b60-4eef-98a2-8dbc9fd431d9	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/analytics	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:42:00.731307+00	7	0	2016228	2026-01-19 06:42:00.731307+00
003510b5-fc6b-4ec1-8dda-035ecd8e4fc3	3d163ed8-89dd-4d8f-b899-6850ccb51d7b	/admin/appointments	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:42:08.206983+00	\N	0	2023620	2026-01-19 06:42:08.206983+00
b0a4b169-b6d0-42db-896d-b78e4d9d487e	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:47:34.705246+00	11	0	28685	2026-01-19 06:47:34.705246+00
208637fd-aed7-4d50-a617-3e2dd0028e46	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin/analytics	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:47:46.923496+00	6	0	40831	2026-01-19 06:47:46.923496+00
ed5251e1-b6ff-4735-92c6-bec877f243b4	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin/appointments	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:47:52.559322+00	5	0	46641	2026-01-19 06:47:52.559322+00
a67a079c-e72f-4359-a38d-8efe7290dba5	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin/devis	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:47:57.486476+00	4	0	51525	2026-01-19 06:47:57.486476+00
cb9b24f0-58fb-4d55-8d6e-dbde99107122	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin/site	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:48:01.926348+00	2	0	55967	2026-01-19 06:48:01.926348+00
dcc5b3d0-fa0c-40f4-b4e0-63810f4e67f7	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin/analytics	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:48:04.611915+00	1	0	58570	2026-01-19 06:48:04.611915+00
81c256c4-3d65-4505-ba5f-f80c537e606e	cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	/admin/appointments	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:48:06.274551+00	\N	0	60325	2026-01-19 06:48:06.274551+00
40f4d6ef-5322-4426-bdbd-70db6c0b39f5	c9fe5f1c-b2be-4529-a2f0-b73c6d7bf206	/admin/analytics	\N	\N	2026-01-19 06:54:16.88842+00	6	0	13319	2026-01-19 06:54:16.88842+00
f971a065-c778-4cc9-b1f7-b0bf02dc24e7	c9fe5f1c-b2be-4529-a2f0-b73c6d7bf206	/admin/appointments	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:54:22.681517+00	6	0	19290	2026-01-19 06:54:22.681517+00
cdbc27da-a473-41bf-8281-0326ffa5e817	c9fe5f1c-b2be-4529-a2f0-b73c6d7bf206	/admin/mailing	Aureluz Design | Décoration Événementielle sur Mesure	\N	2026-01-19 06:54:29.452471+00	\N	0	25377	2026-01-19 06:54:29.452471+00
\.


--
-- Data for Name: analytics_sessions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.analytics_sessions (id, fingerprint_hash, started_at, last_activity_at, country_code, country_name, region, city, device_type, browser, browser_version, os, os_version, screen_width, screen_height, referrer_url, referrer_domain, utm_source, utm_medium, utm_campaign, page_views_count, events_count, is_bounce, is_converted, is_new_visitor, created_at) FROM stdin;
1ef08781-61ea-4155-8dd8-b16f635d9a7c	198aca31	2026-01-13 19:41:40.643696+00	2026-01-13 19:41:40.643696+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	0	0	t	f	t	2026-01-13 19:41:40.643696+00
bd4b652a-dcf7-464f-aba7-191c66104740	198aca31	2026-01-13 19:48:15.250098+00	2026-01-13 19:48:15.250098+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	0	0	t	f	f	2026-01-13 19:48:15.250098+00
f6842b95-f9ec-4194-ab8d-db2166d9ffee	594c6a64	2026-01-18 16:15:57.483755+00	2026-01-18 17:01:42.868214+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	848	\N	\N	\N	\N	\N	33	0	f	f	f	2026-01-18 16:15:57.483755+00
95642d6e-628f-40f1-a811-51c5b9ecbbbd	198aca31	2026-01-14 18:49:32.381956+00	2026-01-14 18:49:32.381956+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	0	0	t	f	f	2026-01-14 18:49:32.381956+00
d6b4a9e2-0a81-4b2a-be14-197d901ca19b	198aca31	2026-01-14 18:50:24.265276+00	2026-01-14 18:50:24.265276+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	0	0	t	f	f	2026-01-14 18:50:24.265276+00
67b550b2-77ce-4f9d-b200-db2452a01ee8	198aca31	2026-01-17 12:25:39.440433+00	2026-01-17 12:25:39.440433+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	0	0	t	f	f	2026-01-17 12:25:39.440433+00
d122aed4-e65c-4fa9-8257-918e75e2393e	198aca31	2026-01-17 11:32:22.079596+00	2026-01-17 12:38:50.711034+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	11	0	f	f	f	2026-01-17 11:32:22.079596+00
ae07cb05-a3e6-464d-bc24-b030c1089828	198aca31	2026-01-14 17:00:00.367139+00	2026-01-14 18:57:58.14914+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	14	0	f	f	f	2026-01-14 17:00:00.367139+00
8047dd19-6f6f-4f4c-8492-9ed5c34b9f7e	198aca31	2026-01-14 18:58:36.276741+00	2026-01-14 18:59:54.436444+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	1	0	t	f	f	2026-01-14 18:58:36.276741+00
3d163ed8-89dd-4d8f-b899-6850ccb51d7b	198aca31	2026-01-19 06:02:52.957205+00	2026-01-19 06:42:08.220432+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	14	0	f	f	f	2026-01-19 06:02:52.957205+00
ef194f60-3f5b-4e33-b41d-156514ac8e9b	198aca31	2026-01-17 12:25:41.284782+00	2026-01-17 17:39:26.55249+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	9	0	f	f	f	2026-01-17 12:25:41.284782+00
423239bc-62d4-4d8b-9988-78481d4e4727	198aca31	2026-01-16 12:52:28.488411+00	2026-01-16 12:53:43.95108+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	2	0	f	f	f	2026-01-16 12:52:28.488411+00
3e7b138f-37f7-4544-a7b7-d0489fece42f	198aca31	2026-01-17 17:52:02.329433+00	2026-01-18 16:39:41.511376+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	http://localhost:3000/admin	localhost	\N	\N	\N	10	0	f	f	f	2026-01-17 17:52:02.329433+00
71a8e463-c930-4b90-a0d4-32927192a309	594c6a64	2026-01-16 11:12:53.04042+00	2026-01-16 13:04:05.446762+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	848	\N	\N	\N	\N	\N	14	0	f	f	t	2026-01-16 11:12:53.04042+00
4f98221a-9c91-4712-8063-0b3df1a7cf52	198aca31	2026-01-16 11:12:25.010584+00	2026-01-16 18:07:38.180593+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	1	0	t	f	f	2026-01-16 11:12:25.010584+00
9a503c16-1266-412f-a146-f2e255eff6ae	198aca31	2026-01-17 11:12:15.010534+00	2026-01-17 11:12:22.585427+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	1	0	t	f	f	2026-01-17 11:12:15.010534+00
837365d8-c377-406d-8fb3-f2eb3f72b103	594c6a64	2026-01-17 17:39:53.529145+00	2026-01-17 17:40:38.957774+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	848	\N	\N	\N	\N	\N	7	0	f	f	f	2026-01-17 17:39:53.529145+00
68928f66-5d1c-42e0-82f2-7ccf39a67f1a	198aca31	2026-01-17 11:14:42.304993+00	2026-01-17 11:31:47.379973+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	6	0	f	f	f	2026-01-17 11:14:42.304993+00
3df35a38-ba6b-47b7-a9d5-1c3334fdb9aa	198aca31	2026-01-17 17:52:52.548823+00	2026-01-17 17:53:07.636744+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	1	0	t	f	f	2026-01-17 17:52:52.548823+00
cbc6049d-fa34-45a1-8e7f-8f3aa31d3d33	594c6a64	2026-01-19 06:47:13.365331+00	2026-01-19 06:48:06.282659+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	848	\N	\N	\N	\N	\N	7	0	f	f	f	2026-01-19 06:47:13.365331+00
c9fe5f1c-b2be-4529-a2f0-b73c6d7bf206	198aca31	2026-01-19 06:54:12.810983+00	2026-01-19 06:54:29.487779+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	3	0	f	f	f	2026-01-19 06:54:12.810983+00
5356f396-4df0-44cb-b685-9a6167cf76e7	198aca31	2026-01-18 17:08:25.301381+00	2026-01-19 04:38:08.747667+00	\N	\N	\N	\N	desktop	Safari	17	macOS	10.15	1440	900	\N	\N	\N	\N	\N	28	0	f	f	f	2026-01-18 17:08:25.301381+00
\.


--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.appointments (id, client_name, client_email, client_phone, date, start_time, end_time, event_type, message, status, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: blocked_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.blocked_slots (id, date, start_time, end_time, reason, created_at) FROM stdin;
\.


--
-- Data for Name: business_hours; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.business_hours (id, day_of_week, open_time, close_time, is_open) FROM stdin;
8ee4ebe3-13de-4cbf-a60b-9140f00a5e33	0	09:00:00	18:00:00	f
47f29479-0e4f-4777-bc80-33d032359c57	1	08:00:00	18:00:00	f
cc4d7121-a460-4a8c-a835-0bfd4f3aab26	2	08:00:00	18:00:00	t
9f06be0f-9bd8-4c49-91b7-703965207399	3	08:00:00	18:00:00	t
08679397-1bee-4f57-a5d7-cd42ab7d41a8	4	08:00:00	18:00:00	t
539c608f-0de1-453f-87c4-90833bc6cf93	5	08:00:00	18:00:00	t
d5be64f0-9f7d-4524-97eb-b5f60e92829d	6	09:00:00	18:00:00	t
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.email_templates (id, slug, name, subject, content, is_active, created_at, updated_at) FROM stdin;
06791ace-0bd5-4fd3-ad8e-3cb9fa43861f	salon-mariage	Campagne Salon du Mariage	Suite à notre rencontre au Salon du Mariage - AureLuz	{"ctaText": "Prendre rendez-vous", "greeting": "Bonjour {name},", "paragraphs": ["C'était un réel plaisir de vous rencontrer lors du Salon du Mariage !", "J'espère que cette journée vous a inspiré pour votre futur événement. Comme promis, je reviens vers vous pour vous accompagner dans la création d'une décoration unique et à votre image.", "Je serais ravie d'échanger avec vous sur votre projet et de vous présenter mes différentes prestations lors d'un rendez-vous personnalisé."], "instagramText": "N'hésitez pas à me suivre sur Instagram pour découvrir mes dernières réalisations !", "signatureName": "Aurélie", "signatureTitle": "Fondatrice d'AureLuz Design"}	t	2026-01-13 19:10:16.111246+00	2026-01-13 19:10:16.111246+00
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.invoices (id, invoice_number, quote_id, client_name, client_email, amount, vat_amount, total_amount, pdf_url, pdf_storage_path, payment_method, stripe_payment_intent_id, created_at, sent_at, notes) FROM stdin;
\.


--
-- Data for Name: open_slots; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.open_slots (id, date, start_time, end_time, reason, created_at) FROM stdin;
cad84416-b645-4c40-a7e5-3b725904d316	2026-01-17	09:00:00	18:00:00	test	2026-01-17 11:13:26.967033+00
230d325f-824b-4589-9454-8eb94d223196	2026-01-19	18:00:00	20:00:00	test	2026-01-17 11:14:02.932275+00
\.


--
-- Data for Name: photos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.photos (id, url, alt, category, display_order, created_at) FROM stdin;
\.


--
-- Data for Name: quote_payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quote_payments (id, quote_id, payment_number, label, description, amount, percentage, due_date, sent_at, paid_at, status, stripe_session_id, stripe_payment_intent_id, validation_token, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.quotes (id, quote_number, client_name, client_email, client_phone, event_date, event_type, items, vat_rate, subtotal, vat_amount, total, notes, validity_days, status, created_at, updated_at, sent_at, expires_at, deposit_percent, deposit_amount, validation_token, stripe_payment_intent_id, stripe_session_id, paid_at, paid_amount, payment_schedule, accepted_at) FROM stdin;
5452a33f-1725-4988-8b45-0afabdddc2f0	2026-0002	Prince MAZABA	mazabaprince@gmail.com	\N	2026-01-22	instants	[{"id": "v4r277603", "total": 12, "quantity": 1, "unit_price": 12, "description": "Food"}, {"id": "d9b5bcqo0", "total": 33, "quantity": 1, "unit_price": 33, "description": "Nem"}]	20.00	45.00	9.00	54.00	\N	30	sent	2026-01-14 17:08:01.104588+00	2026-01-14 17:08:37.508785+00	\N	\N	50	27.00	b3170012-dd0f-47dc-a147-af9ea6eedc2d	\N	\N	\N	\N	[{"label": "Acompte", "percentage": 50}, {"label": "Solde", "percentage": 50}]	\N
7d517747-6988-47c3-89c4-dbea9a0af65d	2026-0003	Lolo	mazabaprince@gmail.com	0765657665	2026-01-17	instants	[{"id": "krcrjnh6c", "total": 456, "quantity": 1, "unit_price": 456, "description": "Test"}, {"id": "fypd7bizd", "total": 907.58, "quantity": 2, "unit_price": 453.79, "description": "T4"}]	20.00	1363.58	272.72	1636.30	\N	30	sent	2026-01-14 18:52:27.312596+00	2026-01-18 18:11:05.496744+00	\N	\N	30	490.89	42eb18a5-3e70-4d77-9ae3-858690896dfe	\N	cs_test_a1Dvo1kGJwLZi20l5E7xn9p6YmHzK5mqnG4pBkxmBkjbSzT4YtAkOAWhNa	\N	\N	[{"label": "Acompte", "percentage": 30}, {"label": "Solde", "percentage": 70}]	2026-01-16 12:52:37.271+00
841edfd9-2ef4-48e5-98ec-109f3b80eddf	2026-0001	MAZABA	mazabaprince@gmail.com	\N	\N	signature	[{"id": "02e9ukhad", "total": 115, "quantity": 5, "unit_price": 23, "description": "Vin"}, {"id": "tklk6kdwu", "total": 495, "quantity": 11, "unit_price": 45, "description": "Jus"}]	20.00	610.00	122.00	732.00	\N	30	sent	2026-01-13 19:27:13.23135+00	2026-01-18 18:20:37.947777+00	\N	\N	30	219.60	7c1fe223-e8cb-451d-b455-4bc18782f74c	\N	\N	\N	\N	[{"label": "Acompte", "percentage": 30}, {"label": "Paiement 2", "percentage": 30}, {"label": "Paiement 3", "percentage": 40}]	2026-01-14 18:49:55.113+00
74f35ba5-6ba2-41a5-a01e-90ecb1c3b134	2026-0004	Aurelie	aureliemazaba@gmail.com	0769234567	2026-01-20	instants	[{"id": "54f3rdkf0", "total": 456, "quantity": 1, "unit_price": 456, "description": "Réparation option ajout pièce jointe"}, {"id": "ae5b2clja", "total": 120, "quantity": 1, "unit_price": 120, "description": "Test envoie PJ en plus de devis"}]	0.00	576.00	0.00	576.00	\N	30	sent	2026-01-19 04:07:17.910005+00	2026-01-19 04:08:02.459505+00	\N	\N	30	172.80	3886a915-cab8-4cf5-aacb-004441cebac2	\N	\N	\N	\N	[{"label": "Acompte", "percentage": 30}, {"label": "Solde", "percentage": 35}, {"label": "Paiement 3", "percentage": 35}]	\N
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.services (id, emoji, title, description, display_order, is_active, created_at, updated_at) FROM stdin;
6acad207-9344-4e61-97d5-6a6e78642803	💍	Mariage	Bien plus qu'une décoration, une signature visuelle complète. Nous concevons l'ambiance de votre cérémonie et de votre réception dans les moindres détails (fleurs, mobilier, mise en scène). De la conception à la dépose le jour J, nous donnons vie à vos rêves pendant que vous profitez de vos invités.	1	t	2026-01-13 19:10:16.0806+00	2026-01-13 19:10:16.0806+00
575cd24f-3f15-431f-857a-9bfca9f00bc9	🎂	Événements spéciaux	L'art de transformer un simple repas en une expérience esthétique et mémorable. De l'intimité d'un dîner de fiançailles à la joie d'une baby shower, en passant par vos anniversaires et EVJF chic, nous créons un écrin sur-mesure pour vos plus beaux souvenirs. Une ambiance élégante et conviviale, jusque dans les moindres détails.	2	t	2026-01-13 19:10:16.0806+00	2026-01-13 19:10:16.0806+00
337f37c3-0f7d-48bd-862d-75f6d691f333	💡	Accompagnement "Do It Yourself"	L'art de faire soi-même, avec l'œil d'une experte. Pour les mariés créatifs et les organisateurs qui souhaitent piloter leur décoration, nous vous offrons une boussole esthétique. Ensemble, nous définissons une vision cohérente et impactante pour donner vie à votre projet, avec l'assurance d'un résultat professionnel.	3	t	2026-01-13 19:10:16.0806+00	2026-01-13 19:10:16.0806+00
\.


--
-- Data for Name: site_settings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.site_settings (id, key, value, type, description, created_at, updated_at) FROM stdin;
671c58bb-60c1-4a00-845f-536a9ef10348	logo_url	/images/aureluz-design-logo-decoration-evenementielle.png	image	Logo principal du site	2026-01-13 19:10:16.094871+00	2026-01-13 19:10:16.094871+00
ae8a66aa-a72d-4981-95dd-632e2fa3f915	contact_phone	+33661434365	text	Numéro de téléphone affiché sur le site	2026-01-13 19:10:16.123358+00	2026-01-13 19:10:16.123358+00
d371e165-9917-4c88-812f-4d3fd27d9dd6	contact_email	contact@aureluzdesign.fr	text	Email de contact public	2026-01-13 19:10:16.123358+00	2026-01-13 19:10:16.123358+00
867f950b-3c73-409c-9d36-a4a1ca080e00	admin_email	aureluzdesign@gmail.com	text	Email pour recevoir les notifications admin	2026-01-13 19:10:16.123358+00	2026-01-13 19:10:16.123358+00
1b85d6dc-1fe6-4503-8579-8831af3bd918	social_instagram	https://www.instagram.com/aure_luz_design/	text	Lien vers le profil Instagram	2026-01-13 19:10:16.123358+00	2026-01-13 19:10:16.123358+00
7aa10227-afd3-459c-b386-af88c45fd3ed	social_facebook		text	Lien vers la page Facebook	2026-01-13 19:10:16.123358+00	2026-01-13 19:10:16.123358+00
3c534240-a028-46d6-9bdf-fe1165cd61e9	social_linkedin		text	Lien vers le profil LinkedIn	2026-01-13 19:10:16.123358+00	2026-01-13 19:10:16.123358+00
\.


--
-- Name: analytics_conversions analytics_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_conversions
    ADD CONSTRAINT analytics_conversions_pkey PRIMARY KEY (id);


--
-- Name: analytics_daily_stats analytics_daily_stats_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_daily_stats
    ADD CONSTRAINT analytics_daily_stats_date_key UNIQUE (date);


--
-- Name: analytics_daily_stats analytics_daily_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_daily_stats
    ADD CONSTRAINT analytics_daily_stats_pkey PRIMARY KEY (id);


--
-- Name: analytics_events analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_pkey PRIMARY KEY (id);


--
-- Name: analytics_page_views analytics_page_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_page_views
    ADD CONSTRAINT analytics_page_views_pkey PRIMARY KEY (id);


--
-- Name: analytics_sessions analytics_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_sessions
    ADD CONSTRAINT analytics_sessions_pkey PRIMARY KEY (id);


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: blocked_slots blocked_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_slots
    ADD CONSTRAINT blocked_slots_pkey PRIMARY KEY (id);


--
-- Name: business_hours business_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT business_hours_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_slug_key UNIQUE (slug);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: open_slots open_slots_date_start_time_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_slots
    ADD CONSTRAINT open_slots_date_start_time_key UNIQUE (date, start_time);


--
-- Name: open_slots open_slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.open_slots
    ADD CONSTRAINT open_slots_pkey PRIMARY KEY (id);


--
-- Name: photos photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.photos
    ADD CONSTRAINT photos_pkey PRIMARY KEY (id);


--
-- Name: quote_payments quote_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_payments
    ADD CONSTRAINT quote_payments_pkey PRIMARY KEY (id);


--
-- Name: quote_payments quote_payments_quote_id_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_payments
    ADD CONSTRAINT quote_payments_quote_id_payment_number_key UNIQUE (quote_id, payment_number);


--
-- Name: quote_payments quote_payments_validation_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_payments
    ADD CONSTRAINT quote_payments_validation_token_key UNIQUE (validation_token);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: quotes quotes_validation_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_validation_token_key UNIQUE (validation_token);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: site_settings site_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_key_key UNIQUE (key);


--
-- Name: site_settings site_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_settings
    ADD CONSTRAINT site_settings_pkey PRIMARY KEY (id);


--
-- Name: blocked_slots unique_blocked_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blocked_slots
    ADD CONSTRAINT unique_blocked_slot UNIQUE (date, start_time);


--
-- Name: business_hours unique_day; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_hours
    ADD CONSTRAINT unique_day UNIQUE (day_of_week);


--
-- Name: analytics_conversions unique_session_conversion; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_conversions
    ADD CONSTRAINT unique_session_conversion UNIQUE (session_id);


--
-- Name: appointments unique_slot; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT unique_slot UNIQUE (date, start_time);


--
-- Name: idx_appointments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_created_at ON public.appointments USING btree (created_at DESC);


--
-- Name: idx_appointments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_date ON public.appointments USING btree (date);


--
-- Name: idx_appointments_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_date_status ON public.appointments USING btree (date, status);


--
-- Name: idx_appointments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_appointments_status ON public.appointments USING btree (status);


--
-- Name: idx_blocked_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_slots_date ON public.blocked_slots USING btree (date);


--
-- Name: idx_blocked_slots_date_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blocked_slots_date_range ON public.blocked_slots USING btree (date, start_time, end_time);


--
-- Name: idx_conversions_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversions_session ON public.analytics_conversions USING btree (session_id);


--
-- Name: idx_daily_stats_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_stats_date ON public.analytics_daily_stats USING btree (date);


--
-- Name: idx_email_templates_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_templates_slug ON public.email_templates USING btree (slug);


--
-- Name: idx_events_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_category ON public.analytics_events USING btree (event_category);


--
-- Name: idx_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_session ON public.analytics_events USING btree (session_id);


--
-- Name: idx_events_triggered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_triggered_at ON public.analytics_events USING btree (triggered_at);


--
-- Name: idx_invoices_client_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_client_email ON public.invoices USING btree (client_email);


--
-- Name: idx_invoices_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC);


--
-- Name: idx_invoices_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invoices_quote_id ON public.invoices USING btree (quote_id);


--
-- Name: idx_open_slots_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_open_slots_date ON public.open_slots USING btree (date);


--
-- Name: idx_open_slots_date_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_open_slots_date_time ON public.open_slots USING btree (date, start_time, end_time);


--
-- Name: idx_page_views_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_views_path ON public.analytics_page_views USING btree (page_path);


--
-- Name: idx_page_views_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_views_session ON public.analytics_page_views USING btree (session_id);


--
-- Name: idx_page_views_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_page_views_viewed_at ON public.analytics_page_views USING btree (viewed_at);


--
-- Name: idx_photos_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_category ON public.photos USING btree (category);


--
-- Name: idx_photos_category_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_category_order ON public.photos USING btree (category, display_order);


--
-- Name: idx_photos_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_photos_order ON public.photos USING btree (display_order);


--
-- Name: idx_quote_payments_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_payments_due_date ON public.quote_payments USING btree (due_date);


--
-- Name: idx_quote_payments_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_payments_quote_id ON public.quote_payments USING btree (quote_id);


--
-- Name: idx_quote_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_payments_status ON public.quote_payments USING btree (status);


--
-- Name: idx_quote_payments_validation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_payments_validation_token ON public.quote_payments USING btree (validation_token);


--
-- Name: idx_quotes_client_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_client_email ON public.quotes USING btree (client_email);


--
-- Name: idx_quotes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_created_at ON public.quotes USING btree (created_at DESC);


--
-- Name: idx_quotes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_status ON public.quotes USING btree (status);


--
-- Name: idx_quotes_validation_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_validation_token ON public.quotes USING btree (validation_token);


--
-- Name: idx_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_active ON public.services USING btree (is_active);


--
-- Name: idx_services_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_display_order ON public.services USING btree (display_order);


--
-- Name: idx_sessions_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_country ON public.analytics_sessions USING btree (country_code);


--
-- Name: idx_sessions_device; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_device ON public.analytics_sessions USING btree (device_type);


--
-- Name: idx_sessions_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_fingerprint ON public.analytics_sessions USING btree (fingerprint_hash);


--
-- Name: idx_sessions_referrer_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_referrer_domain ON public.analytics_sessions USING btree (referrer_domain);


--
-- Name: idx_sessions_started_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_started_at ON public.analytics_sessions USING btree (started_at);


--
-- Name: idx_site_settings_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_settings_key ON public.site_settings USING btree (key);


--
-- Name: analytics_conversions analytics_conversions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER analytics_conversions_updated_at BEFORE UPDATE ON public.analytics_conversions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: analytics_daily_stats analytics_daily_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER analytics_daily_stats_updated_at BEFORE UPDATE ON public.analytics_daily_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: appointments appointments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: quotes calculate_quote_deposit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calculate_quote_deposit BEFORE INSERT OR UPDATE OF deposit_percent, total ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.calculate_deposit_amount();


--
-- Name: quotes quotes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_quotes_updated_at();


--
-- Name: invoices set_invoice_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_invoice_number BEFORE INSERT ON public.invoices FOR EACH ROW WHEN (((new.invoice_number IS NULL) OR ((new.invoice_number)::text = ''::text))) EXECUTE FUNCTION public.generate_invoice_number();


--
-- Name: quotes set_quote_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_quote_number BEFORE INSERT ON public.quotes FOR EACH ROW WHEN (((new.quote_number IS NULL) OR ((new.quote_number)::text = ''::text))) EXECUTE FUNCTION public.generate_quote_number();


--
-- Name: quote_payments trigger_quote_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_quote_payments_updated_at BEFORE UPDATE ON public.quote_payments FOR EACH ROW EXECUTE FUNCTION public.update_quote_payments_updated_at();


--
-- Name: analytics_conversions analytics_conversions_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_conversions
    ADD CONSTRAINT analytics_conversions_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE SET NULL;


--
-- Name: analytics_conversions analytics_conversions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_conversions
    ADD CONSTRAINT analytics_conversions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.analytics_sessions(id) ON DELETE CASCADE;


--
-- Name: analytics_events analytics_events_page_view_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_page_view_id_fkey FOREIGN KEY (page_view_id) REFERENCES public.analytics_page_views(id) ON DELETE SET NULL;


--
-- Name: analytics_events analytics_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_events
    ADD CONSTRAINT analytics_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.analytics_sessions(id) ON DELETE CASCADE;


--
-- Name: analytics_page_views analytics_page_views_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analytics_page_views
    ADD CONSTRAINT analytics_page_views_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.analytics_sessions(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_payments quote_payments_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_payments
    ADD CONSTRAINT quote_payments_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_payments Admin can manage quote payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage quote payments" ON public.quote_payments TO authenticated USING (true) WITH CHECK (true);


--
-- Name: analytics_conversions Admin can read conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read conversions" ON public.analytics_conversions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: analytics_daily_stats Admin can read daily_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read daily_stats" ON public.analytics_daily_stats FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: analytics_events Admin can read events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read events" ON public.analytics_events FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: analytics_page_views Admin can read page_views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read page_views" ON public.analytics_page_views FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: analytics_sessions Admin can read sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can read sessions" ON public.analytics_sessions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: appointments Anyone can create appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can create appointments" ON public.appointments FOR INSERT WITH CHECK (true);


--
-- Name: analytics_conversions Anyone can insert conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert conversions" ON public.analytics_conversions FOR INSERT WITH CHECK (true);


--
-- Name: analytics_events Anyone can insert events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert events" ON public.analytics_events FOR INSERT WITH CHECK (true);


--
-- Name: analytics_page_views Anyone can insert page_views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert page_views" ON public.analytics_page_views FOR INSERT WITH CHECK (true);


--
-- Name: analytics_sessions Anyone can insert sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert sessions" ON public.analytics_sessions FOR INSERT WITH CHECK (true);


--
-- Name: services Anyone can read active services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read active services" ON public.services FOR SELECT USING ((is_active = true));


--
-- Name: blocked_slots Anyone can read blocked_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read blocked_slots" ON public.blocked_slots FOR SELECT USING (true);


--
-- Name: business_hours Anyone can read business_hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read business_hours" ON public.business_hours FOR SELECT USING (true);


--
-- Name: open_slots Anyone can read open slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read open slots" ON public.open_slots FOR SELECT USING (true);


--
-- Name: photos Anyone can read photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read photos" ON public.photos FOR SELECT USING (true);


--
-- Name: site_settings Anyone can read site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read site settings" ON public.site_settings FOR SELECT USING (true);


--
-- Name: appointments Authenticated users can delete appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete appointments" ON public.appointments FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: blocked_slots Authenticated users can delete blocked_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete blocked_slots" ON public.blocked_slots FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: open_slots Authenticated users can delete open slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete open slots" ON public.open_slots FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: photos Authenticated users can delete photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete photos" ON public.photos FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: quotes Authenticated users can delete quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can delete quotes" ON public.quotes FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: blocked_slots Authenticated users can insert blocked_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert blocked_slots" ON public.blocked_slots FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: invoices Authenticated users can insert invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert invoices" ON public.invoices FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: open_slots Authenticated users can insert open slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert open slots" ON public.open_slots FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: photos Authenticated users can insert photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert photos" ON public.photos FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: quotes Authenticated users can insert quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert quotes" ON public.quotes FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: appointments Authenticated users can read all appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read all appointments" ON public.appointments FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: invoices Authenticated users can read invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read invoices" ON public.invoices FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: quotes Authenticated users can read quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read quotes" ON public.quotes FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: appointments Authenticated users can update appointments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update appointments" ON public.appointments FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: blocked_slots Authenticated users can update blocked_slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update blocked_slots" ON public.blocked_slots FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: business_hours Authenticated users can update business_hours; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update business_hours" ON public.business_hours FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: invoices Authenticated users can update invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update invoices" ON public.invoices FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: open_slots Authenticated users can update open slots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update open slots" ON public.open_slots FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: photos Authenticated users can update photos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update photos" ON public.photos FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: quotes Authenticated users can update quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update quotes" ON public.quotes FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: quotes Public can read quotes by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read quotes by token" ON public.quotes FOR SELECT USING (((validation_token IS NOT NULL) AND (validation_token = (current_setting('app.current_quote_token'::text, true))::uuid)));


--
-- Name: quote_payments Public can view payments by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view payments by token" ON public.quote_payments FOR SELECT TO anon USING ((validation_token IS NOT NULL));


--
-- Name: analytics_daily_stats Service can manage daily_stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage daily_stats" ON public.analytics_daily_stats USING (true);


--
-- Name: analytics_conversions Service can update conversions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update conversions" ON public.analytics_conversions FOR UPDATE USING (true);


--
-- Name: analytics_page_views Service can update page_views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update page_views" ON public.analytics_page_views FOR UPDATE USING (true);


--
-- Name: analytics_sessions Service can update sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can update sessions" ON public.analytics_sessions FOR UPDATE USING (true);


--
-- Name: invoices Service role full access invoices; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access invoices" ON public.invoices USING ((auth.role() = 'service_role'::text));


--
-- Name: email_templates Service role full access to email templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to email templates" ON public.email_templates USING ((auth.role() = 'service_role'::text));


--
-- Name: services Service role full access to services; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to services" ON public.services USING ((auth.role() = 'service_role'::text));


--
-- Name: site_settings Service role full access to site settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access to site settings" ON public.site_settings USING ((auth.role() = 'service_role'::text));


--
-- Name: analytics_conversions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_conversions ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_daily_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_daily_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_page_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_page_views ENABLE ROW LEVEL SECURITY;

--
-- Name: analytics_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: appointments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

--
-- Name: blocked_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.blocked_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: business_hours; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

--
-- Name: email_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: invoices; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

--
-- Name: open_slots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.open_slots ENABLE ROW LEVEL SECURITY;

--
-- Name: photos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: services; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

--
-- Name: site_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict TT019zk72VzLT3npW3JYWCnydWagXtm4hT3Q3kLAGf6qRoYVM38hd0oxJs5q2la

