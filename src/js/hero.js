// Accueil : hero vivant (photo + WebGL), villes du réseau aux nœuds des racines, entrée orchestrée.
import { $, $$, reduced, fitCanvas } from './util.js';
import { initSoilGL } from './soil-gl.js';

const gsap = window.gsap;
// nœuds lumineux repérés sur les deux photos (fractions depuis le haut gauche de l'image)
const NODES_WIDE = [[.70, .60], [.63, .615], [.74, .73], [.83, .77], [.89, .59], [.955, .645], [.533, .735], [.617, .86], [.78, .86], [.733, .42], [.49, .83]];
const NODES_TALL = [[.30, .36], [.47, .40], [.53, .34], [.65, .38], [.75, .41], [.29, .51], [.57, .46], [.54, .57], [.62, .49], [.39, .56]];
const TOWNS = ['Albi', 'Vannes', 'Cotonou', 'Papeete', 'Gdańsk', 'Bastia', 'Dakar', 'Dijon', 'Fort-de-France', 'Porto', 'Casablanca', 'Belfort', 'Pau', 'Nantes', 'Saint-Denis, La Réunion', 'Antananarivo', 'Nice', 'Tunis'];

export function initHero() {
  const hero = $('[data-hero]'); if (!hero) return { enter() {} };
  const img = $('[data-hero-img]', hero);
  const gl = initSoilGL($('[data-soil-gl]', hero), img, { reduced: reduced() });
  const towns = $('[data-hero-towns]', hero);

  // étiquettes de villes posées sur les nœuds de la photo
  let labels = [];
  const place = () => {
    if (!img.naturalWidth) return;
    const W = hero.clientWidth, H = hero.clientHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc;
    const ox = (W - dw) * .6, oy = (H - dh) * .5;
    const nodes = iw > ih ? NODES_WIDE : NODES_TALL;
    towns.innerHTML = '';
    labels = nodes.map((n, i) => {
      const x = ox + n[0] * dw, y = oy + n[1] * dh;
      const s = document.createElement('span'); s.className = 'town'; s.textContent = TOWNS[i % TOWNS.length];
      s.style.left = `${x}px`; s.style.top = `${y}px`; towns.appendChild(s); return s;
    }).filter((s) => { const x = parseFloat(s.style.left); return x > 40 && x < W - 40; });
  };
  const ready = () => { place(); };
  if (img.complete && img.naturalWidth) ready(); else img.addEventListener('load', ready, { once: true });
  window.addEventListener('resize', () => place());

  let cycle = null;
  const startTowns = () => {
    if (reduced() || !labels.length) { labels.slice(0, 3).forEach((l) => gsap.set(l, { opacity: 1 })); return; }
    let p = 0, nameI = 0;
    const order = labels.map((_, i) => i).sort(() => Math.random() - .5);
    const show = () => {
      const l = labels[order[p++ % order.length]];
      if (!l) return;
      l.textContent = TOWNS[nameI++ % TOWNS.length];
      gsap.killTweensOf(l);
      gsap.fromTo(l, { opacity: 0, y: 6, scale: .9 }, { opacity: 1, y: 0, scale: 1, duration: .6, ease: 'back.out(2)' });
      gsap.to(l, { opacity: 0, y: -6, duration: .6, delay: 3.2, ease: 'power2.in' });
    };
    show(); setTimeout(show, 900); setTimeout(show, 1800);
    cycle = setInterval(show, 1250);
    // pause hors écran
    window.ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onLeave: () => { clearInterval(cycle); cycle = null; }, onEnterBack: () => { if (!cycle) cycle = setInterval(show, 1250); } });
  };

  // parallaxe au défilement : le contenu remonte, la terre s'enfonce
  if (!reduced()) {
    gsap.to($('.hero__content', hero), { yPercent: -18, opacity: .2, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to($('.hero__media', hero), { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  return {
    enter() {
      const h = $('.hero__title', hero);
      const rest = $$('.hero__lead, .search, .hero__down', hero);
      if (reduced()) { startTowns(); return; }
      if (h && h._germ) h._germ.play();
      gsap.fromTo(rest, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .12, delay: .5, ease: 'power3.out' });
      gsap.fromTo($('.hero__media', hero), { scale: 1.08 }, { scale: 1, duration: 2.4, ease: 'power3.out' });
      setTimeout(startTowns, 900);
    },
  };
}

// Recherche du hero : envoie la requête au trouveur de cabinets
export function heroSearch(onQuery) {
  const f = $('[data-hero-search]'); if (!f) return;
  f.addEventListener('submit', (e) => { e.preventDefault(); const q = f.q.value.trim(); onQuery(q); });
}
