// Point d'entrée : initialise les modules selon la page (body[data-page]).
import { applyLang, initScroll, initHeader, initMenu, initCursor, initMagnetic, initTransitions, runIntro, revealTitles, wordsReveal, parallax, counters, copyables, tilt, scrollToEl, initDropdowns, initFooterCols, initFilterLinks, initShare, initToc } from './core.js';
import { initPlaceholders } from './ph.js';
import { initHero, heroSearch } from './hero.js';
import { initFinder } from './finder.js';
import { initCycle, initServices, initSectors, initGov, initGlobe, initRse, initNews, initRdv } from './sections.js';
import { initCabinetPage } from './page-cabinet.js';
import { initServicePage } from './page-service.js';
import { initDirectory, initNewsFilter, initGrids, initTeams } from './pages.js';
import { onVisible } from './util.js';

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
  initTeams(); initNews(); initNewsFilter(); initGrids(); initToc();
  // composants présents sur plusieurs pages
  initServices(); initSectors(); initGov(); initRse(); initGlobe(); initRdv();
  initDirectory();
  // l'annuaire (carte et liste) se prépare sans retarder l'ouverture de la page ; sur l'accueil, à l'approche de la section
  let finderP = null;
  const getFinder = () => finderP || (finderP = initFinder().catch(() => null));
  const fRoot = document.querySelector('[data-finder]');
  if (fRoot) {
    if (page === 'home') { let off = null; off = onVisible(fRoot, (v) => { if (v) { off && off(); getFinder(); } }, { margin: '120% 0px' }); }
    else getFinder();
  }

  if (page === 'home') {
    const hero = initHero();
    initCycle();
    heroSearch((q) => { const f = document.getElementById('cabinets'); scrollToEl((f && f.querySelector('.finder__ui')) || f); getFinder().then((fd) => fd && setTimeout(() => fd.query(q), 500)); });
    if (!came) await runIntro();
    hero.enter();
  } else {
    // ouverture des pages intérieures : le titre se pose
    const h = document.querySelector('[data-hero] [data-reveal]');
    if (h && h._reveal) gsap.delayedCall(came ? .2 : .05, () => h._reveal.play());
  }
  if (page === 'cabinet') await initCabinetPage();
  if (page === 'service') initServicePage();
  // les polices et images chargées peuvent décaler les déclencheurs
  window.addEventListener('load', () => window.ScrollTrigger && window.ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => window.ScrollTrigger && window.ScrollTrigger.refresh());
}
boot();
