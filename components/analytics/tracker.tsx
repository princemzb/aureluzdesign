'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'aureluz_session_id';

/**
 * Génère un fingerprint hash basé sur les caractéristiques du navigateur
 * (sans cookies, respectueux de la vie privée)
 */
function generateFingerprint(): string {
  if (typeof window === 'undefined') return '';

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    // @ts-expect-error - deviceMemory may not exist
    navigator.deviceMemory || 0,
  ].join('|');

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < components.length; i++) {
    hash = (hash * 33) ^ components.charCodeAt(i);
  }
  return Math.abs(hash).toString(16);
}

/**
 * Détecte le type d'appareil
 */
function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) {
    return 'tablet';
  }

  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
}

/**
 * Détecte le navigateur et sa version
 */
function getBrowserInfo(): { browser: string; version: string } {
  if (typeof window === 'undefined') return { browser: 'Unknown', version: '' };

  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let version = '';

  if (ua.includes('Firefox/')) {
    browser = 'Firefox';
    version = ua.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Edg/')) {
    browser = 'Edge';
    version = ua.match(/Edg\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
    browser = 'Chrome';
    version = ua.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
    browser = 'Safari';
    version = ua.match(/Version\/(\d+)/)?.[1] || '';
  } else if (ua.includes('Opera') || ua.includes('OPR/')) {
    browser = 'Opera';
    version = ua.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || '';
  }

  return { browser, version };
}

/**
 * Détecte l'OS et sa version
 */
function getOSInfo(): { os: string; version: string } {
  if (typeof window === 'undefined') return { os: 'Unknown', version: '' };

  const ua = navigator.userAgent;
  let os = 'Unknown';
  let version = '';

  if (ua.includes('Windows')) {
    os = 'Windows';
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    if (match) {
      const ntVersion = match[1];
      // Map NT versions to Windows versions
      const versionMap: Record<string, string> = {
        '10.0': '10/11',
        '6.3': '8.1',
        '6.2': '8',
        '6.1': '7',
      };
      version = versionMap[ntVersion] || ntVersion;
    }
  } else if (ua.includes('Mac OS X')) {
    os = 'macOS';
    version = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (ua.includes('Android')) {
    os = 'Android';
    version = ua.match(/Android (\d+(?:\.\d+)?)/)?.[1] || '';
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    os = 'iOS';
    version = ua.match(/OS (\d+_\d+)/)?.[1]?.replace(/_/g, '.') || '';
  } else if (ua.includes('Linux')) {
    os = 'Linux';
  }

  return { os, version };
}

/**
 * Envoie les données de tracking à l'API
 */
async function sendTracking(data: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error('Tracking error:', response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Tracking error:', error);
    return null;
  }
}

/**
 * Composant de tracking analytics
 * À inclure dans le layout principal
 */
export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sessionIdRef = useRef<string | null>(null);
  const pageViewIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const initializedRef = useRef(false);

  // Initialise ou récupère la session
  const initSession = useCallback(async () => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Vérifier si une session existe déjà (dans sessionStorage)
    const existingSessionId = sessionStorage.getItem(STORAGE_KEY);
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
      return;
    }

    // Créer une nouvelle session
    const fingerprint = generateFingerprint();
    const { browser, version: browserVersion } = getBrowserInfo();
    const { os, version: osVersion } = getOSInfo();

    const result = await sendTracking({
      type: 'session',
      fingerprintHash: fingerprint,
      deviceType: getDeviceType(),
      browser,
      browserVersion,
      os,
      osVersion,
      screenWidth: screen.width,
      screenHeight: screen.height,
      referrerUrl: document.referrer || null,
      utmSource: searchParams.get('utm_source'),
      utmMedium: searchParams.get('utm_medium'),
      utmCampaign: searchParams.get('utm_campaign'),
    });

    if (result?.sessionId) {
      sessionIdRef.current = result.sessionId as string;
      sessionStorage.setItem(STORAGE_KEY, result.sessionId as string);
    }
  }, [searchParams]);

  // Track page view
  const trackPageView = useCallback(async () => {
    if (!sessionIdRef.current) return;

    // Envoyer le temps passé sur la page précédente
    if (pageViewIdRef.current) {
      const timeOnPage = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (timeOnPage > 0 && timeOnPage < 3600) {
        // Max 1 heure
        await sendTracking({
          type: 'page_time',
          pageViewId: pageViewIdRef.current,
          timeOnPage,
        });
      }
    }

    // Reset le timer
    startTimeRef.current = Date.now();

    // Tracker la nouvelle page
    const result = await sendTracking({
      type: 'page_view',
      sessionId: sessionIdRef.current,
      pagePath: pathname,
      pageTitle: document.title,
      pageReferrer: document.referrer,
      loadTimeMs: performance.now(),
    });

    if (result?.pageViewId) {
      pageViewIdRef.current = result.pageViewId as string;
    }
  }, [pathname]);

  // Initialisation
  useEffect(() => {
    initSession();
  }, [initSession]);

  // Track page views on navigation
  useEffect(() => {
    // Attendre que la session soit initialisée
    const checkAndTrack = async () => {
      // Attendre un peu pour que la session soit prête
      if (!sessionIdRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (sessionIdRef.current) {
        trackPageView();
      }
    };

    checkAndTrack();
  }, [pathname, trackPageView]);

  // Track scroll depth
  useEffect(() => {
    if (!pageViewIdRef.current) return;

    let maxScroll = 0;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
          if (scrollHeight > 0) {
            const currentScroll = Math.round((window.scrollY / scrollHeight) * 100);
            maxScroll = Math.max(maxScroll, Math.min(currentScroll, 100));
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Envoyer le scroll depth quand on quitte la page
    const handleBeforeUnload = () => {
      if (pageViewIdRef.current && maxScroll > 0) {
        // Utiliser sendBeacon pour garantir l'envoi
        navigator.sendBeacon(
          '/api/analytics/track',
          JSON.stringify({
            type: 'scroll',
            pageViewId: pageViewIdRef.current,
            scrollDepth: maxScroll,
          })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      // Envoyer le scroll depth au démontage
      if (pageViewIdRef.current && maxScroll > 0) {
        sendTracking({
          type: 'scroll',
          pageViewId: pageViewIdRef.current,
          scrollDepth: maxScroll,
        });
      }
    };
  }, [pathname]);

  // Ce composant ne rend rien
  return null;
}

/**
 * Fonction utilitaire pour tracker des événements custom
 */
export function trackEvent(
  category: string,
  action: string,
  label?: string,
  value?: number
): void {
  const sessionId = sessionStorage.getItem(STORAGE_KEY);
  if (!sessionId) return;

  sendTracking({
    type: 'event',
    sessionId,
    category,
    action,
    label,
    value,
  });
}

/**
 * Fonction utilitaire pour tracker les étapes du funnel
 */
export function trackFunnelStep(
  step:
    | 'date_selected'
    | 'time_selected'
    | 'form_started'
    | 'form_submitted'
    | 'confirmation_viewed'
): void {
  const sessionId = sessionStorage.getItem(STORAGE_KEY);
  if (!sessionId) return;

  sendTracking({
    type: 'funnel',
    sessionId,
    step,
  });
}
