import { useEffect, useState } from 'react';
import type { ReportInput } from '../shared';
import { load, save } from './storage';
import { getT } from '../i18n';

// Reports waiting to be sent. Every report goes through this queue, so
// online and offline submissions follow the same path.
const KEY = 'queue';
const listeners = new Set<() => void>();

export function getQueue(): ReportInput[] {
  return load<ReportInput[]>(KEY, []);
}

function setQueue(q: ReportInput[]) {
  if (!save(KEY, q)) throw new Error(getT().errors.noSpace);
  listeners.forEach((fn) => fn());
}

export function enqueue(report: ReportInput) {
  setQueue([...getQueue(), report]);
  void syncQueue();
}

let syncing = false;

/** Sends queued reports oldest first. A report is removed only after the server confirms it. */
export async function syncQueue() {
  if (syncing || !navigator.onLine) return;
  syncing = true;
  try {
    for (const report of getQueue()) {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      // 4xx means the report itself is invalid; retrying won't help, so drop it.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        setQueue(getQueue().filter((r) => r.id !== report.id));
      } else break;
    }
  } catch {
    // Network dropped mid-sync; the rest stays queued for next time.
  } finally {
    syncing = false;
  }
}

export function startAutoSync() {
  window.addEventListener('online', () => void syncQueue());
  void syncQueue();
}

export function useQueueLength() {
  const [n, setN] = useState(() => getQueue().length);
  useEffect(() => {
    const fn = () => setN(getQueue().length);
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }, []);
  return n;
}

export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
