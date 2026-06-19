import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, Card, H1, H2, Row, UrgencyBadge } from '../../src/components/ui';
import { bikeHealth, hadRecentWetRide } from '../../src/domain/maintenanceEngine';
import { makeBike } from '../../src/domain/factories';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, spacing } from '../../src/theme';

export default function GarageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hydrated = useGarageStore((s) => s.hydrated);
  const bikes = useGarageStore((s) => s.bikes);
  const level = useGarageStore((s) => s.level);
  const activities = useGarageStore((s) => s.activities);
  const wet = hadRecentWetRide(activities);

  if (!hydrated) {
    return (
      <View style={[styles.screen, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Meine Garage</H1>
      <Body muted>
        {bikes.length === 0
          ? 'Lege dein erstes Fahrrad an und erstelle einen digitalen Zwilling.'
          : `${bikes.length} ${bikes.length === 1 ? 'Fahrrad' : 'Fahrräder'} · Level: ${levelLabel(level)}`}
      </Body>

      {bikes.length === 0 && <EmptyState />}

      {bikes.map((bike) => {
        const health = bikeHealth(bike, level, { recentWetRide: wet });
        return (
          <Card key={bike.id} onPress={() => router.push(`/bike/${bike.id}`)}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row>
                <Ionicons name="bicycle" size={22} color={colors.primary} />
                <H2>{bike.name}</H2>
              </Row>
              <UrgencyBadge urgency={health.worst} />
            </Row>
            <Body muted>
              {[bike.brand, bike.model].filter(Boolean).join(' ') || typeLabel(bike.type)}
            </Body>
            <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
              <Body muted>{Math.round(bike.totalKm).toLocaleString('de-DE')} km gesamt</Body>
              <Body style={{ color: health.actionCount > 0 ? colors.due : colors.ok }}>
                {health.actionCount > 0
                  ? `${health.actionCount} Aufgabe${health.actionCount === 1 ? '' : 'n'} offen`
                  : 'Alles im grünen Bereich'}
              </Body>
            </Row>
          </Card>
        );
      })}

      <Button
        title="+ Fahrrad hinzufügen"
        onPress={() => router.push('/bike/add')}
        style={{ marginTop: spacing.sm }}
      />
      {bikes.length === 0 && <SeedDemoButton />}
    </ScrollView>
  );
}

function EmptyState() {
  return (
    <Card style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <Ionicons name="construct-outline" size={40} color={colors.textMuted} />
      <Body muted style={{ textAlign: 'center' }}>
        Dein digitaler Zwilling hält Verschleiß, Wartung und Hersteller-Service im Blick –
        basierend auf deinen echt gefahrenen Kilometern.
      </Body>
    </Card>
  );
}

function SeedDemoButton() {
  const addBike = useGarageStore((s) => s.addBike);
  const router = useRouter();
  return (
    <Button
      title="Beispiel-Rennrad anlegen"
      variant="secondary"
      onPress={() => {
        // A used road bike with some history, so recommendations show immediately.
        const bike = makeBike({
          name: 'Mein Rennrad',
          brand: 'Canyon',
          model: 'Endurace',
          type: 'road',
          boughtUsed: true,
          startKm: 4200,
          purchaseDate: new Date(Date.now() - 86400000 * 120).toISOString(),
        });
        // makeBike returns a fresh bike; persist via store and tweak wear.
        useGarageStore.setState((s) => ({
          bikes: [
            ...s.bikes,
            {
              ...bike,
              components: bike.components.map((c) =>
                c.category === 'chain'
                  ? { ...c, initialConditionPercent: 35 }
                  : c.category === 'tireRear'
                    ? { ...c, initialConditionPercent: 40 }
                    : c,
              ),
            },
          ],
        }));
        router.push('/bike/' + bike.id);
      }}
    />
  );
}

function levelLabel(level: string): string {
  return level === 'beginner' ? 'Anfänger' : level === 'intermediate' ? 'Fortgeschritten' : 'Profi';
}

function typeLabel(type: string): string {
  const map: Record<string, string> = {
    road: 'Rennrad',
    gravel: 'Gravel',
    mtb: 'Mountainbike',
    ebike: 'E-Bike',
    commuter: 'Stadtrad',
  };
  return map[type] ?? type;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
