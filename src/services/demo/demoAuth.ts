import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '@/types/user';
import { AppError } from '@/utils/errors';

const SESSION_KEY = 'erf.demo.session';

export const DEMO_ACCOUNTS: Array<UserProfile & { password: string }> = [
  {
    uid: 'demo-teacher',
    email: 'teacher@school.edu',
    password: 'demo-teacher',
    role: 'teacher',
    displayName: 'Demo Teacher',
  },
  {
    uid: 'demo-admin',
    email: 'admin@school.edu',
    password: 'demo-admin',
    role: 'admin',
    displayName: 'Demo Administrator',
  },
];

export async function signInDemo(email: string, password: string): Promise<UserProfile> {
  const account = DEMO_ACCOUNTS.find((item) => item.email === email.trim() && item.password === password);
  if (!account) {
    throw new AppError('Incorrect email or password.', 'auth');
  }
  const profile: UserProfile = {
    uid: account.uid,
    email: account.email,
    role: account.role,
    displayName: account.displayName,
  };
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(profile));
  return profile;
}

export async function loadDemoSession(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as UserProfile;
    if ((parsed.role !== 'teacher' && parsed.role !== 'admin') || typeof parsed.uid !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function signOutDemo(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}
