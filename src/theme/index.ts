import { Urgency } from '../domain/types';

export const colors = {
  bg: '#0f1115',
  surface: '#171a21',
  surfaceAlt: '#1f242e',
  border: '#2a2f3a',
  text: '#f2f4f8',
  textMuted: '#9aa3b2',
  primary: '#fc4c02', // Strava orange — on-brand for a cycling app
  primaryDim: '#7a2a10',
  ok: '#3ecf8e',
  soon: '#f5c451',
  due: '#f59e42',
  overdue: '#ef4444',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export function urgencyColor(u: Urgency): string {
  switch (u) {
    case 'overdue':
      return colors.overdue;
    case 'due':
      return colors.due;
    case 'soon':
      return colors.soon;
    default:
      return colors.ok;
  }
}

export function urgencyLabel(u: Urgency): string {
  switch (u) {
    case 'overdue':
      return 'Überfällig';
    case 'due':
      return 'Fällig';
    case 'soon':
      return 'Bald';
    default:
      return 'OK';
  }
}
