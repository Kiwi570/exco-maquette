import { Lenis } from '../vendor/lenis/lenis.ts';
import { $, $$, html, lang, reduced, finePointer, fmtNum, T } from './util.js';

const gsap = window.gsap;
export let lenis = null;

// ---------- langues ----------
export function applyLang() {
  const L = lang();
  const other = L === 'en' ? 'fr' : 'en';
  $$(`[lang="${other}"]:not([data-keep])`).forEach((n) => { if (n !== html) n.remove(); });
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
  // notes de maquette (à compléter, à confirmer) : affichées par défaut, masquables pour une présentation
  $$('[data-notes-toggle]').forEach((b) => {
    const off = html.classList.contains('notes-off');
    b.setAttribute('aria-pressed', off ? 'true' : 'false');
    if (off) b.textContent = T('Afficher les notes de maquette', 'Show mock-up notes');
    b.addEventListener('click', () => { try { localStorage.setItem('exco-notes', off ? '1' : '0'); } catch (e) {} location.reload(); });
  });
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
  if (window.CustomEase) { gsap.registerPlugin(window.CustomEase); window.CustomEase.create('exco', 'M0,0 C0.18,0.62 0.28,1 0.6,1 0.8,1 0.9,1 1,1'); }
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
    let t = null; try { t = document.querySelector(id); } catch (err) {}
    if (!t) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(t);
    history.replaceState(null, '', id);
    // le focus suit l'ancre (lien d'évitement, sommaire) : le Tab suivant part de la cible
    if (!t.matches('a, button, input, select, textarea, [tabindex]')) t.setAttribute('tabindex', '-1');
    t.focus({ preventScroll: true });
  });
  if (location.hash && location.hash.length > 1) {
    let t = null; try { t = document.querySelector(location.hash); } catch (e) {}
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
  if (hero && hero.classList.contains('hero--dark')) hd.classList.add('on-dark');
  let last = 0;
  const upd = () => {
    const y = window.scrollY;
    // fond dès le premier défilement : le contenu ne passe jamais sous des liens transparents
    hd.classList.toggle('is-solid', y > 8);
    if (!html.classList.contains('menu-open')) hd.classList.toggle('is-up', y > 400 && y > last + 2);
    if (y < last - 2) hd.classList.remove('is-up');
    last = y;
  };
  window.addEventListener('scroll', upd, { passive: true }); upd();
  // au clavier, l'en-tête reste visible tant qu'un de ses liens a le focus
  hd.addEventListener('focusin', (e) => { if (e.target.matches(':focus-visible')) hd.classList.remove('is-up'); });
  // sections actives
  const links = $$('.hd__nav a[href^="#"]');
  links.forEach((a) => {
    const s = document.querySelector(a.getAttribute('href')); if (!s) return;
    window.ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onToggle: (st) => a.classList.toggle('is-current', st.isActive) });
  });
}

// ---------- menu mobile ----------
export function closeMenu() {
  const b = $('[data-burger]'), m = $('[data-menu]');
  if (!b || b.getAttribute('aria-expanded') !== 'true') return;
  b.setAttribute('aria-expanded', 'false'); html.classList.remove('menu-open');
  $$('main, .ft').forEach((x) => { x.inert = false; });
  if (m.contains(document.activeElement)) b.focus();
  if (lenis) lenis.start();
  gsap.to(m, { clipPath: 'circle(0% at 100% 0%)', duration: reduced() ? 0 : .6, ease: 'power3.inOut', onComplete: () => { m.hidden = true; } });
}
export function initMenu() {
  const b = $('[data-burger]'), m = $('[data-menu]'); if (!b || !m) return;
  b.addEventListener('click', () => {
    if (b.getAttribute('aria-expanded') === 'true') return closeMenu();
    b.setAttribute('aria-expanded', 'true'); m.hidden = false; html.classList.add('menu-open');
    // fenêtre de menu : la page derrière devient inerte, le focus reste dans le menu
    $$('main, .ft').forEach((x) => { x.inert = true; });
    if (lenis) lenis.stop();
    gsap.fromTo(m, { clipPath: 'circle(0% at 100% 0%)' }, { clipPath: 'circle(150% at 100% 0%)', duration: reduced() ? 0 : .8, ease: 'power3.inOut' });
    gsap.fromTo($$('.menu__nav > *', m), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: .05, duration: .7, delay: .2, ease: 'power3.out' });
    $('.menu__nav > a, .menu__nav summary', m)?.focus({ preventScroll: true });
  });
  m.addEventListener('click', (e) => { if (e.target.closest('[data-menu-link]')) closeMenu(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenu(); return; }
    if (e.key !== 'Tab' || b.getAttribute('aria-expanded') !== 'true') return;
    const f = [b, ...$$('a, button, summary', m).filter((x) => x.getClientRects().length)];
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { e.preventDefault(); f[0].focus(); }
  });
}

// ---------- curseur ----------
export function initCursor() {
  if (!finePointer() || reduced()) return;
  const cur = $('[data-cursor]'); if (!cur) return;
  html.classList.add('has-cursor');
  const dot = $('.cursor__dot', cur), ring = $('.cursor__ring', cur), lab = $('[data-cursor-label]', cur);
  const xs = gsap.quickTo(dot, 'x', { duration: .08 }), ys = gsap.quickTo(dot, 'y', { duration: .08 });
  const xr = gsap.quickTo(ring, 'x', { duration: .45, ease: 'power3' }), yr = gsap.quickTo(ring, 'y', { duration: .45, ease: 'power3' });
  const xl = gsap.quickTo(lab, 'x', { duration: .3 }), yl = gsap.quickTo(lab, 'y', { duration: .3 });
  window.addEventListener('pointermove', (e) => { xs(e.clientX); ys(e.clientY); xr(e.clientX); yr(e.clientY); xl(e.clientX); yl(e.clientY); cur.classList.remove('is-hidden'); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('a, button, label, summary, [data-tilt], [data-cursor-text], input, select, textarea');
    cur.classList.toggle('is-link', !!t && !t.matches('input, select, textarea'));
    // dans l'en-tête et les menus, l'anneau s'efface : il ne doit jamais couvrir un libellé
    cur.classList.toggle('in-ui', !!e.target.closest('.hd, .dd, [data-menu], .cab-bar'));
    const txt = e.target.closest('[data-cursor-text]');
    if (txt) { lab.textContent = txt.getAttribute('data-cursor-text'); cur.classList.add('has-label'); } else cur.classList.remove('has-label');
  });
}

// ---------- boutons magnétiques ----------
export function initMagnetic() {
  $$('.btn').forEach((b) => b.addEventListener('pointerenter', (e) => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', `${e.clientX - r.left}px`); }));
  if (!finePointer() || reduced()) return;
  $$('[data-magnetic]').forEach((b) => {
    // attraction discrète : 6 px au plus, sans rebond
    const x = gsap.quickTo(b, 'x', { duration: .4, ease: 'power3.out' }), y = gsap.quickTo(b, 'y', { duration: .4, ease: 'power3.out' });
    const c6 = (v) => Math.max(-6, Math.min(6, v));
    b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); x(c6((e.clientX - r.left - r.width / 2) * .12)); y(c6((e.clientY - r.top - r.height / 2) * .2)); });
    b.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

// ---------- transitions de page ----------
const VT = 'onpagereveal' in window;
export function leave(url, force = false) {
  const v = $('[data-veil]');
  // même page (changement de langue) : on recharge, sinon le navigateur ne ferait que suivre l'ancre
  const go = () => { if (force && url.split('#')[0] === location.href.split('#')[0]) location.reload(); else location.href = url; };
  // navigateurs récents : fondu enchaîné natif entre les pages (View Transitions), sans rideau
  if (reduced() || !v || VT) { go(); return; }
  html.classList.add('is-leaving');
  try { sessionStorage.setItem('exco-veil', '1'); } catch (e) {}
  const lg = $('.veil__logo', v);
  gsap.fromTo(v, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: .34, ease: 'power2.in', onComplete: go });
  if (lg) gsap.fromTo(lg, { opacity: 0 }, { opacity: 1, duration: .2, delay: .14 });
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
    gsap.to(v, { clipPath: 'inset(0 0 100% 0)', duration: .5, ease: 'power3.out' });
    return true;
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) { html.classList.remove('is-leaving'); gsap.set(v, { clipPath: 'inset(100% 0 0 0)' }); } });
  return false;
}

// ---------- ouverture orchestrée (accueil, une fois par session) ----------
// le logo apparaît, un double trait de total se trace dessous, puis le rideau se lève
export function runIntro() {
  return new Promise((resolve) => {
    const intro = $('[data-intro]');
    if (!intro || reduced() || html.classList.contains('intro-seen') || getComputedStyle(intro).display === 'none') { intro && intro.remove(); resolve(); return; }
    try { sessionStorage.setItem('exco-intro', '1'); } catch (e) {}
    if (lenis) lenis.stop();
    const logo = $('.intro__logo', intro), rules = $$('.intro__rule span', intro);
    // ouverture courte (1,3 s) : la page commence à se poser pendant que le rideau se lève
    const tl = gsap.timeline({ onComplete: () => { intro.remove(); if (lenis) lenis.start(); } });
    tl.fromTo(logo, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out' })
      .fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: .4, stagger: .1, ease: 'power3.inOut' }, .2)
      .add(resolve, .7)
      .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: .6, ease: 'power4.inOut' }, .7);
  });
}

// ---------- titres : les lettres montent, la graisse se pose ----------
// le découpage lettre par lettre se fait juste avant que le titre n'arrive à l'écran (et pas au chargement)
export function revealTitles(root = document) {
  // les titres d'ouverture sont masqués en CSS jusqu'à ce que leur découpage soit prêt (pas d'aller-retour visible)
  const ready = () => $$('[data-hero] [data-reveal]', root).forEach((h) => h.classList.add('is-ready'));
  if (!window.SplitText || reduced()) { ready(); return; }
  $$('[data-reveal]', root).forEach((h) => {
    if (h.dataset.split) return; h.dataset.split = '1';
    const prep = () => {
      if (h._reveal) return h._reveal;
      // mots gardés entiers (pas de coupure au milieu d'un mot), découpage retiré une fois le titre posé
      const split = new window.SplitText(h, { type: 'lines,words,chars', linesClass: 'tr-line', wordsClass: 'tr-word', charsClass: 'tr-char' });
      const tl = gsap.timeline({ paused: true, onComplete: () => { split.revert(); } });
      tl.fromTo(split.chars, { yPercent: 118 }, { yPercent: 0, duration: 1, ease: 'exco', stagger: { each: .016, from: 'start' } });
      h.classList.add('is-ready');
      h._reveal = tl; return tl;
    };
    if (h.closest('[data-hero]')) { prep(); return; } // déclenché après l'ouverture
    window.ScrollTrigger.create({ trigger: h, start: 'top bottom+=320', once: true, onEnter: prep });
    window.ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => prep().play() });
  });
}

// ---------- paragraphe : les mots s'éclairent au défilement ----------
export function wordsReveal() {
  if (!window.SplitText || reduced()) return;
  $$('[data-words]').forEach((p) => {
    const s = new window.SplitText(p, { type: 'words', wordsClass: 'w' });
    gsap.fromTo(s.words, { opacity: .25 }, { opacity: 1, stagger: .1, ease: 'none', scrollTrigger: { trigger: p, start: 'top 88%', end: 'top 42%', scrub: .4 } });
  });
}

// ---------- parallaxe ----------
export function parallax() {
  if (reduced()) return;
  $$('[data-parallax]').forEach((img) => {
    const k = parseFloat(img.dataset.parallax) || .1;
    gsap.fromTo(img, { yPercent: -k * 50 }, { yPercent: k * 50, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  $$('[data-frame]').forEach((f) => {
    const a = $('.manifest__frame', f) || f;
    gsap.fromTo(a, { clipPath: 'inset(18% 12% 18% 12% round 14px)' }, { clipPath: 'inset(0% 0% 0% 0% round 14px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 90%', end: 'top 35%', scrub: true } });
  });
}

// ---------- chiffres : défilement des chiffres puis arrêt, comme un compteur ----------
export function counters() {
  // les chiffres montent régulièrement jusqu'à leur valeur (sans valeurs aléatoires intermédiaires)
  const fmt = (pre, v) => (pre + fmtNum(v)).split('').map((ch) => (/\s/.test(ch) ? '<span class="digit digit--sp" aria-hidden="true">&#8239;</span>' : ch)).join('');
  $$('[data-count]').forEach((n) => {
    const target = +n.dataset.count, pre = n.dataset.prefix || '';
    n.setAttribute('aria-label', pre + fmtNum(target));
    const box = document.createElement('span'); box.setAttribute('aria-hidden', 'true'); box.className = 'count';
    box.innerHTML = fmt(pre, target); n.innerHTML = ''; n.appendChild(box);
    // petits nombres (« 2 jours ») et chiffres déjà à l'écran au chargement : affichés tels quels, sans compteur
    if (reduced() || target < 10 || n.getBoundingClientRect().top < window.innerHeight) return;
    const o = { v: 0 };
    box.innerHTML = fmt(pre, 0);
    window.ScrollTrigger.create({ trigger: n, start: 'top 85%', once: true, onEnter: () => {
      gsap.to(o, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => { box.innerHTML = fmt(pre, Math.round(o.v)); } });
      gsap.fromTo(box, { yPercent: 30, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .7, ease: 'exco' });
    } });
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

// ---------- menus déroulants de l'en-tête ----------
// survol (souris) ou clic, flèche bas pour entrer dans le panneau, Échap pour fermer
export function initDropdowns() {
  const btns = $$('[data-dd]'); if (!btns.length) return;
  const hd = $('[data-hd]');
  const scrim = document.createElement('div'); scrim.className = 'dd-scrim'; scrim.setAttribute('aria-hidden', 'true'); document.body.appendChild(scrim);
  const hover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let open = null, tIn = 0, tOut = 0, y0 = 0;
  const panel = (b) => document.getElementById(b.getAttribute('aria-controls'));
  $$('[data-dd-panel]').forEach((p) => p.setAttribute('data-lenis-prevent', ''));
  const close = (focus) => {
    if (!open) return;
    const b = open, p = panel(b); open = null;
    b.setAttribute('aria-expanded', 'false'); html.classList.remove('dd-open');
    if (reduced()) p.hidden = true;
    else { gsap.killTweensOf(p); gsap.to(p, { clipPath: 'inset(0 0 100% 0)', duration: .28, ease: 'power2.in', onComplete: () => { if (open !== b) p.hidden = true; } }); }
    if (focus) b.focus();
  };
  const show = (b) => {
    if (open === b) return;
    const prev = open;
    if (prev) { const pp = panel(prev); prev.setAttribute('aria-expanded', 'false'); gsap.killTweensOf(pp); pp.hidden = true; }
    open = b; y0 = window.scrollY;
    const p = panel(b);
    b.setAttribute('aria-expanded', 'true'); p.hidden = false; html.classList.add('dd-open');
    if (hd) hd.classList.remove('is-up');
    if (reduced()) return;
    gsap.killTweensOf(p);
    if (prev) gsap.set(p, { clipPath: 'inset(0 0 0% 0)' });
    else gsap.fromTo(p, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: .5, ease: 'power3.out' });
    gsap.fromTo($$('.dd-card, .dd-svc, .dd-sec, .dd-feature, .dd__aside > *, .dd__preview, .dd__all', p), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .012, ease: 'power3.out', delay: prev ? 0 : .06 });
  };
  btns.forEach((b) => {
    const item = b.closest('.nav-item');
    // un clic juste après l'ouverture au survol ne referme pas le menu
    let shownAt = 0;
    b.addEventListener('click', () => { if (open === b && performance.now() - shownAt > 400) close(); else { show(b); shownAt = 0; } });
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); show(b); const a = panel(b).querySelector('a'); if (a) a.focus(); } });
    if (hover && item) {
      item.addEventListener('pointerenter', () => { clearTimeout(tOut); clearTimeout(tIn); tIn = setTimeout(() => { if (open !== b) shownAt = performance.now(); show(b); }, open ? 0 : 110); });
      item.addEventListener('pointerleave', () => { clearTimeout(tIn); tOut = setTimeout(() => { if (open === b) close(); }, 200); });
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) close(true); });
  scrim.addEventListener('click', () => close());
  document.addEventListener('focusin', (e) => { if (open && !open.closest('.nav-item').contains(e.target)) close(); });
  window.addEventListener('scroll', () => { if (open && Math.abs(window.scrollY - y0) > 80) close(); }, { passive: true });
  // secteurs : l'image d'aperçu suit le survol
  $$('[data-preview]').forEach((a) => {
    const img = a.closest('.dd') && a.closest('.dd').querySelector('[data-dd-preview]'); if (!img) return;
    const on = () => {
      if (img.getAttribute('src') !== a.dataset.preview) img.src = a.dataset.preview;
      $$('.dd-sec', a.parentElement).forEach((x) => x.classList.toggle('is-on', x === a));
    };
    a.addEventListener('pointerenter', on); a.addEventListener('focus', on);
  });
}

// ---------- pied de page : colonnes ouvertes sur grand écran, repliées sur mobile ----------
export function initFooterCols() {
  const cols = $$('[data-ft-col]'); if (!cols.length) return;
  const mq = window.matchMedia('(min-width: 901px)');
  const set = () => cols.forEach((d) => { d.open = mq.matches; });
  set();
  if (mq.addEventListener) mq.addEventListener('change', set);
}

// ---------- liens qui présélectionnent un filtre de l'annuaire ----------
export function initFilterLinks() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-filter]'); if (!a) return;
    try { sessionStorage.setItem('exco-filter', a.dataset.filter); } catch (err) {}
  }, true);
}

// ---------- copier le lien de la page ----------
export function initShare() {
  $$('[data-share]').forEach((b) => b.addEventListener('click', async () => {
    const url = location.href.split('#')[0];
    const lab = b.innerHTML;
    b.setAttribute('aria-live', 'polite');
    try { await navigator.clipboard.writeText(url); b.textContent = T('Lien copié', 'Link copied'); }
    catch (e) { b.textContent = url; }
    setTimeout(() => { b.innerHTML = lab; }, 1800);
  }));
}

// ---------- sommaire d'article : l'intertitre en cours est souligné ----------
export function initToc() {
  const toc = $('[data-toc]'); if (!toc || !window.ScrollTrigger) return;
  const links = $$('a', toc);
  const set = (i) => links.forEach((x, k) => x.classList.toggle('is-on', k === i));
  links.forEach((a, i) => {
    const t = document.querySelector(a.getAttribute('href')); if (!t) return;
    window.ScrollTrigger.create({ trigger: t, start: 'top 40%', onEnter: () => set(i), onLeaveBack: () => set(i - 1) });
  });
}

// ---------- liens qui ouvrent un nouvel onglet : signalés aux lecteurs d'écran (v14) ----------
export function newTabHints() {
  const hint = T('nouvel onglet', 'opens in a new tab');
  $$('a[target="_blank"]').forEach((a) => {
    if (a.dataset.nt) return; a.dataset.nt = '1';
    const al = a.getAttribute('aria-label');
    if (al) a.setAttribute('aria-label', `${al} (${hint})`);
    else a.insertAdjacentHTML('beforeend', `<span class="sr"> (${hint})</span>`);
  });
}
