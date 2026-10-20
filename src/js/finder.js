// Trouver mon cabinet : annuaire réel (139 fiches), carte SVG, liaisons groupe → cabinet, recherche, filtres.
import { $, $$, T, lang, reduced, norm, haversine, getJSON, openStatus, base } from './util.js';
import { initPlaceholders } from './ph.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export const SVC = {
  ec: ['Expertise comptable', 'Accounting'], audit: ['Audit', 'Audit'], conseil: ['Conseil', 'Advisory'], jur: ['Juridique et fiscal', 'Legal and tax'],
  social: ['Social, paie et RH', 'Payroll and HR'], eval: ['Évaluation', 'Valuation'], ft: ['Finance et transactions', 'Corporate finance'],
  gp: ['Gestion privée', 'Wealth management'], intl: ['International', 'International'], form: ['Formation', 'Training'],
  oti: ['Vérification OTI', 'Third-party verification'], rse: ['RSE', 'CSR'], forensics: ['Forensics', 'Forensics'],
};
// monogramme de la ville pour les cabinets sans photo
const mono = (c) => (c || '').split(/[\s'’-]+/).filter((w) => w && !/^(de|la|le|les|du|des|sur|en|l|d|et|lès|aux)$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
const svcLabel = (k) => (SVC[k] ? SVC[k][lang() === 'en' ? 1 : 0] : k);
const ZONES_OM = [['971', 'GP', 'Guadeloupe'], ['972', 'MQ', 'Martinique'], ['974', 'RE', 'La Réunion'], ['987', 'PF', T('Polynésie française', 'French Polynesia')]];

// Projection Equal Earth (identique à la préparation des données)
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;
export function proj(lon, lat) {
  const l = lon * Math.PI / 180, p = lat * Math.PI / 180;
  const t = Math.asin(M * Math.sin(p)), t2 = t * t, t6 = t2 * t2 * t2;
  const x = 2 * Math.sqrt(3) * l * Math.cos(t) / (3 * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = t * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x * 1000, -y * 1000];
}

let DATA = null, GAZ = null;
export async function loadCabinets() { if (!DATA) DATA = await getJSON('assets/data/cabinets.json'); return DATA; }
async function loadGaz() { if (!GAZ) { GAZ = await getJSON('assets/data/gazetteer.json'); GAZ.idx = GAZ.towns.map((t) => [norm(t[0]), t]); } return GAZ; }

const depOf = (pc) => {
  if (pc.startsWith('97')) return pc.slice(0, 3);
  if (pc.startsWith('20')) return +pc < 20200 ? '2A' : '2B';
  return pc.slice(0, 2);
};

// Résout un lieu saisi (ville, code postal, département) → { lat, lon, label } ou null
export async function resolvePlace(q) {
  q = (q || '').trim(); if (!q) return null;
  const g = await loadGaz();
  if (/^\d{5}$/.test(q)) { const d = g.deps[depOf(q)]; if (d) return { lat: d[1], lon: d[2], label: `${d[0]} (${depOf(q)})`, dep: true }; }
  if (/^(\d{2,3}|2a|2b)$/i.test(q)) { const d = g.deps[q.toUpperCase()]; if (d) return { lat: d[1], lon: d[2], label: `${d[0]} (${q.toUpperCase()})`, dep: true }; }
  const n = norm(q);
  const exact = g.idx.find(([k]) => k === n);
  const pre = exact || g.idx.find(([k]) => k.startsWith(n));
  if (pre) return { lat: pre[1][1], lon: pre[1][2], label: pre[1][0] };
  return null;
}
export function nearest(list, lat, lon, k = 3) {
  return list.map((c) => ({ c, d: haversine([lat, lon], [c.lat, c.lon]) })).sort((a, b) => a.d - b.d).slice(0, k);
}

export async function initFinder() {
  const root = $('[data-finder]'); if (!root) return null;
  const [cabs, map] = await Promise.all([loadCabinets(), getJSON('assets/data/map.json')]);
  const st = { zone: 'fr', svc: new Set(), open: false, q: '', ref: null, match: null, active: null };
  try { const pre = sessionStorage.getItem('exco-filter'); if (pre && SVC[pre]) { st.svc.add(pre); sessionStorage.removeItem('exco-filter'); $('.finder__filters', root).open = true; } } catch (e) {}

  // ---------- carte ----------
  const svg = $('[data-map]', root);
  const vbOf = (v) => map.views[v].join(' ');
  svg.setAttribute('viewBox', vbOf('fr')); svg.classList.add('zone-fr');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const gLand = mk('g'); svg.appendChild(gLand);
  gLand.appendChild(mk('path', { d: map.world, class: 'land' }));
  Object.values(map.present).forEach((d) => gLand.appendChild(mk('path', { d, class: 'land-present' })));
  gLand.appendChild(mk('path', { d: map.france, class: 'france' }));
  gLand.appendChild(mk('path', { d: map.deps, class: 'deps' }));
  Object.values(map.dom).forEach((d) => gLand.appendChild(mk('path', { d, class: 'dom' })));
  const gLinks = mk('g'); svg.appendChild(gLinks);
  const gPins = mk('g'); svg.appendChild(gPins);
  const halo = mk('circle', { class: 'halo', r: 0, cx: 0, cy: 0 }); svg.appendChild(halo);

  // liaisons : chaque cabinet relié au siège de son groupe (trait droit), chaque groupe au siège d'Exco à Paris (arc régulier)
  const line = (a, b) => `M${a[0].toFixed(2)},${a[1].toFixed(2)} L${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  const arc = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, k = L * .16; const mx = (a[0] + b[0]) / 2 - dy / L * k, my = (a[1] + b[1]) / 2 + dx / L * k; return `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${mx.toFixed(2)},${my.toFixed(2)} ${b[0].toFixed(2)},${b[1].toFixed(2)}`; };
  const fv = map.views.fr; const inFr = (h) => h[0] > fv[0] && h[0] < fv[0] + fv[2] && h[1] > fv[1] && h[1] < fv[1] + fv[3];
  const groupLinks = Object.entries(map.heads).map(([g, h]) => mk('path', { d: arc(map.paris, h), class: 'link link--g' + (inFr(h) ? '' : ' is-far'), pathLength: 1, 'data-g': g }));
  const cabLinks = cabs.map((c) => { const h = map.heads[c.g] || map.paris; return mk('path', { d: line(h, [c.x, c.y]), class: 'link' + (inFr(h) ? '' : ' is-far'), pathLength: 1, 'data-id': c.id }); });
  groupLinks.forEach((p) => gLinks.appendChild(p)); cabLinks.forEach((p) => gLinks.appendChild(p));
  Object.values(map.heads).forEach((h) => gPins.appendChild(mk('circle', { cx: h[0], cy: h[1], class: 'head', r: 1 })));
  gPins.appendChild(mk('circle', { cx: map.paris[0], cy: map.paris[1], class: 'paris', r: 1 }));
  const pins = new Map();
  cabs.forEach((c) => {
    const p = mk('circle', { cx: c.x, cy: c.y, r: 1, class: 'pin', 'data-id': c.id });
    p.addEventListener('click', () => select(c.id, true));
    p.addEventListener('pointerenter', () => { const cur = $('[data-cursor]'); if (cur) { $('[data-cursor-label]', cur).textContent = c.n; cur.classList.add('has-label', 'is-link'); } });
    p.addEventListener('pointerleave', () => { const cur = $('[data-cursor]'); cur && cur.classList.remove('has-label'); });
    gPins.appendChild(p); pins.set(c.id, p);
  });
  const sizeMarks = () => {
    const w = svg.viewBox.baseVal.width;
    const r = w / 190;
    $$('.pin', gPins).forEach((p) => p.setAttribute('r', p.classList.contains('is-active') ? r * 1.8 : r));
    $$('.head', gPins).forEach((p) => p.setAttribute('r', r * .9));
    $$('.paris', gPins).forEach((p) => p.setAttribute('r', r * 1.5));
    $$('.pin', gPins).forEach((p) => p.setAttribute('stroke-width', r * .35));
    cabLinks.forEach((p) => p.setAttribute('stroke-width', w / 600));
    groupLinks.forEach((p) => p.setAttribute('stroke-width', w / 420));
    halo.setAttribute('stroke-width', w / 400);
    $$('.deps', gLand).forEach((p) => p.setAttribute('stroke-width', w / 900));
    $$('.france', gLand).forEach((p) => p.setAttribute('stroke-width', w / 700));
  };
  sizeMarks();
  const setView = (vb, dur = 1.2) => {
    if (reduced() || !dur) { svg.setAttribute('viewBox', vb); sizeMarks(); return; }
    gsap.to(svg, { attr: { viewBox: vb }, duration: dur, ease: 'power3.inOut', onUpdate: sizeMarks });
  };
  // tracé des liaisons à l'entrée de la section
  const drawLinks = () => {
    if (reduced()) return;
    gsap.set([...groupLinks, ...cabLinks], { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set($$('.pin', gPins), { opacity: 0 });
    gsap.to(groupLinks, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', stagger: .04 });
    const order = cabs.map((c, i) => ({ i, d: Math.hypot(c.x - map.paris[0], c.y - map.paris[1]) })).sort((a, b) => a.d - b.d);
    order.forEach((o, k) => {
      gsap.to(cabLinks[o.i], { strokeDashoffset: 0, duration: 1.1, delay: 1 + k * .012, ease: 'power2.out' });
      gsap.to(pins.get(cabs[o.i].id), { opacity: 1, duration: .4, delay: 1.8 + k * .012 });
    });
  };
  window.ScrollTrigger.create({ trigger: root, start: 'top 70%', once: true, onEnter: drawLinks });

  // glisser pour déplacer (souris)
  let drag = null;
  svg.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.target.classList.contains('pin')) return; const vb = svg.viewBox.baseVal; drag = { x: e.clientX, y: e.clientY, vx: vb.x, vy: vb.y, k: vb.width / svg.clientWidth }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', (e) => { if (!drag) return; const vb = svg.viewBox.baseVal; svg.setAttribute('viewBox', `${drag.vx - (e.clientX - drag.x) * drag.k} ${drag.vy - (e.clientY - drag.y) * drag.k} ${vb.width} ${vb.height}`); });
  svg.addEventListener('pointerup', () => { drag = null; });
  // boutons de zoom
  const zoom = document.createElement('div'); zoom.className = 'map__zoom';
  zoom.innerHTML = `<button type="button" data-z="in" aria-label="${T('Zoomer', 'Zoom in')}">+</button><button type="button" data-z="out" aria-label="${T('Dézoomer', 'Zoom out')}">−</button><button type="button" data-z="reset" aria-label="${T('Vue d’ensemble', 'Reset view')}">⟲</button>`;
  $('[data-finder-map]', root).appendChild(zoom);
  zoom.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const vb = svg.viewBox.baseVal; const z = b.dataset.z;
    if (z === 'reset') return setView(vbOf(st.zone === 'int' ? 'int' : 'fr'), .9);
    const k = z === 'in' ? .6 : 1.6; const cx = vb.x + vb.width / 2, cy = vb.y + vb.height / 2;
    setView(`${cx - vb.width * k / 2} ${cy - vb.height * k / 2} ${vb.width * k} ${vb.height * k}`, .7);
  });

  // encarts outre-mer
  const insets = $('[data-map-insets]', root);
  ZONES_OM.forEach(([code, cc, name]) => {
    const box = document.createElement('div'); box.className = 'inset';
    const s = mk('svg', { viewBox: vbOf(code), preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': name });
    s.appendChild(mk('path', { d: map.dom[code] || '', class: 'dom' }));
    const vbw = map.views[code][2];
    cabs.filter((c) => c.cc === cc).forEach((c) => { const p = mk('circle', { cx: c.x, cy: c.y, r: vbw / 40, class: 'pin', 'stroke-width': vbw / 160, 'data-id': c.id }); p.addEventListener('click', () => select(c.id, true)); s.appendChild(p); });
    box.appendChild(s); const t = document.createElement('span'); t.className = 'inset__t'; t.textContent = name; box.appendChild(t);
    insets.appendChild(box);
  });

  // ---------- filtres ----------
  const chips = $('[data-finder-chips]', root);
  const counts = {}; cabs.forEach((c) => c.s.forEach((k) => (counts[k] = (counts[k] || 0) + 1)));
  Object.keys(SVC).filter((k) => counts[k]).forEach((k) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.k = k; b.setAttribute('aria-pressed', st.svc.has(k) ? 'true' : 'false');
    b.textContent = `${svcLabel(k)} (${counts[k]})`;
    b.addEventListener('click', () => { st.svc.has(k) ? st.svc.delete(k) : st.svc.add(k); b.setAttribute('aria-pressed', st.svc.has(k)); render(); });
    chips.appendChild(b);
  });
  const fcount = $('[data-fcount]', root);
  $$('[data-zone]', root).forEach((b) => b.addEventListener('click', () => setZone(b.dataset.zone)));
  $('[data-open-now]', root).addEventListener('change', (e) => { st.open = e.target.checked; render(); });

  function setZone(z, fromSelect = false) {
    if (st.zone === z && !fromSelect) return;
    st.zone = z;
    $$('[data-zone]', root).forEach((b) => b.setAttribute('aria-selected', b.dataset.zone === z ? 'true' : 'false'));
    const om = z === 'om';
    insets.hidden = !om; svg.classList.toggle('zone-fr', z === 'fr'); gsap.to(svg, { opacity: om ? 0 : 1, duration: .4 }); svg.style.pointerEvents = om ? 'none' : '';
    if (!om) setView(vbOf(z));
    render();
  }

  // ---------- liste ----------
  const list = $('[data-finder-list]', root), countEl = $('[data-finder-count]', root);
  const zoneOf = (c) => c.reg;
  function filtered() {
    let L = cabs.filter((c) => (st.match ? st.match.has(c.id) : zoneOf(c) === st.zone));
    if (st.svc.size) L = L.filter((c) => [...st.svc].every((k) => c.s.includes(k)));
    if (st.open) L = L.filter((c) => openStatus(c).open);
    if (st.ref) L = L.map((c) => ({ ...c, _d: haversine([st.ref.lat, st.ref.lon], [c.lat, c.lon]) })).sort((a, b) => a._d - b._d);
    return L;
  }
  function render() {
    const L = filtered();
    fcount.textContent = st.svc.size ? String(st.svc.size) : '';
    const where = st.match ? T('correspondant à « ', 'matching "') + st.q + T(' »', '"') : st.ref ? (st.ref.dep ? T('autour du département ', 'around département ') + st.ref.label : (lang() === 'en' ? 'around ' + st.ref.label : (/^[aeiouyàâéèêîôûœ]/i.test(st.ref.label) ? 'autour d’' : 'autour de ') + st.ref.label)) : '';
    countEl.textContent = `${L.length} ${L.length > 1 ? T('cabinets', 'offices') : T('cabinet', 'office')}${where ? ' ' + where : ''}${st.svc.size && cabs.some((c) => !c.s.length) ? T('. Certains cabinets n’ont pas encore de services renseignés.', '. Some offices have no services listed yet.') : ''}`;
    const ids = new Set(L.map((c) => c.id));
    pins.forEach((p, id) => { p.classList.toggle('is-dim', !ids.has(id)); p.classList.toggle('is-open', ids.has(id) && st.open); });
    cabLinks.forEach((p) => { p.style.opacity = ids.has(p.dataset.id) ? '' : '.08'; });
    list.innerHTML = '';
    if (!L.length) {
      const li = document.createElement('li'); li.className = 'cab__meta';
      li.textContent = st.open ? T('Aucun cabinet ouvert en ce moment avec ces critères. Décochez « Ouvert maintenant » pour voir tous les cabinets.', 'No office is open right now with these filters. Untick "Open now" to see every office.') : T('Aucun cabinet avec ces critères. Retirez un filtre ou changez de zone.', 'No office matches. Remove a filter or change area.');
      list.appendChild(li); return;
    }
    L.forEach((c) => {
      const s = openStatus(c);
      const li = document.createElement('li');
      li.innerHTML = `<button type="button" class="cab${st.active === c.id ? ' is-active' : ''}" data-id="${c.id}">
        <span class="cab__img">${c.p ? `<img src="${base()}assets/img/cabinets/${c.id}-480.webp" alt="" loading="lazy">` : `<span class="cab__mono" aria-hidden="true">${mono(c.c)}</span>`}</span>
        <span><span class="cab__name" style="display:block">${c.n}</span>
        <span class="cab__meta" style="display:block">${c.c}${c.reg !== 'fr' ? ', ' + c.co[lang() === 'en' ? 1 : 0] : ''}${c._d !== undefined ? `<span class="cab__dist">${c._d < 10 ? c._d.toFixed(1) : Math.round(c._d)} km</span>` : ''}</span>
        <span class="status ${s.open ? 'status--open' : ''}${s.soon ? ' status--soon' : ''}">${s.text}</span></span></button>`;
      li.firstElementChild.addEventListener('click', () => select(c.id, false));
      li.firstElementChild.addEventListener('mouseenter', () => pulse(c));
      list.appendChild(li);
    });
    initPlaceholders();
  }
  function pulse(c) {
    if (reduced()) return;
    const w = svg.viewBox.baseVal.width;
    gsap.fromTo(halo, { attr: { cx: c.x, cy: c.y, r: w / 120 }, opacity: .9 }, { attr: { r: w / 30 }, opacity: 0, duration: .9, ease: 'power2.out' });
  }

  // ---------- fiche sur la carte ----------
  const card = $('[data-map-card]', root);
  function select(id, fromMap) {
    const c = cabs.find((x) => x.id === id); if (!c) return;
    st.active = id;
    if (c.reg !== st.zone && !st.match) setZone(c.reg, true);
    pins.forEach((p, k) => p.classList.toggle('is-active', k === id));
    $$('.inset .pin', root).forEach((p) => p.classList.toggle('is-active', p.dataset.id === id));
    sizeMarks();
    $$('.cab', list).forEach((b) => b.classList.toggle('is-active', b.dataset.id === id));
    if (fromMap) { const b = $(`.cab[data-id="${id}"]`, list); if (b) b.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); }
    if (c.reg !== 'om') {
      const vb = svg.viewBox.baseVal; const w = c.reg === 'fr' ? Math.min(vb.width, 90) : Math.min(vb.width, 520);
      setView(`${c.x - w / 2} ${c.y - w * .36} ${w} ${w * .72}`, 1);
    }
    pulse(c);
    const s = openStatus(c);
    const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.n + ' ' + c.a)}`;
    card.innerHTML = `<button type="button" class="mc__close" aria-label="${T('Fermer', 'Close')}">×</button>
      <div class="mc__img">${c.p ? `<img src="${base()}assets/img/cabinets/${c.id}-960.webp" alt="${T('Façade ou accueil du cabinet ', 'Office ')}${c.n}">` : `<div class="ph" data-word="${c.c}"></div>`}</div>
      <div class="mc__body">
        <p class="mc__name"><a href="${base()}cabinets/${c.id}.html" data-transition style="text-decoration:none">${c.n}</a></p>
        <p class="mc__row">${c.g ? T('Groupe ', 'Group ') + c.g : ''}</p>
        <p class="mc__row"><span class="status ${s.open ? 'status--open' : ''}">${s.text}</span> <small>(${T('heure locale', 'local time')})</small></p>
        <p class="mc__row">${c.a}<br><span class="copy" data-copy="${c.t}">${c.t}</span></p>
        <p class="mc__links"><a href="${base()}cabinets/${c.id}.html" data-transition>${T('Voir la fiche du cabinet', 'See the office page')}</a><a href="${maps}" target="_blank" rel="noopener">${T('Itinéraire', 'Directions')}</a><a href="${base()}contact.html#${c.id}" data-transition>${T('Prendre rendez-vous', 'Book a meeting')}</a></p>
        ${c.s.length ? `<p class="mc__svc">${c.s.map((k) => `<span>${svcLabel(k)}</span>`).join('')}</p>` : `<p class="mc__row"><span class="chip chip--todo">${T('Services à compléter', 'Services to be added')}</span></p>`}
      </div>`;
    card.hidden = false;
    if (!reduced()) gsap.fromTo(card, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .5, ease: 'power3.out' });
    $('.mc__close', card).addEventListener('click', () => { card.hidden = true; st.active = null; pins.forEach((p) => p.classList.remove('is-active')); sizeMarks(); });
    $$('[data-copy]', card).forEach((el) => el.addEventListener('click', () => navigator.clipboard?.writeText(el.dataset.copy).catch(() => {})));
    initPlaceholders();
    try { sessionStorage.setItem('exco-last-cab', id); } catch (e) {}
  }

  // ---------- recherche ----------
  const input = $('[data-finder-q]', root), sug = $('[data-finder-suggest]', root), form = $('[data-finder-form]', root);
  let sugItems = [], sugI = -1;
  const closeSug = () => { sug.hidden = true; sugItems = []; sugI = -1; input.setAttribute('aria-expanded', 'false'); };
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false');
  input.addEventListener('input', async () => {
    const q = input.value.trim(); if (q.length < 2) { closeSug(); if (!q) clearQuery(); return; }
    const n = norm(q);
    const cabHits = cabs.filter((c) => wordHit(c, n) || c.pc.startsWith(q)).sort((a, b) => score(a, n) - score(b, n)).slice(0, 4).map((c) => ({ type: 'cab', label: c.n, sub: c.c, c }));
    const g = await loadGaz();
    const townHits = /^\d/.test(q) ? [] : g.idx.filter(([k]) => k.startsWith(n)).slice(0, 4).map(([, t]) => ({ type: 'town', label: t[0], sub: T('autour de cette ville', 'around this town'), t }));
    sugItems = [...cabHits, ...townHits];
    if (!sugItems.length) { closeSug(); return; }
    sug.innerHTML = sugItems.map((s, i) => `<li role="option" id="sug-${i}" aria-selected="false">${s.label}<small>${s.sub}</small></li>`).join('');
    sug.hidden = false; input.setAttribute('aria-expanded', 'true'); sugI = -1;
    $$('li', sug).forEach((li, i) => li.addEventListener('mousedown', (e) => { e.preventDefault(); pick(sugItems[i]); }));
  });
  input.addEventListener('keydown', (e) => {
    if (sug.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); sugI = (sugI + (e.key === 'ArrowDown' ? 1 : -1) + sugItems.length) % sugItems.length; $$('li', sug).forEach((li, i) => li.setAttribute('aria-selected', i === sugI)); input.setAttribute('aria-activedescendant', `sug-${sugI}`); }
    if (e.key === 'Enter' && sugI >= 0) { e.preventDefault(); pick(sugItems[sugI]); }
    if (e.key === 'Escape') closeSug();
  });
  input.addEventListener('blur', () => setTimeout(closeSug, 150));
  form.addEventListener('submit', (e) => { e.preventDefault(); closeSug(); query(input.value); });
  function pick(s) {
    closeSug();
    if (s.type === 'cab') { input.value = s.c.n; st.match = null; st.ref = null; st.q = ''; select(s.c.id, true); render(); }
    else { input.value = s.label; setRef({ lat: s.t[1], lon: s.t[2], label: s.label }); }
  }
  function clearQuery() { st.match = null; st.ref = null; st.q = ''; render(); }
  function setRef(ref) {
    st.match = null; st.ref = ref; st.q = '';
    const near = nearest(cabs, ref.lat, ref.lon, 5);
    const z = near[0].c.reg; if (z !== st.zone) setZone(z, true);
    render();
    if (z !== 'om') {
      const p = proj(ref.lon, ref.lat); const pts = [p, ...near.slice(0, 4).map((n) => [n.c.x, n.c.y])];
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const w = Math.max(z === 'fr' ? 40 : 200, (Math.max(...xs) - Math.min(...xs)) * 1.6), h = Math.max(w * .72, (Math.max(...ys) - Math.min(...ys)) * 1.6);
      setView(`${(Math.min(...xs) + Math.max(...xs)) / 2 - w / 2} ${(Math.min(...ys) + Math.max(...ys)) / 2 - h / 2} ${w} ${h}`, 1.2);
    }
    select(near[0].c.id, true);
  }
  // correspondance en début de mot (« albi » ne doit pas trouver « Balbigny »)
  const wordHit = (c, n) => { const hay = ` ${norm(`${c.n} ${c.c} ${c.g}`)}`; return hay.includes(` ${n}`); };
  const score = (c, n) => (norm(c.c) === n ? 0 : norm(c.n).endsWith(` ${n}`) || norm(c.n) === `exco ${n}` ? 1 : 2);
  async function query(q) {
    q = (q || '').trim(); st.q = q; if (!q) return clearQuery();
    const n = norm(q);
    // code postal : on trie autour du département, et on ouvre le cabinet de ce code s'il existe
    if (/^\d{5}$/.test(q)) {
      const ref = await resolvePlace(q);
      const exact = cabs.find((c) => c.pc === q);
      if (exact) { setRef({ lat: exact.lat, lon: exact.lon, label: `${q}` }); select(exact.id, true); return; }
      if (ref) { setRef(ref); return; }
    }
    const hits = /^\d{2,3}$/.test(q) ? [] : cabs.filter((c) => wordHit(c, n)).sort((a, b) => score(a, n) - score(b, n));
    if (hits.length) {
      const c = hits[0];
      setRef({ lat: c.lat, lon: c.lon, label: score(c, n) === 0 ? c.c : q.charAt(0).toUpperCase() + q.slice(1) });
      select(c.id, true); return;
    }
    const ref = await resolvePlace(q);
    if (ref) setRef(ref);
    else { st.match = new Set(); st.ref = null; card.hidden = true; st.active = null; pins.forEach((p) => p.classList.remove('is-active')); render(); countEl.textContent = T(`Aucun lieu trouvé pour « ${q} ». Essayez une ville, un code postal ou un numéro de département.`, `No place found for "${q}". Try a town, a postcode or a département number.`); }
  }
  // autour de moi
  $('[data-geoloc]', root).addEventListener('click', () => {
    if (!navigator.geolocation) { countEl.textContent = T('Localisation indisponible : saisissez votre ville.', 'Location unavailable: type your town.'); return; }
    countEl.textContent = T('Localisation en cours…', 'Locating…');
    navigator.geolocation.getCurrentPosition((p) => setRef({ lat: p.coords.latitude, lon: p.coords.longitude, label: T('votre position', 'your location') }),
      () => { countEl.textContent = T('Localisation refusée ou indisponible : saisissez votre ville.', 'Location refused or unavailable: type your town.'); }, { timeout: 8000 });
  });

  render();
  setInterval(render, 60000);
  return { query: (q) => { input.value = q; query(q); }, select };
}
