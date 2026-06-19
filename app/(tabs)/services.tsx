import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, Card, H1, H2, Row } from '../../src/components/ui';
import {
  DEMO_PROVIDERS,
  SERVICE_TYPE_LABEL,
  ServiceType,
  sortByDistance,
} from '../../src/domain/providers';
import { useUserLocation } from '../../src/hooks/useUserLocation';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';
import { BookingRow } from '../../src/components/BookingRow';

const FILTERS: ServiceType[] = ['cleaning', 'inspection', 'repair', 'wear', 'wheel', 'suspension'];

export default function ServicesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { location, status, request } = useUserLocation();
  const bookings = useGarageStore((s) => s.bookings);
  const [filter, setFilter] = useState<ServiceType | null>(null);

  const providers = useMemo(() => {
    const sorted = sortByDistance(DEMO_PROVIDERS, location);
    if (!filter) return sorted;
    return sorted.filter((p) => p.services.some((s) => s.type === filter));
  }, [location, filter]);

  const activeBookings = bookings.filter((b) => b.status !== 'cancelled' && b.status !== 'done');

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Werkstatt & Pflege</H1>
      <Body muted>Werkstätten, mobile Mechaniker und Reinigungen – mit Leistungen und Preisen.</Body>

      {/* My appointments */}
      {activeBookings.length > 0 && (
        <>
          <H2 style={{ marginTop: spacing.sm }}>Meine Termine</H2>
          {activeBookings.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </>
      )}

      {/* Location prompt */}
      {status !== 'granted' && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ flexShrink: 1 }}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Body style={{ flexShrink: 1 }}>
                {status === 'denied'
                  ? 'Kein Standortzugriff – Anbieter werden ohne Entfernung gezeigt.'
                  : 'Anbieter nach Entfernung sortieren?'}
              </Body>
            </Row>
            <Button
              title={status === 'loading' ? '…' : 'In der Nähe'}
              variant="secondary"
              onPress={request}
              loading={status === 'loading'}
            />
          </Row>
        </Card>
      )}

      {/* Filter chips */}
      <Row style={{ flexWrap: 'wrap', gap: spacing.sm }}>
        <Chip label="Alle" active={filter === null} onPress={() => setFilter(null)} />
        {FILTERS.map((f) => (
          <Chip key={f} label={SERVICE_TYPE_LABEL[f]} active={filter === f} onPress={() => setFilter(f)} />
        ))}
      </Row>

      {/* Provider list */}
      {providers.map((p) => {
        const minPrice = p.services
          .map((s) => s.priceFromEur)
          .filter((n): n is number => typeof n === 'number')
          .sort((a, b) => a - b)[0];
        return (
          <Card key={p.id} onPress={() => router.push(`/provider/${p.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ flexShrink: 1 }}>
                <Ionicons name={kindIcon(p.kind)} size={20} color={colors.primary} />
                <H2 style={{ flexShrink: 1 }}>{p.name}</H2>
              </Row>
              {p.distanceKm !== undefined && (
                <Body muted>{p.distanceKm < 10 ? p.distanceKm.toFixed(1) : Math.round(p.distanceKm)} km</Body>
              )}
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row>
                <Ionicons name="star" size={14} color={colors.soon} />
                <Body muted style={{ fontSize: 13 }}>
                  {p.rating.toFixed(1)} ({p.reviewCount}) · {p.city}
                </Body>
              </Row>
              {minPrice !== undefined && (
                <Body muted style={{ fontSize: 13 }}>ab {minPrice} €</Body>
              )}
            </Row>
            <Row style={{ flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
              {uniqueTypes(p.services).slice(0, 4).map((t) => (
                <View key={t} style={styles.tag}>
                  <Body style={{ fontSize: 11, color: colors.textMuted }}>{SERVICE_TYPE_LABEL[t]}</Body>
                </View>
              ))}
            </Row>
          </Card>
        );
      })}

      {providers.length === 0 && (
        <Card>
          <Body muted>Keine Anbieter für diesen Filter.</Body>
        </Card>
      )}
    </ScrollView>
  );
}

function uniqueTypes(services: { type: ServiceType }[]): ServiceType[] {
  return Array.from(new Set(services.map((s) => s.type)));
}

function kindIcon(kind: string): keyof typeof Ionicons.glyphMap {
  if (kind === 'mobile') return 'car-outline';
  if (kind === 'cleaning') return 'water-outline';
  return 'storefront-outline';
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Body style={{ color: active ? '#fff' : colors.text, fontWeight: active ? '700' : '400', fontSize: 13 }}>
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
