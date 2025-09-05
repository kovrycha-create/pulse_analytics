import React, { useState } from 'react';
import { useHealth } from '../hooks/useHealth';

const SetupGuide: React.FC = () => {
    const [copied, setCopied] = useState(false);
    // Prefer using the deployed production host, but fall back to current origin in the browser
    const defaultHost = 'https://pulse-analytics.vercel.app';
    const host = (typeof window !== 'undefined' && (window as any).location && (window as any).location.origin) ? (window as any).location.origin : defaultHost;
    const trackerUrl = `${host.replace(/\/$/, '')}/tracker.js`;
    const apiUrl = `${host.replace(/\/$/, '')}/api/track`;
    const scriptTag = `<script async defer src="${trackerUrl}" data-api-url="${apiUrl}"></script>`;

    const handleCopy = () => {
        navigator.clipboard.writeText(scriptTag).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const StatusInline: React.FC = () => {
        try {
            const { state } = useHealth();
            return (
                <div className="inline-flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${state === 'connected' ? 'bg-green-500' : state === 'degraded' ? 'bg-amber-500' : 'bg-red-600'}`}></span>
                    <span className="text-sm">Tracker {state === 'connected' ? 'Connected ✓' : 'Disconnected ✕'}</span>
                </div>
            );
        } catch (e) {
            return null;
        }
    };

    return (
        <div className="bg-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Get Started</h2>
            <p className="text-muted-foreground mb-4">
                To start tracking pageviews, add the following script tag to the <code>&lt;head&gt;</code> section of your website's HTML.
            </p>
            <div className="mb-4">
                <StatusInline />
            </div>
            <div className="bg-background border border-border rounded-md p-4 flex items-center justify-between">
                <pre className="text-sm overflow-x-auto">
                    <code className="text-primary">{scriptTag}</code>
                </pre>
                <button
                    onClick={handleCopy}
                    className="ml-4 px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity"
                >
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
        </div>
    );
};

export default SetupGuide;