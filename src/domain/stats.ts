import { RideActivity } from './types';

export interface StatBucket {
  rides: number;
  distanceKm: number;
  elevationM: number;
  movingTimeSec: number;
}

export interface RideStats {
  week: StatBucket;
  month: StatBucket;
  year: StatBucket;
  allTime: StatBucket;
  /** Same period, one step back — for "vs. last week/month" comparisons. */
  prevWeek: StatBucket;
  prevMonth: StatBucket;
  /** Distance + elevation per ISO week for recent weeks (oldest → newest). */
  weeklyTrend: { label: string; distanceKm: number; elevationM: number }[];
  longestRideKm: number;
  avgSpeedKmh: number;
}

const empty = (): StatBucket => ({ rides: 0, distanceKm: 0, elevationM: 0, movingTimeSec: 0 });

function add(bucket: StatBucket, ride: RideActivity): void {
  bucket.rides += 1;
  bucket.distanceKm += ride.distanceKm;
  bucket.elevationM += ride.elevationGainM ?? 0;
  bucket.movingTimeSec += ride.movingTimeSec;
}

/** Monday-based start of the ISO week containing `d`. */
function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = (date.getDay() + 6) % 7; // 0 = Monday
  date.setDate(date.getDate() - day);
  return date;
}

export function computeStats(
  activities: RideActivity[],
  now: Date = new Date(),
  weeksOfTrend = 8,
): RideStats {
  const week = empty();
  const month = empty();
  const year = empty();
  const allTime = empty();
  const prevWeek = empty();
  const prevMonth = empty();

  const weekStart = startOfWeek(now).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const yearStart = new Date(now.getFullYear(), 0, 1).getTime();
  const MS_WEEK = 7 * 86400000;
  const prevWeekStart = weekStart - MS_WEEK;
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();

  // Buckets for the weekly trend (index 0 = current week).
  const trendDist: number[] = new Array(weeksOfTrend).fill(0);
  const trendElev: number[] = new Array(weeksOfTrend).fill(0);
  const currentWeekStart = weekStart;

  let longestRideKm = 0;

  for (const ride of activities) {
    const t = new Date(ride.startDate).getTime();
    if (Number.isNaN(t)) continue;
    add(allTime, ride);
    if (t >= yearStart) add(year, ride);
    if (t >= monthStart) add(month, ride);
    else if (t >= prevMonthStart) add(prevMonth, ride);
    if (t >= weekStart) add(week, ride);
    else if (t >= prevWeekStart) add(prevWeek, ride);
    if (ride.distanceKm > longestRideKm) longestRideKm = ride.distanceKm;

    const weeksAgo = Math.floor((currentWeekStart - startOfWeek(new Date(t)).getTime()) / MS_WEEK);
    if (weeksAgo >= 0 && weeksAgo < weeksOfTrend) {
      trendDist[weeksAgo] += ride.distanceKm;
      trendElev[weeksAgo] += ride.elevationGainM ?? 0;
    }
  }

  const weeklyTrend = trendDist
    .map((distanceKm, i) => ({
      label: i === 0 ? 'Diese' : `−${i}`,
      distanceKm: round1(distanceKm),
      elevationM: Math.round(trendElev[i]),
    }))
    .reverse();

  const avgSpeedKmh =
    allTime.movingTimeSec > 0 ? (allTime.distanceKm / allTime.movingTimeSec) * 3600 : 0;

  return {
    week: roundBucket(week),
    month: roundBucket(month),
    year: roundBucket(year),
    allTime: roundBucket(allTime),
    prevWeek: roundBucket(prevWeek),
    prevMonth: roundBucket(prevMonth),
    weeklyTrend,
    longestRideKm: round1(longestRideKm),
    avgSpeedKmh: Math.round(avgSpeedKmh * 10) / 10,
  };
}

/** Signed percentage change from `prev` to `current` (e.g. +23, -10). null if no baseline. */
export function percentChange(current: number, prev: number): number | null {
  if (prev <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - prev) / prev) * 100);
}

function roundBucket(b: StatBucket): StatBucket {
  return {
    rides: b.rides,
    distanceKm: round1(b.distanceKm),
    elevationM: Math.round(b.elevationM),
    movingTimeSec: Math.round(b.movingTimeSec),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Format seconds as "3h 12m" / "48m". */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}
