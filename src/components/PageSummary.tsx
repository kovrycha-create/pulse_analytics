import React from 'react';
import { PageSummaryData, PageView } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, PieChart, Pie } from 'recharts';

interface PageSummaryProps {
    data: PageSummaryData[];
    totalViews: number;
    uniqueVisitors: number;
    views?: PageView[];
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const Card: React.FC<{ title: string; value: number | string; children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="bg-secondary p-6 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {children}
    </div>
);


const PageSummary: React.FC<PageSummaryProps> = ({ data, totalViews, uniqueVisitors, views = [] }) => {
    const chartData = data.slice(0, 10);
    // Compute derived analytics client-side from `views`.
    const { sessionsAggregate, dailyCounts, topReferrers } = React.useMemo(() => {
        // Sessions: group by sessionId then split by inactivity (30min)
        const SESSION_TIMEOUT = 30 * 60 * 1000;
        const bySid: Record<string, PageView[]> = {};
        for (const v of views) {
            const sid = v.sessionId || `${v.userAgent || 'unknown'}:unknown`;
            (bySid[sid] = bySid[sid] || []).push(v);
        }

        const sessions: Array<{
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
        }> = [];

        for (const [sid, arr] of Object.entries(bySid)) {
            const sorted = arr.slice().sort((a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0));
            let bucket: PageView[] = [];
            let lastTs = 0;
            let idx = 0;
            for (const v of sorted) {
                const t = Date.parse(v.timestamp) || 0;
                if (!bucket.length) {
                    bucket.push(v);
                    lastTs = t;
                    continue;
                }
                if (t - lastTs > SESSION_TIMEOUT) {
                    // flush
                    const s = buildSession(sid, bucket, idx);
                    sessions.push(s);
                    idx += 1;
                    bucket = [v];
                } else {
                    bucket.push(v);
                }
                lastTs = t;
            }
            if (bucket.length) {
                const s = buildSession(sid, bucket, idx);
                sessions.push(s);
            }
        }

        const totalSessions = sessions.length;
        const pagesPerSession = totalSessions ? sessions.reduce((acc, s) => acc + s.pages.length, 0) / totalSessions : 0;
        const bounces = sessions.filter(s => s.isBounce).length;
        const bounceRate = totalSessions ? Math.round((bounces / totalSessions) * 100 * 100) / 100 : 0; // 2dp

        // Daily counts
        const byDay: Record<string, number> = {};
        for (const v of views) {
            try {
                const d = new Date(v.timestamp);
                const key = d.toISOString().slice(0, 10);
                byDay[key] = (byDay[key] || 0) + 1;
            } catch (e) {
                byDay['unknown'] = (byDay['unknown'] || 0) + 1;
            }
        }
        const dailyCounts = Object.entries(byDay).sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({ day, count }));

        // Top referrers (by hostname)
        const refCounts: Record<string, number> = {};
        for (const v of views) {
            const r = v.referrer || '';
            let key = 'Direct';
            if (r) {
                try { key = new URL(r).hostname || r; } catch { key = r; }
            }
            refCounts[key] = (refCounts[key] || 0) + 1;
        }
        const topReferrers = Object.entries(refCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([ref, count]) => ({ ref, count }));

        return {
            sessionsAggregate: { totalViews: views.length, totalSessions, pagesPerSession: Number(pagesPerSession.toFixed(2)), bounceRate },
            dailyCounts,
            topReferrers
        };
    }, [views]);

    function buildSession(baseId: string, viewsBucket: PageView[], index: number) {
        const sorted = viewsBucket.slice().sort((a, b) => (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0));
        const startTs = Date.parse(sorted[0].timestamp) || 0;
        const endTs = Date.parse(sorted[sorted.length - 1].timestamp) || 0;
        const duration = Math.max(0, Math.round((endTs - startTs) / 1000));
        const pages = sorted.map(v => v.page || '').filter(Boolean);
        const uniquePages: string[] = [];
        for (const p of pages) if (!uniquePages.length || uniquePages[uniquePages.length - 1] !== p) uniquePages.push(p);
        return {
            id: `${baseId}:${index}`,
            sessionIdBase: baseId,
            start: new Date(startTs).toISOString(),
            end: new Date(endTs || startTs).toISOString(),
            durationSeconds: duration,
            pages: uniquePages,
            entryPage: uniquePages[0] || '',
            exitPage: uniquePages[uniquePages.length - 1] || '',
            isBounce: sorted.length <= 1,
            views: sorted
        };
    }

  return (
    <div>
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card title="Total Page Views" value={totalViews} />
            <Card title="Unique Visitors (by User Agent)" value={uniqueVisitors} />
            <Card title="Top Pages" value={data.length}>
                <p className="text-xs text-muted-foreground mt-2">Number of distinct pages tracked.</p>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4">Top 10 Pages by Views</h3>
                 <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 50, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                            <XAxis type="number" stroke="#9ca3af" />
                            <YAxis 
                              type="category" 
                              dataKey="page" 
                              width={120} 
                              tick={{ fill: '#9ca3af', fontSize: 12 }} 
                              tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                            />
                            <Tooltip
                                cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                                labelStyle={{ color: '#f9fafb' }}
                            />
                            <Bar dataKey="views">
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
                <div className="bg-secondary p-6 rounded-lg border border-border">
                <h3 className="text-lg font-semibold mb-4">All Pages</h3>
                <div className="overflow-y-auto max-h-80 pr-2">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="p-2">Page</th>
                                <th className="p-2 text-right">Views</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr key={index} className="border-b border-border/50">
                                    <td className="p-2 truncate" title={item.page}>{item.page}</td>
                                    <td className="p-2 text-right font-mono">{item.views}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="bg-secondary p-4 rounded-lg border border-border">
                    <h4 className="text-sm text-muted-foreground">Sessions</h4>
                    <div className="mt-2 text-2xl font-bold">{sessionsAggregate?.totalSessions ?? '—'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Pages / session: {sessionsAggregate?.pagesPerSession ?? '—'}</div>
                </div>
                <div className="bg-secondary p-4 rounded-lg border border-border">
                    <h4 className="text-sm text-muted-foreground">Bounce Rate</h4>
                    <div className="mt-2 text-2xl font-bold">{sessionsAggregate?.bounceRate != null ? `${sessionsAggregate.bounceRate}%` : '—'}</div>
                    <div className="text-xs text-muted-foreground mt-1">Lower is better</div>
                </div>
                <div className="bg-secondary p-4 rounded-lg border border-border">
                    <h4 className="text-sm text-muted-foreground">Views</h4>
                    <div className="mt-2 text-2xl font-bold">{totalViews}</div>
                    <div className="text-xs text-muted-foreground mt-1">Unique visitors: {uniqueVisitors}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div className="bg-secondary p-6 rounded-lg border border-border">
                    <h3 className="text-lg font-semibold mb-4">Views (summary)</h3>
                    <div className="text-sm text-muted-foreground mb-3">Daily views (by ISO date). Hover for values.</div>
                    <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyCounts} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                <XAxis dataKey="day" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={{ r: 2 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                    <div className="bg-secondary p-6 rounded-lg border border-border">
                        <h3 className="text-lg font-semibold mb-4">Top Referrers</h3>
                        <div className="text-sm text-muted-foreground mb-3">Top referrers (hostnames) from recent data.</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={topReferrers} dataKey="count" nameKey="ref" cx="50%" cy="50%" outerRadius={60} innerRadius={28} paddingAngle={2}>
                                            {topReferrers.map((entry, idx) => (
                                                <Cell key={`refcell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={topReferrers} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                        <XAxis dataKey="ref" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => v.length > 20 ? `${v.slice(0, 18)}...` : v} />
                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                        <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} />
                                        <Bar dataKey="count">
                                            {topReferrers.map((entry, idx) => (
                                                <Cell key={`barcell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
            </div>
    </div>
  );
};

export default PageSummary;