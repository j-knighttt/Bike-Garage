/**
 * Standalone sanity check for the maintenance engine (no React / Expo).
 * Run via: npm run verify:engine
 */
import { makeBike } from '../domain/factories';
import { bikeHealth, buildRecommendations, computeWear } from '../domain/maintenanceEngine';
import { computeStats, percentChange } from '../domain/stats';
import { DEMO_PROVIDERS, distanceKm, formatPrice, sortByDistance } from '../domain/providers';
import {
  assignUnassignedByGear,
  distributeRides,
  moveRideToBike,
} from '../domain/rideAssignment';
import { RideActivity } from '../domain/types';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('  ✗ ' + msg);
  } else {
    console.log('  ✓ ' + msg);
  }
}

console.log('New road bike, brand new, 0 km:');
const fresh = makeBike({ name: 'Test', type: 'road', startKm: 0 });
const freshChain = fresh.components.find((c) => c.category === 'chain')!;
const w0 = computeWear(fresh, freshChain, new Date());
assert(w0.fraction < 0.05, 'fresh chain wear is ~0 (got ' + w0.fraction.toFixed(2) + ')');
const h0 = bikeHealth(fresh, 'pro');
assert(h0.worst === 'ok', 'fresh bike has no urgent items');

console.log('\nUsed bike, chain at 35% condition, ridden 3000 km:');
const used = makeBike({ name: 'Used', type: 'road', startKm: 0 });
const chain = used.components.find((c) => c.category === 'chain')!;
chain.initialConditionPercent = 35; // already 65% consumed
used.totalKm = 3000; // chain lifespan 3500
const w1 = computeWear(used, chain, new Date());
assert(w1.fraction > 1, 'worn+ridden chain is overdue (fraction ' + w1.fraction.toFixed(2) + ')');

console.log('\nLevel changes urgency lead time:');
const bike = makeBike({ name: 'Lead', type: 'road', startKm: 0 });
const c = bike.components.find((x) => x.category === 'chain')!;
// Put chain at 80% of life.
bike.totalKm = 0;
c.initialConditionPercent = 20; // 80% consumed
const recsBeginner = buildRecommendations(bike, 'beginner').find((r) => r.componentId === c.id)!;
const recsPro = buildRecommendations(bike, 'pro').find((r) => r.componentId === c.id)!;
assert(
  recsBeginner.urgency === 'due' || recsBeginner.urgency === 'overdue',
  'beginner is warned at 80% life (' + recsBeginner.urgency + ')',
);
assert(recsPro.urgency !== 'overdue', 'pro is not yet overdue at 80% life (' + recsPro.urgency + ')');

console.log('\nDIY recommendation depends on level:');
const bb = makeBike({ name: 'BB', type: 'road', startKm: 0 });
bb.components.push({
  id: 'bb1',
  category: 'bottomBracket',
  installedAtKm: 0,
  installedAt: new Date().toISOString(),
  initialConditionPercent: 5,
});
const proRec = buildRecommendations(bb, 'pro').find((r) => r.componentId === 'bb1')!;
const begRec = buildRecommendations(bb, 'beginner').find((r) => r.componentId === 'bb1')!;
assert(proRec.diy === true, 'pro does bottom bracket themselves');
assert(begRec.diy === false, 'beginner is sent to the workshop for bottom bracket');

console.log('\nWarranty-relevant service intervals are present:');
const sv = buildRecommendations(used, 'beginner').filter((r) => r.warrantyRelevant);
assert(sv.length > 0, 'at least one warranty-relevant service interval surfaces');

console.log('\nRide statistics aggregate by period:');
const now = new Date('2026-06-19T12:00:00Z');
const rides: RideActivity[] = [
  { id: 'a', name: 'today', distanceKm: 40, movingTimeSec: 5400, elevationGainM: 500, startDate: '2026-06-19T08:00:00Z' },
  { id: 'b', name: 'this week', distanceKm: 30, movingTimeSec: 3600, elevationGainM: 300, startDate: '2026-06-16T08:00:00Z' },
  { id: 'c', name: 'this month', distanceKm: 60, movingTimeSec: 7200, elevationGainM: 800, startDate: '2026-06-02T08:00:00Z' },
  { id: 'd', name: 'last year', distanceKm: 100, movingTimeSec: 12000, elevationGainM: 1200, startDate: '2025-06-02T08:00:00Z' },
];
const stats = computeStats(rides, now);
assert(stats.week.distanceKm === 70, 'week distance = 40+30 (got ' + stats.week.distanceKm + ')');
assert(stats.month.distanceKm === 130, 'month distance = 40+30+60 (got ' + stats.month.distanceKm + ')');
assert(stats.year.distanceKm === 130, 'year distance excludes last year (got ' + stats.year.distanceKm + ')');
assert(stats.allTime.distanceKm === 230, 'all-time distance = 230 (got ' + stats.allTime.distanceKm + ')');
assert(stats.week.elevationM === 800, 'week elevation = 500+300 (got ' + stats.week.elevationM + ')');
assert(stats.longestRideKm === 100, 'longest ride = 100 km (got ' + stats.longestRideKm + ')');

console.log('\nPeriod comparison:');
assert(percentChange(120, 100) === 20, 'percentChange 100→120 = +20%');
assert(percentChange(50, 100) === -50, 'percentChange 100→50 = -50%');
assert(percentChange(10, 0) === 100, 'percentChange from zero baseline = 100%');

console.log('\nService providers & distance:');
const berlin = { lat: 52.52, lng: 13.405 };
const munich = { lat: 48.137, lng: 11.575 };
const d = distanceKm(berlin, munich);
assert(d > 480 && d < 520, 'Berlin↔Munich ~504 km (got ' + Math.round(d) + ')');
const sorted = sortByDistance(DEMO_PROVIDERS, berlin);
const distances = sorted.map((p) => p.distanceKm ?? 0);
assert(
  distances.every((v, i) => i === 0 || v >= distances[i - 1]),
  'providers sorted nearest-first',
);
assert(formatPrice({ type: 'cleaning', label: 'x', priceFromEur: 19, priceToEur: 39 }) === '19–39 €', 'price range formats');
assert(formatPrice({ type: 'cleaning', label: 'x', priceFromEur: 25 }) === 'ab 25 €', 'price "ab" formats');
assert(formatPrice({ type: 'cleaning', label: 'x' }) === 'auf Anfrage', 'price "auf Anfrage" formats');

console.log('\nRide → bike assignment:');
const b1 = makeBike({ name: 'Renner', type: 'road', startKm: 0 });
const b2 = makeBike({ name: 'Gravel', type: 'gravel', startKm: 0 });
b1.stravaGearId = 'g1';
const newRides: RideActivity[] = [
  { id: 'r1', name: 'gear match', distanceKm: 10, movingTimeSec: 1200, startDate: '2026-06-18T08:00:00Z', gearId: 'g1' },
  { id: 'r2', name: 'no gear', distanceKm: 20, movingTimeSec: 2400, startDate: '2026-06-18T09:00:00Z' },
];
// Two bikes, no default → r1 matches gear, r2 stays unassigned.
const dist = distributeRides([b1, b2], newRides);
const r1 = dist.rides.find((r) => r.id === 'r1')!;
const r2 = dist.rides.find((r) => r.id === 'r2')!;
assert(r1.bikeId === b1.id, 'ride with gear g1 assigned to matching bike');
assert(r2.bikeId === undefined, 'ride without gear stays unassigned (2 bikes, no default)');
assert(dist.bikes.find((b) => b.id === b1.id)!.totalKm === 10, 'matched bike odometer +10');

// With default bike, the gearless ride is assigned to it.
const dist2 = distributeRides([b1, b2], newRides, b2.id);
assert(dist2.rides.find((r) => r.id === 'r2')!.bikeId === b2.id, 'gearless ride → default bike');
assert(dist2.bikes.find((b) => b.id === b2.id)!.totalKm === 20, 'default bike odometer +20');

// Single bike → everything goes to it.
const solo = distributeRides([b2], newRides);
assert(solo.rides.every((r) => r.bikeId === b2.id), 'single bike receives all rides');

// Moving an unassigned ride later bumps the target odometer.
const moved = moveRideToBike(dist.bikes, dist.rides, 'r2', b2.id);
assert(moved.activities.find((r) => r.id === 'r2')!.bikeId === b2.id, 'ride moved to bike');
assert(moved.bikes.find((b) => b.id === b2.id)!.totalKm === 20, 'moved bike odometer +20');

// Linking a gear retro-assigns previously unassigned rides with that gear.
const withGear: RideActivity[] = [
  { id: 'r3', name: 'gear g9', distanceKm: 15, movingTimeSec: 1800, startDate: '2026-06-17T08:00:00Z', gearId: 'g9' },
];
const linked = assignUnassignedByGear([b1, b2], withGear, 'g9', b2.id);
assert(linked.activities[0].bikeId === b2.id, 'gear link retro-assigns ride');
assert(linked.bikes.find((b) => b.id === b2.id)!.totalKm === 15, 'retro-assign bumps odometer +15');

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll engine checks passed ✓');
