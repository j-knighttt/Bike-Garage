import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Body, Card, H1, H2, Row } from '../../src/components/ui';
import { RiderLevel } from '../../src/domain/types';
import {
  cancelAllReminders,
  ensureNotificationPermission,
  remindersSupported,
} from '../../src/services/notifications';
import { useGarageStore } from '../../src/store/useGarageStore';
import { colors, radius, spacing } from '../../src/theme';

const LEVELS: { key: RiderLevel; title: string; desc: string }[] = [
  {
    key: 'beginner',
    title: 'Anfänger',
    desc: 'Du fährst gerne, schraubst aber kaum selbst. Du bekommst frühe Hinweise und klare Empfehlungen, wann das Rad in die Werkstatt sollte.',
  },
  {
    key: 'intermediate',
    title: 'Fortgeschritten',
    desc: 'Kette, Reifen, Beläge wechselst du selbst. Knifflige Dinge wie Lager oder Hydraulik überlässt du dem Profi.',
  },
  {
    key: 'pro',
    title: 'Profi',
    desc: 'Du machst fast alles selbst. Du bekommst nur knappe, späte Erinnerungen und kannst dich auf das Wesentliche verlassen.',
  },
];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const level = useGarageStore((s) => s.level);
  const setLevel = useGarageStore((s) => s.setLevel);
  const bikes = useGarageStore((s) => s.bikes);
  const notificationsEnabled = useGarageStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useGarageStore((s) => s.setNotificationsEnabled);

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      await cancelAllReminders();
      return;
    }
    const granted = await ensureNotificationPermission();
    if (!granted) {
      Alert.alert(
        'Mitteilungen aus',
        'Bitte erlaube Mitteilungen für Bike Garage in den iPhone-Einstellungen, um Wartungserinnerungen zu erhalten.',
      );
      return;
    }
    setNotificationsEnabled(true);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.md }}
    >
      <H1>Profil</H1>
      <Body muted>
        Dein Können bestimmt, wie früh wir warnen und ob wir „selbst machen" oder „Werkstatt"
        empfehlen.
      </Body>

      <H2 style={{ marginTop: spacing.sm }}>Mein Level</H2>
      {LEVELS.map((l) => {
        const active = level === l.key;
        return (
          <Pressable key={l.key} onPress={() => setLevel(l.key)}>
            <Card style={active ? { borderColor: colors.primary } : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Body style={{ fontWeight: '700' }}>{l.title}</Body>
                <Ionicons
                  name={active ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={active ? colors.primary : colors.textMuted}
                />
              </Row>
              <Body muted>{l.desc}</Body>
            </Card>
          </Pressable>
        );
      })}

      <H2 style={{ marginTop: spacing.sm }}>Erinnerungen</H2>
      <Card>
        {remindersSupported() ? (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <Row style={{ flexShrink: 1 }}>
                <Ionicons name="notifications-outline" size={20} color={colors.primary} />
                <Body style={{ fontWeight: '700' }}>Wartungs-Erinnerungen</Body>
              </Row>
              <Pressable onPress={toggleNotifications}>
                <Ionicons
                  name={notificationsEnabled ? 'toggle' : 'toggle-outline'}
                  size={36}
                  color={notificationsEnabled ? colors.primary : colors.textMuted}
                />
              </Pressable>
            </Row>
            <Body muted style={{ fontSize: 13 }}>
              Wöchentlicher Check plus ein Hinweis, sobald nach einer Fahrt etwas fällig wird – als
              Mitteilung direkt aufs iPhone.
            </Body>
          </>
        ) : (
          <>
            <Row style={{ flexShrink: 1 }}>
              <Ionicons name="notifications-off-outline" size={20} color={colors.textMuted} />
              <Body style={{ fontWeight: '700' }}>Erinnerungen</Body>
            </Row>
            <Body muted style={{ fontSize: 13 }}>
              In der Web-Version (Home-Bildschirm-App) öffnest du die App und siehst offene
              Wartungen direkt im Tab „Wartung". Automatische Push-Mitteilungen gibt es in der
              nativen App-Version (später über TestFlight).
            </Body>
          </>
        )}
      </Card>

      <Card style={{ marginTop: spacing.sm }}>
        <H2>Über die App</H2>
        <Body muted>
          Bike Garage verbindet deine Strava-Kilometer mit einem digitalen Zwilling deines Rads,
          rechnet den Verschleiß einzelner Komponenten mit und plant Reinigung, Wartung und
          Hersteller-Service – passend zu deinem Können.
        </Body>
        <View style={{ height: spacing.sm }} />
        <Body muted style={{ fontSize: 13 }}>
          {bikes.length} {bikes.length === 1 ? 'Fahrrad' : 'Fahrräder'} · v0.1
        </Body>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
});
