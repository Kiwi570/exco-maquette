// Sections de l'accueil : cycle de vie, services, secteurs, gouvernance, globe Kreston, RSE, actualités, rendez-vous.
import { $, $$, T, lang, reduced, finePointer, fitCanvas, getJSON, fmtDate, base, onVisible, haversine } from './util.js';
import { loadCabinets, resolvePlace, nearest, SVC } from './finder.js';

const gsap = window.gsap;
const ST = () => window.ScrollTrigger;

// ---------- cycle de vie : défilement horizontal épinglé ----------
export function initCycle() {
  const sec = $('[data-cycle]'); if (!sec) return;
  const track = $('[data-cycle-track]', sec), bar = $('[data-cycle-bar]', sec);
  const dash = $('[data-mini-dash]', sec);
  const drawDash = () => { if (!dash || reduced()) return; const l = $('.mini-dash__line', dash); gsap.fromTo(l, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1.6, ease: 'power2.inOut' }); gsap.fromTo($('.mini-dash__area', dash), { opacity: 0 }, { opacity: 1, duration: 1, delay: .8 }); gsap.fromTo($('.mini-dash__end', dash), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, delay: 1.5, ease: 'back.out(3)' }); };
  if (reduced()) { track.style.flexWrap = 'wrap'; track.style.width = 'auto'; return; }
  const mm = gsap.matchMedia();
  mm.add('(min-width: 0px)', () => {
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: () => `+=${Math.min(dist() * 1.05, window.innerHeight * 1.3)}`, pin: $('.cycle__pin', sec), scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 } });
    tl.to(track, { x: () => -dist(), ease: 'none' }, 0)
      .fromTo(bar, { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);
    // chaque étape : son numéro apparaît, son image s'éclaire
    $$('.stage', track).forEach((s, i) => {
      gsap.fromTo(s, { opacity: i ? .35 : 1 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: s, containerAnimation: tl, start: 'left 85%', end: 'left 45%', scrub: true } });
      gsap.fromTo($('.stage__n', s), { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, ease: 'back.out(2)', scrollTrigger: { trigger: s, containerAnimation: tl, start: 'left 70%', toggleActions: 'play none none reverse' } });
      if (i === 1) ST().create({ trigger: s, containerAnimation: tl, start: 'left 60%', once: true, onEnter: drawDash });
    });
    return () => {};
  });
}

// ---------- services : les lignes de l'index apparaissent, les pictogrammes se tracent ----------
export function initServices() {
  const sec = $('[data-services]'); if (!sec) return;
  const icons = $$('.ico', sec);
  icons.forEach((ic) => $$('path, circle, rect', ic).forEach((p) => p.setAttribute('pathLength', 1)));
  if (reduced()) return;
  const rows = $$('.svc-index li, .svc-feature', sec);
  gsap.fromTo(rows, { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .045, scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
  gsap.fromTo(icons.map((ic) => $$('path, circle, rect', ic)).flat(), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut', stagger: .015, delay: .3, scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
  // au survol, le pictogramme se retrace
  if (finePointer()) $$('.svc-index a, .svc-feature', sec).forEach((a) => a.addEventListener('pointerenter', () => {
    const ps = $$('.ico path, .ico circle, .ico rect', a);
    gsap.fromTo(ps, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .7, ease: 'power2.inOut', overwrite: true });
  }));
}

// ---------- secteurs : bande horizontale à glisser ----------
export function initSectors() {
  const sec = $('[data-sectors]'); if (!sec) return;
  const tr = $('[data-sectors-track]', sec), bar = $('[data-sec-bar]', sec);
  const upd = () => { const max = tr.scrollWidth - tr.clientWidth; gsap.set(bar, { scaleX: max > 0 ? .08 + .92 * tr.scrollLeft / max : 1 }); };
  tr.addEventListener('scroll', upd, { passive: true }); upd();
  const step = () => (tr.querySelector('.sector')?.offsetWidth || 300) + 20;
  $('[data-sec-prev]', sec).addEventListener('click', () => tr.scrollBy({ left: -step() * 2, behavior: reduced() ? 'auto' : 'smooth' }));
  $('[data-sec-next]', sec).addEventListener('click', () => tr.scrollBy({ left: step() * 2, behavior: reduced() ? 'auto' : 'smooth' }));
  // glisser à la souris
  let d = null, moved = false;
  tr.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; d = { x: e.clientX, s: tr.scrollLeft }; moved = false; });
  window.addEventListener('pointermove', (e) => { if (!d) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 4) { moved = true; tr.classList.add('is-drag'); } tr.scrollLeft = d.s - dx; });
  window.addEventListener('pointerup', () => { d = null; setTimeout(() => tr.classList.remove('is-drag'), 0); });
  tr.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
  if (reduced()) return;
  const cards = $$('.sector', tr);
  gsap.fromTo(cards, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', stagger: .05, scrollTrigger: { trigger: tr, start: 'top 85%', once: true } });
}

// ---------- gouvernance : table ronde des 21 associés ----------
export function initGov() {
  const sec = $('[data-gov]'); if (!sec) return;
  const council = $('[data-council]', sec), center = $('[data-council-center]', sec), token = $('[data-token]', sec);
  const seats = $$('.seat', sec);
  const def = center.innerHTML;
  const showSeat = (s) => { center.innerHTML = `<p class="council__name">${s.dataset.name}</p><p class="council__t">${s.dataset.group}<br>${lang() === 'en' ? s.dataset.roleEn : s.dataset.roleFr}</p>`; };
  seats.forEach((s) => {
    s.addEventListener('pointerenter', () => showSeat(s)); s.addEventListener('focus', () => showSeat(s));
    s.addEventListener('pointerleave', () => (center.innerHTML = def)); s.addEventListener('blur', () => (center.innerHTML = def));
    s.addEventListener('click', () => showSeat(s));
  });
  // la parole fait le tour de la table : chaque siège reçoit le même temps
  let running = false;
  const wave = () => {
    if (reduced() || running) return; running = true;
    const R = () => council.clientWidth * .42;
    const o = { a: 0 };
    gsap.set(token, { opacity: 1 });
    gsap.to(o, { a: 1, duration: 6.3, ease: 'none', onUpdate: () => {
      const ang = o.a * Math.PI * 2 - Math.PI / 2; const r = R() * .82;
      gsap.set(token, { x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      const k = Math.min(20, Math.floor(o.a * 21));
      seats.forEach((s, i) => s.classList.toggle('is-on', i === k));
      if (seats[k] && center.dataset.k !== String(k)) { center.dataset.k = k; showSeat(seats[k]); }
    }, onComplete: () => { gsap.to(token, { opacity: 0, duration: .4 }); seats.forEach((s) => s.classList.remove('is-on')); center.innerHTML = def; delete center.dataset.k; running = false; } });
  };
  $('[data-gov-wave]', sec)?.addEventListener('click', wave);
  if (!reduced()) {
    gsap.fromTo(seats, { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .7, ease: 'back.out(2)', clearProps: 'transform,opacity', stagger: { each: .04 }, scrollTrigger: { trigger: council, start: 'top 75%', once: true, onEnter: () => setTimeout(wave, 1300) } });
    const mem = $('[data-members]', sec);
    if (mem) gsap.fromTo($$('.members li', sec), { opacity: 0, y: 20 }, { opacity: 1, y: 0, stagger: .025, duration: .6, scrollTrigger: { trigger: mem, start: 'top 85%', once: true } });
  }
}

// ---------- globe Kreston : points de terre, arcs vers les implantations ----------
export async function initGlobe() {
  const c = $('[data-globe]'); if (!c) return;
  // le globe ne se prépare qu'à l'approche de la section ; les points de terre sont précalculés (globe.json)
  await new Promise((res) => { let stop = null; stop = onVisible(c, (v) => { if (v) { stop && stop(); res(); } }, { margin: '400px' }); });
  const [pts, cabs] = await Promise.all([getJSON('assets/data/globe.json'), loadCabinets()]);
  const paris = [48.86, 2.35];
  const targets = [];
  const seen = new Set();
  cabs.forEach((k) => { const key = `${Math.round(k.lat)}:${Math.round(k.lon)}`; if (k.cc !== 'FR' && !seen.has(key)) { seen.add(key); targets.push([k.lat, k.lon]); } });
  const ctx = c.getContext('2d');
  let rot = -10, raf = 0, vis = false, t0 = performance.now();
  const toR = Math.PI / 180, tilt = 18 * toR;
  const project = (la, lo, R, cx, cy) => {
    const phi = la * toR, lam = (lo + rot) * toR;
    const x = Math.cos(phi) * Math.sin(lam), y0 = Math.sin(phi), z0 = Math.cos(phi) * Math.cos(lam);
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt), z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    return [cx + x * R, cy - y * R, z];
  };
  const slerp = (a, b, t) => { // interpolation sur la sphère
    const v = (p) => [Math.cos(p[0] * toR) * Math.cos(p[1] * toR), Math.cos(p[0] * toR) * Math.sin(p[1] * toR), Math.sin(p[0] * toR)];
    const A = v(a), B = v(b); const d = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2])); if (d < 1e-6) return a;
    const s1 = Math.sin((1 - t) * d) / Math.sin(d), s2 = Math.sin(t * d) / Math.sin(d);
    const P = [A[0] * s1 + B[0] * s2, A[1] * s1 + B[1] * s2, A[2] * s1 + B[2] * s2];
    return [Math.asin(P[2]) / toR, Math.atan2(P[1], P[0]) / toR];
  };
  const draw = (now) => {
    const { w, h, dpr } = fitCanvas(c, 2);
    const R = Math.min(w, h) * .44, cx = w / 2, cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    const g = ctx.createRadialGradient(cx - R * .3, cy - R * .3, R * .1, cx, cy, R * 1.05);
    g.addColorStop(0, 'rgba(61,182,219,.10)'); g.addColorStop(1, 'rgba(61,182,219,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.04, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(238,241,243,.12)'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.283); ctx.stroke();
    for (const p of pts) {
      const [x, y, z] = project(p[0], p[1], R, cx, cy); if (z < 0) continue;
      ctx.fillStyle = `rgba(238,241,243,${.12 + z * .5})`; ctx.fillRect(x - dpr * .9, y - dpr * .9, dpr * 1.8, dpr * 1.8);
    }
    const t = ((now - t0) / 2600) % 1;
    targets.forEach((tg, i) => {
      ctx.beginPath(); let started = false;
      const seg = 40;
      for (let k = 0; k <= seg; k++) {
        const q = slerp(paris, tg, k / seg); const lift = 1 + Math.sin(Math.PI * k / seg) * .12;
        const [x, y, z] = project(q[0], q[1], R * lift, cx, cy);
        if (z < -.05) { started = false; continue; }
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = i % 2 ? 'rgba(61,182,219,.55)' : 'rgba(245,154,0,.55)'; ctx.lineWidth = 1.2 * dpr; ctx.stroke();
      // impulsion qui voyage
      const tt = (t + i * .13) % 1; const q = slerp(paris, tg, tt); const [x, y, z] = project(q[0], q[1], R * (1 + Math.sin(Math.PI * tt) * .12), cx, cy);
      if (z > 0) { ctx.fillStyle = i % 2 ? '#3DB6DB' : '#F59A00'; ctx.beginPath(); ctx.arc(x, y, 2.6 * dpr, 0, 6.283); ctx.fill(); }
      const [ex, ey, ez] = project(tg[0], tg[1], R, cx, cy); if (ez > 0) { ctx.fillStyle = '#EEF1F3'; ctx.beginPath(); ctx.arc(ex, ey, 2.2 * dpr, 0, 6.283); ctx.fill(); }
    });
    const [px, py, pz] = project(paris[0], paris[1], R, cx, cy);
    if (pz > 0) { ctx.fillStyle = '#F59A00'; ctx.beginPath(); ctx.arc(px, py, 4 * dpr, 0, 6.283); ctx.fill(); }
  };
  const loop = (now) => { raf = 0; if (!vis) return; rot += .12; draw(now); raf = requestAnimationFrame(loop); };
  if (reduced()) { rot = -8; draw(performance.now()); window.addEventListener('resize', () => draw(performance.now())); return; }
  onVisible(c, (v) => { vis = v; if (v && !raf) raf = requestAnimationFrame(loop); });
  // le défilement fait tourner le globe
  ST().create({ trigger: c, start: 'top bottom', end: 'bottom top', onUpdate: (s) => { rot += s.getVelocity() * .0012; } });
}

// ---------- RSE : les engagements apparaissent un à un ----------
export function initRse() {
  const sec = $('[data-rse]'); if (!sec || reduced()) return;
  $$('.rse__list li', sec).forEach((l) => {
    gsap.fromTo(l, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: l, start: 'top 88%', once: true } });
  });
}

// ---------- actualités : dates réelles, à venir / passées triées automatiquement ----------
const EVENTS = [
  { start: '2026-11-19T18:30:00+01:00', fr: 'Transmission d’entreprise : une soirée dédiée aux dirigeants, La Rochelle (Bio’Pôle, Périgny)', en: 'Business transfer: an evening for business owners, La Rochelle (Bio’Pôle, Périgny)', local: 'actualites/soiree-transmission-la-rochelle.html' },
  { start: '2026-05-18', end: '2026-05-22', fr: 'Exco s’engage pour les Journées de la sécurité routière au travail', en: 'Exco supports Road Safety at Work Days', url: 'https://exco.fr/evenement/exco-sengage-pour-les-journees-de-la-securite-routiere-au-travail-2026/' },
  { start: '2026-03-31', fr: 'Facturation électronique : de la théorie à la pratique, comment réussir sa transition ? (webinaire)', en: 'E-invoicing: from theory to practice (webinar)', url: 'https://exco.fr/evenement/la-facturation-electronique-pme-tpe-structurees-daf-de-la-theorie-a-la-pratique-comment-reussir-sa-transition/' },
  { start: '2026-02-23', end: '2026-02-25', fr: 'Exco Fiduciaire du Sud-Ouest, membre d’AGIRAGRI, au SIA’PRO 2026', en: 'Exco Fiduciaire du Sud-Ouest, an AGIRAGRI member, at SIA’PRO 2026', url: 'https://exco.fr/evenement/exco-fiduciaire-du-sud-ouest-membre-dagiragri-participe-au-siapro-2026/' },
];
export function countdownText(iso, now = new Date()) {
  const ms = new Date(iso) - now; if (ms <= 0) return null;
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24;
  return { d, h, short: d > 0 ? `J-${d}` : `${h} h` };
}
export function initNews() {
  const now = new Date();
  // teaser du cycle de vie
  $$('[data-countdown]').forEach((el) => { const c = countdownText(el.dataset.countdown, now); el.textContent = c ? (lang() === 'en' ? `${c.d} days` : c.short) : T('Passé', 'Past'); });
  const evl = $('[data-events-list]'); if (!evl) return;
  const evs = EVENTS.map((e) => ({ ...e, s: new Date(e.start), e: new Date(e.end || e.start) })).map((e) => ({ ...e, past: e.e.setHours(23, 59) < now }));
  const up = evs.filter((e) => !e.past).sort((a, b) => a.s - b.s), past = evs.filter((e) => e.past).sort((a, b) => b.s - a.s);
  const dateStr = (e) => e.end ? `${fmtDate(e.s, { day: 'numeric', month: 'long' })} – ${fmtDate(new Date(e.end))}` : fmtDate(e.s);
  // au-delà de deux jours, le compte à rebours n'affiche plus les heures
  const cd = (c) => (c.d >= 2 ? `${c.d}<small>${T('jours', 'days')}</small>` : `${c.d}<small>${T(c.d > 1 ? 'jours' : 'jour', c.d > 1 ? 'days' : 'day')} ${c.h} h</small>`);
  const pastShown = past.slice(0, up.length ? 1 : 2);
  evl.innerHTML = [...up.map((e, i) => {
    const c = countdownText(e.start, now);
    const href = e.local ? `href="${base()}${e.local}" data-transition` : `href="${e.url}" target="_blank" rel="noopener"`;
    return `<li><a class="ev ${i === 0 ? 'ev--next' : ''}" ${href}><span class="ev__when"><span class="ev__badge">${T('À venir', 'Upcoming')}</span>${dateStr(e)}</span><span class="ev__t">${lang() === 'en' ? e.en : e.fr}</span>${c && i === 0 ? `<span class="ev__count" data-live-count="${e.start}">${cd(c)}</span>` : ''}</a></li>`;
  }), ...pastShown.map((e) => `<li><a class="ev ev--past" href="${e.url}" target="_blank" rel="noopener"><span class="ev__when"><span class="ev__badge">${T('Passé', 'Past')}</span>${dateStr(e)}</span><span class="ev__t">${lang() === 'en' ? e.en : e.fr}</span></a></li>`)].join('');
  if (past.length > pastShown.length) evl.insertAdjacentHTML('beforeend', `<li><a class="link-arrow ev__all" href="${base()}actualites.html" data-transition>${T('Tous les événements', 'All events')}</a></li>`);
  $$('.ev', evl).forEach((a) => a.style.textDecoration = 'none');
  setInterval(() => $$('[data-live-count]').forEach((el) => { const c = countdownText(el.dataset.liveCount); if (c) el.innerHTML = cd(c); }), 60000);
  const arts = $('[data-articles]'); if (!arts) return;
  if (!reduced()) gsap.fromTo($$('.art', arts), { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: .08, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: arts, start: 'top 85%', once: true } });
}

// ---------- rendez-vous en 4 étapes ----------
export function initRdv() {
  const form = $('[data-steps]'); if (!form) return;
  const steps = $$('.step', form), nav = $$('.steps__nav li', form);
  const prev = $('[data-prev]', form), next = $('[data-next]', form);
  // récapitulatif : la fiche de demande se remplit au fil des réponses
  const recap = $('[data-recap]');
  const labelOf = (inp) => { const l = inp.closest('label'); const sp = l && (l.querySelector(`[lang="${lang()}"]`) || l.querySelector('span')); return sp ? sp.textContent.trim() : inp.value; };
  const setR = (k, v) => { const dd = recap && $(`[data-r="${k}"]`, recap); if (!dd) return; const val = v || '—'; if (dd.textContent === val) return; dd.textContent = val; dd.classList.toggle('is-set', !!v); if (v && !reduced()) gsap.fromTo(dd, { backgroundColor: 'rgba(0,143,195,.18)' }, { backgroundColor: 'rgba(0,143,195,0)', duration: 1.2 }); };
  const updRecap = () => {
    const pr = form.querySelector('[name="profil"]:checked'); setR('profil', pr ? labelOf(pr) : '');
    setR('besoin', $$('[name="besoin"]:checked', form).map(labelOf).join(', '));
    setR('ville', form.ville.value.trim());
    setR('cabinet', chosen ? `${chosen.n}, ${chosen.c}` : '');
    const n = ['profil', 'besoin', 'ville', 'cabinet'].filter((k) => $(`[data-r="${k}"]`, recap)?.classList.contains('is-set')).length;
    const tot = recap && $('[data-r-count]', recap); if (tot) tot.textContent = `${n} / 4`;
  };
  let cur = 0, chosen = null, first = true;
  // lecteurs d'écran : « Étape n sur 4 » annoncée à chaque changement
  const live = document.createElement('p'); live.className = 'sr'; live.setAttribute('aria-live', 'polite'); form.prepend(live);
  const show = (i) => {
    if (i < 4) live.textContent = T(`Étape ${i + 1} sur 4`, `Step ${i + 1} of 4`);
    steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    nav.forEach((n, k) => { n.classList.toggle('is-on', k === i); n.classList.toggle('is-done', k < i); });
    prev.hidden = i === 0 || i >= 4; next.hidden = i >= 4;
    const fr = $('[data-next-fr]', next), en = $('[data-next-en]', next);
    if (fr) fr.textContent = i === 3 ? 'Envoyer la demande' : 'Continuer';
    if (en) en.textContent = i === 3 ? 'Send request' : 'Continue';
    if (!reduced()) gsap.fromTo(steps[i], { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: .5, ease: 'power3.out' });
    cur = i;
    // après un changement d'étape : le titre de l'étape reçoit le focus et reste visible sous l'en-tête
    if (!first) {
      const t = i >= 4 ? $('[data-done-text]', form) : $('legend', steps[i]);
      if (t) { if (!t.hasAttribute('tabindex')) t.tabIndex = -1; t.focus({ preventScroll: true }); }
      const top = form.getBoundingClientRect().top, hd = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hd-h')) || 72;
      if (top < hd + 8) window.scrollBy({ top: top - hd - 16, behavior: reduced() ? 'auto' : 'smooth' });
    }
    first = false;
  };
  const err = (i, on) => { const e = $('[data-err]', steps[i]); if (e) e.hidden = !on; };
  const valid = (i) => {
    if (i === 0) return !!form.querySelector('[name="profil"]:checked');
    if (i === 1) return form.querySelectorAll('[name="besoin"]:checked').length > 0;
    if (i === 2) return form.ville.value.trim().length > 1;
    if (i === 3) return form.nom.value.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value.trim());
    return true;
  };
  // étape 3 : on propose le cabinet le plus proche, avec le service demandé si possible
  const town = $('[data-rdv-town]', form), match = $('[data-rdv-match]', form);
  let tmo = 0;
  town.addEventListener('input', () => {
    clearTimeout(tmo);
    tmo = setTimeout(async () => {
      const q = town.value.trim(); if (q.length < 2) { match.innerHTML = ''; chosen = null; updRecap(); return; }
      const [ref, cabs] = await Promise.all([resolvePlace(q), loadCabinets()]);
      if (!ref) { match.innerHTML = `<p class="cab__meta" style="color:var(--ink-soft)">${T('Lieu non reconnu : essayez une ville ou un code postal.', 'Place not recognised: try a town or a postcode.')}</p>`; chosen = null; updRecap(); return; }
      const needs = $$('[name="besoin"]:checked', form).map((i) => i.value);
      let pool = cabs.filter((c) => needs.every((k) => c.s.includes(k)));
      if (!pool.length) pool = cabs;
      const near = nearest(pool, ref.lat, ref.lon, 3);
      chosen = near[0].c;
      match.innerHTML = `<p style="font-size:var(--fs-0);font-weight:600">${T('Cabinets les plus proches de ', 'Nearest offices to ')}${ref.label}</p>` + near.map((n, i) => `<label class="match"><input type="radio" name="cabinet" value="${n.c.id}" ${i === 0 ? 'checked' : ''}><span>${n.c.n} <small>${n.c.a}${n.d >= .5 ? `, ${n.d < 10 ? n.d.toFixed(1).replace('.', lang() === 'en' ? '.' : ',') : Math.round(n.d)} km` : ''}</small></span></label>`).join('');
      $$('input[name="cabinet"]', match).forEach((r) => r.addEventListener('change', () => { chosen = near.find((n) => n.c.id === r.value).c; updRecap(); }));
      updRecap();
    }, 250);
  });
  next.addEventListener('click', () => {
    if (!valid(cur)) { err(cur, true); return; }
    err(cur, false);
    if (cur === 3) {
      const done = $('[data-done-text]', form);
      const nm = form.nom.value.trim();
      done.textContent = chosen
        ? T(`Merci ${nm}. Votre demande serait transmise à ${chosen.n} (${chosen.a}), qui vous recontacterait pour fixer un rendez-vous.`, `Thank you ${nm}. Your request would be passed to ${chosen.n} (${chosen.a}), who would contact you to arrange a meeting.`)
        : T(`Merci ${nm}. Votre demande serait transmise au cabinet le plus proche.`, `Thank you ${nm}. Your request would be passed to the nearest office.`);
      show(4);
      return;
    }
    show(cur + 1);
  });
  prev.addEventListener('click', () => show(Math.max(0, cur - 1)));
  form.addEventListener('change', () => { err(cur, false); updRecap(); });
  form.addEventListener('input', updRecap);
  form.addEventListener('submit', (e) => e.preventDefault());
  show(0);
  const pre = decodeURIComponent(location.hash.slice(1));
  if (/^exco-[\w-]+$/.test(pre)) loadCabinets().then((cabs) => {
    const c = cabs.find((x) => x.id === pre); if (!c) return;
    chosen = c; town.value = c.c;
    match.innerHTML = `<p style="font-size:var(--fs-0);font-weight:600">${T('Cabinet choisi', 'Selected office')}</p><label class="match"><input type="radio" name="cabinet" value="${c.id}" checked><span>${c.n} <small>${c.a}</small></span></label>`;
    // venu d'une fiche cabinet : le choix se voit dès la première étape
    const pb = document.createElement('p'); pb.className = 'rdv__pre';
    pb.innerHTML = `<span>${T('Cabinet choisi\u00a0:', 'Selected office:')} <strong>${c.n}</strong></span> <button type="button" class="linklike">${T('changer', 'change')}</button>`;
    $('button', pb).addEventListener('click', () => { chosen = null; town.value = ''; match.innerHTML = ''; pb.remove(); updRecap(); });
    steps[0].insertBefore(pb, $('legend', steps[0]).nextSibling);
    updRecap();
  });
}
