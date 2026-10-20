// Fiche cabinet : statut en direct, cadran des horaires, plan de situation, cabinets voisins, contact simulé.
import { $, $$, T, lang, reduced, openStatus, localNow, hhmm, dayName, getJSON, haversine, fmtDate, base } from './util.js';
import { loadCabinets, proj } from './finder.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

// textes de service longs : quatre lignes, puis « Lire la suite »
function initSvcMore() {
  $$('.svc-list li').forEach((li) => {
    const p = $('p', li); if (!p || p.scrollHeight <= p.clientHeight + 4) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'svc-list__more'; b.setAttribute('aria-expanded', 'false');
    const lab = () => (li.classList.contains('is-open') ? T('Réduire', 'Show less') : T('Lire la suite', 'Read more'));
    b.textContent = lab();
    b.addEventListener('click', () => { li.classList.toggle('is-open'); b.setAttribute('aria-expanded', String(li.classList.contains('is-open'))); b.textContent = lab(); window.ScrollTrigger && window.ScrollTrigger.refresh(); });
    li.appendChild(b);
  });
}

// barre d'actions (téléphone) : visible une fois les boutons de l'ouverture passés, effacée sur le formulaire de contact
function initBar() {
  const bar = $('.cab-bar'), acts = $('.cab-actions'), form = $('#contact'); if (!bar || !('IntersectionObserver' in window)) return;
  const st = { acts: true, form: false };
  const upd = () => bar.classList.toggle('is-away', st.acts || st.form);
  upd();
  if (acts) new IntersectionObserver((es) => es.forEach((e) => { st.acts = e.isIntersecting || e.boundingClientRect.top > 0; upd(); })).observe(acts);
  if (form) new IntersectionObserver((es) => es.forEach((e) => { st.form = e.isIntersecting; upd(); }), { threshold: .15 }).observe(form);
}

export async function initCabinetPage() {
  initSvcMore(); initBar();
  // le bouton « Prendre rendez-vous » de l'en-tête ouvre la demande avec ce cabinet déjà choisi
  $$('.hd__cta, .menu .btn--primary').forEach((a) => { if (a.tagName === 'A') a.setAttribute('href', base() + 'contact.html#' + document.body.dataset.cabinet); });
  const id = document.body.dataset.cabinet;
  const cabs = await loadCabinets();
  const c = cabs.find((x) => x.id === id); if (!c) return;
  const map = c.reg === 'fr' && $('[data-access-map]') ? await getJSON('assets/data/france.json') : null;

  // fiche du lieu (cabinet sans photo) : heure locale
  const clock = $('[data-clock]');
  if (clock) {
    const f = new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'fr-FR', { timeZone: c.tz, hour: '2-digit', minute: '2-digit' });
    const tick = () => { clock.textContent = f.format(new Date()); };
    tick(); setInterval(tick, 20000);
  }

  // statut en direct
  const badge = $('[data-live-status]'), live = $('[data-live-text]');
  const upd = () => { const s = openStatus(c); $$('[data-live-status]').forEach((b) => { b.textContent = s.text; b.classList.toggle('is-open', s.open); }); if (live) live.textContent = s.text; };
  upd(); setInterval(upd, 30000);

  // liste des horaires
  const now = localNow(c.tz);
  const ul = $('[data-hours]');
  if (ul && c.h) ul.innerHTML = c.h.map((rs, d) => `<li class="${d === now.day ? 'is-today' : ''}"><span>${dayName(d).replace(/^./, (m) => m.toUpperCase())}</span><span>${rs && rs.length ? rs.map((r) => `<span class="nw">${hhmm(r[0])}–${hhmm(r[1])}</span>`).join(' · ') : T('Fermé', 'Closed')}</span></li>`).join('');

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
  const km = (d) => (d < 10 ? d.toFixed(1).replace('.', lang() === 'en' ? '.' : ',') : Math.round(d).toLocaleString(lang() === 'en' ? 'en-GB' : 'fr-FR'));
  if (nb) nb.innerHTML = others.map(({ x, d }) => { const s = openStatus(x); return `<a href="${base()}cabinets/${x.id}.html" data-transition><strong>${x.n}</strong><span class="cab__meta" style="color:var(--ink-soft)">${x.a}</span><span class="cab__dist">${km(d)} km</span><span class="status ${s.open ? 'status--open' : ''}">${s.text}</span></a>`; }).join('');

  // plan de situation : la France zoomée, liaison depuis le siège du groupe
  const svg = $('[data-access-map]');
  if (svg && map) {
    const head = map.heads[c.g] || map.paris;
    const headCity = (svg.closest('[data-head-city]') || document.body).dataset.headCity || '';
    const pts = [[c.x, c.y], head, ...others.map((o) => [o.x.x, o.x.y])];
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const w = Math.max(24, (Math.max(...xs) - Math.min(...xs)) * 2.1), h = w * .75;
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
    svg.setAttribute('viewBox', `${mx - w / 2} ${my - h / 2} ${w} ${h}`);
    const s = w / 100;
    svg.appendChild(mk('rect', { x: mx - w, y: my - h, width: w * 2, height: h * 2, fill: '#0F1D2B' }));
    svg.appendChild(mk('path', { d: map.france, fill: '#1E3348', stroke: 'rgba(238,241,243,.3)', 'stroke-width': s * .15 }));
    svg.appendChild(mk('path', { d: map.deps, fill: 'none', stroke: 'rgba(238,241,243,.14)', 'stroke-width': s * .12 }));
    // courbure proportionnée à la distance (pas de boucle quand le siège est tout près) ; pas de liaison si le cabinet est le siège
    const dd = Math.hypot(c.x - head[0], c.y - head[1]), bend = Math.min(h * .12, dd * .3);
    const link = mk('path', { d: `M${head[0]},${head[1]} C${head[0] + (c.x - head[0]) * .3},${head[1] - bend} ${head[0] + (c.x - head[0]) * .7},${c.y + bend} ${c.x},${c.y}`, fill: 'none', stroke: '#3DB6DB', 'stroke-width': s * .5, 'stroke-linecap': 'round', pathLength: 1 });
    if (dd > s * 2) svg.appendChild(link);
    // étiquettes placées sans se chevaucher : à droite, à gauche, au-dessus ou au-dessous du point, dans le cadre
    const vb = [mx - w / 2, my - h / 2, mx + w / 2, my + h / 2], boxes = [];
    const out = (b) => b[0] < vb[0] + s * .4 || b[2] > vb[2] - s * .4 || b[1] < vb[1] + s * .4 || b[3] > vb[3] - s * .4;
    const hit = (b) => out(b) || boxes.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
    const dotBox = (x, y, r) => boxes.push([x - r, y - r, x + r, y + r]);
    const place = (x, y, t, prefs, col = 'rgba(238,241,243,.82)', size = 2.6, force = false) => {
      const tw = s * size * .56 * t.length, th = s * size;
      const C = { r: [x + s * 2.2, y + th * .32, 'start'], l: [x - s * 2.2, y + th * .32, 'end'], b: [x, y + s * 2.8 + th * .85, 'middle'], t: [x, y - s * 2.2, 'middle'],
        br: [x - s * 1.2, y + s * 2.8 + th * .85, 'start'], bl: [x + s * 1.2, y + s * 2.8 + th * .85, 'end'], tr: [x - s * 1.2, y - s * 2.2, 'start'], tl: [x + s * 1.2, y - s * 2.2, 'end'] };
      const boxOf = ([tx, ty, an]) => { const x0 = an === 'start' ? tx : an === 'end' ? tx - tw : tx - tw / 2; return [x0, ty - th * .82, x0 + tw, ty + th * .22]; };
      // étiquette obligatoire (le cabinet, le siège) : à défaut de place libre, première position dans le cadre
      const k = prefs.find((q) => !hit(boxOf(C[q]))) || (force && prefs.find((q) => !out(boxOf(C[q])))); if (!k) return;
      boxes.push(boxOf(C[k]));
      const e = mk('text', { x: C[k][0], y: C[k][1], fill: col, 'font-size': th, 'font-family': 'Inter Tight, Arial, sans-serif', 'text-anchor': C[k][2] }); e.textContent = t; svg.appendChild(e);
    };
    others.forEach(({ x }) => { svg.appendChild(mk('circle', { cx: x.x, cy: x.y, r: s * .9, fill: '#EEF1F3' })); dotBox(x.x, x.y, s * 1.05); });
    svg.appendChild(mk('circle', { cx: head[0], cy: head[1], r: s * 1.1, fill: '#3DB6DB' })); dotBox(head[0], head[1], s * 1.4);
    svg.appendChild(mk('circle', { cx: c.x, cy: c.y, r: s * 1.6, fill: '#F59A00' }));
    // d'abord le cabinet, puis le siège (du côté opposé au cabinet), puis les voisins
    place(c.x, c.y, c.n.replace(/^Exco\s+/, 'Exco '), c.x > head[0] ? ['r', 'l', 't', 'b', 'tr', 'tl', 'br', 'bl'] : ['l', 'r', 't', 'b', 'tl', 'tr', 'bl', 'br'], '#F59A00', 3.4, true);
    dotBox(c.x, c.y, s * 1.8);
    // la liaison bleue compte comme un obstacle
    for (let i = 1; i < 12; i++) { const t = i / 12, u = 1 - t; const P = [head, [head[0] + (c.x - head[0]) * .3, head[1] - bend], [head[0] + (c.x - head[0]) * .7, c.y + bend], [c.x, c.y]]; const bx = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], by = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1]; dotBox(bx, by, s * .6); }
    const hlab = headCity ? T(`${headCity}, siège du groupe`, `${headCity}, group head office`) : T('Siège du groupe', 'Group head office');
    if (dd > s * 2) { const away = c.x > head[0] ? 'l' : 'r', v1 = c.y > head[1] ? 't' : 'b', v2 = v1 === 't' ? 'b' : 't'; place(head[0], head[1], hlab, [v1, v1 + away, v1 + (away === 'l' ? 'r' : 'l'), away, v2, v2 + away, v2 + (away === 'l' ? 'r' : 'l')], '#3DB6DB', 2.6, true); }
    const seenC = new Set();
    others.forEach(({ x }) => { if (!seenC.has(x.c) && Math.hypot(x.x - head[0], x.y - head[1]) > s * 3) { seenC.add(x.c); place(x.x, x.y, x.c, ['r', 'l', 'br', 'bl', 'tr', 'tl']); } });
    if (!reduced()) { gsap.set(link, { strokeDasharray: 1, strokeDashoffset: 1 }); window.ScrollTrigger.create({ trigger: svg, start: 'top 75%', once: true, onEnter: () => gsap.to(link, { strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut' }) }); }
  }

  // dates des actualités

  // formulaire de contact simulé
  const f = $('[data-contact]');
  if (f) f.addEventListener('submit', (e) => {
    e.preventDefault();
    const ok = f.nom.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim()) && f.message.value.trim();
    $('[data-c-err]', f).hidden = !!ok; $('[data-c-ok]', f).hidden = !ok;
  });

  // les avantages poussent l'un après l'autre
  if (!reduced() && $('[data-pluses]')) gsap.fromTo($$('[data-pluses] li'), { y: 28, opacity: 0 }, { y: 0, opacity: 1, stagger: .15, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: '[data-pluses]', start: 'top 80%', once: true } });
}
