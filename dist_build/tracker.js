
// Single IIFE tracker with enhanced metrics and custom API
(function() {
  if (document.visibilityState === 'prerender') return;

  // locate the running <script> element (works when bundled or inlined)
  const scriptEl = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const scriptUrl = new URL((scriptEl && scriptEl.src) || location.href, location.href);

  // Allow overriding the API/base URL from the script tag with either:
  //  - <script src="/tracker.js" data-api-url="https://api.example.com/api/track"></script>
  //  - <script src="https://.../tracker.js?api=https://api.example.com"></script>
  //  - <script src="/tracker.js" data-base-url="https://api.example.com"></script>
  const apiAttr = (scriptEl && scriptEl.getAttribute && (
    scriptEl.getAttribute('data-api-url') ||
    scriptEl.getAttribute('data-base-url') ||
    scriptUrl.searchParams.get('api') ||
    scriptUrl.searchParams.get('base')
  )) || null;

  let trackUrl;
  if (apiAttr) {
    try {
      // resolve relative or absolute values against the script origin
      const resolved = new URL(apiAttr, scriptUrl.origin);
      if (resolved.pathname.endsWith('/api/track')) {
        trackUrl = resolved.href;
      } else {
        trackUrl = `${resolved.origin}${resolved.pathname.replace(/\/$/, '')}/api/track`;
      }
    } catch (e) {
      trackUrl = `${scriptUrl.origin}/api/track`;
    }
  } else {
    trackUrl = `${scriptUrl.origin}/api/track`;
  }

  const now = Date.now();
  const sessionWindowMs = 30 * 60 * 1000; // 30 minutes

  const getDeviceType = () => {
    const ua = navigator.userAgent || '';
    if (/Mobile|Android|iP(hone|od)/i.test(ua)) return 'mobile';
    if (/Tablet|iPad/i.test(ua)) return 'tablet';
    return 'desktop';
  };

  const send = (payload, opts = {}) => {
    try {
      const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(trackUrl, blob);
        return;
      }
      fetch(trackUrl, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        ...opts
      }).catch(() => {});
    } catch (e) {
      // silence errors in tracker
    }
  };

  // basic performance metrics
  const getPerf = () => {
    try {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        timeToFirstByte: nav.responseStart || 0,
        domContentLoaded: nav.domContentLoadedEventEnd || 0,
        loadEvent: nav.loadEventEnd || 0
      };
    } catch (e) {
      return {};
    }
  };

  // track scroll depth (percent) - keep the max value
  let maxScroll = 0;
  const onScroll = () => {
    const scrolled = window.scrollY || window.pageYOffset || 0;
    const height = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
    const percent = height > 0 ? Math.round((scrolled / height) * 100) : 0;
    if (percent > maxScroll) maxScroll = percent;
  };

  let start = now;
  window.addEventListener('scroll', throttle(onScroll, 250), { passive: true });

  // click tracking for outbound links
  const onClick = (e) => {
    try {
      const el = e.target && (e.target.closest ? e.target.closest('a') : null);
      if (!el || !el.href) return;
      const href = el.href;
      const sameHost = new URL(href, location.href).host === location.host;
      if (!sameHost) {
        send({
          type: 'outbound_click',
          title: document.title,
          href,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {}
  };
  document.addEventListener('click', onClick, true);

  // beforeunload / visibilitychange send time on page
  const sendUnload = () => {
    const duration = Math.round((Date.now() - start) / 1000);
    const payload = buildPayload();
    payload.type = 'page_unload';
    payload.timeOnPage = duration; // seconds
    payload.scrollDepth = maxScroll;
    send(payload);
  };

  window.addEventListener('beforeunload', sendUnload, { capture: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') sendUnload();
  });

  function buildPayload() {
    return {
      type: 'pageview',
      page: location.pathname + location.search,
      referrer: document.referrer || '',
      userAgent: navigator.userAgent || '',
      timestamp: new Date().toISOString(),
      screen: { width: screen.width, height: screen.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      deviceType: getDeviceType(),
      performance: getPerf(),
      _sessionWindow: sessionWindowMs
    };
  }

  // initial send
  send(buildPayload());

  // expose custom tracking API
  window.pulseAnalytics = window.pulseAnalytics || {};
  window.pulseAnalytics.track = function(eventName, properties) {
    if (!eventName) return;
    const payload = {
      type: 'custom_event',
      eventName,
      properties: properties || {},
      timestamp: new Date().toISOString(),
      page: location.pathname + location.search
    };
    send(payload);
  };

  // small throttle helper
  function throttle(fn, wait) {
    let last = 0;
    let timer = null;
    return function(...args) {
      const now = Date.now();
      const remaining = wait - (now - last);
      if (remaining <= 0) {
        if (timer) { clearTimeout(timer); timer = null; }
        last = now;
        fn.apply(this, args);
      } else if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn.apply(this, args);
        }, remaining);
      }
    };
  }

})();
