// Planches animées des sections (v13) : dessins au trait générés au build (src/sitegen/viz.py),
// animés ici à l'arrivée à l'écran ; cartes dessinées depuis map.json et l'annuaire.
// Mouvement réduit : les dessins restent tels quels, complets et immobiles.
import { $, $$, T, lang, reduced, getJSON, onVisible } from './util.js';
import { loadCabinets } from './finder.js';
import { countdownText } from './sections.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export function initViz() {
  $$('[data-viz]').forEach((fig) => {
    const kind = fig.dataset.viz;
    if (kind === 'map') { initMap(fig); return; }
    if (kind === 'date') initCountdown(fig);
    if (kind === 'helix') { initHelix(fig); return; }
    if (reduced() || !gsap || !window.ScrollTrigger) return;
    const tl = intro(fig);
    const loops = extras(fig, kind, tl);
    window.ScrollTrigger.create({ trigger: fig, start: 'top 84%', once: true, onEnter: () => tl.play() });
    if (loops.length) {
      // les boucles ne tournent que lorsque la planche est à l'écran, une fois l'entrée jouée
      let on = false;
      onVisible(fig, (v) => { on = v; fig.classList.toggle('is-play', v && tl.progress() === 1); loops.forEach((l) => (v && tl.progress() === 1 ? l.play() : l.pause())); });
      tl.eventCallback('onComplete', () => { fig.classList.toggle('is-play', on); if (on) loops.forEach((l) => l.play()); });
    }
  });
}

// ---------- entrée : chaque élément marqué data-a apparaît à son temps data-t ----------
function intro(fig) {
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  $$('[data-a]', fig).forEach((el) => {
    const t = +el.dataset.t || 0, a = el.dataset.a;
    if (a === 'draw') tl.fromTo(el, { drawSVG: '0%' }, { drawSVG: '100%', duration: .9, ease: 'power2.inOut' }, t);
    else if (a === 'pop') {
      if (el.tagName === 'circle') { const r = el.getAttribute('r'); tl.fromTo(el, { attr: { r: 0 } }, { attr: { r }, duration: .5, ease: 'back.out(2.4)' }, t); }
      else tl.fromTo(el, { scale: .3, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: .55, ease: 'back.out(2)' }, t);
    }
    else if (a === 'fade') tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: .6 }, t);
    else if (a === 'grow') tl.fromTo(el, { scaleY: 0, transformOrigin: '50% 100%' }, { scaleY: 1, duration: .7, ease: 'power3.out' }, t);
    else if (a === 'growx') tl.fromTo(el, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: .8, ease: 'power3.out' }, t);
    else if (a === 'rise') tl.fromTo(el, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out' }, t);
  });
  return tl;
}

// ---------- gestes propres à chaque planche ----------
function extras(fig, kind, tl) {
  const loops = [];
  if (kind === 'balance') {
    // le fléau part de travers et trouve son équilibre ; les plateaux restent d'aplomb
    const beam = $('[data-beam]', fig), L = $('[data-pan="l"]', fig), R = $('[data-pan="r"]', fig);
    const o = { a: -13 };
    const set = () => {
      const r = o.a * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
      beam.setAttribute('transform', `rotate(${o.a.toFixed(2)} 200 104)`);
      L.setAttribute('transform', `translate(${(200 - 116 * c).toFixed(1)},${(104 - 116 * s).toFixed(1)})`);
      R.setAttribute('transform', `translate(${(200 + 116 * c).toFixed(1)},${(104 + 116 * s).toFixed(1)})`);
    };
    set();
    tl.to(o, { a: 0, duration: 1.5, ease: 'power3.out', onUpdate: set }, .3);
  }
  if (kind === 'doc') {
    const st = $('[data-stamp]', fig);
    tl.fromTo(st, { scale: 1.8, opacity: 0, transformOrigin: '50% 50%' }, { scale: 1, opacity: 1, duration: .45, ease: 'power4.in' }, 1.5)
      .to(st, { scale: 1.06, duration: .12, yoyo: true, repeat: 1, ease: 'power1.out' });
  }
  if (kind === 'ledger') {
    // la loupe parcourt les lignes du grand livre
    const mag = $('[data-loop="mag"]', fig);
    gsap.set(mag, { x: 268, y: 92 });
    tl.from(mag, { opacity: 0, duration: .5 }, .2);
    loops.push(gsap.timeline({ paused: true, repeat: 1, yoyo: true, defaults: { duration: 1.6, ease: 'sine.inOut' } })
      .to(mag, { x: 150, y: 140 }).to(mag, { x: 270, y: 186 }).to(mag, { x: 170, y: 236 }));
  }
  const run = $('[data-loop="run"]', fig), rp = $('[data-run]', fig);
  if (run && rp) {
    // un point parcourt le chemin, du départ à l'arrivée
    const len = rp.getTotalLength(); const o = { p: 0 };
    const set = () => { const pt = rp.getPointAtLength(o.p * len); run.setAttribute('cx', pt.x.toFixed(1)); run.setAttribute('cy', pt.y.toFixed(1)); };
    set(); gsap.set(run, { opacity: 0, attr: { opacity: 1 } });
    loops.push(gsap.timeline({ paused: true, repeat: 1, repeatDelay: .8 })
      .to(run, { opacity: 1, duration: .3 }).to(o, { p: 1, duration: 4.2, ease: 'power1.inOut', onUpdate: set }, 0).to(run, { opacity: 0, duration: .3 }, '-=.3'));
  }
  const today = $('[data-loop="today"]', fig);
  if (today) {
    // la ligne « aujourd'hui » avance sur le planning
    gsap.set(today, { x: 60, opacity: 0 });
    tl.to(today, { opacity: 1, duration: .4 }, 1.2);
    loops.push(gsap.fromTo(today, { x: 60 }, { x: 260, duration: 5, ease: 'power1.inOut', paused: true }));
  }
  const hand = $('[data-loop="hand"]', fig);
  if (hand) {
    // l'aiguille fait le tour de l'année ; chaque mois passé s'allume (une paie par mois)
    const dots = $$('[data-m]', fig); const o = { a: 0 };
    const set = () => {
      hand.setAttribute('transform', `translate(200,152) rotate(${o.a.toFixed(1)})`);
      const m = Math.floor(((o.a % 360) + 360) % 360 / 30);
      dots.forEach((d, i) => d.classList.toggle('is-on', i <= m));
    };
    set();
    loops.push(gsap.to(o, { a: 359.9, duration: 10, ease: 'none', paused: true, onUpdate: set }));
  }
  $$('[data-spin]', fig).forEach((g) => {
    // un quart de tour à l'entrée, puis immobile
    const dir = +g.dataset.spin; const o = { a: -20 * dir };
    g.setAttribute('transform', `rotate(${o.a} 200 150)`);
    tl.to(o, { a: 0, duration: 1.6, ease: 'power3.out', onUpdate: () => g.setAttribute('transform', `rotate(${o.a.toFixed(2)} 200 150)`) }, .2);
  });
  if ($('.v-pulse', fig)) loops.push(gsap.timeline({ paused: true })); // pulsation en CSS (classe is-play)
  return loops;
}

// ---------- compte à rebours d'un événement ----------
function initCountdown(fig) {
  const el = $('[data-viz-countdown]', fig); if (!el) return;
  const upd = () => {
    const c = countdownText(el.dataset.vizCountdown);
    el.textContent = !c ? T('Événement passé', 'Past event') : c.d >= 1 ? T(`Dans ${c.d} jour${c.d > 1 ? 's' : ''}`, `In ${c.d} day${c.d > 1 ? 's' : ''}`) : T(`Dans ${c.h} h`, `In ${c.h} h`);
  };
  upd(); setInterval(upd, 60000);
}

// ---------- double hélice (ADN du groupe) ----------
function initHelix(fig) {
  const g = $('[data-helix]', fig); if (!g) return;
  const n = +g.dataset.helix, amp = 78, ys = Array.from({ length: 33 }, (_, i) => 24 + i * 11);
  const rungs = Array.from({ length: n }, (_, k) => 40 + k * (320 / (n - 1)));
  g.innerHTML = '';
  const R = rungs.map((y) => { const l = mk('line', { class: 'v-rung', y1: y, y2: y }); const c = mk('circle', { class: 'v-fo', cx: 150, cy: y, r: 3.5 }); g.append(l, c); return { l, c, y }; });
  const D = [];
  ys.forEach((y) => [1, -1].forEach((sg) => { const c = mk('circle', { class: sg > 0 ? 'v-fi' : 'v-fb', cy: y }); g.appendChild(c); D.push({ c, y, sg }); }));
  let ph = .6;
  const draw = () => {
    D.forEach(({ c, y, sg }) => { const a = ph + y * .03, z = Math.cos(a) * sg; c.setAttribute('cx', (150 + sg * amp * Math.sin(a)).toFixed(1)); c.setAttribute('r', (3 + 1.6 * z).toFixed(2)); c.setAttribute('opacity', (.4 + .3 * (z + 1)).toFixed(2)); });
    R.forEach(({ l, y }) => { const a = ph + y * .03, s = amp * Math.sin(a); l.setAttribute('x1', (150 + s).toFixed(1)); l.setAttribute('x2', (150 - s).toFixed(1)); l.setAttribute('opacity', (.35 + .55 * Math.abs(Math.cos(a))).toFixed(2)); });
  };
  draw();
  if (reduced() || !gsap) return;
  // entrée : les barreaux se posent un à un, puis l'hélice tourne lentement tant qu'elle est à l'écran
  gsap.set([...R.map((r) => r.l), ...R.map((r) => r.c)], { opacity: 0 });
  gsap.set(D.map((d) => d.c), { opacity: 0 });
  let run = false, last = 0, started = false;
  let spun = 0;
  const tick = (t) => { if (!run) return; const dt = Math.min(.05, (t - last) / 1000 || 0); last = t; spun += dt; const k = Math.max(0, 1 - Math.max(0, spun - 4) / 3); ph += dt * .55 * k; draw(); if (k > 0) requestAnimationFrame(tick); else run = false; };
  window.ScrollTrigger.create({ trigger: fig, start: 'top 84%', once: true, onEnter: () => {
    gsap.to(D.map((d) => d.c), { opacity: (i, el) => +el.getAttribute('opacity') || .7, duration: .5, stagger: .012, clearProps: 'opacity' });
    gsap.to(R.map((r) => r.c), { opacity: 1, duration: .4, stagger: .12, delay: .5 });
    gsap.to(R.map((r) => r.l), { opacity: .8, duration: .4, stagger: .12, delay: .5, onComplete: () => { started = true; if (vis) { run = true; last = performance.now(); requestAnimationFrame(tick); } }, clearProps: 'opacity' });
  } });
  let vis = false;
  onVisible(fig, (v) => { vis = v; if (!started || spun > 7) return; if (v && !run) { run = true; last = performance.now(); requestAnimationFrame(tick); } else if (!v) run = false; });
}

// ---------- cartes : un groupe, un service, la France ou l'international ----------
function initMap(fig) {
  let off = null;
  off = onVisible(fig, async (v) => {
    if (!v) return; off && off();
    const [map, cabs] = await Promise.all([getJSON('assets/data/map.json'), loadCabinets()]);
    drawMap(fig, map, cabs);
  }, { margin: '300px' });
}

function drawMap(fig, map, cabs) {
  const svg = $('.vmap', fig); const d = fig.dataset; const scope = d.scope;
  let H = [];
  if (scope === 'group') H = cabs.filter((c) => c.g === d.group);
  else if (scope === 'svc') H = cabs.filter((c) => c.reg === 'fr' && c.s.includes(d.svc));
  else if (scope === 'fr') H = cabs.filter((c) => c.reg === 'fr');
  else if (scope === 'int') H = cabs.filter((c) => c.reg === 'int');
  const focus = d.focus ? cabs.find((c) => c.id === d.focus) : null;
  // cadrage 4:3 autour des points mis en avant
  let x0, y0, x1, y1;
  if (!H.length && focus) H = [focus];
  if (scope === 'svc' || scope === 'fr' || !H.length) { const v = map.views.fr; [x0, y0, x1, y1] = [v[0], v[1], v[0] + v[2], v[1] + v[3]]; }
  else {
    const P = scope === 'int' ? [...H, { x: map.paris[0], y: map.paris[1] }] : H;
    x0 = Math.min(...P.map((c) => c.x)); x1 = Math.max(...P.map((c) => c.x)); y0 = Math.min(...P.map((c) => c.y)); y1 = Math.max(...P.map((c) => c.y));
  }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const far = H.some((c) => c.reg !== 'fr') || (focus && focus.reg !== 'fr');
  const minW = scope === 'group' ? (far ? 34 : 64) : 60;
  let w = Math.max((x1 - x0) * 1.3, (y1 - y0) * 1.3 * 4 / 3, minW); const h = w * 3 / 4;
  const vb = [cx - w / 2, cy - h / 2, w, h];
  svg.setAttribute('viewBox', vb.map((n) => n.toFixed(2)).join(' '));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  const inV = (c, m = 0) => c.x > vb[0] - m && c.x < vb[0] + w + m && c.y > vb[1] - m && c.y < vb[1] + h + m;
  const land = mk('g', { class: 'vm-landg' });
  land.appendChild(mk('path', { d: map.world, class: 'vm-land' }));
  if (scope === 'int' || far) Object.values(map.present).forEach((p) => land.appendChild(mk('path', { d: p, class: 'vm-present' })));
  land.appendChild(mk('path', { d: map.france, class: 'vm-fr', 'stroke-width': w / 400 }));
  if (w < 150 && !far) land.appendChild(mk('path', { d: map.deps, class: 'vm-deps', 'stroke-width': w / 700 }));
  svg.appendChild(land);
  const hs = new Set(H.map((c) => c.id));
  const gO = mk('g'), gH = mk('g'), gL = mk('g', { class: 'vm-labs' });
  const orr = w / (scope === 'int' ? 320 : 170);
  cabs.forEach((c) => { if (!hs.has(c.id) && inV(c, w * .05)) gO.appendChild(mk('circle', { cx: c.x, cy: c.y, r: orr, class: 'vm-o' })); });
  const hr = w / (H.length > 40 ? 125 : 95);
  const dist = (c) => Math.hypot(c.x - (focus ? focus.x : cx), c.y - (focus ? focus.y : cy));
  const hd = H.filter((c) => !focus || c.id !== focus.id).sort((a, b) => dist(a) - dist(b)).map((c) => { const e = mk('circle', { cx: c.x, cy: c.y, r: hr, class: 'vm-h' }); gH.appendChild(e); return e; });
  svg.append(gO, gH);
  let fdot = null, ring = null;
  if (focus) {
    ring = mk('circle', { cx: focus.x, cy: focus.y, r: w / 34, class: 'vm-ring', 'stroke-width': w / 260 });
    fdot = mk('circle', { cx: focus.x, cy: focus.y, r: w / 62, class: 'vm-f' });
    svg.append(ring, fdot);
  }
  // étiquettes : le cabinet de la page, sinon quelques villes du groupe (sans chevauchement)
  const px = svg.getBoundingClientRect().width || 420;
  const fs = w * 13.5 / px, boxes = []; // étiquettes à 13,5 px à l'écran, quelle que soit la taille de la carte
  const fits = (b) => b.x0 > vb[0] + fs * .3 && b.x1 < vb[0] + w - fs * .3 && b.y0 > vb[1] + fs * .2 && b.y1 < vb[1] + h - fs * .2 && !boxes.some((o) => b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0);
  const label = (c, strong) => {
    const tw = c.c.length * fs * .56, gap = fs * .62;
    for (const side of [1, -1]) {
      const x = side > 0 ? c.x + gap : c.x - gap - tw; const b = { x0: x - fs * .08, x1: x + tw + fs * .08, y0: c.y - fs * .7, y1: c.y + fs * .45 };
      if (strong || fits(b)) { boxes.push(b); const t = mk('text', { x: side > 0 ? c.x + gap : c.x - gap, y: c.y + fs * .34, 'font-size': fs, 'text-anchor': side > 0 ? 'start' : 'end', class: 'vm-lab' + (strong ? ' vm-lab--f' : ''), 'stroke-width': fs * .32 }); t.textContent = c.c; gL.appendChild(t); return true; }
    }
    return false;
  };
  H.forEach((c) => boxes.push({ x0: c.x - hr * 1.3, x1: c.x + hr * 1.3, y0: c.y - hr * 1.3, y1: c.y + hr * 1.3 }));
  if (focus) label(focus, true);
  if (scope === 'group') {
    const seen = new Set(focus ? [focus.c] : []); let k = 0;
    H.filter((c) => !focus || c.id !== focus.id).sort((a, b) => dist(a) - dist(b)).forEach((c) => { if (k >= (focus ? 3 : 6) || seen.has(c.c)) return; if (label(c, false)) { seen.add(c.c); k++; } });
  }
  svg.appendChild(gL);
  if (reduced() || !gsap) return;
  // entrée : le cabinet de la page d'abord (point et nom), puis son groupe, puis le reste du réseau
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const others = [...gO.children], labs = [...gL.children];
  const flab = focus ? labs.filter((t) => t.classList.contains('vm-lab--f')) : [];
  const olabs = labs.filter((t) => !flab.includes(t));
  tl.from(land, { opacity: 0, duration: .5 });
  if (focus) tl.fromTo(fdot, { attr: { r: 0 } }, { attr: { r: w / 62 }, duration: .45, ease: 'back.out(1.6)' }, .15).from(flab, { opacity: 0, duration: .4 }, .3).add(() => fig.classList.add('is-play'), .5);
  if (hd.length) tl.fromTo(hd, { attr: { r: 0 } }, { attr: { r: hr }, duration: .35, ease: 'back.out(1.6)', stagger: { amount: Math.min(.6, hd.length * .03) } }, focus ? .45 : .25);
  if (others.length) tl.from(others, { opacity: 0, duration: .4, stagger: { amount: .3 } }, .5);
  if (olabs.length) tl.from(olabs, { opacity: 0, duration: .4, stagger: .06 }, .9);
  window.ScrollTrigger.create({ trigger: fig, start: 'top 84%', once: true, onEnter: () => tl.play() });
  onVisible(fig, (v) => fig.classList.toggle('is-play', v && !!focus && tl.progress() === 1));
}
