// Moteur de racines en canvas 2D : croissance progressive, ramifications, impulsions de sève.
import { rng, fitCanvas, clamp } from './util.js';

export class Roots {
  constructor(canvas, o = {}) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.o = Object.assign({
      seeds: [], // [{x, y, a}] en fraction de la taille (0..1), a = angle en radians
      color: 'rgba(237,229,211,0.75)', glow: 'rgba(245,154,0,0.10)',
      width: 2.4, step: 3.2, branch: 0.035, curl: 0.22, gravity: 0.06, life: 220,
      maxSeg: 9000, seed: 3, pulses: 0, pulseColors: ['#F59A00', '#3DB6DB'], speed: 6, fade: false,
    }, o);
    this.r = rng(this.o.seed);
    this.paths = []; this.tips = []; this.segs = 0; this.pulses = []; this.done = false;
    this.off = document.createElement('canvas'); this.octx = this.off.getContext('2d');
    this.resize();
  }
  resize() {
    const { w, h, dpr } = fitCanvas(this.c);
    this.w = w; this.h = h; this.dpr = dpr;
    this.off.width = w; this.off.height = h;
    this.reset();
  }
  reset() {
    this.paths = []; this.tips = []; this.segs = 0; this.done = false; this.pulses = [];
    this.r = rng(this.o.seed);
    this.octx.clearRect(0, 0, this.w, this.h);
    for (const s of this.o.seeds) this.spawn(s.x * this.w, s.y * this.h, s.a ?? Math.PI / 2, this.o.width * this.dpr * (s.k || 1), this.o.life, 0);
  }
  spawn(x, y, a, wd, life, depth, target) {
    const p = { pts: [[x, y, wd]], depth };
    this.paths.push(p);
    this.tips.push({ x, y, a, wd, life, depth, p, target, wob: this.r() * 10 });
    return p;
  }
  // fait pousser n pas ; dessine les nouveaux segments sur le canvas hors écran
  grow(n = 1) {
    const o = this.o, ctx = this.octx, R = this.r;
    for (let k = 0; k < n; k++) {
      if (!this.tips.length || this.segs > o.maxSeg) { this.done = true; return; }
      const next = [];
      for (const t of this.tips) {
        if (t.life <= 0 || t.wd < 0.25) continue;
        // direction : bruit + gravité (+ cible éventuelle)
        t.wob += 0.35;
        let da = (R() - 0.5) * o.curl + Math.sin(t.wob) * 0.04;
        const down = Math.PI / 2;
        da += Math.sin(down - t.a) * o.gravity;
        if (t.target) { const ta = Math.atan2(t.target[1] - t.y, t.target[0] - t.x); da += Math.sin(ta - t.a) * 0.25; }
        t.a += da;
        const st = o.step * this.dpr * (0.7 + t.wd / (o.width * this.dpr) * 0.5);
        const nx = t.x + Math.cos(t.a) * st, ny = t.y + Math.sin(t.a) * st;
        // dessin
        ctx.lineCap = 'round';
        if (o.glow) { ctx.strokeStyle = o.glow; ctx.lineWidth = t.wd * 4.5; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(nx, ny); ctx.stroke(); }
        ctx.strokeStyle = o.color; ctx.lineWidth = t.wd; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(nx, ny); ctx.stroke();
        t.x = nx; t.y = ny; t.life--; t.wd *= 0.992; this.segs++;
        t.p.pts.push([nx, ny, t.wd]);
        if (nx < -40 || ny < -40 || nx > this.w + 40 || ny > this.h + 40) continue;
        next.push(t);
        // ramification
        if (R() < o.branch * (1 - t.depth * 0.18) && t.depth < 5) {
          const side = R() < 0.5 ? -1 : 1;
          const nb = { x: nx, y: ny, a: t.a + side * (0.5 + R() * 0.7), wd: t.wd * (0.55 + R() * 0.2), life: t.life * (0.45 + R() * 0.4), depth: t.depth + 1, wob: R() * 10 };
          nb.p = { pts: [[nx, ny, nb.wd]], depth: nb.depth }; this.paths.push(nb.p);
          next.push(nb);
          // petit nœud lumineux
          ctx.fillStyle = o.node || 'rgba(245,154,0,0.55)'; ctx.beginPath(); ctx.arc(nx, ny, Math.max(1, t.wd * 0.9), 0, 6.283); ctx.fill();
        }
      }
      this.tips = next;
    }
  }
  growAll() { let g = 0; while (!this.done && g++ < 4000) this.grow(1); }
  // racinette qui part du point le plus proche vers une cible (interaction curseur)
  sprout(tx, ty, life = 40) {
    let best = null, bd = 1e12;
    for (let i = 0; i < this.paths.length; i += 2) {
      const pts = this.paths[i].pts; const q = pts[(pts.length * this.r()) | 0];
      const d = (q[0] - tx) ** 2 + (q[1] - ty) ** 2; if (d < bd) { bd = d; best = q; }
    }
    if (!best || bd > (260 * this.dpr) ** 2) return;
    const a = Math.atan2(ty - best[1], tx - best[0]);
    const t = { x: best[0], y: best[1], a, wd: Math.max(0.6, best[2] * 0.6), life, depth: 4, wob: this.r() * 10, target: [tx, ty] };
    t.p = { pts: [[t.x, t.y, t.wd]], depth: 4 }; this.paths.push(t.p); this.tips.push(t); this.done = false;
  }
  addPulse() {
    const long = this.paths.filter((p) => p.pts.length > 40);
    if (!long.length) return;
    const p = long[(this.r() * long.length) | 0];
    this.pulses.push({ p, i: 0, col: this.o.pulseColors[(this.r() * this.o.pulseColors.length) | 0], v: (0.6 + this.r() * 0.8) * this.o.speed });
  }
  render(alpha = 1) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.globalAlpha = alpha; ctx.drawImage(this.off, 0, 0); ctx.globalAlpha = 1;
    if (!this.o.pulses) return;
    for (let k = 0; k < 3 && this.pulses.length < this.o.pulses; k++) this.addPulse();
    ctx.globalCompositeOperation = 'lighter';
    this.pulses = this.pulses.filter((u) => {
      u.i += u.v * 0.25;
      const pts = u.p.pts; const i = Math.floor(u.i);
      if (i >= pts.length - 1) return false;
      for (let k = 0; k < 7; k++) {
        const q = pts[Math.max(0, i - k * 2)]; const a = (1 - k / 7) * 0.9;
        const rad = (2.2 + (6 - k) * 0.35) * this.dpr;
        const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], rad * 3);
        g.addColorStop(0, u.col); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q[0], q[1], rad * 3, 0, 6.283); ctx.fill();
      }
      return true;
    });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  // points de ramification (pour placer des étiquettes)
  nodes(n = 8, minDist = 120) {
    const out = [];
    const cands = this.paths.filter((p) => p.depth >= 1 && p.pts.length > 3).map((p) => p.pts[0]);
    cands.sort(() => this.r() - 0.5);
    for (const q of cands) {
      if (q[1] < this.h * 0.15 || q[0] < this.w * 0.05 || q[0] > this.w * 0.95) continue;
      if (out.every((o) => Math.hypot(o[0] - q[0], o[1] - q[1]) > minDist * this.dpr)) out.push(q);
      if (out.length >= n) break;
    }
    return out.map((q) => [q[0] / this.dpr, q[1] / this.dpr]);
  }
}

// Animation autonome : fait pousser puis rend en boucle tant que visible
export function animateRoots(roots, { perFrame = 3, onDone, loop = false, alpha = () => 1 } = {}) {
  let raf = 0, alive = true, visible = true;
  const tick = () => {
    raf = 0;
    if (!alive || !visible) return;
    if (!roots.done) roots.grow(perFrame); else if (onDone) { onDone(); onDone = null; }
    roots.render(alpha());
    if (!roots.done || loop || roots.o.pulses) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  let io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && alive && !raf) raf = requestAnimationFrame(tick); });
    io.observe(roots.c);
  }
  return { stop() { alive = false; cancelAnimationFrame(raf); raf = 0; io && io.disconnect(); }, start() { if (!alive) { alive = true; raf = requestAnimationFrame(tick); } } };
}

export const seedsAlong = (y, n, spread = 0.9, rnd = Math.random) => Array.from({ length: n }, (_, i) => ({ x: (1 - spread) / 2 + spread * (i + 0.5) / n + (rnd() - 0.5) * 0.05, y, a: Math.PI / 2 + (rnd() - 0.5) * 0.5, k: 0.7 + rnd() * 0.6 }));
export { clamp };
