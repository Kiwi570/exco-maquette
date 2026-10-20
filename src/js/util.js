// Petits outils partagés
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export const html = document.documentElement;
export const lang = () => (html.getAttribute('data-lang') === 'en' ? 'en' : 'fr');
export const T = (fr, en) => (lang() === 'en' ? en : fr);
export const reduced = () => html.classList.contains('rm') || html.classList.contains('calm');
export const finePointer = () => window.matchMedia('(pointer: fine)').matches;
export const base = () => document.body.getAttribute('data-base') || '';

// Générateur pseudo-aléatoire reproductible
export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const norm = (s) => (s || '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`-]/g, ' ').replace(/\bst\b/g, 'saint').replace(/\s+/g, ' ').trim();

export function haversine(a, b) {
  const R = 6371, toR = Math.PI / 180;
  const dLa = (b[0] - a[0]) * toR, dLo = (b[1] - a[1]) * toR;
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const cache = {};
export function getJSON(path) {
  if (!cache[path]) cache[path] = fetch(base() + path).then((r) => { if (!r.ok) throw new Error(path); return r.json(); });
  return cache[path];
}

export function onVisible(el, cb, opts = {}) {
  if (!('IntersectionObserver' in window)) { cb(true); return () => {}; }
  const io = new IntersectionObserver((es) => es.forEach((e) => cb(e.isIntersecting, e)), { rootMargin: opts.margin || '0px', threshold: opts.threshold || 0 });
  io.observe(el);
  return () => io.disconnect();
}

export function fitCanvas(c, maxDpr = 1.75) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const r = c.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return { w, h, dpr, cw: r.width, ch: r.height };
}

// Heures d'ouverture : statut à l'heure locale du cabinet
const DAYMAP = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const FMT = new Map(); // un format par fuseau, créé une seule fois
export function localNow(tz, date = new Date()) {
  try {
    let f = FMT.get(tz);
    if (!f) { f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); FMT.set(tz, f); }
    const p = f.formatToParts(date);
    const g = (t) => p.find((x) => x.type === t)?.value;
    return { day: DAYMAP[g('weekday')], min: (+g('hour')) * 60 + (+g('minute')) };
  } catch (e) {
    const d = date.getDay(); return { day: (d + 6) % 7, min: date.getHours() * 60 + date.getMinutes() };
  }
}
export const hhmm = (m) => { const h = Math.floor(m / 60), mm = m % 60; return lang() === 'en' ? `${h}:${String(mm).padStart(2, '0')}` : `${h}h${mm ? String(mm).padStart(2, '0') : ''}`; };
const DAYS_FR = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const dayName = (i) => (lang() === 'en' ? DAYS_EN : DAYS_FR)[i];

export function openStatus(c, date = new Date()) {
  if (!c.h) return { known: false, open: false, text: T('Horaires à compléter', 'Opening hours to be added') };
  const { day, min } = localNow(c.tz, date);
  const today = c.h[day] || [];
  for (const r of today) {
    if (min >= r[0] && min < r[1]) {
      const soon = r[1] - min <= 30;
      return { known: true, open: true, soon, rdv: !!r[2], text: (r[2] ? T('Sur rendez-vous, jusqu’à ', 'By appointment until ') : T('Ouvert, ferme à ', 'Open, closes at ')) + hhmm(r[1]) };
    }
  }
  // prochaine ouverture
  for (let k = 0; k < 8; k++) {
    const d = (day + k) % 7; const rs = c.h[d] || [];
    for (const r of rs) {
      if (k === 0 && r[0] <= min) continue;
      const when = k === 0 ? T('à ', 'at ') : k === 1 ? T('demain à ', 'tomorrow at ') : `${dayName(d)} ${T('à ', 'at ')}`;
      const re = k === 0 && today.some((x) => x[1] <= min) ? T('rouvre ', 'reopens ') : T('ouvre ', 'opens ');
      return { known: true, open: false, text: T('Fermé, ', 'Closed, ') + re + when + hhmm(r[0]) };
    }
  }
  return { known: true, open: false, text: T('Fermé', 'Closed') };
}

export function fmtNum(n) { return new Intl.NumberFormat(lang() === 'en' ? 'en-GB' : 'fr-FR').format(n); }
export function fmtDate(d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) { return new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'fr-FR', opts).format(d); }
