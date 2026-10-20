// Point d'entrée : initialise les modules selon la page (body[data-page]).
import { applyLang, initScroll, initHeader, initMenu, initCursor, initMagnetic, initTransitions, runIntro, revealTitles, wordsReveal, parallax, counters, copyables, tilt, scrollToEl, initDropdowns, initFooterCols, initFilterLinks, initShare, initToc, newTabHints } from './core.js';
import { initPlaceholders } from './ph.js';
import { initHero, heroSearch } from './hero.js';
import { initFinder } from './finder.js';
import { initCycle, initServices, initSectors, initGov, initGlobe, initRse, initNews, initRdv } from './sections.js';
import { initCabinetPage } from './page-cabinet.js';
import { initServicePage } from './page-service.js';
import { initDirectory, initNewsFilter, initGrids, initTeams, initMore, initTabs } from './pages.js';
import { onVisible } from './util.js';
import { initMorph, initSpot, initReadBar, initTypeHint } from './fx.js';
import { initNetmap, initGovflow, initTimeline, initMarquee } from './fx-net.js';
import { initLiveboard, initIdmap, initDrawIcons, initNfMap } from './fx-pages.js';
import { initViz } from './fx-viz.js';

const gsap = window.gsap;
const page = document.body.dataset.page;

async function boot() {
  applyLang();
  if (!gsap || !window.ScrollTrigger) { document.documentElement.classList.add('rm'); }
  initScroll();
  initPlaceholders();
  initMorph(); initReadBar();
  initHeader(); initMenu(); initDropdowns(); initFooterCols(); initFilterLinks(); initCursor(); initMagnetic(); copyables(); initShare();
  const came = initTransitions();
  revealTitles(); wordsReveal(); counters(); parallax(); tilt();
  initTabs(); initMore(); initTeams(); initNews(); initNewsFilter(); initGrids(); initToc();
  // composants présents sur plusieurs pages
  initServices(); initSectors(); initGov(); initRse(); initGlobe(); initRdv();
  initDirectory(); initSpot();
  initNetmap(); initGovflow(); initTimeline(); initMarquee();
  initLiveboard(); initIdmap(); initDrawIcons(); initNfMap();
  initViz();
  newTabHints();
  // l'annuaire (carte et liste) se prépare sans retarder l'ouverture de la page ; sur l'accueil, à l'approche de la section
  let finderP = null;
  const getFinder = () => finderP || (finderP = initFinder().catch(() => null));
  const fRoot = document.querySelector('[data-finder]');
  if (fRoot) {
    if (page === 'home') { let off = null; off = onVisible(fRoot, (v) => { if (v) { off && off(); getFinder(); } }, { margin: '120% 0px' }); }
    else getFinder();
  }

  if (page === 'home') {
    if (came) document.documentElement.classList.add('intro-seen'); // arrivée par une transition : ni rideau ni remplissage
    const hero = initHero();
    initCycle();
    heroSearch((q) => { const f = document.getElementById('cabinets'); scrollToEl((f && f.querySelector('.finder__ui')) || f); getFinder().then((fd) => fd && setTimeout(() => fd.query(q), 500)); });
    if (!came) await runIntro();
    hero.enter();
    initTypeHint();
  } else {
    // ouverture des pages intérieures : le titre se pose
    const h = document.querySelector('[data-hero] [data-reveal]');
    if (h && h._reveal) gsap.delayedCall(came ? .2 : .05, () => h._reveal.play());
  }
  if (page === 'cabinet') await initCabinetPage();
  if (page === 'service') initServicePage();
  // les polices et images chargées peuvent décaler les déclencheurs
  // (ScrollTrigger se recalcule déjà de lui-même au chargement complet : pas de second recalcul ici)
  document.fonts && document.fonts.ready.then(() => window.ScrollTrigger && window.ScrollTrigger.refresh());
  // la page change de hauteur après coup (carte de l'annuaire, textes dépliés, images) : les repères de défilement sont recalculés,
  // sinon une section épinglée « saute » en se libérant
  if (window.ResizeObserver && window.ScrollTrigger) {
    const mainEl = document.querySelector('main'); let lastH = mainEl.offsetHeight, tmr = 0;
    new ResizeObserver(() => { const h = mainEl.offsetHeight; if (Math.abs(h - lastH) < 3) return; lastH = h; clearTimeout(tmr); tmr = setTimeout(() => window.ScrollTrigger.refresh(), 220); }).observe(mainEl);
  }
}
boot();
