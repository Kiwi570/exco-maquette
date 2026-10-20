"""Outils communs du générateur : bilingue, échappement, chemins, icônes, données."""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE_URL = 'https://exco-maquette.vercel.app'


def esc(s):
    return html.escape(s or '', quote=False)


def attr(s):
    return html.escape(s or '', quote=True)


def bi(fr, en=None, tag=None):
    """Texte bilingue : deux span lang, ou un seul texte si les deux langues sont identiques."""
    fr = fr or ''
    en = fr if en is None or en == '' else en
    if fr == en:
        return fr if not tag else f'<{tag}>{fr}</{tag}>'
    return f'<span lang="fr">{fr}</span><span lang="en">{en}</span>'


def bie(fr, en=None):
    """Comme bi, mais échappe le texte."""
    return bi(esc(fr), esc(en) if en is not None else None)


def load(name):
    p = os.path.join(ROOT, 'src', 'content', name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def slugify(s):
    import unicodedata
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


# pictogrammes au trait (24 x 24)
ICONS = {
    'ec': 'M6 3h9l4 4v14H6z M15 3v4h4 M9 11h7 M9 14.5h7 M9 18h4',
    'audit': 'M9 3.5h6v3H9z M7.5 5H5v16h14V5h-2.5 M8.5 13.5l2.5 2.5 4.5-5',
    'social': 'M9 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M3 20c.4-3.4 2.9-5.8 6-5.8s5.6 2.4 6 5.8 M16 4.9a3.2 3.2 0 0 1 0 6 M17.6 14.5c1.9.7 3.1 2.8 3.4 5.5',
    'jur': 'M12 4v16 M8 20h8 M4.5 7.5h15 M12 4.6a1 1 0 1 0 .01 0 M4.5 7.5L2 14a2.5 2.5 0 0 0 5 0z M19.5 7.5L17 14a2.5 2.5 0 0 0 5 0z',
    'rse': 'M3.5 17.5a8.5 8.5 0 0 1 17 0 M12 17.5l4-5.2 M7 17.5h10 M12 9V7.5 M6.2 11.3l-1-1 M17.8 11.3l1-1',
    'oti': 'M12 15a5.8 5.8 0 1 0 0-11.6 5.8 5.8 0 0 0 0 11.6z M9.4 9.3l1.8 1.8 3.4-3.4 M8.6 14l-1.6 7 5-2.6 5 2.6-1.6-7',
    'eval': 'M4 20h16 M7 20v-5 M11 20v-8 M15 20v-6 M19 20V8 M4.5 10.5l5-4 4 2.5 6-5',
    'conseil': 'M3.5 4.5h12v8.5H8.5l-5 3.5z M15.5 9h5v8.5h-2v3l-4-3h-5.5V15',
    'forensics': 'M10.5 16.5a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M15 15l5.5 5.5 M8 10.5h5 M10.5 8v5',
    'intl': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z',
    'gp': 'M12 8.5c4.1 0 7.5-1.2 7.5-2.8S16.1 3 12 3 4.5 4.1 4.5 5.7 7.9 8.5 12 8.5z M4.5 5.7v4.4c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8V5.7 M4.5 10.1v4.4c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-4.4 M4.5 14.5v4c0 1.6 3.4 2.8 7.5 2.8s7.5-1.2 7.5-2.8v-4',
    'ft': 'M4 8h15 M15 4l4 4-4 4 M20 16H5 M9 12l-4 4 4 4',
    'consulting': 'M6 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18 8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M12 20.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M8.5 6h7 M7.3 8.2l3.5 7.4 M16.7 8.2l-3.5 7.4',
    'pin': 'M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4z',
    'chev': 'M6 9l6 6 6-6',
    'arrow': 'M5 12h14 M13 6l6 6-6 6',
    'phone': 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z',
    'mail': 'M3.5 6h17v12h-17z M3.5 6l8.5 7 8.5-7',
    'clock': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3.5 2',
    'users': 'M9 11a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z M3 20c.4-3.4 2.9-5.8 6-5.8s5.6 2.4 6 5.8 M16 4.9a3.2 3.2 0 0 1 0 6 M17.6 14.5c1.9.7 3.1 2.8 3.4 5.5',
    'globe': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z',
    'book': 'M4 5.5C6.5 4 9.5 4 12 5.5 14.5 4 17.5 4 20 5.5V19c-2.5-1.5-5.5-1.5-8 0-2.5-1.5-5.5-1.5-8 0z M12 5.5V19',
}


def ico(k, cls='ico'):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="{ICONS[k]}"/></svg>'


def page_url(out):
    """Adresse publique propre (sans .html) d'une page générée."""
    p = out[:-5] if out.endswith('.html') else out
    if p == 'index':
        return SITE_URL + '/'
    return f'{SITE_URL}/{p}'


def jsonld(obj):
    return '<script type="application/ld+json">' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + '</script>'


# départements (code postal -> numéro et nom)
DEPTS = {
    '01': 'Ain', '02': 'Aisne', '03': 'Allier', '04': 'Alpes-de-Haute-Provence', '05': 'Hautes-Alpes', '06': 'Alpes-Maritimes', '07': 'Ardèche',
    '08': 'Ardennes', '09': 'Ariège', '10': 'Aube', '11': 'Aude', '12': 'Aveyron', '13': 'Bouches-du-Rhône', '14': 'Calvados', '15': 'Cantal',
    '16': 'Charente', '17': 'Charente-Maritime', '18': 'Cher', '19': 'Corrèze', '2A': 'Corse-du-Sud', '2B': 'Haute-Corse', '21': 'Côte-d’Or',
    '22': 'Côtes-d’Armor', '23': 'Creuse', '24': 'Dordogne', '25': 'Doubs', '26': 'Drôme', '27': 'Eure', '28': 'Eure-et-Loir', '29': 'Finistère',
    '30': 'Gard', '31': 'Haute-Garonne', '32': 'Gers', '33': 'Gironde', '34': 'Hérault', '35': 'Ille-et-Vilaine', '36': 'Indre', '37': 'Indre-et-Loire',
    '38': 'Isère', '39': 'Jura', '40': 'Landes', '41': 'Loir-et-Cher', '42': 'Loire', '43': 'Haute-Loire', '44': 'Loire-Atlantique', '45': 'Loiret',
    '46': 'Lot', '47': 'Lot-et-Garonne', '48': 'Lozère', '49': 'Maine-et-Loire', '50': 'Manche', '51': 'Marne', '52': 'Haute-Marne', '53': 'Mayenne',
    '54': 'Meurthe-et-Moselle', '55': 'Meuse', '56': 'Morbihan', '57': 'Moselle', '58': 'Nièvre', '59': 'Nord', '60': 'Oise', '61': 'Orne',
    '62': 'Pas-de-Calais', '63': 'Puy-de-Dôme', '64': 'Pyrénées-Atlantiques', '65': 'Hautes-Pyrénées', '66': 'Pyrénées-Orientales', '67': 'Bas-Rhin',
    '68': 'Haut-Rhin', '69': 'Rhône', '70': 'Haute-Saône', '71': 'Saône-et-Loire', '72': 'Sarthe', '73': 'Savoie', '74': 'Haute-Savoie', '75': 'Paris',
    '76': 'Seine-Maritime', '77': 'Seine-et-Marne', '78': 'Yvelines', '79': 'Deux-Sèvres', '80': 'Somme', '81': 'Tarn', '82': 'Tarn-et-Garonne',
    '83': 'Var', '84': 'Vaucluse', '85': 'Vendée', '86': 'Vienne', '87': 'Haute-Vienne', '88': 'Vosges', '89': 'Yonne', '90': 'Territoire de Belfort',
    '91': 'Essonne', '92': 'Hauts-de-Seine', '93': 'Seine-Saint-Denis', '94': 'Val-de-Marne', '95': 'Val-d’Oise',
}
# communes de l'annuaire sans code postal : département déduit de la ville
CITY_DEPT = {'Angoulême': '16', 'Aubagne': '13', 'Bruges': '33', 'Cognac': '16', 'Dijon': '21', 'Lacanau': '33', 'Lormont': '33', 'Mérignac': '33',
             'Montbéliard': '25', 'Montbeliard': '25', 'Montpellier': '34', 'Nantes': '44', 'Paris': '75', 'Saint-Étienne': '42', 'Saint-Just-Saint-Rambert': '42',
             'Strasbourg': '67', 'Thionville': '57'}


def dept_of(c):
    """Numéro de département d'un cabinet de France métropolitaine."""
    pc = c.get('pc') or ''
    if not pc:
        m = re.search(r'\b(\d{5})\b', c.get('a', ''))
        pc = m.group(1) if m else ''
    if pc:
        if pc.startswith('20'):
            return '2A' if pc[:3] in ('200', '201') else '2B'
        return pc[:2]
    return CITY_DEPT.get(c.get('c', ''), '')


def initials(name):
    parts = [p for p in re.split(r'[\s\-]+', name) if p and p[0].isalpha()]
    return (parts[0][0] + (parts[-1][0] if len(parts) > 1 else '')).upper() if parts else '?'


def ckey(s):
    """Clé de tri alphabétique française : les lettres accentuées se rangent avec leur lettre de base (Béziers avant Brive)."""
    import unicodedata
    return unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()


def grok_img(name):
    """Chemin relatif d'une image Grok déposée dans assets/img/grok (sans extension), ou None tant qu'elle manque."""
    base = f'assets/img/grok/{name}'
    return base if os.path.exists(os.path.join(ROOT, base + '.webp')) else None


def grok_tag(r, base, alt_fr='', alt_en=None, lazy=False, cls='', w=800, h=1000, extra=''):
    """Balise image pour une image Grok (variante 480 px si elle existe)."""
    small = os.path.exists(os.path.join(ROOT, base + '-480.webp'))
    srcset = f' srcset="{r}{base}-480.webp 480w, {r}{base}.webp {w}w" sizes="(max-width: 900px) 92vw, 40vw"' if small else ''
    en = f' data-en-alt="{attr(alt_en)}"' if alt_en else ''
    ld = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    c = f' class="{cls}"' if cls else ''
    return f'<img{c} src="{r}{base}.webp"{srcset} alt="{attr(alt_fr)}"{en} width="{w}" height="{h}"{ld}{extra}>'
