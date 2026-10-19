// Visuels provisoires, en attendant les images Grok : fond bleu nuit quadrillé (une feuille de calcul),
// un mot en grand et la mention « Visuel provisoire ». Si l'image Grok est livrée (liste GROK_READY),
// elle remplace le visuel provisoire.
import { $$, T, base } from './util.js';

// noms des images Grok déjà reçues et intégrées (document « exco-images-grok-v2 »)
export const GROK_READY = new Set([
  'secteur-agriculture-4x5', 'secteur-automobile-4x5', 'secteur-banque-assurance-4x5', 'secteur-btp-immobilier-4x5', 'secteur-ess-4x5',
  'secteur-startup-4x5', 'secteur-hotellerie-restauration-4x5', 'secteur-industrie-4x5', 'secteur-loisirs-tourisme-4x5',
  'secteur-professions-liberales-4x5', 'secteur-pharmacie-4x5', 'secteur-sante-medico-social-4x5', 'secteur-public-4x5',
  'secteur-transports-logistique-4x5',
]);

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
