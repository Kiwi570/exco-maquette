// Page Expertise comptable : bilan qui s'équilibre, liste d'engagements cochée au défilement,
// calendrier illustratif de l'exercice, tableau de bord illustratif, pictogrammes tracés.
import { $, $$, T, lang, reduced, fmtNum } from './util.js';

const gsap = window.gsap;
const NS = 'http://www.w3.org/2000/svg';
const mk = (n, a = {}) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

// calendrier illustratif : exercice N clos le 31 décembre, puis premier semestre N+1 (18 mois, en mois depuis le 1er janvier N)
const MONTHS = 18;
const BARS = [
  [[0, 1]],                                                       // business plan
  [[0, 12.4]],                                                    // collecte des informations
  Array.from({ length: 13 }, (_, m) => [m + .15, m + .7]),        // saisie comptable, chaque mois
  [[2.55, 3], [5.55, 6], [8.55, 9], [11.55, 12]],                 // pointage, chaque trimestre
  [[11.7, 12.15]],                                                // inventaire au 31 décembre
  [[3.05, 3.55], [6.05, 6.55], [9.05, 9.55], [13.05, 13.55]],     // analyse des marges
  [[12, 13]],                                                     // clôture
  [[12.5, 14.5]],                                                 // révision
  [[14, 15.6]],                                                   // comptes annuels
];
const DEADLINES = [
  { at: 16.1, fr: 'Liasse fiscale (mai)', en: 'Tax return (May)' },
  { at: 17.9, fr: 'Approbation des comptes (au plus tard six mois après la clôture)', en: 'Approval of the accounts (within six months of year end)' },
];

export function initServicePage() {
  // lien « trouver un cabinet » : présélectionne le service dans le trouveur

  // ---------- bilan simplifié : les lignes se posent, les totaux s'équilibrent ----------
  const bilan = $('[data-bilan]');
  if (bilan) {
    const cells = $$('[data-v]', bilan);
    cells.forEach((c) => (c.textContent = fmtNum(+c.dataset.v)));
    if (!reduced()) {
      const rows = $$('tbody tr', bilan), tots = $$('tfoot tr', bilan), eq = $('.bilan__eq', bilan);
      gsap.set([...rows, ...tots], { opacity: 0, y: 10 }); gsap.set(eq, { opacity: 0, scale: .9 });
      gsap.set($$('.bilan__rule', bilan), { scaleX: 0 });
      const tl = gsap.timeline({ delay: .5 });
      tl.fromTo(bilan, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out' })
        .to(rows, { opacity: 1, y: 0, duration: .5, stagger: .09, ease: 'power3.out' }, .3);
      $$('tbody [data-v]', bilan).forEach((c, i) => { const end = +c.dataset.v, o = { v: 0 }; tl.to(o, { v: end, duration: .7, ease: 'power2.out', onUpdate: () => (c.textContent = fmtNum(Math.round(o.v / 100) * 100)) }, .35 + i * .09); });
      tl.to(tots, { opacity: 1, y: 0, duration: .5 }, 1.3)
        .to($$('.bilan__rule', bilan), { scaleX: 1, duration: .6, ease: 'power3.inOut', stagger: .1 }, 1.45)
        .to(eq, { opacity: 1, scale: 1, duration: .5, ease: 'back.out(2.4)' }, 1.9);
    }
  }

  // ---------- engagements : chaque case se coche en passant au centre ----------
  $$('.engage__list li').forEach((li) => {
    if (reduced()) { li.classList.add('is-lit'); return; }
    window.ScrollTrigger.create({ trigger: li, start: 'top 62%', end: 'bottom 38%', onToggle: (s) => li.classList.toggle('is-lit', s.isActive || s.progress === 1) });
  });

  // ---------- calendrier de l'exercice ----------
  const gantt = $('[data-gantt]');
  if (gantt) {
    const rows = $$('[data-missions] li');
    const mNames = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const head = document.createElement('div'); head.className = 'gantt__head';
    head.innerHTML = `<span class="gantt__corner"></span><span class="gantt__months">${Array.from({ length: MONTHS }, (_, i) => `<span class="${i === 12 ? 'is-n1' : ''}">${mNames[i % 12]}</span>`).join('')}<em class="gantt__year" style="left:0">${T('Exercice N', 'Year N')}</em><em class="gantt__year" style="left:${(12 / MONTHS) * 100}%">N+1</em></span>`;
    gantt.appendChild(head);
    const body = document.createElement('div'); body.className = 'gantt__body';
    const lit = [];
    rows.forEach((li, i) => {
      const r = document.createElement('div'); r.className = 'gantt__row';
      const lab = document.createElement('span'); lab.className = 'gantt__label'; lab.innerHTML = `<b>${i + 1}</b><span>${li.textContent.trim()}</span>`;
      const tr = document.createElement('span'); tr.className = 'gantt__track';
      (BARS[i] || []).forEach(([a, b]) => { const s = document.createElement('i'); s.className = 'gantt__bar'; s.style.left = `${(a / MONTHS) * 100}%`; s.style.width = `${((b - a) / MONTHS) * 100}%`; tr.appendChild(s); });
      r.append(lab, tr); body.appendChild(r); lit.push({ r, bars: BARS[i] || [] });
    });
    const dl = document.createElement('div'); dl.className = 'gantt__row gantt__row--dl';
    dl.innerHTML = `<span class="gantt__label"><span>${T('Échéances légales', 'Legal deadlines')}</span></span><span class="gantt__track">${DEADLINES.map((d, k) => `<span class="gantt__dl${k ? ' is-end' : ''}" style="left:${(d.at / MONTHS) * 100}%"><i></i><small>${lang() === 'en' ? d.en : d.fr}</small></span>`).join('')}</span>`;
    body.appendChild(dl);
    const over = document.createElement('div'); over.className = 'gantt__overlay'; over.setAttribute('aria-hidden', 'true');
    over.innerHTML = `<span class="gantt__lane"><span class="gantt__close" style="left:${(12 / MONTHS) * 100}%"><small>${T('Clôture au 31 décembre', 'Year end, 31 December')}</small></span><span class="gantt__play"></span></span>`;
    body.appendChild(over);
    gantt.appendChild(body);
    const play = $('.gantt__play', over);
    // la liste d'origine reste lisible par les lecteurs d'écran, le tableau la double visuellement
    $('[data-missions]').classList.add('sr');
    gantt.setAttribute('aria-hidden', 'true');

    const setT = (m) => {
      play.style.left = `${(m / MONTHS) * 100}%`;
      lit.forEach(({ r, bars }) => r.classList.toggle('is-lit', bars.some(([a, b]) => m >= a - .05 && m <= b + .05)));
      $$('.gantt__months > span', head).forEach((s, i) => s.classList.toggle('is-now', i === Math.min(MONTHS - 1, Math.floor(m))));
      $$('.gantt__dl', dl).forEach((d, k) => d.classList.toggle('is-hit', m >= DEADLINES[k].at - .2));
    };
    if (reduced()) gantt.classList.add('is-static');
    else {
      const sec = $('[data-year]');
      const mm = gsap.matchMedia();
      mm.add('(min-width: 901px)', () => {
        setT(0);
        const st = window.ScrollTrigger.create({ trigger: sec, start: 'top top', end: '+=1600', pin: $('.year-pin', sec), scrub: .6, onUpdate: (s) => setT(s.progress * MONTHS) });
        const tw = gsap.fromTo($$('.gantt__bar', gantt), { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', duration: .6, ease: 'power2.out', stagger: .008, scrollTrigger: { trigger: gantt, start: 'top 80%', once: true } });
        return () => { st.kill(); tw.kill(); };
      });
      mm.add('(max-width: 900px)', () => { gantt.classList.add('is-static'); return () => gantt.classList.remove('is-static'); });
    }
  }

  // ---------- tableau de bord (données fictives, affichées comme telles) ----------
  const ch = $('[data-dash-chart]');
  if (ch) {
    const ca = [96, 102, 110, 104, 118, 121, 99, 88, 115, 124, 119, 128];
    const mg = [37.8, 38.2, 39.1, 38.6, 39.4, 40.0, 39.2, 38.4, 40.1, 40.6, 40.3, 41.0];
    const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
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
        gsap.to(bars, { scaleY: 1, duration: .9, stagger: .05, ease: 'exco' });
        gsap.to(line, { strokeDashoffset: 0, duration: 1.6, delay: .5, ease: 'power2.inOut' });
        gsap.to(dots, { scale: 1, stagger: .06, delay: .7, ease: 'back.out(3)' });
        $$('[data-kpi]').forEach((k) => { const end = +k.dataset.kpi, suf = k.textContent.replace(/[\d\s]/g, '').trim(); const o = { v: 0 }; gsap.to(o, { v: end, duration: 1.4, ease: 'power2.out', onUpdate: () => (k.textContent = `${fmtNum(Math.round(o.v))} ${suf}`) }); });
      } });
    }
  }

  // ---------- bénéfices : les pictogrammes se tracent ----------
  if (!reduced()) {
    const items = $$('[data-benefits] li');
    gsap.fromTo(items, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .07, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '[data-benefits]', start: 'top 80%', once: true } });
    items.forEach((li, i) => { const ps = $$('path', li); ps.forEach((p) => p.setAttribute('pathLength', 1)); gsap.fromTo(ps, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, delay: .3 + i * .07, ease: 'power2.inOut', scrollTrigger: { trigger: '[data-benefits]', start: 'top 80%', once: true } }); });
  }
}
