import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, Card, H1, H2, Row } from '../../src/components/ui';
import {
  DEMO_PROVIDERS,
  OfferedService,
  SERVICE_TYPE_LABEL,
  formatPrice,
} from '../../src/domain/providers';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';

export default function ProviderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const provider = DEMO_PROVIDERS.find((p) => p.id === id);
  const bikes = useGarageStore((s) => s.bikes);
  const addBooking = useGarageStore((s) => s.addBooking);

  if (!provider) {
    return (
      <View style={[styles.screen, { padding: spacing.lg }]}>
        <Body muted>Anbieter nicht gefunden.</Body>
      </View>
    );
  }

  const open = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('Konnte nicht öffnen', url));
  };

  const requestBooking = (service: OfferedService) => {
    const bike = bikes[0];
    const preferred = new Date(Date.now() + 3 * 86400000); // default: in 3 days
    addBooking({
      providerId: provider.id,
      providerName: provider.name,
      serviceLabel: service.label,
      serviceType: service.type,
      bikeId: bike?.id,
      bikeName: bike?.name,
      preferredDate: preferred.toISOString(),
    });
    Alert.alert(
      'Termin angefragt',
      `„${service.label}" bei ${provider.name}. Du findest die Anfrage unter „Meine Termine".`,
      [
        provider.bookingUrl
          ? { text: 'Online buchen', onPress: () => open(provider.bookingUrl) }
          : provider.phone
            ? { text: 'Anrufen', onPress: () => open(`tel:${provider.phone}`) }
            : { text: 'OK' },
        { text: 'Schließen', style: 'cancel' },
      ],
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: provider.name }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
      >
        <Card>
          <H1>{provider.name}</H1>
          <Row>
            <Ionicons name="star" size={16} color={colors.soon} />
            <Body muted>{provider.rating.toFixed(1)} ({provider.reviewCount} Bewertungen)</Body>
          </Row>
          <Body muted>{provider.street}, {provider.city}</Body>
          {provider.openingHours && <Body muted style={{ fontSize: 13 }}>{provider.openingHours}</Body>}

          <Row style={{ gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' }}>
            {provider.phone && (
              <Button title="Anrufen" variant="secondary" onPress={() => open(`tel:${provider.phone}`)} />
            )}
            <Button
              title="Route"
              variant="secondary"
              onPress={() => open(`https://maps.apple.com/?q=${provider.lat},${provider.lng}`)}
            />
            {provider.website && (
              <Button title="Website" variant="secondary" onPress={() => open(provider.website)} />
            )}
          </Row>
        </Card>

        <H2>Leistungen & Preise</H2>
        {provider.services.map((s, i) => (
          <Card key={i}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Body style={{ fontWeight: '700', flexShrink: 1 }}>{s.label}</Body>
              <Body style={{ color: colors.primary, fontWeight: '700' }}>{formatPrice(s)}</Body>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={styles.tag}>
                <Body style={{ fontSize: 11, color: colors.textMuted }}>{SERVICE_TYPE_LABEL[s.type]}</Body>
              </View>
              {s.durationMin && (
                <Body muted style={{ fontSize: 13 }}>ca. {s.durationMin} Min.</Body>
              )}
            </Row>
            <Button title="Termin anfragen" onPress={() => requestBooking(s)} style={{ marginTop: spacing.xs }} />
          </Card>
        ))}

        <Body muted style={{ fontSize: 12, textAlign: 'center', marginTop: spacing.sm }}>
          Preise sind Richtwerte der Anbieter und können je nach Zustand abweichen.
        </Body>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  tag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
