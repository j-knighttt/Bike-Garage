import { useEffect } from 'react';
import { syncReminders } from '../services/notifications';
import { useGarageStore } from '../store/useGarageStore';

/**
 * Headless component: keeps the scheduled maintenance reminders in sync with
 * the current garage state. Re-runs whenever the bikes, rider level, activities
 * or the enabled flag change (e.g. after a Strava sync bumps kilometers).
 */
export function NotificationsManager() {
  const enabled = useGarageStore((s) => s.notificationsEnabled);
  const hydrated = useGarageStore((s) => s.hydrated);
  const bikes = useGarageStore((s) => s.bikes);
  const level = useGarageStore((s) => s.level);
  const activities = useGarageStore((s) => s.activities);

  useEffect(() => {
    if (!hydrated || !enabled) return;
    // Fire and forget; failures here must never crash the UI.
    syncReminders(bikes, level, activities, enabled).catch(() => {});
  }, [hydrated, enabled, bikes, level, activities]);

  return null;
}
