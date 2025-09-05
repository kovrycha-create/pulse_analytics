import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageView, PageSummaryData } from './types';
import PageSummary from './components/PageSummary';
const StatusChip = React.lazy(() => import('./components/StatusChip'));
import PageViewsTable from './components/PageViewsTable';
import SetupGuide from './components/SetupGuide';
import SessionList from './components/SessionList';
import SessionFunnel from './components/SessionFunnel';
import { applyTheme, getPreferredTheme, Theme } from './theme';

// make sure the cyber css path is available via public/styles

const App: React.FC = () => {
  // resolve API base like other parts of the app (import.meta.env or runtime override)
  const resolveApiBase = () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const runtime = (typeof window !== 'undefined' && (window as any).__VITE_API_BASE) ? String((window as any).__VITE_API_BASE) : '';
      if (runtime) return runtime.replace(/\/$/, '');
    } catch (e) {
      /* ignore */
    }

    const ime = (typeof (import.meta) !== 'undefined' ? (import.meta as any).env : {}) || {};
    const buildVal = (ime && ime.VITE_API_BASE) ? String(ime.VITE_API_BASE) : '';
    if (buildVal) return buildVal.replace(/\/$/, '');
    return '';
  };

  const apiBase = resolveApiBase();
  const [views, setViews] = useState<PageView[]>([]);
  const [sessionsData, setSessionsData] = useState<any | null>(null);
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const statsUrl = apiBase ? `${apiBase}/api/stats` : '/api/stats';
      const response = await fetch(statsUrl);
      if (!response.ok) {
        // try to include a snippet if the server returned HTML/errors
        let bodySnippet = '';
        try { const t = await response.text(); bodySnippet = t.slice(0, 200); } catch {}
        throw new Error(`Failed to fetch stats (${response.status}) ${bodySnippet ? `- ${bodySnippet}` : ''}`);
      }
      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        const txt = await response.text();
        throw new Error(`Non-JSON response (${response.status}) ${ct}: ${txt.slice(0,200)}`);
      }
      const data: PageView[] = await response.json();
      // Sort by timestamp descending.
      // Fix: The subtraction operator cannot be applied to Date objects directly in TypeScript.
      // Use .getTime() to get the numeric value of the date for sorting.
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setViews(data);
  // fetch aggregated sessions
      try {
        const aggUrl = apiBase ? `${apiBase}/api/stats?aggregate=true` : '/api/stats?aggregate=true';
        const agg = await fetch(aggUrl);
        if (agg.ok) {
          const ct2 = agg.headers.get('content-type') || '';
          if (!ct2.includes('application/json')) {
            setSessionsData(null);
          } else {
            const parsed = await agg.json();
            setSessionsData(parsed);
          }
        } else {
          setSessionsData(null);
        }
      } catch (e) {
        setSessionsData(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setViews([]); // Clear views on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    try { applyTheme(theme); } catch (e) {}
  }, [theme]);

  const pageSummary: PageSummaryData[] = useMemo(() => {
    const counts = views.reduce((acc, view) => {
      acc[view.page] = (acc[view.page] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .map(([page, views]) => ({ page, views }))
      .sort((a, b) => b.views - a.views);
  }, [views]);

  return (
  <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 cyber-content">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight cyber-heading">Pulse Analytics</h1>
            <p className="text-muted-foreground">A simple, self-hosted analytics dashboard.</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Status chip shows backend health */}
            {/* @ts-ignore - lazy import to avoid increasing bundle in this patch */}
            <React.Suspense fallback={null}>
              <StatusChip />
            </React.Suspense>
            <button
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={loading || clearing}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {clearing ? 'Clearing...' : 'Clear'}
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <label className="text-sm text-muted-foreground">Theme:</label>
            <select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
              className="px-3 py-2 rounded-md"
            >
              <option value="classic">Classic</option>
              <option value="cybertech">CyberTech</option>
            </select>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        <main className="space-y-8">
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-md" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          <SetupGuide />

          {loading ? (
            <div className="text-center py-10 text-muted-foreground">
                <p>Loading analytics data...</p>
            </div>
          ) : views.length === 0 && !error ? (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-lg">
                <h3 className="text-xl font-semibold">No data yet!</h3>
                <p className="text-muted-foreground mt-2">Embed the tracker script on your site to start seeing pageviews.</p>
              </div>
          ) : (
            <>
              <PageSummary data={pageSummary} totalViews={views.length} uniqueVisitors={new Set(views.map(v => v.userAgent)).size} views={views} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <SessionFunnel sessions={(sessionsData && sessionsData.sessions) || []} />
                <div className="lg:col-span-2">
                  <SessionList sessions={(sessionsData && sessionsData.sessions) || []} />
                </div>
              </div>
              <PageViewsTable views={views} />
            </>
          )}
        </main>
      </div>
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowClearConfirm(false)} />
          <div className="relative bg-background p-6 rounded-md border border-border w-11/12 max-w-md">
            <h3 className="text-lg font-semibold mb-2">Confirm Reset</h3>
            <p className="text-muted-foreground mb-4">This will permanently delete collected analytics data (Upstash and local fallback). This action cannot be undone. Are you sure?</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowClearConfirm(false)} className="px-3 py-2 rounded bg-secondary">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setClearing(true);
                    const url = apiBase ? `${apiBase}/api/clear` : '/api/clear';
                    const resp = await fetch(url, { method: 'POST' });
                    if (!resp.ok) throw new Error('Failed to clear');
                    setShowClearConfirm(false);
                    // refresh stats after clearing
                    await fetchStats();
                  } catch (e) {
                    // ignore — fetchStats will surface issues
                    console.error(e);
                  } finally {
                    setClearing(false);
                  }
                }}
                className="px-3 py-2 rounded bg-red-600 text-white"
              >
                Confirm Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;