import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecommendationCard } from '../../src/components/RecommendationCard';
import { Body, Card, H1 } from '../../src/components/ui';
import { buildRecommendations, hadRecentWetRide } from '../../src/domain/maintenanceEngine';
import { Recommendation } from '../../src/domain/types';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, spacing } from '../../src/theme';

export default function MaintenanceScreen() {
  const insets = useSafeAreaInsets();
  const bikes = useGarageStore((s) => s.bikes);
  const level = useGarageStore((s) => s.level);
  const activities = useGarageStore((s) => s.activities);

  const items = useMemo(() => {
    const wet = hadRecentWetRide(activities);
    const all: { rec: Recommendation; bikeName: string }[] = [];
    for (const bike of bikes) {
      for (const rec of buildRecommendations(bike, level, { recentWetRide: wet })) {
        all.push({ rec, bikeName: bike.name });
      }
    }
    // Hide items that are still far away to keep the list focused.
    const focused = all.filter((i) => i.rec.urgency !== 'ok');
    const order = { overdue: 0, due: 1, soon: 2, ok: 3 } as const;
    focused.sort((a, b) => order[a.rec.urgency] - order[b.rec.urgency] || b.rec.progress - a.rec.progress);
    return focused;
  }, [bikes, level, activities]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Wartung</H1>
      <Body muted>
        Empfehlungen aus deinen gefahrenen Kilometern, dem Verschleißzustand und deinem Level
        ({levelLabel(level)}).
      </Body>

      {bikes.length === 0 && (
        <Card>
          <Body muted>Noch kein Fahrrad angelegt. Starte in der Garage.</Body>
        </Card>
      )}

      {bikes.length > 0 && items.length === 0 && (
        <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
          <Body style={{ color: colors.ok, fontWeight: '700' }}>Alles im grünen Bereich 🎉</Body>
          <Body muted style={{ textAlign: 'center', marginTop: spacing.xs }}>
            Fahr ein paar Kilometer – wir melden uns, wenn etwas ansteht.
          </Body>
        </Card>
      )}

      {items.map(({ rec, bikeName }) => (
        <RecommendationCard key={rec.id} rec={rec} bikeName={bikes.length > 1 ? bikeName : undefined} />
      ))}
    </ScrollView>
  );
}

function levelLabel(level: string): string {
  return level === 'beginner' ? 'Anfänger' : level === 'intermediate' ? 'Fortgeschritten' : 'Profi';
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
