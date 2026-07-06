import {
  getFirestore, doc, setDoc, serverTimestamp,
  collection, query, orderBy, limit, onSnapshot, type Unsubscribe,
} from 'firebase/firestore';
import { ensureSignedIn } from './firebase';
import type { GameState } from '../core/state';

/** Score = lifetime highest arena level; tiebreak = lifetime kills (implementation.md §11). */
export interface LeaderboardEntry {
  uid: string;
  name: string;
  bestLevel: number;
  kills: number;
  ascensions: number;
  classId: string | null;
}

export async function submitScore(state: GameState, nickname: string): Promise<void> {
  const user = await ensureSignedIn();
  const db = getFirestore();
  await setDoc(doc(db, 'players', user.uid), {
    name: nickname.slice(0, 16),
    bestLevel: state.lifetimeBestArenaLevel,
    kills: state.lifetimeKills,
    ascensions: state.ascensions,
    classId: state.classPath,
    updatedAt: serverTimestamp(),
  });
}

/** Live top-100 — subscribe only while the leaderboard panel is open (keeps free-tier reads low). */
export function subscribeLeaderboard(
  onData: (entries: LeaderboardEntry[]) => void,
  onError: (err: unknown) => void,
): Unsubscribe {
  const db = getFirestore();
  const q = query(collection(db, 'players'), orderBy('bestLevel', 'desc'), limit(100));
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ uid: d.id, ...(d.data() as Omit<LeaderboardEntry, 'uid'>) }))),
    onError,
  );
}
