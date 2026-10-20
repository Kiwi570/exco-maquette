"""Pages principales : accueil, services, secteurs, le réseau, gouvernance, RSE, carrières, contact, mentions, plan du site, 404."""
import os, re, json
from .common import bi, bie, esc, attr, ico, page_url, SITE_URL, load, ROOT, slugify
from .partials import crumbs, crumbs_ld, CAT
from .ui import ihero, fact, btn, cta_band, exists, img_tag, svc_cards, sector_card, bi_div
from . import blocks as B
from .pages_content import PAGES_FR, PAGES_EN, art_card, svc_counts, smart, metier_card, CABS, date_bi, auto_sections, render_sections
from .pages_cab import GROUPS, group_cabs, directory

PARTS = os.path.join(ROOT, 'src', 'pages', 'parts')


def part(name, r):
    return open(os.path.join(PARTS, name), encoding='utf-8').read().replace('{{r}}', r)


def frag(name, r, items=None):
    s = open(os.path.join(ROOT, 'src', 'pages', name), encoding='utf-8').read()
    s = re.sub(r'</?main[^>]*>', '', s).replace('{{r}}', r)
    if items is not None:
        s = s.replace('{{crumbs}}', crumbs(r, items))
    return s


class Src:
    """Accès aux blocs d'une page d'exco.fr, en français et (si la structure est identique) en anglais."""
    def __init__(self, key):
        self.fr = PAGES_FR.get(key) or []
        en = PAGES_EN.get(key) or []
        same = en and [b['k'] for b in en] == [b['k'] for b in self.fr]
        self.en = en if same else None

    def idx(self, start):
        for i, b in enumerate(self.fr):
            if (b.get('t') or '').startswith(start):
                return i
        return None

    def t(self, i):
        """Texte d'un bloc (fr, en)."""
        if i is None or i >= len(self.fr): return ('', None)
        return (self.fr[i].get('t', ''), self.en[i].get('t') if self.en else None)

    def slice(self, start, end=None):
        a = self.idx(start)
        if a is None: return [], None
        b = self.idx(end) if end else len(self.fr)
        b = b if b is not None else len(self.fr)
        return self.fr[a:b], (self.en[a:b] if self.en else None)

    def bi(self, i):
        return bie(*self.t(i))


def two(fr_html, en_html, cls='rich'):
    return bi_div(fr_html, en_html, cls) if en_html else f'<div class="{cls}">{fr_html}</div>'


# ---------- accueil ----------
def home(actus):
    r = ''
    s = frag('home.html', r)
    s = s.replace('{{finder}}', part('finder.html', r))
    arts = [a for a in actus if a['cat'] != 'event'][:5]
    s = s.replace('{{articles}}', ''.join(art_card(r, a) for a in arts))
    s = s.replace('{{cta}}', cta_band(r, title=('Parlons de votre projet', 'Let’s talk about your project'),
                                      lead=('Créer, développer, transformer ou transmettre : le cabinet le plus proche de chez vous vous rappelle.', 'Start, grow, transform or hand over: your nearest office will call you back.')))
    ld = [{'@context': 'https://schema.org', '@type': 'Organization', 'name': 'Exco', 'legalName': 'Exco SAS', 'url': SITE_URL + '/',
           'logo': SITE_URL + '/assets/img/logos/exco-logo.svg', 'telephone': '+33 1 58 05 22 90', 'email': 'info@exco.fr',
           'address': {'@type': 'PostalAddress', 'streetAddress': '42 avenue de la Grande Armée', 'postalCode': '75017', 'addressLocality': 'Paris', 'addressCountry': 'FR'},
           'memberOf': {'@type': 'Organization', 'name': 'Kreston Global', 'url': 'https://www.kreston.com/'},
           'sameAs': ['https://www.linkedin.com/company/exco', 'https://www.youtube.com/channel/UCdLEx0TboPWBR7W-R5KDElg', 'https://www.facebook.com/reseauexco/', 'https://twitter.com/exco_france']},
          {'@context': 'https://schema.org', '@type': 'WebSite', 'name': 'Exco', 'url': SITE_URL + '/'}]
    pg = dict(r=r, out='index.html', type='home', title='Exco, expertise comptable, audit et conseil', title_en='Exco, accounting, audit and advisory',
              desc='Exco, réseau de cabinets d’expertise comptable, d’audit et de conseil indépendants, en France et dans 14 autres pays. 139 cabinets, horaires en direct.', ld=ld)
    return pg, s


# ---------- services ----------
def services_index():
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Services', 'Services', None)]
    cnt = svc_counts()
    svcs = CAT['services']
    ec = svcs[0]
    feature = f'''<a class="svc-feature" href="{r}services/{ec['slug']}.html" data-transition>{ico('ec', 'ico ico--lg')}
        <span class="svc-feature__name">{bie(ec['fr'], ec['en'])}</span>
        <span class="svc-feature__sub">{bi('Comptabilité et fiscalité, gestion, consolidation des comptes', 'Bookkeeping and tax, management, consolidated accounts')}</span>
        <span class="svc-feature__desc">{bie(ec['dfr'], ec['den'])}</span>
        <span class="svc-feature__cta"><span class="btn__dot"></span>{bi('Découvrir le service', 'Explore the service')}</span></a>'''
    idx = ''.join(f'<li><a href="{r}services/{s["slug"]}.html" data-transition>{ico(s["icon"])}<span class="svc-index__name">{bie(s["fr"], s["en"])}</span><span class="svc-index__desc">{bie(s["dfr"], s["den"])}</span></a></li>' for s in svcs[1:])
    hero = ihero(r, items, ('Nos services', 'Our services'),
                 lead=('Expertise comptable, audit, conseil, juridique, social : treize services, assurés dans chaque cabinet ou mutualisés par le réseau.', 'Accounting, audit, advisory, legal and HR: thirteen services, offered in each office or shared across the network.'),
                 facts=fact(13, 'services', 'services') + fact(len(CABS), 'cabinets', 'offices') + fact(cnt.get('ec', 0), 'cabinets en expertise comptable', 'offices offering accounting'), plain=True)
    grid = f'''<section class="services band band--paper2" aria-labelledby="svc-all"><div class="wrap">
    <h2 class="sr" id="svc-all">{bi('Les treize services', 'The thirteen services')}</h2>
    <div class="services__grid">{feature}<ul class="svc-index">{idx}</ul></div></div></section>'''
    rows = []
    for s in svcs:
        k = s.get('code')
        if not k or not cnt.get(k): continue
        n = cnt[k]
        rows.append((n, f'<tr><th scope="row"><a href="{r}services/{s["slug"]}.html" data-transition>{ico(s["icon"])}{bie(s["fr"], s["en"])}</a></th>'
                        f'<td class="cover__bar"><span style="--v:{n / len(CABS):.3f}"></span></td><td class="cover__n">{n}</td></tr>'))
    rows.sort(key=lambda x: -x[0])
    cover = f'''<section class="band band--paper" aria-labelledby="cover-title"><div class="wrap split">
    <div class="split__head"><h2 class="h2" id="cover-title" data-reveal>{bi('Un service, combien de cabinets ?', 'One service, how many offices?')}</h2>
      <p class="lead">{bi('Nombre de cabinets de l’annuaire qui proposent chaque service. Les services les plus pointus sont mutualisés : un cabinet peut faire appel à l’expertise d’un autre.', 'Number of offices in the directory offering each service. The most specialised services are shared: one office can call on another’s expertise.')}</p></div>
    <div class="matrix-wrap"><table class="cover"><caption>{bi(f'Sur {len(CABS)} cabinets, d’après l’annuaire exco.fr', f'Out of {len(CABS)} offices, according to the exco.fr directory')}</caption>
      <thead><tr><th scope="col">{bi('Service', 'Service')}</th><th scope="col"><span class="sr">{bi('Part des cabinets', 'Share of offices')}</span></th><th scope="col">{bi('Cabinets', 'Offices')}</th></tr></thead>
      <tbody>{''.join(x[1] for x in rows)}</tbody></table></div>
  </div></section>'''
    main = '\n'.join([hero, grid, cover, cta_band(r)])
    pg = dict(r=r, out='services.html', type='services', title='Nos services : expertise comptable, audit, conseil | Exco', title_en='Our services: accounting, audit, advisory | Exco',
              desc='Les 13 services du réseau Exco : expertise comptable, audit, conseil, juridique et fiscal, social et paie, évaluation, transactions, patrimoine, international, RSE.', ld=[crumbs_ld(items, 'services.html')])
    return pg, main


# ---------- secteurs ----------
def sectors_index():
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Secteurs', 'Sectors', None)]
    src = Src('page-secteurs')
    sub = src.t(src.idx('Notre Cabinet Comptable')) if src.idx('Notre Cabinet Comptable') is not None else None
    hero = ihero(r, items, ('Nos secteurs', 'Our sectors'),
                 lead=('Les experts de tous les cabinets se retrouvent en commissions sectorielles pour partager leurs pratiques : une connaissance fine de votre métier, partout en France.', 'Experts from every office meet in sector committees to share their practice: a close understanding of your trade, everywhere in France.'),
                 facts=fact(len(CAT['sectors']), 'secteurs', 'sectors') + fact(len(CABS), 'cabinets', 'offices'), plain=True)
    grid = f'''<section class="band band--paper2" aria-labelledby="sec-all"><div class="wrap">
    <h2 class="sr" id="sec-all">{bi('Les quatorze secteurs', 'The fourteen sectors')}</h2>
    <div class="sec-grid">{''.join(sector_card(r, x) for x in CAT['sectors'])}</div>
    <p class="note" style="margin-top:28px">{bi('Photos des secteurs générées par intelligence artificielle (Grok) : les personnes représentées sont fictives.', 'Sector photos generated by AI (Grok): the people shown are fictional.')}</p></div></section>'''
    main = '\n'.join([hero, grid, cta_band(r)])
    pg = dict(r=r, out='secteurs.html', type='sectors', title='Nos secteurs d’activité | Exco', title_en='Our sectors | Exco',
              desc='Agriculture, BTP, santé, industrie, start-up, pharmacie, secteur public : les 14 secteurs accompagnés par les cabinets Exco.', ld=[crumbs_ld(items, 'secteurs.html')])
    return pg, main


# ---------- le réseau ----------
def group_addresses():
    """Adresses des sièges de groupe, d'après la liste des membres de la page Nous connaître."""
    src = Src('page-nous-connaitre')
    a = src.idx('Les membres du réseau')
    res = {}
    if a is None: return res
    bl = src.fr[a + 1:]
    for i, b in enumerate(bl):
        if b['k'] == 'h3' and i + 1 < len(bl) and bl[i + 1]['k'] == 'div':
            res[re.sub(r'^Groupe\s+', '', b['t']).strip()] = bl[i + 1]['t']
    return res


def members_grid(r):
    out = []
    for g in CAT['groups']:
        n = len(group_cabs(g))
        out.append(f'<a href="{r}groupes/{g["slug"]}.html" data-transition><img src="{r}assets/img/membres/{g["logo"]}-480.webp" alt="" loading="lazy" width="240" height="80">'
                   f'<span class="groups__n">{esc(g["name"])}</span><span class="groups__m">{esc(g["city"])} · {bi(f"{n} cabinet" + ("s" if n > 1 else ""), f"{n} office" + ("s" if n > 1 else ""))}</span></a>')
    return '<div class="groups">' + ''.join(out) + '</div>'


def figures_band(r):
    s = open(os.path.join(ROOT, 'src', 'pages', 'home.html'), encoding='utf-8').read()
    a = s.index('<section class="figures')
    b = s.index('</section>', a) + len('</section>')
    return s[a:b].replace('{{r}}', r)


def reseau():
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Le réseau', 'Network', None)]
    s = Src('page-nous-connaitre')
    T = s.t
    i_sub = s.idx('Rendre simple')
    i_intro = i_sub + 1 if i_sub is not None else None
    media = img_tag(r, 'assets/img/convention/photo-groupe-aerienne', ['800', '1600', '2400'], 'Les associés et collaborateurs du réseau réunis à la convention Exco 2026, vue aérienne', 'Partners and staff of the network at the 2026 Exco convention, aerial view', lazy=False, extra=' data-parallax="0.06"')
    hero = ihero(r, items, T(0), sub=T(i_sub), lead=T(i_intro), media=media,
                 actions=btn(r + 'cabinets.html', 'Trouver un cabinet', 'Find an office', extra=' data-magnetic') + btn('#membres', 'Les 23 groupes membres', 'The 23 member groups', ghost=True))
    # qui sommes-nous
    who_fr = [s.fr[i_intro + 1], s.fr[i_intro + 2]] if i_intro is not None else []
    who_en = [s.en[i_intro + 1], s.en[i_intro + 2]] if (i_intro is not None and s.en) else None
    met_fr, met_en = s.slice('Les métiers de nos cabinets', 'Une histoire portée')
    who = f'''<section class="band band--paper2" aria-labelledby="who-title"><div class="wrap split">
    <div class="split__head"><h2 class="h2" id="who-title" data-reveal>{bi('Des fertiliseurs d’entreprises', 'Business growers')}</h2></div>
    {two(B.render(who_fr, lead_first=True) + B.render(met_fr, demote=0), (B.render(who_en, lead_first=True) + B.render(met_en)) if who_en and met_en else None)}
  </div></section>'''
    # histoire : frise
    hist_fr, hist_en = s.slice('Une histoire portée', 'Un réseau agile')
    tl = f'''<ol class="timeline">
      <li><b>2002</b><p>{bi('Exco naît de la fusion de deux réseaux : Exco « historique », initialement affilié à Grant Thornton, et A2A, réseau de proximité anciennement affilié à Arthur Andersen.', 'Exco is formed by merging two networks: the “historic” Exco, originally affiliated with Grant Thornton, and A2A, a local network formerly affiliated with Arthur Andersen.')}</p></li>
      <li><b>2008</b><p>{bi('Exco rejoint Kreston Global, réseau mondial de cabinets comptables, d’audit et de conseil.', 'Exco joins Kreston Global, a worldwide network of accounting, audit and advisory firms.')}</p></li>
      <li><b>2026</b><p>{bi(f'{len(CABS)} cabinets dans l’annuaire, 23 groupes membres, en France, en outre-mer, en Europe et en Afrique.', f'{len(CABS)} offices in the directory, 23 member groups, in France, overseas France, Europe and Africa.')}</p></li>
    </ol>'''
    hist = f'''<section class="band band--paper" aria-labelledby="hist-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="hist-title" data-reveal>{bie(*T(s.idx('Une histoire portée')))}</h2>
      <p class="lead">{bie(*T(s.idx('Nous sommes une entreprise qui grandit')))}</p></div>
    {tl}
    <div class="two-col" style="margin-top:56px">{two(B.render([b for b in hist_fr[5:] if b['k'] != 'li']), B.render([b for b in hist_en[5:] if b['k'] != 'li']) if hist_en else None)}
      {two(B.render([b for b in hist_fr if b['k'] == 'li'][2:]), B.render([b for b in hist_en if b['k'] == 'li'][2:]) if hist_en else None, 'rich')}</div>
  </div></section>'''
    # mission et valeurs
    ag_fr, ag_en = s.slice('Un réseau agile', 'La gouvernance Exco')
    agile = f'''<section class="band band--paper2" aria-labelledby="agile-title"><div class="wrap split">
    <div class="split__head"><h2 class="h2" id="agile-title" data-reveal>{bie(*T(s.idx('Un réseau agile')))}</h2></div>
    {two(smart(ag_fr[1:]), smart(ag_en[1:]) if ag_en else None)}
  </div></section>'''
    iv = s.idx('DES VALEURS COLLECTIVES')
    vals = ''
    if iv is not None:
        cells = []
        for k in range(3):
            tt, dd = T(iv + 1 + 2 * k), T(iv + 2 + 2 * k)
            VAL_EN = {'COLLECTIF': 'Collective', 'HUMANISME': 'Humanism', 'CONFIANCE': 'Trust'}
            te_ = tt[1] if tt[1] and tt[1] != tt[0] else VAL_EN.get(tt[0].strip().upper())
            cells.append(f'<li><h3 class="h3">{bie(tt[0].capitalize(), te_.capitalize() if te_ else None)}</h3><p>{bie(*dd)}</p></li>')
        vals = f'''<section class="band band--night" aria-labelledby="val-title"><div class="wrap">
    <div class="sec-head"><h2 class="h2" id="val-title" data-reveal>{bi('Des valeurs collectives qui nous animent', 'The shared values that drive us')}</h2></div>
    <ul class="values">{''.join(cells)}</ul></div></section>'''
    gov_fr, gov_en = s.slice('La gouvernance Exco', 'Exco est membre du réseau international')
    gov = f'''<section class="band band--paper" aria-labelledby="gov-t"><div class="wrap split">
    <div class="split__head"><h2 class="h2" id="gov-t" data-reveal>{bi('Une gouvernance décentralisée', 'Decentralised governance')}</h2>
      <a class="link-arrow" href="{r}le-reseau/gouvernance.html" data-transition>{bi('Le Comité directeur et le Bureau exécutif', 'The Steering Committee and Executive Board')}</a></div>
    {two(B.render([b for b in gov_fr[1:] if b['k'] != 'img'], lead_first=True), B.render([b for b in gov_en[1:] if b['k'] != 'img'], lead_first=True) if gov_en else None)}
  </div></section>'''
    members = f'''<section class="band band--paper2" id="membres" aria-labelledby="mem-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="mem-title" data-reveal>{bi('Les 23 groupes membres', 'The 23 member groups')}</h2>
      <p class="lead">{bi('Chaque groupe garde son indépendance capitalistique et partage avec les autres méthodes, outils et expertises.', 'Each group keeps its capital independence and shares methods, tools and expertise with the others.')}</p></div>
    {members_grid(r)}</div></section>'''
    kre = part('kreston.html', r)
    links = f'''<section class="band band--paper" aria-labelledby="more-title"><div class="wrap">
    <div class="sec-head"><h2 class="h2" id="more-title" data-reveal>{bi('Pour aller plus loin', 'Find out more')}</h2></div>
    <ul class="discover__grid">
      <li><a class="tile" href="{r}le-reseau/gouvernance.html" data-transition><span class="tile__img"><img src="{r}assets/img/convention/orateur-pupitre-800.webp" alt="" loading="lazy" width="800" height="532"></span><span class="tile__t">{bi('Gouvernance', 'Governance')}</span><span class="tile__d">{bi('Un Comité directeur, un Bureau exécutif, une voix par associé.', 'A Steering Committee, an Executive Board, one vote per partner.')}</span></a></li>
      <li><a class="tile" href="{r}le-reseau/engagements-rse.html" data-transition><span class="tile__img"><img src="{r}assets/img/rse/evenement-sportif-equipes-800.webp" alt="" loading="lazy" width="800" height="600"></span><span class="tile__t">{bi('Engagements RSE', 'CSR commitments')}</span><span class="tile__d">{bi('Environnement, social, économie locale, éthique et transparence.', 'Environment, people, local economy, ethics and transparency.')}</span></a></li>
      <li><a class="tile" href="{r}carrieres.html" data-transition><span class="tile__img"><img src="{r}assets/img/convention/amphitheatre-public-800.webp" alt="" loading="lazy" width="800" height="532"></span><span class="tile__t">{bi('Carrières', 'Careers')}</span><span class="tile__d">{bi('Près de 300 recrutements par an dans les cabinets du réseau.', 'Around 300 hires a year across the network’s offices.')}</span></a></li>
      <li><a class="tile" href="{r}actualites.html" data-transition><span class="tile__img"><img src="{r}assets/img/convention/scene-groupe-ecran-800.webp" alt="" loading="lazy" width="800" height="532"></span><span class="tile__t">{bi('Actualités', 'News')}</span><span class="tile__d">{bi('Convention, partenariats, événements dans les territoires.', 'Convention, partnerships, local events.')}</span></a></li>
    </ul></div></section>'''
    main = '\n'.join([hero, who, figures_band(r), hist, agile, vals, gov, members, kre, links, cta_band(r)])
    pg = dict(r=r, out='le-reseau.html', type='reseau', title='Le réseau Exco : cabinets indépendants d’expertise comptable', title_en='The Exco network: independent accounting firms',
              desc='Exco, réseau de cabinets d’expertise comptable et d’audit indépendants né en 2002, membre de Kreston Global : histoire, valeurs, gouvernance, 23 groupes membres.',
              ld=[crumbs_ld(items, 'le-reseau.html')], og='assets/img/convention/photo-groupe-aerienne-1600.webp')
    return pg, main


def gouvernance():
    r = '../'
    items = [('Accueil', 'Home', 'index.html'), ('Le réseau', 'Network', 'le-reseau.html'), ('Gouvernance', 'Governance', None)]
    s = Src('page-gouvernance')
    gov = part('gov.html', r)
    hero = ihero(r, items, ('La gouvernance Exco', 'Exco governance'), sub=('D’un homme, une voix', 'One partner, one vote'),
                 lead=('Une gouvernance décentralisée pour rester au plus près des clients : la stratégie du réseau est définie par les associés des cabinets.', 'Decentralised governance to stay close to clients: the network’s strategy is set by the firms’ partners.'),
                 plain=True)
    body = ''
    if s.fr:
        from .pages_cab import face_img, pslug
        ROLE_EN = {'Président Exco': 'Chairman of Exco', 'Directeur Général Exco': 'Chief Executive of Exco', 'Membre Board Kreston': 'Member of the Kreston board'}
        bureau, comite, dg = [], [], []
        sec = None
        fr = s.fr
        i = 0
        while i < len(fr):
            x = fr[i]
            t = x.get('t', '')
            if x['k'] == 'h3' and t.startswith('Bureau exécutif'): sec = bureau
            elif x['k'] == 'h3' and t.startswith('Comité Directeur'): sec = comite
            elif x['k'] == 'h3' and t.startswith('Directeur Général') and i + 2 < len(fr) and fr[i + 1]['k'] == 'img': sec = dg
            if x['k'] in ('h5',) or (sec is dg and x['k'] == 'h3' and not t.startswith('Directeur') and fr[i - 1]['k'] == 'img'):
                name, grp, roles = t, '', []
                j = i + 1
                while j < len(fr) and fr[j]['k'] in ('h3', 'div') and not fr[j].get('t', '').startswith(('Comité Directeur', 'Bureau exécutif')) \
                        and not (fr[j]['k'] == 'h3' and j + 1 < len(fr) and fr[j + 1]['k'] == 'img'):
                    tt = fr[j]['t']
                    if fr[j]['k'] == 'h3' and tt.startswith(('Groupe', 'Exco')): grp = re.sub(r'^Groupe\s+', '', tt)
                    elif fr[j]['k'] == 'div' or tt.startswith('Directeur'): roles.append(tt)
                    j += 1
                if sec is not None: sec.append({'name': name, 'grp': grp, 'roles': list(dict.fromkeys(roles))})
                i = j; continue
            i += 1
        def card(p, big=False):
            pic = face_img(r, pslug(p['name'])) or f'<span class="face__mono" aria-hidden="true">{esc(p["name"][:1])}</span>'
            roles = ''.join(f'<p class="face__k">{bi(esc(x), ROLE_EN.get(x))}</p>' for x in p['roles'])
            grp = f'<p class="face__r">{esc(p["grp"])}</p>' if p['grp'] else ''
            return f'<li class="face">{pic}<p class="face__n">{esc(p["name"])}</p>{roles}{grp}</li>'
        intro_i = s.idx('La stratégie du réseau est définie')
        bodies = []
        if bureau or dg:
            bodies.append(f'''<section class="band band--paper2" aria-labelledby="bx-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="bx-title" data-reveal>{bi('Le Bureau exécutif', 'The Executive Board')}</h2>
      <p class="lead">{bi('Élu par le Comité directeur, il met en œuvre la stratégie du réseau avec le directeur général.', 'Elected by the Steering Committee, it implements the network’s strategy with the chief executive.')}</p></div>
    <ul class="team team--lg">{''.join(card(p) for p in bureau + dg)}</ul></div></section>''')
        if comite:
            lead = s.bi(intro_i) if intro_i is not None else ''
            bodies.append(f'''<section class="band band--paper" aria-labelledby="cd-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="cd-title" data-reveal>{bi('Le Comité directeur', 'The Steering Committee')}</h2><p class="lead">{lead}</p></div>
    <ul class="team">{''.join(card(p) for p in comite)}</ul></div></section>''')
        body = '\n'.join(bodies)
    else:
        n = Src('page-nous-connaitre')
        g_fr, g_en = n.slice('La gouvernance Exco', 'Exco est membre du réseau international')
        body = f'''<section class="band band--paper2"><div class="wrap split"><div class="split__head"><h2 class="h2" data-reveal>{bi('Deux instances', 'Two bodies')}</h2></div>
        {two(B.render([b for b in g_fr[1:] if b['k'] != 'img'], lead_first=True), B.render([b for b in g_en[1:] if b['k'] != 'img'], lead_first=True) if g_en else None)}</div></section>'''
    note = f'''<section class="band band--paper"><div class="wrap prose"><p><span class="chip chip--confirm">{bi('À vérifier : la page Nous connaître annonce un Bureau exécutif de six membres élus, la page Gouvernance en présente huit ; la page RSE nomme Bruno Geeraert président du réseau, la page Gouvernance Philippe Lafargue.', 'To check: the About page mentions a six-member elected Executive Board, the Governance page shows eight; the CSR page names Bruno Geeraert as network chairman, the Governance page names Philippe Lafargue.')}</span></p></div></section>'''
    main = '\n'.join([hero, gov.replace('id="gouvernance"', ''), body, note, cta_band(r)])
    pg = dict(r=r, out='le-reseau/gouvernance.html', type='gouvernance', title='Gouvernance du réseau Exco', title_en='Exco network governance',
              desc='Comité directeur, Bureau exécutif, groupes membres : la gouvernance décentralisée du réseau Exco.', ld=[crumbs_ld(items, 'le-reseau/gouvernance.html')])
    return pg, main


def rse():
    r = '../'
    items = [('Accueil', 'Home', 'index.html'), ('Le réseau', 'Network', 'le-reseau.html'), ('Engagements RSE', 'CSR commitments', None)]
    s = Src('page-rse')
    T = s.t
    media = img_tag(r, 'assets/img/rse/collecte-jouets-noel', ['800', '1600'], 'La collecte de jouets de Noël « Exco a du cœur »', 'The “Exco has heart” Christmas toy collection', lazy=False, extra=' data-parallax="0.06"')
    hero = ihero(r, items, ('Nos engagements RSE', 'Our CSR commitments'), lead=T(1) if s.fr else ('', None), media=media)
    # principes
    pr_fr = [b for b in s.slice('Principes fondamentaux', 'Télécharger')[0] if b['k'] == 'li']
    pr_en = [b for b in (s.slice('Principes fondamentaux', 'Télécharger')[1] or []) if b['k'] == 'li'] or None
    def principle(b):
        m = re.match(r'^([^:]{3,50}?)\s*:\s*(.+)$', b['t'])
        return (m.group(1), m.group(2)) if m else ('', b['t'])
    cells = []
    for i, b in enumerate(pr_fr):
        tf, df = principle(b)
        te, de = principle(pr_en[i]) if pr_en and i < len(pr_en) else (None, None)
        cells.append(f'<li><p><strong>{bie(tf, te)}</strong> {bie(df, de)}</p></li>')
    principles = f'''<section class="band band--paper2" aria-labelledby="pr-title"><div class="wrap split">
    <div class="split__head"><h2 class="h2" id="pr-title" data-reveal>{bi('Principes fondamentaux', 'Core principles')}</h2>
      <a class="link-arrow" href="https://exco.fr/nos-engagements-rse/" target="_blank" rel="noopener">{bi('Télécharger nos engagements RSE (exco.fr)', 'Download our CSR commitments (exco.fr)')}</a></div>
    <ul class="checks">{''.join(cells)}</ul></div></section>'''
    # quatre axes
    axes = []
    for k, name in enumerate(['Environnement', 'Social', 'Economique', 'Éthique et Transparence']):
        i = None
        for j, b in enumerate(s.fr):
            if b['k'] == 'p' and b['t'] == name: i = j; break
        if i is None: continue
        axes.append(f'<li><h3 class="h4">{s.bi(i)}</h3><p>{s.bi(i + 1)}</p></li>')
    axes_html = f'''<section class="band band--night" aria-labelledby="ax-title"><div class="wrap">
    <div class="sec-head"><h2 class="h2" id="ax-title" data-reveal>{bi('Quatre axes d’action', 'Four areas of action')}</h2><p class="lead">{s.bi(s.idx('Exco s'))}</p></div>
    <ul class="values values--4">{''.join(axes)}</ul></div></section>''' if axes else ''
    # initiatives détaillées
    rse_part = part('rse.html', r)
    env_fr, env_en = s.slice('Environnement', 'Social') if s.idx('Environnement') else ([], None)
    # les intertitres « Environnement », « Social », « Solidarité » sont des h3 dans la seconde moitié de la page
    def find_h3(name, start=0):
        for j in range(start, len(s.fr)):
            if s.fr[j]['k'] == 'h3' and s.fr[j]['t'] == name: return j
        return None
    i_env = find_h3('Environnement'); i_soc = find_h3('Social'); i_sol = find_h3('Solidarité'); i_gov = find_h3('Gouvernance') or len(s.fr)
    secs = []
    for a, b, tf, te in [(i_env, i_soc, 'Environnement', 'Environment'), (i_soc, i_sol, 'Social', 'People'), (i_sol, i_gov, 'Solidarité', 'Solidarity'), (i_gov if i_gov < len(s.fr) else None, len(s.fr), 'Gouvernance de la démarche', 'Governance of the approach')]:
        if a is None: continue
        bl = [x for x in s.fr[a + 1:b] if x['k'] != 'img']
        be = [x for x in s.en[a + 1:b] if x['k'] != 'img'] if s.en else None
        # liste des associations soutenues
        if tf == 'Solidarité':
            paras = [x for x in bl if x['k'] == 'p']
            intro = paras[:2]; orgs = [x for x in paras[2:] if len(x['t']) <= 60]
            ie = [x for x in be if x['k'] == 'p'][:2] if be else None
            html_fr = B.render(intro) + '<ul class="ledger">' + ''.join(f'<li>{esc(o["t"].rstrip("…"))}</li>' for o in orgs) + '</ul>'
            html_en = (B.render(ie) + '<ul class="ledger">' + ''.join(f'<li>{esc(o["t"].rstrip("…"))}</li>' for o in orgs) + '</ul>') if ie else None
        else:
            html_fr = B.render(bl, demote=-1)
            html_en = B.render(be, demote=-1) if be else None
        secs.append(f'''<section class="band {'band--paper' if len(secs) % 2 == 0 else 'band--paper2'}" aria-labelledby="rse-{slugify(tf)}"><div class="wrap split">
      <div class="split__head"><h2 class="h2" id="rse-{slugify(tf)}" data-reveal>{bi(tf, te)}</h2></div>{two(html_fr, html_en)}</div></section>''')
    main = '\n'.join([hero, principles, axes_html, rse_part, *secs, cta_band(r)])
    pg = dict(r=r, out='le-reseau/engagements-rse.html', type='rse', title='Engagements RSE du réseau Exco', title_en='Exco network CSR commitments',
              desc='Environnement, social, économie locale, éthique : les engagements RSE et les actions concrètes du réseau Exco.', ld=[crumbs_ld(items, 'le-reseau/engagements-rse.html')],
              og='assets/img/rse/collecte-jouets-noel-1600.webp')
    return pg, main


def carrieres():
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Carrières', 'Careers', None)]
    s = Src('page-carrieres')
    T = s.t
    media = img_tag(r, 'assets/img/convention/amphitheatre-public', ['800', '1600'], 'Le public de la convention Exco dans l’amphithéâtre', 'The audience at the Exco convention', lazy=False, extra=' data-parallax="0.06"')
    hero = ihero(r, items, T(0), sub=T(1), lead=T(s.idx('Chez Exco, nous partageons')), media=media,
                 actions=btn('https://exco.flatchr.io/fr/company/exco/', 'Voir les offres d’emploi', 'See job offers', ext=True, extra=' data-magnetic') + btn('#metiers', 'Découvrir nos métiers', 'Explore our careers', ghost=True))
    # chiffres
    figs = []
    for j, b in enumerate(s.fr):
        if b['k'] == 'counter' and j + 1 < len(s.fr):
            n = b['t'].replace(' ', '')
            m = re.match(r'^(\+?)(\d+)$', n)
            lab = s.t(j + 1)
            dp = f' data-prefix="{m.group(1)}"' if m and m.group(1) else ''
            num = f'<p class="fig__n" data-count="{m.group(2)}"{dp}>{esc(b["t"])}</p>' if m else f'<p class="fig__n">{esc(b["t"])}</p>'
            figs.append(f'<div class="fig fig--sm">{num}<p class="fig__l">{bie(lab[0][:1].upper() + lab[0][1:], (lab[1][:1].upper() + lab[1][1:]) if lab[1] else None)}</p></div>')
    figs_html = f'''<section class="figures band band--night" aria-labelledby="cf-title"><div class="wrap">
    <h2 class="h3 figures__title" id="cf-title">{bi('Le réseau en chiffres', 'The network in figures')}</h2>
    <div class="figures__grid figures__grid--6">{''.join(figs)}</div>
    <p><span class="chip chip--confirm">{bi('À harmoniser : cette page indique 136 cabinets, 3 000 collaborateurs et 16 pays ; l’accueil, 139 cabinets, 3 400 collaborateurs et 15 pays. Le titre annonce aussi 300 recrutements par an contre 400 CDI ici.', 'To align: this page says 136 offices, 3,000 staff and 16 countries; the home page says 139 offices, 3,400 staff and 15 countries. The heading also announces 300 hires a year versus 400 permanent contracts here.')}</span></p>
  </div></section>''' if figs else ''
    # valeurs (quatre phrases)
    vals_fr, vals_en = s.slice('Fertiliser les talents', 'Une communauté de talents')
    vh = s.t(s.idx('Fertiliser les talents'))
    vps = [(i, b) for i, b in enumerate(vals_fr) if b['k'] == 'p']
    base_i = s.idx('Fertiliser les talents')
    vals = f'''<section class="band band--paper2" aria-labelledby="cv-title"><div class="wrap split">
    <div class="split__head"><h2 class="h3" id="cv-title" data-reveal>{bie(*vh)}</h2></div>
    <div class="rich">{''.join(f'<p class="{"rich__lead" if k == 0 else ""}">{s.bi(base_i + i)}</p>' for k, (i, b) in enumerate(vps))}</div></div></section>'''
    com_fr, com_en = s.slice('Une communauté de talents', 'Postulez chez Exco')
    env_fr, env_en = s.slice('Des valeurs humaines', 'Découvrez nos métiers')
    comm = f'''<section class="band band--paper" aria-labelledby="cc-title"><div class="wrap split">
    <div class="split__head"><h2 class="h2" id="cc-title" data-reveal>{bie(*s.t(s.idx('Une communauté de talents')))}</h2></div>
    {two(smart(com_fr[1:] + env_fr), smart(com_en[1:] + env_en) if com_en and env_en else None)}</div></section>'''
    careers_part = part('careers.html', r)
    met = f'''<section class="band band--paper2" id="metiers" aria-labelledby="met-title"><div class="wrap">
    <div class="sec-head sec-head--row"><h2 class="h2" id="met-title" data-reveal>{bi('Découvrez nos métiers', 'Explore our careers')}</h2>
      <p class="lead">{bi('Au sein du réseau, une même vision du métier : vivre une large diversité d’expériences plutôt que se cantonner à un domaine.', 'Across the network, one shared view of the job: a wide range of experience rather than a single specialism.')}</p></div>
    <ul class="cards">{''.join(metier_card(r, m) for m in CAT['metiers'])}</ul></div></section>'''
    jobs = f'''<section class="band band--night" aria-labelledby="jobs-title"><div class="wrap cta-band">
    <div class="prose"><h2 class="h2" id="jobs-title" data-reveal>{bi('Postulez chez Exco', 'Apply to Exco')}</h2><p class="lead">{s.bi(s.idx('Explorez les opportunités'))}</p></div>
    <div class="cta-band__actions">{btn('https://exco.flatchr.io/fr/company/exco/', 'Voir les offres', 'See the offers', ext=True)}</div></div></section>'''
    main = '\n'.join([hero, figs_html, vals, comm, met, jobs])
    pg = dict(r=r, out='carrieres.html', type='careers', title='Carrières : rejoignez les cabinets Exco', title_en='Careers: join the Exco offices',
              desc='Expert-comptable, auditeur, juriste, paie et RH, consultant : rejoignez la communauté de talents du réseau Exco.', ld=[crumbs_ld(items, 'carrieres.html')])
    return pg, main


# ---------- contact ----------
def contact():
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Contact et rendez-vous', 'Contact and meetings', None)]
    hero = ihero(r, items, ('Contact et rendez-vous', 'Contact and meetings'),
                 lead=('Quatre questions pour orienter votre demande vers le bon cabinet. Le récapitulatif se remplit au fil de vos réponses.', 'Four questions to send your request to the right office. The summary fills in as you answer.'), plain=True)
    rdv = part('rdv.html', r).replace('class="rdv band band--paper2"', 'class="rdv band band--paper2" style="padding-top:clamp(40px,5vw,72px)"')
    hq = f'''<section class="band band--paper" aria-labelledby="hq-title"><div class="wrap two-col">
    <div class="prose"><h2 class="h2" id="hq-title" data-reveal>{bi('Exco France', 'Exco France')}</h2>
      <p class="lead" style="color:var(--ink)">42 avenue de la Grande Armée<br>75017 Paris</p>
      <p><span class="copy" data-copy="+33 1 58 05 22 90">+33 (0)1 58 05 22 90</span><br><span class="copy" data-copy="info@exco.fr">info@exco.fr</span></p>
      <p class="note">{bi('Le siège du réseau ne tient pas de dossiers clients : pour un rendez-vous, adressez-vous à un cabinet.', 'The network head office does not handle client files: to book a meeting, contact an office.')} <span class="chip chip--confirm">{bi('À confirmer', 'To confirm')}</span></p></div>
    <div class="prose"><h2 class="h3">{bi('Déjà client ?', 'Already a client?')}</h2><p>{bi('Retrouvez vos documents et vos outils dans votre espace client.', 'Find your documents and tools in your client area.')}</p>
      <p><a class="link-arrow" href="https://exco.fr/accedez-a-votre-compte-client/" target="_blank" rel="noopener">{bi('Accéder à mon espace client', 'Go to my client area')}</a></p>
      <h2 class="h3" style="margin-top:20px">{bi('Candidature', 'Applications')}</h2><p>{bi('Les offres d’emploi de tous les cabinets sont publiées sur le site de recrutement.', 'Openings from every office are published on the recruitment site.')}</p>
      <p><a class="link-arrow" href="https://exco.flatchr.io/fr/company/exco/" target="_blank" rel="noopener">{bi('Voir les offres', 'See the offers')}</a></p></div>
  </div></section>'''
    main = '\n'.join([hero, rdv, hq])
    pg = dict(r=r, out='contact.html', type='contact', title='Contact et prise de rendez-vous | Exco', title_en='Contact and meetings | Exco',
              desc='Demandez un rendez-vous au cabinet Exco le plus proche de chez vous, ou contactez le siège du réseau.', ld=[crumbs_ld(items, 'contact.html')])
    return pg, main


def legal():
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Mentions légales', 'Legal notice', None)]
    main = frag('legal.html', r, items)
    pg = dict(r=r, out='mentions-legales.html', type='legal', title='Mentions légales | Exco', title_en='Legal notice | Exco', desc='Mentions légales du site Exco.', ld=[crumbs_ld(items, 'mentions-legales.html')])
    return pg, main


def sitemap_page(all_pages):
    r = ''
    items = [('Accueil', 'Home', 'index.html'), ('Plan du site', 'Site map', None)]
    from .pages_cab import CABS as CB
    def lst(title, links):
        lis = ''.join(f'<li><a href="{r}{h}" data-transition>{t}</a></li>' for h, t in links)
        return f'<section><h2>{title}</h2><ul>{lis}</ul></section>'
    main_links = [('index.html', bi('Accueil', 'Home')), ('le-reseau.html', bi('Le réseau', 'Network')), ('le-reseau/gouvernance.html', bi('Gouvernance', 'Governance')),
                  ('le-reseau/engagements-rse.html', bi('Engagements RSE', 'CSR commitments')), ('carrieres.html', bi('Carrières', 'Careers')), ('actualites.html', bi('Actualités', 'News')),
                  ('contact.html', bi('Contact et rendez-vous', 'Contact and meetings')), ('mentions-legales.html', bi('Mentions légales', 'Legal notice'))]
    blocks = [lst(bi('Pages principales', 'Main pages'), main_links),
              lst('Services', [('services.html', bi('Tous les services', 'All services'))] + [(f'services/{s["slug"]}.html', bie(s['fr'], s['en'])) for s in CAT['services']]),
              lst(bi('Secteurs', 'Sectors'), [('secteurs.html', bi('Tous les secteurs', 'All sectors'))] + [(f'secteurs/{s["slug"]}.html', bie(s['fr'], s['en'])) for s in CAT['sectors']]),
              lst(bi('Métiers', 'Careers'), [(f'carrieres/{m["slug"]}.html', bie(m['fr'], m['en'])) for m in CAT['metiers']]),
              lst(bi('Groupes membres', 'Member groups'), [(f'groupes/{g["slug"]}.html', esc(g['name'])) for g in CAT['groups']]),
              lst(bi('Actualités', 'News'), [(f'actualites/{a["slug"]}.html', esc(a['fr']['title'])) for a in load('actus.json')]),
              lst(bi('Cabinets', 'Offices'), [('cabinets.html', bi('Trouver un cabinet', 'Find an office'))] + [(f'cabinets/{c["id"]}.html', esc(c['n'])) for c in sorted(CB, key=lambda c: c['n'])])]
    hero = ihero(r, items, ('Plan du site', 'Site map'), lead=(f'{len(all_pages)} pages.', f'{len(all_pages)} pages.'), plain=True)
    main = hero + f'<section class="band band--paper2" style="padding-top:48px"><div class="wrap sitemap">{"".join(blocks)}</div></section>'
    pg = dict(r=r, out='plan-du-site.html', type='sitemap', title='Plan du site | Exco', title_en='Site map | Exco', desc='Toutes les pages du site Exco.', ld=[crumbs_ld(items, 'plan-du-site.html')])
    return pg, main


def not_found():
    r = '/'
    main = f'''<section class="ihero ihero--plain nf" data-hero aria-labelledby="page-title"><div class="wrap" style="display:grid;gap:24px;justify-items:start">
    <p class="nf__n" aria-hidden="true">404</p>
    <h1 class="h2" id="page-title">{bi('Cette page n’existe pas ou a changé d’adresse.', 'This page does not exist or has moved.')}</h1>
    <p class="lead">{bi('Le site a été réorganisé : les cabinets, les services et les secteurs ont maintenant chacun leur page.', 'The site has been reorganised: offices, services and sectors now each have their own page.')}</p>
    <div class="ihero__actions">{btn(r + 'index.html', 'Retour à l’accueil', 'Back to the home page')}{btn(r + 'cabinets.html', 'Trouver un cabinet', 'Find an office', ghost=True)}{btn(r + 'plan-du-site.html', 'Plan du site', 'Site map', ghost=True)}</div>
  </div></section>'''
    pg = dict(r=r, out='404.html', type='404', title='Page introuvable | Exco', title_en='Page not found | Exco', desc='Page introuvable.', ld=[])
    return pg, main
