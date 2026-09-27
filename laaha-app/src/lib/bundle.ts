import { useEffect, useState } from 'react';
import { BUNDLE_VERSION, type Bundle } from '../shared';
import { load, save } from './storage';
import { getT } from '../i18n';

const KEY = 'bundle';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Partners and guides: served from the device, refreshed from the server when older than 24h. */
export function useBundle() {
  const [bundle, setBundle] = useState<Bundle | null>(() => usable(load<Bundle | null>(KEY, null)));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cached = usable(load<Bundle | null>(KEY, null));
    const fresh = cached && Date.now() - Date.parse(cached.updatedAt) < MAX_AGE_MS;
    if (fresh) return;
    fetch('/api/bundle')
      .then((r) => (r.ok ? (r.json() as Promise<Bundle>) : Promise.reject(new Error(String(r.status)))))
      .then((b) => {
        save(KEY, b);
        setBundle(b);
      })
      .catch(() => {
        if (!cached) setError(getT().errors.noDirectory);
      });
  }, []);

  return { bundle, error };
}

/** A bundle saved by an older version of the app is ignored and downloaded again. */
function usable(b: Bundle | null): Bundle | null {
  return b && b.version === BUNDLE_VERSION ? b : null;
}
