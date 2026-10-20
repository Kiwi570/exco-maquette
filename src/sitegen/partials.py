"""Gabarits partagés : en-tête de document, en-tête du site avec menus déroulants, menu mobile, pied de page."""
import hashlib, os
from .common import bi, bie, esc, attr, ico, page_url, jsonld, SITE_URL, load, ROOT


def ver(rel):
    """Empreinte courte du fichier, ajoutée à l'adresse pour forcer le rechargement après une mise à jour."""
    p = os.path.join(ROOT, rel)
    return hashlib.md5(open(p, 'rb').read()).hexdigest()[:8] if os.path.exists(p) else '0'

CAT = load('catalog.json')

HEAD_SCRIPT = """<script>(function(){var d=document.documentElement,l='fr',c=0,i=0,n=0;try{l=localStorage.getItem('exco-lang')||'fr';c=localStorage.getItem('exco-calm')==='1';i=sessionStorage.getItem('exco-intro')==='1';var q=/[?&]notes=([01])/.exec(location.search);if(q)localStorage.setItem('exco-notes',q[1]);var g=/[?&]lang=(fr|en)/.exec(location.search);if(g){localStorage.setItem('exco-lang',g[1]);l=g[1]}n=localStorage.getItem('exco-notes')==='0'}catch(e){}if(l!=='en')l='fr';d.setAttribute('data-lang',l);d.lang=l;d.className+=' js'+(c?' calm':'')+(i?' intro-seen':'')+(n?' notes-off':'');if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)d.className+=' rm'})()</script>"""


def head(r, pg):
    """r : préfixe vers la racine ; pg : métadonnées de la page."""
    url = page_url(pg['out'])
    img = pg.get('og') or 'assets/img/og/exco-og.jpg'
    og_img = f'{SITE_URL}/{img}'
    t_fr, t_en = pg['title'], pg.get('title_en', pg['title'])
    d_fr = pg.get('desc', '')
    ld = ''.join(jsonld(x) for x in pg.get('ld', []))
    return f'''<!doctype html>
<html lang="fr" data-lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(t_fr)}</title>
<meta name="title-en" content="{attr(t_en)}">
<meta name="description" content="{attr(d_fr)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="{url}">
<meta property="og:type" content="{pg.get('og_type', 'website')}">
<meta property="og:site_name" content="Exco">
<meta property="og:title" content="{attr(t_fr)}">
<meta property="og:description" content="{attr(d_fr)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{og_img}">
<meta property="og:locale" content="fr_FR">
<meta property="og:locale:alternate" content="en_GB">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F4F4F1">
<link rel="icon" href="{r}assets/img/logos/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{r}assets/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{r}assets/fonts/intertight-var.woff2" as="font" type="font/woff2" crossorigin>
{HEAD_SCRIPT}
<link rel="stylesheet" href="{r}assets/css/site.css?v={ver('assets/css/site.css')}">
{ld}
</head>'''


def chrome(r):
    """Lien d'évitement, ouverture, voile de transition, curseur."""
    return f'''<a class="skip" href="#contenu"><span lang="fr">Aller au contenu</span><span lang="en">Skip to content</span></a>
<div class="veil" aria-hidden="true" data-veil><img class="veil__logo" src="{r}assets/img/logos/exco-logo-blanc.svg" alt="" width="160" height="43"></div>
<div class="cursor is-hidden" aria-hidden="true" data-cursor><span class="cursor__dot"></span><span class="cursor__ring"></span><span class="cursor__label" data-cursor-label></span></div>'''


def intro(r):
    return f'''<div class="intro" aria-hidden="true" data-intro>
  <div class="intro__in"><img class="intro__logo" src="{r}assets/img/logos/exco-logo.svg" alt="" width="220" height="59"><span class="intro__rule"><span></span><span></span></span></div>
</div>'''


RESEAU = [
    ('le-reseau.html', 'Nous connaître', 'About us', 'Un réseau de cabinets indépendants, né en 2002.', 'A network of independent firms, founded in 2002.'),
    ('le-reseau/gouvernance.html', 'Gouvernance', 'Governance', 'Un Comité directeur de 21 associés, une voix chacun.', 'A Steering Committee of 21 partners, one vote each.'),
    ('le-reseau/engagements-rse.html', 'Engagements RSE', 'CSR commitments', 'Environnement, social, économie locale, éthique.', 'Environment, people, local economy, ethics.'),
    ('le-reseau.html#kreston', 'Kreston Global', 'Kreston Global', 'Un relais dans plus de 115 pays.', 'Support in more than 115 countries.'),
]


def _dd_reseau(r):
    cards = ''.join(f'<a class="dd-card" href="{r}{h}" data-transition><span class="dd-card__t">{bie(tf, te)}</span><span class="dd-card__d">{bie(df, de)}</span></a>' for h, tf, te, df, de in RESEAU)
    return f'''<div class="dd" id="dd-reseau" data-dd-panel hidden><div class="wrap dd__in dd__in--reseau">
      <div class="dd__cards">{cards}</div>
      <div class="dd__aside"><p class="dd__fig"><b>139</b>{bi('cabinets dans l’annuaire', 'offices in the directory')}</p><p class="dd__fig"><b>23</b>{bi('groupes membres', 'member groups')}</p><a class="link-arrow" href="{r}cabinets.html" data-transition>{bi('Trouver un cabinet', 'Find an office')}</a></div>
    </div></div>'''


def _dd_services(r):
    s = CAT['services']
    ec = s[0]
    rest = ''.join(f'<a class="dd-svc" href="{r}services/{x["slug"]}.html" data-transition>{ico(x["icon"])}<span>{bie(x["fr"], x["en"])}</span></a>' for x in s[1:])
    return f'''<div class="dd" id="dd-services" data-dd-panel hidden><div class="wrap dd__in dd__in--services">
      <a class="dd-feature" href="{r}services/{ec['slug']}.html" data-transition>{ico('ec', 'ico ico--lg')}<span class="dd-feature__t">{bie(ec['fr'], ec['en'])}</span><span class="dd-feature__d">{bie(ec['dfr'], ec['den'])}</span></a>
      <div class="dd__grid">{rest}</div>
      <a class="link-arrow dd__all" href="{r}services.html" data-transition>{bi('Tous les services', 'All services')}</a>
    </div></div>'''


def _dd_secteurs(r):
    secs = CAT['sectors']
    items = ''.join(f'<a class="dd-sec" href="{r}secteurs/{x["slug"]}.html" data-transition data-preview="{r}assets/img/grok/{x["img"]}.webp">{bie(x["fr"], x["en"])}</a>' for x in secs)
    first = secs[0]
    return f'''<div class="dd" id="dd-secteurs" data-dd-panel hidden><div class="wrap dd__in dd__in--secteurs">
      <div class="dd__list">{items}</div>
      <figure class="dd__preview"><img src="{r}assets/img/grok/{first['img']}.webp" alt="" loading="lazy" data-dd-preview></figure>
      <a class="link-arrow dd__all" href="{r}secteurs.html" data-transition>{bi('Tous les secteurs', 'All sectors')}</a>
    </div></div>'''


def header(r, section=''):
    def cur(k):
        return ' aria-current="page"' if section == k else ''
    def ddbtn(k, fr, en):
        c = ' is-current' if section == k else ''
        return f'<button class="nav-link{c}" type="button" aria-expanded="false" aria-controls="dd-{k}" data-dd="{k}">{bi(fr, en)}{ico("chev", "nav-chev")}</button>'
    return f'''<header class="hd" data-hd>
  <div class="hd__in">
    <a class="hd__logo" href="{r}index.html" data-transition><img class="logo-dark" src="{r}assets/img/logos/exco-logo.svg" alt="Exco" width="150" height="40"><img class="logo-light" src="{r}assets/img/logos/exco-logo-blanc.svg" alt="" width="150" height="40"></a>
    <nav class="hd__nav" aria-label="Navigation principale" data-en-aria-label="Main navigation">
      <div class="nav-item">{ddbtn('reseau', 'Le réseau', 'Network')}{_dd_reseau(r)}</div>
      <div class="nav-item">{ddbtn('services', 'Services', 'Services')}{_dd_services(r)}</div>
      <div class="nav-item">{ddbtn('secteurs', 'Secteurs', 'Sectors')}{_dd_secteurs(r)}</div>
      <a class="nav-link" href="{r}cabinets.html" data-transition{cur('cabinets')}>{bi('Cabinets', 'Offices')}</a>
      <a class="nav-link" href="{r}carrieres.html" data-transition{cur('carrieres')}>{bi('Carrières', 'Careers')}</a>
      <a class="nav-link" href="{r}actualites.html" data-transition{cur('actualites')}>{bi('Actualités', 'News')}</a>
    </nav>
    <div class="hd__tools">
      <button class="hd__lang" type="button" data-lang-toggle aria-label="Passer en anglais" data-en-aria-label="Switch to French"><span lang="fr" aria-hidden="true">EN</span><span lang="en" aria-hidden="true">FR</span></button>
      <a class="hd__client" href="https://exco.fr/accedez-a-votre-compte-client/" target="_blank" rel="noopener">{bi('Accès client', 'Client access')}</a>
      <a class="btn btn--primary btn--sm hd__cta" href="{r}contact.html" data-transition data-magnetic{cur('contact')}><span class="btn__dot"></span><span class="hd__cta-long">{bi('Prendre rendez-vous', 'Book a meeting')}</span><span class="hd__cta-short">{bi('Rendez-vous', 'Book')}</span></a>
      <button class="hd__burger" type="button" aria-expanded="false" aria-controls="menu" data-burger><span class="hd__burger-lines"></span><span class="sr">Menu</span></button>
    </div>
  </div>
</header>'''


def menu(r):
    svc = ''.join(f'<li><a href="{r}services/{x["slug"]}.html" data-transition>{bie(x["fr"], x["en"])}</a></li>' for x in CAT['services'])
    sec = ''.join(f'<li><a href="{r}secteurs/{x["slug"]}.html" data-transition>{bie(x["fr"], x["en"])}</a></li>' for x in CAT['sectors'])
    res = ''.join(f'<li><a href="{r}{h}" data-transition>{bie(tf, te)}</a></li>' for h, tf, te, _, _ in RESEAU)
    return f'''<div class="menu" id="menu" data-menu role="dialog" aria-modal="true" aria-label="Menu" hidden>
  <nav class="menu__nav" aria-label="Menu">
    <details class="menu__group"><summary>{bi('Le réseau', 'Network')}</summary><ul>{res}</ul></details>
    <details class="menu__group"><summary>Services</summary><ul><li><a href="{r}services.html" data-transition>{bi('Tous les services', 'All services')}</a></li>{svc}</ul></details>
    <details class="menu__group"><summary>{bi('Secteurs', 'Sectors')}</summary><ul><li><a href="{r}secteurs.html" data-transition>{bi('Tous les secteurs', 'All sectors')}</a></li>{sec}</ul></details>
    <a href="{r}cabinets.html" data-transition>{bi('Trouver un cabinet', 'Find an office')}</a>
    <a href="{r}carrieres.html" data-transition>{bi('Carrières', 'Careers')}</a>
    <a href="{r}actualites.html" data-transition>{bi('Actualités', 'News')}</a>
    <a href="{r}contact.html" data-transition>{bi('Contact et rendez-vous', 'Contact and meetings')}</a>
  </nav>
  <div class="menu__foot">
    <a href="https://exco.fr/accedez-a-votre-compte-client/" target="_blank" rel="noopener">{bi('Accès client', 'Client access')}</a>
    <button type="button" class="linklike" data-lang-toggle>{bi('English', 'Français')}</button>
    <button type="button" class="linklike" data-calm-toggle>{bi('Réduire les animations', 'Reduce motion')}</button>
  </div>
</div>'''


def footer(r):
    svc = ''.join(f'<li><a href="{r}services/{x["slug"]}.html" data-transition>{bie(x["fr"], x["en"])}</a></li>' for x in CAT['services'])
    sec = ''.join(f'<li><a href="{r}secteurs/{x["slug"]}.html" data-transition>{bie(x["fr"], x["en"])}</a></li>' for x in CAT['sectors'])
    return f'''<footer class="ft" data-footer>
  <div class="wrap ft__grid">
    <div class="ft__brand">
      <img class="ft__logo" src="{r}assets/img/logos/exco-logo-blanc.svg" alt="Exco" width="180" height="48" loading="lazy">
      <p class="ft__claim">{bi('Les experts de nos cabinets vous aident à rendre simple et naturel l’entrepreneuriat.', 'Our experts help make entrepreneurship simple and natural.')}</p>
      <address class="ft__addr">Exco France<br>42 avenue de la Grande Armée, 75017 Paris<br><span class="copy" data-copy="+33 1 58 05 22 90">+33 (0)1 58 05 22 90</span><br><span class="copy" data-copy="info@exco.fr">info@exco.fr</span></address>
      <div class="ft__brands">
        <a href="https://gestionprivee.exco.fr/" target="_blank" rel="noopener"><img src="{r}assets/img/logos/exco-gestion-privee-blanc.svg" alt="Exco Gestion Privée" loading="lazy" width="120" height="34"></a>
        <a href="https://finance.exco.fr/" target="_blank" rel="noopener"><img src="{r}assets/img/logos/exco-finance-transactions-blanc.svg" alt="Exco Finance et Transactions" loading="lazy" width="120" height="34"></a>
      </div>
    </div>
    <details class="ft__col" data-ft-col><summary>{bi('Le réseau', 'Network')}</summary><ul>
      <li><a href="{r}le-reseau.html" data-transition>{bi('Nous connaître', 'About us')}</a></li>
      <li><a href="{r}le-reseau/gouvernance.html" data-transition>{bi('Gouvernance', 'Governance')}</a></li>
      <li><a href="{r}le-reseau/engagements-rse.html" data-transition>{bi('Engagements RSE', 'CSR commitments')}</a></li>
      <li><a href="{r}carrieres.html" data-transition>{bi('Carrières', 'Careers')}</a></li>
      <li><a href="{r}actualites.html" data-transition>{bi('Actualités', 'News')}</a></li>
      <li><a href="https://exco.fr/rapports-de-transparence/" target="_blank" rel="noopener">{bi('Rapports de transparence', 'Transparency reports')}</a></li>
      <li><a href="https://exco.fr/index-degalite-femme-homme-exco/" target="_blank" rel="noopener">{bi('Index d’égalité femmes-hommes', 'Gender equality index')}</a></li>
    </ul></details>
    <details class="ft__col" data-ft-col><summary>Services</summary><ul>{svc}</ul></details>
    <details class="ft__col" data-ft-col><summary>{bi('Secteurs', 'Sectors')}</summary><ul>{sec}</ul></details>
    <details class="ft__col" data-ft-col><summary>{bi('Cabinets', 'Offices')}</summary><ul>
      <li><a href="{r}cabinets.html" data-transition>{bi('Trouver un cabinet', 'Find an office')}</a></li>
      <li><a href="{r}cabinets.html#france" data-transition>France</a></li>
      <li><a href="{r}cabinets.html#outre-mer" data-transition>{bi('Outre-mer', 'Overseas')}</a></li>
      <li><a href="{r}cabinets.html#international" data-transition>International</a></li>
      <li><a href="{r}contact.html" data-transition>{bi('Contact et rendez-vous', 'Contact and meetings')}</a></li>
      <li><a href="https://exco.fr/accedez-a-votre-compte-client/" target="_blank" rel="noopener">{bi('Accès client', 'Client access')}</a></li>
    </ul>
    <p class="ft__social"><a href="https://www.linkedin.com/company/exco" target="_blank" rel="noopener">LinkedIn</a> <a href="https://www.youtube.com/channel/UCdLEx0TboPWBR7W-R5KDElg" target="_blank" rel="noopener">YouTube</a> <a href="https://www.facebook.com/reseauexco/" target="_blank" rel="noopener">Facebook</a> <a href="https://twitter.com/exco_france" target="_blank" rel="noopener">X</a></p>
    </details>
  </div>
  <div class="wrap ft__bottom">
    <p>© Exco 2026</p>
    <a href="{r}mentions-legales.html" data-transition>{bi('Mentions légales', 'Legal notice')}</a>
    <a href="https://exco.fr/politique-de-confidentialite/" target="_blank" rel="noopener">{bi('Confidentialité', 'Privacy')}</a>
    <a href="{r}plan-du-site.html" data-transition>{bi('Plan du site', 'Site map')}</a>
    <button type="button" class="linklike" data-calm-toggle>{bi('Réduire les animations', 'Reduce motion')}</button>
    <button type="button" class="linklike" data-notes-toggle>{bi('Masquer les notes de maquette', 'Hide mock-up notes')}</button>
    <button type="button" class="linklike" data-lang-toggle>{bi('English', 'Français')}</button>
    <p class="ft__mock">{bi('Maquette de refonte, contenus repris d’exco.fr le 19 octobre 2026.', 'Redesign mock-up, content taken from exco.fr on 19 October 2026.')}</p>
  </div>
</footer>'''


def scripts(r):
    return f'''<script src="{r}assets/vendor/gsap/gsap.min.js"></script>
<script src="{r}assets/vendor/gsap/ScrollTrigger.min.js"></script>
<script src="{r}assets/vendor/gsap/SplitText.min.js"></script>
<script src="{r}assets/vendor/gsap/DrawSVGPlugin.min.js"></script>
<script src="{r}assets/vendor/gsap/CustomEase.min.js"></script>
<script src="{r}assets/js/site.js?v={ver('assets/js/site.js')}"></script>'''


def crumbs(r, items):
    """items : liste de (libellé fr, libellé en, chemin ou None pour la page courante)."""
    lis = []
    for fr, en, href in items:
        if href:
            lis.append(f'<li><a href="{r}{href}" data-transition>{bie(fr, en)}</a></li>')
        else:
            lis.append(f'<li aria-current="page">{bie(fr, en)}</li>')
    return f'<nav class="crumbs-nav" aria-label="Fil d’Ariane" data-en-aria-label="Breadcrumb"><ol class="crumbs">{"".join(lis)}</ol></nav>'


def crumbs_ld(items, out):
    el = []
    for i, (fr, en, href) in enumerate(items):
        el.append({'@type': 'ListItem', 'position': i + 1, 'name': fr, 'item': page_url(href.split('#')[0]) if href else page_url(out)})
    return {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': el}


# ---------- typographie française : espaces insécables, apostrophes, milliers ----------
import re as _re
_TAGS = _re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<!--.*?-->|<[^>]*>)', _re.S | _re.I)
_NB, _NNB = ' ', ' '
_L = 'A-Za-zÀ-ÖØ-öø-ÿŒœ'


FR_NOTE = '<p class="note" lang="en">This section is only available in French.</p>'


def one_note(doc):
    """La mention « disponible en français seulement » n'apparaît qu'une fois par page."""
    i = doc.find(FR_NOTE)
    if i < 0: return doc
    j = i + len(FR_NOTE)
    return doc[:j] + doc[j:].replace(FR_NOTE, '')


def typo(doc):
    """Corrige la typographie du texte visible (jamais les balises, scripts ni attributs)."""
    parts = _TAGS.split(doc)
    for i in range(0, len(parts), 2):
        t = parts[i]
        if not t.strip():
            continue
        t = _re.sub(rf"(?<=[{_L}])'(?=[{_L}0-9])", '’', t)
        t = _re.sub(r'[ \t\n]+:(?=[\s<]|$)', _NB + ':', t)
        t = _re.sub(r'[ \t\n]+([;!?])', _NNB + r'\1', t)
        t = _re.sub(r'«[ \t\n]+', '«' + _NB, t)
        t = _re.sub(r'[ \t\n]+»', _NB + '»', t)
        for _ in range(2):
            t = _re.sub(r'(?<![\d,.])(\d{1,3}) (\d{3})(?!\d)', r'\1' + _NNB + r'\2', t)
        t = _re.sub(r'(\d) (%|€|k€|M€)', r'\1' + _NB + r'\2', t)
        parts[i] = t
    return ''.join(parts)


def page(pg, main_html, section='', home=False):
    """Assemble une page complète."""
    r = pg['r']
    extra = ''.join(f' data-{k}="{attr(v)}"' for k, v in pg.get('data', {}).items())
    return one_note(typo(f'''{head(r, pg)}
<body data-page="{pg['type']}" data-base="{r}"{extra}>
{chrome(r)}
{intro(r) if home else ''}
{header(r, section)}
{menu(r)}
<main id="contenu">
{main_html}
</main>
{footer(r)}
{scripts(r)}
</body>
</html>
'''))
