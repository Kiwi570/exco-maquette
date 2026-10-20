// Point d'entrée : initialise les modules selon la page (body[data-page]).
import { applyLang, initScroll, initHeader, initMenu, initCursor, initMagnetic, initTransitions, runIntro, revealTitles, wordsReveal, parallax, counters, copyables, tilt, scrollToEl, initDropdowns, initFooterCols, initFilterLinks, initShare, initToc } from './core.js';
import { initPlaceholders } from './ph.js';
import { initHero, heroSearch } from './hero.js';
import { initFinder } from './finder.js';
import { initCycle, initServices, initSectors, initGov, initGlobe, initRse, initNews, initRdv } from './sections.js';
import { initCabinetPage } from './page-cabinet.js';
import { initServicePage } from './page-service.js';
import { initDirectory, initNewsFilter, initGrids } from './pages.js';

const gsap = window.gsap;
const page = document.body.dataset.page;

async function boot() {
  applyLang();
  if (!gsap || !window.ScrollTrigger) { document.documentElement.classList.add('rm'); }
  initScroll();
  initPlaceholders();
  initHeader(); initMenu(); initDropdowns(); initFooterCols(); initFilterLinks(); initCursor(); initMagnetic(); copyables(); initShare();
  const came = initTransitions();
  revealTitles(); wordsReveal(); counters(); parallax(); tilt();
  initNews(); initNewsFilter(); initGrids(); initToc();
  // composants présents sur plusieurs pages
  initServices(); initSectors(); initGov(); initRse(); initGlobe(); initRdv();
  initDirectory();
  let finder = null;
  if (document.querySelector('[data-finder]')) finder = await initFinder();

  if (page === 'home') {
    const hero = initHero();
    initCycle();
    heroSearch((q) => { const f = document.getElementById('cabinets'); scrollToEl(f); if (finder) setTimeout(() => finder.query(q), 500); });
    if (!came) await runIntro();
    hero.enter();
  } else {
    // ouverture des pages intérieures : le titre se pose
    const h = document.querySelector('[data-hero] [data-reveal]');
    if (h && h._reveal) gsap.delayedCall(came ? .45 : .05, () => h._reveal.play());
  }
  if (page === 'cabinet') await initCabinetPage();
  if (page === 'service') initServicePage();
  // les polices et images chargées peuvent décaler les déclencheurs
  window.addEventListener('load', () => window.ScrollTrigger && window.ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => window.ScrollTrigger && window.ScrollTrigger.refresh());
}
boot();
