from dataclasses import dataclass

@dataclass
class Question:
  '''
  Metadata
  '''
  index: int
  domain: str
  subdomain: str
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
