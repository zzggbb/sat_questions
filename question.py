import hashlib
from dataclasses import dataclass

import parameters

@dataclass
class Question:
  '''
  Metadata
  '''

  '''
  Codename of the domain that this question belongs to.
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
  domain_key: str

  '''0-based index of the question within its domain'''
  index: int


  '''Full name of the subdomain that this question belongs to.'''
  subdomain: str

  '''
  Possible values are:
    'mcq' - multiple choice question
    'frq' - free response question
  '''
  response_type: str

  '''
  Possible values are:
    'easy'
    'medium'
    'hard'
  '''
  difficulty: str

  '''
  Main Data
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
    self.domain = parameters.DOMAINS[self.domain_key]

    parts = [
      self.stimulus,
      self.stem,
      *self.options,
      self.correct_answer or '',
      self.rationale
    ]
    combined = ''.join(parts)
    self.uuid = hashlib.md5(combined.encode()).hexdigest()
