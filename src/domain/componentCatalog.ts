import { ComponentCategory, ComponentTemplate, RiderLevel } from './types';

/**
 * Realistic default lifespans for common road / gravel components.
 *
 * These are deliberately conservative middle-of-the-road values; the engine
 * lets each component override them, and rider level shifts how early we warn.
 * Sources are typical manufacturer + workshop rules of thumb, not gospel.
 */
export const COMPONENT_CATALOG: Record<ComponentCategory, ComponentTemplate> = {
  chain: {
    category: 'chain',
    displayName: 'Kette',
    icon: '⛓️',
    wearMetric: 'distance',
    lifespanKm: 3500,
    action: 'replace',
    diyDifficulty: 2,
    hint: 'Kettenverschleiß mit Lehre prüfen; rechtzeitig tauschen schont die Kassette.',
  },
  cassette: {
    category: 'cassette',
    displayName: 'Kassette',
    icon: '⚙️',
    wearMetric: 'distance',
    lifespanKm: 10000,
    action: 'replace',
    diyDifficulty: 3,
    hint: 'Hält meist 2–3 Ketten. Springende Gänge sind ein Warnzeichen.',
  },
  chainrings: {
    category: 'chainrings',
    displayName: 'Kettenblätter',
    icon: '🛞',
    wearMetric: 'distance',
    lifespanKm: 20000,
    action: 'replace',
    diyDifficulty: 3,
    hint: 'Haifischzähne deuten auf Verschleiß hin.',
  },
  tireFront: {
    category: 'tireFront',
    displayName: 'Reifen vorne',
    icon: '🛞',
    wearMetric: 'distance',
    lifespanKm: 6000,
    action: 'replace',
    diyDifficulty: 2,
    hint: 'Auf Risse, Schnitte und flaches Profil achten.',
  },
  tireRear: {
    category: 'tireRear',
    displayName: 'Reifen hinten',
    icon: '🛞',
    wearMetric: 'distance',
    lifespanKm: 4000,
    action: 'replace',
    diyDifficulty: 2,
    hint: 'Hinterreifen verschleißt schneller als vorne.',
  },
  brakePadsFront: {
    category: 'brakePadsFront',
    displayName: 'Bremsbeläge vorne',
    icon: '🛑',
    wearMetric: 'distance',
    lifespanKm: 4000,
    action: 'replace',
    diyDifficulty: 3,
    hint: 'Sicherheitsrelevant – Mindeststärke der Beläge beachten.',
  },
  brakePadsRear: {
    category: 'brakePadsRear',
    displayName: 'Bremsbeläge hinten',
    icon: '🛑',
    wearMetric: 'distance',
    lifespanKm: 5000,
    action: 'replace',
    diyDifficulty: 3,
    hint: 'Sicherheitsrelevant – Mindeststärke der Beläge beachten.',
  },
  brakeRotors: {
    category: 'brakeRotors',
    displayName: 'Bremsscheiben',
    icon: '🛑',
    wearMetric: 'distance',
    lifespanKm: 15000,
    action: 'replace',
    diyDifficulty: 3,
    hint: 'Mindestdicke (meist 1,5 mm) per Messschieber prüfen.',
  },
  brakeFluid: {
    category: 'brakeFluid',
    displayName: 'Bremsflüssigkeit / Entlüften',
    icon: '💧',
    wearMetric: 'time',
    lifespanMonths: 18,
    action: 'bleed',
    diyDifficulty: 4,
    hint: 'Schwammiger Druckpunkt? Entlüften nötig.',
  },
  shiftCables: {
    category: 'shiftCables',
    displayName: 'Schaltzüge',
    icon: '🪡',
    wearMetric: 'both',
    lifespanKm: 8000,
    lifespanMonths: 24,
    action: 'replace',
    diyDifficulty: 3,
    hint: 'Bei mechanischer Schaltung: Züge & Außenhüllen erneuern.',
  },
  bottomBracket: {
    category: 'bottomBracket',
    displayName: 'Innenlager',
    icon: '🔩',
    wearMetric: 'distance',
    lifespanKm: 12000,
    action: 'replace',
    diyDifficulty: 4,
    hint: 'Knacken oder Spiel im Tretlager → tauschen.',
  },
  headsetBearings: {
    category: 'headsetBearings',
    displayName: 'Steuersatz-Lager',
    icon: '🔩',
    wearMetric: 'time',
    lifespanMonths: 24,
    action: 'rebuild',
    diyDifficulty: 4,
    hint: 'Reinigen & neu fetten; raues Lenkgefühl beachten.',
  },
  wheelBearings: {
    category: 'wheelBearings',
    displayName: 'Nabenlager',
    icon: '🔩',
    wearMetric: 'distance',
    lifespanKm: 15000,
    action: 'rebuild',
    diyDifficulty: 4,
    hint: 'Spiel im Laufrad prüfen; Lager reinigen/tauschen.',
  },
  barTape: {
    category: 'barTape',
    displayName: 'Lenkerband',
    icon: '🎗️',
    wearMetric: 'time',
    lifespanMonths: 12,
    action: 'replace',
    diyDifficulty: 2,
    hint: 'Komfort & Grip – jährlich erneuern.',
  },
  tubelessSealant: {
    category: 'tubelessSealant',
    displayName: 'Tubeless-Milch',
    icon: '🥛',
    wearMetric: 'time',
    lifespanMonths: 4,
    action: 'refresh',
    diyDifficulty: 2,
    hint: 'Trocknet aus – alle paar Monate nachfüllen.',
  },
  derailleurHanger: {
    category: 'derailleurHanger',
    displayName: 'Schaltauge',
    icon: '🪝',
    wearMetric: 'time',
    lifespanMonths: 36,
    action: 'inspect',
    diyDifficulty: 2,
    hint: 'Auf Verbiegung prüfen; Ersatz bereithalten.',
  },
  suspensionFork: {
    category: 'suspensionFork',
    displayName: 'Federgabel-Service',
    icon: '🪛',
    wearMetric: 'both',
    lifespanKm: 5000,
    lifespanMonths: 12,
    action: 'rebuild',
    diyDifficulty: 5,
    hint: 'Lowers-Service & Dichtungen; meist Fachwerkstatt.',
  },
};

/**
 * Maximum DIY difficulty a rider of a given level should tackle themselves.
 * Above this, the engine recommends a professional workshop.
 */
export const MAX_DIY_DIFFICULTY: Record<RiderLevel, number> = {
  beginner: 1,
  intermediate: 3,
  pro: 5,
};

/**
 * How much earlier (as a fraction of lifespan) we start warning, by level.
 * Beginners get more lead time so they can plan a shop visit.
 */
export const WARN_LEAD_FRACTION: Record<RiderLevel, number> = {
  beginner: 0.25,
  intermediate: 0.15,
  pro: 0.1,
};

export function templateFor(category: ComponentCategory): ComponentTemplate {
  return COMPONENT_CATALOG[category];
}

/** Categories offered by default when creating a typical road bike. */
export const DEFAULT_ROAD_COMPONENTS: ComponentCategory[] = [
  'chain',
  'cassette',
  'tireFront',
  'tireRear',
  'brakePadsFront',
  'brakePadsRear',
  'barTape',
];
