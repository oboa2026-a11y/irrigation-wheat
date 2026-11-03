/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, setDoc } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore Database (using provisioned database ID)
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Skill mandatory connection test
async function testConnection() {
  try {
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc).catch(async () => {
      // If doc doesn't exist yet, write a heartbeat to establish connection
      await setDoc(testDoc, { initializedAt: new Date().toISOString() }, { merge: true });
    });
    console.log('[Firebase Firestore] Connected successfully to database:', firebaseConfig.firestoreDatabaseId || '(default)');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    } else {
      console.warn('[Firebase Firestore] Connection status notice:', error);
    }
  }
}

testConnection();
