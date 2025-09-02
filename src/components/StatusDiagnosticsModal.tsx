import React, { useRef, useEffect } from 'react';
import { useHealth } from '../hooks/useHealth';

function relativeTime(iso?: string) {
  if (!iso) return 'unknown';
  const d = Date.parse(iso);
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  return `${Math.floor(s/3600)}h ago`;
}

const DiagnosticsModal: React.FC<{ onClose: () => void; baseUrl: string }> = ({ onClose, baseUrl }) => {
  const { checks, lastSuccess, retry, version } = useHealth();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyDiagnostics = async () => {
    const payload = { checks, lastSuccess, version, baseUrl };
    try { await navigator.clipboard.writeText(JSON.stringify(payload)); } catch (e) { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-secondary border border-border rounded-lg p-4 w-full max-w-2xl z-10" role="dialog" aria-modal>
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold">Backend Diagnostics</h3>
          <div className="space-x-2">
            <button onClick={copyDiagnostics} className="px-2 py-1 bg-primary text-primary-foreground rounded">Copy diagnostics</button>
            <button onClick={() => { retry(); }} className="px-2 py-1 bg-secondary-foreground border rounded">Retry now</button>
            <button onClick={onClose} className="px-2 py-1">Close</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium">Recent Checks</h4>
            <div className="mt-2 overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground"><th>Time</th><th>Status</th><th>Latency</th><th>Error</th></tr>
                </thead>
                <tbody>
                  {checks.map((c, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="py-1">{relativeTime(c.ts)}</td>
                      <td className="py-1">{c.ok ? 'ok' : 'fail'}</td>
                      <td className="py-1">{c.latencyMs ? `${c.latencyMs}ms` : '-'}</td>
                      <td className="py-1 truncate">{c.error || c.snippet || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium">Configuration</h4>
            <div className="mt-2 text-sm font-mono bg-background border border-border p-2 rounded">
              <div><strong>BASE_URL:</strong> {baseUrl}</div>
              <div><strong>Health path:</strong> /api/health</div>
              <div><strong>CORS origin:</strong> {location.origin}</div>
              <div><strong>Version:</strong> {version || 'unknown'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticsModal;
