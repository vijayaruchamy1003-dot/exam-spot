export type AppMode = 'firebase' | 'demo' | 'unconfigured';

export interface FirebasePublicConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const FIREBASE_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

type FirebaseEnvName = (typeof FIREBASE_KEYS)[number];
type EnvSource = Partial<Record<FirebaseEnvName, string | undefined>>;

function trimPublic(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Each EXPO_PUBLIC_ variable is referenced by name. Expo inlines those
 * literals into the Android bundle. A dynamic process.env[name] lookup
 * stays empty on a device.
 */
function bundledFirebaseSettings(): Record<FirebaseEnvName, string> {
  return {
    EXPO_PUBLIC_FIREBASE_API_KEY: trimPublic(process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: trimPublic(process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: trimPublic(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: trimPublic(process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: trimPublic(process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    EXPO_PUBLIC_FIREBASE_APP_ID: trimPublic(process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
  };
}

/** Names of empty public client settings. Values are never returned. */
export function missingFirebaseConfigKeys(source?: EnvSource): string[] {
  if (source) {
    return FIREBASE_KEYS.filter((name) => !trimPublic(source[name]));
  }
  const bundled = bundledFirebaseSettings();
  return FIREBASE_KEYS.filter((name) => !bundled[name]);
}

export function isDemoMode(): boolean {
  return process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
}

export function readFirebasePublicConfig(): FirebasePublicConfig | null {
  const bundled = bundledFirebaseSettings();
  const apiKey = bundled.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = bundled.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = bundled.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = bundled.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = bundled.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = bundled.EXPO_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

/**
 * Demo mode is explicit and local. It wins over a partial Firebase config so a
 * preview build cannot accidentally talk to a half-configured project.
 * Production builds must set EXPO_PUBLIC_DEMO_MODE=false and provide every key.
 */
export function getAppMode(): AppMode {
  if (isDemoMode()) return 'demo';
  if (readFirebasePublicConfig()) return 'firebase';
  return 'unconfigured';
}

export const REQUIRED_FIREBASE_ENV = FIREBASE_KEYS;
