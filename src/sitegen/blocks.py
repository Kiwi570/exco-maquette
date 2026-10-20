"""Rendu des blocs de contenu repris d'exco.fr (titres, paragraphes, listes, citations, images) en HTML."""
import os, re
from .common import esc, attr, ROOT


def _img(b, r, cls=''):
    """Image d'article : affichée seulement si la copie locale existe (dimensions réelles lues sur le fichier)."""
    loc = b.get('local')
    if not loc:
        return ''
    base = f'assets/img/actus/{loc}'
    p = os.path.join(ROOT, base + '-1200.webp')
    if not os.path.exists(p):
        return ''
    try:
        from PIL import Image
        w, h = Image.open(p).size
    except Exception:
        w, h = 1200, 800
    alt = attr(b.get('alt', ''))
    return (f'<figure{cls}><img src="{r}{base}-1200.webp" srcset="{r}{base}-800.webp 800w, {r}{base}-1200.webp {w}w" '
            f'sizes="(max-width: 900px) 92vw, 60vw" alt="{alt}" loading="lazy" width="{w}" height="{h}"></figure>')


def li_inner(b):
    """Contenu d'un élément de liste, avec son titre en gras s'il en a un."""
    if b.get('h'):
        return f'<strong>{esc(b["h"])}</strong> {esc(b["t"])}'
    return esc(b['t'])


CAPS_ACC = {'DEVELOPPER': 'DÉVELOPPER', 'ETRE': 'ÊTRE', 'EQUIPE': 'ÉQUIPE', 'ECOUTE': 'ÉCOUTE', 'EXPERIENCE': 'EXPÉRIENCE', 'REUSSITE': 'RÉUSSITE'}


def caps_fix(t):
    """Intertitre tout en capitales : remis en casse de phrase (accents rétablis sur les mots courants)."""
    if not t or not (t.isupper() and len(t) > 8):
        return t
    for a, b in CAPS_ACC.items():
        t = re.sub(rf'\b{a}\b', b, t)
    if t.startswith('A '):
        t = 'À ' + t[2:]
    return t[:1] + t[1:].lower()


def dedupe(blocks):
    """Paragraphes en double ou presque (exco.fr répète parfois un paragraphe à la casse près) : on garde le premier.
    Un long paragraphe qui colle bout à bout les puces qui le suivent (copier-coller d'exco.fr) est retiré aussi."""
    import difflib
    norm = lambda t: re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9àâäçéèêëîïôöùûüœ ]', ' ', t.lower())).strip()
    drop = set()
    for i, b in enumerate(blocks):
        if b['k'] in ('p', 'li') and len(b.get('t', '')) > 250:
            big = norm(b['t'])
            nxt = [x for x in blocks[i + 1:i + 40] if x['k'] in ('li', 'p', 'h3', 'h4') and len(x.get('t', '')) > 20]
            if sum(1 for x in nxt if norm(x['t']) in big) >= 3:
                drop.add(i)
    # la puce retirée gardait parfois un intitulé : il devient le titre de la liste qui suit
    blocks = [({'k': 'label', 't': b['h']} if i in drop and b.get('h') else b) for i, b in enumerate(blocks) if i not in drop or b.get('h')]
    seen, nb = [], []
    for b in blocks:
        t = b.get('t', '')
        if b['k'] == 'p' and len(t) > 60:
            n = re.sub(r'[^a-z0-9àâäçéèêëîïôöùûüœ ]', '', t.lower())
            if any(difflib.SequenceMatcher(None, n, o).ratio() > .86 for o in seen):
                continue
            seen.append(n)
        nb.append(b)
    return nb


def render(blocks, r='', lead_first=False, ids=False, demote=0):
    """Transforme une liste de blocs en HTML (contenu de .rich).
    lead_first : le premier paragraphe devient un chapeau.
    ids : ajoute des ancres aux intertitres h2 (sommaire).
    demote : décale le niveau des titres (h2 -> h3 si 1)."""
    out, ul = [], []
    first_p = lead_first
    n_h = 0

    def flush():
        if ul:
            out.append('<ul>' + ''.join(f'<li>{li_inner(x)}</li>' for x in ul) + '</ul>')
            ul.clear()

    imgs = []

    def flush_imgs():
        if not imgs: return
        figs = [x for x in (_img(b, r) for b in imgs) if x]
        imgs.clear()
        if len(figs) >= 2:
            out.append('<div class="gallery">' + ''.join(figs) + '</div>')
        elif figs:
            out.append(figs[0])

    LV = {'h1': 2, 'h2': 2, 'h3': 3, 'h4': 4, 'h5': 4, 'h6': 4}
    # intertitres réduits à un numéro (« 1. ») : on les retire, le court libellé qui suit devient un intitulé en gras
    nb, lab = [], False
    for b in blocks:
        if b['k'] in LV and re.fullmatch(r'\s*\d{1,2}\s*[.)]?\s*', b.get('t', '')):
            lab = True; continue
        if lab and b['k'] == 'p' and len(b['t']) <= 40:
            nb.append({'k': 'label', 't': b['t']}); lab = False; continue
        lab = False; nb.append(b)
    blocks = nb
    blocks = dedupe(blocks)
    prev = 1 + demote
    # niveaux continus : le plus haut intertitre du contenu prend le niveau attendu (pas de saut h2 > h4)
    used = [LV[b['k']] for b in blocks if b['k'] in LV and len(b.get('t', '')) <= 110]
    shift = (2 + demote) - min(used) if used else demote
    lead_done = not lead_first

    for b in blocks:
        k = b['k']
        if k == 'img':
            flush(); imgs.append(b); continue
        flush_imgs()
        if k == 'li':
            ul.append(b); continue
        flush()
        if k == 'ul':
            out.append('<ul>' + ''.join(f'<li>{esc(t)}</li>' for t in b['items']) + '</ul>')
        elif k in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            t = caps_fix(b['t'])
            lvl = max(2, min(LV[k] + shift, 4, prev + 1))
            # sur exco.fr, des phrases entières sont mises en titre pour la graisse : la première devient le chapeau, les suivantes un paragraphe appuyé
            if len(t) > 110:
                if not lead_done or first_p or not out:
                    out.append(f'<p class="rich__lead">{esc(t)}</p>'); first_p = False; lead_done = True
                else:
                    out.append(f'<p class="rich__em">{esc(t)}</p>')
                continue
            idattr = ''
            if ids and lvl == 2:
                n_h += 1
                idattr = f' id="s{n_h}"'
            out.append(f'<h{lvl}{idattr}>{esc(t)}</h{lvl}>'); prev = lvl
        elif k == 'label':
            out.append(f'<p class="rich__k">{esc(b["t"])}</p>')
        elif k == 'quote':
            out.append(f'<blockquote>{esc(b["t"])}</blockquote>')
        else:
            cls = ''
            if first_p:
                cls = ' class="rich__lead"'; first_p = False; lead_done = True
            out.append(f'<p{cls}>{esc(b["t"])}</p>')
    flush(); flush_imgs()
    return ''.join(x for x in out if x)


def toc(blocks):
    """Sommaire : (ancre, texte) des intertitres h2 courts."""
    res, n = [], 0
    for b in blocks:
        if b['k'] in ('h1', 'h2') and len(b['t']) <= 110:
            n += 1
            res.append((f's{n}', b['t']))
    return res


def sections(blocks, cut=None):
    """Découpe une page en sections à chaque h2 (le texte avant le premier h2 forme l'introduction).
    cut : texte d'un titre à partir duquel on ignore la suite (pied de page générique d'exco.fr)."""
    secs, cur = [], {'h': None, 'blocks': []}
    for b in blocks:
        if cut and b.get('t', '').startswith(cut):
            break
        if b['k'] in ('h2',) and len(b['t']) <= 110:
            if cur['h'] or cur['blocks']:
                secs.append(cur)
            cur = {'h': b['t'], 'blocks': []}
        else:
            cur['blocks'].append(b)
    if cur['h'] or cur['blocks']:
        secs.append(cur)
    return secs


def short_items(blocks, max_len=90):
    """Vrai si les blocs forment une suite d'éléments courts (liste déguisée en paragraphes)."""
    ts = [b for b in blocks if b['k'] in ('p', 'li', 'div')]
    return len(ts) >= 3 and len(ts) == len([b for b in blocks if b['k'] != 'img']) and all(len(b['t']) <= max_len for b in ts)
