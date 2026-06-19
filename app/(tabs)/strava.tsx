import { Ionicons } from '@expo/vector-icons';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Button, Card, H1, H2, Row } from '../../src/components/ui';
import {
  STRAVA_DISCOVERY,
  STRAVA_SCOPES,
  StravaGear,
  ensureFreshToken,
  exchangeCode,
  fetchActivities,
  fetchAthleteGear,
  generateDemoRides,
  getClientId,
  isStravaConfigured,
} from '../../src/services/strava';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, spacing } from '../../src/theme';

WebBrowser.maybeCompleteAuthSession();

export default function StravaScreen() {
  const insets = useSafeAreaInsets();
  const strava = useGarageStore((s) => s.strava);
  const activities = useGarageStore((s) => s.activities);
  const bikes = useGarageStore((s) => s.bikes);
  const defaultBikeId = useGarageStore((s) => s.defaultBikeId);
  const setStrava = useGarageStore((s) => s.setStrava);
  const applyActivities = useGarageStore((s) => s.applyActivities);
  const setDefaultBike = useGarageStore((s) => s.setDefaultBike);
  const setBikeStravaGear = useGarageStore((s) => s.setBikeStravaGear);
  const assignRideToBike = useGarageStore((s) => s.assignRideToBike);
  const [busy, setBusy] = useState(false);
  const [gear, setGear] = useState<StravaGear[]>([]);

  const configured = isStravaConfigured();
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'bikegarage' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: getClientId() ?? 'unconfigured',
      scopes: STRAVA_SCOPES,
      redirectUri,
      responseType: 'code',
      extraParams: { approval_prompt: 'auto' },
    },
    STRAVA_DISCOVERY,
  );

  const bikeName = (id?: string) => bikes.find((b) => b.id === id)?.name;

  const pickBike = (title: string, onPick: (bikeId: string) => void) => {
    if (bikes.length === 0) {
      Alert.alert('Kein Fahrrad', 'Lege zuerst ein Fahrrad in der Garage an.');
      return;
    }
    Alert.alert(title, undefined, [
      ...bikes.map((b) => ({ text: b.name, onPress: () => onPick(b.id) })),
      { text: 'Abbrechen', style: 'cancel' as const },
    ]);
  };

  useEffect(() => {
    if (response?.type !== 'success' || !response.params.code) return;
    (async () => {
      try {
        setBusy(true);
        const tokens = await exchangeCode(response.params.code);
        setStrava({
          connected: true,
          demo: false,
          athleteName: tokens.athleteName,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        });
        const [rides, gearList] = await Promise.all([
          fetchActivities(tokens.accessToken),
          fetchAthleteGear(tokens.accessToken).catch(() => []),
        ]);
        setGear(gearList);
        applyActivities(rides);
      } catch (e) {
        Alert.alert('Strava-Fehler', String(e instanceof Error ? e.message : e));
      } finally {
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const onSyncReal = async () => {
    if (!strava.accessToken) return;
    try {
      setBusy(true);
      const token = await ensureFreshToken(strava, (t) =>
        setStrava({
          accessToken: t.accessToken,
          refreshToken: t.refreshToken,
          expiresAt: t.expiresAt,
        }),
      );
      const [rides, gearList] = await Promise.all([
        fetchActivities(token),
        fetchAthleteGear(token).catch(() => []),
      ]);
      setGear(gearList);
      applyActivities(rides);
    } catch (e) {
      Alert.alert('Sync-Fehler', String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  };

  const onDemoSync = () => {
    setStrava({ connected: true, demo: true, athleteName: 'Demo-Fahrer:in' });
    applyActivities(generateDemoRides(4));
  };

  const unassigned = activities.filter((a) => !a.bikeId);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Strava</H1>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row>
            <Ionicons
              name={strava.connected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={strava.connected ? colors.ok : colors.textMuted}
            />
            <H2>{strava.connected ? 'Verbunden' : 'Nicht verbunden'}</H2>
          </Row>
          {strava.demo && <Body muted>Demo</Body>}
        </Row>
        {strava.athleteName && <Body muted>{strava.athleteName}</Body>}
        {strava.lastSyncAt && (
          <Body muted>Letzter Sync: {new Date(strava.lastSyncAt).toLocaleString('de-DE')}</Body>
        )}

        {!strava.connected && configured && (
          <Button
            title="Mit Strava verbinden"
            onPress={() => promptAsync()}
            loading={busy}
            disabled={!request}
            style={{ marginTop: spacing.sm }}
          />
        )}
        {strava.connected && !strava.demo && (
          <Button title="Jetzt synchronisieren" onPress={onSyncReal} loading={busy} style={{ marginTop: spacing.sm }} />
        )}

        {!configured && (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <Body muted>
              Noch keine Strava-Zugangsdaten hinterlegt. Du kannst die App mit Demo-Fahrten
              ausprobieren – die Kilometer fließen echt in deine Wartungsplanung ein.
            </Body>
            <Button title={strava.connected ? 'Weitere Demo-Fahrten' : 'Demo-Fahrten laden'} variant="secondary" onPress={onDemoSync} />
          </View>
        )}
        {configured && (
          <Button title="Demo-Fahrten laden" variant="ghost" onPress={onDemoSync} style={{ marginTop: spacing.xs }} />
        )}
      </Card>

      {/* Default bike for rides that can't be matched automatically */}
      {bikes.length > 1 && (
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ fontWeight: '700', flexShrink: 1 }}>Standard-Fahrrad</Body>
            <Button
              title={bikeName(defaultBikeId) ?? 'Wählen'}
              variant="secondary"
              onPress={() => pickBike('Standard-Fahrrad wählen', setDefaultBike)}
            />
          </Row>
          <Body muted style={{ fontSize: 13 }}>
            Fahrten ohne erkanntes Strava-Rad werden diesem Fahrrad zugeordnet.
          </Body>
        </Card>
      )}

      {/* Map Strava bikes (gear) to garage bikes */}
      {gear.length > 0 && (
        <>
          <H2 style={{ marginTop: spacing.sm }}>Strava-Räder zuordnen</H2>
          {gear.map((g) => {
            const linked = bikes.find((b) => b.stravaGearId === g.id);
            return (
              <Card key={g.id}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Body style={{ fontWeight: '700', flexShrink: 1 }}>{g.name}</Body>
                  <Button
                    title={linked ? linked.name : 'Zuordnen'}
                    variant="secondary"
                    onPress={() =>
                      pickBike(`„${g.name}" zuordnen`, (bikeId) => setBikeStravaGear(bikeId, g.id))
                    }
                  />
                </Row>
                <Body muted style={{ fontSize: 13 }}>{g.distanceKm.toLocaleString('de-DE')} km bei Strava</Body>
              </Card>
            );
          })}
        </>
      )}

      {/* Rides that still need a bike */}
      {unassigned.length > 0 && bikes.length > 0 && (
        <>
          <H2 style={{ marginTop: spacing.sm }}>Nicht zugeordnete Fahrten</H2>
          <Body muted style={{ fontSize: 13 }}>
            Diese Fahrten zählen noch zu keinem Rad. Tippe „Zuordnen".
          </Body>
          {unassigned.slice(0, 20).map((a) => (
            <Card key={a.id}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body style={{ fontWeight: '700', flexShrink: 1 }}>{a.name}</Body>
                <Body>{a.distanceKm.toLocaleString('de-DE')} km</Body>
              </Row>
              <Row style={{ justifyContent: 'space-between', marginTop: spacing.xs }}>
                <Body muted style={{ fontSize: 13 }}>{new Date(a.startDate).toLocaleDateString('de-DE')}</Body>
                <Button
                  title="Zuordnen"
                  variant="secondary"
                  onPress={() => pickBike('Fahrt zuordnen', (bikeId) => assignRideToBike(a.id, bikeId))}
                />
              </Row>
            </Card>
          ))}
        </>
      )}

      <H2 style={{ marginTop: spacing.sm }}>Letzte Fahrten</H2>
      {activities.length === 0 && (
        <Card>
          <Body muted>Noch keine Fahrten. Synchronisiere mit Strava oder lade Demo-Fahrten.</Body>
        </Card>
      )}
      {activities.slice(0, 15).map((a) => (
        <Card key={a.id}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body style={{ fontWeight: '700', flexShrink: 1 }}>{a.name}</Body>
            <Body>{a.distanceKm.toLocaleString('de-DE')} km</Body>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Body muted style={{ fontSize: 13 }}>
              {new Date(a.startDate).toLocaleDateString('de-DE')}
              {a.wet ? ' · nass 🌧️' : ''}
            </Body>
            <Body muted style={{ fontSize: 13 }}>
              {bikeName(a.bikeId) ?? 'nicht zugeordnet'}
            </Body>
          </Row>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
