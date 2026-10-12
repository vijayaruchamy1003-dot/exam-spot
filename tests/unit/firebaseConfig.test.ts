import { describe, expect, it } from 'vitest';
import { missingFirebaseConfigKeys, readFirebasePublicConfig } from '@/config/env';

describe('Firebase public configuration', () => {
  it('names every missing key and does not return configuration values', () => {
    const missing = missingFirebaseConfigKeys({});
    expect(missing).toEqual([
      'EXPO_PUBLIC_FIREBASE_API_KEY',
      'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
      'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'EXPO_PUBLIC_FIREBASE_APP_ID',
    ]);
    expect(readFirebasePublicConfig()).toBeNull();
  });

  it('accepts a complete public client configuration', () => {
    const source = {
      EXPO_PUBLIC_FIREBASE_API_KEY: 'test-key',
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'example',
      EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
      EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123',
      EXPO_PUBLIC_FIREBASE_APP_ID: '1:123:web:abc',
    };
    expect(missingFirebaseConfigKeys(source)).toEqual([]);
  });
});
