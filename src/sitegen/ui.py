"""Composants de page partagés : ouverture des pages intérieures, bandeau d'appel, cartes, chiffres."""
import os
from .common import bi, bie, esc, attr, ico, ROOT
from .partials import crumbs, CAT


def exists(rel):
    return os.path.exists(os.path.join(ROOT, rel))


def img_tag(r, base, w_list, alt_fr='', alt_en=None, sizes='(max-width: 900px) 92vw, 46vw', cls='', lazy=True, wh=None, extra=''):
    """base : chemin sans le suffixe -<largeur>.webp ; w_list : largeurs disponibles."""
    ws = [w for w in w_list if exists(f'{base}-{w}.webp')] or w_list[:1]
    src = f'{r}{base}-{ws[-1] if len(ws) < 3 else ws[1]}.webp'
    srcset = ', '.join(f'{r}{base}-{w}.webp {w}w' for w in ws)
    en = f' data-en-alt="{attr(alt_en)}"' if alt_en else ''
    w, h = wh or (1600, 1067)
    c = f' class="{cls}"' if cls else ''
    ld = ' loading="lazy"' if lazy else ' fetchpriority="high"'
    return f'<img{c} src="{src}" srcset="{srcset}" sizes="{sizes}" alt="{attr(alt_fr)}"{en} width="{w}" height="{h}"{ld}{extra}>'


def ihero(r, items, title, lead=None, sub=None, media='', icon=None, actions='', facts='', plain=False, tall=False, chip='', hid='page-title', night=False):
    """Ouverture d'une page intérieure. title, lead, sub : (fr, en)."""
    cls = 'ihero' + (' ihero--plain' if plain or not media else '')
    t = bi(*title) if isinstance(title, tuple) else title
    # avec une image, le fil d'Ariane reste en haut, sous l'en-tête, au lieu de flotter au milieu de l'ouverture
    top = f'<div class="wrap">{crumbs(r, items)}</div>' if media else ''
    parts = [] if media else [crumbs(r, items)]
    if chip: parts.append(chip)
    if icon: parts.append(ico(icon, 'ico ihero__icon'))
    parts.append(f'<h1 class="display" id="{hid}" data-reveal>{t}</h1>')
    if sub: parts.append(f'<p class="ihero__sub">{bi(*sub) if isinstance(sub, tuple) else sub}</p>')
    if lead: parts.append(f'<p class="lead">{bi(*lead) if isinstance(lead, tuple) else lead}</p>')
    if facts: parts.append(f'<div class="ihero__facts">{facts}</div>')
    if actions: parts.append(f'<div class="ihero__actions">{actions}</div>')
    m = ''
    if media:
        m = media if media.lstrip().startswith(('<figure', '<div', '<aside')) else f'<figure class="ihero__media{" ihero__media--tall" if tall else ""}">{media}</figure>'
    return f'''<section class="{cls}" data-hero aria-labelledby="{hid}">{top}
  <div class="wrap ihero__grid">
    <div class="ihero__text">{''.join(parts)}</div>{m}
  </div>
</section>'''


def fact(n, fr, en=None):
    return f'<p><b>{n}</b>{bi(fr, en)}</p>'


def btn(href, fr, en=None, ghost=False, extra='', ext=False):
    cls = 'btn btn--ghost' if ghost else 'btn btn--primary'
    dot = '' if ghost else '<span class="btn__dot"></span>'
    tgt = ' target="_blank" rel="noopener"' if ext else ' data-transition'
    if href.startswith('#'): tgt = ''
    return f'<a class="{cls}" href="{href}"{tgt}{extra}>{dot}{bi(fr, en)}</a>'


def cta_band(r, title=('Un projet, une question ?', 'A project or a question?'), lead=('Trouvez le cabinet Exco le plus proche ou demandez un rendez-vous : un expert vous rappelle.', 'Find your nearest Exco office or request a meeting: an expert will call you back.'), filt=''):
    f = f' data-filter="{filt}"' if filt else ''
    return f'''<section class="band band--night cta-band-wrap" aria-labelledby="cta-title">
  <div class="wrap cta-band">
    <div class="prose"><h2 class="h2" id="cta-title" data-reveal>{bi(*title)}</h2><p class="lead">{bi(*lead)}</p></div>
    <div class="cta-band__actions">{btn(r + 'cabinets.html', 'Trouver mon cabinet', 'Find my office', extra=f + ' data-magnetic')}{btn(r + 'contact.html', 'Prendre rendez-vous', 'Book a meeting', ghost=True)}</div>
  </div>
</section>'''


def svc_cards(r, slugs, counts=None):
    out = []
    for s in CAT['services']:
        if s['slug'] not in slugs: continue
        n = ''
        k = s.get('code')
        if counts is not None and k and counts.get(k):
            n = f'<span class="card__n">{bi(str(counts[k]) + " cabinets", str(counts[k]) + " offices")}</span>'
        out.append(f'<li><a class="card" href="{r}services/{s["slug"]}.html" data-transition>{ico(s["icon"])}<span class="card__t">{bie(s["fr"], s["en"])}</span><span class="card__d">{bie(s["dfr"], s["den"])}</span>{n}</a></li>')
    return f'<ul class="{cards_cls(len(out))}">' + ''.join(out) + '</ul>'


def cards_cls(n):
    """Colonnes choisies d'après le nombre de cartes : jamais de rangée orpheline."""
    cols = {1: 2, 2: 2, 3: 3, 4: 4, 5: 3, 6: 3, 7: 4, 8: 4, 9: 3, 10: 5, 11: 4, 12: 4}.get(n, 0)
    return f'cards cards--c{cols}' if cols else 'cards'


def sector_card(r, x, tag='a', notes=True):
    d = f'<p>{bie(x["dfr"], x["den"])}</p>'
    if x['dfr'].startswith('Texte à'):  # description manquante : note de maquette, jamais dans les bandeaux « D'autres secteurs »
        d = f'<p class="review"><span class="chip chip--todo">{bie(x["dfr"], x["den"])}</span></p>' if notes else ''
    return (f'<a class="sector" href="{r}secteurs/{x["slug"]}.html" data-transition><div class="sector__img"><img src="{r}assets/img/grok/{x["img"]}.webp" alt="" loading="lazy" width="800" height="1000" style="width:100%;height:100%;object-fit:cover"></div>'
            f'<h3 class="sector__t">{bie(x["fr"], x["en"])}</h3>{d}</a>')


def bi_div(fr_html, en_html, cls='rich', extra=''):
    """Bloc entier dans chaque langue (les contenus FR et EN n'ont pas la même structure)."""
    if not en_html or en_html == fr_html:
        return f'<div class="{cls}"{extra}>{fr_html}</div>'
    return f'<div class="{cls}" lang="fr"{extra}>{fr_html}</div><div class="{cls}" lang="en"{extra}>{en_html}</div>'


def fr_only_note(what_en='This text is only available in French.'):
    return f'<p class="note" lang="en">{esc(what_en)}</p>'
