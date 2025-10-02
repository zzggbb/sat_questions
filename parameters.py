from dataclasses import dataclass
from collections import namedtuple

EVENT_NAMES = {
  99: 'SAT',
  100: 'PSAT/NMSQT & PSAT 10',
  102: 'PSAT 8/9',
}

Superdomain = namedtuple('Superdomain', 'number key name')
SUPERDOMAINS = {
  'E': Superdomain(1, 'E', 'English'),
  'M':  Superdomain(2, 'M', 'Math'),
}

@dataclass
class Domain:
  key: str
  ugly: str
  superdomain_key: str
  name: str

  def __post_init__(self):
    self.superdomain = SUPERDOMAINS[self.superdomain_key]

  def __hash__(self):
    return hash(self.key)

class Subdomain:
  def __init__(self, raw_name):
    self.name = self.shorten(raw_name)
    self.index = None

  @staticmethod
  def shorten(raw):
    out = raw
    out = out.strip()
    out = out.title()
    out = out.replace(' One ', ' 1 ')
    out = out.replace(' Two ', ' 2 ')
    out = out.replace('One-', '1-')
    out = out.replace('Two-', '2-')
    out = out.replace(' And ', ' & ')
    return out

  def set_index(self, index):
    self.index = index

  def __eq__(self, other):
    return self.name == other.name

  def __hash__(self):
    return hash(self.name)

  def __repr__(self):
    return f"Subdomain(name={self.name} index={self.index} @ {hex(id(self))})"

  def __lt__(self, other):
    return self.name < other.name

DOMAINS = {
  'IAI': Domain('IAI',   'INI', 'E', 'Information & Ideas'),
  'CAS': Domain('CAS',   'CAS', 'E', 'Craft & Structure'),
  'EOI': Domain('EOI',   'EOI', 'E', 'Expression of Ideas'),
  'SEC': Domain('SEC',   'SEC', 'E', 'Standard English Conventions'),
  'ALG': Domain('ALG',   'H',   'M',  'Algebra'),
  'ADV': Domain('ADV',   'P',   'M',  'Advanced Math'),
  'PSDA': Domain('PSDA', 'Q',   'M',  'Problem-Solving & Data Analysis'),
  'GAT': Domain('GAT',   'S',   'M',  'Geometry & Trigonometry'),
}

DIFFICULTIES = {
  'E': 'Easy',
  'M': 'Medium',
  'H': 'Hard',
}
