// Pages de liste : statut d'ouverture dans l'annuaire, filtre des actualités, animations d'entrée des grilles.
import { $, $$, T, reduced, openStatus } from './util.js';
import { loadCabinets } from './finder.js';

const gsap = window.gsap;

// annuaire : chaque ligne reçoit le statut du cabinet à son heure locale
export async function initDirectory() {
  const dir = $('[data-dir]'); if (!dir) return;
  const cabs = await loadCabinets();
  const by = Object.fromEntries(cabs.map((c) => [c.id, c]));
  const upd = () => $$('[data-cab]', dir).forEach((a) => {
    const c = by[a.dataset.cab]; const st = $('[data-dir-status]', a); if (!c || !st) return;
    const s = openStatus(c);
    st.className = `dir__s status${s.open ? ' status--open' : ''}${s.soon ? ' status--soon' : ''}`;
    st.textContent = s.open ? T('Ouvert', 'Open') : T('Fermé', 'Closed');
    st.title = s.text;
  });
  upd(); setInterval(upd, 60000);
}

// actualités : filtre par rubrique
export function initNewsFilter() {
  const bar = $('[data-cat-filters]'); if (!bar) return;
  const arts = $$('[data-articles] .art');
  bar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat-filter]'); if (!b) return;
    const k = b.dataset.catFilter;
    $$('[data-cat-filter]', bar).forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    const shown = [];
    arts.forEach((a) => { const on = k === 'all' || a.dataset.cat === k; a.hidden = !on; if (on) shown.push(a); });
    if (!reduced()) gsap.fromTo(shown, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: .45, stagger: .04, ease: 'power3.out' });
  });
}

// grilles de cartes : entrée discrète, une seule fois
export function initGrids() {
  if (reduced() || !window.ScrollTrigger) return;
  $$('.cards, .sec-grid, .groups, .discover__grid, .values').forEach((g) => {
    const items = Array.from(g.children);
    gsap.fromTo(items, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .05, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 88%', once: true } });
  });
  $$('.cover__bar span, .statcard__bar span').forEach((b) => {
    gsap.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: b, start: 'top 92%', once: true } });
  });
}
