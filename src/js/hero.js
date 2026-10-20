// Accueil : ouverture (photo en WebGL qui se remplit comme un tableur), cabinets ouverts en direct, recherche.
import { $, $$, T, reduced, openStatus } from './util.js';
import { initHeroGL } from './hero-gl.js';
import { loadCabinets } from './finder.js';

const gsap = window.gsap;

export function initHero() {
  const hero = $('[data-hero]'); if (!hero) return { enter() {} };
  const img = $('[data-hero-img]', hero);
  const gl = reduced() ? null : initHeroGL($('[data-hero-gl]', hero), img);

  // nombre de cabinets ouverts à l'instant, à l'heure locale de chacun
  const live = $('[data-live-open]', hero);
  const updLive = async () => {
    if (!live) return;
    const cabs = await loadCabinets();
    const n = cabs.filter((c) => openStatus(c).open).length;
    live.textContent = n
      ? T(`En ce moment, ${n} cabinets Exco sur ${cabs.length} sont ouverts`, `Right now, ${n} of ${cabs.length} Exco offices are open`)
      : T(`Aucun cabinet ouvert en ce moment. Horaires des ${cabs.length} cabinets dans l’annuaire`, `No office is open right now. Opening hours of all ${cabs.length} offices in the directory`);
    $('[data-hero-live]', hero)?.classList.toggle('is-open', n > 0);
  };
  updLive(); setInterval(updLive, 60000);

  // lien « ouverts » : ouvre l'annuaire filtré sur les cabinets ouverts
  $('[data-hero-live]', hero)?.addEventListener('click', () => {
    const cb = $('[data-open-now]');
    if (cb && !cb.checked) { cb.checked = true; cb.dispatchEvent(new Event('change')); }
  });

  if (!reduced()) {
    gsap.to($('.hero__media', hero), { yPercent: 6, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  return {
    enter() {
      const h = $('.hero__title', hero);
      const rest = $$('.hero__lead, .search, .hero__live', hero);
      if (reduced()) return;
      if (h && h._reveal) h._reveal.play();
      gl && gl.start();
      gsap.fromTo(rest, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .1, delay: .3, ease: 'power3.out' });
      if (!gl) gsap.fromTo($('.hero__img', hero), { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.4, ease: 'power3.inOut' });
    },
  };
}

// Recherche du hero : envoie la requête au trouveur de cabinets
export function heroSearch(onQuery) {
  const f = $('[data-hero-search]'); if (!f) return;
  f.addEventListener('submit', (e) => { e.preventDefault(); const q = f.q.value.trim(); onQuery(q); });
}
