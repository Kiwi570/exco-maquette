"""Assemble les pages intérieures à partir de l'en-tête et du pied de page de index.html.
Usage : python3 src/build_pages.py  (depuis le dossier du site)"""
import re, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
idx = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

def between(s, a, b, incl_b=True):
    i = s.index(a); j = s.index(b, i)
    return s[i:j + (len(b) if incl_b else 0)]

head_script = between(idx, '<script>(function(){var d=document.documentElement', '</script>')
skip = between(idx, '<a class="skip"', '</a>')
veil = between(idx, '<div class="veil"', '</div>')
cursor = between(idx, '<div class="cursor', '</span></div>')
header = between(idx, '<header class="hd"', '</header>')
menu = between(idx, '<div class="menu"', '</div>\n</div>')
footer = between(idx, '<footer class="ft"', '</footer>')
scripts = between(idx, '<script src="assets/vendor/gsap/gsap.min.js">', '<script src="assets/js/site.js"></script>')

def rel(s, p):
    s = re.sub(r'href="#([\w-]+)"', lambda m: f'href="{p}index.html#{m.group(1)}" data-transition', s)
    s = s.replace('data-menu-link data-transition', 'data-transition').replace('data-transition data-menu-link', 'data-transition')
    for k in ['assets/', 'index.html', 'services/', 'cabinets/', 'mentions-legales.html']:
        s = s.replace(f'src="{k}', f'src="{p}{k}').replace(f'href="{k}', f'href="{p}{k}').replace(f'srcset="{k}', f'srcset="{p}{k}')
    s = s.replace(f'href="{p}{p}', f'href="{p}').replace(' data-transition data-transition', ' data-transition')
    return s

PAGES = [
    dict(out='cabinets/exco-albi.html', frag='src/pages/cabinet-albi.html', p='../', page='cabinet', extra=' data-cabinet="exco-albi"',
         title="Exco Albi, expert-comptable à Puygouzon", title_en='Exco Albi, accountants in Puygouzon',
         desc="Exco Albi, cabinet d'expertise comptable, d'audit et de conseil à Puygouzon (Albi). Horaires, équipe, services, contact. Maquette de refonte."),
    dict(out='services/expertise-comptable.html', frag='src/pages/service-ec.html', p='../', page='service', extra='',
         title='Expertise comptable Exco', title_en='Exco accounting services',
         desc="Expertise comptable Exco : comptabilité et fiscalité, gestion, consolidation des comptes. Maquette de refonte."),
    dict(out='mentions-legales.html', frag='src/pages/legal.html', p='', page='legal', extra='',
         title='Mentions légales Exco', title_en='Exco legal notice', desc='Mentions légales du site Exco. Maquette de refonte.'),
]

for pg in PAGES:
    p = pg['p']
    frag = open(os.path.join(ROOT, pg['frag']), encoding='utf-8').read()
    hdr = rel(header, p)
    if pg['page'] in ('cabinet', 'legal', 'service'):
        hdr = hdr.replace('class="hd" data-hd', 'class="hd" data-hd')
    doc = f'''<!doctype html>
<html lang="fr" data-lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{pg['title']}</title>
<meta name="title-en" content="{pg['title_en']}">
<meta name="description" content="{pg['desc']}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#EEE7D8">
<link rel="icon" href="{p}assets/img/logos/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{p}assets/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{p}assets/fonts/intertight-var.woff2" as="font" type="font/woff2" crossorigin>
{head_script}
<link rel="stylesheet" href="{p}assets/css/site.css">
</head>
<body data-page="{pg['page']}" data-base="{p}"{pg['extra']}>
{rel(skip, p)}
{veil}
{cursor}

{hdr}

{rel(menu, p)}

{frag.strip()}

{rel(footer, p)}

{rel(scripts, p)}
</body>
</html>
'''
    out = os.path.join(ROOT, pg['out'])
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(doc)
    print('ok', pg['out'], len(doc))
