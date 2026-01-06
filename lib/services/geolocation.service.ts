/**
 * Service de géolocalisation basé sur IP
 * Utilise ip-api.com (gratuit, 45 req/min)
 */

export interface GeoLocation {
  countryCode: string;
  countryName: string;
  region: string;
  city: string;
}

// Cache en mémoire pour éviter les appels répétés
const CACHE = new Map<string, { data: GeoLocation; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Récupère les informations de géolocalisation à partir d'une IP
 * @param ip Adresse IP
 * @returns Données de géolocalisation ou null si échec
 */
export async function getGeoLocation(ip: string): Promise<GeoLocation | null> {
  // Vérifier le cache
  const cached = CACHE.get(ip);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  // Ignorer les IPs locales/privées
  if (isPrivateIP(ip)) {
    return null;
  }

  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,regionName,city`,
      {
        next: { revalidate: 86400 }, // Cache Next.js 24h
      }
    );

    if (!response.ok) {
      console.error(`Geolocation API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success') {
      console.error(`Geolocation failed for IP ${ip}: ${data.message || 'Unknown error'}`);
      return null;
    }

    const geoData: GeoLocation = {
      countryCode: data.countryCode || 'XX',
      countryName: data.country || 'Unknown',
      region: data.regionName || '',
      city: data.city || '',
    };

    // Mettre en cache
    CACHE.set(ip, { data: geoData, expires: Date.now() + CACHE_TTL });

    return geoData;
  } catch (error) {
    console.error('Geolocation error:', error);
    return null;
  }
}

/**
 * Vérifie si une IP est privée/locale
 */
function isPrivateIP(ip: string): boolean {
  // IPv4 localhost
  if (ip === '127.0.0.1' || ip === 'localhost') return true;

  // IPv6 localhost
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return true;

  // Plages privées IPv4
  if (ip.startsWith('192.168.')) return true;
  if (ip.startsWith('10.')) return true;
  if (ip.startsWith('172.')) {
    const secondOctet = parseInt(ip.split('.')[1]);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }

  // Docker/container networks
  if (ip.startsWith('172.17.') || ip.startsWith('172.18.')) return true;

  return false;
}

/**
 * Nettoie le cache expiré (à appeler périodiquement si nécessaire)
 */
export function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of CACHE.entries()) {
    if (value.expires < now) {
      CACHE.delete(key);
    }
  }
}
