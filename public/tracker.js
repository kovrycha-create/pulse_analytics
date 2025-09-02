
(function() {
  if (document.visibilityState === 'prerender') {
    return;
  }

  // Use the path of the script itself to determine the API endpoint
  const scriptUrl = new URL(document.currentScript.src);
  const trackUrl = `${scriptUrl.origin}/api/track`;

  const payload = {
    page: window.location.pathname,
    referrer: document.referrer,
    userAgent: navigator.userAgent,
    timestamp: new Date().toISOString()
  };

  // Use sendBeacon if available for robustness, otherwise fallback to fetch
  if (navigator.sendBeacon) {
    const headers = { type: 'application/json' };
    const blob = new Blob([JSON.stringify(payload)], headers);
    navigator.sendBeacon(trackUrl, blob);
  } else {
    fetch(trackUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      },
      keepalive: true
    }).catch(console.error);
  }
})();
