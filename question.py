import hashlib
from dataclasses import dataclass, field

import parameters

@dataclass
class Question:
  '''
  Metadata
  -----------------------------------------------------------------------------
  '''

  '''
  Unique identifier for the question. Composed of:
    {domain_key}-{md5 hash of all main data}
  When the collegeboard updates the question set, they
  don't add them at the end of the list. They insert them into
  the list at random points. So an `index` will not necessarily
  refer to the same question after an update. This necessitates
  having a UUID that is based on the content of the question.
  '''
  uuid: str = field(init=False)

  '''
  Domain that this question belongs to.
  The 8 domains are:
    IAI - Information and Ideas
    CAS - Craft and Structure
    EOI - Expression of Ideas
    SEC - Standard English Conventions
    ALG - Algebra
    ADV - Advanced Math
    PSDA - Problem-Solving and Data Analysis
    GAT - Geometry and Trigonometry
  '''
  domain: parameters.Domain

  '''0-based index of the question within its domain'''
  index: int

  '''
  0-based index of the subdomain (of all subdomains)
  Not calculated during object instantiation; must be set by calling
  question.set_subdomain_index(i). This happens in the Distill stage of
  the pipeline.
  '''
  #subdomain_index: int = field(init=False)
  '''Full name of the subdomain that this question belongs to.'''
  subdomain: parameters.Subdomain

  '''
  Possible values are:
    'mcq' - multiple choice question
    'frq' - free response question
  '''
  response_type: str

  '''
  Possible values are: 'easy' 'medium' 'hard'
  '''
  difficulty: str

  '''
  Main Data
  -----------------------------------------------------------------------------
  '''

  '''Called body or stimulus in the raw SAT scrape data'''
  stimulus: str

  '''Called prompt or stem in the raw SAT scrape data'''
  stem: str

  '''List of possible answers offered'''
  options: list[str]

  '''Can be None or a comma separated list of answers'''
  correct_answer: str

  '''Text to explain the correct answer'''
  rationale: str

  def __post_init__(self):
    parts = [
      self.stimulus,
      self.stem,
      *self.options,
      self.correct_answer or '',
      self.rationale
    ]
    combined = ''.join(parts)
    md5_hash = hashlib.md5(combined.encode()).hexdigest()
    self.uuid = f'{self.domain.key}-{md5_hash}'
