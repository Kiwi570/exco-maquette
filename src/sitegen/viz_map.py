"""Choix du visuel de chaque section de texte (v13).

Les sections des pages services, secteurs et métiers sont repérées par leur rang sur la page.
Les libellés des parcours viennent des intertitres d'exco.fr ; les chiffres, du texte ou de l'annuaire."""
import json, os
from .common import ROOT, bi, esc
from . import viz as V

CABS = json.load(open(os.path.join(ROOT, 'assets', 'data', 'cabinets.json'), encoding='utf-8'))
FR = [c for c in CABS if c['reg'] == 'fr']


def _n(k, one, many):
    return f'{k} {one if k == 1 else many}'


def leg(*items):
    """Légende de carte : une pastille et un libellé par élément, séparés (v14)."""
    return ''.join(f'<span class="viz__item">{V.key(k)}{t}</span>' for k, t in items)


def map_svc(code, fr_name, en_name):
    m = sum(1 for c in FR if code in c['s'])
    e = sum(1 for c in FR if not c['s'])
    cap = leg(('i', bi(f'En métropole, {m} des {len(FR)} cabinets de l’annuaire proposent {fr_name}', f'In mainland France, {m} of the {len(FR)} offices in the directory offer {en_name}')),
              ('s', bi(f'les autres cabinets (dont {e} sans services renseignés)', f'other offices ({e} with no services listed)')))
    return V.map_plate(cap, scope='svc', svc=code)


def map_fr():
    cap = leg(('i', bi(f'Les {len(FR)} cabinets du réseau en France métropolitaine, d’après l’annuaire', f'The network’s {len(FR)} offices in mainland France, according to the directory')))
    return V.map_plate(cap, scope='fr')


def map_int():
    I = [c for c in CABS if c['reg'] == 'int']
    k = len({c['co'][0] for c in I})
    cap = leg(('i', bi(f'Les {len(I)} cabinets du réseau hors de France, dans {k} pays', f'The network’s {len(I)} offices outside France, in {k} countries')),
              ('s', bi('cabinets en France', 'offices in France')))
    return V.map_plate(cap, scope='int')


def map_group(gkey, gname=None, focus=None):
    """gkey : nom du groupe dans l'annuaire ; gname : nom affiché."""
    G = [c for c in CABS if c['g'] == gkey]
    gname = gname or gkey
    rest_net = ('s', bi('le reste du réseau', 'the rest of the network'))
    if focus:
        f = next(c for c in CABS if c['id'] == focus)
        rest = len(G) - 1
        if rest > 0:
            cap = leg(('o', esc(f['n'])),
                      ('i', bi(f'{"l’autre cabinet" if rest == 1 else f"les {rest} autres cabinets"} du groupe {esc(gname)}', f'{"the other office" if rest == 1 else f"the {rest} other offices"} of the {esc(gname)} group')),
                      rest_net)
        else:
            cap = leg(('o', esc(f['n']) + bi(f', seul cabinet du groupe {esc(gname)} dans l’annuaire', f', the only {esc(gname)} office in the directory')), rest_net)
        return V.map_plate(cap, scope='group', group=gkey, focus=focus)
    cap = leg(('i', bi(f'Les {len(G)} cabinets du groupe dans l’annuaire', f'The group’s {len(G)} offices in the directory') if len(G) > 1 else bi('Le cabinet du groupe dans l’annuaire', 'The group’s office in the directory')),
              rest_net)
    return V.map_plate(cap, scope='group', group=gkey)


# ---------- pages services, secteurs, métiers : un visuel par section, dans l'ordre ----------
def _plan():
    P = {}
    S = 'services/'
    P[S + 'audit.html'] = [lambda: V.ledger(), lambda: map_svc('audit', 'l’audit', 'audit')]
    P[S + 'social-paie-rh.html'] = [lambda: V.cycle(), lambda: V.shield()]
    P[S + 'juridique-fiscal.html'] = [lambda: V.doc(), lambda: V.orbit()]
    P[S + 'conseil.html'] = [lambda: V.dash('bars'),
                             lambda: V.path([('Étude de faisabilité', 'Feasibility study'), ('Stratégie de financement', 'Financing strategy'),
                                             ('Structure juridique et fiscale', 'Legal and tax structure'), ('Démarches et prévisions', 'Formalities and forecasts')]),
                             lambda: V.range_chart(), lambda: V.orbit()]
    P[S + 'evaluation-entreprise.html'] = [lambda: V.range_chart(), lambda: V.balance()]
    P[S + 'finance-transactions.html'] = {0: lambda: V.gantt(), 5: lambda: map_svc('ft', 'la finance et les transactions', 'finance and transactions'),
                                          8: lambda: V.figures([('1928', '', None, ('Création de Financière de Courcelles', 'Financière de Courcelles founded')),
                                                                (25, '', ('experts', 'experts'), ('dans son équipe de conseil en fusions et acquisitions', 'in its M&A advisory team'))])}
    P[S + 'international.html'] = [lambda: map_int(), lambda: V.orbit()]
    P[S + 'rse-durabilite.html'] = [lambda: V.rings([('Environnement', 'Environmental'), ('Social', 'Social'), ('Gouvernance', 'Governance')])]
    P[S + 'forensics.html'] = [lambda: V.threads(), lambda: V.ledger('anomaly')]
    P[S + 'exco-consulting.html'] = [lambda: V.dash('jcurve'), lambda: V.orbit(),
                                     lambda: V.path([('Brief de votre projet', 'Your project brief'), ('Regards croisés', 'Cross perspectives'),
                                                     ('Sélection de l’équipe', 'Team selection'), ('Proposition', 'Proposal')])]
    # gestion privée : rubriques regroupées (index des groupes : 1, 3, 8)
    P[S + 'gestion-patrimoine.html'] = {1: lambda: V.trio([('Stratégie patrimoniale', 'Wealth strategy'), ('Audit patrimonial', 'Wealth audit'), ('Transmission', 'Handover')]),
                                        3: lambda: V.rings([('Sur-mesure', 'Tailor-made'), ('Confiance et proximité', 'Trust and proximity'), ('Interprofessionnalité', 'Cross-disciplinary')]),
                                        8: lambda: V.orbit()}
    X = 'secteurs/'
    P[X + 'agriculture-agroalimentaire.html'] = [lambda: V.dash('volatile')]
    P[X + 'automobile.html'] = [lambda: V.path([('Création ou reprise', 'Start-up or takeover'), ('Financement', 'Financing'), ('Gestion', 'Management'), ('Transmission', 'Handover')]),
                                lambda: V.dash('bars')]
    P[X + 'banque-assurance.html'] = [lambda: V.shield(), lambda: V.ledger()]
    P[X + 'btp-immobilier.html'] = [lambda: V.gantt()]
    P[X + 'economie-sociale-solidaire.html'] = [lambda: V.swarm(100, bi('Un point pour 10 000 associations : la France en compte plus d’un million', 'One dot per 10,000 associations: France has over a million'), hi=False)]
    P[X + 'start-up-innovation.html'] = [lambda: V.dash('jcurve')]
    P[X + 'hotellerie-restauration.html'] = [lambda: V.rings([('Aspects financiers', 'Financial'), ('Aspects juridiques', 'Legal'), ('Aspects humains', 'Human')])]
    P[X + 'pharmacie.html'] = [lambda: V.figures([(40, '+', ('ans', 'years'), ('d’accompagnement du marché officinal', 'serving the retail pharmacy market'))]),
                               lambda: V.path([('Avant l’installation', 'Before opening'), ('Gestion de l’officine', 'Running the pharmacy'), ('Projets de développement', 'Growth projects'),
                                               ('Ressources humaines', 'Human resources'), ('Fiscalité et patrimoine', 'Tax and wealth')])]
    P[X + 'sante-medico-social.html'] = [lambda: V.ledger(), lambda: V.orbit(), lambda: V.cycle(), lambda: V.shield()]
    P[X + 'secteur-public.html'] = [lambda: V.ledger(), lambda: V.orbit()]
    return P


PLAN = _plan()


METIER_MID = {  # deuxième section : une planche propre au métier
    'auditeur': lambda: map_fr(),
    'expert-comptable': lambda: V.dash('bars'),
    'juriste': lambda: V.doc(),
    'social-rh': lambda: V.cycle(),
    'consultant': lambda: V.dash('jcurve'),
}
METIER_PHOTO = {  # troisième section : une vraie photo de la Convention 2026 (communauté, formation)
    'auditeur': ('remise-trophees-scene', ('Des associés récompensés sur la scène de la Convention Exco 2026', 'Partners receiving awards on stage at the Exco Convention 2026')),
    'expert-comptable': ('amphitheatre-public', ('Le public de la Convention Exco 2026 dans l’amphithéâtre', 'The audience of the Exco Convention 2026 in the auditorium')),
    'juriste': ('scene-groupe-ecran', ('Les associés d’un groupe présentés sur la scène de la Convention', 'A group’s partners introduced on the Convention stage')),
    'social-rh': ('orateur-pupitre', ('Un discours au pupitre de la Convention Exco 2026', 'A speech at the Exco Convention 2026 lectern')),
    'consultant': ('orateur-micro', ('Un intervenant au micro pendant la Convention Exco 2026', 'A speaker at the Exco Convention 2026')),
}


def metier_viz(slug, k):
    from .partials import CAT
    M = CAT['metiers']
    if k == 0:
        cur = next(m for m in M if m['slug'] == slug)
        return V.metiers((cur['fr'], cur['en']), [(m['fr'], m['en']) for m in M if m['slug'] != slug])
    if k == 1:
        f = METIER_MID.get(slug)
        return f() if f else map_fr()
    if k == 2 and slug in METIER_PHOTO:
        b, alt = METIER_PHOTO[slug]
        return V.photo('../', f'assets/img/convention/{b}', alt, ('Convention Exco 2026 à Strasbourg : plénières et ateliers métiers.', 'Exco Convention 2026 in Strasbourg: plenary sessions and trade workshops.'))
    return ''


def section_viz(out, k):
    """Visuel de la k-ième section de texte de la page (ou chaîne vide)."""
    if out.startswith('carrieres/'):
        return metier_viz(out.split('/')[1][:-5], k)
    p = PLAN.get(out)
    if not p:
        return ''
    f = p.get(k) if isinstance(p, dict) else (p[k] if k < len(p) else None)
    return f() if f else ''


# ---------- articles : un visuel tiré des faits de l'article, avant le premier intertitre ----------
def article_viz(slug):
    A = {
        'cessions-titres': lambda: V.trio([('Acte authentique', 'Notarial deed'), ('Acte contresigné par avocat', 'Deed countersigned by a lawyer'),
                                           ('Acte sous signature privée d’un expert-comptable*', 'Private deed drawn up by a chartered accountant*')]),
        'convention-2026': lambda: V.figures([(300, '', None, ('Près de trois cents professionnels du réseau réunis à Strasbourg', 'Close to three hundred network professionals gathered in Strasbourg')),
                                              (2, '', ('jours', 'days'), ('les 17 et 18 septembre 2026', 'on 17 and 18 September 2026'))]),
        'impulse-data': lambda: V.figures([(18, '', ('cabinets', 'firms'), ('associés au sein d’Impulse Data', 'partners in Impulse Data')),
                                           ('2023', '', None, ('Création du collectif', 'The collective was founded'))]),
        'matinagri-agiragri': lambda: V.dash('volatile'),
        'soiree-transmission-la-rochelle': lambda: V.date_card('2026-11-19T18:30:00+01:00', '19', ('novembre', 'November'), ('18 h 30', '6:30 pm'), 'Bio’Pôle de Périgny', 'La Rochelle'),
        'transmission-agricole': lambda: V.trio([('Le fonds agricole', 'The farm business fund'), ('Le bail cessible', 'The transferable lease')]),
        'trophees-landes': lambda: V.figures([(400, '', None, ('invités à Soustons', 'guests in Soustons')), (23, '', None, ('entreprises nommées', 'nominated companies')),
                                              (7, '', None, ('lauréats', 'winners'))]),
    }
    f = A.get(slug)
    return f() if f else ''
