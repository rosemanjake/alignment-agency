import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';
import type { GameState } from './context/GameStateProvider';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBNS_n4mZK2JX27i2w1bZnVvQlbijqL7Kw',
  authDomain: 'misaligned-4254e.firebaseapp.com',
  projectId: 'misaligned-4254e',
  storageBucket: 'misaligned-4254e.appspot.com',
  messagingSenderId: '344676018618',
  appId: '1:344676018618:web:a795e9f4c9298f70139583',
};

const FIREBASE_APP =
  getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();

export const DB = getFirestore(FIREBASE_APP);

export async function saveUserData(
  email: string,
  data: Record<string, unknown>
): Promise<void> {
  const userRef = doc(DB, 'users', email);
  await setDoc(userRef, data, { merge: true });
}

export async function getUserData(
  email: string
): Promise<Record<string, unknown> | null> {
  const userRef = doc(DB, 'users', email);
  const docSnap = await getDoc(userRef);
  return docSnap.exists() ? docSnap.data() : null;
}

export async function saveGameState(
  email: string,
  gameState: Partial<GameState>
): Promise<void> {
  const gameStateRef = doc(DB, 'gameStates', email);
  await setDoc(gameStateRef, gameState, { merge: true });
}

export async function getGameState(
  email: string
): Promise<Partial<GameState> | null> {
  const gameStateRef = doc(DB, 'gameStates', email);
  const docSnap = await getDoc(gameStateRef);
  return docSnap.exists() ? (docSnap.data() as Partial<GameState>) : null;
}

export async function deleteGameState(email: string): Promise<void> {
  const gameStateRef = doc(DB, 'gameStates', email);
  await deleteDoc(gameStateRef);
}
