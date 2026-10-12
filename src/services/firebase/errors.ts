const AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/invalid-api-key': 'Firebase configuration is invalid. Check the app settings.',
  'auth/configuration-not-found': 'Email and password sign-in is not enabled for this Firebase project yet.',
};

function errorCode(error: unknown): string {
  if (typeof error === 'object' && error && 'code' in error) return String((error as { code: unknown }).code);
  return '';
}

export function mapAuthError(error: unknown): string {
  return AUTH_MESSAGES[errorCode(error)] ?? 'Sign-in failed. Check your email and password, then try again.';
}

export function mapFirestoreError(error: unknown): string {
  const code = errorCode(error);
  if (code.includes('permission-denied')) return 'You do not have permission to view this allocation.';
  if (code.includes('unauthenticated')) return 'Your session has expired. Sign in again.';
  if (code.includes('unavailable') || code.includes('network-request-failed')) {
    return 'The allocation database is unreachable.';
  }
  return 'The allocation could not be loaded.';
}
