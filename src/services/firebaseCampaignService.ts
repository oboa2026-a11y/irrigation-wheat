/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { IrrigationScheme, ZoneRecord } from '../types';

const ZONES_COLLECTION = 'zones';
const SCHEMES_COLLECTION = 'schemes';
const META_COLLECTION = 'campaign_meta';
const META_DOC_ID = 'global';

export interface FirebaseCampaignSyncCallback {
  onZonesUpdate?: (zones: ZoneRecord[]) => void;
  onSchemesUpdate?: (schemes: IrrigationScheme[]) => void;
  onMetaUpdate?: (meta: { version: number; lastUpdated: string }) => void;
  onError?: (err: Error) => void;
}

/**
 * Sets up live real-time Firestore listeners for instant updates
 * across all browsers, PCs, and platforms.
 */
export function subscribeToFirebaseCampaignData(
  callbacks: FirebaseCampaignSyncCallback
): () => void {
  const unsubs: Unsubscribe[] = [];

  try {
    // 1. Listen to Zones collection
    const zonesRef = collection(db, ZONES_COLLECTION);
    const unsubZones = onSnapshot(
      zonesRef,
      snapshot => {
        if (!snapshot.empty && callbacks.onZonesUpdate) {
          const list: ZoneRecord[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as ZoneRecord);
          });
          // Sort by numeric id
          list.sort((a, b) => a.id - b.id);
          callbacks.onZonesUpdate(list);
        }
      },
      error => {
        console.warn('[Firebase] Zones listener error:', error);
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubZones);

    // 2. Listen to Schemes collection (for real-time GIS map updates)
    const schemesRef = collection(db, SCHEMES_COLLECTION);
    const unsubSchemes = onSnapshot(
      schemesRef,
      snapshot => {
        if (!snapshot.empty && callbacks.onSchemesUpdate) {
          const list: IrrigationScheme[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as IrrigationScheme);
          });
          list.sort((a, b) => a.name.localeCompare(b.name));
          callbacks.onSchemesUpdate(list);
        }
      },
      error => {
        console.warn('[Firebase] Schemes listener error:', error);
        callbacks.onError?.(error);
      }
    );
    unsubs.push(unsubSchemes);

    // 3. Listen to metadata
    const metaDocRef = doc(db, META_COLLECTION, META_DOC_ID);
    const unsubMeta = onSnapshot(metaDocRef, docSnap => {
      if (docSnap.exists() && callbacks.onMetaUpdate) {
        callbacks.onMetaUpdate(docSnap.data() as { version: number; lastUpdated: string });
      }
    });
    unsubs.push(unsubMeta);
  } catch (err) {
    console.error('[Firebase] Failed to initialize listeners:', err);
  }

  return () => {
    unsubs.forEach(u => u());
  };
}

/**
 * Increment global campaign version and record update timestamp
 */
export async function touchCampaignMeta(): Promise<void> {
  try {
    const metaRef = doc(db, META_COLLECTION, META_DOC_ID);
    await setDoc(
      metaRef,
      {
        version: Date.now(),
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firebase] Failed to touch metadata:', err);
  }
}

/**
 * Batch update or initialize all zones in Firebase
 */
export async function saveAllZonesToFirebase(zones: ZoneRecord[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    zones.forEach(zone => {
      const zoneRef = doc(db, ZONES_COLLECTION, String(zone.id));
      batch.set(zoneRef, zone, { merge: true });
    });
    await batch.commit();
    await touchCampaignMeta();
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to save zones batch:', err);
    return false;
  }
}

/**
 * Save single zone update
 */
export async function saveZoneToFirebase(zone: ZoneRecord): Promise<boolean> {
  try {
    const zoneRef = doc(db, ZONES_COLLECTION, String(zone.id));
    await setDoc(zoneRef, zone, { merge: true });
    await touchCampaignMeta();
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to save zone:', err);
    return false;
  }
}

/**
 * Batch update or initialize all schemes in Firebase
 */
export async function saveAllSchemesToFirebase(schemes: IrrigationScheme[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    schemes.forEach(scheme => {
      const schemeRef = doc(db, SCHEMES_COLLECTION, scheme.id);
      batch.set(schemeRef, scheme, { merge: true });
    });
    await batch.commit();
    await touchCampaignMeta();
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to save schemes batch:', err);
    return false;
  }
}

/**
 * Add a new GIS Irrigation Scheme to Firebase
 */
export async function addSchemeToFirebase(scheme: IrrigationScheme): Promise<boolean> {
  try {
    const schemeRef = doc(db, SCHEMES_COLLECTION, scheme.id);
    await setDoc(schemeRef, scheme);
    await touchCampaignMeta();
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to add scheme:', err);
    return false;
  }
}

/**
 * Update an existing GIS Irrigation Scheme in Firebase
 */
export async function updateSchemeInFirebase(scheme: IrrigationScheme): Promise<boolean> {
  try {
    const schemeRef = doc(db, SCHEMES_COLLECTION, scheme.id);
    await setDoc(schemeRef, scheme, { merge: true });
    await touchCampaignMeta();
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to update scheme:', err);
    return false;
  }
}

/**
 * Delete a GIS Irrigation Scheme from Firebase
 */
export async function deleteSchemeFromFirebase(schemeId: string): Promise<boolean> {
  try {
    const schemeRef = doc(db, SCHEMES_COLLECTION, schemeId);
    await deleteDoc(schemeRef);
    await touchCampaignMeta();
    return true;
  } catch (err) {
    console.error('[Firebase] Failed to delete scheme:', err);
    return false;
  }
}

/**
 * Initial check and seed: If Firestore has no documents yet,
 * populate it with the baseline data so other PCs get data immediately from Firebase.
 */
export async function seedFirebaseIfEmpty(
  baselineZones: ZoneRecord[],
  baselineSchemes: IrrigationScheme[]
): Promise<void> {
  try {
    const zonesSnap = await getDocs(collection(db, ZONES_COLLECTION));
    if (zonesSnap.empty && baselineZones.length > 0) {
      console.log('[Firebase] Seeding baseline zones to Firestore...');
      await saveAllZonesToFirebase(baselineZones);
    }

    const schemesSnap = await getDocs(collection(db, SCHEMES_COLLECTION));
    if (schemesSnap.empty && baselineSchemes.length > 0) {
      console.log('[Firebase] Seeding baseline irrigation schemes to Firestore...');
      await saveAllSchemesToFirebase(baselineSchemes);
    }
  } catch (err) {
    console.warn('[Firebase] Seed check notice:', err);
  }
}
