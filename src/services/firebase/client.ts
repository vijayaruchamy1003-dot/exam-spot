import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { Platform } from 'react-native';
import { readFirebasePublicConfig } from '@/config/env';
import { AppError } from '@/utils/errors';

let auth: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  const config = readFirebasePublicConfig();
  if (!config) {
    throw new AppError('Firebase configuration is missing. The app will not load allocation data.', 'unconfigured');
  }
  if (getApps().length > 0) return getApp();
  return initializeApp(config);
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  const app = getFirebaseApp();
  if (Platform.OS === 'web') {
    auth = getAuth(app);
    return auth;
  }
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
  return auth;
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}
