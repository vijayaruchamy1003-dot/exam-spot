import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { getDb, getFirebaseAuth } from '@/services/firebase/client';
import { mapAuthError, mapFirestoreError } from '@/services/firebase/errors';
import type { UserProfile, UserRole } from '@/types/user';
import { AppError } from '@/utils/errors';
import { logInfo } from '@/utils/logger';

function profileFromData(uid: string, email: string, data: Record<string, unknown>): UserProfile | null {
  const role = data.role;
  if (role !== 'teacher' && role !== 'admin') return null;
  return {
    uid,
    email: typeof data.email === 'string' && data.email ? data.email : email,
    role: role as UserRole,
    displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
  };
}

export async function fetchUserProfile(uid: string, email: string): Promise<UserProfile | null> {
  try {
    const snapshot = await getDoc(doc(getDb(), 'users', uid));
    if (!snapshot.exists()) return null;
    return profileFromData(uid, email, snapshot.data());
  } catch (error) {
    throw new AppError(mapFirestoreError(error), 'profile');
  }
}

export async function signInWithFirebase(email: string, password: string): Promise<UserProfile> {
  logInfo('auth-sign-in');
  let user: User;
  try {
    const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    user = credential.user;
  } catch (error) {
    throw new AppError(mapAuthError(error), 'auth');
  }

  try {
    const profile = await fetchUserProfile(user.uid, user.email ?? email.trim());
    if (!profile) {
      await signOut(getFirebaseAuth());
      throw new AppError(
        'This account is not authorized. An administrator must add your user profile before you can sign in.',
        'unauthorized',
      );
    }
    return profile;
  } catch (error) {
    if (error instanceof AppError) throw error;
    await signOut(getFirebaseAuth()).catch(() => undefined);
    throw new AppError('Could not verify your account role. Sign-in was stopped.', 'profile');
  }
}

export async function signOutFirebase(): Promise<void> {
  logInfo('auth-sign-out');
  await signOut(getFirebaseAuth());
}

export function subscribeFirebaseUser(listener: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), listener);
}
