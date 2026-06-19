import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { buildRecommendations, hadRecentWetRide } from '../domain/maintenanceEngine';
import { Bike, RideActivity, RiderLevel } from '../domain/types';

/**
 * Local maintenance reminders.
 *
 * We use on-device scheduled notifications (no server needed):
 *  - a weekly "time for a maintenance check" nudge, and
 *  - an immediate summary whenever there are due/overdue items (e.g. right
 *    after a Strava sync adds kilometers).
 *
 * Remote push would need a backend + Expo push tokens; that's on the roadmap.
 */

// Show notifications even when the app is in the foreground.
// Wrapped defensively: on web / during static export this must never throw.
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch {
  // no-op (e.g. web build)
}

const ANDROID_CHANNEL = 'maintenance';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Ask for permission (and set up the Android channel). Returns granted?. */
export async function ensureNotificationPermission(): Promise<boolean> {
  // Scheduled local reminders are a native-only feature here.
  if (!isNative) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: 'Wartungserinnerungen',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  return status === 'granted';
}

export interface DueSummary {
  total: number;
  lines: string[];
}

/** Count due/overdue items per bike for a notification body. */
export function summarizeDue(
  bikes: Bike[],
  level: RiderLevel,
  activities: RideActivity[],
): DueSummary {
  const wet = hadRecentWetRide(activities);
  const lines: string[] = [];
  let total = 0;
  for (const bike of bikes) {
    const due = buildRecommendations(bike, level, { recentWetRide: wet }).filter(
      (r) => r.urgency === 'due' || r.urgency === 'overdue',
    );
    if (due.length > 0) {
      total += due.length;
      lines.push(`${bike.name}: ${due.length} fällig (z. B. ${due[0].title})`);
    }
  }
  return { total, lines };
}

/**
 * Re-schedule all reminders to reflect the current state. Always clears first
 * so we never pile up duplicates.
 */
export async function syncReminders(
  bikes: Bike[],
  level: RiderLevel,
  activities: RideActivity[],
  enabled: boolean,
): Promise<void> {
  if (!isNative) return; // web can't schedule local notifications
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled || bikes.length === 0) return;

  // Weekly nudge — Monday 18:00 (weekday: 1=Sunday, so Monday = 2).
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚲 Wartungs-Check',
      body: 'Kurzer Blick in die Garage: Steht etwas an deinem Rad an?',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 2,
      hour: 18,
      minute: 0,
    },
  });

  // Immediate summary if something is due right now.
  const summary = summarizeDue(bikes, level, activities);
  if (summary.total > 0) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔧 ${summary.total} Wartung${summary.total === 1 ? '' : 'en'} fällig`,
        body: summary.lines.join('\n'),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
        repeats: false,
      },
    });
  }
}

/** Turn everything off. */
export async function cancelAllReminders(): Promise<void> {
  if (!isNative) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** True on a real device, where scheduled reminders are available. */
export function remindersSupported(): boolean {
  return isNative;
}
