// theme utilities: apply and persist theme
export const THEME_KEY = 'pulse:theme';
export type Theme = 'classic' | 'cybertech';

export function getPreferredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored) return stored;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'cybertech' : 'classic';
  } catch (e) {
    return 'classic';
  }
}

export function applyTheme(t: Theme) {
  if (t === 'cybertech') {
    document.documentElement.setAttribute('data-theme', 'cybertech');
    // inject cyber css if not already
    if (!document.getElementById('cybertech-css')) {
      const l = document.createElement('link');
      l.id = 'cybertech-css';
      l.rel = 'stylesheet';
      l.href = '/styles/theme.cybertech.css';
      // Create overlays only after CSS loads so styles are applied
      l.onload = () => {
        try { createOverlays(); console.info('[theme] cybertech CSS loaded'); } catch (e) {}
      };
      l.onerror = () => { console.warn('[theme] failed to load cybertech CSS'); };
      document.head.appendChild(l);
    }
    // If CSS already present, ensure overlays now (createOverlays will check body readiness)
    if (document.getElementById('cybertech-css')) {
      try { createOverlays(); } catch (e) {}
    }
  } else {
    document.documentElement.removeAttribute('data-theme');
    const e = document.getElementById('cybertech-css');
    if (e) e.remove();
    const bg = document.getElementById('cyber-bg-hex'); if (bg) bg.remove();
    const sheen = document.getElementById('cyber-sheen'); if (sheen) sheen.remove();
    const glow = document.getElementById('cyber-glow'); if (glow) glow.remove();
    const mid = document.getElementById('cyber-hex-mid'); if (mid) mid.remove();
    const fore = document.getElementById('cyber-hex-fore'); if (fore) fore.remove();
    const portal = document.getElementById('cyber-portal'); if (portal) portal.remove();
    const pf = document.getElementById('cyber-portal-fallback'); if (pf) pf.remove();
    const anims = document.getElementById('cybertech-inline-anims'); if (anims) anims.remove();
  }
  try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
}

function createOverlays() {
  // createOverlay elements only when body exists; otherwise wait for DOMContentLoaded
  const setup = () => {
    // ensure a top-level portal that sits above all app stacking contexts
    let portal = document.getElementById('cyber-portal');
    if (!portal) {
      portal = document.createElement('div');
      portal.id = 'cyber-portal';
      portal.setAttribute('aria-hidden', 'true');
      // inline styles to make the portal dominant (avoid being trapped by other stacking contexts)
      portal.style.position = 'fixed';
      portal.style.inset = '0';
      portal.style.pointerEvents = 'none';
      // extremely high z-index to beat any app-level z-index
      portal.style.zIndex = '2147483647';
      // avoid transforms on the portal itself
      portal.style.transform = 'none';
      document.body.appendChild(portal);
    }

    // Inject a defensive stylesheet that forces portal children to remain on top
    if (!document.getElementById('cyber-portal-fallback')) {
      const s = document.createElement('style');
      s.id = 'cyber-portal-fallback';
      s.textContent = `#cyber-portal, #cyber-portal > * { position: fixed !important; inset: 0 !important; pointer-events: none !important; z-index: 2147483647 !important; transform: none !important; } #cyber-portal .cyber-bg-hex { background-repeat: repeat !important; }`;
      document.head.appendChild(s);
    }

    if (!document.getElementById('cyber-bg-hex')) {
      const d = document.createElement('div');
      d.id = 'cyber-bg-hex';
      d.className = 'cyber-bg-hex';
      d.setAttribute('aria-hidden', 'true');
      // inline fallback styles so the overlay shows even if attribute-scoped
      // CSS rules do not match or fail to load for some environments.
      d.style.position = 'fixed';
      d.style.inset = '0';
      d.style.backgroundImage = "url('/img/hex-grid.svg')";
      d.style.backgroundRepeat = 'repeat';
      d.style.backgroundSize = '160px 160px';
      d.style.backgroundPosition = '0 0';
      d.style.pointerEvents = 'none';
      d.style.opacity = '0.35';
      d.style.mixBlendMode = 'overlay';
      d.style.transform = 'translateZ(0)';
      d.style.zIndex = '9998';
      d.style.willChange = 'transform, opacity, background-position';
      d.style.animation = 'hex-drift 36s linear infinite';
  // append into the high-level portal to avoid stacking context issues
  (portal || document.body).appendChild(d);
      console.info('[theme] created cyber-bg-hex');
    }
    if (!document.getElementById('cyber-hex-mid')) {
      const m = document.createElement('div');
      m.id = 'cyber-hex-mid';
      m.className = 'cyber-hex-mid';
      m.setAttribute('aria-hidden', 'true');
      m.style.position = 'fixed';
      m.style.inset = '0';
      m.style.pointerEvents = 'none';
      m.style.backgroundImage = "url('/img/hex-grid.svg')";
      m.style.backgroundRepeat = 'repeat';
      m.style.backgroundSize = '240px 240px';
      m.style.backgroundPosition = '0 0';
      m.style.opacity = '0.25';
      m.style.mixBlendMode = 'overlay';
      m.style.zIndex = '2147483646';
      m.style.animation = 'hex-parallax-slow 46s linear infinite';
  (portal || document.body).appendChild(m);
      console.info('[theme] created cyber-hex-mid');
    }
    if (!document.getElementById('cyber-hex-fore')) {
      const f = document.createElement('div');
      f.id = 'cyber-hex-fore';
      f.className = 'cyber-hex-fore';
      f.setAttribute('aria-hidden', 'true');
      f.style.position = 'fixed';
      f.style.inset = '0';
      f.style.pointerEvents = 'none';
      f.style.backgroundImage = "url('/img/hex-grid.svg')";
      f.style.backgroundRepeat = 'repeat';
      f.style.backgroundSize = '112px 112px';
      f.style.backgroundPosition = '0 0';
      f.style.opacity = '0.2';
      f.style.mixBlendMode = 'overlay';
      f.style.zIndex = '2147483647';
      f.style.animation = 'hex-parallax-fast 28s linear infinite';
  (portal || document.body).appendChild(f);
      console.info('[theme] created cyber-hex-fore');
    }
    if (!document.getElementById('cyber-sheen')) {
      const d = document.createElement('div');
      d.id = 'cyber-sheen';
      d.className = 'cyber-sheen';
      d.setAttribute('aria-hidden', 'true');
      // inline fallback sheen
      d.style.position = 'fixed';
      d.style.inset = '0';
      d.style.backgroundImage = 'linear-gradient(transparent 96%, rgba(255,255,255,.045) 100%)';
      d.style.backgroundSize = '100% 32px';
      d.style.backgroundPosition = '0 0';
      d.style.mixBlendMode = 'overlay';
      d.style.pointerEvents = 'none';
      d.style.zIndex = '9999';
      d.style.opacity = '0.95';
      d.style.animation = 'sheen-move 6s linear infinite';
  (portal || document.body).appendChild(d);
      console.info('[theme] created cyber-sheen');
    }
    if (!document.getElementById('cyber-glow')) {
      const d = document.createElement('div');
      d.id = 'cyber-glow';
      d.className = 'cyber-glow';
      d.setAttribute('aria-hidden', 'true');
      // inline fallback glow: create two positioned children to mimic ::before/::after
      d.style.position = 'fixed';
      d.style.inset = '0';
      d.style.pointerEvents = 'none';
      d.style.zIndex = '9997';
      const b = document.createElement('div');
      const a = document.createElement('div');
      // before
      b.style.position = 'absolute';
      b.style.left = '-10%';
      b.style.top = '-10%';
      b.style.width = '50%';
      b.style.height = '50%';
      b.style.filter = 'blur(40px)';
      b.style.opacity = '0.28';
      b.style.mixBlendMode = 'screen';
      b.style.background = 'radial-gradient(circle at 20% 20%, rgba(0,173,181,0.55), transparent 40%)';
      // after
      a.style.position = 'absolute';
      a.style.right = '-10%';
      a.style.bottom = '-8%';
      a.style.width = '50%';
      a.style.height = '50%';
      a.style.filter = 'blur(40px)';
      a.style.opacity = '0.28';
      a.style.mixBlendMode = 'screen';
      a.style.background = 'radial-gradient(circle at 80% 80%, rgba(138,92,246,0.28), transparent 35%)';
      // pulsing animations for glow accents
      b.style.animation = 'glow-pulse 6s ease-in-out infinite';
      a.style.animation = 'glow-pulse 8s ease-in-out infinite';
      d.appendChild(b);
      d.appendChild(a);
  (portal || document.body).appendChild(d);
      console.info('[theme] created cyber-glow');
    }
  };

  // Inject minimal keyframes fallback so inline animations run even if the
  // stylesheet with full authoring is not applied for some reason.
  if (!document.getElementById('cybertech-inline-anims')) {
    const s = document.createElement('style');
    s.id = 'cybertech-inline-anims';
    s.textContent = `
@keyframes hex-drift { 0% { transform: translate3d(0,0,0) rotate(0deg); background-position: 0 0; } 50% { transform: translate3d(-12px,6px,0) rotate(180deg); background-position: -80px 40px; } 100% { transform: translate3d(0,0,0) rotate(360deg); background-position: 0 0; } }
@keyframes hex-parallax-slow { 0% { transform: translate3d(0,0,0); background-position: 0 0; } 50% { transform: translate3d(-8px,4px,0); background-position: -60px 30px; } 100% { transform: translate3d(0,0,0); background-position: 0 0; } }
@keyframes hex-parallax-fast { 0% { transform: translate3d(0,0,0); background-position: 0 0; } 50% { transform: translate3d(-24px,12px,0); background-position: -160px 80px; } 100% { transform: translate3d(0,0,0); background-position: 0 0; } }
@keyframes hex-rotate { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
@keyframes sheen-move { 0% { background-position: 0 0; } 100% { background-position: 0 48px; } }
@keyframes glow-pulse { 0% { opacity: .22; filter: blur(36px); } 50% { opacity: .42; filter: blur(20px); } 100% { opacity: .22; filter: blur(36px); } }
`;
    document.head.appendChild(s);
  }

  if (document.body) {
    setup();
  } else {
    window.addEventListener('DOMContentLoaded', () => setup(), { once: true });
    console.info('[theme] waiting for DOMContentLoaded to create overlays');
  }
}

export function initTheme() {
  const t = getPreferredTheme();
  applyTheme(t);
}
