import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { makeBike, NewBikeInput, NewComponentInput, makeComponent } from '../domain/factories';
import { Booking, BookingStatus } from '../domain/providers';
import {
  assignUnassignedByGear,
  distributeRides,
  moveRideToBike,
} from '../domain/rideAssignment';
import { Bike, RideActivity, RiderLevel } from '../domain/types';
import { uid } from '../utils/id';

export interface StravaState {
  connected: boolean;
  /** True when running on demo data instead of a real Strava account. */
  demo?: boolean;
  athleteName?: string;
  lastSyncAt?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Epoch seconds when the access token expires. */
  expiresAt?: number;
}

interface GarageState {
  hydrated: boolean;
  level: RiderLevel;
  bikes: Bike[];
  activities: RideActivity[];
  processedRideIds: string[];
  strava: StravaState;
  bookings: Booking[];
  /** Bike that unmatched rides are assigned to (when more than one bike). */
  defaultBikeId?: string;
  /** Whether local maintenance reminders are switched on. */
  notificationsEnabled: boolean;

  setLevel: (level: RiderLevel) => void;
  setDefaultBike: (bikeId?: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;

  /** Link a Strava gear id to a bike and retro-assign its unassigned rides. */
  setBikeStravaGear: (bikeId: string, gearId?: string) => void;
  /** Assign / move a single stored ride to a bike. */
  assignRideToBike: (rideId: string, bikeId: string) => void;

  addBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'status'>) => Booking;
  updateBookingStatus: (id: string, status: BookingStatus) => void;
  removeBooking: (id: string) => void;

  addBike: (input: NewBikeInput) => Bike;
  updateBike: (id: string, patch: Partial<Bike>) => void;
  removeBike: (id: string) => void;

  addComponent: (bikeId: string, input: NewComponentInput) => void;
  /** Reset a component to "new" at the current odometer reading. */
  replaceComponent: (bikeId: string, componentId: string) => void;
  removeComponent: (bikeId: string, componentId: string) => void;

  markCareDone: (bikeId: string, kind: 'clean' | 'lube' | 'pro') => void;
  markServiceDone: (bikeId: string, intervalId: string) => void;

  setStrava: (strava: Partial<StravaState>) => void;
  /** Apply newly fetched rides: bump odometers, de-duplicating by ride id. */
  applyActivities: (rides: RideActivity[]) => void;
  /** Manually add km to a bike (e.g. without Strava). */
  addManualKm: (bikeId: string, km: number) => void;
}

export const useGarageStore = create<GarageState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      level: 'beginner',
      bikes: [],
      activities: [],
      processedRideIds: [],
      strava: { connected: false },
      bookings: [],
      defaultBikeId: undefined,
      notificationsEnabled: false,

      setLevel: (level) => set({ level }),
      setDefaultBike: (bikeId) => set({ defaultBikeId: bikeId }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setBikeStravaGear: (bikeId, gearId) =>
        set((s) => {
          const bikes = s.bikes.map((b) =>
            b.id === bikeId ? { ...b, stravaGearId: gearId } : b,
          );
          if (!gearId) return { bikes };
          const moved = assignUnassignedByGear(bikes, s.activities, gearId, bikeId);
          return { bikes: moved.bikes, activities: moved.activities };
        }),

      assignRideToBike: (rideId, bikeId) =>
        set((s) => moveRideToBike(s.bikes, s.activities, rideId, bikeId)),

      addBooking: (input) => {
        const booking: Booking = {
          ...input,
          id: uid('book-'),
          status: 'requested',
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ bookings: [booking, ...s.bookings] }));
        return booking;
      },

      updateBookingStatus: (id, status) =>
        set((s) => ({
          bookings: s.bookings.map((b) => (b.id === id ? { ...b, status } : b)),
        })),

      removeBooking: (id) =>
        set((s) => ({ bookings: s.bookings.filter((b) => b.id !== id) })),

      addBike: (input) => {
        const bike = makeBike(input);
        set((s) => ({ bikes: [...s.bikes, bike] }));
        return bike;
      },

      updateBike: (id, patch) =>
        set((s) => ({
          bikes: s.bikes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBike: (id) =>
        set((s) => ({ bikes: s.bikes.filter((b) => b.id !== id) })),

      addComponent: (bikeId, input) =>
        set((s) => ({
          bikes: s.bikes.map((b) =>
            b.id === bikeId
              ? { ...b, components: [...b.components, makeComponent(input, b.totalKm)] }
              : b,
          ),
        })),

      replaceComponent: (bikeId, componentId) =>
        set((s) => ({
          bikes: s.bikes.map((b) =>
            b.id === bikeId
              ? {
                  ...b,
                  components: b.components.map((c) =>
                    c.id === componentId
                      ? {
                          ...c,
                          installedAtKm: b.totalKm,
                          installedAt: new Date().toISOString(),
                          initialConditionPercent: 100,
                        }
                      : c,
                  ),
                }
              : b,
          ),
        })),

      removeComponent: (bikeId, componentId) =>
        set((s) => ({
          bikes: s.bikes.map((b) =>
            b.id === bikeId
              ? { ...b, components: b.components.filter((c) => c.id !== componentId) }
              : b,
          ),
        })),

      markCareDone: (bikeId, kind) =>
        set((s) => ({
          bikes: s.bikes.map((b) => {
            if (b.id !== bikeId) return b;
            if (kind === 'clean') return { ...b, lastCleanKm: b.totalKm };
            if (kind === 'lube') return { ...b, lastChainLubeKm: b.totalKm };
            return { ...b, lastProServiceKm: b.totalKm, lastCleanKm: b.totalKm };
          }),
        })),

      markServiceDone: (bikeId, intervalId) =>
        set((s) => ({
          bikes: s.bikes.map((b) =>
            b.id === bikeId
              ? {
                  ...b,
                  serviceIntervals: b.serviceIntervals.map((i) =>
                    i.id === intervalId
                      ? {
                          ...i,
                          lastDoneAt: new Date().toISOString(),
                          lastDoneAtKm: b.totalKm,
                        }
                      : i,
                  ),
                }
              : b,
          ),
        })),

      setStrava: (strava) =>
        set((s) => ({ strava: { ...s.strava, ...strava } })),

      applyActivities: (rides) => {
        const { processedRideIds } = get();
        const fresh = rides.filter((r) => !processedRideIds.includes(r.id));
        if (fresh.length === 0) {
          set({ strava: { ...get().strava, lastSyncAt: new Date().toISOString() } });
          return;
        }
        set((s) => {
          const { bikes, rides: tagged } = distributeRides(s.bikes, fresh, s.defaultBikeId);
          return {
            bikes,
            activities: [...tagged, ...s.activities].slice(0, 200),
            processedRideIds: [...s.processedRideIds, ...fresh.map((r) => r.id)].slice(-1000),
            strava: { ...s.strava, lastSyncAt: new Date().toISOString() },
          };
        });
      },

      addManualKm: (bikeId, km) => {
        if (km <= 0) return;
        const ride: RideActivity = {
          id: uid('manual-'),
          name: 'Manuell erfasst',
          distanceKm: km,
          movingTimeSec: 0,
          startDate: new Date().toISOString(),
          bikeId,
        };
        set((s) => ({
          bikes: s.bikes.map((b) =>
            b.id === bikeId ? { ...b, totalKm: round1(b.totalKm + km) } : b,
          ),
          activities: [ride, ...s.activities].slice(0, 200),
        }));
      },
    }),
    {
      name: 'bike-garage-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Don't persist the transient `hydrated` flag.
      partialize: ({ hydrated, ...rest }) => rest,
    },
  ),
);

// Flip the `hydrated` flag once persisted state has been restored, so the UI
// can show a splash/loading state instead of an empty garage on cold start.
useGarageStore.persist.onFinishHydration(() => {
  useGarageStore.setState({ hydrated: true });
});
if (useGarageStore.persist.hasHydrated()) {
  useGarageStore.setState({ hydrated: true });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
