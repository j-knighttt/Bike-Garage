import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RecommendationCard } from '../../src/components/RecommendationCard';
import { Body, Button, Card, H1, H2, Row, WearBar } from '../../src/components/ui';
import { COMPONENT_CATALOG } from '../../src/domain/componentCatalog';
import {
  buildRecommendations,
  computeWear,
  hadRecentWetRide,
} from '../../src/domain/maintenanceEngine';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';

export default function BikeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bike = useGarageStore((s) => s.bikes.find((b) => b.id === id));
  const level = useGarageStore((s) => s.level);
  const activities = useGarageStore((s) => s.activities);
  const replaceComponent = useGarageStore((s) => s.replaceComponent);
  const removeComponent = useGarageStore((s) => s.removeComponent);
  const removeBike = useGarageStore((s) => s.removeBike);
  const addManualKm = useGarageStore((s) => s.addManualKm);
  const [kmInput, setKmInput] = useState('');

  if (!bike) {
    return (
      <View style={[styles.screen, { padding: spacing.lg }]}>
        <Body muted>Fahrrad nicht gefunden.</Body>
      </View>
    );
  }

  const wet = hadRecentWetRide(activities);
  const recs = buildRecommendations(bike, level, { recentWetRide: wet }).filter(
    (r) => r.urgency !== 'ok',
  );
  const now = new Date();

  const confirmDelete = () => {
    Alert.alert('Fahrrad löschen', `„${bike.name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: () => {
          removeBike(bike.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: bike.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
      >
        <Card>
          <H1>{bike.name}</H1>
          <Body muted>
            {[bike.brand, bike.model].filter(Boolean).join(' ') || typeLabel(bike.type)}
            {bike.boughtUsed ? ' · gebraucht' : ''}
          </Body>
          <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
            <View>
              <Body muted style={{ fontSize: 13 }}>Gesamtkilometer</Body>
              <H2>{Math.round(bike.totalKm).toLocaleString('de-DE')} km</H2>
            </View>
            {bike.warrantyMonths && bike.purchaseDate && (
              <View style={{ alignItems: 'flex-end' }}>
                <Body muted style={{ fontSize: 13 }}>Garantie</Body>
                <Body>{warrantyRemaining(bike.purchaseDate, bike.warrantyMonths)}</Body>
              </View>
            )}
          </Row>
        </Card>

        {/* Manual km entry (for rides not on Strava) */}
        <Card>
          <H2>Kilometer nachtragen</H2>
          <Body muted style={{ fontSize: 13 }}>Ohne Strava? Trage Kilometer manuell nach.</Body>
          <Row>
            <TextInput
              value={kmInput}
              onChangeText={setKmInput}
              placeholder="z. B. 45"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={styles.input}
            />
            <Button
              title="+ km"
              variant="secondary"
              onPress={() => {
                const km = parseFloat(kmInput.replace(',', '.'));
                if (!Number.isNaN(km) && km > 0) addManualKm(bike.id, km);
                setKmInput('');
              }}
            />
          </Row>
        </Card>

        {recs.length > 0 && (
          <>
            <H2 style={{ marginTop: spacing.sm }}>Jetzt dran</H2>
            {recs.map((rec) => (
              <RecommendationCard key={rec.id} rec={rec} />
            ))}
          </>
        )}

        {/* Digital twin: component list */}
        <H2 style={{ marginTop: spacing.sm }}>Komponenten</H2>
        {bike.components.map((c) => {
          const tpl = COMPONENT_CATALOG[c.category];
          const wear = computeWear(bike, c, now);
          const remainingPct = Math.max(0, Math.round((1 - wear.fraction) * 100));
          return (
            <Card key={c.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row>
                  <Body style={{ fontSize: 18 }}>{tpl.icon}</Body>
                  <Body style={{ fontWeight: '700' }}>{c.label ?? tpl.displayName}</Body>
                </Row>
                <Body muted>{remainingPct}% Rest</Body>
              </Row>
              <WearBar progress={wear.fraction} />
              <Row style={{ justifyContent: 'space-between' }}>
                <Body muted style={{ fontSize: 13 }}>
                  {wear.remainingKm !== null && wear.remainingKm > 0
                    ? `noch ~${Math.round(wear.remainingKm).toLocaleString('de-DE')} km`
                    : wear.remainingMonths !== null && wear.remainingMonths > 0
                      ? `noch ~${Math.round(wear.remainingMonths)} Monate`
                      : 'Wechsel empfohlen'}
                </Body>
                <Row>
                  <Button title="Getauscht" variant="secondary" onPress={() => replaceComponent(bike.id, c.id)} />
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.textMuted}
                    onPress={() =>
                      Alert.alert('Komponente entfernen', `${tpl.displayName} entfernen?`, [
                        { text: 'Abbrechen', style: 'cancel' },
                        { text: 'Entfernen', style: 'destructive', onPress: () => removeComponent(bike.id, c.id) },
                      ])
                    }
                  />
                </Row>
              </Row>
            </Card>
          );
        })}

        {/* Manufacturer service & warranty */}
        <H2 style={{ marginTop: spacing.sm }}>Hersteller-Service</H2>
        {bike.serviceIntervals.map((i) => (
          <Card key={i.id}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700', flexShrink: 1 }}>{i.title}</Body>
              {i.warrantyRelevant && (
                <View style={styles.warrantyTag}>
                  <Body style={{ fontSize: 11, color: colors.primary }}>Garantie</Body>
                </View>
              )}
            </Row>
            <Body muted style={{ fontSize: 13 }}>
              {[
                i.everyKm ? `alle ${i.everyKm.toLocaleString('de-DE')} km` : null,
                i.everyMonths ? `alle ${i.everyMonths} Monate` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              {i.lastDoneAt ? ` · zuletzt ${new Date(i.lastDoneAt).toLocaleDateString('de-DE')}` : ''}
            </Body>
          </Card>
        ))}

        <Button
          title="+ Komponente hinzufügen"
          variant="secondary"
          onPress={() => router.push(`/bike/add?addComponentTo=${bike.id}`)}
          style={{ marginTop: spacing.sm }}
        />

        <Button title="Fahrrad löschen" variant="ghost" onPress={confirmDelete} />
      </ScrollView>
    </>
  );
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

function warrantyRemaining(purchaseDate: string, months: number): string {
  const end = new Date(purchaseDate);
  end.setMonth(end.getMonth() + months);
  const left = end.getTime() - Date.now();
  if (left <= 0) return 'abgelaufen';
  const monthsLeft = Math.round(left / (1000 * 60 * 60 * 24 * 30.4));
  return monthsLeft >= 12 ? `noch ${Math.round(monthsLeft / 12)} J.` : `noch ${monthsLeft} Mon.`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    color: colors.text,
    fontSize: 16,
  },
  warrantyTag: {
    backgroundColor: colors.primary + '22',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
