import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { StatusBanner } from '@/components/StatusBanner';
import { missingFirebaseConfigKeys } from '@/config/env';
import { SessionProvider, useSession } from '@/services/session/SessionProvider';
import { colors } from '@/theme/colors';

function Gate() {
  const { status } = useSession();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading' || status === 'unconfigured') return;
    const inApp = segments[0] === '(teacher)';
    if (status === 'signed-in' && !inApp) router.replace('/');
    if (status === 'signed-out' && inApp) router.replace('/login');
  }, [router, segments, status]);

  if (status === 'unconfigured') return <ConfigMissing />;
  if (status === 'loading') return <LoadingScreen label="Checking your session" />;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(teacher)" />
    </Stack>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.teal} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function ConfigMissing() {
  return (
    <View style={styles.config}>
      <StatusBar style="dark" />
      <Text style={styles.configTitle}>Firebase configuration is required</Text>
      <StatusBanner
        tone="error"
        title="Allocation data is unavailable"
        detail="This build did not receive the Firebase client settings. Local Expo reads them from .env. An EAS preview APK needs the same EXPO_PUBLIC_FIREBASE_* variables in the preview environment."
      />
      <Text style={styles.configBody}>
        Add these public client settings to a local .env file, then restart Expo. Client settings are not a substitute for Firestore Security Rules.
      </Text>
      {missingFirebaseConfigKeys().map((key) => (
        <Text key={key} style={styles.envKey}>
          {key}
        </Text>
      ))}
      <Text style={styles.configBody}>For a local interface preview only, set EXPO_PUBLIC_DEMO_MODE=true. Demo data stays on this device.</Text>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: { color: colors.muted, fontSize: 16 },
  config: { flex: 1, backgroundColor: colors.background, padding: 24, gap: 12, justifyContent: 'center' },
  configTitle: { color: colors.navy, fontSize: 26, fontWeight: '800' },
  configBody: { color: colors.text, fontSize: 15, lineHeight: 22 },
  envKey: { color: colors.navy, fontFamily: 'monospace', fontSize: 13 },
});
