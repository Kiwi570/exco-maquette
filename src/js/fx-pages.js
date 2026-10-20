// Visuels animés des pages (v12) : tableau des heures locales, mini-carte des fiches sans photo,
// pictogrammes tracés, épingle de la page 404.
import { $, $$, T, lang, reduced, getJSON, onVisible, localNow, openStatus } from './util.js';
import { loadCabinets } from './finder.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
const two = (n) => String(n).padStart(2, '0');

// ---------- tableau des heures locales (page « Trouver un cabinet ») ----------
// les cabinets sont regroupés par heure locale ; chaque minute, l'heure et le nombre de cabinets ouverts se mettent à jour
export async function initLiveboard() {
  const box = $('[data-liveboard]'); if (!box) return;
  const cabs = await loadCabinets();
  const list = $('[data-liveboard-rows]', box);
  const render = (first) => {
    const now = new Date(); const groups = new Map();
    cabs.forEach((c) => {
      const t = localNow(c.tz, now); const k = t.min;
      if (!groups.has(k)) groups.set(k, { min: t.min, n: 0, open: 0, co: new Set() });
      const g = groups.get(k); g.n++; if (openStatus(c, now).open) g.open++; g.co.add(c.co[lang() === 'en' && c.co[1] ? 1 : 0]);
    });
    const rows = [...groups.values()].sort((a, b) => b.n - a.n);
    list.innerHTML = rows.map((g) => {
      const co = [...g.co]; const names = co.slice(0, 3).join(', ') + (co.length > 3 ? T(` et ${co.length - 3} autres`, ` and ${co.length - 3} more`) : '');
      return `<li><span class="lb__time" aria-label="${T('Heure locale', 'Local time')} ${Math.floor(g.min / 60)}:${two(g.min % 60)}"><b>${two(Math.floor(g.min / 60))}</b><i>:</i><b>${two(g.min % 60)}</b></span>`
        + `<span class="lb__where">${names}</span><span class="lb__n${g.open ? ' is-open' : ''}">${g.open} / ${g.n}</span></li>`;
    }).join('');
    if (!reduced() && gsap) gsap.fromTo($$('li', list), { opacity: first ? 0 : .4, y: first ? 10 : 0 }, { opacity: 1, y: 0, duration: .5, stagger: first ? .06 : 0, ease: 'power2.out' });
  };
  render(true);
  // mise à jour au changement de minute
  const tick = () => { render(false); setTimeout(tick, 60000 - (Date.now() % 60000) + 50); };
  setTimeout(tick, 60000 - (Date.now() % 60000) + 50);
}

// ---------- fiche cabinet sans photo : la carte du lieu, le point du cabinet qui pulse ----------
export function initIdmap() {
  const el = $('[data-idmap]'); if (!el) return;
  let off = null;
  off = onVisible(el, async (v) => {
    if (!v) return; off && off();
    const [map, cabs] = await Promise.all([getJSON('assets/data/map.json'), loadCabinets()]);
    const x = +el.dataset.x, y = +el.dataset.y, reg = el.dataset.reg;
    // métropole : toute la France ; ailleurs : la région autour du cabinet
    const w = reg === 'fr' ? 230 : reg === 'om' ? 30 : 260;
    const cx = reg === 'fr' ? 29 : x, cy = reg === 'fr' ? -878 : y;
    const svg = mk('svg', { viewBox: `${cx - w / 2} ${cy - w / 2} ${w} ${w}`, 'aria-hidden': 'true', preserveAspectRatio: 'xMidYMid slice' });
    const s = w / 100;
    svg.appendChild(mk('path', { d: map.world, class: 'im-world' }));
    if (reg === 'fr') { svg.appendChild(mk('path', { d: map.france, class: 'im-fr', 'stroke-width': s * .25 })); svg.appendChild(mk('path', { d: map.deps, class: 'im-deps', 'stroke-width': s * .12 })); }
    else Object.values(map.present).forEach((d) => svg.appendChild(mk('path', { d, class: 'im-fr', 'stroke-width': s * .25 })));
    cabs.forEach((c) => { if (c.x === x && c.y === y) return; svg.appendChild(mk('circle', { cx: c.x, cy: c.y, r: s * .55, class: 'im-other' })); });
    [1, 2].forEach((i) => svg.appendChild(mk('circle', { cx: x, cy: y, r: s * 2.2, class: `im-ring im-ring--${i}` })));
    svg.appendChild(mk('circle', { cx: x, cy: y, r: s * 1.6, class: 'im-pin' }));
    el.appendChild(svg);
    if (!reduced() && gsap) gsap.from(svg, { opacity: 0, scale: 1.08, duration: 1.2, ease: 'power2.out' });
  }, { margin: '200px' });
}

// ---------- pictogrammes tracés à l'arrivée à l'écran (axes RSE) ----------
export function initDrawIcons() {
  if (reduced() || !gsap) return;
  $$('.values:has(.axis-ico)').forEach((ul) => {
    const paths = $$('.axis-ico path', ul); paths.forEach((p) => p.setAttribute('pathLength', 1));
    gsap.fromTo(paths, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.4, stagger: .18, ease: 'power2.inOut', scrollTrigger: { trigger: ul, start: 'top 80%', once: true } });
  });
}

// ---------- page 404 : une épingle cherche son chemin sur la carte de France ----------
export async function initNfMap() {
  const el = $('[data-nfmap]'); if (!el) return;
  const map = await getJSON('assets/data/map.json');
  const svg = mk('svg', { viewBox: '-82 -972 222 190', 'aria-hidden': 'true' });
  svg.appendChild(mk('path', { d: map.france, class: 'nf-fr' }));
  svg.appendChild(mk('path', { d: map.deps, class: 'nf-deps' }));
  const trail = mk('path', { class: 'nf-trail', d: '' }); svg.appendChild(trail);
  const pin = mk('g', { class: 'nf-pin' });
  pin.appendChild(mk('path', { d: 'M0,0 C-1.6,-4 -5,-6 -5,-10 A5,5 0 1 1 5,-10 C5,-6 1.6,-4 0,0Z' }));
  pin.appendChild(mk('circle', { cx: 0, cy: -10, r: 1.9, class: 'nf-pin__dot' }));
  svg.appendChild(pin);
  el.appendChild(svg);
  // étapes : quelques villes du réseau, puis Paris
  const P = map.paris;
  const stops = [[-50, -880], [-10, -840], [70, -860], [40, -930], [-20, -905], P];
  if (reduced() || !gsap) { pin.setAttribute('transform', `translate(${P[0]},${P[1]})`); return; }
  let d = `M${stops[0][0]},${stops[0][1]}`;
  const o = { x: stops[0][0], y: stops[0][1] };
  pin.setAttribute('transform', `translate(${o.x},${o.y})`);
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 });
  stops.slice(1).forEach((st, i) => {
    tl.to(o, { x: st[0], y: st[1], duration: 1.1, ease: 'power2.inOut', onUpdate: () => { pin.setAttribute('transform', `translate(${o.x},${o.y})`); trail.setAttribute('d', d + ` L${o.x.toFixed(1)},${o.y.toFixed(1)}`); }, onComplete: () => { d += ` L${st[0]},${st[1]}`; } })
      .to(pin, { scale: i === stops.length - 2 ? 1.25 : 1.08, duration: .18, yoyo: true, repeat: 1, transformOrigin: '50% 100%' });
  });
  tl.add(() => { d = `M${stops[0][0]},${stops[0][1]}`; trail.setAttribute('d', ''); }, '+=1.4');
  tl.set(o, { x: stops[0][0], y: stops[0][1], onComplete: () => pin.setAttribute('transform', `translate(${stops[0][0]},${stops[0][1]})`) });
}
