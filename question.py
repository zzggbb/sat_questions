from dataclasses import dataclass

@dataclass
class Question:
  # metadata
  difficulty: str
  index: int
  domain: str
  subdomain: str

  # data
  stimulus: str
  stem: str
  options: list[str]
  correct_answer: str
  rationale: str
