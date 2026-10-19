// Page Expertise comptable : cernes des missions, engagements qui s'allument, tableau de bord illustratif.
import { $, $$, T, lang, reduced, rng, fmtNum } from './util.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

export function initServicePage() {
  // lien « trouver un cabinet » : présélectionne le service dans le trouveur
  $$('[data-filter]').forEach((a) => a.addEventListener('click', () => { try { sessionStorage.setItem('exco-filter', a.dataset.filter); } catch (e) {} }, true));

  // hero : la graine respire, le texte monte
  const hero = $('[data-svc-hero]');
  if (hero && !reduced()) {
    gsap.fromTo($('.svc-top__img', hero), { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'power3.out' });
    gsap.fromTo($$('.svc-top__sub, .svc-top__in .lead, .svc-top__in .cab-actions', hero), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .12, delay: .4, ease: 'power3.out' });
    gsap.to($('.svc-top__img', hero), { yPercent: 10, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  // engagements : chaque feuille s'allume en passant au centre
  $$('.engage__list li').forEach((li) => {
    if (reduced()) { li.classList.add('is-lit'); return; }
    window.ScrollTrigger.create({ trigger: li, start: 'top 62%', end: 'bottom 38%', onToggle: (s) => li.classList.toggle('is-lit', s.isActive || s.progress === 1) });
  });

  // cernes : 9 anneaux irréguliers, un par mission
  const svg = $('[data-rings-svg]'), list = $$('[data-missions] li');
  if (svg && list.length) {
    const R = rng(4);
    const rings = list.map((_, i) => {
      const r = 6 + i * 3.05; const n = 64; let d = '';
      const ph = R() * 6.28, amp = .35 + R() * .35;
      for (let k = 0; k <= n; k++) { const a = (k / n) * Math.PI * 2; const rr = r + Math.sin(a * 3 + ph) * amp + Math.sin(a * 7 + ph * 2) * amp * .4; d += `${k ? 'L' : 'M'}${(50 + Math.cos(a) * rr).toFixed(2)},${(50 + Math.sin(a) * rr).toFixed(2)}`; }
      const p = mk('path', { d: d + 'Z', class: 'ring', pathLength: 1 }); svg.appendChild(p); return p;
    });
    const light = (k) => { rings.forEach((r, i) => r.classList.toggle('is-lit', i <= k)); list.forEach((l, i) => l.classList.toggle('is-lit', i === k)); };
    if (reduced()) light(list.length - 1);
    else {
      const sec = $('[data-rings]');
      const mm = gsap.matchMedia();
      mm.add('(min-width: 901px)', () => {
        window.ScrollTrigger.create({ trigger: sec, start: 'top top', end: '+=1400', pin: $('.rings-pin', sec), scrub: true, onUpdate: (s) => light(Math.min(list.length - 1, Math.floor(s.progress * list.length))) });
        gsap.fromTo(rings, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: .08, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: sec, start: 'top 70%', once: true } });
      });
      mm.add('(max-width: 900px)', () => {
        list.forEach((li, i) => window.ScrollTrigger.create({ trigger: li, start: 'top 65%', end: 'bottom 35%', onEnter: () => light(i), onEnterBack: () => light(i) }));
      });
    }
  }

  // tableau de bord (données fictives, affichées comme telles)
  const ch = $('[data-dash-chart]');
  if (ch) {
    const ca = [96, 102, 110, 104, 118, 121, 99, 88, 115, 124, 119, 128];
    const mg = [37.8, 38.2, 39.1, 38.6, 39.4, 40.0, 39.2, 38.4, 40.1, 40.6, 40.3, 41.0];
    const months = lang() === 'en' ? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] : ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const L = 40, Rr = 480, T0 = 16, B = 190, W = Rr - L, H = B - T0;
    const yCa = (v) => B - (v / 140) * H, yMg = (v) => B - ((v - 30) / 15) * H;
    [0, 35, 70, 105, 140].forEach((v) => { ch.appendChild(mk('line', { x1: L, x2: Rr, y1: yCa(v), y2: yCa(v), class: 'dash__grid' })); const t = mk('text', { x: L - 6, y: yCa(v) + 3, 'text-anchor': 'end' }); t.textContent = v; ch.appendChild(t); });
    [30, 35, 40, 45].forEach((v) => { const t = mk('text', { x: Rr + 6, y: yMg(v) + 3 }); t.textContent = `${v}%`; ch.appendChild(t); });
    const bw = W / 12;
    const bars = ca.map((v, i) => { const x = L + i * bw + bw * .18; const r = mk('rect', { x, y: yCa(v), width: bw * .64, height: B - yCa(v), rx: 2, class: i === 11 ? 'dash__bar dash__bar--now' : 'dash__bar' }); ch.appendChild(r); const t = mk('text', { x: x + bw * .32, y: B + 14, 'text-anchor': 'middle' }); t.textContent = months[i]; ch.appendChild(t); return r; });
    const pts = mg.map((v, i) => [L + i * bw + bw / 2, yMg(v)]);
    const line = mk('path', { d: 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L'), class: 'dash__line', pathLength: 1 }); ch.appendChild(line);
    const dots = pts.map((p) => { const c = mk('circle', { cx: p[0], cy: p[1], r: 3.2, class: 'dash__pt' }); ch.appendChild(c); return c; });
    if (!reduced()) {
      gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' }); gsap.set(line, { strokeDasharray: 1, strokeDashoffset: 1 }); gsap.set(dots, { scale: 0, transformOrigin: '50% 50%' });
      window.ScrollTrigger.create({ trigger: ch, start: 'top 80%', once: true, onEnter: () => {
        gsap.to(bars, { scaleY: 1, duration: .9, stagger: .05, ease: 'sprout' });
        gsap.to(line, { strokeDashoffset: 0, duration: 1.6, delay: .5, ease: 'power2.inOut' });
        gsap.to(dots, { scale: 1, stagger: .06, delay: .7, ease: 'back.out(3)' });
        $$('[data-kpi]').forEach((k) => { const end = +k.dataset.kpi, suf = k.textContent.replace(/[\d\s]/g, '').trim(); const o = { v: 0 }; gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => (k.textContent = `${fmtNum(Math.round(o.v))} ${suf}`) }); });
      } });
    }
  }

  // bénéfices : les pictogrammes se dessinent
  if (!reduced()) {
    const items = $$('[data-benefits] li');
    gsap.fromTo(items, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .07, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '[data-benefits]', start: 'top 80%', once: true } });
    items.forEach((li, i) => { const ps = $$('path', li); ps.forEach((p) => p.setAttribute('pathLength', 1)); gsap.fromTo(ps, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, delay: .3 + i * .07, ease: 'power2.inOut', scrollTrigger: { trigger: '[data-benefits]', start: 'top 80%', once: true } }); });
  }
}
