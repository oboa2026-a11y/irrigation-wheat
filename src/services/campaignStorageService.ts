/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ZoneRecord, IrrigationScheme } from '../types';

export interface ServerCampaignData {
  zones: ZoneRecord[];
  schemes: IrrigationScheme[];
  version: number;
  lastUpdated: string;
}

export interface ServerStatus {
  version: number;
  lastUpdated: string;
  zonesCount: number;
  schemesCount: number;
}

/**
 * Fetch the latest shared campaign data from the Express backend
 * This ensures changes made on any PC or browser are visible to all users.
 */
export async function fetchCampaignDataFromServer(): Promise<ServerCampaignData | null> {
  try {
    const res = await fetch('/api/campaign/data', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn(`Server campaign API returned ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.zones) && data.zones.length > 0) {
      return {
        zones: data.zones,
        schemes: Array.isArray(data.schemes) ? data.schemes : [],
        version: data.version || 1,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
      };
    }
    return null;
  } catch (err) {
    console.warn('Network error fetching campaign data from server:', err);
    return null;
  }
}

/**
 * Check lightweight server version and timestamp for polling
 */
export async function checkServerStatus(): Promise<ServerStatus | null> {
  try {
    const res = await fetch('/api/campaign/status', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success) {
      return {
        version: data.version || 1,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        zonesCount: data.zonesCount || 0,
        schemesCount: data.schemesCount || 0,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Persist updated zones to the backend so all devices receive the changes
 */
export async function saveZonesToServer(zones: ZoneRecord[]): Promise<boolean> {
  try {
    const res = await fetch('/api/campaign/zones', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ zones }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Failed to save zones to server:', err);
    return false;
  }
}

/**
 * Persist updated schemes to the backend
 */
export async function saveSchemesToServer(schemes: IrrigationScheme[]): Promise<boolean> {
  try {
    const res = await fetch('/api/campaign/schemes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ schemes }),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Failed to save schemes to server:', err);
    return false;
  }
}

/**
 * Reset server data back to Bureau baseline
 */
export async function resetServerCampaignData(): Promise<boolean> {
  try {
    const res = await fetch('/api/campaign/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.error('Failed to reset server campaign data:', err);
    return false;
  }
}

/**
 * Fetch server-stored admin password
 */
export async function fetchServerAdminPassword(): Promise<string | null> {
  try {
    const res = await fetch('/api/campaign/admin-pwd', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.customPassword || null;
  } catch {
    return null;
  }
}

/**
 * Persist new admin password to server
 */
export async function saveServerAdminPassword(newPassword: string): Promise<boolean> {
  try {
    const res = await fetch('/api/campaign/admin-pwd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    return !!data.success;
  } catch {
    return false;
  }
}
