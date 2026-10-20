"""Pages de l'annuaire : liste des cabinets, fiche de chaque cabinet, page de chaque groupe membre."""
import os, json, re, unicodedata
from urllib.parse import quote
from .common import bi, bie, esc, attr, ico, page_url, SITE_URL, DEPTS, dept_of, initials, load, ROOT, slugify, ICONS, ckey
from .viz_map import map_group
from . import viz as V
from .partials import crumbs_ld, CAT
from .ui import ihero, fact, btn, cta_band, exists, img_tag, cards_cls
from . import blocks as B

CABS = json.load(open(os.path.join(ROOT, 'assets', 'data', 'cabinets.json'), encoding='utf-8'))
CITY_FIX = {'Montbeliard': 'Montbéliard'}
for c in CABS:
    c['c'] = CITY_FIX.get(c['c'], c['c'])
CAB_FR = load('cabinets_fr.json') or {}
CAB_EN = load('cabinets_en.json') or {}
GROUPS = {g['g']: g for g in CAT['groups']}
SVC_BY_CODE = {s['code']: s for s in CAT['services'] if s.get('code')}
SVC_BY_SLUG = {s['slug']: s for s in CAT['services']}
DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
OM = {'GP': ('Guadeloupe', 'Guadeloupe'), 'MQ': ('Martinique', 'Martinique'), 'RE': ('La Réunion', 'Réunion'), 'PF': ('Polynésie française', 'French Polynesia')}


def hhmm(m):
    return f'{m // 60:02d}:{m % 60:02d}'


def has_hours(c):
    return any(c.get('h') or [])


def cab_photo(c):
    for w in ('960', '1600'):
        if exists(f'assets/img/cabinets/{c["id"]}-{w}.webp'):
            return True
    return False


def group_of(c):
    return GROUPS.get(c['g'])


def maps_url(c):
    return 'https://www.google.com/maps/search/?api=1&query=' + quote(f'{c["n"]} {c["a"]}')


def street_parts(c):
    a = c['a']
    m = re.match(r'^(.*?),?\s*(\d{5})\s+([^,]+)', a)
    if m:
        return m.group(1).strip(' ,'), m.group(2), m.group(3).strip()
    parts = [p.strip() for p in a.split(',')]
    return (parts[0] if len(parts) > 1 else a), c.get('pc', ''), c['c']


def ld_cabinet(c, fr):
    street, pc, city = street_parts(c)
    hours = []
    for d, rs in enumerate(c.get('h') or []):
        for q in rs or []:
            hours.append({'@type': 'OpeningHoursSpecification', 'dayOfWeek': DAYS[d], 'opens': hhmm(q[0]), 'closes': hhmm(q[1])})
    o = {'@context': 'https://schema.org', '@type': 'AccountingService', 'name': c['n'], 'url': page_url(f'cabinets/{c["id"]}.html'),
         'telephone': c.get('t') or None,
         'address': {'@type': 'PostalAddress', 'streetAddress': street, 'postalCode': pc or None, 'addressLocality': city, 'addressCountry': c['cc']},
         'geo': {'@type': 'GeoCoordinates', 'latitude': c['lat'], 'longitude': c['lon']},
         'parentOrganization': {'@type': 'Organization', 'name': 'Exco', 'url': SITE_URL + '/'}}
    if cab_photo(c):
        o['image'] = f'{SITE_URL}/assets/img/cabinets/{c["id"]}-960.webp'
    if hours:
        o['openingHoursSpecification'] = hours
    if fr.get('tagline'):
        o['description'] = fr['tagline']
    o['address'] = {k: v for k, v in o['address'].items() if v}
    return {k: v for k, v in o.items() if v}


def _idcard(c):
    """Fiche d'identité du lieu, à la place d'une photo du cabinet."""
    reg = {'fr': bi('France', 'France'), 'om': bi('Outre-mer', 'Overseas France'), 'int': bi('International', 'International')}[c['reg']]
    country = bie(c['co'][0], c['co'][1] if len(c['co']) > 1 else None)
    dep = dept_of(c) if c['reg'] == 'fr' else ''
    dep_row = f'<div><dt>{bi("Département", "Département")}</dt><dd>{esc(DEPTS.get(dep, ""))} ({dep})</dd></div>' if dep in DEPTS else ''
    lat = f'{abs(c["lat"]):.4f}° {"N" if c["lat"] >= 0 else "S"}'
    lon = f'{abs(c["lon"]):.4f}° {"E" if c["lon"] >= 0 else "O"}'
    return f'''<aside class="idcard" aria-label="Fiche du lieu" data-en-aria-label="Location card">
  <div class="idcard__map" data-idmap data-x="{c['x']}" data-y="{c['y']}" data-reg="{c['reg']}"></div>
  <div class="idcard__top"><span>{reg}</span><span>{lat} · {lon}</span></div>
  <p class="idcard__city">{esc(c['c'])}<span class="idcard__country">{country}</span></p>
  <dl class="idcard__rows">
    {dep_row}<div><dt>{bi("Heure locale", "Local time")}</dt><dd><span class="idcard__clock" data-clock>--:--</span></dd></div>
    <div><dt>{bi("Statut", "Status")}</dt><dd><span class="badge-live" data-live-status>{bi("Horaires", "Opening hours")}</span></dd></div>
  </dl>
  <span class="chip chip--illus review" style="width:fit-content">{bi("Photo du cabinet à compléter", "Office photo to be added")}</span>
</aside>'''


def _media(c):
    if not cab_photo(c):
        return _idcard(c)
    big = '1600' if exists(f'assets/img/cabinets/{c["id"]}-1600.webp') else '960'
    srcset = f'../assets/img/cabinets/{c["id"]}-480.webp 480w, ../assets/img/cabinets/{c["id"]}-{big}.webp {big}w'
    return f'''<div class="cab-hero__media"><img src="../assets/img/cabinets/{c['id']}-{big}.webp" srcset="{srcset}" sizes="(max-width: 900px) 92vw, 44vw" alt="Le cabinet {attr(c['n'])}, {attr(c['c'])}" data-en-alt="The {attr(c['n'])} office, {attr(c['c'])}" width="1000" height="1094" fetchpriority="high" data-parallax="0.08">
      <div class="cab-hero__status"><span class="badge-live" data-live-status>{bi("Horaires", "Opening hours")}</span></div></div>'''


def _about(fr, en):
    def about_html(d):
        bl = list(d.get('about', []))
        # le premier bloc reprend souvent l'accroche : on l'affiche en chapeau
        return B.render([{'k': 'p' if b['k'] in ('div',) else b['k'], 't': b['t']} for b in bl], lead_first=True, demote=1)
    a_fr = about_html(fr)
    a_en = about_html(en) if en else ''
    if not a_fr:
        return ''
    if a_en:
        body = f'<div class="rich" lang="fr">{a_fr}</div><div class="rich" lang="en">{a_en}</div>'
    else:
        body = f'<div class="rich">{a_fr}<p class="note" lang="en">Office description in French.</p></div>'
    return body


def _pluses(fr, en):
    pl = fr.get('pluses') or []
    if not pl:
        return ''
    pe = (en or {}).get('pluses') or []
    items = []
    for i, p in enumerate(pl):
        e = pe[i] if i < len(pe) else None
        t = bie(p['t'], e['t'] if e else None) if p['t'] else ''
        d = bie(p['d'], e['d'] if e else None)
        h = f'<h3 class="h4">{t}</h3>' if t else ''
        items.append(f'<li><div>{h}<p>{d}</p></div></li>')
    return '<ul class="pluses" data-pluses>' + ''.join(items) + '</ul>'


def _figures(fr, en):
    figs = fr.get('figures') or []
    if not figs:
        return ''
    fe = (en or {}).get('figures') or []
    t_en = (en or {}).get('figures_title') or None
    cells = []
    for i, f in enumerate(figs):
        n = f['n'].replace(' ', '')
        m = re.match(r'^([+]?)(\d+)$', n)
        e = fe[i]['l'] if i < len(fe) else None
        if m:
            pre = m.group(1)
            dp = f' data-prefix="{pre}"' if pre else ''
            num = f'<p class="fig__n" data-count="{m.group(2)}"{dp}>{esc(f["n"])}</p>'
        else:
            num = f'<p class="fig__n">{esc(f["n"])}</p>'
        cells.append(f'<div class="fig">{num}<p class="fig__l">{bie(f["l"], e)}</p></div>')
    title = fr.get('figures_title') or 'Les chiffres du groupe'
    return f'''<section class="group-figs band band--night" aria-labelledby="cab-group">
  <div class="wrap">
    <h2 class="h3" id="cab-group" style="margin-bottom:40px;color:var(--on-night-soft)">{bie(title, t_en)}</h2>
    <div class="figures__grid">{''.join(cells)}</div>
  </div>
</section>'''


def _hours(c):
    if not has_hours(c):
        return f'''<section class="band band--paper" aria-labelledby="cab-hours">
  <div class="wrap prose">
    <h2 class="h2" id="cab-hours" data-reveal>{bi("Horaires d’ouverture", "Opening hours")}</h2>
    <p><span class="chip chip--todo">{bi("Horaires à compléter : non publiés sur la fiche actuelle", "Opening hours to be added: not published on the current page")}</span></p>
  </div>
</section>'''
    tz = c.get('tz', 'Europe/Paris')
    city_tz = {'Europe/Paris': ('Heure de Paris', 'Paris time')}.get(tz, ('Heure locale du cabinet', 'Office local time'))
    return f'''<section class="band band--paper" aria-labelledby="cab-hours">
  <div class="wrap dial-wrap">
    <svg class="dial" data-dial viewBox="0 0 300 300" role="img" aria-label="Cadran des horaires d’ouverture de la semaine" data-en-aria-label="Weekly opening hours dial"></svg>
    <div style="display:grid;gap:20px">
      <h2 class="h2" id="cab-hours" data-reveal>{bi("Horaires d’ouverture", "Opening hours")}</h2>
      <p class="lead" data-live-text></p>
      <ul class="hours" data-hours></ul>
      <p class="cab__meta" style="color:var(--ink-soft)">{bi(city_tz[0] + ".", city_tz[1] + ".")}<span class="dial__note">{bi(" Le cadran fait le tour des 24 heures : chaque cercle est un jour, du lundi au centre au dimanche à l’extérieur, et l’aiguille indique l’heure actuelle.", " The dial covers 24 hours: each circle is a day, Monday in the centre to Sunday outside, and the hand shows the current time.")}</span></p>
    </div>
  </div>
</section>'''


def _services(c, fr, en, r):
    svcs = fr.get('services') or []
    se = (en or {}).get('services') or []
    items = []
    if svcs:
        for i, s in enumerate(svcs):
            e = se[i] if i < len(se) else None
            SVC_CASE = {'Exco gestion privée': 'Exco Gestion Privée', 'Exco finance et transactions': 'Exco Finance et Transactions', 'Exco Finance et transactions': 'Exco Finance et Transactions'}
            t = bie(SVC_CASE.get(s['t'], s['t']), e['t'] if e else None)
            if s.get('slug'):
                t = f'<a href="{r}services/{s["slug"]}.html" data-transition>{t}</a>'
            d = bie(s['d'], e['d'] if e else None) if s.get('d') else ''
            items.append(f'<li><h3>{t}</h3>{f"<p>{d}</p>" if d else ""}</li>')
    else:
        for k in c.get('s', []):
            s = SVC_BY_CODE.get(k)
            if not s: continue
            items.append(f'<li><h3><a href="{r}services/{s["slug"]}.html" data-transition>{bie(s["fr"], s["en"])}</a></h3><p>{bie(s["dfr"], s["den"])}</p></li>')
    if not items:
        return f'''<section class="band band--paper2 band--slim" aria-labelledby="cab-svc">
  <div class="wrap"><div class="prose">
    <h2 class="h3" id="cab-svc">{bi("Les services du cabinet", "The office’s services")}</h2>
    <p><span class="chip chip--illus review">{bi("Liste des services à compléter : absente de la fiche actuelle", "List of services to be added: missing from the current page")}</span></p>
    <p><a class="link-arrow" href="{r}services.html" data-transition>{bi("Voir les services du réseau", "See the network’s services")}</a></p>
  </div></div>
</section>'''
    lead = fr.get('svc_intro') or ''
    lead_en = (en or {}).get('svc_intro') or None
    return f'''<section class="band band--night" aria-labelledby="cab-svc">
  <div class="wrap">
    <div class="sec-head">
      <h2 class="h2" id="cab-svc" data-reveal>{bi("Les services du cabinet", "The office’s services")}</h2>
      {f'<p class="lead">{bie(lead, lead_en)}</p>' if lead else ''}
    </div>
    <ul class="svc-list svc-list--c{ {1: 2, 2: 2, 3: 3, 4: 4, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3, 10: 5, 11: 4, 12: 4}.get(len(items), 3) }">{''.join(items)}</ul>
  </div>
</section>'''


ROLE_EN = {
    'Expert-comptable': 'Chartered accountant', 'Expert-comptable et commissaire aux comptes': 'Chartered accountant and statutory auditor',
    'Associé, commissaire aux comptes et expert-comptable': 'Partner, statutory auditor and chartered accountant', 'Expert-comptable et associé': 'Chartered accountant and partner',
    'Associée et expert-comptable': 'Partner and chartered accountant', 'Associé et expert-comptable': 'Partner and chartered accountant',
    'Commissaire aux comptes et expert-comptable': 'Statutory auditor and chartered accountant', 'Associé': 'Partner', 'Associée, pôle social': 'Partner, payroll and HR',
    'Commissaire aux comptes, expert-comptable et expert judiciaire': 'Statutory auditor, chartered accountant and court-appointed expert',
    'Associée, direction RH et finances': 'Partner, HR and finance', 'Commissaire aux comptes, responsable du département audit': 'Statutory auditor, head of audit',
    'Juriste en droit social': 'Employment lawyer', 'Associée, directrice du développement et de l’innovation': 'Partner, head of development and innovation',
    'Expert-comptable mémorialiste': 'Chartered accountancy candidate (dissertation stage)', 'Auditeur en systèmes d’information': 'IT systems auditor',
    'Associée et commissaire aux comptes': 'Partner and statutory auditor', 'Expert-comptable, responsable du département expertise comptable': 'Chartered accountant, head of accounting',
    'Expert-comptable et commissaire aux comptes, responsable du département consulting': 'Chartered accountant and statutory auditor, head of consulting',
    'Responsable du département IT': 'Head of IT', 'Consultante agricole': 'Agricultural consultant', 'Consultant en création et développement d’entreprises': 'Business creation and development consultant',
    'Diplômée d’expertise comptable': 'Qualified in chartered accountancy', 'Commissaire aux comptes': 'Statutory auditor', 'Directeur associé': 'Managing partner',
    'Chef de mission': 'Engagement manager', 'Directeur de bureau': 'Office director',
}


def _team(fr, en, r, c):
    team = fr.get('team') or []
    if not team:
        return ''
    te = {m['name']: m for m in ((en or {}).get('team') or [])}
    faces = []
    for m in team:
        role = m.get('role', '')
        role_en = ROLE_EN.get(role)
        pic = face_img(r, m.get('photo') or pslug(m['name']))
        if not pic:
            pic = f'<span class="face__mono" aria-hidden="true">{esc(initials(m["name"]))}</span>'
        rl = f'<p class="face__r">{bie(role, role_en)}</p>' if role else ''
        faces.append(f'<li class="face">{pic}<p class="face__n">{esc(m["name"])}</p>{rl}</li>')
    lead = fr.get('team_intro') or ''
    lead_en = (en or {}).get('team_intro') or None
    small = len(faces) <= 2
    return f'''<section class="band band--paper" aria-labelledby="cab-team">
  <div class="wrap{' split' if small else ''}">
    <div class="{'split__head' if small else 'sec-head'}">
      <h2 class="h2" id="cab-team" data-reveal>{bi("L’équipe", "The team")}</h2>
      {f'<p class="lead">{bie(lead, lead_en)}</p>' if lead else ''}
    </div>
    <ul class="team{' team--few split__body' if small else ''}">{''.join(faces)}</ul>
  </div>
</section>'''


def _access(c, r):
    street, pc, city = street_parts(c)
    addr = esc(c['a'].replace(', France', ''))
    m = f'<div class="access__map"><svg data-access-map role="img" aria-label="Plan de situation de {attr(c["n"])} et des cabinets voisins" data-en-aria-label="Location of {attr(c["n"])} and nearby offices"></svg></div>' if c['reg'] == 'fr' else ''
    cls = 'access' if m else 'access access--nomap'
    if not m:
        return f'''<section class="band band--paper2" aria-labelledby="cab-access">
  <div class="wrap split access--split">
    <div class="split__head prose">
      <h2 class="h2" id="cab-access" data-reveal>{bi("Venir au cabinet", "Getting here")}</h2>
      <p class="lead" style="color:var(--ink)">{addr}</p>
      <p><span class="chip chip--todo">{bi("Accès, stationnement et transports en commun : à compléter", "Access, parking and public transport: to be added")}</span></p>
      <a class="link-arrow" href="{maps_url(c)}" target="_blank" rel="noopener">{bi("Ouvrir dans Google Maps", "Open in Google Maps")}</a>
    </div>
    <div class="split__body">
      <h3 class="h4" style="margin-bottom:14px">{bi("Cabinets les plus proches", "Nearest offices")}</h3>
      <div class="nearby" data-nearby></div>
    </div>
  </div>
</section>'''
    return f'''<section class="band band--paper2" aria-labelledby="cab-access">
  <div class="wrap {cls}">
    {m}
    <div class="prose">
      <h2 class="h2" id="cab-access" data-reveal>{bi("Venir au cabinet", "Getting here")}</h2>
      <p class="lead" style="color:var(--ink)">{addr}</p>
      <p><span class="chip chip--todo">{bi("Accès, stationnement et transports en commun : à compléter", "Access, parking and public transport: to be added")}</span></p>
      <a class="link-arrow" href="{maps_url(c)}" target="_blank" rel="noopener">{bi("Ouvrir dans Google Maps", "Open in Google Maps")}</a>
      <h3 class="h4" style="margin-top:20px">{bi("Cabinets les plus proches", "Nearest offices")}</h3>
      <div class="nearby" data-nearby></div>
    </div>
  </div>
</section>'''


def _contact(c, r):
    tel = c.get('t') or ''
    tel_html = f'<p><span class="copy" data-copy="{attr(tel)}">{esc(tel)}</span></p>' if tel else ''
    return f'''<section class="band band--night" id="contact" aria-labelledby="cab-contact">
  <div class="wrap two-col">
    <div class="prose">
      <h2 class="h2" id="cab-contact" data-reveal>{bi("Contactez " + esc(c["n"]), "Contact " + esc(c["n"]))}</h2>
      <p class="lead">{bi("Une question, un projet ? L’équipe vous répond.", "A question or a project? The team will get back to you.")}</p>
      {tel_html}
      <p>{bi("Déjà client ?", "Already a client?")} <a href="https://exco.fr/accedez-a-votre-compte-client/" target="_blank" rel="noopener">{bi("Accéder à votre espace client", "Go to your client area")}</a></p>
      <p><a href="{r}contact.html#{c['id']}" data-transition>{bi("Demande de rendez-vous détaillée", "Detailed meeting request")}</a></p>
    </div>
    <form class="steps" data-contact novalidate style="color:var(--ink)">
      <div class="fields">
        <label class="field">{bi("Nom", "Name")}<input name="nom" type="text" autocomplete="name" required></label>
        <label class="field field--half">{bi("E-mail", "Email")}<input name="email" type="email" autocomplete="email" required></label>
        <label class="field field--half">{bi("Téléphone", "Phone")}<input name="tel" type="tel" autocomplete="tel"></label>
        <label class="field">{bi("Votre message", "Your message")}<textarea name="message" rows="4" required></textarea></label>
      </div>
      <p class="rgpd">{RGPD}</p>
      <p class="step__err" data-c-err hidden>{bi("Indiquez votre nom, une adresse e-mail valide et votre message.", "Enter your name, a valid email address and your message.")}</p>
      <p class="chip chip--illus" data-c-ok hidden>{bi("Message prêt. Maquette : aucune donnée n’est envoyée.", "Message ready. Mock-up: no data is sent.")}</p>
      <div class="steps__ctrl"><button class="btn btn--primary" type="submit" data-magnetic><span class="btn__dot"></span>{bi("Envoyer le message", "Send message")}</button></div>
    </form>
  </div>
</section>'''


PRIV = '<a href="https://exco.fr/politique-de-confidentialite/" target="_blank" rel="noopener">'
RGPD = bi(f'Les informations recueillies sont enregistrées par Exco pour la gestion de votre demande. Voir la {PRIV}politique de confidentialité</a>.',
          f'The information collected is stored by Exco to handle your request. See the {PRIV}privacy policy</a> (in French).')


def cabinet_page(c, actus):
    r = '../'
    fr = CAB_FR.get(c['id'], {})
    en = CAB_EN.get(c['id'])
    g = group_of(c)
    out = f'cabinets/{c["id"]}.html'
    items = [('Accueil', 'Home', 'index.html'), ('Cabinets', 'Offices', 'cabinets.html')]
    if g:
        items.append((g['name'], None, f'groupes/{g["slug"]}.html'))
    items.append((c['n'], None, None))
    chip = ''
    if g:
        chip = f'<a class="chip chip--illus" href="{r}groupes/{g["slug"]}.html" data-transition style="text-decoration:none">{bi("Un cabinet du groupe " + esc(g["name"]), "An office of the " + esc(g["name"]) + " group")}</a>'
    tag_fr = fr.get('tagline') or fr.get('sub') or ''
    tag_en = (en or {}).get('tagline') or (en or {}).get('sub') or None
    tel = c.get('t') or ''
    facts_html = f'''<div class="cab-facts"><span class="copy" data-copy="{attr(c['a'])}">{esc(c['a'].replace(', France', ''))}</span>{f'<span class="copy" data-copy="{attr(tel)}">{esc(tel)}</span>' if tel else ''}</div>'''
    actions = (f'<a class="btn btn--primary" href="{r}contact.html#{c["id"]}" data-transition data-magnetic><span class="btn__dot"></span>{bi("Prendre rendez-vous", "Book a meeting")}</a>'
               f'<a class="btn btn--ghost" href="{maps_url(c)}" target="_blank" rel="noopener">{bi("Itinéraire", "Directions")}</a>')
    hero = f'''<section class="page-hero band--paper" data-hero aria-labelledby="cab-title">
  <div class="wrap">
    {crumbs_html(r, items)}
    <div class="cab-hero">
      <div class="cab-hero__text">
        {chip}
        <h1 class="display" id="cab-title" data-reveal>{esc(c['n'])}</h1>
        {f'<p class="lead">{bie(tag_fr, tag_en)}</p>' if tag_fr else ''}
        {facts_html}
        <div class="cab-actions">{actions}</div>
      </div>
      {_media(c)}
    </div>
  </div>
</section>'''
    about = _about(fr, en)
    pl = _pluses(fr, en)
    about_sec = ''
    # v13 : le cabinet dans son groupe, sur une carte (annuaire)
    gmap = map_group(c['g'], g['name'] if g else None, focus=c['id']) if c.get('g') else ''
    if about and not pl:
        about_sec = f'''<section class="band band--paper2" aria-labelledby="cab-about">
  <div class="wrap split">
    <div class="split__head"><h2 class="h2" id="cab-about" data-reveal>{bi("Le cabinet", "The office")}</h2>{gmap}</div>
    <div class="split__body prose" style="max-width:none"><div class="more" data-more>{about}</div></div>
  </div>
</section>'''
    elif about or pl:
        about_sec = f'''<section class="band band--paper2" aria-labelledby="cab-about">
  <div class="wrap two-col">
    <div class="prose" style="max-width:none">
      <h2 class="h2" id="cab-about" data-reveal>{bi("Le cabinet", "The office")}</h2>
      <div class="more" data-more>{about}</div>
    </div>
    <div class="about__side">{pl or ''}{gmap}</div>
  </div>
</section>'''
    news = ''
    if g and g['slug'] == 'exco-fiduciaire-du-sud-ouest':
        arts = [a for a in actus if a['cat'] in ('fso', 'agri')][:3]
        news = f'''<section class="band band--paper" aria-labelledby="cab-news">
  <div class="wrap">
    <div class="sec-head sec-head--row">
      <h2 class="h2" id="cab-news" data-reveal>{bi("L’actualité du groupe", "Group news")}</h2>
      <a class="link-arrow" href="{r}actualites.html" data-transition>{bi("Toutes les actualités", "All news")}</a>
    </div>
    <ul class="articles articles--3">{''.join(art_card(r, a) for a in arts)}</ul>
  </div>
</section>'''
    # barre d'actions fixe sur téléphone : appeler, itinéraire, rendez-vous
    tel_href = re.sub(r'[^\d+]', '', tel)
    bar = ('<nav class="cab-bar" aria-label="' + attr('Actions rapides') + '" data-en-aria-label="Quick actions">'
           + (f'<a href="tel:{tel_href}">{ico("phone", "ico") if "phone" in ICONS else ""}{bi("Appeler", "Call")}</a>' if tel_href else '')
           + f'<a href="{maps_url(c)}" target="_blank" rel="noopener">{bi("Itinéraire", "Directions")}</a>'
           + f'<a class="cab-bar__main" href="{r}contact.html#{c["id"]}" data-transition><span class="btn__dot"></span>{bi("Rendez-vous", "Book")}</a></nav>')
    main = '\n'.join(x for x in [hero, about_sec, _figures(fr, en), _hours(c), _services(c, fr, en, r), _team(fr, en, r, c), _access(c, r), news, _contact(c, r), bar] if x)
    desc_fr = f'{c["n"]}, cabinet d’expertise comptable, d’audit et de conseil à {c["c"]}. Horaires, services, équipe, accès et contact.'
    ld = [ld_cabinet(c, fr), crumbs_ld(items, out)]
    _nm = re.sub(r'[^a-z]', '', slugify(c['n'])); _ct = re.sub(r'[^a-z]', '', slugify(c['c']))
    if _ct and _ct in _nm:
        t_fr, t_en = f'{c["n"]} : cabinet d’expertise comptable', f'{c["n"]}: accounting firm'
    else:
        t_fr, t_en = f'{c["n"]}, expert-comptable à {c["c"]}', f'{c["n"]}, accountants in {c["c"]}'
    pg = dict(r=r, out=out, type='cabinet', title=t_fr, title_en=t_en,
              desc=desc_fr, ld=ld, data={'cabinet': c['id'], 'head-city': g['city'] if g else ''}, og=f'assets/img/cabinets/{c["id"]}-960.webp' if cab_photo(c) else None)
    return pg, main


def crumbs_html(r, items):
    from .partials import crumbs
    return crumbs(r, items)


def art_card(r, a):
    from .pages_content import art_card as ac
    return ac(r, a)


# ---------- liste des cabinets ----------
def dir_item(r, c):
    return (f'<li><a href="{r}cabinets/{c["id"]}.html" data-transition data-cab="{c["id"]}"><span class="dir__n">{esc(c["n"])}</span>'
            f'<span class="dir__c">{esc(c["c"])}</span><span class="dir__s status" data-dir-status></span></a></li>')


def directory(r, cabs=None):
    cabs = cabs or CABS
    fr = [c for c in cabs if c['reg'] == 'fr']
    om = [c for c in cabs if c['reg'] == 'om']
    it = [c for c in cabs if c['reg'] == 'int']
    by = {}
    for c in fr:
        by.setdefault(dept_of(c), []).append(c)
    def dsort(k):
        return k.replace('2A', '20.1').replace('2B', '20.2')
    groups_fr = ''.join(f'<div class="dir__group"><h3><b>{k}</b>{esc(DEPTS.get(k, ""))}</h3><ul>{"".join(dir_item(r, c) for c in sorted(v, key=lambda x: ckey(x["n"])))}</ul></div>'
                        for k, v in sorted(by.items(), key=lambda kv: dsort(kv[0])))
    byom = {}
    for c in om:
        byom.setdefault(c['cc'], []).append(c)
    groups_om = ''.join(f'<div class="dir__group"><h3>{bi(*OM.get(k, (k, k)))}</h3><ul>{"".join(dir_item(r, c) for c in sorted(v, key=lambda x: ckey(x["n"])))}</ul></div>' for k, v in sorted(byom.items(), key=lambda kv: ckey(OM.get(kv[0], (kv[0],))[0])))
    byc = {}
    for c in it:
        byc.setdefault(c['co'][0], []).append(c)
    groups_int = ''.join(f'<div class="dir__group"><h3>{bie(k, v[0]["co"][1] if len(v[0]["co"]) > 1 else None)}</h3><ul>{"".join(dir_item(r, c) for c in sorted(v, key=lambda x: ckey(x["n"])))}</ul></div>' for k, v in sorted(byc.items(), key=lambda kv: ckey(kv[0])))
    def zone(zid, t, n, inner):
        if not n: return ''
        return f'''<section class="dir__zone" id="{zid}" aria-labelledby="{zid}-t">
      <div class="dir__head"><h2 class="h3" id="{zid}-t">{t}</h2><p class="dir__count">{bi(f"{n} cabinet" + ("s" if n > 1 else ""), f"{n} office" + ("s" if n > 1 else ""))}</p></div>
      <div class="dir__cols">{inner}</div>
    </section>'''
    return f'''<div class="dir" data-dir>
    {zone('france', bi('France métropolitaine', 'Mainland France'), len(fr), groups_fr)}
    {zone('outre-mer', bi('Outre-mer', 'Overseas France'), len(om), groups_om)}
    {zone('international', 'International', len(it), groups_int)}
  </div>'''


def finder_section(home=False):
    """Bloc « Trouver mon cabinet » (carte + recherche), repris de l'accueil."""
    src = open(os.path.join(ROOT, 'src', 'pages', 'parts', 'finder.html'), encoding='utf-8').read()
    return src


def liveboard():
    """Tableau des heures locales : rempli en direct par le script (cabinets ouverts par heure locale)."""
    return (f'<aside class="liveboard" data-liveboard aria-label="{attr("Heures locales des cabinets")}" data-en-aria-label="Offices’ local times">'
            f'<p class="lb__h"><span class="lb__dot" aria-hidden="true"></span>{bi("En ce moment dans le réseau", "Right now across the network")}</p>'
            f'<p class="lb__cols" aria-hidden="true"><span>{bi("Heure locale", "Local time")}</span><span>{bi("Où", "Where")}</span><span>{bi("Ouverts", "Open")}</span></p>'
            f'<ol class="lb__rows" data-liveboard-rows aria-live="off"></ol>'
            f'<p class="lb__note">{bi("Heure de chaque cabinet et horaires de l’annuaire, mis à jour chaque minute.", "Each office’s local time and directory opening hours, updated every minute.")}</p></aside>')


def cabinets_index(actus):
    r = ''
    fr = sum(1 for c in CABS if c['reg'] == 'fr'); om = sum(1 for c in CABS if c['reg'] == 'om'); it = sum(1 for c in CABS if c['reg'] == 'int')
    countries = len({c['cc'] for c in CABS if c['reg'] == 'int'})
    items = [('Accueil', 'Home', 'index.html'), ('Cabinets', 'Offices', None)]
    facts = fact(len(CABS), 'cabinets dans l’annuaire', 'offices in the directory') + fact(fr, 'en France métropolitaine', 'in mainland France') + fact(om, 'en outre-mer', 'in overseas France') + fact(it, f'à l’international, dans {countries} pays', f'abroad, in {countries} countries')
    hero = ihero(r, items, ('Trouver un cabinet Exco', 'Find an Exco office'),
                 lead=('Cherchez par ville, code postal, département ou nom. Chaque fiche donne les horaires en direct, les services, l’équipe et l’accès.', 'Search by town, postcode, département or name. Each page shows live opening hours, services, the team and directions.'),
                 facts=facts, media=liveboard())
    finder = finder_section().replace('{{r}}', r)
    # le titre de la page présente déjà l'annuaire : l'en-tête du module devient un titre pour lecteurs d'écran
    finder = re.sub(r'<div class="sec-head sec-head--row">\s*<h2 class="h2" id="finder-title" data-reveal>(.*?)</h2>.*?</div>',
                    r'<h2 class="sr" id="finder-title">\1</h2>', finder, count=1, flags=re.S)
    finder = finder.replace('class="finder band band--night"', 'class="finder finder--page band band--night"', 1)
    dir_sec = f'''<section class="band band--paper" aria-labelledby="dir-title">
  <div class="wrap">
    <div class="sec-head sec-head--row">
      <h2 class="h2" id="dir-title" data-reveal>{bi("Tous les cabinets", "All offices")}</h2>
      <p class="lead">{bi("Classés par département, par territoire d’outre-mer et par pays. Le point indique si le cabinet est ouvert en ce moment.", "Listed by département, overseas territory and country. The dot shows whether the office is open right now.")}</p>
    </div>
    <nav class="filters" aria-label="Zones" data-en-aria-label="Areas"><a class="btn btn--ghost btn--sm" href="#france">{bi("France", "France")}</a><a class="btn btn--ghost btn--sm" href="#outre-mer">{bi("Outre-mer", "Overseas")}</a><a class="btn btn--ghost btn--sm" href="#international">International</a></nav>
    {directory(r)}
  </div>
</section>'''
    main = hero + '\n' + finder + '\n' + dir_sec + '\n' + cta_band(r)
    ld = [crumbs_ld(items, 'cabinets.html')]
    pg = dict(r=r, out='cabinets.html', type='cabinets', title='Trouver un cabinet Exco près de chez vous', title_en='Find an Exco office near you',
              desc=f'Les {len(CABS)} cabinets du réseau Exco en France, en outre-mer et à l’international : carte, horaires en direct, services et contact.', ld=ld)
    return pg, main


# ---------- groupes membres ----------
def group_cabs(g):
    return [c for c in CABS if c['g'] == g['g']]


PHONE = re.compile(r'^\+?[\d\s().-]{8,}$')
STOP = ('Les expertises', 'L’actualité', 'Les évènements', 'Mon espace client', 'Expert-comptable, Audit', 'Domaines d’intervention')


def pslug(name):
    return re.sub(r'[^a-z0-9]+', '-', unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode().lower()).strip('-')


def face_img(r, ph):
    """Photo d'un membre de l'équipe : dossier equipe, sinon portraits des associés de la gouvernance."""
    for d in ('equipe', 'associes'):
        if ph and exists(f'assets/img/{d}/{ph}-320.webp'):
            big = f', {r}assets/img/{d}/{ph}-640.webp 640w' if exists(f'assets/img/{d}/{ph}-640.webp') else ''
            return f'<img src="{r}assets/img/{d}/{ph}-320.webp" srcset="{r}assets/img/{d}/{ph}-320.webp 320w{big}" sizes="(max-width: 600px) 45vw, 180px" alt="" width="320" height="320" loading="lazy">'
    return ''


def parse_group(fr, en):
    """Structure une page de groupe d'exco.fr : présentation, coordonnées, chiffres, valeurs (ADN), associés.
    Les textes anglais sont pris aux mêmes positions quand la page anglaise a la même structure."""
    if not fr: return None
    same = en and [x['k'] for x in en] == [x['k'] for x in fr]
    E = en if same else None
    def t(i): return (fr[i].get('t', ''), E[i].get('t') if E else None)
    h2 = [i for i, x in enumerate(fr) if x['k'] == 'h2']
    res = {'lead': None, 'addr': None, 'tel': None, 'about': ([], None), 'figs': [], 'adn': [], 'adn_t': None, 'team': []}
    end0 = h2[1] if len(h2) > 1 else len(fr)
    for i in range(1, end0):
        x = fr[i]
        if x['k'] in ('div', 'p') and res['lead'] is None and len(x['t']) > 60: res['lead'] = t(i)
        elif x['k'] == 'p' and res['addr'] is None and re.search(r'\d', x['t']) and len(x['t']) < 160: res['addr'] = x['t'].split(' https://')[0]
        elif x['k'] == 'div' and res['tel'] is None and PHONE.match(x['t']): res['tel'] = x['t']
    for n, a in enumerate(h2[1:], 1):
        b = h2[n + 1] if n + 1 < len(h2) else len(fr)
        head = fr[a]['t']
        if head.startswith(STOP): continue
        seg = list(range(a + 1, b))
        if head.startswith(('Le cabinet comptable', 'Les cabinets comptables')):
            k = 0
            body_fr, body_en = [], []
            while k < len(seg):
                i = seg[k]; x = fr[i]
                if x['k'] == 'counter' and k + 1 < len(seg):
                    res['figs'].append((x['t'], t(seg[k + 1]))); k += 2; continue
                if x['k'] == 'img' or (k == 0 and x['k'] == 'div' and len(x['t']) < 160): k += 1; continue
                body_fr.append(x)
                if E: body_en.append(E[i])
                k += 1
            res['about'] = (body_fr, body_en if E else None)
        elif 'ADN' in head:
            res['adn_t'] = t(a)
            for k, i in enumerate(seg):
                if fr[i]['k'] in ('h4', 'h3', 'h5') and k + 1 < len(seg) and fr[seg[k + 1]]['k'] in ('div', 'p'):
                    res['adn'].append((t(i), t(seg[k + 1])))
        elif head.startswith('Une équipe pluridisciplinaire'):
            for k, i in enumerate(seg):
                if fr[i]['k'] == 'h5':
                    img = fr[seg[k - 1]].get('src', '') if k > 0 and fr[seg[k - 1]]['k'] == 'img' else ''
                    role = t(seg[k + 1]) if k + 1 < len(seg) and fr[seg[k + 1]]['k'] == 'div' else ('', None)
                    res['team'].append({'name': fr[i]['t'], 'role': role, 'img': img})
    return res


def group_page(g, content_fr=None, content_en=None):
    from .pages_content import smart
    r = '../'
    cabs = group_cabs(g)
    out = f'groupes/{g["slug"]}.html'
    G = parse_group(content_fr, content_en) or {}
    items = [('Accueil', 'Home', 'index.html'), ('Le réseau', 'Network', 'le-reseau.html'), (g['name'], None, None)]
    logo = f'<img class="grp-logo" src="{r}assets/img/membres/{g["logo"]}-480.webp" alt="" width="240" height="80">'
    svc_codes = sorted({k for c in cabs for k in c['s'] if k in SVC_BY_CODE}, key=lambda k: list(SVC_BY_CODE).index(k))
    countries = sorted({c['co'][0] for c in cabs})
    facts = fact(len(cabs), 'cabinet' + ('s' if len(cabs) > 1 else '') + ' dans l’annuaire', 'office' + ('s' if len(cabs) > 1 else '') + ' in the directory') + fact(len(svc_codes), 'services proposés', 'services offered')
    if len(countries) > 1:
        facts += fact(len(countries), 'pays', 'countries')
    lead = G.get('lead') or (f'Groupe membre du réseau Exco, siège à {g["city"]}.', f'A member group of the Exco network, based in {g["city"]}.')
    # présentation et coordonnées
    intro = ''
    ab_fr, ab_en = G.get('about') or ([], None)
    contact = ''
    if G.get('addr') or G.get('tel'):
        rows = ''
        if G.get('addr'): rows += f'<div><dt>{bi("Siège", "Head office")}</dt><dd>{esc(G["addr"])}</dd></div>'
        if G.get('tel'): rows += f'<div><dt>{bi("Téléphone", "Phone")}</dt><dd><span class="copy" data-copy="{attr(G["tel"])}">{esc(G["tel"])}</span></dd></div>'
        contact = f'<aside class="grp-card"><h3 class="h4">{bi("Contacter le groupe", "Contact the group")}</h3><dl class="statcard__rows">{rows}</dl></aside>'
    if contact and not ab_fr:
        intro = (f'<section class="band band--paper2" aria-labelledby="grp-about"><div class="wrap split">'
                 f'<div class="split__head"><h2 class="h2" id="grp-about" data-reveal>{bi("Le groupe", "The group")}</h2>{map_group(g["g"], g["name"])}</div>'
                 f'<div class="split__body">{contact.replace("grp-card", "grp-card grp-card--wide")}</div></div></section>')
    elif ab_fr or contact:
        body_fr = smart(ab_fr)
        body_en = smart(ab_en) if ab_en else ''
        if body_en:
            body = f'<div class="rich" lang="fr">{body_fr}</div><div class="rich" lang="en">{body_en}</div>'
        else:
            body = f'<div class="rich">{body_fr}<p class="note" lang="en">Group description in French.</p></div>'
        intro = (f'<section class="band band--paper2" aria-labelledby="grp-about"><div class="wrap split">'
                 f'<div class="split__head"><h2 class="h2" id="grp-about" data-reveal>{bi("Le groupe", "The group")}</h2>{contact}{map_group(g["g"], g["name"])}</div><div class="split__body"><div class="more" data-more>{body}</div></div></div></section>')
    # chiffres : ceux de la page du groupe, sinon ceux d'une fiche cabinet
    figs = ''
    if G.get('figs'):
        cells = []
        for n, lab in G['figs']:
            nn = n.replace(' ', '')
            m = re.match(r'^([+]?)(\d+)$', nn)
            dp = f' data-prefix="{m.group(1)}"' if m and m.group(1) else ''
            num = f'<p class="fig__n" data-count="{m.group(2)}"{dp}>{esc(n)}</p>' if m else f'<p class="fig__n">{esc(n)}</p>'
            cells.append(f'<div class="fig">{num}<p class="fig__l">{bie(*lab)}</p></div>')
        figs = (f'<section class="group-figs band band--night" aria-labelledby="grp-figs"><div class="wrap">'
                f'<h2 class="h3" id="grp-figs" style="margin-bottom:40px;color:var(--on-night-soft)">{bi("Le groupe en chiffres", "The group in figures")}</h2>'
                f'<div class="figures__grid">{"".join(cells)}</div></div></section>')
    else:
        for c in cabs:
            f = CAB_FR.get(c['id'], {})
            if f.get('figures') and 'groupe' in (f.get('figures_title') or '').lower():
                figs = _figures(f, CAB_EN.get(c['id'])); break
    adn = ''
    if G.get('adn'):
        lis = ''.join(f'<li><h3 class="h4">{bie(*h)}</h3><p>{bie(*d)}</p></li>' for h, d in G['adn'])
        # v13 : l'ADN du groupe en double hélice, un barreau par trait (titres de la page du groupe)
        adn = (f'<section class="band band--paper adn" aria-labelledby="grp-adn"><div class="wrap split">'
               f'<div class="split__head"><h2 class="h2" id="grp-adn" data-reveal>{bie(*G["adn_t"])}</h2>{V.helix(len(G["adn"]))}</div>'
               f'<ul class="values values--adn">{lis}</ul></div></section>')
    team = ''
    if G.get('team'):
        faces = []
        for m in G['team']:
            pic = face_img(r, pslug(m['name']))
            if not pic:
                pic = f'<span class="face__mono" aria-hidden="true">{esc(initials(m["name"]))}</span>'
            rl = f'<p class="face__r">{bie(*m["role"])}</p>' if m['role'][0] else ''
            faces.append(f'<li class="face">{pic}<p class="face__n">{esc(m["name"])}</p>{rl}</li>')
        few = len(faces) <= 2
        team = (f'<section class="band band--paper2" aria-labelledby="grp-team"><div class="wrap{" split" if few else ""}">'
                f'<div class="{"split__head" if few else "sec-head"}"><h2 class="h2" id="grp-team" data-reveal>{bi("Les associés", "The partners")}</h2></div>'
                f'<ul class="team{" team--few split__body" if few else ""}">{"".join(faces)}</ul></div></section>')
    def svc_card(k):
        sv = SVC_BY_CODE[k]
        n = sum(1 for c in cabs if k in c['s'])
        return (f'<li><a class="card" href="{r}services/{sv["slug"]}.html" data-transition>{ico(sv["icon"])}<span class="card__t">{bie(sv["fr"], sv["en"])}</span>'
                f'<span class="card__n">{bi(f"{n} sur {len(cabs)}", f"{n} of {len(cabs)}")}</span></a></li>')
    svc_html = ''.join(svc_card(k) for k in svc_codes)
    # ouverture : six visages des associés, sinon la photo d'un cabinet du groupe
    pics = [p for p in (face_img(r, pslug(m['name'])) for m in G.get('team') or []) if p][:6]
    gmedia = ''
    if len(pics) >= 3:
        gmedia = '<div class="ihero__faces" aria-hidden="true">' + ''.join(f'<span>{p}</span>' for p in pics[:6 if len(pics) >= 6 else 3]) + '</div>'
    else:
        ph = next((c for c in cabs if cab_photo(c)), None)
        if ph:
            gmedia = f'<figure class="ihero__media"><img src="{r}assets/img/cabinets/{ph["id"]}-960.webp" alt="" width="960" height="1050" fetchpriority="high"></figure>'
    hero = ihero(r, items, (esc(g['name']), None), lead=lead, facts=facts, plain=not gmedia, media=gmedia,
                 chip=logo, actions=btn(f'#cabinets-groupe', 'Voir les cabinets', 'See the offices') + btn(g['exco'], 'Page du groupe sur exco.fr', 'Group page on exco.fr', ghost=True, ext=True))
    dir_sec = f'''<section class="band band--paper" id="cabinets-groupe" aria-labelledby="grp-cabs">
  <div class="wrap">
    <div class="sec-head sec-head--row">
      <h2 class="h2" id="grp-cabs" data-reveal>{bi("Les cabinets du groupe", "The group’s offices")}</h2>
      <p class="lead">{bi("Horaires en direct, services et équipe sur chaque fiche.", "Live opening hours, services and team on each page.")}</p>
    </div>
    {directory(r, cabs)}
  </div>
</section>'''
    svc_sec = ''
    if svc_html:
        svc_sec = f'''<section class="band band--paper2" aria-labelledby="grp-svc">
  <div class="wrap">
    <div class="sec-head"><h2 class="h2" id="grp-svc" data-reveal>{bi("Les services du groupe", "The group’s services")}</h2><p class="lead">{bi("Nombre de cabinets du groupe qui proposent chaque service, d’après l’annuaire.", "Number of the group’s offices offering each service, according to the directory.")}</p></div>
    <ul class="{cards_cls(svc_html.count('<li'))}">{svc_html}</ul>
  </div>
</section>'''
    main = '\n'.join(x for x in [hero, intro, figs, adn, team, dir_sec, svc_sec, cta_band(r, title=('Rencontrer un cabinet du groupe', 'Meet one of the group’s offices'), lead=('Horaires en direct, services et équipe sur chaque fiche : le rendez-vous se demande en ligne.', 'Live opening hours, services and team on each page: book a meeting online.'))] if x)
    ld = [{'@context': 'https://schema.org', '@type': 'Organization', 'name': g['name'], 'url': page_url(out), 'parentOrganization': {'@type': 'Organization', 'name': 'Exco', 'url': SITE_URL + '/'},
           'logo': f'{SITE_URL}/assets/img/membres/{g["logo"]}-480.webp'}, crumbs_ld(items, out)]
    pg = dict(r=r, out=out, type='group', title=f'{g["name"]}, groupe membre du réseau Exco', title_en=f'{g["name"]}, member group of the Exco network',
              desc=f'{g["name"]} : {len(cabs)} cabinet{"s" if len(cabs) > 1 else ""} du réseau Exco, services, horaires et contact.', ld=ld)
    return pg, main
