import {
  COMPONENT_CATALOG,
  MAX_DIY_DIFFICULTY,
  WARN_LEAD_FRACTION,
} from './componentCatalog';
import {
  Bike,
  BikeComponent,
  Recommendation,
  RiderLevel,
  ServiceInterval,
  Urgency,
} from './types';
import {
  daysBetween,
  formatKmAhead,
  formatMonthsAhead,
  monthsBetween,
} from '../utils/time';

export interface WearResult {
  /** 0..1+ how far through life (distance dimension), or null if N/A. */
  fractionKm: number | null;
  fractionTime: number | null;
  /** Combined headline fraction (worst of the two). 0..1+ */
  fraction: number;
  remainingKm: number | null;
  remainingMonths: number | null;
}

export interface EngineOptions {
  now?: Date;
  /** Set when a recent ride was logged as wet/dirty (bumps care urgency). */
  recentWetRide?: boolean;
}

const URGENCY_ORDER: Record<Urgency, number> = {
  overdue: 0,
  due: 1,
  soon: 2,
  ok: 3,
};

/** Compute the wear state of a single component against the bike's odometer. */
export function computeWear(
  bike: Bike,
  component: BikeComponent,
  now: Date,
): WearResult {
  const tpl = COMPONENT_CATALOG[component.category];
  const lifespanKm = component.lifespanKmOverride ?? tpl.lifespanKm;
  const lifespanMonths = component.lifespanMonthsOverride ?? tpl.lifespanMonths;
  const cond = clamp01(component.initialConditionPercent / 100);

  let fractionKm: number | null = null;
  let remainingKm: number | null = null;
  if (lifespanKm && lifespanKm > 0) {
    const consumedAtInstall = lifespanKm * (1 - cond);
    const kmSince = Math.max(0, bike.totalKm - component.installedAtKm);
    const usedKm = consumedAtInstall + kmSince;
    fractionKm = usedKm / lifespanKm;
    remainingKm = lifespanKm - usedKm;
  }

  let fractionTime: number | null = null;
  let remainingMonths: number | null = null;
  if (lifespanMonths && lifespanMonths > 0) {
    const consumedAtInstall = lifespanMonths * (1 - cond);
    const monthsSince = monthsBetween(component.installedAt, now);
    const usedMonths = consumedAtInstall + monthsSince;
    fractionTime = usedMonths / lifespanMonths;
    remainingMonths = lifespanMonths - usedMonths;
  }

  const fraction = Math.max(fractionKm ?? 0, fractionTime ?? 0);
  return { fractionKm, fractionTime, fraction, remainingKm, remainingMonths };
}

function urgencyFor(fraction: number, level: RiderLevel): Urgency {
  const lead = WARN_LEAD_FRACTION[level];
  const dueAt = 1 - lead;
  const soonAt = dueAt - 0.15;
  if (fraction >= 1) return 'overdue';
  if (fraction >= dueAt) return 'due';
  if (fraction >= soonAt) return 'soon';
  return 'ok';
}

/** Pick the "due in" string from whichever dimension is closest to end of life. */
function dueInString(wear: WearResult): string {
  const kmClose = wear.fractionKm ?? -Infinity;
  const timeClose = wear.fractionTime ?? -Infinity;
  if (kmClose >= timeClose && wear.remainingKm !== null) {
    return formatKmAhead(wear.remainingKm);
  }
  if (wear.remainingMonths !== null) {
    return formatMonthsAhead(wear.remainingMonths);
  }
  if (wear.remainingKm !== null) return formatKmAhead(wear.remainingKm);
  return '—';
}

function evaluateComponent(
  bike: Bike,
  component: BikeComponent,
  level: RiderLevel,
  now: Date,
): Recommendation {
  const tpl = COMPONENT_CATALOG[component.category];
  const wear = computeWear(bike, component, now);
  const urgency = urgencyFor(wear.fraction, level);
  const diy = tpl.diyDifficulty <= MAX_DIY_DIFFICULTY[level];

  const verb =
    tpl.action === 'replace'
      ? 'tauschen'
      : tpl.action === 'inspect'
        ? 'prüfen'
        : tpl.action === 'bleed'
          ? 'entlüften'
          : tpl.action === 'refresh'
            ? 'auffrischen'
            : 'überholen';

  return {
    id: `comp-${component.id}`,
    bikeId: bike.id,
    componentId: component.id,
    title: `${component.label ?? tpl.displayName} ${verb}`,
    detail: diy
      ? tpl.hint
      : `${tpl.hint} Auf deinem Level besser in der Werkstatt erledigen lassen.`,
    action: tpl.action,
    urgency,
    progress: wear.fraction,
    dueIn: dueInString(wear),
    diy,
  };
}

/** Recurring care: basic clean + drivetrain lube, scaled by rider level. */
function evaluateCare(
  bike: Bike,
  level: RiderLevel,
  opts: EngineOptions,
): Recommendation[] {
  const recs: Recommendation[] = [];

  // Drivetrain lubrication — distance based, shorter when it was wet.
  const lubeInterval = opts.recentWetRide ? 150 : 300;
  const sinceLube = bike.totalKm - (bike.lastChainLubeKm ?? bike.totalKm);
  const lubeFraction = sinceLube / lubeInterval;
  recs.push({
    id: `care-lube-${bike.id}`,
    bikeId: bike.id,
    title: 'Antrieb reinigen & schmieren',
    detail: opts.recentWetRide
      ? 'Nach nasser/schmutziger Fahrt: Kette reinigen und neu ölen.'
      : 'Kette reinigen und ölen hält den Antrieb leise und langlebig.',
    action: 'lubricate',
    urgency: urgencyFor(lubeFraction, level),
    progress: lubeFraction,
    dueIn: formatKmAhead(lubeInterval - sinceLube),
    diy: true,
    careKind: 'lube',
  });

  // Basic wash — distance based.
  const cleanInterval = 500;
  const sinceClean = bike.totalKm - (bike.lastCleanKm ?? bike.totalKm);
  const cleanFraction = sinceClean / cleanInterval;
  recs.push({
    id: `care-clean-${bike.id}`,
    bikeId: bike.id,
    title: 'Fahrrad gründlich reinigen',
    detail: 'Rahmen, Antrieb und Bremsen säubern; dabei auf Schäden prüfen.',
    action: 'clean',
    urgency: urgencyFor(cleanFraction, level),
    progress: cleanFraction,
    dueIn: formatKmAhead(cleanInterval - sinceClean),
    diy: true,
    careKind: 'clean',
  });

  // Professional deep clean / inspection — frequency depends on level.
  const proIntervalKm =
    level === 'beginner' ? 2000 : level === 'intermediate' ? 4000 : 7000;
  const sincePro = bike.totalKm - (bike.lastProServiceKm ?? bike.totalKm);
  const proFraction = sincePro / proIntervalKm;
  recs.push({
    id: `care-pro-${bike.id}`,
    bikeId: bike.id,
    title:
      level === 'pro'
        ? 'Tiefen-Check (optional Werkstatt)'
        : 'Professioneller Service / Reinigung',
    detail:
      level === 'beginner'
        ? 'Als Einsteiger empfehlen wir regelmäßig einen Werkstatt-Check.'
        : level === 'intermediate'
          ? 'Lass die kniffligen Punkte gelegentlich vom Profi prüfen.'
          : 'Vieles kannst du selbst – ein Profi-Check schadet trotzdem nicht.',
    action: 'service',
    urgency: urgencyFor(proFraction, level),
    progress: proFraction,
    dueIn: formatKmAhead(proIntervalKm - sincePro),
    diy: level === 'pro',
    careKind: 'pro',
  });

  return recs;
}

/** Manufacturer service & warranty checkpoints. */
function evaluateServiceInterval(
  bike: Bike,
  interval: ServiceInterval,
  level: RiderLevel,
  now: Date,
): Recommendation {
  const fractions: number[] = [];
  let dueIn = '—';

  if (interval.everyKm && interval.everyKm > 0) {
    const baseKm = interval.lastDoneAtKm ?? 0;
    const sinceKm = bike.totalKm - baseKm;
    const f = sinceKm / interval.everyKm;
    fractions.push(f);
    dueIn = formatKmAhead(interval.everyKm - sinceKm);
  }
  if (interval.everyMonths && interval.everyMonths > 0) {
    const base = interval.lastDoneAt ?? bike.purchaseDate;
    const sinceMonths = base ? monthsBetween(base, now) : 0;
    const f = sinceMonths / interval.everyMonths;
    fractions.push(f);
    if (fractions.length === 1 || f > (fractions[0] ?? 0)) {
      dueIn = formatMonthsAhead(interval.everyMonths - sinceMonths);
    }
  }

  const fraction = fractions.length ? Math.max(...fractions) : 0;
  const urgency = urgencyFor(fraction, level);

  return {
    id: `svc-${interval.id}`,
    bikeId: bike.id,
    title: interval.title,
    detail: interval.warrantyRelevant
      ? 'Herstellervorgabe – wichtig für die Garantie/Gewährleistung.'
      : 'Vom Hersteller empfohlener Service-Intervall.',
    action: 'service',
    urgency,
    progress: fraction,
    dueIn,
    diy: false,
    warrantyRelevant: interval.warrantyRelevant,
    serviceIntervalId: interval.id,
  };
}

/**
 * Build the full, sorted list of recommendations for a bike.
 * Most urgent first; ties broken by how far through life the item is.
 */
export function buildRecommendations(
  bike: Bike,
  level: RiderLevel,
  options: EngineOptions = {},
): Recommendation[] {
  const now = options.now ?? new Date();

  const recs: Recommendation[] = [
    ...bike.components.map((c) => evaluateComponent(bike, c, level, now)),
    ...evaluateCare(bike, level, options),
    ...bike.serviceIntervals
      .filter((i) => !(i.oneOff && i.lastDoneAt))
      .map((i) => evaluateServiceInterval(bike, i, level, now)),
  ];

  return recs.sort((a, b) => {
    const u = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency];
    if (u !== 0) return u;
    return b.progress - a.progress;
  });
}

/** Headline health for a bike: worst urgency + count of items needing action. */
export function bikeHealth(
  bike: Bike,
  level: RiderLevel,
  options: EngineOptions = {},
): { worst: Urgency; actionCount: number; recommendations: Recommendation[] } {
  const recommendations = buildRecommendations(bike, level, options);
  let worst: Urgency = 'ok';
  let actionCount = 0;
  for (const r of recommendations) {
    if (URGENCY_ORDER[r.urgency] < URGENCY_ORDER[worst]) worst = r.urgency;
    if (r.urgency === 'due' || r.urgency === 'overdue') actionCount += 1;
  }
  return { worst, actionCount, recommendations };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(1, Math.max(0, n));
}

/** Recency helper used by the store to flag wet rides. */
export function hadRecentWetRide(
  activities: { startDate: string; wet?: boolean }[],
  withinDays = 3,
  now: Date = new Date(),
): boolean {
  return activities.some(
    (a) => a.wet && daysBetween(a.startDate, now) <= withinDays,
  );
}
