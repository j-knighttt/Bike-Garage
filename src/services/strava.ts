import Constants from 'expo-constants';
import { RideActivity } from '../domain/types';
import { uid } from '../utils/id';

/**
 * Strava integration.
 *
 * Real OAuth needs a registered Strava API application. Provide credentials via
 * environment variables (EXPO_PUBLIC_STRAVA_CLIENT_ID / _SECRET) — see README.
 * When they are missing the app falls back to a working demo sync so the rest
 * of the experience can be used end-to-end without an account.
 */

export const STRAVA_DISCOVERY = {
  authorizationEndpoint: 'https://www.strava.com/oauth/mobile/authorize',
  tokenEndpoint: 'https://www.strava.com/oauth/token',
  revocationEndpoint: 'https://www.strava.com/oauth/deauthorize',
};

export const STRAVA_SCOPES = ['read', 'activity:read_all', 'profile:read_all'];

interface StravaConfig {
  clientId?: string;
  clientSecret?: string;
}

function readConfig(): StravaConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;
  return {
    clientId:
      process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID ?? extra.stravaClientId,
    clientSecret:
      process.env.EXPO_PUBLIC_STRAVA_CLIENT_SECRET ?? extra.stravaClientSecret,
  };
}

export function isStravaConfigured(): boolean {
  const { clientId, clientSecret } = readConfig();
  return Boolean(clientId && clientSecret);
}

export function getClientId(): string | undefined {
  return readConfig().clientId;
}

/** Exchange an OAuth authorization code for tokens. */
export async function exchangeCode(
  code: string,
): Promise<{ accessToken: string; refreshToken: string; athleteName?: string }> {
  const { clientId, clientSecret } = readConfig();
  if (!clientId || !clientSecret) {
    throw new Error('Strava ist nicht konfiguriert.');
  }
  const res = await fetch(STRAVA_DISCOVERY.tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Strava-Token-Fehler (${res.status})`);
  const data = await res.json();
  const athleteName = data.athlete
    ? `${data.athlete.firstname ?? ''} ${data.athlete.lastname ?? ''}`.trim()
    : undefined;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    athleteName,
  };
}

interface StravaApiActivity {
  id: number;
  name: string;
  distance: number; // meters
  moving_time: number; // seconds
  start_date_local: string;
  gear_id?: string | null;
  type?: string;
}

function mapActivity(a: StravaApiActivity): RideActivity {
  return {
    id: String(a.id),
    name: a.name,
    distanceKm: Math.round((a.distance / 1000) * 10) / 10,
    movingTimeSec: a.moving_time,
    startDate: a.start_date_local,
    gearId: a.gear_id ?? undefined,
  };
}

/** Fetch recent rides for the authenticated athlete. */
export async function fetchActivities(
  accessToken: string,
  perPage = 30,
): Promise<RideActivity[]> {
  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Strava-Activities-Fehler (${res.status})`);
  const data: StravaApiActivity[] = await res.json();
  return data
    .filter((a) => !a.type || a.type.toLowerCase().includes('ride'))
    .map(mapActivity);
}

/**
 * Generate a few plausible demo rides so the maintenance engine has something
 * to chew on without a real Strava connection.
 */
export function generateDemoRides(count = 4): RideActivity[] {
  const names = [
    'Feierabendrunde',
    'Sonntags-Tour',
    'Hügel-Intervalle',
    'Café-Ride',
    'Lange Ausfahrt',
  ];
  const rides: RideActivity[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i += 1) {
    const distanceKm = Math.round((25 + Math.random() * 70) * 10) / 10;
    const wet = Math.random() < 0.3;
    rides.push({
      id: uid('demo-'),
      name: names[i % names.length],
      distanceKm,
      movingTimeSec: Math.round((distanceKm / 27) * 3600),
      startDate: new Date(now - i * 86400000 * 2).toISOString(),
      wet,
    });
  }
  return rides;
}
