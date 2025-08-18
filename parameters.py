from collections import namedtuple

EVENT_NAMES = {
  99: 'SAT',
  100: 'PSAT/NMSQT & PSAT 10',
  102: 'PSAT 8/9',
}

Superdomain = namedtuple('Superdomain', 'number name')
SUPERDOMAINS = {
  'RW': Superdomain(1, 'Reading and Writing'),
  'M':  Superdomain(2, 'Math'),
}

Domain = namedtuple('Domain', 'key ugly superdomain_key name')
DOMAINS = {
  'IAI': Domain('IAI',   'INI', 'RW', 'Information and Ideas'),
  'CAS': Domain('CAS',   'CAS', 'RW', 'Craft and Structure'),
  'EOI': Domain('EOI',   'EOI', 'RW', 'Expression of Ideas'),
  'SEC': Domain('SEC',   'SEC', 'RW', 'Standard English Conventions'),
  'ALG': Domain('ALG',   'H',   'M',  'Algebra'),
  'ADV': Domain('ADV',   'P',   'M',  'Advanced Math'),
  'PSDA': Domain('PSDA', 'Q',   'M',  'Problem-Solving and Data Analysis'),
  'GAT': Domain('GAT',   'S',   'M',  'Geometry and Trigonometry'),
}

DOMAINS_NAME_TO_KEY = {domain.name: key for key, domain in DOMAINS.items()}

DIFFICULTIES = {
  'E': 'Easy',
  'M': 'Medium',
  'H': 'Hard',
}
