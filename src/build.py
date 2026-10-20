"""Génère toutes les pages du site (HTML statique) à partir des gabarits de src/sitegen et des contenus de src/content.
Usage, depuis le dossier du site : python3 src/build.py"""
import os, sys, shutil, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sitegen.common import ROOT, SITE_URL, page_url, load
from sitegen.partials import page, CAT
from sitegen import pages_core as C, pages_content as P, pages_cab as K

GEN_DIRS = ['cabinets', 'services', 'secteurs', 'groupes', 'actualites', 'carrieres', 'le-reseau']
GEN_ROOT = ['index.html', 'services.html', 'secteurs.html', 'cabinets.html', 'le-reseau.html', 'carrieres.html', 'actualites.html',
            'contact.html', 'mentions-legales.html', 'plan-du-site.html', '404.html']
SECTION = {'home': '', 'services': 'services', 'service': 'services', 'service-generic': 'services', 'sectors': 'secteurs', 'sector': 'secteurs',
           'cabinets': 'cabinets', 'cabinet': 'cabinets', 'group': 'reseau', 'reseau': 'reseau', 'gouvernance': 'reseau', 'rse': 'reseau',
           'careers': 'carrieres', 'metier': 'carrieres', 'news': 'actualites', 'article': 'actualites', 'contact': 'contact'}


def main():
    actus = load('actus.json') or []
    built = []

    def add(res):
        built.append(res)

    add(C.home(actus))
    add(C.services_index())
    add(P.service_ec_page())
    for i, s in enumerate(CAT['services'][1:]):
        add(P.service_page(s, i))
    add(C.sectors_index())
    for i, x in enumerate(CAT['sectors']):
        add(P.sector_page(x, i))
    add(K.cabinets_index(actus))
    for c in K.CABS:
        add(K.cabinet_page(c, actus))
    pages_fr, pages_en = P.PAGES_FR, P.PAGES_EN
    for g in CAT['groups']:
        key = f'groupe-{g["slug"]}'
        fr = pages_fr.get(key)
        en = pages_en.get(key)
        add(K.group_page(g, fr, en))
    add(C.reseau())
    add(C.gouvernance())
    add(C.rse())
    add(C.carrieres())
    for i, m in enumerate(CAT['metiers']):
        add(P.metier_page(m, i))
    add(P.news_index(actus))
    for a in actus:
        add(P.article_page(a, actus))
    add(C.contact())
    add(C.legal())
    add(C.not_found())
    add(C.sitemap_page(built + [None]))

    # nettoyage des pages générées précédemment
    for d in GEN_DIRS:
        shutil.rmtree(os.path.join(ROOT, d), ignore_errors=True)
    for f in GEN_ROOT:
        p = os.path.join(ROOT, f)
        if os.path.exists(p): os.remove(p)

    urls = []
    for pg, main_html in built:
        doc = page(pg, main_html, SECTION.get(pg['type'], ''), home=pg['type'] == 'home')
        out = os.path.join(ROOT, pg['out'])
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w', encoding='utf-8').write(doc)
        if pg['type'] != '404':
            urls.append(page_url(pg['out']))
    # plan du site XML et robots.txt (maquette : indexation bloquée)
    sm = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{u}</loc></url>\n' for u in urls) + '</urlset>\n'
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
    open(os.path.join(ROOT, 'robots.txt'), 'w', encoding='utf-8').write(f'# Maquette : ne pas indexer\nUser-agent: *\nDisallow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n')
    print(len(built), 'pages générées')


def group_intro(blocks):
    """Texte de présentation d'une page de groupe : ce qui suit la liste de ses coordonnées."""
    if not blocks: return None
    out, started = [], False
    for b in blocks:
        t = b.get('t', '')
        if b['k'] == 'counter' or b['k'] == 'img': continue
        if not started:
            if b['k'] in ('h3',) and len(t) > 60:
                started = True
            else:
                continue
        if t.startswith(('L’ADN', 'L\'ADN', 'Votre plateforme digitale', 'Your digital platform')): break
        out.append(b)
    return out or None


if __name__ == '__main__':
    main()
