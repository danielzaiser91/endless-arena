import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, type Auth, type User } from 'firebase/auth';
import { firebaseConfig } from './firebase-config';

/**
 * Isolated Firebase bootstrap (implementation.md §15) — the game runs fully without it;
 * every call site here must degrade to the local-fallback leaderboard on failure (§11).
 */
let app: FirebaseApp | null = null;
let auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!app) app = initializeApp(firebaseConfig);
  if (!auth) auth = getAuth(app);
  return auth;
}

export async function ensureSignedIn(): Promise<User> {
  const authInstance = getFirebaseAuth();
  if (authInstance.currentUser) return authInstance.currentUser;
  const cred = await signInAnonymously(authInstance);
  return cred.user;
}

export function currentUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}
