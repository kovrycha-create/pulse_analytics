import React, { useState } from 'react';
import { useHealth } from '../hooks/useHealth';
import DiagnosticsModal from './StatusDiagnosticsModal';

const StateMeta: Record<string, { color: string; label: string }> = {
  connected: { color: 'bg-green-500', label: 'Connected' },
  degraded: { color: 'bg-amber-500', label: 'Degraded' },
  offline: { color: 'bg-red-600', label: 'Offline' }
};

const StatusChip: React.FC = () => {
  const { state, latencyMs, version, baseUrl } = useHealth();
  const [open, setOpen] = useState(false);

  const meta = StateMeta[state] || StateMeta.offline;

  const statusClass = state === 'connected' ? 'status-online' : state === 'degraded' ? 'status-degraded' : 'status-offline';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`status-chip ${statusClass} focus:outline-none focus:ring-2 focus:ring-offset-2 text-sm`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Backend status: ${meta.label}`}
        role="status"
      >
        <span className="dot" aria-hidden style={{ backgroundColor: 'currentColor' }} />
        <span className="sr-only">Status:</span>
        <span aria-live="polite">{meta.label}</span>
        <span className="ml-2 font-mono text-xs opacity-90">{latencyMs ? `${latencyMs}ms` : ''}</span>
      </button>
      {open && <DiagnosticsModal onClose={() => setOpen(false)} baseUrl={baseUrl} />}
    </>
  );
};

export default StatusChip;
