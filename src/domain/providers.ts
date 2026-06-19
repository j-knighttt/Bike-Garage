/**
 * Service-provider domain: bike shops / mobile mechanics / cleaning services,
 * the work they offer (with public price ranges where available), and a local
 * booking/appointment model.
 *
 * The provider list here is a curated demo dataset. A future version can swap
 * `DEMO_PROVIDERS` for a real directory/API (e.g. partner shops) without
 * touching the UI — the shapes stay the same.
 */

export type ServiceType =
  | 'cleaning'
  | 'inspection'
  | 'repair'
  | 'wear'
  | 'wheel'
  | 'suspension'
  | 'ebike';

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  cleaning: 'Reinigung',
  inspection: 'Inspektion',
  repair: 'Reparatur',
  wear: 'Verschleißteile',
  wheel: 'Laufrad/Service',
  suspension: 'Federung',
  ebike: 'E-Bike',
};

export interface OfferedService {
  type: ServiceType;
  label: string;
  /** Public price range in EUR; either may be omitted if "ab" / "auf Anfrage". */
  priceFromEur?: number;
  priceToEur?: number;
  durationMin?: number;
}

export type ProviderKind = 'shop' | 'mobile' | 'cleaning';

export interface ServiceProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  rating: number; // 0..5
  reviewCount: number;
  street: string;
  city: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  /** External booking link (opens in browser) if the provider supports it. */
  bookingUrl?: string;
  openingHours?: string;
  services: OfferedService[];
}

export type BookingStatus = 'requested' | 'confirmed' | 'done' | 'cancelled';

export interface Booking {
  id: string;
  providerId: string;
  providerName: string;
  serviceLabel: string;
  serviceType: ServiceType;
  bikeId?: string;
  bikeName?: string;
  /** Preferred date as ISO string. */
  preferredDate: string;
  status: BookingStatus;
  note?: string;
  createdAt: string;
}

/** Great-circle distance in km between two coordinates (Haversine). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatPrice(s: OfferedService): string {
  if (s.priceFromEur && s.priceToEur) return `${s.priceFromEur}–${s.priceToEur} €`;
  if (s.priceFromEur) return `ab ${s.priceFromEur} €`;
  return 'auf Anfrage';
}

/** Sort providers by distance from `origin` (if given), nearest first. */
export function sortByDistance(
  providers: ServiceProvider[],
  origin?: { lat: number; lng: number } | null,
): (ServiceProvider & { distanceKm?: number })[] {
  if (!origin) return providers.map((p) => ({ ...p }));
  return providers
    .map((p) => ({ ...p, distanceKm: distanceKm(origin, p) }))
    .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
}

/**
 * Curated demo providers (coordinates around Berlin). Distances are computed
 * relative to the rider's actual location, so the *ordering* is meaningful even
 * though the addresses are illustrative.
 */
export const DEMO_PROVIDERS: ServiceProvider[] = [
  {
    id: 'p-velohaus',
    name: 'VeloHaus Werkstatt',
    kind: 'shop',
    rating: 4.7,
    reviewCount: 312,
    street: 'Kastanienallee 12',
    city: 'Berlin',
    lat: 52.5396,
    lng: 13.4039,
    phone: '+49301234567',
    website: 'https://example.com/velohaus',
    bookingUrl: 'https://example.com/velohaus/termin',
    openingHours: 'Mo–Fr 9–19, Sa 10–16',
    services: [
      { type: 'inspection', label: 'Kleine Inspektion', priceFromEur: 59, priceToEur: 79, durationMin: 60 },
      { type: 'inspection', label: 'Große Inspektion', priceFromEur: 129, priceToEur: 169, durationMin: 120 },
      { type: 'cleaning', label: 'Premium-Wäsche', priceFromEur: 35, priceToEur: 49, durationMin: 45 },
      { type: 'wear', label: 'Kette + Kassette wechseln', priceFromEur: 39, durationMin: 45 },
      { type: 'repair', label: 'Bremse entlüften', priceFromEur: 39, priceToEur: 55, durationMin: 40 },
    ],
  },
  {
    id: 'p-radschmiede',
    name: 'Radschmiede & Co.',
    kind: 'shop',
    rating: 4.5,
    reviewCount: 188,
    street: 'Bergmannstraße 88',
    city: 'Berlin',
    lat: 52.4881,
    lng: 13.3989,
    phone: '+49302345678',
    website: 'https://example.com/radschmiede',
    openingHours: 'Mo–Fr 10–18',
    services: [
      { type: 'inspection', label: 'Sicherheitscheck', priceFromEur: 39, durationMin: 30 },
      { type: 'wheel', label: 'Laufrad zentrieren', priceFromEur: 19, priceToEur: 35, durationMin: 30 },
      { type: 'wear', label: 'Reifen wechseln', priceFromEur: 15, durationMin: 20 },
      { type: 'suspension', label: 'Gabel-Service (Lowers)', priceFromEur: 99, priceToEur: 149, durationMin: 120 },
    ],
  },
  {
    id: 'p-mobilrad',
    name: 'MobilRad – Werkstatt vor Ort',
    kind: 'mobile',
    rating: 4.8,
    reviewCount: 95,
    street: 'Anfahrt zu dir',
    city: 'Berlin & Umland',
    lat: 52.52,
    lng: 13.405,
    phone: '+49303456789',
    website: 'https://example.com/mobilrad',
    bookingUrl: 'https://example.com/mobilrad/buchen',
    openingHours: 'Termine Mo–Sa',
    services: [
      { type: 'repair', label: 'Anfahrt + Diagnose', priceFromEur: 29, durationMin: 30 },
      { type: 'inspection', label: 'Inspektion bei dir zuhause', priceFromEur: 89, priceToEur: 119, durationMin: 90 },
      { type: 'ebike', label: 'E-Bike Diagnose', priceFromEur: 49, durationMin: 45 },
    ],
  },
  {
    id: 'p-bikewash',
    name: 'BikeWash Station',
    kind: 'cleaning',
    rating: 4.3,
    reviewCount: 64,
    street: 'Warschauer Str. 5',
    city: 'Berlin',
    lat: 52.5058,
    lng: 13.4496,
    phone: '+49304567890',
    website: 'https://example.com/bikewash',
    openingHours: 'Täglich 8–20',
    services: [
      { type: 'cleaning', label: 'Express-Wäsche', priceFromEur: 19, durationMin: 20 },
      { type: 'cleaning', label: 'Komplettreinigung + Pflege', priceFromEur: 39, priceToEur: 59, durationMin: 60 },
    ],
  },
  {
    id: 'p-procycle',
    name: 'ProCycle Service Center',
    kind: 'shop',
    rating: 4.6,
    reviewCount: 421,
    street: 'Frankfurter Allee 110',
    city: 'Berlin',
    lat: 52.515,
    lng: 13.474,
    phone: '+49305678901',
    website: 'https://example.com/procycle',
    bookingUrl: 'https://example.com/procycle/termin',
    openingHours: 'Mo–Sa 9–20',
    services: [
      { type: 'inspection', label: 'Jahresinspektion', priceFromEur: 99, priceToEur: 139, durationMin: 90 },
      { type: 'wear', label: 'Bremsbeläge wechseln', priceFromEur: 25, durationMin: 30 },
      { type: 'wheel', label: 'Nabe/Lager-Service', priceFromEur: 45, priceToEur: 75, durationMin: 60 },
      { type: 'suspension', label: 'Dämpfer-Service', priceFromEur: 119, durationMin: 120 },
      { type: 'cleaning', label: 'Antrieb-Tiefenreinigung', priceFromEur: 29, durationMin: 40 },
    ],
  },
];
