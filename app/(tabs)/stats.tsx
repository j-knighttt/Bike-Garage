import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Card, H1, H2, Row } from '../../src/components/ui';
import { StatBucket, computeStats, formatDuration } from '../../src/domain/stats';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';

type PeriodKey = 'week' | 'month' | 'year' | 'allTime';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: 'Woche' },
  { key: 'month', label: 'Monat' },
  { key: 'year', label: 'Jahr' },
  { key: 'allTime', label: 'Gesamt' },
];

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const activities = useGarageStore((s) => s.activities);
  const bikes = useGarageStore((s) => s.bikes);
  const [period, setPeriod] = useState<PeriodKey>('week');

  const stats = useMemo(() => computeStats(activities), [activities]);
  const bucket = stats[period];
  const maxTrend = Math.max(1, ...stats.weeklyTrend.map((w) => w.distanceKm));

  const totalGarageKm = bikes.reduce((sum, b) => sum + b.totalKm, 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Statistik</H1>

      {activities.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Ionicons name="bar-chart-outline" size={40} color={colors.textMuted} />
          <Body muted style={{ textAlign: 'center', marginTop: spacing.sm }}>
            Noch keine Fahrten. Verbinde Strava oder lade Demo-Fahrten, dann siehst du hier
            Kilometer, Höhenmeter und Trends.
          </Body>
        </Card>
      ) : (
        <>
          {/* Period selector */}
          <Row style={{ gap: spacing.sm }}>
            {PERIODS.map((p) => {
              const active = period === p.key;
              return (
                <Pressable
                  key={p.key}
                  style={[styles.tab, active && styles.tabActive]}
                  onPress={() => setPeriod(p.key)}
                >
                  <Body style={{ color: active ? '#fff' : colors.textMuted, fontWeight: '700' }}>
                    {p.label}
                  </Body>
                </Pressable>
              );
            })}
          </Row>

          {/* Headline metrics for the selected period */}
          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <Metric icon="bicycle" label="Distanz" value={`${bucket.distanceKm.toLocaleString('de-DE')} km`} />
              <Metric icon="trending-up" label="Höhenmeter" value={`${bucket.elevationM.toLocaleString('de-DE')} m`} />
            </Row>
            <View style={styles.divider} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Metric icon="repeat" label="Fahrten" value={`${bucket.rides}`} />
              <Metric icon="time-outline" label="Fahrzeit" value={formatDuration(bucket.movingTimeSec)} />
            </Row>
          </Card>

          {/* Weekly trend mini bar chart */}
          <H2 style={{ marginTop: spacing.sm }}>Wochen-Trend (km)</H2>
          <Card>
            <Row style={{ alignItems: 'flex-end', height: 120, gap: spacing.sm }}>
              {stats.weeklyTrend.map((w, i) => (
                <View key={i} style={styles.barCol}>
                  <Body muted style={{ fontSize: 11 }}>{Math.round(w.distanceKm)}</Body>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(4, (w.distanceKm / maxTrend) * 90),
                        backgroundColor: i === stats.weeklyTrend.length - 1 ? colors.primary : colors.primaryDim,
                      },
                    ]}
                  />
                  <Body muted style={{ fontSize: 11 }}>{w.label}</Body>
                </View>
              ))}
            </Row>
          </Card>

          {/* Highlights */}
          <H2 style={{ marginTop: spacing.sm }}>Highlights</H2>
          <Row style={{ gap: spacing.md }}>
            <Card style={{ flex: 1 }}>
              <Body muted style={{ fontSize: 13 }}>Längste Fahrt</Body>
              <H2>{stats.longestRideKm.toLocaleString('de-DE')} km</H2>
            </Card>
            <Card style={{ flex: 1 }}>
              <Body muted style={{ fontSize: 13 }}>Ø Geschwindigkeit</Body>
              <H2>{stats.avgSpeedKmh.toLocaleString('de-DE')} km/h</H2>
            </Card>
          </Row>

          <Card>
            <Body muted style={{ fontSize: 13 }}>Kilometer in der Garage (alle Räder)</Body>
            <H2>{Math.round(totalGarageKm).toLocaleString('de-DE')} km</H2>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Row>
        <Ionicons name={icon} size={16} color={colors.primary} />
        <Body muted style={{ fontSize: 13 }}>{label}</Body>
      </Row>
      <H2>{value}</H2>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', borderRadius: radius.sm },
});
