// Petits effets d'interface (v10) : image qui passe d'une page à l'autre, halo sous le pointeur,
// barre de lecture, exemples tapés dans la recherche. Tout s'arrête si l'on a demandé moins d'animations.
import { $, $$, reduced, finePointer, T, lang, onVisible } from './util.js';

const gsap = window.gsap;

// vignettes qui peuvent « devenir » l'image d'en-tête de la page suivante
const SRC = '.sector__img, .art__img, .tile__img';
const HERO = '[data-hero] .ihero__media, [data-hero] .cab-hero__media, [data-hero] .article__cover';
const inView = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; };

// ---------- 1. l'image de la carte cliquée s'agrandit jusqu'à l'en-tête de la page ouverte ----------
// (View Transitions entre documents ; la page d'arrivée nomme son image dans le script d'en-tête)
export function initMorph() {
  if (!('onpageswap' in window)) return;
  let src = null;
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-transition]');
    // lien vers une ancre : la page d'arrivée défile, l'en-tête ne sera pas à l'écran
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button || reduced() || a.hash) return;
    let m = a.querySelector(SRC);
    // fiche du cabinet ouverte sur la carte : sa photo part vers la page du cabinet
    if (!m) { const mc = a.closest('[data-map-card]'); if (mc && /cabinets\//.test(a.getAttribute('href') || '')) m = $('.mc__img', mc); }
    if (!m || !inView(m)) return;
    src = m;
    try { sessionStorage.setItem('exco-vt', '1'); } catch (er) { /* rien */ }
  }, true);
  window.addEventListener('pageswap', (e) => {
    if (!e.viewTransition || reduced()) return;
    const act = e.activation;
    // retour arrière : l'image d'en-tête revient se loger dans sa vignette
    const el = act && act.navigationType === 'traverse' ? $(HERO) : src;
    if (el && inView(el)) el.style.viewTransitionName = 'vt-media';
  });
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    src = null;
    $$('[style*="view-transition-name"]').forEach((x) => { x.style.viewTransitionName = ''; });
  });
}

// ---------- 2. halo discret qui suit le pointeur sur les cartes ----------
const SPOT = '.svc-feature, .mgrid li, .sec-more, .ev--next, .card, .gains li';
export function initSpot() {
  if (!finePointer() || reduced() || !gsap) return;
  let cur = null, raf = 0, ev = null;
  const off = (el) => gsap.to(el, { '--spot': 0, duration: .5, ease: 'power2.out', overwrite: true });
  const tick = () => {
    raf = 0;
    const el = ev.target && ev.target.closest ? ev.target.closest(SPOT) : null;
    if (el !== cur) {
      if (cur) off(cur);
      cur = el;
      if (cur) gsap.to(cur, { '--spot': 1, duration: .45, ease: 'power2.out', overwrite: true });
    }
    if (el) { const r = el.getBoundingClientRect(); el.style.setProperty('--sx', `${Math.round(ev.clientX - r.left)}px`); el.style.setProperty('--sy', `${Math.round(ev.clientY - r.top)}px`); }
  };
  document.addEventListener('pointermove', (e) => { ev = e; if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { if (cur) { off(cur); cur = null; } });
}

// ---------- 3. barre de lecture sur les pages de contenu ----------
export function initReadBar() {
  const p = document.body.dataset.page;
  if (!['article', 'metier', 'legal', 'sector', 'service', 'service-generic'].includes(p)) return;
  if (!(window.CSS && CSS.supports('animation-timeline: scroll()'))) return;
  const b = document.createElement('div'); b.className = 'readbar'; b.setAttribute('aria-hidden', 'true');
  document.body.appendChild(b);
}

// ---------- 4. recherche de l'accueil : des exemples réels se tapent dans le champ ----------
export function initTypeHint() {
  const inp = $('#hero-q'); if (!inp || reduced()) return;
  const ex = ['Albi', '64100', 'Papeete', 'Cotonou', 'Bordeaux'];
  const base = inp.placeholder;
  let vis = true, stop = false, timer = 0;
  const wait = (ms) => new Promise((r) => { timer = setTimeout(r, ms); });
  const idle = () => !stop && vis && !inp.value && document.activeElement !== inp;
  const halt = () => { stop = true; clearTimeout(timer); inp.placeholder = base; };
  inp.addEventListener('focus', halt);
  inp.addEventListener('input', halt);
  onVisible(inp, (v) => { vis = v; });
  const run = async () => {
    await wait(3200);
    for (let k = 0; idle(); k = (k + 1) % ex.length) {
      const w = (lang() === 'en' ? 'e.g. ' : 'Ex. : ') + ex[k];
      for (let i = 1; i <= w.length && idle(); i++) { inp.placeholder = w.slice(0, i) + '|'; await wait(i < 6 ? 30 : 85); }
      if (!idle()) break;
      inp.placeholder = w; await wait(1500);
      for (let i = w.length; i >= 0 && idle(); i--) { inp.placeholder = w.slice(0, i); await wait(28); }
      if (k === ex.length - 1) { inp.placeholder = base; await wait(5000); }
    }
    if (!stop) inp.placeholder = base;
    // la section repasse à l'écran : on reprend
    if (!stop) { let re = null; re = onVisible(inp, (v) => { if (v && idle()) { re && re(); run(); } }); }
  };
  run();
}

// ---------- 5. cases « Lire la suite » : le texte se déplie au lieu d'apparaître d'un coup ----------
export function foldTo(box, open, done) {
  if (reduced() || !gsap) { box.classList.toggle('is-clamped', !open); done && done(); return; }
  const h0 = box.offsetHeight;
  if (open) {
    box.classList.remove('is-clamped');
    const h1 = box.scrollHeight;
    gsap.fromTo(box, { height: h0, overflow: 'hidden' }, { height: h1, duration: Math.min(.9, .4 + (h1 - h0) / 3000), ease: 'power3.inOut', onComplete: () => { gsap.set(box, { clearProps: 'height,overflow' }); done && done(); } });
  } else {
    const lim = parseFloat(getComputedStyle(box).getPropertyValue('--more-h')) || 640;
    gsap.to(box, { height: lim, overflow: 'hidden', duration: .55, ease: 'power3.inOut', onComplete: () => { box.classList.add('is-clamped'); gsap.set(box, { clearProps: 'height,overflow' }); done && done(); } });
  }
}

// curseur : libellé sur le globe que l'on peut faire tourner
export function cursorText(el, fr, en) { if (el) el.setAttribute('data-cursor-text', T(fr, en)); }
