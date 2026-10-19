// Point d'entrée : initialise les modules selon la page (body[data-page]).
import { applyLang, initScroll, initHeader, initMenu, initCursor, initMagnetic, initTransitions, runIntro, revealTitles, wordsReveal, parallax, counters, copyables, tilt, scrollToEl } from './core.js';
import { initPlaceholders } from './ph.js';
import { initHero, heroSearch } from './hero.js';
import { initFinder } from './finder.js';
import { initCycle, initServices, initSectors, initGov, initGlobe, initRse, initNews, initRdv } from './sections.js';
import { initCabinetPage } from './page-cabinet.js';
import { initServicePage } from './page-service.js';

const gsap = window.gsap;
const page = document.body.dataset.page;

async function boot() {
  applyLang();
  if (!gsap || !window.ScrollTrigger) { document.documentElement.classList.add('rm'); }
  initScroll();
  initPlaceholders();
  initHeader(); initMenu(); initCursor(); initMagnetic(); copyables();
  const came = initTransitions();
  revealTitles(); wordsReveal(); counters(); parallax(); tilt();
  initNews();

  if (page === 'home') {
    const hero = initHero();
    initCycle(); initServices(); initSectors(); initGov(); initRse(); initRdv();
    initGlobe();
    const finder = await initFinder();
    heroSearch((q) => { const f = document.getElementById('cabinets'); scrollToEl(f); if (finder) setTimeout(() => finder.query(q), 500); });
    if (!came) await runIntro();
    hero.enter();
  }
  if (page === 'cabinet') await initCabinetPage();
  if (page === 'service') initServicePage();
  // les polices et images chargées peuvent décaler les déclencheurs
  window.addEventListener('load', () => window.ScrollTrigger && window.ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => window.ScrollTrigger && window.ScrollTrigger.refresh());
}
boot();
