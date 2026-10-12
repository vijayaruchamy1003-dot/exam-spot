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

function readEnv(name: (typeof FIREBASE_KEYS)[number]): string {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function isDemoMode(): boolean {
  return process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
}

export function readFirebasePublicConfig(): FirebasePublicConfig | null {
  const apiKey = readEnv('EXPO_PUBLIC_FIREBASE_API_KEY');
  const authDomain = readEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  const projectId = readEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  const storageBucket = readEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = readEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  const appId = readEnv('EXPO_PUBLIC_FIREBASE_APP_ID');
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
