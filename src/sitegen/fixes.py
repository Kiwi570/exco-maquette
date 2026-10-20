"""Corrections appliquées aux textes repris d'exco.fr, au chargement (v14).

Uniquement des fautes évidentes (frappe, accord, mots doublés de la version anglaise, coquilles de noms de lieux)
et la traduction anglaise de libellés restés en français. Le sens des textes n'est jamais modifié : ce qui relève
du fond (chiffres, mentions réglementées) est signalé au client, pas corrigé ici."""
import re

# ---------- français : toutes les pages ----------
FR = [
    ('fiscales votre entreprise', 'fiscales de votre entreprise'),
    ('forts de son engagement', 'fort de son engagement'),
    ('équipe pluridisciplinaires', 'équipe pluridisciplinaire'),
    ('gestionnaire de paie, juristes', 'gestionnaires de paie, juristes'),
    ('l’expertise-comptable', 'l’expertise comptable'),
    ('l a synergie', 'la synergie'),
    ('notre sites dédié', 'notre site dédié'),
    ('dans le Monde', 'dans le monde'),
    ('avec vote expert', 'avec votre expert'),
    ('Des analyse ', 'Des analyses '),
    ('Performance reconnu ', 'Performance reconnue '),
    ('Commissaire aux compte et', 'Commissaire aux comptes et'),
    ('Commissaire aux comptex', 'Commissaire aux comptes'),
    ('voir mondial', 'voire mondial'),
    ('comptable a été fondée', 'comptable a été fondé'),
    ('plus d’1 million', 'plus d’un million'),
    ('Exco Exco', 'Exco'),
    ('allant de mission d’audit et du durabilité', 'allant des missions d’audit de durabilité'),
    ('de hauts niveau', 'de haut niveau'),
    ('Réunio n', 'Réunion'),
    ('à de La Réunion à La Réunion', 'à La Réunion'),
    ('Saint-Jean-De-Losne', 'Saint-Jean-de-Losne'),
    ('Nouakchott; ainsi', 'Nouakchott, ainsi'),
    ('Ougadougou', 'Ouagadougou'),
    ('3000 collaborateurs', '3 000 collaborateurs'),
    ('Ce que les équipes engagées', 'À ce que les équipes engagées'),
    ('Economique', 'Économique'),
    ('Ethique', 'Éthique'),
    ('f usion', 'fusion'),
    ('d es connexions', 'des connexions'),
    ('Protection de l’Environnement', 'Protection de l’environnement'),
    ('+33 04 77 44 83 70', '+33 4 77 44 83 70'),
    ('+33 2 62 72 18 18', '+262 262 72 18 18'),
]
# texte d'une seule page (clé de pages_fr.json) : la page du groupe Bertrand reprenait la présentation d'Exco Valliance
FR_PAGE = {
    'groupe-exco-bertrand-associes': [
        ('Exco Valliance est un groupe positionné', 'Exco Bertrand & Associés est un cabinet positionné'),
        ('qui fait la différence chez.', 'qui fait la différence chez Exco Bertrand & Associés.'),
    ],
}

# ---------- anglais : mots doublés et « lawyers » pour « juristes » ----------
EN_RE = [
    (r'\b(partners|established|accounting|need|our|management|and|the|of|to|a|in|for)\s+\1\b', r'\1'),
    (r', lawyers, ', ', legal advisers, '),
]
# libellés restés en français dans la version anglaise d'exco.fr (valeurs entières)
EN_EXACT = {
    'Expert-comptable et commissaire aux comptes': 'Chartered accountant and statutory auditor',
    'Commissaire aux comptes et expert-comptable': 'Statutory auditor and chartered accountant',
    'Associé, commissaire aux comptes et expert-comptable': 'Partner, statutory auditor and chartered accountant',
    'Associé, Commissaire aux comptes et Expert-comptable': 'Partner, statutory auditor and chartered accountant',
    'Associé, Commissaire aux compte et Expert-comptable': 'Partner, statutory auditor and chartered accountant',
    'Commissaire aux comptes, expert-comptable et expert judiciaire': 'Statutory auditor, chartered accountant and court-appointed expert',
    'Commissaire aux comptes, responsable du département audit': 'Statutory auditor, head of the audit department',
    'Associé': 'Partner',
    'Associée': 'Partner',
    'Associée, pôle social': 'Partner, employment and payroll',
    'Proximité': 'Proximity',
    'Expérience': 'Experience',
    'Réactivité': 'Responsiveness',
    'professionnels en région Grand-Est et à Paris': 'professionals in the Grand Est region and in Paris',
    'experts-comptables et commissaires aux comptes': 'chartered accountants and statutory auditors',
    '7 000 clients accompagnés, chaque année': '7,000 clients supported every year',
    '36 M€ de chiffre d’affaires': '€36m in revenue',
    '350 professionnels en région Grand-Est et à Paris': '350 professionals in the Grand Est region and in Paris',
    '28 experts-comptables et commissaires aux comptes': '28 chartered accountants and statutory auditors',
}


def _walk(o, f):
    if isinstance(o, dict):
        return {k: _walk(v, f) for k, v in o.items()}
    if isinstance(o, list):
        return [_walk(v, f) for v in o]
    if isinstance(o, str):
        return f(o)
    return o


def fix_fr(data, name=''):
    def f(s):
        for a, b in FR:
            if a in s: s = s.replace(a, b)
        if '“' in s:  # guillemets anglais dans un texte français
            s = re.sub(r'“\s*([^”]+?)\s*”', '«\u00a0\\1\u00a0»', s)
        return s
    data = _walk(data, f)
    if name == 'pages_fr.json' and isinstance(data, dict):
        for key, reps in FR_PAGE.items():
            if key in data:
                def g(s, reps=reps):
                    for a, b in reps:
                        s = s.replace(a, b)
                    return s
                data[key] = _walk(data[key], g)
    return data


def fix_en(data, name=''):
    def f(s):
        if s.strip() in EN_EXACT: return EN_EXACT[s.strip()]
        for a, b in FR:  # les fautes de frappe françaises recopiées dans la version anglaise
            if a in s: s = s.replace(a, b)
        for a, b in EN_RE:
            s = re.sub(a, b, s)
        return s
    return _walk(data, f)


# ---------- texte français resté tel quel dans la version anglaise ----------
_FW = set('le la les des du de et pour avec vous nous votre vos notre nos une un est sont dans sur par au aux qui que ce cette ces son sa ses leur leurs plus chez tout tous entre sans ou mais aussi comme ainsi afin dont'.split())


def looks_fr(t):
    """Heuristique : texte manifestement français (mots outils, ou mot court accentué)."""
    w = [x.split('’')[-1].split("'")[-1] for x in re.findall(r"[a-zà-ÿœ’']+", (t or '').lower())]
    return sum(1 for x in w if x in _FW) >= 2 or (0 < len(w) <= 3 and bool(re.search(r'[éèêàçùœ]', t)))


# ---------- textes alternatifs des photos d'articles (décrits d'après les photos, v14) ----------
ALT = {
    'campus-agiragri': ('Les participants du Campus AGIRAGRI réunis sur le perron du lieu d’accueil', 'Campus AGIRAGRI participants gathered on the venue steps'),
    'campus-agiragri-1': ('Une intervention devant les participants, dans un salon aux boiseries', 'A talk to participants in a wood-panelled room'),
    'campus-agiragri-2': ('Visite d’un verger de pommiers sous filet et récolte de pommes', 'Visit to an apple orchard under netting, and harvested apples'),
    'campus-agiragri-3': ('Photo de groupe des participants du Campus AGIRAGRI', 'Group photo of the Campus AGIRAGRI participants'),
    'cessions-titres': ('Un conseiller échange avec un client lors d’un rendez-vous', 'An adviser talking with a client during a meeting'),
    'photo-groupe-aerienne': ('Les participants de la Convention Exco 2026, photographiés d’en haut dans le hall du Palais de la Musique et des Congrès', 'Exco Convention 2026 participants, photographed from above in the hall of the Palais de la Musique et des Congrès'),
    'convention-2026-1': ('Les participants de la Convention Exco 2026, photographiés d’en haut', 'Exco Convention 2026 participants, photographed from above'),
    'convention-2026-2': ('Les nouveaux associés du réseau réunis sur scène', 'The network’s new partners gathered on stage'),
    'convention-2026-3': ('Le public dans l’amphithéâtre de la Convention', 'The audience in the Convention auditorium'),
    'convention-2026-4': ('Remise des sacs d’accueil aux participants', 'Welcome bags handed out to participants'),
    'convention-2026-5': ('Une intervention sur scène pendant une plénière', 'A talk on stage during a plenary session'),
    'convention-2026-6': ('Des participants récompensés sur scène, trophée en main', 'Award winners on stage holding their trophies'),
    'convention-2026-7': ('Les panneaux d’accueil de la Convention Exco 2026 à Strasbourg', 'Welcome banners of the Exco Convention 2026 in Strasbourg'),
    'convention-2026-8': ('Remise du don du réseau au Collectif Triplettes Roses', 'The network’s donation handed to the Collectif Triplettes Roses'),
    'convention-2026-9': ('Un intervenant au micro sur la scène de la Convention', 'A speaker with a microphone on the Convention stage'),
    'convention-2026-10': ('Discours au pupitre de la Convention Exco 2026', 'A speech at the Exco Convention 2026 lectern'),
    'impulse-data': ('Visuel d’annonce : Exco Fiduciaire du Sud-Ouest rejoint Impulse Data', 'Announcement visual: Exco Fiduciaire du Sud-Ouest joins Impulse Data'),
    'matinagri-agiragri': ('Deux intervenants de la Matinagri devant les panneaux AGIRAGRI', 'Two Matinagri speakers in front of AGIRAGRI banners'),
    'soiree-transmission-la-rochelle': ('Affiche de la soirée transmission d’entreprise d’Exco Valliance, le 19 novembre à 18 h 30 au Bio’Pôle de Périgny', 'Poster for Exco Valliance’s business handover evening, 19 November at 6:30 pm at the Bio’Pôle in Périgny'),
    'transmission-agricole': ('Table ronde du colloque de l’AFDR Sud-Ouest devant le public', 'The AFDR Sud-Ouest conference round table in front of the audience'),
    'transmission-agricole-1': ('Table ronde du colloque de l’AFDR Sud-Ouest', 'The AFDR Sud-Ouest conference round table'),
    'trophees-landes': ('Les lauréats des Trophées de l’Économie Landaise sur scène', 'The Landes Economy Awards winners on stage'),
    'trophees-landes-1': ('Les lauréats des Trophées de l’Économie Landaise sur scène', 'The Landes Economy Awards winners on stage'),
}


def alt_of(base):
    """Texte alternatif (fr, en) d'une photo d'article, d'après son nom de fichier sans taille."""
    k = re.sub(r'-(480|800|1200|1600|2400)$', '', base.split('/')[-1])
    return ALT.get(k, ('', None))
