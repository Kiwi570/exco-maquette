# Exco · maquette « Cabinet »

Maquette de refonte du site exco.fr (version 2, 19 octobre 2026).
Version 2 : direction « cabinet premium » sans aucun motif végétal, couleurs du logo, vraies photos du site actuel.
Site statique HTML, CSS et JavaScript, sans étape de construction, prêt pour Vercel.

## Pages
- `index.html` : accueil (ouverture WebGL « tableur », cabinets ouverts en direct, cycle de vie, index des 13 services, trouveur de cabinets, secteurs, gouvernance, Kreston, RSE, carrières, actualités, rendez-vous avec fiche récapitulative)
- `cabinets/exco-albi.html` : fiche cabinet type
- `services/expertise-comptable.html` : page service type (bilan qui s'équilibre, calendrier illustratif de l'exercice, tableau de bord illustratif)
- `mentions-legales.html`

## Données
- `assets/data/cabinets.json` : les 139 fiches de l'annuaire exco.fr (adresses, téléphones, horaires, services, groupe)
- `assets/data/map.json` : contours (Natural Earth, france-geojson), projection Equal Earth
- `assets/data/gazetteer.json` : villes de France et d'outre-mer (GeoNames) pour la recherche

## Modifier
Le code source est dans `src/`. Après une modification de `src/js` ou `src/pages`, lancer `./build.sh`
(esbuild via npx, puis assemblage des pages intérieures). Le site publié n'a pas besoin de cette étape.

## Bibliothèques
GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG, CustomEase), Lenis 1.3, OGL. Polices Fraunces et Inter Tight (OFL).

## À savoir
Formulaires, rendez-vous et contact sont simulés : aucune donnée n'est envoyée.
Les visuels marqués « Visuel provisoire » attendent leurs images Grok (document exco-images-grok-v2). Une fois reçues, les images vont dans `assets/img/grok/` et leur nom s'ajoute à `GROK_READY` dans `src/js/ph.js`. Les chiffres marqués « À confirmer » sont incohérents sur le site actuel.
