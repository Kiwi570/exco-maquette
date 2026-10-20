// Pages de liste : statut d'ouverture dans l'annuaire, filtre des actualités, animations d'entrée des grilles.
import { $, $$, T, reduced, openStatus } from './util.js';
import { loadCabinets } from './finder.js';
import { foldTo } from './fx.js';

const gsap = window.gsap;

// annuaire : chaque ligne reçoit le statut du cabinet à son heure locale
export async function initDirectory() {
  const dir = $('[data-dir]'); if (!dir) return;
  // téléphone : chaque département se déplie à la demande (l'annuaire complet ferait 15 000 px)
  if (window.innerWidth < 700 && $$('[data-cab]', dir).length > 24) {
    $$('.dir__group', dir).forEach((g) => {
      const h = $('h3', g), ul = $('ul', g); if (!h || !ul) return;
      const n = ul.children.length;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'dir__toggle'; b.setAttribute('aria-expanded', 'false');
      b.innerHTML = h.innerHTML + `<span class="dir__nb">${n}</span>`;
      h.innerHTML = ''; h.appendChild(b); ul.hidden = true;
      b.addEventListener('click', () => { const open = ul.hidden; ul.hidden = !open; b.setAttribute('aria-expanded', String(open)); window.ScrollTrigger && window.ScrollTrigger.refresh(); });
    });
  }
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

// équipes nombreuses (groupes) : 12 visages, 8 sur téléphone, puis « Voir toute l'équipe »
export function initTeams() {
  $$('[data-page="group"] .team').forEach((ul) => {
    const items = Array.from(ul.children); const lim = window.innerWidth < 700 ? 8 : 12;
    if (items.length <= lim + 2) return;
    items.slice(lim).forEach((li) => { li.hidden = true; });
    const b = document.createElement('button'); b.type = 'button'; b.className = 'more__btn team-more'; b.setAttribute('aria-expanded', 'false');
    b.textContent = T(`Voir toute l’équipe (${items.length})`, `See the whole team (${items.length})`);
    b.addEventListener('click', () => {
      items.forEach((li) => { li.hidden = false; }); b.remove();
      window.ScrollTrigger && window.ScrollTrigger.refresh();
      if (!reduced()) gsap.fromTo(items.slice(lim), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .5, stagger: .02, ease: 'power3.out' });
    });
    ul.after(b);
  });
}

// textes très longs (fiches cabinets, pages de contenu) : repliés au-delà d'une hauteur confortable
export function initMore() {
  $$('[data-more]').forEach((box) => {
    const lim = window.innerWidth < 700 ? 560 : 760;
    if (box.scrollHeight < lim * 1.35) return;
    box.style.setProperty('--more-h', lim + 'px'); box.classList.add('is-clamped');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'more__btn'; b.setAttribute('aria-expanded', 'false');
    if (!box.id) box.id = 'more-' + Math.random().toString(36).slice(2, 7);
    b.setAttribute('aria-controls', box.id);
    const lab = () => (box.classList.contains('is-clamped') ? T('Lire la suite', 'Read more') : T('Réduire', 'Show less'));
    b.textContent = lab();
    b.addEventListener('click', () => {
      const open = box.classList.contains('is-clamped');
      b.setAttribute('aria-expanded', String(open));
      b.textContent = open ? T('Réduire', 'Show less') : T('Lire la suite', 'Read more');
      // le texte se déplie (ou se replie) en douceur
      foldTo(box, open, () => {
        if (!open) box.scrollIntoView({ block: 'nearest' });
        window.ScrollTrigger && window.ScrollTrigger.refresh();
      });
    });
    box.after(b);
  });
}



// onglets (page RSE) : un volet à la fois, flèches du clavier entre les onglets
export function initTabs() {
  $$('[data-tabs]').forEach((box) => {
    const tabs = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
    if (!tabs.length) return;
    box.classList.add('is-on');
    const show = (i, focus) => {
      tabs.forEach((t, k) => { t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });
      panels.forEach((p, k) => { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
      if (!reduced()) gsap.fromTo(panels[i], { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'power3.out' });
      window.ScrollTrigger && window.ScrollTrigger.refresh();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(i));
      t.addEventListener('keydown', (e) => {
        const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (k) { e.preventDefault(); show((i + k + tabs.length) % tabs.length, true); }
        if (e.key === 'Home') { e.preventDefault(); show(0, true); }
        if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1, true); }
      });
    });
    panels.forEach((p, k) => { p.hidden = k !== 0; p.tabIndex = 0; });
  });
}
