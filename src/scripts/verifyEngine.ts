/**
 * Standalone sanity check for the maintenance engine (no React / Expo).
 * Run via: npm run verify:engine
 */
import { makeBike } from '../domain/factories';
import { bikeHealth, buildRecommendations, computeWear } from '../domain/maintenanceEngine';

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

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nAll engine checks passed ✓');
