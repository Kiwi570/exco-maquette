"""Pages de contenu : services, secteurs, métiers, actualités."""
import os, json, re
from .common import bi, bie, esc, attr, ico, page_url, SITE_URL, load, ROOT
from .partials import crumbs_ld, CAT
from .ui import ihero, fact, btn, cta_band, exists, img_tag, svc_cards, sector_card, bi_div
from . import blocks as B

PAGES_FR = load('pages_fr.json') or {}
PAGES_EN = load('pages_en.json') or {}
CABS = json.load(open(os.path.join(ROOT, 'assets', 'data', 'cabinets.json'), encoding='utf-8'))
MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
CATS = {'exco': ('Réseau Exco', 'Exco network'), 'fso': ('Exco Fiduciaire du Sud-Ouest', 'Exco Fiduciaire du Sud-Ouest'),
        'agri': ('Agriculture', 'Agriculture'), 'event': ('Événement', 'Event')}


def date_bi(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return bi(f'{d}{"er" if d == 1 else ""} {MONTHS_FR[m - 1]} {y}', f'{d} {MONTHS_EN[m - 1]} {y}')


def svc_counts():
    cnt = {}
    for c in CABS:
        for k in c['s']:
            cnt[k] = cnt.get(k, 0) + 1
    return cnt


# ---------- mise en page automatique des contenus repris ----------
LIST_TITLE = re.compile(r'missions|prestations|nos services|domaines|interventions|services proposés|our services|assignments', re.I)


def smart(blocks, r=''):
    """Rend des blocs en repérant les listes déguisées en paragraphes après un intertitre."""
    out, i, n = [], 0, len(blocks)
    while i < n:
        b = blocks[i]
        # suite de titres courts sans texte entre eux : c'est une liste
        j = i
        while j < n and blocks[j]['k'] in ('h3', 'h4', 'h5') and len(blocks[j]['t']) <= 40: j += 1
        if j - i >= 3 and (j >= n or blocks[j]['k'] in ('h2', 'h3', 'h4', 'h5', 'img') or len(blocks[j].get('t', '')) > 40):
            out.append('<ul class="ledger">' + ''.join(f'<li>{esc(x["t"])}</li>' for x in blocks[i:j]) + '</ul>')
            i = j; continue
        if b['k'] in ('h3', 'h4', 'h5') and len(b['t']) <= 110:
            j = i + 1
            run = []
            while j < n and blocks[j]['k'] in ('p', 'li', 'div') and len(blocks[j]['t']) <= 170:
                run.append(blocks[j]); j += 1
            nxt_heading = j >= n or blocks[j]['k'] in ('h2', 'h3', 'h4', 'h5', 'img')
            if len(run) >= 3 and nxt_heading and sum(len(x['t']) for x in run) / len(run) <= 130:
                cls = 'ledger' if LIST_TITLE.search(b['t']) else 'checks'
                items = ''.join(f'<li><p>{B.li_inner(x)}</p></li>' if cls == 'checks' else f'<li>{B.li_inner(x)}</li>' for x in run)
                out.append(f'<h3>{esc(b["t"])}</h3><ul class="{cls}">{items}</ul>')
                i = j; continue
        # paragraphe isolé suivi de puces
        j = i
        while j < n and blocks[j]['k'] == 'li': j += 1
        if j > i:
            run = blocks[i:j]
            if all(x.get('h') for x in run) and len(run) >= 3:
                out.append('<ul class="checks">' + ''.join(f'<li><p>{B.li_inner(x)}</p></li>' for x in run) + '</ul>')
            else:
                out.append('<ul>' + ''.join(f'<li>{B.li_inner(x)}</li>' for x in run) + '</ul>')
            i = j; continue
        out.append(B.render([b], r, demote=0 if b['k'] != 'h2' else 1))
        i += 1
    return ''.join(out)


def auto_sections(blocks_fr, blocks_en, skip_first_h2=True):
    """Découpe en sections (h2) les contenus FR et EN, et renvoie (intro, [(titre_fr, titre_en, html_fr, html_en)])."""
    def prep(bl):
        if not bl: return None, []
        bl = [b for b in bl if b['k'] != 'h1']
        sub = None
        if skip_first_h2 and bl and bl[0]['k'] == 'h2':
            sub = bl[0]['t']; bl = bl[1:]
        secs = B.sections(bl)
        return sub, secs
    sub_fr, s_fr = prep(blocks_fr)
    sub_en, s_en = prep(blocks_en) if blocks_en else (None, [])
    pairs = []
    for k, s in enumerate(s_fr):
        e = s_en[k] if k < len(s_en) else None
        pairs.append((s['h'], e['h'] if e else None, smart([x for x in s['blocks'] if x['k'] not in ('counter',)]), smart([x for x in e['blocks'] if x['k'] not in ('counter',)]) if e else ''))
    return (sub_fr, sub_en), pairs


def fix_case(t):
    """Titres d'exco.fr en capitales ou à la casse accidentelle (« NOTrE savoir-faire ») : remis en casse de phrase."""
    if not t: return t
    if re.search(r'\b[A-Z]{2,}[a-z]+[A-Z]', t) or (t.isupper() and len(t) > 4):
        return t[:1].upper() + t[1:].lower()
    return t


def _split_lead(html):
    """Sépare le premier paragraphe (chapeau) du reste."""
    m = re.match(r'^<p(?: class="rich__lead")?>(.*?)</p>(.*)$', html, re.S)
    return (m.group(1), m.group(2)) if m else (None, html)


def render_sections(pairs, start_bg=0, first_lead=True):
    """Chaque section : bande avec titre à gauche (collant) et texte à droite. Fond alterné.
    Une section sans titre (introduction) met son chapeau à gauche."""
    bgs = ['band--paper2', 'band--paper']
    out = []
    k = 0
    for i, (hf, he, bf, be) in enumerate(pairs):
        if not bf.strip() and not hf: continue
        hf, he = fix_case(hf), fix_case(he)
        bg = bgs[(start_bg + k) % 2]; k += 1
        sid = f'sec-{i + 1}'
        if not hf:
            lf, rf = _split_lead(bf)
            le_, re_ = _split_lead(be) if be else (None, '')
            if lf:
                head = f'<div class="split__head"><p class="split__lead">{bi(lf, le_)}</p></div>'
                body = bi_div(rf, re_) if be else f'<div class="rich">{rf}</div>'
                out.append(f'<section class="band {bg}"><div class="wrap split">{head}{body}</div></section>')
                continue
        if first_lead and i == 0:
            bf = re.sub(r'^<p>', '<p class="rich__lead">', bf, count=1)
            be = re.sub(r'^<p>', '<p class="rich__lead">', be, count=1) if be else be
        hc = 'h2' if len(hf or '') <= 60 else 'h3'
        head = f'<div class="split__head"><h2 class="{hc}" id="{sid}" data-reveal>{bie(hf, he)}</h2></div>' if hf else '<div class="split__head"></div>'
        note = '<p class="note" lang="en">This section is only available in French.</p>' if hf else ''
        body = bi_div(bf, be) if be else f'<div class="rich">{bf}{note}</div>'
        lab = f' aria-labelledby="{sid}"' if hf else ''
        out.append(f'<section class="band {bg}"{lab}><div class="wrap split">{head}{body}</div></section>')
    return '\n'.join(out)


def statcard(r, code, label):
    """Carte chiffrée : combien de cabinets de l'annuaire proposent ce service."""
    cabs = [c for c in CABS if code in c['s']]
    n, tot = len(cabs), len(CABS)
    z = {k: sum(1 for c in cabs if c['reg'] == k) for k in ('fr', 'om', 'int')}
    pct = n / tot
    return f'''<aside class="statcard" aria-label="Couverture du service dans le réseau" data-en-aria-label="Service coverage across the network">
  <p class="statcard__k">{bi("Cabinets de l’annuaire qui proposent ce service", "Offices in the directory offering this service")}</p>
  <p class="statcard__n"><span data-count="{n}">{n}</span><small>/ {tot}</small></p>
  <div class="statcard__bar" role="img" aria-label="{round(pct * 100)} %"><span style="--v:{pct:.3f}"></span></div>
  <dl class="statcard__rows">
    <div><dt>{bi("France métropolitaine", "Mainland France")}</dt><dd>{z["fr"]}</dd></div>
    <div><dt>{bi("Outre-mer", "Overseas France")}</dt><dd>{z["om"]}</dd></div>
    <div><dt>International</dt><dd>{z["int"]}</dd></div>
  </dl>
  <a class="btn btn--primary" href="{r}cabinets.html" data-filter="{code}" data-transition><span class="btn__dot"></span>{bi("Voir ces cabinets", "See these offices")}</a>
</aside>'''


def service_page(s, idx):
    r = '../'
    out = f'services/{s["slug"]}.html'
    items = [('Accueil', 'Home', 'index.html'), ('Services', 'Services', 'services.html'), (s['fr'], s['en'], None)]
    fr = PAGES_FR.get(s['src'])
    en = PAGES_EN.get(s['src'])
    (sub_fr, sub_en), pairs = auto_sections(fr, en) if fr else ((None, None), [])
    media = statcard(r, s['code'], s['fr']) if s.get('code') else ''
    acts = btn(r + 'contact.html', 'Prendre rendez-vous', 'Book a meeting', extra=' data-magnetic')
    if s['exco'].startswith('https://exco.fr') is False:
        acts += btn(s['exco'], 'Site dédié', 'Dedicated site', ghost=True, ext=True)
    hero = ihero(r, items, (s['fr'], s['en']), sub=(sub_fr, sub_en) if sub_fr else None, lead=(s['dfr'], s['den']), icon=s['icon'], media=media, actions=acts)
    body = render_sections(pairs) if pairs else f'''<section class="band band--paper2"><div class="wrap prose">
      <p><span class="chip chip--todo">{bi("Contenu détaillé à reprendre de la page exco.fr", "Detailed content to be taken from the exco.fr page")}</span></p>
      <p><a class="link-arrow" href="{s["exco"]}" target="_blank" rel="noopener">{bi("Page actuelle sur exco.fr", "Current page on exco.fr")}</a></p></div></section>'''
    others = [x['slug'] for x in CAT['services'] if x['slug'] != s['slug']]
    k = idx % len(others)
    rel = (others[k:] + others[:k])[:4]
    related = f'''<section class="band band--paper" aria-labelledby="rel-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="rel-title" data-reveal>{bi("D’autres services du réseau", "More services from the network")}</h2><a class="link-arrow" href="{r}services.html" data-transition>{bi("Tous les services", "All services")}</a></div>
    {svc_cards(r, rel, svc_counts())}</div></section>'''
    main = '\n'.join([hero, body, related, cta_band(r, filt=s.get('code', ''))])
    ld = [{'@context': 'https://schema.org', '@type': 'Service', 'name': s['fr'], 'serviceType': s['fr'], 'description': s['dfr'], 'url': page_url(out),
           'provider': {'@type': 'Organization', 'name': 'Exco', 'url': SITE_URL + '/'}, 'areaServed': ['FR', 'Europe', 'Afrique']}, crumbs_ld(items, out)]
    pg = dict(r=r, out=out, type='service-generic', title=f'{s["fr"]} | Exco', title_en=f'{s["en"]} | Exco', desc=f'{s["fr"]} : {s["dfr"]}', ld=ld)
    return pg, main


def service_ec_page():
    """Page Expertise comptable : gabarit sur mesure de la v3 (bilan, calendrier, tableau de bord)."""
    from .partials import crumbs
    r = '../'
    out = 'services/expertise-comptable.html'
    items = [('Accueil', 'Home', 'index.html'), ('Services', 'Services', 'services.html'), ('Expertise comptable', 'Accounting', None)]
    frag = open(os.path.join(ROOT, 'src', 'pages', 'service-ec.html'), encoding='utf-8').read()
    frag = re.sub(r'</?main[^>]*>', '', frag).replace('{{crumbs}}', crumbs(r, items)).replace('{{r}}', r)
    s = CAT['services'][0]
    ld = [{'@context': 'https://schema.org', '@type': 'Service', 'name': 'Expertise comptable', 'serviceType': 'Expertise comptable', 'description': s['dfr'], 'url': page_url(out),
           'provider': {'@type': 'Organization', 'name': 'Exco', 'url': SITE_URL + '/'}}, crumbs_ld(items, out)]
    pg = dict(r=r, out=out, type='service', title='Expertise comptable | Exco', title_en='Accounting services | Exco',
              desc='Expertise comptable Exco : comptabilité et fiscalité, gestion, consolidation des comptes, dans 117 cabinets du réseau.', ld=ld)
    return pg, frag


def sector_page(x, idx):
    r = '../'
    out = f'secteurs/{x["slug"]}.html'
    items = [('Accueil', 'Home', 'index.html'), ('Secteurs', 'Sectors', 'secteurs.html'), (x['fr'], x['en'], None)]
    fr = PAGES_FR.get(x['src'])
    en = PAGES_EN.get(x['src'])
    (sub_fr, sub_en), pairs = auto_sections(fr, en) if fr else ((None, None), [])
    media = f'<img src="{r}assets/img/grok/{x["img"]}.webp" alt="" width="800" height="1000" fetchpriority="high" data-parallax="0.06">'
    chip = ''
    if x['slug'] == 'professions-liberales':
        chip = f'<span class="chip chip--todo">{bi("Texte à réécrire : la page actuelle décrit le secteur médico-social", "Copy to be rewritten: the current page describes the care sector")}</span>'
    hero = ihero(r, items, (x['fr'], x['en']), sub=(sub_fr, sub_en) if sub_fr else None, lead=(x['dfr'], x['den']), media=media, tall=True, chip=chip,
                 actions=btn(r + 'cabinets.html', 'Trouver un cabinet', 'Find an office', extra=' data-magnetic') + btn(r + 'contact.html', 'Prendre rendez-vous', 'Book a meeting', ghost=True))
    body = render_sections(pairs) if pairs else f'''<section class="band band--paper2"><div class="wrap prose">
      <p><span class="chip chip--todo">{bi("Contenu détaillé à reprendre de la page exco.fr", "Detailed content to be taken from the exco.fr page")}</span></p>
      <p><a class="link-arrow" href="{x["exco"]}" target="_blank" rel="noopener">{bi("Page actuelle sur exco.fr", "Current page on exco.fr")}</a></p></div></section>'''
    secs = CAT['sectors']
    others = [y for y in secs if y['slug'] != x['slug']]
    k = idx % len(others)
    rel = (others[k:] + others[:k])[:4]
    related = f'''<section class="band band--paper" aria-labelledby="rel-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="rel-title" data-reveal>{bi("D’autres secteurs", "Other sectors")}</h2><a class="link-arrow" href="{r}secteurs.html" data-transition>{bi("Tous les secteurs", "All sectors")}</a></div>
    <div class="sec-grid">{''.join(sector_card(r, y) for y in rel)}</div></div></section>'''
    core = ['expertise-comptable', 'audit', 'conseil', 'juridique-fiscal', 'social-paie-rh', 'evaluation-entreprise']
    svc = f'''<section class="band band--paper2" aria-labelledby="svc-title"><div class="wrap">
    <div class="sec-head"><h2 class="h2" id="svc-title" data-reveal>{bi("Les services les plus demandés", "The most requested services")}</h2><p class="lead">{bi("Les métiers proposés dans la majorité des cabinets du réseau.", "The services offered by most offices in the network.")}</p></div>
    {svc_cards(r, core, svc_counts())}</div></section>'''
    main = '\n'.join([hero, body, svc, related, cta_band(r)])
    ld = [crumbs_ld(items, out)]
    pg = dict(r=r, out=out, type='sector', title=f'{x["fr"]} : expert-comptable spécialisé | Exco', title_en=f'{x["en"]}: specialist accountants | Exco',
              desc=f'{x["fr"]} : {x["dfr"]}', ld=ld, og=f'assets/img/grok/{x["img"]}.webp')
    return pg, main


def metier_page(m, idx):
    r = '../'
    out = f'carrieres/{m["slug"]}.html'
    items = [('Accueil', 'Home', 'index.html'), ('Carrières', 'Careers', 'carrieres.html'), (m['fr'], m['en'], None)]
    fr = PAGES_FR.get(m['src'])
    en = PAGES_EN.get(m['src'])
    (sub_fr, sub_en), pairs = auto_sections(fr, en) if fr else ((None, None), [])
    base = 'assets/img/' + m['img']
    ws = [w for w in ('800', '1000', '1500', '1600') if exists(f'{base}-{w}.webp')]
    media = img_tag(r, base, ws, lazy=False, extra=' data-parallax="0.06"')
    hero = ihero(r, items, (m['fr'], m['en']), sub=(sub_fr, sub_en) if sub_fr else None, lead=(m['dfr'], m['den']), media=media,
                 actions=btn('https://exco.flatchr.io/fr/company/exco/', 'Voir les offres d’emploi', 'See job offers', ext=True, extra=' data-magnetic') + btn(r + 'carrieres.html', 'Tous les métiers', 'All careers', ghost=True))
    body = render_sections(pairs) if pairs else f'''<section class="band band--paper2"><div class="wrap prose">
      <p><span class="chip chip--todo">{bi("Contenu détaillé à reprendre de la page exco.fr", "Detailed content to be taken from the exco.fr page")}</span></p>
      <p><a class="link-arrow" href="{m["exco"]}" target="_blank" rel="noopener">{bi("Page actuelle sur exco.fr", "Current page on exco.fr")}</a></p></div></section>'''
    others = [y for y in CAT['metiers'] if y['slug'] != m['slug']]
    rel = f'''<section class="band band--paper" aria-labelledby="rel-title"><div class="wrap">
    <div class="sec-head"><h2 class="h2" id="rel-title" data-reveal>{bi("Les autres métiers", "Other careers")}</h2></div>
    <ul class="cards">{''.join(metier_card(r, y) for y in others)}</ul></div></section>'''
    jobs = f'''<section class="band band--night" aria-labelledby="jobs-title"><div class="wrap cta-band">
    <div class="prose"><h2 class="h2" id="jobs-title" data-reveal>{bi("Postulez chez Exco", "Apply to Exco")}</h2><p class="lead">{bi("Les offres de tous les cabinets du réseau sont publiées sur le site dédié au recrutement.", "Openings from every office in the network are published on the recruitment site.")}</p></div>
    <div class="cta-band__actions">{btn("https://exco.flatchr.io/fr/company/exco/", "Voir les offres", "See the offers", ext=True)}</div></div></section>'''
    main = '\n'.join([hero, body, rel, jobs])
    pg = dict(r=r, out=out, type='metier', title=f'{m["fr"]} : carrière chez Exco', title_en=f'{m["en"]}: careers at Exco', desc=f'{m["fr"]} chez Exco : {m["dfr"]}', ld=[crumbs_ld(items, out)])
    return pg, main


def metier_card(r, m):
    return f'<li><a class="card" href="{r}carrieres/{m["slug"]}.html" data-transition>{ico("users")}<span class="card__t">{bie(m["fr"], m["en"])}</span><span class="card__d">{bie(m["dfr"], m["den"])}</span></a></li>'


# ---------- actualités ----------
def art_img(r, a, sizes='(max-width: 900px) 92vw, 30vw'):
    img = a['img']
    if img.startswith('../'):
        base = 'assets/img/' + img[3:]
    else:
        base = 'assets/img/actus/' + img
    return f'<img src="{r}{base}-800.webp" alt="" loading="lazy" width="800" height="533">'


def art_card(r, a):
    cat = CATS.get(a['cat'], ('', ''))
    return (f'<li class="art" data-cat="{a["cat"]}"><a href="{r}actualites/{a["slug"]}.html" data-transition><span class="art__img">{art_img(r, a)}</span>'
            f'<span><span class="art__d" style="display:block">{date_bi(a["date"])} · {bi(*cat)}</span><span class="art__t" style="display:block">{esc(a["fr"]["title"])}</span></span></a></li>')


def article_page(a, actus):
    r = '../'
    out = f'actualites/{a["slug"]}.html'
    items = [('Accueil', 'Home', 'index.html'), ('Actualités', 'News', 'actualites.html'), (a['fr']['title'], None, None)]
    cat = CATS.get(a['cat'])
    body = a['fr']['body']
    toc = B.toc(body)
    html_fr = B.render(body, r, lead_first=True, ids=True)
    en = a.get('en')
    html_en = B.render(en['body'], r, lead_first=True, ids=True) if en else ''
    rich = bi_div(html_fr, html_en) if en else f'<div class="rich"><p class="note" lang="en">This article is only available in French.</p>{html_fr}</div>'
    toc_html = ''
    if len(toc) >= 2:
        links = ''.join(f'<a href="#{i}">{esc(t)}</a>' for i, t in toc)
        toc_html = f'<nav class="toc" aria-label="Sommaire" data-en-aria-label="Contents" data-toc>{links}</nav>'
    is_event = a['cat'] == 'event'
    when = date_bi(a['date'])
    meta = f'''<div class="article__meta"><span><b>{bi("Événement le" if is_event else "Publié le", "Event on" if is_event else "Published on")}</b> {when}</span><span><b>{bi("Rubrique", "Section")}</b> {bi(*cat)}</span><span><a href="{a["url"]}" target="_blank" rel="noopener">{bi("Article d’origine sur exco.fr", "Original article on exco.fr")}</a></span></div>'''
    share = f'<div class="share"><button type="button" data-share>{bi("Copier le lien", "Copy link")}</button><a href="https://www.linkedin.com/sharing/share-offsite/?url={page_url(out)}" target="_blank" rel="noopener">LinkedIn</a></div>'
    aside = f'<aside class="article__aside">{meta}{toc_html}{share}<a class="link-arrow" href="{r}actualites.html" data-transition>{bi("Toutes les actualités", "All news")}</a></aside>'
    cover_img = art_img(r, a).replace(' loading="lazy"', ' fetchpriority="high" data-parallax="0.06"')
    cover = f'<figure class="article__cover">{cover_img}</figure>'
    hero = f'''<section class="ihero ihero--plain" data-hero aria-labelledby="page-title">
  <div class="wrap ihero__grid"><div class="ihero__text">
    {crumbs_html(r, items)}
    <span class="chip chip--illus">{bi(*cat)} · {when}</span>
    <h1 class="h2" id="page-title" data-reveal style="max-width:24ch">{esc(a["fr"]["title"])}</h1>
  </div></div>
  <div class="wrap" style="margin-top:clamp(28px,4vw,48px)">{cover}</div>
</section>'''
    content = f'<section class="band band--paper" style="padding-top:clamp(40px,5vw,72px)"><div class="wrap article">{rich}{aside}</div></section>'
    others = [x for x in actus if x['slug'] != a['slug']][:3]
    rel = f'''<section class="band band--paper2" aria-labelledby="rel-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="rel-title" data-reveal>{bi("À lire aussi", "Read next")}</h2><a class="link-arrow" href="{r}actualites.html" data-transition>{bi("Toutes les actualités", "All news")}</a></div>
    <ul class="articles articles--3">{"".join(art_card(r, x) for x in others)}</ul></div></section>'''
    main = '\n'.join([hero, content, rel, cta_band(r)])
    ld_t = 'Event' if is_event else 'NewsArticle'
    ld = {'@context': 'https://schema.org', '@type': ld_t, 'headline' if not is_event else 'name': a['fr']['title'], 'url': page_url(out),
          'image': f'{SITE_URL}/assets/img/' + (a['img'][3:] if a['img'].startswith('../') else 'actus/' + a['img']) + '-800.webp',
          'publisher' if not is_event else 'organizer': {'@type': 'Organization', 'name': 'Exco', 'url': SITE_URL + '/'}}
    if is_event:
        ld.update({'startDate': '2026-11-19T18:30:00+01:00', 'eventAttendanceMode': 'https://schema.org/OfflineEventAttendanceMode',
                   'location': {'@type': 'Place', 'name': 'Bio’Pôle', 'address': {'@type': 'PostalAddress', 'addressLocality': 'Périgny', 'addressCountry': 'FR'}}})
    else:
        ld['datePublished'] = a['date']
    pg = dict(r=r, out=out, type='article', title=a['fr']['title'] + ' | Exco', title_en=a['fr']['title'] + ' | Exco',
              desc=(next((b['t'] for b in body if b['k'] == 'p'), '')[:155]), ld=[ld, crumbs_ld(items, out)], og_type='article',
              og=('assets/img/' + (a['img'][3:] if a['img'].startswith('../') else 'actus/' + a['img']) + '-800.webp'))
    return pg, main


def crumbs_html(r, items):
    from .partials import crumbs
    return crumbs(r, items)


def news_index(actus):
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Actualités', 'News', None)]
    hero = ihero(r, items, ('Actualités et événements', 'News and events'),
                 lead=('La vie du réseau, des groupes et des cabinets : rencontres, partenariats, décryptages juridiques et agricoles.', 'Life across the network, groups and offices: meetings, partnerships, legal and farming insights.'), plain=True)
    cats = [('all', 'Tout', 'All')] + [(k, *v) for k, v in CATS.items() if any(a['cat'] == k for a in actus)]
    filt = ''.join(f'<button type="button" aria-pressed="{"true" if k == "all" else "false"}" data-cat-filter="{k}">{bi(fr, en)}</button>' for k, fr, en in cats)
    grid = f'''<section class="band band--paper news" aria-labelledby="news-title" data-news>
  <div class="wrap">
    <div class="news__grid">
      <div class="events" data-events>
        <h2 class="h4" id="ev-title">{bi("Événements", "Events")}</h2>
        <ol class="events__list" data-events-list></ol>
      </div>
      <div>
        <h2 class="sr" id="news-title">{bi("Articles", "Articles")}</h2>
        <div class="filters" role="group" aria-label="Rubriques" data-en-aria-label="Sections" data-cat-filters>{filt}</div>
        <ul class="articles articles--all" data-articles data-static>{"".join(art_card(r, a) for a in actus)}</ul>
        <p class="note" style="margin-top:24px">{bi("Les articles plus anciens restent consultables sur exco.fr.", "Older articles remain available on exco.fr.")} <a href="https://exco.fr/les-articles-rediges-par-nos-experts/" target="_blank" rel="noopener">{bi("Archives", "Archive")}</a></p>
      </div>
    </div>
  </div>
</section>'''
    main = hero + '\n' + grid + '\n' + cta_band(r)
    pg = dict(r=r, out='actualites.html', type='news', title='Actualités et événements du réseau Exco', title_en='Exco network news and events',
              desc='Actualités, événements et décryptages du réseau Exco et de ses cabinets.', ld=[crumbs_ld(items, 'actualites.html')])
    return pg, main
