// Visuels animés du réseau (v12) : carte des cabinets, schéma de gouvernance, frise, bandeau de logos.
import { $, $$, reduced, getJSON, onVisible } from './util.js';
import { loadCabinets } from './finder.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

// ---------- carte du réseau : la France s'allume, puis la caméra recule jusqu'à l'Europe et l'Afrique ----------
export function initNetmap() {
  const fig = $('[data-netmap]'); if (!fig) return;
  const svg = $('[data-netmap-svg]', fig);
  let off = null;
  off = onVisible(fig, async (v) => {
    if (!v) return; off && off();
    const [cabs, map] = await Promise.all([loadCabinets(), getJSON('assets/data/map.json')]);
    build(svg, cabs, map);
  }, { margin: '300px' });
}

function build(svg, cabs, map) {
  const ratio = 1.25; // hauteur / largeur du cadre
  const view = (cx, cy, w) => [cx - w / 2, cy - (w * ratio) / 2, w, w * ratio];
  const P = map.paris;
  const vFr = view(P[0] + 4, P[1] + 52, 250);
  const vAll = view(250, -320, 1250);
  const vb = { x: vFr[0], y: vFr[1], w: vFr[2], h: vFr[3] };
  const setVB = () => svg.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  setVB();
  const gLand = mk('g', { class: 'nm-land' });
  gLand.appendChild(mk('path', { d: map.world, class: 'nm-world' }));
  const present = Object.values(map.present).map((d) => { const p = mk('path', { d, class: 'nm-present' }); gLand.appendChild(p); return p; });
  gLand.appendChild(mk('path', { d: map.france, class: 'nm-france' }));
  gLand.appendChild(mk('path', { d: map.deps, class: 'nm-deps' }));
  svg.appendChild(gLand);
  const gArcs = mk('g', { class: 'nm-arcs' }); svg.appendChild(gArcs);
  const gDots = mk('g', { class: 'nm-dots' }); svg.appendChild(gDots);
  // cabinets (les points des outre-mer lointains vont dans les médaillons)
  const inMain = (c) => c.x > vAll[0] && c.x < vAll[0] + vAll[2] && c.y > vAll[1] && c.y < vAll[1] + vAll[3];
  const heads = new Set(Object.values(map.heads).map((h) => h.join(',')));
  const d2 = (c) => Math.hypot(c.x - P[0], c.y - P[1]);
  const dots = cabs.filter(inMain).sort((a, b) => d2(a) - d2(b)).map((c) => {
    const isHead = heads.has([c.x, c.y].join(','));
    const e = mk('circle', { cx: c.x, cy: c.y, r: 1, class: 'nm-dot' + (c.reg !== 'fr' ? ' nm-dot--far' : '') }); gDots.appendChild(e);
    return { e, c, isHead };
  });
  const paris = mk('circle', { cx: P[0], cy: P[1], r: 1, class: 'nm-paris' }); gDots.appendChild(paris);
  // liaisons Paris → chaque pays hors de France (au point moyen de ses cabinets)
  const byCo = {};
  cabs.filter((c) => c.reg !== 'fr' && inMain(c)).forEach((c) => { (byCo[c.co[0]] = byCo[c.co[0]] || []).push(c); });
  const arcs = Object.values(byCo).map((L) => {
    const x = L.reduce((s, c) => s + c.x, 0) / L.length, y = L.reduce((s, c) => s + c.y, 0) / L.length;
    const mx = (P[0] + x) / 2, my = (P[1] + y) / 2 - Math.hypot(x - P[0], y - P[1]) * .22;
    const a = mk('path', { d: `M${P[0]},${P[1]} Q${mx},${my} ${x},${y}`, class: 'nm-arc', pathLength: 1 }); gArcs.appendChild(a); return a;
  });
  // médaillons : Antilles et Polynésie (hors du cadre principal)
  const insets = [['971', 'Guadeloupe'], ['972', 'Martinique'], ['987', 'Polynésie']].filter(([k]) => map.views[k]);
  const gIn = mk('g', { class: 'nm-insets' }); svg.appendChild(gIn);
  const inDots = [];
  const placeInsets = () => {
    gIn.innerHTML = '';
    const R = vb.w * .055;
    insets.forEach(([k, label], i) => {
      const cx = vb.x + vb.w * .06 + R, cy = vb.y + vb.h * (.74 + i * .085);
      gIn.appendChild(mk('circle', { cx, cy, r: R, class: 'nm-inset' }));
      const t = mk('text', { x: cx + R * 1.35, y: cy + R * .25, class: 'nm-inset__t', 'font-size': R * .62 }); t.textContent = label; gIn.appendChild(t);
      const v = map.views[k];
      cabs.filter((c) => c.x >= v[0] && c.x <= v[0] + v[2] && c.y >= v[1] && c.y <= v[1] + v[3]).forEach((c) => {
        const px = cx + ((c.x - (v[0] + v[2] / 2)) / v[2]) * R * 1.5, py = cy + ((c.y - (v[1] + v[3] / 2)) / v[3]) * R * 1.5;
        const e = mk('circle', { cx: px, cy: py, r: R * .14, class: 'nm-dot nm-dot--far' }); gIn.appendChild(e); inDots.push(e);
      });
    });
  };
  // pendant le recul, seuls les points déjà apparus suivent l'échelle
  const sizeDots = (shownOnly = false) => {
    const r = vb.w / 150;
    dots.forEach(({ e, isHead, c }) => { if (shownOnly && c.reg !== 'fr') return; e.setAttribute('r', (isHead ? 1.7 : 1) * r); });
    paris.setAttribute('r', r * 2.2);
    svg.style.setProperty('--nm-sw', `${vb.w / 520}px`);
  };
  sizeDots();
  if (reduced() || !gsap) {
    Object.assign(vb, { x: vAll[0], y: vAll[1], w: vAll[2], h: vAll[3] }); setVB(); sizeDots(); placeInsets();
    svg.classList.add('is-done'); return;
  }
  // séquence : la France, puis le recul, puis le monde
  // apparition par le rayon (pas d'échelle : en SVG, elle déplacerait les points vers l'origine de la carte)
  const rOf = (d, w) => (d.isHead ? 1.7 : 1) * (w / 150);
  const fr = dots.filter((d) => d.c.reg === 'fr'), far = dots.filter((d) => d.c.reg !== 'fr');
  gsap.set([...dots.map((d) => d.e), paris], { opacity: 0, attr: { r: 0 } });
  gsap.set(arcs, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(gLand, { opacity: 0 });
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
  tl.to(gLand, { opacity: 1, duration: .7 })
    .to(paris, { opacity: 1, attr: { r: vFr[2] / 150 * 2.2 }, duration: .5, ease: 'back.out(3)' }, .2)
    .add(fr.map((d, i) => gsap.to(d.e, { opacity: 1, attr: { r: rOf(d, vFr[2]) }, duration: .45, ease: 'back.out(2.5)', delay: i * .012 })), .45)
    .to(vb, { x: vAll[0], y: vAll[1], w: vAll[2], h: vAll[3], duration: 2.1, ease: 'power3.inOut', onUpdate: () => { setVB(); sizeDots(true); } }, '+=.25')
    .to(present, { fill: '#24435E', duration: .9, stagger: .05 }, '-=1.1')
    .to(arcs, { strokeDashoffset: 0, duration: 1.1, stagger: .06, ease: 'power2.inOut' }, '-=.5')
    .add(far.map((d, i) => gsap.to(d.e, { opacity: 1, attr: { r: rOf(d, vAll[2]) }, duration: .45, ease: 'back.out(3)', delay: i * .03 })), '-=.9')
    .add(() => { placeInsets(); gsap.from(gIn, { opacity: 0, duration: .6 }); svg.classList.add('is-done'); });
  // un clic sur la carte rejoue la séquence
  svg.addEventListener('click', () => { if (tl.isActive()) return; gIn.innerHTML = ''; tl.restart(); });
}

// ---------- schéma de gouvernance : les étapes se posent l'une sous l'autre ----------
export function initGovflow() {
  const g = $('[data-govflow]'); if (!g || reduced() || !gsap) return;
  const steps = $$('.govflow__step, .govflow__pres', g), links = $$('.govflow__link', g), dots = $$('.govflow__dots i', g);
  gsap.set(steps, { opacity: 0, y: 18 }); gsap.set(links, { scaleY: 0, transformOrigin: '50% 0' }); gsap.set(dots, { scale: 0 });
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  tl.to(steps[0], { opacity: 1, y: 0, duration: .5 })
    .to(dots, { scale: 1, duration: .35, stagger: .04, ease: 'back.out(3)' }, .1);
  links.forEach((l, i) => { tl.to(l, { scaleY: 1, duration: .45, ease: 'power2.inOut' }).to(steps[i + 1], { opacity: 1, y: 0, duration: .5 }, '-=.1'); });
  tl.to(steps.slice(links.length + 1), { opacity: 1, y: 0, duration: .5 });
  window.ScrollTrigger.create({ trigger: g, start: 'top 80%', once: true, onEnter: () => tl.play() });
}

// ---------- frise de l'histoire : le trait se trace au défilement, chaque date s'allume ----------
export function initTimeline() {
  const ol = $('[data-timeline]'); if (!ol || reduced() || !gsap) return;
  ol.classList.add('is-anim');
  const line = document.createElement('span'); line.className = 'timeline__line'; line.setAttribute('aria-hidden', 'true'); ol.prepend(line);
  const items = $$('li', ol);
  gsap.set(items, { opacity: .15, y: 14 });
  const tl = gsap.timeline({ scrollTrigger: { trigger: ol, start: 'top 82%', end: 'top 38%', scrub: .6 } });
  tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: 1 }, 0);
  items.forEach((li, i) => tl.to(li, { opacity: 1, y: 0, ease: 'power2.out', duration: .3 }, (i / items.length) * .9));
}

// ---------- bandeau de logos : il ne tourne que lorsqu'il est à l'écran ----------
export function initMarquee() {
  $$('[data-marquee]').forEach((m) => { onVisible(m, (v) => m.classList.toggle('is-on', v)); });
}
