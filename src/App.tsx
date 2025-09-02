import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageView, PageSummaryData } from './types';
import PageSummary from './components/PageSummary';
import PageViewsTable from './components/PageViewsTable';
import SetupGuide from './components/SetupGuide';

const App: React.FC = () => {
  const [views, setViews] = useState<PageView[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data: PageView[] = await response.json();
      // Sort by timestamp descending.
      // Fix: The subtraction operator cannot be applied to Date objects directly in TypeScript.
      // Use .getTime() to get the numeric value of the date for sorting.
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setViews(data);
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
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pulse Analytics</h1>
            <p className="text-muted-foreground">A simple, self-hosted analytics dashboard.</p>
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
              <PageSummary data={pageSummary} totalViews={views.length} uniqueVisitors={new Set(views.map(v => v.userAgent)).size} />
              <PageViewsTable views={views} />
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;