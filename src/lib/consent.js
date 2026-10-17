import { useSyncExternalStore } from 'react';

/*
 * Cookie consent. "necessary" = site works without third parties; "all" = external services (HubSpot meetings
 * calendar) may load. Stored per browser; null = not decided yet → banner shows.
 */
const KEY = 'lmi-consent';
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
let state = read(); // 'all' | 'necessary' | null
const listeners = new Set();

export function setConsent(value) {
  state = value;
  try { localStorage.setItem(KEY, value); } catch { /* private mode: consent lasts for this visit only */ }
  listeners.forEach(l => l());
}
/** Re-open the banner (footer link "Cookie-Einstellungen"). */
export function resetConsent() {
  state = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  listeners.forEach(l => l());
}
export const useConsent = () => useSyncExternalStore(cb => (listeners.add(cb), () => listeners.delete(cb)), () => state);
