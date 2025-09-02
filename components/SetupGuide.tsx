import React, { useState, useEffect } from 'react';

const SetupGuide: React.FC = () => {
    const [copied, setCopied] = useState(false);
    const [trackerUrl, setTrackerUrl] = useState('/tracker.js');

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location) {
            setTrackerUrl(`${window.location.origin}/tracker.js`);
        }
    }, []);

    const scriptTag = `<script async defer src="${trackerUrl}"></script>`;

    const handleCopy = () => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(scriptTag).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        } else {
            // Fallback for older browsers
            const ta = document.createElement('textarea');
            ta.value = scriptTag;
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (e) {
                // ignore
            }
            document.body.removeChild(ta);
        }
    };

    return (
        <div className="bg-secondary border border-border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Get Started</h2>
            <p className="text-muted-foreground mb-4">
                To start tracking pageviews, add the following script tag to the <code>&lt;head&gt;</code> section of your website's HTML.
            </p>
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