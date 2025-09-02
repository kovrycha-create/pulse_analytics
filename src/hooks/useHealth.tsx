import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

export type HealthState = 'connected' | 'degraded' | 'offline';

export interface HealthCheckRecord {
  ts: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error?: string | null;
  snippet?: string | null;
}

export interface HealthContextValue {
  state: HealthState;
  lastSuccess?: HealthCheckRecord | null;
  checks: HealthCheckRecord[];
  version?: string | null;
  latencyMs?: number | null;
  baseUrl: string;
  retry: () => Promise<void>;
}

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

const readBase = () => {
  // Browser builds shouldn't reference `process`. Prefer import.meta.env at build time
  // and allow a runtime override on window.__VITE_API_BASE if present.
  const ime = (typeof (import.meta) !== 'undefined' ? (import.meta as any).env : {}) || {};
  const buildVal = (ime && ime.VITE_API_BASE) ? String(ime.VITE_API_BASE) : '';
  if (buildVal) return buildVal.replace(/\/$/, '');

  // runtime injection (optional) — set window.__VITE_API_BASE before app mounts if needed
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const runtime = (typeof window !== 'undefined' && (window as any).__VITE_API_BASE) ? String((window as any).__VITE_API_BASE) : '';
    if (runtime) return runtime.replace(/\/$/, '');
  } catch (e) {
    /* ignore */
  }

  // If nothing provided, return empty string — caller will handle disabled checks gracefully.
  return '';
};

export const HealthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const baseUrl = readBase();
  const healthPath = '/api/health';
  const pingPath = `${healthPath}?ping=1`;

  const [checks, setChecks] = useState<HealthCheckRecord[]>([]);
  const [state, setState] = useState<HealthState>('offline');
  const [version, setVersion] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const lastSuccessRef = useRef<HealthCheckRecord | null>(null);
  const timerRef = useRef<number | null>(null);
  const backoffRef = useRef<number | null>(null);

  const pushCheck = (rec: HealthCheckRecord) => {
    setChecks(prev => {
      const out = [rec, ...prev].slice(0, 20);
      return out;
    });
  };

  const evaluate = (rec: HealthCheckRecord) => {
    if (!rec.ok) return 'offline' as HealthState;
    if ((rec.latencyMs || 0) >= 1200) return 'degraded' as HealthState;
    return 'connected' as HealthState;
  };

  const doCheck = useCallback(async (ping = false) => {
    const url = baseUrl + (ping ? pingPath : healthPath);
    const headers = { Accept: 'application/json' } as Record<string,string>;
    const start = performance.now();
    let rec: HealthCheckRecord = { ts: new Date().toISOString(), ok: false, statusCode: null, latencyMs: null };
    try {
      const resp = await fetch(url, { method: 'GET', headers });
      const latency = Math.round(performance.now() - start);
      rec.latencyMs = latency;
      rec.statusCode = resp.status;
      const ct = resp.headers.get('content-type') || '';
      if (!ct.startsWith('application/json')) {
        const text = await resp.text();
        rec.ok = false;
        rec.error = `Non-JSON response`;
        rec.snippet = text.slice(0, 120);
      } else {
        const json = await resp.json();
        rec.ok = !!json.ok && resp.status >= 200 && resp.status < 300;
        setVersion(json.version || null);
        // If db is present and not ok, treat as degraded
        if (json.db && json.db !== 'ok') {
          // mark ok still true if json.ok, but we'll reflect degraded state below
        }
      }
    } catch (err: any) {
      rec.ok = false;
      rec.error = err?.message || String(err);
      rec.latencyMs = rec.latencyMs || null;
    }

    pushCheck(rec);
    // State decision: consider db field and latency
    if (rec.ok) {
      lastSuccessRef.current = rec;
      setLatencyMs(rec.latencyMs || null);
      // if last check's latency is high -> degraded
      if ((rec.latencyMs || 0) >= 1200) {
        setState('degraded');
      } else {
        // parse latest check's db if available
        try {
          // re-fetch small json to inspect db if content-type was json
          const resp2 = await fetch(url, { method: 'GET', headers });
          const json2 = await resp2.json();
          if (json2.db && json2.db !== 'ok') {
            setState('degraded');
          } else {
            setState('connected');
          }
        } catch (_) {
          setState('connected');
        }
      }
      backoffRef.current = null;
    } else {
      // network error or non-json -> offline
      // set exponential backoff
      const prev = backoffRef.current || 0;
      let next = prev === 0 ? 30_000 : Math.min(prev * 2, 120_000);
      backoffRef.current = next;
      // if we had a success recently older than 30s, treat as offline
      const last = lastSuccessRef.current ? Date.parse(lastSuccessRef.current.ts) : 0;
      const age = last ? (Date.now() - last) : Infinity;
      setState(age > 30_000 ? 'offline' : 'offline');
    }
  }, [baseUrl]);

  // Polling with jitter and backoff
  useEffect(() => {
    let stopped = false;
    if (!baseUrl) {
      // No configured API base — remain offline but don't throw in browser
      setState('offline');
      return () => { stopped = true; };
    }
    const baseInterval = 15_000;

    const schedule = (delay: number) => {
      if (stopped) return;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(async () => {
        await doCheck(true);
        // determine next delay: backoff if set, else normal cadence with jitter
        const backoff = backoffRef.current || 0;
        if (backoff) {
          schedule(backoff + Math.round(backoff * (Math.random() * 0.2 - 0.1)));
        } else {
          const jitter = Math.round(baseInterval * (Math.random() * 0.2 - 0.1));
          schedule(baseInterval + jitter);
        }
      }, delay);
    };

    // immediate check
    (async () => {
      await doCheck(false);
      const backoff = backoffRef.current || 0;
      if (backoff) schedule(backoff);
      else {
        const jitter = Math.round(baseInterval * (Math.random() * 0.2 - 0.1));
        schedule(baseInterval + jitter);
      }
    })();

    return () => { stopped = true; if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [doCheck]);

  const retry = useCallback(async () => {
    await doCheck(false);
  }, [doCheck]);

  const lastSuccess = lastSuccessRef.current;

  return (
    <HealthContext.Provider value={{ state, lastSuccess, checks, version, latencyMs, baseUrl, retry }}>
      {children}
    </HealthContext.Provider>
  );
};

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within HealthProvider');
  return ctx;
}
