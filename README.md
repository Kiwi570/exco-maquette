# Exco · maquette « Cabinet »

Maquette de refonte du site exco.fr (version 6, 20 octobre 2026) : site complet multipage, en français et en anglais, avec les textes et les photos repris d’exco.fr.
Site statique HTML, CSS et JavaScript, prêt pour Vercel (les pages générées sont dans le dépôt).

## Pages (215)
- `index.html` : accueil raccourci (ouverture « tableur », cabinets ouverts en direct, cycle de vie, services, trouveur de cabinets, secteurs, le réseau, actualités)
- `services.html` et `services/*.html` : les 13 services (page Expertise comptable sur mesure, les autres avec la couverture du service dans l'annuaire)
- `secteurs.html` et `secteurs/*.html` : les 14 secteurs
- `cabinets.html` : trouveur et annuaire complet par département, outre-mer et pays ; `cabinets/*.html` : les 139 fiches
- `groupes/*.html` : les 23 groupes membres
- `le-reseau.html`, `le-reseau/gouvernance.html`, `le-reseau/engagements-rse.html`
- `carrieres.html` et `carrieres/*.html` (5 métiers)
- `actualites.html` et `actualites/*.html` (articles et événement)
- `contact.html` (rendez-vous en 4 étapes, cabinet présélectionné par l'ancre `#id-du-cabinet`), `mentions-legales.html`, `plan-du-site.html`, `404.html`
- `sitemap.xml`, `robots.txt` (indexation bloquée tant que c'est une maquette)

## Données et contenus
- `assets/data/cabinets.json` : les 139 fiches de l'annuaire exco.fr (adresses, téléphones, horaires, services, groupe)
- `assets/data/france.json`, `map.json`, `globe.json`, `gazetteer.json` : cartes et recherche
- `src/content/` : textes repris d'exco.fr (catalogue, fiches cabinets, pages, articles)

## Modifier
Gabarits dans `src/sitegen/`, textes dans `src/content/`, scripts dans `src/js/`. Après une modification, lancer `./build.sh`
(esbuild via npx, puis `python3 src/build.py` qui régénère toutes les pages).

## Bibliothèques
GSAP 3.15 (ScrollTrigger, SplitText, DrawSVG, CustomEase), Lenis 1.3, OGL. Polices Fraunces et Inter Tight (OFL).

## À savoir
Formulaires, rendez-vous et contact sont simulés : aucune donnée n'est envoyée.
Les photos des 14 secteurs et des 4 étapes du cycle de vie sont générées par IA (Grok) : personnes fictives, à signaler ou remplacer avant mise en production.
Les mentions « À confirmer » signalent des chiffres incohérents sur le site actuel ; « À compléter », des informations absentes (inscription à l'Ordre, assurance RCP, horaires, accès).
