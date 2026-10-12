import { readFileSync } from 'node:fs';

/**
 * Checks that the public Firebase web configuration can reach the project.
 * It does not print configuration values, document contents, or student data.
 *
 * An unauthenticated metadata read must be rejected. A successful read means
 * the database is public and the check fails.
 */

const REQUIRED = [
  ['EXPO_PUBLIC_FIREBASE_API_KEY', 'apiKey'],
  ['EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'authDomain'],
  ['EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'projectId'],
  ['EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'storageBucket'],
  ['EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'messagingSenderId'],
  ['EXPO_PUBLIC_FIREBASE_APP_ID', 'appId'],
];

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, 'utf8');
    const values = {};
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const separator = trimmed.indexOf('=');
      if (separator === -1) continue;
      values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
    }
    return values;
  } catch {
    return {};
  }
}

const fileEnv = loadEnvFile('.env');
const env = { ...fileEnv, ...process.env };
const missing = REQUIRED.filter(([name]) => !(env[name] ?? '').trim()).map(([name]) => name);

if (missing.length > 0) {
  console.error('Firebase web configuration is not in this project.');
  console.error('Paste the values from the Firebase console web snippet into .env:');
  for (const [name, field] of REQUIRED) {
    if (missing.includes(name)) console.error(`  ${name}=    # firebaseConfig.${field}`);
  }
  console.error('Then set EXPO_PUBLIC_DEMO_MODE=false and run this command again.');
  console.error('No network request was made.');
  process.exit(2);
}

const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID.trim();
const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY.trim();

async function errorStatus(response) {
  const body = await response.json().catch(() => null);
  const error = body && typeof body === 'object' ? body.error : null;
  const status = error && typeof error.status === 'string' ? error.status : '';
  const message = error && typeof error.message === 'string' ? error.message : '';
  const code = ['INVALID_LOGIN_CREDENTIALS', 'EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'OPERATION_NOT_ALLOWED', 'CONFIGURATION_NOT_FOUND', 'API_KEY_INVALID'].find(
    (known) => message === known || message.startsWith(`${known} `),
  );
  return { http: response.status, status: code || status };
}

const metadataUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/allocationMetadata/current?key=${encodeURIComponent(apiKey)}`;
const metadataResponse = await fetch(metadataUrl);
const metadata = await errorStatus(metadataResponse);

if (metadataResponse.ok) {
  console.error('Firestore connection failed the security check.');
  console.error('An unauthenticated read of allocation metadata was allowed. Deploy firestore.rules before using real student data.');
  console.error('The response body was not printed.');
  process.exit(1);
}

if (metadata.status !== 'PERMISSION_DENIED' && metadata.http !== 403) {
  console.error(`Firestore connection failed (HTTP ${metadata.http}${metadata.status ? `, ${metadata.status}` : ''}).`);
  console.error('Confirm that Firestore is created, the API key belongs to this project, and the key is allowed to call Cloud Firestore.');
  process.exit(1);
}

const authResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'connection-check@example.com',
    password: 'not-a-real-password',
    returnSecureToken: true,
  }),
});
const auth = await errorStatus(authResponse);

if (auth.status === 'OPERATION_NOT_ALLOWED' || auth.status === 'CONFIGURATION_NOT_FOUND') {
  console.error('Firestore is reachable and unauthenticated access is denied.');
  console.error('Firebase Authentication is not ready. In the Firebase console, open Authentication, choose Get started if you see it, then enable Email/Password.');
  process.exit(1);
}

if (auth.http === 400 && (auth.status === 'INVALID_LOGIN_CREDENTIALS' || auth.status === 'EMAIL_NOT_FOUND' || auth.status === 'INVALID_PASSWORD')) {
  console.log('Firestore is reachable and unauthenticated access is denied.');
  console.log('Email/password authentication is enabled. The probe account was rejected, as expected.');
  console.log('This does not prove a teacher profile can read allocations. Create users/{uid} and deploy firestore.rules, then sign in from the app.');
  if (env.EXPO_PUBLIC_DEMO_MODE === 'true') {
    console.log('EXPO_PUBLIC_DEMO_MODE is still true, so the app will keep using local demo data until you set it to false and restart Expo.');
  }
  process.exit(0);
}

console.error(`Authentication connection failed (HTTP ${auth.http}${auth.status ? `, ${auth.status}` : ''}).`);
console.error('Check the API key and that Identity Toolkit is enabled for the Firebase project.');
process.exit(1);
