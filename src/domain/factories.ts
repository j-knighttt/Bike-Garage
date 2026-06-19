import { COMPONENT_CATALOG } from './componentCatalog';
import {
  Bike,
  BikeComponent,
  ComponentCategory,
  ServiceInterval,
} from './types';
import { uid } from '../utils/id';

/**
 * Default manufacturer-style service plan. Most road bike brands specify a
 * "first inspection" shortly after purchase plus a recurring annual service.
 */
export function defaultServiceIntervals(): ServiceInterval[] {
  return [
    {
      id: uid('svc-'),
      title: 'Erstinspektion (Einfahr-Check)',
      everyKm: 300,
      everyMonths: 3,
      oneOff: true,
      warrantyRelevant: true,
    },
    {
      id: uid('svc-'),
      title: 'Jahresinspektion',
      everyMonths: 12,
      warrantyRelevant: true,
    },
    {
      id: uid('svc-'),
      title: 'Großer Service',
      everyKm: 5000,
      warrantyRelevant: false,
    },
  ];
}

export interface NewComponentInput {
  category: ComponentCategory;
  label?: string;
  initialConditionPercent?: number;
}

export function makeComponent(
  input: NewComponentInput,
  bikeStartKm: number,
  installedAt: string = new Date().toISOString(),
): BikeComponent {
  return {
    id: uid('cmp-'),
    category: input.category,
    label: input.label,
    installedAtKm: bikeStartKm,
    installedAt,
    initialConditionPercent: input.initialConditionPercent ?? 100,
  };
}

export interface NewBikeInput {
  name: string;
  brand?: string;
  model?: string;
  type?: Bike['type'];
  purchaseDate?: string;
  boughtUsed?: boolean;
  startKm?: number;
  warrantyMonths?: number;
  components?: NewComponentInput[];
  stravaGearId?: string;
}

export function makeBike(input: NewBikeInput): Bike {
  const startKm = Math.max(0, input.startKm ?? 0);
  const installedAt = input.purchaseDate ?? new Date().toISOString();
  const categories =
    input.components?.map((c) => c.category) ?? defaultComponentsFor(input.type);

  const componentInputs: NewComponentInput[] =
    input.components ?? categories.map((category) => ({ category }));

  return {
    id: uid('bike-'),
    name: input.name,
    brand: input.brand,
    model: input.model,
    type: input.type ?? 'road',
    purchaseDate: input.purchaseDate,
    boughtUsed: input.boughtUsed ?? false,
    totalKm: startKm,
    warrantyMonths: input.warrantyMonths ?? 24,
    components: componentInputs.map((c) => makeComponent(c, startKm, installedAt)),
    serviceIntervals: defaultServiceIntervals(),
    stravaGearId: input.stravaGearId,
    lastCleanKm: startKm,
    lastChainLubeKm: startKm,
    lastProServiceKm: startKm,
  };
}

export function defaultComponentsFor(
  type: Bike['type'] = 'road',
): ComponentCategory[] {
  const base: ComponentCategory[] = [
    'chain',
    'cassette',
    'tireFront',
    'tireRear',
    'brakePadsFront',
    'brakePadsRear',
  ];
  if (type === 'road' || type === 'gravel') base.push('barTape');
  if (type === 'mtb') base.push('suspensionFork');
  return base.filter((c) => c in COMPONENT_CATALOG);
}
