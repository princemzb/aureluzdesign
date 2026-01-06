import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getGeoLocation } from '@/lib/services/geolocation.service';
import type { TrackSessionInput, DeviceType } from '@/lib/types';

// Types pour les requêtes de tracking
interface SessionTrackingData extends TrackSessionInput {
  type: 'session';
}

interface PageViewTrackingData {
  type: 'page_view';
  sessionId: string;
  pagePath: string;
  pageTitle?: string;
  pageReferrer?: string;
  loadTimeMs?: number;
}

interface PageTimeTrackingData {
  type: 'page_time';
  pageViewId: string;
  timeOnPage: number;
}

interface ScrollTrackingData {
  type: 'scroll';
  pageViewId: string;
  scrollDepth: number;
}

interface EventTrackingData {
  type: 'event';
  sessionId: string;
  pageViewId?: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  data?: Record<string, unknown>;
}

interface FunnelTrackingData {
  type: 'funnel';
  sessionId: string;
  step: string;
}

type TrackingData =
  | SessionTrackingData
  | PageViewTrackingData
  | PageTimeTrackingData
  | ScrollTrackingData
  | EventTrackingData
  | FunnelTrackingData;

/**
 * Extrait l'IP du client depuis les headers de la requête
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  return '127.0.0.1';
}

/**
 * Extrait le domaine d'une URL referrer
 */
function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body as TrackingData;

    const supabase = createAdminClient();
    const ip = getClientIP(request);

    switch (type) {
      case 'session': {
        const sessionData = data as Omit<SessionTrackingData, 'type'>;

        // Récupérer la géolocalisation
        const geo = await getGeoLocation(ip);

        // Vérifier si c'est un visiteur récurrent
        const { data: existingSession } = await supabase
          .from('analytics_sessions')
          .select('id')
          .eq('fingerprint_hash', sessionData.fingerprintHash)
          .limit(1)
          .maybeSingle();

        // Créer la session
        const { data: session, error } = await supabase
          .from('analytics_sessions')
          .insert({
            fingerprint_hash: sessionData.fingerprintHash,
            device_type: sessionData.deviceType as DeviceType,
            browser: sessionData.browser || null,
            browser_version: sessionData.browserVersion || null,
            os: sessionData.os || null,
            os_version: sessionData.osVersion || null,
            screen_width: sessionData.screenWidth || null,
            screen_height: sessionData.screenHeight || null,
            referrer_url: sessionData.referrerUrl || null,
            referrer_domain: extractDomain(sessionData.referrerUrl || null),
            utm_source: sessionData.utmSource || null,
            utm_medium: sessionData.utmMedium || null,
            utm_campaign: sessionData.utmCampaign || null,
            country_code: geo?.countryCode || null,
            country_name: geo?.countryName || null,
            region: geo?.region || null,
            city: geo?.city || null,
            is_new_visitor: !existingSession,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating session:', error);
          return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
        }

        // Créer l'entrée de conversion pour cette session
        await supabase.from('analytics_conversions').insert({
          session_id: session.id,
        });

        return NextResponse.json({ sessionId: session.id });
      }

      case 'page_view': {
        const pageData = data as Omit<PageViewTrackingData, 'type'>;

        // Créer la page view
        const { data: pageView, error } = await supabase
          .from('analytics_page_views')
          .insert({
            session_id: pageData.sessionId,
            page_path: pageData.pagePath,
            page_title: pageData.pageTitle || null,
            page_referrer: pageData.pageReferrer || null,
            load_time_ms: pageData.loadTimeMs ? Math.round(pageData.loadTimeMs) : null,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Error creating page view:', error);
          return NextResponse.json({ error: 'Failed to create page view' }, { status: 500 });
        }

        // Incrémenter le compteur de pages vues de la session
        await supabase.rpc('increment_session_page_views', {
          p_session_id: pageData.sessionId,
        });

        // Mettre à jour le funnel si c'est une page clé
        if (pageData.pagePath === '/') {
          await updateFunnelStep(supabase, pageData.sessionId, 'step_homepage_visit');
        } else if (pageData.pagePath === '/booking') {
          await updateFunnelStep(supabase, pageData.sessionId, 'step_booking_page_visit');
        }

        return NextResponse.json({ pageViewId: pageView.id });
      }

      case 'page_time': {
        const timeData = data as Omit<PageTimeTrackingData, 'type'>;

        await supabase
          .from('analytics_page_views')
          .update({ time_on_page_seconds: timeData.timeOnPage })
          .eq('id', timeData.pageViewId);

        return NextResponse.json({ success: true });
      }

      case 'scroll': {
        const scrollData = data as Omit<ScrollTrackingData, 'type'>;

        await supabase
          .from('analytics_page_views')
          .update({ max_scroll_depth: scrollData.scrollDepth })
          .eq('id', scrollData.pageViewId);

        return NextResponse.json({ success: true });
      }

      case 'event': {
        const eventData = data as Omit<EventTrackingData, 'type'>;

        const { error } = await supabase.from('analytics_events').insert({
          session_id: eventData.sessionId,
          page_view_id: eventData.pageViewId || null,
          event_category: eventData.category,
          event_action: eventData.action,
          event_label: eventData.label || null,
          event_value: eventData.value || null,
          event_data: eventData.data || null,
        });

        if (error) {
          console.error('Error creating event:', error);
          return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
        }

        // Incrémenter le compteur d'événements de la session
        await supabase
          .from('analytics_sessions')
          .update({
            events_count: supabase.rpc('increment', { x: 1 }),
          })
          .eq('id', eventData.sessionId);

        return NextResponse.json({ success: true });
      }

      case 'funnel': {
        const funnelData = data as Omit<FunnelTrackingData, 'type'>;

        const stepColumn = `step_${funnelData.step}`;
        const validSteps = [
          'step_homepage_visit',
          'step_booking_page_visit',
          'step_date_selected',
          'step_time_selected',
          'step_form_started',
          'step_form_submitted',
          'step_confirmation_viewed',
        ];

        if (!validSteps.includes(stepColumn)) {
          return NextResponse.json({ error: 'Invalid funnel step' }, { status: 400 });
        }

        await updateFunnelStep(supabase, funnelData.sessionId, stepColumn);

        // Si c'est la confirmation, marquer la session comme convertie
        if (stepColumn === 'step_confirmation_viewed') {
          await supabase
            .from('analytics_sessions')
            .update({ is_converted: true })
            .eq('id', funnelData.sessionId);

          await supabase
            .from('analytics_conversions')
            .update({ converted_at: new Date().toISOString() })
            .eq('session_id', funnelData.sessionId);
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid tracking type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}

/**
 * Met à jour une étape du funnel de conversion
 */
async function updateFunnelStep(
  supabase: ReturnType<typeof createAdminClient>,
  sessionId: string,
  stepColumn: string
) {
  // Récupérer la conversion existante
  const { data: existing } = await supabase
    .from('analytics_conversions')
    .select('id, ' + stepColumn)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    // Ne mettre à jour que si l'étape n'est pas déjà remplie
    const currentValue = existing[stepColumn as keyof typeof existing];
    if (!currentValue) {
      await supabase
        .from('analytics_conversions')
        .update({ [stepColumn]: new Date().toISOString() })
        .eq('session_id', sessionId);
    }
  }
}

// Support pour les beacons (sendBeacon utilise POST avec Content-Type: text/plain)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
