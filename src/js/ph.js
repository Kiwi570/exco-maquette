// Visuels provisoires dessinés en code, en attendant les images Grok.
// Si l'image Grok existe (liste GROK_READY), elle remplace le visuel provisoire.
import { $$, rng, T, base, onVisible } from './util.js';
import { Roots } from './roots.js';
import { buildPlant } from './plant.js';

export const GROK_READY = new Set([
  'accueil-hero-racines-16x9', 'accueil-hero-racines-9x16', 'cycle-01-creer-4x5', 'cycle-02-developper-4x5', 'cycle-03-transformer-4x5',
  'cycle-04-transmettre-4x5', 'rdv-salle-reunion-4x5', 'ec-hero-graine-16x9', 'ec-hero-graine-9x16', 'ec-cernes-tronc',
]);

const PALETTES = [
  ['#3a3022', '#1d1913'], ['#2f3a2a', '#171c14'], ['#40301f', '#1b1610'], ['#2c3433', '#141918'], ['#3d3526', '#1a1712'],
  ['#3b2c24', '#1a1411'], ['#33392a', '#181b13'],
];

function strata(c, seed) {
  const ctx = c.getContext('2d'); const R = rng(seed);
  const w = c.width, h = c.height;
  const cols = ['#2a231a', '#3a2f22', '#4a3c2a', '#2f281e', '#5a4a33', '#241e16', '#3f3426'];
  let y = 0;
  while (y < h) {
    const bh = 10 + R() * h * .12; const col = cols[(R() * cols.length) | 0];
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += w / 24) ctx.lineTo(x, y + Math.sin(x * .004 + R() * 2) * 6 + (R() - .5) * 3);
    ctx.lineTo(w, y + bh + 8); ctx.lineTo(0, y + bh + 8); ctx.closePath(); ctx.fill();
    y += bh;
  }
  // grain
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (R() - .5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}

export function initPlaceholders(gsap) {
  $$('.ph').forEach((ph, idx) => {
    if (ph.dataset.done) return; ph.dataset.done = '1';
    const name = ph.dataset.grok;
    if (name && GROK_READY.has(name)) {
      const im = new Image(); im.className = 'ph__real'; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      im.src = `${base()}assets/img/grok/${name}.webp`; ph.appendChild(im); return;
    }
    const type = ph.dataset.ph || 'soil';
    const seed = (name || type).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0) + idx;
    const pal = PALETTES[seed % PALETTES.length];
    ph.style.background = `radial-gradient(120% 120% at 30% 20%, ${pal[0]}, ${pal[1]} 72%)`;
    if (type === 'herbier') {
      ph.style.background = 'transparent';
      const R = rng(seed);
      for (let i = 0; i < 7; i++) {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('class', 'ph__art'); s.setAttribute('aria-hidden', 'true');
        s.style.cssText = `left:${R() * 90}%;top:${R() * 70}%;width:${140 + R() * 120}px;height:auto;inset:auto;opacity:.18;transform:rotate(${(R() - .5) * 40}deg)`;
        buildPlant(s, seed + i, { groundLine: false });
        s.querySelectorAll('path').forEach((p) => { p.style.stroke = '#55603E'; p.style.fill = p.classList.contains('leaf-fill') ? 'rgba(85,96,62,.25)' : 'none'; });
        ph.appendChild(s);
      }
      return;
    }
    const c = document.createElement('canvas'); ph.appendChild(c);
    const draw = () => {
      const r = ph.getBoundingClientRect(); if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr);
      if (type === 'strata') { strata(c, seed); return; }
      const roots = new Roots(c, {
        seeds: type === 'deep' ? Array.from({ length: 9 }, (_, i) => ({ x: (i + .5) / 9, y: -.02, a: Math.PI / 2 + (Math.random() - .5) * .4 }))
          : [{ x: .5, y: .05, a: Math.PI / 2 }, { x: .2, y: 0, a: 1.9 }, { x: .8, y: 0, a: 1.2 }],
        color: type === 'deep' ? 'rgba(237,229,211,.18)' : 'rgba(237,229,211,.32)', glow: 'rgba(245,154,0,.05)', node: 'rgba(245,154,0,.6)',
        width: 1.6, step: 3, branch: .05, life: 160, seed, maxSeg: 4000,
      });
      roots.growAll(); roots.render();
    };
    onVisible(ph, (v) => { if (v && !c.dataset.drawn) { c.dataset.drawn = '1'; draw(); } }, { margin: '200px' });
    if (ph.dataset.word) { const w = document.createElement('span'); w.className = 'ph__word'; w.textContent = ph.dataset.word; w.setAttribute('aria-hidden', 'true'); ph.appendChild(w); }
    if (!ph.classList.contains('ph--fill')) { const t = document.createElement('span'); t.className = 'ph__tag'; t.textContent = T('Visuel provisoire', 'Temporary visual'); ph.appendChild(t); }
  });
}
