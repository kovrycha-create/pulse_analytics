import React, { useState } from 'react';
import { PageView } from '../types';
import SessionModal from './SessionModal';

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
  sessions: Session[];
}

const SessionList: React.FC<Props> = ({ sessions }) => {
  const [selected, setSelected] = useState<Session | null>(null);

  return (
    <div>
      <div className="bg-secondary p-6 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Sessions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2">Session ID</th>
                <th className="p-2">Start</th>
                <th className="p-2">Duration</th>
                <th className="p-2">Pages</th>
                <th className="p-2">Entry</th>
                <th className="p-2">Exit</th>
                <th className="p-2">Bounce</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-b border-border/50 hover:bg-accent/5 cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="p-2 font-mono truncate max-w-[12rem]">{s.id}</td>
                  <td className="p-2">{new Date(s.start).toLocaleString()}</td>
                  <td className="p-2">{s.durationSeconds}s</td>
                  <td className="p-2 truncate max-w-xs" title={s.pages.join(' → ')}>{s.pages.join(' → ')}</td>
                  <td className="p-2">{s.entryPage}</td>
                  <td className="p-2">{s.exitPage}</td>
                  <td className="p-2">{s.isBounce ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <SessionModal session={selected} onClose={() => setSelected(null)} />
    </div>
  );
};

export default SessionList;
