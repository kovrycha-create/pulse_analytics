import React, { useMemo } from 'react';

interface Session {
  id: string;
  pages: string[];
  entryPage: string;
  exitPage: string;
}

interface Props {
  sessions: Session[];
  topN?: number;
}

const FunnelBar: React.FC<{ label: string; value: number; max: number }> = ({ label, value, max }) => {
  const width = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-mono">{value}</span>
      </div>
      <div className="bg-zinc-800 rounded h-6">
        <div className="bg-accent h-6 rounded" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

const SessionFunnel: React.FC<Props> = ({ sessions, topN = 5 }) => {
  const counts = useMemo(() => {
    const entry: Record<string, number> = {};
    const mid: Record<string, number> = {};
    const exit: Record<string, number> = {};

    for (const s of sessions) {
      if (s.entryPage) entry[s.entryPage] = (entry[s.entryPage] || 0) + 1;
      if (s.exitPage) exit[s.exitPage] = (exit[s.exitPage] || 0) + 1;
      for (const p of s.pages) mid[p] = (mid[p] || 0) + 1;
    }

    const toSorted = (obj: Record<string, number>) =>
      Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, topN);

    const entryTop = toSorted(entry);
    const midTop = toSorted(mid);
    const exitTop = toSorted(exit);

    const max = Math.max(
      ...(entryTop.map(([, v]) => v).concat(midTop.map(([, v]) => v)).concat(exitTop.map(([, v]) => v)).length ? [0] : [0])
    );

    const all = { entryTop, midTop, exitTop, max } as any;
    // compute more realistic max (fallback to first item's value)
    all.max = Math.max(
      entryTop.length ? entryTop[0][1] : 0,
      midTop.length ? midTop[0][1] : 0,
      exitTop.length ? exitTop[0][1] : 0
    );
    return all;
  }, [sessions, topN]);

  return (
    <div className="bg-secondary p-6 rounded-lg border border-border">
      <h3 className="text-lg font-semibold mb-4">Session Funnel (Top Pages)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Entry Pages</h4>
          {counts.entryTop.map(([p, v]: any, i: number) => (
            <FunnelBar key={p + i} label={p} value={v} max={counts.max} />
          ))}
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">All Pages (mid)</h4>
          {counts.midTop.map(([p, v]: any, i: number) => (
            <FunnelBar key={p + i} label={p} value={v} max={counts.max} />
          ))}
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">Exit Pages</h4>
          {counts.exitTop.map(([p, v]: any, i: number) => (
            <FunnelBar key={p + i} label={p} value={v} max={counts.max} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionFunnel;
