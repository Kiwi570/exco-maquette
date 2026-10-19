// Visuels provisoires, en attendant les images Grok : fond bleu nuit quadrillé (une feuille de calcul),
// un mot en grand et la mention « Visuel provisoire ». Si l'image Grok est livrée (liste GROK_READY),
// elle remplace le visuel provisoire.
import { $$, T, base } from './util.js';

// noms des images Grok déjà reçues et intégrées (document « exco-images-grok-v2 »)
export const GROK_READY = new Set([]);

export function initPlaceholders() {
  $$('.ph').forEach((ph) => {
    if (ph.dataset.done) return; ph.dataset.done = '1';
    const name = ph.dataset.grok;
    if (name && GROK_READY.has(name)) {
      const im = new Image(); im.className = 'ph__real'; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async';
      im.src = `${base()}assets/img/grok/${name}.webp`; ph.appendChild(im); return;
    }
    if (ph.dataset.word) { const w = document.createElement('span'); w.className = 'ph__word'; w.textContent = ph.dataset.word; w.setAttribute('aria-hidden', 'true'); ph.appendChild(w); }
    if (!ph.classList.contains('ph--fill') && !ph.classList.contains('ph--mini')) { const t = document.createElement('span'); t.className = 'ph__tag'; t.textContent = T('Visuel provisoire', 'Temporary visual'); ph.appendChild(t); }
  });
}
