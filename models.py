import json
from dataclasses import dataclass, field

@dataclass
class StandardizedTest:
  name: str
  id: int

  def __post_init__(self):
    self.id = int(self.id)

  def __hash__(self):
    return hash(self.id)

  def __lt__(self, other):
    return self.id < other.id

  def __repr__(self):
    return f"StandardizedTest('{self.name}' {self.id})"

  def keys(self):
    return ['name', 'id']
  def __getitem__(self, key):
    return getattr(self, key)

@dataclass
class Superdomain:
  name: str = field(init=False)
  original_name: str
  id: int

  def __post_init__(self):
    self.name = Superdomain.fix_name(self.original_name)
    self.id = int(self.id)

  def __hash__(self):
    return hash(self.id)

  def __lt__(self, other):
    return self.id < other.id

  def __repr__(self):
    return f"Superdomain('{self.name}' {self.id})"

  def fix_name(name):
    return {
      'R&W': 'English',
      'Math': 'Math'
    }[name]

  def keys(self):
    return ['name', 'id']
  def __getitem__(self, key):
    return getattr(self, key)

@dataclass
class Domain:
  name: str = field(init=False)
  original_name: str
  acronym: str = field(init=False)
  original_acronym: str
  index: int = 0

  def __post_init__(self):
    self.name = Domain.fix_name(self.original_name)
    self.acronym = Domain.fix_acronym(self.original_acronym)
    self.index = int(self.index)

  def __hash__(self):
    return hash(self.name)

  def __lt__(self, other):
    return self.name < other.name

  def __repr__(self):
    return f"Domain('{self.name}' {self.acronym} {self.index})"

  def fix_name(name):
    out = name
    out = out.replace('-', ' ')
    out = out.replace(' and ', ' & ')
    out = out.title()
    return out

  def fix_acronym(acronym):
    return {
      'CAS': 'CAS',
      'EOI': 'EOI',
      'INI': 'IAI',
      'SEC': 'SEC',
      'P': 'ADV',
      'H': 'ALG',
      'S': 'GAT',
      'Q': 'PSDA',
    }[acronym]

  def keys(self):
    return ['name', 'acronym', 'index']
  def __getitem__(self, key):
    return getattr(self, key)

@dataclass
class Subdomain:
  name: str = field(init=False)
  original_name: str
  index: int = 0

  def __post_init__(self):
    self.name = Subdomain.fix_name(self.original_name)
    self.index = int(self.index)

  def __hash__(self):
    return hash(self.name)

  def __lt__(self, other):
    return self.name < other.name

  def __repr__(self):
    return f"Subdomain('{self.name}' {self.index})"

  def fix_name(name):
    out = name
    out = out.strip()
    out = out.title()
    out = out.replace(' One ', ' 1 ')
    out = out.replace(' Two ', ' 2 ')
    out = out.replace('One-', '1-')
    out = out.replace('Two-', '2-')
    out = out.replace(' And ', ' & ')
    out = out.replace(', &', ' &')
    return out

  def keys(self):
    return ['name', 'index']
  def __getitem__(self, key):
    return getattr(self, key)
