import { Lenis } from '../vendor/lenis/lenis.ts';
import { $, $$, html, lang, reduced, finePointer, fmtNum, T } from './util.js';
import { Roots, animateRoots } from './roots.js';

const gsap = window.gsap;
export let lenis = null;

// ---------- langues ----------
export function applyLang() {
  const L = lang();
  const other = L === 'en' ? 'fr' : 'en';
  $$(`[lang="${other}"]`).forEach((n) => { if (n !== html) n.remove(); });
  if (L === 'en') {
    $$('[data-en-placeholder]').forEach((e) => (e.placeholder = e.dataset.enPlaceholder));
    $$('[data-en-alt]').forEach((e) => (e.alt = e.dataset.enAlt));
    $$('[data-en-aria-label]').forEach((e) => e.setAttribute('aria-label', e.dataset.enAriaLabel));
    $$('[data-en-title]').forEach((e) => (e.title = e.dataset.enTitle));
    const t = document.querySelector('meta[name="title-en"]'); if (t) document.title = t.content;
  }
  $$('[data-lang-toggle]').forEach((b) => b.addEventListener('click', () => {
    try { localStorage.setItem('exco-lang', L === 'en' ? 'fr' : 'en'); } catch (e) {}
    leave(location.href.split('#')[0] + location.hash, true);
  }));
  $$('[data-calm-toggle]').forEach((b) => {
    const on = html.classList.contains('calm');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on) b.textContent = T('Réactiver les animations', 'Turn animations back on');
    b.addEventListener('click', () => { try { localStorage.setItem('exco-calm', on ? '0' : '1'); } catch (e) {} location.reload(); });
  });
}

// ---------- défilement fluide ----------
export function initScroll() {
  gsap.registerPlugin(window.ScrollTrigger);
  if (window.SplitText) gsap.registerPlugin(window.SplitText);
  if (window.DrawSVGPlugin) gsap.registerPlugin(window.DrawSVGPlugin);
  if (window.CustomEase) { gsap.registerPlugin(window.CustomEase); window.CustomEase.create('sprout', 'M0,0 C0.2,0.7 0.3,1.04 0.55,1.02 0.75,1 0.85,1 1,1'); }
  if (!reduced()) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true, anchors: false });
    lenis.on('scroll', window.ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // ancres internes
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(t);
    history.replaceState(null, '', id);
  });
  if (location.hash && location.hash.length > 1) {
    const t = document.querySelector(location.hash);
    if (t) setTimeout(() => scrollToEl(t, true), 300);
  }
}
export function scrollToEl(t, immediate = false) {
  const off = -(parseInt(getComputedStyle(html).getPropertyValue('--hd-h')) || 72) - 8;
  if (lenis) lenis.scrollTo(t, { offset: off, duration: immediate ? 0 : 1.4, immediate });
  else window.scrollTo({ top: t.getBoundingClientRect().top + scrollY + off, behavior: reduced() ? 'auto' : 'smooth' });
}

// ---------- en-tête ----------
export function initHeader() {
  const hd = $('[data-hd]'); if (!hd) return;
  const hero = $('[data-hero]');
  if (hero) hd.classList.add('on-dark');
  let last = 0;
  const upd = () => {
    const y = window.scrollY;
    hd.classList.toggle('is-solid', y > 40 && (!hero || y > hero.offsetHeight - 80));
    if (hero && y <= hero.offsetHeight - 80) hd.classList.remove('is-solid');
    if (!html.classList.contains('menu-open')) hd.classList.toggle('is-up', y > 400 && y > last + 2);
    if (y < last - 2) hd.classList.remove('is-up');
    last = y;
  };
  window.addEventListener('scroll', upd, { passive: true }); upd();
  // sections actives
  const links = $$('.hd__nav a[href^="#"]');
  links.forEach((a) => {
    const s = document.querySelector(a.getAttribute('href')); if (!s) return;
    window.ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onToggle: (st) => a.classList.toggle('is-current', st.isActive) });
  });
}

// ---------- menu mobile ----------
let menuRoots = null;
export function closeMenu() {
  const b = $('[data-burger]'), m = $('[data-menu]');
  if (!b || b.getAttribute('aria-expanded') !== 'true') return;
  b.setAttribute('aria-expanded', 'false'); html.classList.remove('menu-open');
  if (lenis) lenis.start();
  gsap.to(m, { clipPath: 'circle(0% at 100% 0%)', duration: reduced() ? 0 : .6, ease: 'power3.inOut', onComplete: () => { m.hidden = true; menuRoots && menuRoots.stop(); } });
}
export function initMenu() {
  const b = $('[data-burger]'), m = $('[data-menu]'); if (!b || !m) return;
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-expanded') === 'true') return closeMenu();
    b.setAttribute('aria-expanded', 'true'); m.hidden = false; html.classList.add('menu-open');
    if (lenis) lenis.stop();
    gsap.fromTo(m, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: reduced() ? 0 : .8, ease: 'power3.inOut' });
    gsap.fromTo($$('.menu__nav a', m), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .05, duration: .7, delay: .2, ease: 'power3.out' });
    const c = $('[data-menu-roots]', m);
    if (c && !reduced()) {
      const r = new Roots(c, { seeds: [{ x: .95, y: 0, a: 2.2 }, { x: .7, y: 0, a: 1.8 }, { x: 1, y: .4, a: 2.8 }], color: 'rgba(237,229,211,.22)', glow: 'rgba(245,154,0,.06)', width: 2, life: 200, seed: 11, pulses: 4 });
      menuRoots && menuRoots.stop(); menuRoots = animateRoots(r, { perFrame: 4 });
    }
    $('.menu__nav a', m)?.focus({ preventScroll: true });
  });
  m.addEventListener('click', (e) => { if (e.target.closest('[data-menu-link]')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

// ---------- curseur graine ----------
export function initCursor() {
  if (!finePointer() || reduced()) return;
  const cur = $('[data-cursor]'); if (!cur) return;
  html.classList.add('has-cursor');
  const seed = $('.cursor__seed', cur), ring = $('.cursor__ring', cur), lab = $('[data-cursor-label]', cur);
  const xs = gsap.quickTo(seed, 'x', { duration: .08 }), ys = gsap.quickTo(seed, 'y', { duration: .08 });
  const xr = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), yr = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  const xl = gsap.quickTo(lab, 'x', { duration: .3 }), yl = gsap.quickTo(lab, 'y', { duration: .3 });
  window.addEventListener('pointermove', (e) => { xs(e.clientX); ys(e.clientY); xr(e.clientX); yr(e.clientY); xl(e.clientX); yl(e.clientY); cur.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, label, summary, [data-tilt], [data-cursor-text], input, select, textarea');
    cur.classList.toggle('is-link', !!t && !t.matches('input, select, textarea'));
    const txt = e.target.closest('[data-cursor-text]');
    if (txt) { lab.textContent = txt.getAttribute('data-cursor-text'); cur.classList.add('has-label'); } else cur.classList.remove('has-label');
  });
}

// ---------- boutons magnétiques ----------
export function initMagnetic() {
  $$('.btn').forEach((b) => b.addEventListener('pointerenter', (e) => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', `${e.clientX - r.left}px`); }));
  if (!finePointer() || reduced()) return;
  $$('[data-magnetic]').forEach((b) => {
    const x = gsap.quickTo(b, 'x', { duration: .5, ease: 'elastic.out(1,.4)' }), y = gsap.quickTo(b, 'y', { duration: .5, ease: 'elastic.out(1,.4)' });
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .28); y((e.clientY - r.top - r.height / 2) * .38); });
    b.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

// ---------- transitions de page ----------
export function leave(url, force = false) {
  const v = $('[data-veil]');
  if (reduced() || !v) { location.href = url; return; }
  html.classList.add('is-leaving');
  try { sessionStorage.setItem('exco-veil', '1'); } catch (e) {}
  const c = $('canvas', v);
  if (c) { const r = new Roots(c, { seeds: [{ x: .5, y: 1, a: -Math.PI / 2 }, { x: .2, y: 1, a: -1.3 }, { x: .8, y: 1, a: -1.8 }], gravity: -0.06, color: 'rgba(237,229,211,.25)', glow: 'rgba(245,154,0,.08)', width: 2.4, life: 120, seed: 5 }); animateRoots(r, { perFrame: 6 }); }
  gsap.fromTo(v, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .7, ease: 'power3.inOut', onComplete: () => { location.href = url; } });
}
export function initTransitions() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-transition]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    e.preventDefault(); closeMenu(); leave(a.href);
  });
  const v = $('[data-veil]');
  let came = false; try { came = sessionStorage.getItem('exco-veil') === '1'; sessionStorage.removeItem('exco-veil'); } catch (e) {}
  if (v && came && !reduced()) {
    gsap.set(v, { clipPath: 'inset(0% 0 0 0)' });
    gsap.to(v, { clipPath: 'inset(0 0 100% 0)', duration: .9, delay: .1, ease: 'power3.inOut' });
    return true;
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) { html.classList.remove('is-leaving'); gsap.set(v, { clipPath: 'inset(100% 0 0 0)' }); } });
  return false;
}

// ---------- ouverture orchestrée (accueil) ----------
export function runIntro() {
  return new Promise((resolve) => {
    const intro = $('[data-intro]');
    if (!intro || reduced() || html.classList.contains('intro-seen') || getComputedStyle(intro).display === 'none') { intro && intro.remove(); resolve(); return; }
    try { sessionStorage.setItem('exco-intro', '1'); } catch (e) {}
    if (lenis) lenis.stop();
    const c = $('[data-intro-roots]', intro), seed = $('.intro__seed', intro), logo = $('.intro__logo', intro);
    const r = new Roots(c, { seeds: Array.from({ length: 7 }, (_, i) => ({ x: .5, y: .5, a: i * (Math.PI * 2 / 7) + .3 })), gravity: 0, curl: .3, color: 'rgba(29,25,19,.55)', glow: 'rgba(245,154,0,.12)', width: 2.2, life: 140, branch: .06, seed: 2, pulses: 6, speed: 9 });
    const anim = animateRoots(r, { perFrame: 5 });
    const tl = gsap.timeline({ onComplete: () => { anim.stop(); intro.remove(); if (lenis) lenis.start(); resolve(); } });
    tl.fromTo(seed, { scale: 0 }, { scale: 1, duration: .45, ease: 'back.out(3)' })
      .to(seed, { boxShadow: '0 0 0 18px rgba(245,154,0,0)', duration: .6 }, '<.2')
      .to(logo, { opacity: 1, y: -6, duration: .6, ease: 'power2.out' }, .55)
      .to(seed, { scale: 0, duration: .3 }, .6)
      .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: .9, ease: 'power4.inOut' }, 1.55);
  });
}

// ---------- titres qui germent ----------
export function germinate(root = document) {
  if (!window.SplitText) return;
  $$('[data-germinate]', root).forEach((h) => {
    if (h.dataset.split) return; h.dataset.split = '1';
    const split = new window.SplitText(h, { type: 'lines,chars', linesClass: 'germ-line', charsClass: 'germ-char' });
    if (reduced()) return;
    const final = parseFloat(getComputedStyle(h).fontWeight) || 380;
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(split.chars, { yPercent: 110, rotate: () => (Math.random() - .5) * 14, transformOrigin: '50% 100%', scaleY: .6 },
      { yPercent: 0, rotate: 0, scaleY: 1, duration: 1.1, ease: 'sprout', stagger: { each: .018, from: 'start' } })
      .fromTo(h, { fontWeight: Math.max(150, final - 220) }, { fontWeight: final, duration: 1.6, ease: 'power2.out' }, 0);
    h._germ = tl;
    if (h.closest('[data-hero]')) return; // déclenché après l'ouverture
    window.ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => tl.play() });
  });
}

// ---------- texte semé : les mots s'éclairent au défilement ----------
export function sow() {
  if (!window.SplitText || reduced()) return;
  $$('[data-sow]').forEach((p) => {
    const s = new window.SplitText(p, { type: 'words', wordsClass: 'w' });
    gsap.fromTo(s.words, { opacity: .16 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true } });
  });
}

// ---------- parallaxe ----------
export function parallax() {
  if (reduced()) return;
  $$('[data-parallax]').forEach((img) => {
    const k = parseFloat(img.dataset.parallax) || .1;
    gsap.fromTo(img, { yPercent: -k * 50 }, { yPercent: k * 50, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-arch]').forEach((f) => {
    const a = $('.manifest__arch', f) || f;
    gsap.fromTo(a, { clipPath: 'inset(40% 10% 0% 10% round 999px 999px 14px 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 999px 999px 14px 14px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 90%', end: 'top 30%', scrub: true } });
  });
}

// ---------- chiffres qui sortent de terre ----------
export function counters() {
  $$('[data-count]').forEach((n) => {
    const target = +n.dataset.count, pre = n.dataset.prefix || '';
    const str = pre + fmtNum(target);
    n.setAttribute('aria-label', str);
    n.innerHTML = str.split('').map((ch) => `<span class="digit" aria-hidden="true">${ch === ' ' || ch === ' ' || ch === ' ' ? '&#8239;' : ch}</span>`).join('');
    if (reduced()) return;
    const ds = $$('.digit', n);
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(ds, { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 1.1, ease: 'sprout', stagger: .07 });
    // les chiffres défilent avant de se poser
    ds.forEach((d) => {
      const fin = d.textContent; if (!/\d/.test(fin)) return;
      const o = { v: 0 };
      tl.to(o, { v: 1, duration: .9, ease: 'none', onUpdate: () => { d.textContent = o.v < .92 ? String((Math.random() * 10) | 0) : fin; } }, 0);
    });
    window.ScrollTrigger.create({ trigger: n, start: 'top 85%', once: true, onEnter: () => tl.play() });
  });
}

// ---------- copier ----------
export function copyables() {
  $$('[data-copy]').forEach((el) => {
    el.setAttribute('role', 'button'); el.tabIndex = 0;
    el.title = T('Cliquer pour copier', 'Click to copy');
    const go = async () => {
      const v = el.dataset.copy;
      try { await navigator.clipboard.writeText(v); el.classList.add('is-copied'); const o = el.textContent; el.textContent = T('Copié', 'Copied'); setTimeout(() => { el.textContent = o; el.classList.remove('is-copied'); }, 1400); }
      catch (e) { const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    };
    el.addEventListener('click', go); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  });
}

// ---------- inclinaison 3D ----------
export function tilt() {
  if (!finePointer() || reduced()) return;
  $$('[data-tilt]').forEach((c) => {
    const rx = gsap.quickTo(c, 'rotationX', { duration: .6, ease: 'power3' }), ry = gsap.quickTo(c, 'rotationY', { duration: .6, ease: 'power3' });
    c.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 14); rx(-((e.clientY - r.top) / r.height - .5) * 12); });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

// ---------- pied de page : descente sous terre ----------
export function footerRoots() {
  const c = $('[data-footer-roots]'); if (!c) return;
  let started = false;
  window.ScrollTrigger.create({
    trigger: c.closest('footer'), start: 'top 85%', once: true, onEnter: () => {
      if (started) return; started = true;
      const r = new Roots(c, { seeds: Array.from({ length: 11 }, (_, i) => ({ x: (i + .5) / 11, y: 0, a: Math.PI / 2 + (Math.random() - .5) * .5, k: .6 + Math.random() * .8 })), color: 'rgba(237,229,211,.16)', glow: 'rgba(245,154,0,.05)', width: 2.2, life: 260, branch: .04, seed: 19, pulses: reduced() ? 0 : 7 });
      if (reduced()) { r.growAll(); r.render(); } else animateRoots(r, { perFrame: 4 });
    },
  });
}
