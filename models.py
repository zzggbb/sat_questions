# standard
import hashlib
from dataclasses import dataclass, field

# 3rd party
from bs4 import BeautifulSoup

@dataclass
class Exam:
  name: str
  id: int
  index: int = field(init=False)

  def __post_init__(self):
    self.id = int(self.id)
    self.short_name = Exam.short_name(self.name)
    self.index = Exam.get_index(self.name)

  def __hash__(self):
    return hash(self.id)

  def __lt__(self, other):
    return self.index < other.index

  def __repr__(self):
    return f"Exam('{self.short_name}' {self.id})"

  def __str__(self):
    return self.short_name

  def short_name(name):
    return {
      'SAT': 'SAT',
      'PSAT/NMSQT & PSAT 10': 'P10',
      'PSAT 8/9': 'P89'
    }[name]

  def get_index(name):
    return {
      'PSAT 8/9': 0,
      'PSAT/NMSQT & PSAT 10': 1,
      'SAT': 2
    }[name]

  def keys(self):
    return ['name', 'short_name', 'id', 'index']
  def __getitem__(self, key):
    return getattr(self, key)

@dataclass
class Superdomain:
  name: str = field(init=False)
  original_name: str
  id: int
  index: int = field(init=False)

  def __post_init__(self):
    self.name = Superdomain.fix_name(self.original_name)
    self.id = int(self.id)
    self.index = Superdomain.get_index(self.name)

  def __hash__(self):
    return hash(self.id)

  def __lt__(self, other):
    return self.id < other.id

  def __repr__(self):
    return f"Superdomain('{self.name}' {self.id})"

  def __str__(self):
    return self.name

  def fix_name(name):
    return {
      'R&W': 'English',
      'Math': 'Math'
    }[name]

  def get_index(name):
    return {
      'English': 0,
      'Math': 1
    }[name]

  def keys(self):
    return ['name', 'id', 'index']
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
    if self.index == other.index:
      return self.name < other.name

    return self.index < other.index

  def __repr__(self):
    return f"Domain('{self.name}' {self.acronym} {self.index})"

  def __str__(self):
    return self.name

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

  def __eq__(self, other):
    return self.name == other.name

  def __lt__(self, other):
    if self.index == other.index:
      return self.name < other.name

    return self.index < other.index

  def __repr__(self):
    return f"Subdomain('{self.name}' {self.index})"

  def __str__(self):
    return self.name

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

@dataclass
class Classification:
  superdomain: Superdomain
  domain: Domain
  subdomain: Subdomain

  def __repr__(self):
    return ' > '.join([
      self.superdomain.name,
      self.domain.name,
      self.subdomain.name
    ])

  def __lt__(self, other):
    if self.superdomain < other.superdomain:
      return True

    if self.domain < other.domain:
      return True

    if self.subdomain < other.subdomain:
      return True

    return False

AnswerType = dict(
  MCQ = 'MCQ',
  FRQ = 'FRQ',
)

Difficulty = dict(
  E = 'E',
  M = 'M',
  H = 'H',
)

@dataclass
class Question:
  ''' Metadata '''

  '''0-based index of the question among all questions in the dataset'''
  index: int

  '''0-based index of the question among all questions in its domain'''
  index_within_domain: int

  '''
  Unique identifier for the question based on its contents. Composed of:
    "{exam.short_name}-{MD5 hash of question's maindata}"

  This is based on two quirks of the collegeboard:
  1. When the collegeboard updates the question set, they don't add new
     questions to the end of the list. They insert them into the list at random
     points. So `index` will not necessarily refer to the same question after an
     update. This necessitates having a UUID that is based on the content of the
     question.
  2. The collegeboard reuses questions between the P89/P10/SAT exams. Each copy
     has identical content, they only differ in difficulty. A question that is
     easy on the SAT might be medium on the P10 and hard on the P89. Not all
     question are re-used 3 times.
  '''
  uuid: str = field(init=False)
  exam: Exam
  superdomain: Superdomain
  domain: Domain
  subdomain: Subdomain
  answer_type: str = field(init=False)
  difficulty: str

  ''' Maindata '''

  '''Called body or stimulus in question_bank.get_question'''
  stimulus: str
  '''Called prompt or stem in question_bank.get_question'''
  stem: str
  '''List of possible answers. Can be an empty list'''
  options: list[str]
  '''A comma separated list of answers or None'''
  correct_answer: str | None
  '''Text to explain the correct answer'''
  rationale: str

  def __post_init__(self):
    '''
    These HTML blobs use a deprecated HTML tag called 'mfenced'.
    If not fixed, parenthesis don't render correctly.
    '''
    self.stimulus = Question.replace_mfenced(self.stimulus)
    self.stem = Question.replace_mfenced(self.stem)
    self.options = list(map(Question.replace_mfenced, self.options))
    self.rationale = Question.replace_mfenced(self.rationale)

    main_data_combined = ''.join([
      self.stimulus,
      self.stem,
      *self.options,
      self.correct_answer or '',
      self.rationale
    ])
    md5_hash = hashlib.md5(main_data_combined.encode()).hexdigest()
    self.uuid = f'{self.exam.short_name}-{md5_hash}'
    self.answer_type = AnswerType['MCQ'] if len(self.options) > 0 else AnswerType['FRQ']

  def __iter__(self):
    for k, v in self.__dict__.items():
      yield (k, v)

  def replace_mfenced(html_string):
    # <mfenced>...</mfenced> -> <mrow><mo>(</mo>...<mo>)</mo></mrow>
    soup = BeautifulSoup(html_string, 'html.parser')

    for mfenced in soup.find_all('mfenced'):
      mo_open = soup.new_tag('mo')
      mo_open.string = mfenced.attrs.get('open', '(')

      mo_close = soup.new_tag('mo')
      mo_close.string = mfenced.attrs.get('close', ')')

      mfenced.name = 'mrow'
      mfenced.insert(0, mo_open)
      mfenced.append(mo_close)

    return str(soup)
