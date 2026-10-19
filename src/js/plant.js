// Planches d'herbier générées : chaque service a sa plante, reproductible (graine = numéro).
import { rng } from './util.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (n, a) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const f = (v) => Math.round(v * 10) / 10;

function leafPath(x, y, ang, L, W, shape) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => [x + ca * u - sa * v, y + sa * u + ca * v];
  const tip = P(L, 0);
  let c1, c2, c3, c4;
  if (shape === 'round') { c1 = P(L * .15, W * 1.05); c2 = P(L * .95, W * .95); c3 = P(L * .95, -W * .95); c4 = P(L * .15, -W * 1.05); }
  else if (shape === 'heart') { c1 = P(-L * .1, W * 1.2); c2 = P(L * .8, W * .7); c3 = P(L * .8, -W * .7); c4 = P(-L * .1, -W * 1.2); }
  else { c1 = P(L * .25, W); c2 = P(L * .75, W * .55); c3 = P(L * .75, -W * .55); c4 = P(L * .25, -W); }
  const d = `M${f(x)},${f(y)} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(tip[0])},${f(tip[1])} C${f(c3[0])},${f(c3[1])} ${f(c4[0])},${f(c4[1])} ${f(x)},${f(y)}Z`;
  const mid = P(L * .82, 0);
  return { d, rib: `M${f(x)},${f(y)} L${f(mid[0])},${f(mid[1])}` };
}

// Construit une plante dans un <svg> ; renvoie les éléments par « nœud » (pour une croissance par étapes)
export function buildPlant(svg, seed = 1, o = {}) {
  const W = 200, H = 260, ground = o.ground ?? 205;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const R = rng(seed * 7919 + 13);
  const shapes = ['lance', 'round', 'heart', 'lance', 'needle', 'compound'];
  const shape = shapes[seed % shapes.length];
  const nodes = 4 + Math.floor(R() * 4);
  const height = 120 + R() * 50;
  const bend = (R() - .5) * 50;
  const g = el('g', {});
  svg.appendChild(g);
  const groups = [];
  const node = (i) => { if (!groups[i]) { groups[i] = el('g', { 'data-node': i }); g.appendChild(groups[i]); } return groups[i]; };
  // racines
  const rg = node(0);
  const rootN = 3 + Math.floor(R() * 3);
  for (let i = 0; i < rootN; i++) {
    let x = 100 + (R() - .5) * 8, y = ground; let a = Math.PI / 2 + (R() - .5) * 1.4; let d = `M${f(x)},${f(y)}`;
    const len = 6 + Math.floor(R() * 6);
    for (let k = 0; k < len; k++) { a += (R() - .5) * .6 + Math.sin(Math.PI / 2 - a) * .2; x += Math.cos(a) * 5; y += Math.sin(a) * 5; d += ` L${f(x)},${f(y)}`; }
    rg.appendChild(el('path', { d, class: 'rootl' }));
  }
  // tige principale (courbe de Bézier)
  const top = [100 + bend, ground - height];
  const c1 = [100 + bend * .1 + (R() - .5) * 20, ground - height * .35];
  const c2 = [100 + bend * .9, ground - height * .7];
  const stemD = `M100,${ground} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(top[0])},${f(top[1])}`;
  const sg = node(0);
  sg.appendChild(el('path', { d: stemD, class: 'stem' }));
  const bez = (t) => { const u = 1 - t; return [u * u * u * 100 + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * top[0], u * u * u * ground + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * top[1]]; };
  // feuilles alternes
  for (let i = 0; i < nodes; i++) {
    const t = .18 + (i / nodes) * .72;
    const [x, y] = bez(t);
    const side = i % 2 ? 1 : -1;
    const L = (shape === 'needle' ? 34 : 28) * (1.1 - t * .55) + R() * 8;
    const ang = -Math.PI / 2 + side * (.9 + R() * .4);
    const grp = node(1 + Math.floor((i / nodes) * 3));
    if (shape === 'compound') {
      // feuille composée : pétiole + folioles
      const ex = x + Math.cos(ang) * L * 1.3, ey = y + Math.sin(ang) * L * 1.3;
      grp.appendChild(el('path', { d: `M${f(x)},${f(y)} L${f(ex)},${f(ey)}` }));
      for (let k = 1; k <= 4; k++) {
        const px = x + (ex - x) * k / 4.4, py = y + (ey - y) * k / 4.4;
        for (const s of [-1, 1]) { const lp = leafPath(px, py, ang + s * 1.0, 9, 3.4, 'lance'); grp.appendChild(el('path', { d: lp.d, class: 'leaf-fill' })); }
      }
    } else {
      const Wd = shape === 'needle' ? 2.2 : shape === 'round' ? L * .5 : shape === 'heart' ? L * .48 : L * .28;
      const lp = leafPath(x, y, ang, L, Wd, shape);
      grp.appendChild(el('path', { d: lp.d, class: 'leaf-fill' }));
      grp.appendChild(el('path', { d: lp.rib }));
    }
  }
  // tête : bourgeon ou fleur
  const hg = node(4);
  if (R() < .55) {
    hg.appendChild(el('circle', { cx: f(top[0]), cy: f(top[1] - 4), r: 4.2, class: 'bud' }));
    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .45; const lp = leafPath(top[0], top[1] - 2, a, 13, 4.2, 'round'); hg.appendChild(el('path', { d: lp.d, class: 'leaf-fill' })); }
  } else {
    hg.appendChild(el('circle', { cx: f(top[0]), cy: f(top[1]), r: 3.2, class: 'bud' }));
    const lp = leafPath(top[0], top[1], -Math.PI / 2 + (R() - .5) * .4, 16, 5, 'lance'); hg.appendChild(el('path', { d: lp.d, class: 'leaf-fill' }));
  }
  // ligne de sol
  if (o.groundLine !== false) svg.insertBefore(el('path', { d: `M30,${ground} C70,${ground - 2} 130,${ground + 2} 170,${ground}`, class: 'rootl' }), g);
  return groups;
}

// Dessin au trait (stroke-dashoffset) d'une plante
export function drawPlant(svg, gsap, { duration = 1.6, delay = 0 } = {}) {
  const items = svg.querySelectorAll('path, circle');
  items.forEach((p) => {
    if (p.tagName === 'circle') { gsap.fromTo(p, { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: .5, delay: delay + duration * .8, ease: 'back.out(3)' }); return; }
    const len = p.getTotalLength ? p.getTotalLength() : 100;
    p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
    const fill = p.classList.contains('leaf-fill');
    if (fill) p.style.fillOpacity = 0;
    gsap.to(p, { strokeDashoffset: 0, duration: duration * (0.5 + Math.min(1, len / 200) * .5), delay: delay + Math.random() * duration * .4, ease: 'power2.inOut' });
    if (fill) gsap.to(p, { fillOpacity: 1, duration: .6, delay: delay + duration * .7 });
  });
}
