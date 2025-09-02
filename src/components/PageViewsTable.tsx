import React from 'react';
import { PageView } from '../types';

interface PageViewsTableProps {
  views: PageView[];
}

const PageViewsTable: React.FC<PageViewsTableProps> = ({ views }) => {
  const recentViews = views.slice(0, 20); // Show latest 20 views

  const formatTimestamp = (isoString: string) => {
    try {
        const date = new Date(isoString);
        return date.toLocaleString();
    } catch(e) {
        return isoString;
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Recent Hits</h2>
      <div className="bg-secondary border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className="px-6 py-3 font-medium">Page</th>
                <th scope="col" className="px-6 py-3 font-medium">Referrer</th>
                <th scope="col" className="px-6 py-3 font-medium">Timestamp</th>
                <th scope="col" className="px-6 py-3 font-medium">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {recentViews.map((view) => (
                <tr key={view.id} className="border-b border-border/50 hover:bg-accent">
                  <td className="px-6 py-4 truncate max-w-xs" title={view.page}>{view.page}</td>
                  <td className="px-6 py-4 text-muted-foreground truncate max-w-xs" title={view.referrer}>
                    {view.referrer || 'Direct'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">{formatTimestamp(view.timestamp)}</td>
                  <td className="px-6 py-4 text-muted-foreground truncate max-w-sm" title={view.userAgent}>
                    {view.userAgent}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageViewsTable;