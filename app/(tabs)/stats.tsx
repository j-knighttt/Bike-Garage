import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Card, H1, H2, Row } from '../../src/components/ui';
import { computeStats, formatDuration, percentChange } from '../../src/domain/stats';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';

type PeriodKey = 'week' | 'month' | 'year' | 'allTime';
type Metric = 'distance' | 'elevation';

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
  const [metric, setMetric] = useState<Metric>('distance');

  const stats = useMemo(() => computeStats(activities), [activities]);
  const bucket = stats[period];

  // Comparison vs. the previous comparable period (week / month only).
  const delta = useMemo(() => {
    if (period === 'week') return percentChange(stats.week.distanceKm, stats.prevWeek.distanceKm);
    if (period === 'month') return percentChange(stats.month.distanceKm, stats.prevMonth.distanceKm);
    return null;
  }, [period, stats]);

  const trendValues = stats.weeklyTrend.map((w) =>
    metric === 'distance' ? w.distanceKm : w.elevationM,
  );
  const maxTrend = Math.max(1, ...trendValues);
  const maxBikeKm = Math.max(1, ...bikes.map((b) => b.totalKm));
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
              <Metric_ icon="bicycle" label="Distanz" value={`${bucket.distanceKm.toLocaleString('de-DE')} km`} />
              <Metric_ icon="trending-up" label="Höhenmeter" value={`${bucket.elevationM.toLocaleString('de-DE')} m`} />
            </Row>
            <View style={styles.divider} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Metric_ icon="repeat" label="Fahrten" value={`${bucket.rides}`} />
              <Metric_ icon="time-outline" label="Fahrzeit" value={formatDuration(bucket.movingTimeSec)} />
            </Row>
            {delta !== null && (
              <>
                <View style={styles.divider} />
                <Row>
                  <Ionicons
                    name={delta >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={delta >= 0 ? colors.ok : colors.due}
                  />
                  <Body style={{ color: delta >= 0 ? colors.ok : colors.due, fontWeight: '700' }}>
                    {delta >= 0 ? '+' : ''}{delta}%
                  </Body>
                  <Body muted>vs. {period === 'week' ? 'letzte Woche' : 'letzter Monat'}</Body>
                </Row>
              </>
            )}
          </Card>

          {/* Trend chart with metric toggle */}
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>Wochen-Trend</H2>
            <Row style={{ gap: spacing.xs }}>
              <Toggle label="km" active={metric === 'distance'} onPress={() => setMetric('distance')} />
              <Toggle label="Hm" active={metric === 'elevation'} onPress={() => setMetric('elevation')} />
            </Row>
          </Row>
          <Card>
            <Row style={{ alignItems: 'flex-end', height: 120, gap: spacing.sm }}>
              {stats.weeklyTrend.map((w, i) => {
                const value = metric === 'distance' ? w.distanceKm : w.elevationM;
                return (
                  <View key={i} style={styles.barCol}>
                    <Body muted style={{ fontSize: 11 }}>{Math.round(value)}</Body>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(4, (value / maxTrend) * 90),
                          backgroundColor: i === stats.weeklyTrend.length - 1 ? colors.primary : colors.primaryDim,
                        },
                      ]}
                    />
                    <Body muted style={{ fontSize: 11 }}>{w.label}</Body>
                  </View>
                );
              })}
            </Row>
            <Body muted style={{ fontSize: 12, textAlign: 'center' }}>
              {metric === 'distance' ? 'Kilometer pro Woche' : 'Höhenmeter pro Woche'}
            </Body>
          </Card>

          {/* Per-bike breakdown */}
          {bikes.length > 0 && (
            <>
              <H2 style={{ marginTop: spacing.sm }}>Pro Fahrrad</H2>
              <Card>
                {bikes.map((b, i) => (
                  <View key={b.id} style={{ gap: 4, marginTop: i === 0 ? 0 : spacing.md }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Body style={{ fontWeight: '700' }}>{b.name}</Body>
                      <Body muted>{Math.round(b.totalKm).toLocaleString('de-DE')} km</Body>
                    </Row>
                    <View style={styles.track}>
                      <View style={[styles.trackFill, { width: `${Math.round((b.totalKm / maxBikeKm) * 100)}%` }]} />
                    </View>
                  </View>
                ))}
              </Card>
            </>
          )}

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

function Metric_({
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

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.toggle, active && styles.tabActive]}>
      <Body style={{ color: active ? '#fff' : colors.textMuted, fontWeight: '700', fontSize: 13 }}>
        {label}
      </Body>
    </Pressable>
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
  toggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: { width: '70%', borderRadius: radius.sm },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
});
