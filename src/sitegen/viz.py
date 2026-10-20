"""Visuels animés en code (v13) : une planche par section de texte qui n'avait pas d'image.

Chaque planche est une figure « feuille de tableur » (quadrillage léger) qui contient un dessin SVG
généré ici, au trait, dans le vocabulaire du métier : grand livre pointé, tableau de bord, planning,
fourchette d'évaluation, cycle de paie… Le dessin est complet sans JavaScript ; fx-viz.js l'anime
à l'arrivée à l'écran (attributs data-a et data-t) et, pour quelques planches, ajoute une boucle discrète.
Les cartes (data-viz="map") sont dessinées par fx-viz.js à partir de map.json et de l'annuaire.
Aucune donnée inventée : les chiffres et libellés viennent des textes d'exco.fr ou de l'annuaire."""
import math, re
from .common import bi, bie, esc, attr

W, H = 400, 300


def _f(v):
    return f'{v:.1f}'.rstrip('0').rstrip('.')


def wrap(text, n):
    """Coupe un libellé en lignes d'au plus n caractères (sans couper les mots)."""
    out, cur = [], ''
    words = []
    for w in text.split():  # mot composé trop long : coupé après le trait d'union
        words += [x + '-' for x in w.split('-')[:-1]] + [w.split('-')[-1]] if len(w) > n and '-' in w else [w]
    for w in words:
        if cur and len(cur) + 1 + len(w) > n:
            out.append(cur); cur = w
        else:
            cur = (cur + ('' if cur.endswith('-') else ' ') + w).strip()
    if cur: out.append(cur)
    return out


def svg_text(x, y, fr, en=None, n=16, cls='v-t', anchor='middle', lh=13.5, extra=''):
    """Texte SVG bilingue sur plusieurs lignes (deux <text>, l'un masqué selon la langue)."""
    def one(t, lang):
        lines = wrap(t, n)
        ts = ''.join(f'<tspan x="{_f(x)}" dy="{0 if i == 0 else lh}">{esc(l)}</tspan>' for i, l in enumerate(lines))
        la = f' lang="{lang}"' if lang else ''
        return f'<text class="{cls}" x="{_f(x)}" y="{_f(y)}" text-anchor="{anchor}"{la}{extra}>{ts}</text>'
    if en is None or en == fr:
        return one(fr, None)
    return one(fr, 'fr') + one(en, 'en')


def svg(inner, vb=(W, H), cls=''):
    c = f' class="{cls}"' if cls else ''
    return f'<svg{c} viewBox="0 0 {vb[0]} {vb[1]}" aria-hidden="true" focusable="false">{inner}</svg>'


def plate(kind, inner, cap=None, mod='', data=''):
    """La planche : un cadre quadrillé et une légende éventuelle (sinon le visuel est décoratif)."""
    capt = f'<figcaption class="viz__cap">{cap}</figcaption>' if cap else ''
    aria = '' if cap else ' aria-hidden="true"'
    m = f' viz--{mod}' if mod else ''
    return f'<figure class="viz viz--{kind}{m}" data-viz="{kind}"{data}{aria}><div class="viz__stage">{inner}</div>{capt}</figure>'


def key(kind):
    return f'<span class="viz__key viz__key--{kind}" aria-hidden="true"></span>'


# ---------- grand livre pointé (audit, contrôle) ----------
def ledger(mode='check'):
    o = ['<rect class="v-sheet" x="78" y="20" width="244" height="262" rx="5"/>',
         '<line class="v-ink v-w3" x1="100" y1="46" x2="196" y2="46" data-a="draw" data-t="0"/>',
         '<line class="v-txt" x1="100" y1="60" x2="152" y2="60" data-a="draw" data-t=".1"/>',
         '<line class="v-rule" x1="236" y1="74" x2="236" y2="246"/>']
    L = [96, 70, 110, 84, 60, 102, 78]
    A = [40, 28, 46, 34, 22, 38, 30]
    flag = 3 if mode == 'anomaly' else -1
    for i in range(7):
        y = 88 + i * 24
        t = .15 + i * .06
        if i == flag:
            o.append(f'<rect class="v-hl" x="92" y="{y - 11}" width="222" height="22" rx="3" data-a="fade" data-t="1.3"/>')
        o.append(f'<line class="v-txt" x1="100" y1="{y}" x2="{100 + L[i]}" y2="{y}" data-a="draw" data-t="{t:.2f}"/>')
        o.append(f'<line class="v-num" x1="{300 - A[i]}" y1="{y}" x2="300" y2="{y}" data-a="draw" data-t="{t + .05:.2f}"/>')
        if i == flag:
            o.append(f'<ellipse class="v-or v-w2" cx="{300 - A[i] / 2}" cy="{y}" rx="{A[i] / 2 + 12}" ry="13" data-a="draw" data-t="1.5"/>')
        else:
            o.append(f'<path class="v-or v-w2" d="M{306},{y - 1} l4,4 l8,-9" data-a="draw" data-t="{.75 + i * .16:.2f}"/>')
    yt = 88 + 7 * 24
    o += [f'<line class="v-txt" x1="100" y1="{yt}" x2="160" y2="{yt}" data-a="draw" data-t=".6"/>',
          f'<line class="v-ink v-w5" x1="250" y1="{yt}" x2="300" y2="{yt}" data-a="draw" data-t=".7"/>',
          f'<line class="v-ink v-w1" x1="248" y1="{yt + 10}" x2="302" y2="{yt + 10}" data-a="draw" data-t="1.9"/>',
          f'<line class="v-ink v-w1" x1="248" y1="{yt + 14}" x2="302" y2="{yt + 14}" data-a="draw" data-t="2"/>',
          '<g class="v-mag" data-loop="mag" transform="translate(268,92)"><circle class="v-lens" cx="0" cy="0" r="24"/><line class="v-ink v-w4" x1="17" y1="17" x2="34" y2="34"/></g>']
    return plate('ledger', svg(''.join(o)), mod=mode)


# ---------- tableau de bord ----------
def _smooth(pts):
    """Courbe lissée (Catmull-Rom) passant par les points."""
    d = f'M{_f(pts[0][0])},{_f(pts[0][1])}'
    for i in range(len(pts) - 1):
        p0 = pts[i - 1] if i else pts[i]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[i + 2] if i + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{_f(c1[0])},{_f(c1[1])} {_f(c2[0])},{_f(c2[1])} {_f(p2[0])},{_f(p2[1])}'
    return d


def dash(variant='bars'):
    o = ['<rect class="v-sheet" x="22" y="20" width="356" height="262" rx="10"/>']
    if variant == 'bars':
        for k, (x, w) in enumerate([(42, 58), (148, 44), (254, 66)]):
            o.append(f'<rect class="v-tile" x="{x}" y="40" width="104" height="58" rx="7" data-a="fade" data-t="{k * .1:.1f}"/>')
            o.append(f'<line class="v-txt" x1="{x + 14}" y1="58" x2="{x + 54}" y2="58" data-a="draw" data-t="{.1 + k * .1:.1f}"/>')
            o.append(f'<line class="{"v-orl" if k == 2 else "v-ink"} v-w7" x1="{x + 14}" y1="80" x2="{x + 14 + w}" y2="80" data-a="draw" data-t="{.25 + k * .1:.2f}"/>')
        top, base = 122, 258
        hs = [34, 48, 42, 60, 54, 72, 66, 84, 80, 100]
        pts = []
        for i, h in enumerate(hs):
            x = 50 + i * 31
            o.append(f'<rect class="{"v-fo" if i == len(hs) - 1 else "v-fi"}" x="{x}" y="{base - h}" width="17" height="{h}" rx="2" data-a="grow" data-t="{.4 + i * .06:.2f}"/>')
            pts.append((x + 8.5, base - h - 12))
        o.insert(1, f'<line class="v-rule" x1="40" y1="{base}" x2="360" y2="{base}"/>')
        for gy in (150, 190, 226):
            o.insert(1, f'<line class="v-grid" x1="40" y1="{gy}" x2="360" y2="{gy}"/>')
        o.append(f'<path class="v-bl v-w2" d="{_smooth(pts)}" data-a="draw" data-t="1"/>')
        o.append(f'<circle class="v-fo" cx="{_f(pts[-1][0])}" cy="{_f(pts[-1][1])}" r="5" data-a="pop" data-t="1.9"/>')
    elif variant == 'volatile':
        o += ['<line class="v-ink v-w3" x1="44" y1="48" x2="140" y2="48" data-a="draw" data-t="0"/>',
              '<line class="v-txt" x1="44" y1="64" x2="104" y2="64" data-a="draw" data-t=".1"/>']
        for gy in (110, 160, 210, 256):
            o.append(f'<line class="v-grid" x1="40" y1="{gy}" x2="360" y2="{gy}"/>')
        o.append('<rect class="v-band" x="200" y="146" width="160" height="44" data-a="growx" data-t="1.2"/>')
        P = [(40, 170), (62, 120), (84, 214), (106, 104), (128, 226), (150, 132), (172, 200), (196, 150), (218, 182), (242, 158), (266, 176), (292, 162), (318, 170), (344, 160), (360, 164)]
        o.append(f'<path class="v-ink v-w2" d="{_smooth(P)}" data-a="draw" data-t=".3"/>')
        for k, (x, y) in enumerate(P[1:7]):
            o.append(f'<circle class="v-dot" cx="{x}" cy="{y}" r="3.5" data-a="pop" data-t="{.5 + k * .12:.2f}"/>')
        o.append('<circle class="v-fo" cx="360" cy="164" r="5.5" data-a="pop" data-t="1.9"/>')
    else:  # jcurve
        for gy in (90, 140, 236, 266):
            o.append(f'<line class="v-grid" x1="40" y1="{gy}" x2="360" y2="{gy}"/>')
        o.append('<line class="v-rule v-dash" x1="40" y1="190" x2="360" y2="190"/>')
        P = [(44, 190), (90, 222), (136, 236), (180, 218), (222, 176), (262, 122), (300, 80), (344, 44)]
        o.append(f'<path class="v-ink v-w3" d="{_smooth(P)}" data-a="draw" data-t=".2"/>')
        for k, (x, y) in enumerate(P[1:-1]):
            o.append(f'<circle class="v-dot" cx="{x}" cy="{y}" r="3.5" data-a="pop" data-t="{.4 + k * .14:.2f}"/>')
        o.append('<path class="v-or v-w3" d="M332,40 L346,43 L340,56" data-a="draw" data-t="1.6"/>')
        o.append('<circle class="v-fo" cx="344" cy="44" r="5" data-a="pop" data-t="1.5"/>')
    return plate('dash', svg(''.join(o)), mod=variant)


# ---------- parcours par étapes (libellés tirés du texte) ----------
def path(steps):
    """steps : liste de (fr, en). Les jalons sont numérotés : c'est une suite réelle d'étapes."""
    n = len(steps)
    xs = [56 + i * (288 / (n - 1)) for i in range(n)]
    ys = [228 - i * (150 / (n - 1)) + (16 if i % 2 else -6) for i in range(n)]
    pts = list(zip(xs, ys))
    full = [(8, ys[0] + 6)] + pts + [(390, ys[-1] - 28)]
    o = [f'<path class="v-track" d="{_smooth(full)}"/>',
         f'<path class="v-ink v-w2" d="{_smooth(full)}" data-a="draw" data-t="0" data-run/>',
         f'<circle class="v-runner" r="5" cx="8" cy="{_f(ys[0] + 6)}" opacity="0" data-loop="run"/>']
    ch = 15 if n <= 4 else 12
    for i, (x, y) in enumerate(pts):
        t = (i + 1) / (n + 1) * .85
        o.append(f'<circle class="v-node{" v-node--last" if i == n - 1 else ""}" cx="{_f(x)}" cy="{_f(y)}" r="12" data-a="pop" data-t="{t:.2f}"/>')
        o.append(f'<text class="v-nn" x="{_f(x)}" y="{_f(y + 4)}" text-anchor="middle" data-a="fade" data-t="{t + .1:.2f}">{i + 1}</text>')
        fr, en = steps[i]
        lines = max(len(wrap(fr, ch)), len(wrap(en or fr, ch)))
        below = i % 2 == 1 or i == 0
        ty = y + 30 if below else y - 22 - (lines - 1) * 13
        o.append(f'<g data-a="fade" data-t="{t + .15:.2f}">{svg_text(x, ty, fr, en, n=ch, cls="v-t", lh=13)}</g>')
    return plate('path', svg(''.join(o)))


# ---------- fourchette d'évaluation (« football field ») ----------
def range_chart():
    o = []
    for k in range(9):
        x = 40 + k * 40
        o.append(f'<line class="v-grid" x1="{x}" y1="44" x2="{x}" y2="232"/>')
    rows = [(96, 262), (130, 300), (84, 230), (150, 286)]
    o.append('<rect class="v-band v-band--o" x="150" y="44" width="80" height="188" data-a="fade" data-t="1.1"/>')
    for i, (a, b) in enumerate(rows):
        y = 60 + i * 42
        o.append(f'<rect class="v-trackbar" x="40" y="{y}" width="320" height="18" rx="9"/>')
        o.append(f'<rect class="{"v-fb" if i % 2 else "v-fi"}" x="{a}" y="{y}" width="{b - a}" height="18" rx="9" data-a="growx" data-t="{.2 + i * .15:.2f}"/>')
    o += ['<line class="v-or v-w2" x1="150" y1="40" x2="150" y2="236" data-a="draw" data-t="1.2"/>',
          '<line class="v-or v-w2" x1="230" y1="40" x2="230" y2="236" data-a="draw" data-t="1.2"/>',
          '<line class="v-rule" x1="40" y1="252" x2="360" y2="252"/>']
    for k in range(9):
        x = 40 + k * 40
        o.append(f'<line class="v-rule" x1="{x}" y1="248" x2="{x}" y2="256"/>')
    o.append('<path class="v-fo" d="M190,240 l9,13 h-18z" data-a="pop" data-t="1.6"/>')
    return plate('range', svg(''.join(o)))


# ---------- balance (équité) ----------
def balance():
    coins = ''.join(f'<rect class="v-coin" x="{-24}" y="{-10 - k * 9}" width="48" height="8" rx="4"/>' for k in range(4))
    doc = ('<rect class="v-sheet" x="-22" y="-52" width="44" height="54" rx="3"/>'
           '<line class="v-txt v-w4" x1="-13" y1="-38" x2="11" y2="-38"/><line class="v-txt v-w4" x1="-13" y1="-26" x2="6" y2="-26"/><line class="v-txt v-w4" x1="-13" y1="-14" x2="9" y2="-14"/>')
    pan = lambda inner: (f'<line class="v-ink v-w1" x1="0" y1="0" x2="-34" y2="64"/><line class="v-ink v-w1" x1="0" y1="0" x2="34" y2="64"/>'
                         f'<path class="v-pan" d="M-46,64 Q0,92 46,64Z"/><g transform="translate(0,62)">{inner}</g>')
    o = ['<rect class="v-fi" x="150" y="252" width="100" height="12" rx="4"/>',
         '<path class="v-fi" d="M190,252 L196,104 h8 L210,252Z"/>',
         '<g data-beam><line class="v-ink v-w4" x1="84" y1="104" x2="316" y2="104"/><circle class="v-fo" cx="200" cy="104" r="9"/></g>',
         f'<g data-pan="l" transform="translate(84,104)">{pan(coins)}</g>',
         f'<g data-pan="r" transform="translate(316,104)">{pan(doc)}</g>']
    return plate('balance', svg(''.join(o)))


# ---------- constellation (écosystème, interlocuteur unique) ----------
def orbit(center=None):
    o = ['<circle class="v-orbit" cx="200" cy="150" r="74"/>', '<circle class="v-orbit" cx="200" cy="150" r="122"/>']
    g1, g2 = [], []
    for k in range(5):
        a = -math.pi / 2 + k * 2 * math.pi / 5
        x, y = 200 + 74 * math.cos(a), 150 + 74 * math.sin(a)
        g1.append(f'<line class="v-link" x1="200" y1="150" x2="{_f(x)}" y2="{_f(y)}" data-a="draw" data-t="{.3 + k * .08:.2f}"/>')
        g1.append(f'<circle class="v-fi" cx="{_f(x)}" cy="{_f(y)}" r="8" data-a="pop" data-t="{.5 + k * .08:.2f}"/>')
    for k in range(9):
        a = k * 2 * math.pi / 9 + .3
        x, y = 200 + 122 * math.cos(a), 150 + 122 * math.sin(a)
        g2.append(f'<circle class="{"v-fb" if k % 3 else "v-fo"}" cx="{_f(x)}" cy="{_f(y)}" r="{6 if k % 3 else 7}" data-a="pop" data-t="{.9 + k * .06:.2f}"/>')
    o.append(f'<g data-spin="1">{"".join(g2)}</g><g data-spin="-1">{"".join(g1)}</g>')
    o.append('<circle class="v-ring" cx="200" cy="150" r="30" data-a="draw" data-t=".1"/>')
    o.append('<circle class="v-fo" cx="200" cy="150" r="21" data-a="pop" data-t="0"/>')
    return plate('orbit', svg(''.join(o)))


def metiers(cur, others):
    """Le métier de la page au centre, les quatre autres métiers du cabinet autour (catalogue du site)."""
    o = ['<circle class="v-orbit" cx="200" cy="150" r="106"/>']
    n = len(others)
    for k, (fr, en) in enumerate(others):
        a = -math.pi / 2 + math.pi / n + k * 2 * math.pi / n
        x, y = 200 + 106 * math.cos(a), 150 + 106 * math.sin(a) * .92
        o.append(f'<line class="v-link" x1="200" y1="150" x2="{_f(x)}" y2="{_f(y)}" data-a="draw" data-t="{.3 + k * .1:.2f}"/>')
        o.append(f'<circle class="v-sat" cx="{_f(x)}" cy="{_f(y)}" r="41" data-a="pop" data-t="{.5 + k * .1:.2f}"/>')
        nl = max(len(wrap(fr, 11)), len(wrap(en, 11)))
        o.append(f'<g data-a="fade" data-t="{.65 + k * .1:.2f}">{svg_text(x, y + 4 - (nl - 1) * 6, fr, en, n=11, cls="v-t v-t--s", lh=12)}</g>')
    nl = max(len(wrap(cur[0], 12)), len(wrap(cur[1], 12)))
    o.append('<circle class="v-ring" cx="200" cy="150" r="58" data-a="draw" data-t=".1"/>')
    o.append('<circle class="v-fi" cx="200" cy="150" r="51" data-a="pop" data-t="0"/>')
    o.append(f'<g data-a="fade" data-t=".2">{svg_text(200, 155 - (nl - 1) * 7, cur[0], cur[1], n=12, cls="v-t v-t--inv", lh=14)}</g>')
    return plate('metiers', svg(''.join(o)))


# ---------- tableau d'enquête (forensics) ----------
def threads():
    cards = [(40, 46, -3), (156, 30, 2), (276, 50, -2), (56, 168, 2), (176, 150, -3), (290, 178, 3)]
    o = ['<rect class="v-board" x="16" y="14" width="368" height="272" rx="10"/>']
    pins = []
    for k, (x, y, r) in enumerate(cards):
        hl = ' v-card--hl' if k == 4 else ''
        o.append(f'<g transform="rotate({r} {x + 42} {y + 30})" data-a="fade" data-t="{k * .08:.2f}"><rect class="v-card{hl}" x="{x}" y="{y}" width="84" height="60" rx="3"/>'
                 f'<line class="v-txt v-w4" x1="{x + 12}" y1="{y + 22}" x2="{x + 66}" y2="{y + 22}"/><line class="v-txt v-w4" x1="{x + 12}" y1="{y + 34}" x2="{x + 54}" y2="{y + 34}"/><line class="v-txt v-w4" x1="{x + 12}" y1="{y + 46}" x2="{x + 60}" y2="{y + 46}"/></g>')
        pins.append((x + 42, y + 6))
    seq = [0, 4, 1, 4, 2, 5, 4, 3]
    d = 'M' + ' L'.join(f'{pins[i][0]},{pins[i][1]}' for i in seq)
    o.append(f'<path class="v-thread" d="{d}" data-a="draw" data-t=".6"/>')
    for k, (x, y) in enumerate(pins):
        o.append(f'<circle class="v-pin" cx="{x}" cy="{y}" r="5.5" data-a="pop" data-t="{.4 + k * .06:.2f}"/>')
    return plate('threads', svg(''.join(o)))


# ---------- anneaux (trois dimensions) ----------
def rings(labels):
    cx, cy = 262, 152
    R = [112, 84, 56]
    cls = ['v-rb', 'v-ro', 'v-ri']
    o = []
    for k, r in enumerate(R):
        o.append(f'<circle class="v-rtrack" cx="{cx}" cy="{cy}" r="{r}"/>')
        o.append(f'<path class="{cls[k]}" d="M{cx},{cy - r} a{r},{r} 0 1 1 -0.01,0" data-a="draw" data-t="{.15 + k * .35:.2f}"/>')
        fr, en = labels[k]
        y = cy - r
        o.append(f'<line class="v-link" x1="{cx - 4}" y1="{y}" x2="132" y2="{y}" data-a="draw" data-t="{.5 + k * .35:.2f}"/>')
        o.append(f'<circle class="v-fi" cx="{cx}" cy="{y}" r="4" data-a="pop" data-t="{.55 + k * .35:.2f}"/>')
        o.append(f'<g data-a="fade" data-t="{.6 + k * .35:.2f}">{svg_text(124, y + 4, fr, en, n=18, cls="v-t v-t--l", anchor="end")}</g>')
    o.append(f'<circle class="v-fo" cx="{cx}" cy="{cy}" r="10" data-a="pop" data-t="1.4"/>')
    return plate('rings', svg(''.join(o)))


# ---------- ADN (double hélice, une barreau par trait de l'ADN du groupe) ----------
def helix(n):
    n = max(3, min(n, 9))
    # image fixe (avant JavaScript ou mouvement réduit) : même calcul que fx-viz.js, phase 0,6
    ph, amp = .6, 78
    ys = [24 + i * 11 for i in range(33)]
    rungs = [40 + k * (320 / (n - 1)) for k in range(n)]
    s = []
    for y in rungs:
        a = ph + y * .03
        xa, xb = 150 + amp * math.sin(a), 150 - amp * math.sin(a)
        s.append(f'<line class="v-rung" x1="{_f(xa)}" y1="{_f(y)}" x2="{_f(xb)}" y2="{_f(y)}"/><circle class="v-fo" cx="150" cy="{_f(y)}" r="3.5"/>')
    for y in ys:
        a = ph + y * .03
        for sign, c in ((1, 'v-fi'), (-1, 'v-fb')):
            z = math.cos(a) * sign
            s.append(f'<circle class="{c}" cx="{_f(150 + sign * amp * math.sin(a))}" cy="{y}" r="{_f(3 + 1.6 * z)}" opacity="{_f(.4 + .3 * (z + 1))}"/>')
    o = [f'<g data-helix="{n}">{"".join(s)}</g>']
    return plate('helix', svg(''.join(o), vb=(300, 400)))


# ---------- planning de chantier (BTP) ----------
def gantt():
    o = []
    for c in range(13):
        x = 40 + c * 26.5
        o.append(f'<line class="v-grid" x1="{_f(x)}" y1="40" x2="{_f(x)}" y2="262"/>')
    for rr in range(7):
        y = 40 + rr * 37
        o.append(f'<line class="v-grid" x1="40" y1="{y}" x2="358" y2="{y}"/>')
    bars = [(0, 3), (2, 4), (5, 3), (6, 4), (8, 3), (10, 2)]
    for i, (s, l) in enumerate(bars):
        x = 40 + s * 26.5 + 3; y = 50 + i * 37; w = l * 26.5 - 6
        c = 'v-fo' if i == len(bars) - 1 else ('v-fb' if i % 2 else 'v-fi')
        o.append(f'<rect class="{c}" x="{_f(x)}" y="{y}" width="{_f(w)}" height="17" rx="4" data-a="growx" data-t="{.15 + i * .16:.2f}"/>')
        if i < len(bars) - 1:
            s2 = bars[i + 1][0]; x2 = 40 + s2 * 26.5 + 3
            xe = x + w
            o.append(f'<path class="v-link" d="M{_f(xe)},{y + 8.5} h8 V{y + 37 + 8.5} H{_f(x2)}" data-a="draw" data-t="{.35 + i * .16:.2f}"/>')
    o.append('<g data-loop="today" transform="translate(200,0)"><line class="v-or v-w2 v-dash" x1="0" y1="32" x2="0" y2="270"/><path class="v-fo" d="M-6,28 h12 l-6,8z"/></g>')
    return plate('gantt', svg(''.join(o)))


# ---------- cycle de paie (douze mois) ----------
def cycle():
    cx, cy, r = 200, 152, 108
    M = 'JFMAMJJASOND'
    o = [f'<circle class="v-rtrack v-rtrack--thin" cx="{cx}" cy="{cy}" r="{r}"/>']
    for k in range(12):
        a = -math.pi / 2 + k * math.pi / 6
        x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        tx, ty = cx + (r + 20) * math.cos(a), cy + (r + 20) * math.sin(a)
        o.append(f'<circle class="v-mdot" cx="{_f(x)}" cy="{_f(y)}" r="6" data-m="{k}" data-a="pop" data-t="{.1 + k * .05:.2f}"/>')
        o.append(f'<text class="v-t v-t--s" x="{_f(tx)}" y="{_f(ty + 4)}" text-anchor="middle" data-a="fade" data-t="{.1 + k * .05:.2f}">{M[k]}</text>')
    o.append(f'<g data-loop="hand" transform="translate({cx},{cy})"><line class="v-ink v-w3" x1="0" y1="0" x2="0" y2="-84"/><circle class="v-fi" cx="0" cy="0" r="7"/></g>')
    o.append(f'<g data-a="fade" data-t=".6"><rect class="v-sheet" x="{cx - 26}" y="{cy + 22}" width="52" height="62" rx="3"/>'
             f'<line class="v-ink v-w3" x1="{cx - 16}" y1="{cy + 36}" x2="{cx + 8}" y2="{cy + 36}"/>'
             + ''.join(f'<line class="v-txt v-w4" x1="{cx - 16}" y1="{cy + 48 + k * 9}" x2="{cx + 16 - (k % 2) * 8}" y2="{cy + 48 + k * 9}"/>' for k in range(3))
             + f'<line class="v-orl v-w4" x1="{cx + 2}" y1="{cy + 76}" x2="{cx + 16}" y2="{cy + 76}"/></g>')
    return plate('cycle', svg(''.join(o)))


# ---------- acte (juridique) ----------
def doc():
    o = ['<path class="v-sheet" d="M108,22 h150 l34,34 v222 h-184z"/>', '<path class="v-sheet2" d="M258,22 v34 h34"/>',
         '<line class="v-ink v-w3" x1="128" y1="52" x2="214" y2="52" data-a="draw" data-t="0"/>']
    y = 78
    for blk in range(3):
        o.append(f'<text class="v-para" x="126" y="{y + 9}" data-a="fade" data-t="{.15 + blk * .2:.2f}">§</text>')
        for k, w in enumerate([118, 104, 126][: 3 - (blk == 2)]):
            o.append(f'<line class="v-txt" x1="146" y1="{y + k * 14}" x2="{146 + w}" y2="{y + k * 14}" data-a="draw" data-t="{.2 + blk * .2 + k * .05:.2f}"/>')
        y += 52
    o.append('<path class="v-ink v-w2" d="M128,252 c10,-18 18,-20 22,-6 s10,10 18,-8 s12,-6 14,4 s8,4 20,-6" data-a="draw" data-t="1"/>')
    o.append('<g transform="translate(268,232) rotate(-14)"><g data-stamp><circle class="v-stamp" r="32"/><circle class="v-or v-w1 v-dash" r="24"/><path class="v-or v-w3" d="M-11,0 l7,7 l15,-16"/></g></g>')
    return plate('doc', svg(''.join(o)))


# ---------- bouclier (risques maîtrisés) ----------
def shield():
    o = []
    for k, (x, y) in enumerate([(70, 70), (330, 84), (52, 196), (348, 214), (118, 268), (288, 270), (200, 26), (96, 132)]):
        o.append(f'<circle class="v-risk" cx="{x}" cy="{y}" r="5" data-a="pop" data-t="{k * .05:.2f}"/>')
    o += ['<circle class="v-pulse" cx="200" cy="150" r="96" data-loop="pulse"/>',
          '<path class="v-shield" d="M200,44 L284,74 V150 C284,206 248,240 200,262 C152,240 116,206 116,150 V74Z" data-a="draw" data-t=".2"/>',
          '<path class="v-ink v-w2" d="M200,62 L268,86 V150 C268,196 240,224 200,244 C160,224 132,196 132,150 V86Z" opacity=".35" data-a="draw" data-t=".5"/>',
          '<path class="v-or v-w5" d="M170,152 l22,22 l42,-46" data-a="draw" data-t="1.2"/>']
    return plate('shield', svg(''.join(o)))


# ---------- documents nommés (actes, outils) ----------
def trio(items):
    n = len(items)
    w, h, gap = 92, 118, 30 if n == 3 else 60
    x0 = (W - (n * w + (n - 1) * gap)) / 2
    o = []
    for k, (fr, en) in enumerate(items):
        x = x0 + k * (w + gap); y = 34
        t = k * .25
        o.append(f'<g data-a="rise" data-t="{t:.2f}"><path class="v-sheet" d="M{_f(x)},{y} h{w - 20} l20,20 v{h - 20} h-{w}z"/>'
                 f'<line class="v-ink v-w3" x1="{_f(x + 14)}" y1="{y + 24}" x2="{_f(x + 52)}" y2="{y + 24}"/>'
                 + ''.join(f'<line class="v-txt v-w4" x1="{_f(x + 14)}" y1="{y + 42 + j * 13}" x2="{_f(x + w - 16 - (j % 2) * 14)}" y2="{y + 42 + j * 13}"/>' for j in range(4))
                 + '</g>')
        o.append(f'<g data-a="pop" data-t="{t + .5:.2f}" transform="translate({_f(x + w - 8)},{y + h - 6})"><circle class="v-fo" r="15"/><path class="v-inv v-w3" d="M-6,0 l4,4 l8,-9"/></g>')
        o.append(f'<g data-a="fade" data-t="{t + .3:.2f}">{svg_text(x + w / 2, y + h + 34, fr, en, n=15 if n == 3 else 18, cls="v-t", lh=14)}</g>')
    return plate('trio', svg(''.join(o)))


# ---------- marches (montée en expertise) ----------
def steps():
    pts = [(36, 258)]
    x, y = 36, 258
    for k in range(5):
        x += 58; pts.append((x, y)); y -= 40; pts.append((x, y))
    pts.append((372, y))
    d = 'M' + ' L'.join(f'{a},{b}' for a, b in pts)
    o = [f'<path class="v-track" d="{d}" transform="translate(6,8)"/>',
         f'<path class="v-ink v-w3" d="{d}" data-a="draw" data-t="0" data-run/>',
         '<circle class="v-runner" r="5" cx="36" cy="258" opacity="0" data-loop="run"/>']
    for k in range(5):
        cx, cy = pts[2 + 2 * k]
        o.append(f'<circle class="{"v-fo" if k == 4 else "v-node"}" cx="{cx}" cy="{cy}" r="{9 if k == 4 else 7}" data-a="pop" data-t="{.3 + k * .22:.2f}"/>')
    o.append(f'<path class="v-or v-w3" d="M356,{y - 10} L372,{y} L356,{y + 10}" data-a="draw" data-t="1.4"/>')
    return plate('steps', svg(''.join(o)))


# ---------- un réseau de points, un cabinet en gros plan ----------
def swarm(n, cap, hi=True):
    s = 12.5 if hi else 18
    P = []
    for j in range(-14, 15):
        for i in range(-14, 15):
            x = i * s + (s / 2 if j % 2 else 0); y = j * s * .866
            P.append((math.hypot(x, y), x, y))
    P.sort()
    P = P[:n]
    cx0 = 140 if hi else 200
    o = []
    if not hi:
        for k, (_, x, y) in enumerate(P):
            o.append(f'<circle class="{"v-fo" if k == 0 else "v-fi"}" cx="{_f(cx0 + x)}" cy="{_f(150 + y)}" r="5.5" data-a="pop" data-t="{_f(.012 * k)}"/>')
        return plate('swarm', svg(''.join(o)), cap=cap)
    hi = min(range(n), key=lambda k: abs(P[k][1] - 40) + abs(P[k][2] + 30))
    for k, (_, x, y) in enumerate(P):
        if k == hi: continue
        o.append(f'<circle class="v-fi" cx="{_f(cx0 + x)}" cy="{_f(150 + y)}" r="4" data-a="pop" data-t="{_f(.008 * k)}"/>')
    hx, hy = cx0 + P[hi][1], 150 + P[hi][2]
    o += [f'<circle class="v-ring" cx="{_f(hx)}" cy="{_f(hy)}" r="13" data-a="draw" data-t="1"/>',
          f'<line class="v-link" x1="{_f(hx + 13)}" y1="{_f(hy)}" x2="282" y2="{_f(hy)}" data-a="draw" data-t="1.2"/>',
          f'<circle class="v-sat" cx="324" cy="{_f(hy)}" r="44" data-a="pop" data-t="1.4"/>',
          f'<circle class="v-orbit" cx="324" cy="{_f(hy)}" r="30" data-a="pop" data-t="1.5"/>',
          f'<circle class="v-fo" cx="324" cy="{_f(hy)}" r="13" data-a="pop" data-t="1.6"/>',
          f'<circle class="v-fo" cx="{_f(hx)}" cy="{_f(hy)}" r="5" data-a="pop" data-t=".9"/>']
    return plate('swarm', svg(''.join(o)), cap=cap)


# ---------- chiffres tirés du texte (double trait des totaux) ----------
def figures(items, note=None):
    """items : liste de (nombre, préfixe, suffixe (fr, en), libellé (fr, en))."""
    cells = []
    for n, pre, suf, lab in items:
        dp = f' data-prefix="{attr(pre)}"' if pre else ''
        num = f'<span data-count="{n}"{dp}>{esc(pre)}{n}</span>' if isinstance(n, int) else f'<span>{esc(str(n))}</span>'
        sx = f'<small>{bie(*suf)}</small>' if suf else ''
        cells.append(f'<div class="vfig__i"><p class="vfig__n">{num}{sx}</p>'
                     f'<svg class="vfig__u" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="2" x2="120" y2="2" data-a="draw" data-t=".9"/><line x1="0" y1="7" x2="120" y2="7" data-a="draw" data-t="1"/></svg>'
                     f'<p class="vfig__l">{bie(*lab)}</p></div>')
    nt = f'<p class="vfig__src">{note}</p>' if note else ''
    return f'<figure class="viz viz--figs" data-viz="figs"><div class="viz__stage"><div class="vfig vfig--n{len(items)}">{"".join(cells)}</div>{nt}</div></figure>'


# ---------- rendez-vous daté (événement) ----------
def date_card(iso, day, month, hour, place, city):
    return (f'<figure class="viz viz--date" data-viz="date"><div class="viz__stage"><div class="vdate">'
            f'<div class="vdate__cal" data-a="rise" data-t="0"><span class="vdate__m">{bie(*month)}</span><span class="vdate__d">{day}</span><span class="vdate__h">{bie(*hour)}</span></div>'
            f'<div class="vdate__info"><p class="vdate__p"><b>{esc(place)}</b><br>{esc(city)}</p>'
            f'<p class="vdate__cd"><span data-viz-countdown="{iso}">{bi("Bientôt", "Soon")}</span></p></div></div></div></figure>')


# ---------- carte (dessinée par fx-viz.js) ----------
def map_plate(cap, **data):
    d = ''.join(f' data-{k.replace("_", "-")}="{attr(str(v))}"' for k, v in data.items() if v not in (None, ''))
    return (f'<figure class="viz viz--map" data-viz="map"{d}><div class="viz__stage"><svg class="vmap" aria-hidden="true" focusable="false"></svg></div>'
            f'<figcaption class="viz__cap">{cap}</figcaption></figure>')


# ---------- vraie photo du réseau dans une section (v14 : moins de planches génériques) ----------
def photo(r, base, alt, cap):
    """base : chemin sans taille (assets/img/convention/xxx) ; alt et cap : (fr, en)."""
    return (f'<figure class="viz viz--photo"><div class="viz__stage"><img src="{r}{base}-800.webp" srcset="{r}{base}-800.webp 800w, {r}{base}-1600.webp 1600w" '
            f'sizes="(max-width: 900px) 92vw, 34vw" alt="{attr(alt[0])}" data-en-alt="{attr(alt[1])}" loading="lazy" width="800" height="533"></div>'
            f'<figcaption class="viz__cap">{bie(*cap)}</figcaption></figure>')
