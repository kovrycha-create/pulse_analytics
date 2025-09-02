
import React from 'react';
import { PageSummaryData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface PageSummaryProps {
  data: PageSummaryData[];
  totalViews: number;
  uniqueVisitors: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];

const Card: React.FC<{ title: string; value: number | string; children?: React.ReactNode }> = ({ title, value, children }) => (
    <div className="bg-secondary p-6 rounded-lg border border-border">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-bold mt-1">{value}</p>
        {children}
    </div>
);


const PageSummary: React.FC<PageSummaryProps> = ({ data, totalViews, uniqueVisitors }) => {
  const chartData = data.slice(0, 10);

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
    </div>
  );
};

export default PageSummary;
