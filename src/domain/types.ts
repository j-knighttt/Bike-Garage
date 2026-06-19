/**
 * Core domain model for the Bike Garage app.
 *
 * The model is intentionally framework-agnostic (no React / storage concerns)
 * so the wear & maintenance engine can be unit-tested in isolation.
 */

/** How experienced the rider is at doing their own maintenance. */
export type RiderLevel = 'beginner' | 'intermediate' | 'pro';

/**
 * The kind of component. Drives default lifespans, service actions and how
 * difficult a job is to do yourself (see componentCatalog.ts).
 */
export type ComponentCategory =
  | 'chain'
  | 'cassette'
  | 'chainrings'
  | 'tireFront'
  | 'tireRear'
  | 'brakePadsFront'
  | 'brakePadsRear'
  | 'brakeRotors'
  | 'brakeFluid'
  | 'shiftCables'
  | 'bottomBracket'
  | 'headsetBearings'
  | 'wheelBearings'
  | 'barTape'
  | 'tubelessSealant'
  | 'derailleurHanger'
  | 'suspensionFork';

/** What you ultimately do with a component when it reaches end of life. */
export type ServiceAction = 'replace' | 'inspect' | 'rebuild' | 'bleed' | 'refresh';

/** Whether a component wears out primarily by distance, by time, or both. */
export type WearMetric = 'distance' | 'time' | 'both';

export interface ComponentTemplate {
  category: ComponentCategory;
  displayName: string;
  /** Emoji / icon hint used by the UI. */
  icon: string;
  wearMetric: WearMetric;
  /** Expected lifespan in km for distance-based parts. */
  lifespanKm?: number;
  /** Expected lifespan in months for time-based parts. */
  lifespanMonths?: number;
  action: ServiceAction;
  /**
   * How hard the job is to do yourself, 1 (trivial: lube, clean) ..
   * 5 (specialist tools / safety critical). Compared against rider level to
   * decide DIY vs. workshop.
   */
  diyDifficulty: 1 | 2 | 3 | 4 | 5;
  /** Short, rider-facing hint about the job. */
  hint: string;
}

/**
 * A concrete component fitted to a concrete bike (the "digital twin").
 */
export interface BikeComponent {
  id: string;
  category: ComponentCategory;
  /** Optional custom label, e.g. "Shimano Ultegra CN-HG800". */
  label?: string;
  /**
   * Bike odometer reading (km) at the moment this component was installed.
   * For a used bike the very first components share the bike's starting km.
   */
  installedAtKm: number;
  /** Calendar date the component was installed (ISO string). */
  installedAt: string;
  /**
   * Condition at install time, 0..100 (100 = brand new, 0 = worn out).
   * Lets the user model a *used* bike where parts already have history.
   */
  initialConditionPercent: number;
  /** Optional per-component lifespan override in km (otherwise from catalog). */
  lifespanKmOverride?: number;
  /** Optional per-component lifespan override in months. */
  lifespanMonthsOverride?: number;
}

/**
 * A manufacturer-defined service / warranty checkpoint for the whole bike,
 * e.g. "first inspection after 300 km or 3 months", then "annual service".
 */
export interface ServiceInterval {
  id: string;
  title: string;
  /** Recurs every N km (omit for purely time-based). */
  everyKm?: number;
  /** Recurs every N months (omit for purely distance-based). */
  everyMonths?: number;
  /** One-off checkpoint measured from purchase (e.g. first inspection). */
  oneOff?: boolean;
  /** Last time this interval was completed (ISO date); undefined = never. */
  lastDoneAt?: string;
  /** Bike odometer (km) when last completed. */
  lastDoneAtKm?: number;
  /** Whether skipping voids manufacturer warranty. */
  warrantyRelevant: boolean;
}

export interface Bike {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  type: 'road' | 'gravel' | 'mtb' | 'ebike' | 'commuter';
  /** Date the bike was purchased / acquired (ISO string). */
  purchaseDate?: string;
  /** True if bought used (used to prompt for initial wear states). */
  boughtUsed: boolean;
  /**
   * Total distance ridden, in km. Seeded with the odometer reading at the time
   * the bike was added; grows as Strava activities are synced.
   */
  totalKm: number;
  /** Warranty length in months from purchase (manufacturer). */
  warrantyMonths?: number;
  components: BikeComponent[];
  serviceIntervals: ServiceInterval[];
  /** Strava gear id this bike is mapped to, if any. */
  stravaGearId?: string;
  /** Odometer (km) at the last basic clean — seeded when the bike is added. */
  lastCleanKm?: number;
  /** Odometer (km) at the last drivetrain lube — seeded when the bike is added. */
  lastChainLubeKm?: number;
  /** Odometer (km) at the last professional service/clean. */
  lastProServiceKm?: number;
}

/** A ride pulled from Strava (or demo data). */
export interface RideActivity {
  id: string;
  name: string;
  distanceKm: number;
  movingTimeSec: number;
  /** Total elevation gain in meters. */
  elevationGainM?: number;
  startDate: string;
  /** Strava gear id the ride was logged with, if any. */
  gearId?: string;
  /** Heuristic: was it a wet/dirty ride? Bumps cleaning/lube urgency. */
  wet?: boolean;
}

export type Urgency = 'ok' | 'soon' | 'due' | 'overdue';

/** A single actionable recommendation produced by the engine. */
export interface Recommendation {
  id: string;
  bikeId: string;
  componentId?: string;
  title: string;
  detail: string;
  action: ServiceAction | 'clean' | 'lubricate' | 'service';
  urgency: Urgency;
  /** 0..1 how far through its life the item is (can exceed 1 when overdue). */
  progress: number;
  /** Human-readable "due in" string, e.g. "in 220 km" or "in 3 weeks". */
  dueIn: string;
  /** Whether we suggest the rider does it themselves at their level. */
  diy: boolean;
  /** True if ignoring this could affect manufacturer warranty. */
  warrantyRelevant?: boolean;
  /** Set for manufacturer service items, so "done" can be recorded. */
  serviceIntervalId?: string;
  /** Set for recurring care items, so "done" can be recorded. */
  careKind?: 'clean' | 'lube' | 'pro';
}
