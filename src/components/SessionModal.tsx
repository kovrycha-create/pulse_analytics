import React, { useMemo, useState } from 'react';
import { PageView } from '../types';

interface Session {
  id: string;
  sessionIdBase: string;
  start: string;
  end: string;
  durationSeconds: number;
  pages: string[];
  entryPage: string;
  exitPage: string;
  isBounce: boolean;
  views: PageView[];
}

interface Props {
  session: Session | null;
  onClose: () => void;
}

const SessionModal: React.FC<Props> = ({ session, onClose }) => {
  if (!session) return null;

  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const timeline = useMemo(() => {
    const times = session.views.map(v => Date.parse(v.timestamp));
    const min = Math.min(...times);
    const max = Math.max(...times);
    return { min, max };
  }, [session]);

  const mapX = (ts: number, width: number) => {
    if (timeline.max === timeline.min) return width / 2;
    return ((ts - timeline.min) / (timeline.max - timeline.min)) * width;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-2/3 max-h-[80vh] overflow-y-auto p-6 border border-border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold">Session {session.id}</h3>
            <p className="text-sm text-muted-foreground">{session.pages.join(' → ')}</p>
          </div>
          <div>
            <button onClick={onClose} className="px-3 py-1 rounded bg-secondary text-secondary-foreground">Close</button>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="bg-secondary p-3 rounded border border-border">
            <div className="text-sm text-muted-foreground">Start</div>
            <div className="font-mono">{new Date(session.start).toLocaleString()}</div>
          </div>
          <div className="bg-secondary p-3 rounded border border-border">
            <div className="text-sm text-muted-foreground">Duration</div>
            <div className="font-mono">{session.durationSeconds}s</div>
          </div>
        </div>

        <h4 className="text-lg font-medium mb-2">Events</h4>

        <div className="mb-4">
          <div className="bg-secondary p-3 rounded border border-border">
            <div style={{ position: 'relative' }}>
              <svg width="100%" height="60" viewBox="0 0 800 60" preserveAspectRatio="none">
                <line x1="0" y1="30" x2="800" y2="30" stroke="#374151" strokeWidth={1} />
                {session.views.map((v, i) => {
                  const ts = Date.parse(v.timestamp);
                  const x = mapX(ts, 800);
                  return (
                    <circle
                      key={v.id || i}
                      cx={x}
                      cy={30}
                      r={6}
                      fill={v.type === 'page_unload' ? '#f97316' : v.type === 'custom_event' ? '#06b6d4' : '#60a5fa'}
                      onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, text: `${new Date(ts).toLocaleTimeString()} — ${v.type || 'pageview'} ${v.page || ''}` })}
                      onMouseLeave={() => setHover(null)}
                    />
                  );
                })}
              </svg>
              {hover && (
                <div style={{ position: 'absolute', left: hover.x - 200, top: -40 }} className="bg-background border border-border p-2 rounded text-sm shadow">
                  {hover.text}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">Time</th>
                <th className="p-2">Type</th>
                <th className="p-2">Page</th>
                <th className="p-2">Time on page</th>
                <th className="p-2">Scroll</th>
                <th className="p-2">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {session.views.map((v, i) => (
                <tr key={v.id || i} className="border-b border-border/50">
                  <td className="p-2">{new Date(v.timestamp).toLocaleString()}</td>
                  <td className="p-2">{v.type || 'pageview'}</td>
                  <td className="p-2 truncate max-w-xs">{v.page}</td>
                  <td className="p-2">{v.timeOnPage != null ? `${v.timeOnPage}s` : '-'}</td>
                  <td className="p-2">{v.scrollDepth != null ? `${v.scrollDepth}%` : '-'}</td>
                  <td className="p-2 truncate max-w-sm" title={v.userAgent}>{v.userAgent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SessionModal;
