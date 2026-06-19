import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, View } from 'react-native';
import { Booking, BookingStatus } from '../domain/providers';
import { useGarageStore } from '../store/useGarageStore';
import { colors, radius, spacing } from '../theme';
import { Body, Button, Card, Row } from './ui';

const STATUS_LABEL: Record<BookingStatus, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  done: 'Erledigt',
  cancelled: 'Storniert',
};

const STATUS_COLOR: Record<BookingStatus, string> = {
  requested: colors.soon,
  confirmed: colors.ok,
  done: colors.textMuted,
  cancelled: colors.overdue,
};

export function BookingRow({ booking }: { booking: Booking }) {
  const updateStatus = useGarageStore((s) => s.updateBookingStatus);
  const remove = useGarageStore((s) => s.removeBooking);

  return (
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Body style={{ fontWeight: '700', flexShrink: 1 }}>{booking.serviceLabel}</Body>
        <View style={[styles.badge, { borderColor: STATUS_COLOR[booking.status], backgroundColor: STATUS_COLOR[booking.status] + '22' }]}>
          <Body style={{ fontSize: 11, color: STATUS_COLOR[booking.status], fontWeight: '700' }}>
            {STATUS_LABEL[booking.status]}
          </Body>
        </View>
      </Row>
      <Body muted style={{ fontSize: 13 }}>
        {booking.providerName}
        {booking.bikeName ? ` · ${booking.bikeName}` : ''}
      </Body>
      <Row>
        <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
        <Body muted style={{ fontSize: 13 }}>
          Wunschtermin: {new Date(booking.preferredDate).toLocaleDateString('de-DE')}
        </Body>
      </Row>
      <Row style={{ gap: spacing.sm, marginTop: spacing.xs }}>
        {booking.status === 'requested' && (
          <Button title="Erledigt" variant="secondary" onPress={() => updateStatus(booking.id, 'done')} style={{ flex: 1 }} />
        )}
        <Button
          title="Entfernen"
          variant="ghost"
          onPress={() =>
            Alert.alert('Termin entfernen', `„${booking.serviceLabel}" entfernen?`, [
              { text: 'Abbrechen', style: 'cancel' },
              { text: 'Entfernen', style: 'destructive', onPress: () => remove(booking.id) },
            ])
          }
          style={{ flex: 1 }}
        />
      </Row>
    </Card>
  );
}

const styles = {
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
} as const;
