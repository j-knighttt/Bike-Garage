import { Bike, RideActivity } from './types';

/**
 * Pure logic for mapping Strava rides onto individual garage bikes. Kept free
 * of React/storage so it can be unit-tested. The store is a thin wrapper.
 *
 * Resolution rules for a ride, in order:
 *   1. There is exactly one bike — everything belongs to it (smoothest case).
 *   2. The ride's Strava gear id matches a bike's `stravaGearId`.
 *   3. A default bike is configured.
 *   4. Otherwise: unassigned (the user assigns it manually later).
 */
export function resolveBikeId(
  ride: Pick<RideActivity, 'gearId'>,
  bikes: Bike[],
  defaultBikeId?: string,
): string | undefined {
  if (bikes.length === 1) return bikes[0].id;
  if (ride.gearId) {
    const matched = bikes.find((b) => b.stravaGearId === ride.gearId);
    if (matched) return matched.id; // gear present but unmapped → fall through
  }
  if (defaultBikeId && bikes.some((b) => b.id === defaultBikeId)) return defaultBikeId;
  return undefined;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Add up distance per bike id. */
function sumByBike(rides: RideActivity[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of rides) {
    if (!r.bikeId) continue;
    out.set(r.bikeId, (out.get(r.bikeId) ?? 0) + r.distanceKm);
  }
  return out;
}

function bumpBikes(bikes: Bike[], deltaByBike: Map<string, number>): Bike[] {
  if (deltaByBike.size === 0) return bikes;
  return bikes.map((b) =>
    deltaByBike.has(b.id)
      ? { ...b, totalKm: round1(b.totalKm + (deltaByBike.get(b.id) ?? 0)) }
      : b,
  );
}

/**
 * Tag a batch of fresh rides with their resolved bike and bump each bike's
 * odometer accordingly.
 */
export function distributeRides(
  bikes: Bike[],
  rides: RideActivity[],
  defaultBikeId?: string,
): { bikes: Bike[]; rides: RideActivity[] } {
  const tagged = rides.map((r) => ({ ...r, bikeId: resolveBikeId(r, bikes, defaultBikeId) }));
  return { bikes: bumpBikes(bikes, sumByBike(tagged)), rides: tagged };
}

/**
 * Move a single stored ride to a different bike (or assign a previously
 * unassigned one). Odometers are corrected on both the old and new bike.
 */
export function moveRideToBike(
  bikes: Bike[],
  activities: RideActivity[],
  rideId: string,
  toBikeId: string,
): { bikes: Bike[]; activities: RideActivity[] } {
  const ride = activities.find((r) => r.id === rideId);
  if (!ride || ride.bikeId === toBikeId) return { bikes, activities };

  const delta = new Map<string, number>();
  if (ride.bikeId) delta.set(ride.bikeId, -ride.distanceKm);
  delta.set(toBikeId, (delta.get(toBikeId) ?? 0) + ride.distanceKm);

  return {
    bikes: bumpBikes(bikes, delta),
    activities: activities.map((r) => (r.id === rideId ? { ...r, bikeId: toBikeId } : r)),
  };
}

/**
 * After linking a Strava gear to a bike, retro-assign any previously
 * unassigned rides that carry that gear id.
 */
export function assignUnassignedByGear(
  bikes: Bike[],
  activities: RideActivity[],
  gearId: string,
  bikeId: string,
): { bikes: Bike[]; activities: RideActivity[] } {
  const delta = new Map<string, number>();
  const updated = activities.map((r) => {
    if (!r.bikeId && r.gearId === gearId) {
      delta.set(bikeId, (delta.get(bikeId) ?? 0) + r.distanceKm);
      return { ...r, bikeId };
    }
    return r;
  });
  return { bikes: bumpBikes(bikes, delta), activities: updated };
}
