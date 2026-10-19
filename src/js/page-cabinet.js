// Fiche cabinet : statut en direct, cadran des horaires, plan de situation, cabinets voisins, contact simulé.
import { $, $$, T, lang, reduced, openStatus, localNow, hhmm, dayName, getJSON, haversine, fmtDate, base } from './util.js';
import { loadCabinets, proj } from './finder.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export async function initCabinetPage() {
  const id = document.body.dataset.cabinet;
  const [cabs, map] = await Promise.all([loadCabinets(), getJSON('assets/data/map.json')]);
  const c = cabs.find((x) => x.id === id); if (!c) return;

  // statut en direct
  const badge = $('[data-live-status]'), live = $('[data-live-text]');
  const upd = () => { const s = openStatus(c); if (badge) { badge.textContent = s.text; badge.classList.toggle('is-open', s.open); } if (live) live.textContent = s.text; };
  upd(); setInterval(upd, 30000);

  // liste des horaires
  const now = localNow(c.tz);
  const ul = $('[data-hours]');
  if (ul && c.h) ul.innerHTML = c.h.map((rs, d) => `<li class="${d === now.day ? 'is-today' : ''}"><span>${dayName(d).replace(/^./, (m) => m.toUpperCase())}</span><span>${rs && rs.length ? rs.map((r) => `${hhmm(r[0])} – ${hhmm(r[1])}`).join(T(' puis ', ', then ')) : T('Fermé', 'Closed')}</span></li>`).join('');

  // cadran : 7 anneaux (lundi au centre), arcs d'ouverture, aiguille de l'heure
  const dial = $('[data-dial]');
  if (dial && c.h) {
    const cx = 150, cy = 150, r0 = 42, gap = 13;
    const pt = (r, m) => { const a = (m / 1440) * Math.PI * 2 - Math.PI / 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
    const arc = (r, a, b) => { const [x1, y1] = pt(r, a), [x2, y2] = pt(r, b); return `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${b - a > 720 ? 1 : 0} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`; };
    for (let h = 0; h < 24; h += 6) { const [x, y] = pt(r0 + gap * 7 + 10, h * 60); dial.appendChild(mk('text', { x: x.toFixed(1), y: (y + 3).toFixed(1), 'text-anchor': 'middle' })).textContent = lang() === 'en' ? `${h}:00` : `${h}h`; }
    const arcs = [];
    c.h.forEach((rs, d) => {
      const r = r0 + d * gap;
      dial.appendChild(mk('circle', { cx, cy, r, fill: 'none', stroke: 'rgba(20,32,44,.1)', 'stroke-width': 1 }));
      (rs || []).forEach((q) => { const p = mk('path', { d: arc(r, q[0], q[1]), fill: 'none', stroke: d === now.day ? '#DA5914' : '#008FC3', 'stroke-width': d === now.day ? 7 : 5, 'stroke-linecap': 'round', pathLength: 1 }); dial.appendChild(p); arcs.push(p); });
      const [lx, ly] = pt(r, 1440 * .985); dial.appendChild(mk('text', { x: (lx - 4).toFixed(1), y: (ly + 3).toFixed(1), 'text-anchor': 'end' })).textContent = dayName(d).slice(0, 2);
    });
    const hand = mk('g', {}); const [hx, hy] = pt(r0 + gap * 6.6, 0);
    hand.appendChild(mk('line', { x1: cx, y1: cy, x2: hx, y2: hy, stroke: '#008FC3', 'stroke-width': 1.6, 'stroke-linecap': 'round' }));
    hand.appendChild(mk('circle', { cx: hx, cy: hy, r: 5, fill: '#F59A00' }));
    hand.appendChild(mk('circle', { cx, cy, r: 4, fill: '#0F1D2B' }));
    dial.appendChild(hand);
    const setHand = () => { const n = localNow(c.tz); hand.setAttribute('transform', `rotate(${(n.min / 1440) * 360} ${cx} ${cy})`); };
    if (reduced()) setHand();
    else {
      gsap.set(arcs, { strokeDasharray: 1, strokeDashoffset: 1 });
      window.ScrollTrigger.create({ trigger: dial, start: 'top 80%', once: true, onEnter: () => {
        gsap.to(arcs, { strokeDashoffset: 0, duration: 1.2, stagger: .06, ease: 'power2.out' });
        const n = localNow(c.tz); const o = { a: 0 };
        gsap.to(o, { a: (n.min / 1440) * 360, duration: 2, ease: 'power3.inOut', onUpdate: () => hand.setAttribute('transform', `rotate(${o.a} ${cx} ${cy})`) });
      } });
    }
    setInterval(setHand, 60000);
  }

  // cabinets voisins
  const others = cabs.filter((x) => x.id !== c.id).map((x) => ({ x, d: haversine([c.lat, c.lon], [x.lat, x.lon]) })).sort((a, b) => a.d - b.d).slice(0, 3);
  const nb = $('[data-nearby]');
  if (nb) nb.innerHTML = others.map(({ x, d }) => { const s = openStatus(x); return `<a href="${x.u}" target="_blank" rel="noopener"><strong>${x.n}</strong><span class="cab__meta" style="color:var(--ink-soft)">${x.a}</span><span class="cab__dist">${Math.round(d)} km</span><span class="status ${s.open ? 'status--open' : ''}">${s.text}</span></a>`; }).join('');

  // plan de situation : la France zoomée, liaison depuis le siège du groupe
  const svg = $('[data-access-map]');
  if (svg) {
    const head = map.heads[c.g] || map.paris;
    const pts = [[c.x, c.y], head, ...others.map((o) => [o.x.x, o.x.y])];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const w = Math.max(24, (Math.max(...xs) - Math.min(...xs)) * 2.1), h = w * .75;
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
    svg.setAttribute('viewBox', `${mx - w / 2} ${my - h / 2} ${w} ${h}`);
    const s = w / 100;
    svg.appendChild(mk('rect', { x: mx - w, y: my - h, width: w * 2, height: h * 2, fill: '#0F1D2B' }));
    svg.appendChild(mk('path', { d: map.france, fill: '#1E3348', stroke: 'rgba(238,241,243,.3)', 'stroke-width': s * .15 }));
    svg.appendChild(mk('path', { d: map.deps, fill: 'none', stroke: 'rgba(238,241,243,.14)', 'stroke-width': s * .12 }));
    const link = mk('path', { d: `M${head[0]},${head[1]} C${head[0] + (c.x - head[0]) * .3},${head[1] - h * .12} ${head[0] + (c.x - head[0]) * .7},${c.y + h * .12} ${c.x},${c.y}`, fill: 'none', stroke: '#3DB6DB', 'stroke-width': s * .5, 'stroke-linecap': 'round', pathLength: 1 });
    svg.appendChild(link);
    const label = (x, y, t, col = 'rgba(238,241,243,.82)', anchor = 'start', size = 2.6) => { const e = mk('text', { x: x + (anchor === 'start' ? s * 2 : -s * 2), y: y + s * .9, fill: col, 'font-size': s * size, 'font-family': 'Inter Tight, Arial, sans-serif', 'text-anchor': anchor }); e.textContent = t; svg.appendChild(e); };
    const seenC = new Set();
    others.forEach(({ x }) => { svg.appendChild(mk('circle', { cx: x.x, cy: x.y, r: s * .9, fill: '#EEF1F3' })); if (!seenC.has(x.c) && Math.hypot(x.x - head[0], x.y - head[1]) > s * 3) { seenC.add(x.c); label(x.x, x.y, x.c); } });
    svg.appendChild(mk('circle', { cx: head[0], cy: head[1], r: s * 1.1, fill: '#3DB6DB' }));
    const hl = mk('text', { x: head[0], y: head[1] + s * 4.6, fill: '#3DB6DB', 'font-size': s * 2.6, 'font-family': 'Inter Tight, Arial, sans-serif', 'text-anchor': 'middle' }); hl.textContent = T('Toulouse, siège du groupe', 'Toulouse, group head office'); svg.appendChild(hl);
    svg.appendChild(mk('circle', { cx: c.x, cy: c.y, r: s * 1.6, fill: '#F59A00' }));
    label(c.x, c.y, 'Exco Albi', '#F59A00', 'start', 3.4);
    if (!reduced()) { gsap.set(link, { strokeDasharray: 1, strokeDashoffset: 1 }); window.ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => gsap.to(link, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }) }); }
  }

  // dates des actualités
  $$('[data-date]').forEach((e) => (e.textContent = fmtDate(new Date(e.dataset.date)) + (lang() === 'en' ? ' (article in French)' : '')));

  // formulaire de contact simulé
  const f = $('[data-contact]');
  if (f) f.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = f.nom.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()) && f.message.value.trim();
    $('[data-c-err]', f).hidden = !!ok; $('[data-c-ok]', f).hidden = !ok;
  });

  // les avantages poussent l'un après l'autre
  if (!reduced()) gsap.fromTo($$('[data-pluses] li'), { x: 40, opacity: 0 }, { x: 0, opacity: 1, stagger: .15, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '[data-pluses]', start: 'top 80%', once: true } });
}
