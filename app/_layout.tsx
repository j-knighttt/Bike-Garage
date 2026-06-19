import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationsManager } from '../src/components/NotificationsManager';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NotificationsManager />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '800' },
          contentStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bike/add" options={{ title: 'Fahrrad hinzufügen', presentation: 'modal' }} />
        <Stack.Screen name="bike/[id]" options={{ title: 'Fahrrad' }} />
        <Stack.Screen name="provider/[id]" options={{ title: 'Dienstleister' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
