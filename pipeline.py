import re
import json
import pickle
import datetime
from pathlib import Path

import question_bank_api as qbank
import parameters
from question import Question

import jinja2
from bs4 import BeautifulSoup

ROOT = Path(__file__).parent
TIMESTAMP = datetime.datetime.now(datetime.timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')

def scrape_pairs():
  for test_number, domains in parameters.DOMAINS.items():
    for domain_code, domain_name in domains.items():
      yield (test_number, domain_code)

class Scrape:
  """Scrape"""

  working_dir = ROOT / "scrapes"

  def _get_scrape_filename(test_number, domain_code):
    return f"SAT_{test_number}_{domain_code}.json"

  def required_files():
    yield from []

  def produced_files():
    for test_number, domain_code in scrape_pairs():
      yield Scrape.working_dir / Scrape._get_scrape_filename(test_number, domain_code)

  def run():
    for test_number, domain_code in scrape_pairs():
      filename = Scrape._get_scrape_filename(test_number, domain_code)
      questions = list(qbank.get_questions(99, test_number, domain_code))
      with open(Scrape.working_dir / filename, "w") as f:
        json.dump(questions, f)

class Distill:
  """Distill"""

  working_dir = ROOT / "distilled"

  def _sanitize_subdomain(subdomain_raw):
    return subdomain_raw.strip().title().replace(' One ', ' 1 ').replace(' Two ', ' 2 ')

  def _replace_mfenced(html_string):
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

  def _parse_questions(questions_file_path):
    questions = json.load(open(questions_file_path))
    subdomains = set()
    question_objects = []

    for index, question in enumerate(questions):
      if 'item_id' in question:
        # special handling
        identifier = question['item_id']
        assert identifier.endswith('DC')
        stimulus = question.get('body', '')
        stem = question.get('prompt', '')
        qtype = question['answer']['style']
        rationale = question['answer']['rationale']

        if qtype == 'Multiple Choice':
          options = [option['body'] for option in question['answer']['choices'].values()]
          if 'correct_choice' in question['answer']:
            correct_answer = question['answer']['correct_choice'].upper()
          else:
            needle = r'Choice ([A-Z]) is correct'
            search_result = re.search(needle, rationale)
            if search_result:
              correct_answer = search_result.group(1).upper() # first match
            else:
              print(f"couldn't detect answer for {identifier}")
              correct_answer = None
        elif qtype == 'SPR':
          # Student Produced Response
          options = []
          correct_answer = None
        else:
          raise RuntimeError(f"Unexpected question type {qtype}")

      else:
        identifier = question['externalid']
        stimulus = question.get('stimulus', '')
        stem = question['stem']
        qtype = question['type']
        correct_answer = ', '.join(question['correct_answer'])
        rationale = question['rationale']

        if qtype == 'mcq':
          options = [option['content'] for option in question['answerOptions']]
        elif qtype == 'spr':
          options = []
        else:
          raise RuntimeError(f"Unexpected question type {qtype}")

      difficulty = parameters.DIFFICULTIES[question['difficulty']].lower()
      domain = question['domain']
      subdomain = Distill._sanitize_subdomain(question['subdomain'])
      stimulus = Distill._replace_mfenced(stimulus)
      stem = Distill._replace_mfenced(stem)
      options = list(map(Distill._replace_mfenced, options))
      rationale = Distill._replace_mfenced(rationale)

      subdomains.add(subdomain)
      question_objects.append(Question(
        index, domain, subdomain, difficulty,
        stimulus, stem,
        options, correct_answer,
        rationale
      ))

    return sorted(subdomains), question_objects

  def required_files():
    yield from Scrape.produced_files()

  def produced_files():
    yield from [
      Distill.working_dir / "questions.json",
      Distill.working_dir / "questions.pickle",
      Distill.working_dir / "taxonomy.pickle"
    ]

  def run():
    all_questions = []
    taxonomy = {}
    for test_number, domain_code in scrape_pairs():
      test_name = parameters.TEST_NAMES[test_number]
      test_domain = parameters.DOMAINS[test_number][domain_code]

      print(f"Parsing {test_name} > {test_domain}", end='... ')
      scrape_path = Scrape.working_dir / Scrape._get_scrape_filename(test_number, domain_code)
      subdomains, questions = Distill._parse_questions(scrape_path)
      all_questions.extend(questions)
      if test_name not in taxonomy: taxonomy[test_name] = {}
      taxonomy[test_name][test_domain] = subdomains
      print("Finished")

    json.dump(all_questions, open(Distill.working_dir / "questions.json", "w"), indent=2,
              default=lambda obj: vars(obj))
    pickle.dump(all_questions, open(Distill.working_dir / "questions.pickle", "wb"))
    pickle.dump(taxonomy, open(Distill.working_dir / "taxonomy.pickle", "wb"))

class NewHTML:
  """NewHTML"""

  working_dir = ROOT / "html"

  def required_files():
    yield from Distill.produced_files()
    yield ROOT / "html_templates" / "base.html"
    yield ROOT / "html_templates" / "index2.html"

  def produced_files():
    yield NewHTML.working_dir / "index2.html"

  def run():
    loader = jinja2.FileSystemLoader(ROOT / "html_templates")
    env = jinja2.Environment(loader=loader, trim_blocks=True, lstrip_blocks=True)

    taxonomy = pickle.load(open(Distill.working_dir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))

    html = env.get_template("index2.html").render(
      taxonomy=taxonomy, questions=questions, timestamp=TIMESTAMP
    )

    open(NewHTML.working_dir / "index2.html", "w").write(html)

class OldHTML:
  """OldHTML"""

  working_dir = ROOT / "html"

  def _format_attribute(s):
    return s.lower().replace(',','').replace(' ', '-')

  def required_files():
    yield from Distill.produced_files()
    yield ROOT / "html_templates" / "base.html"
    yield ROOT / "html_templates" / "index.html"
    yield ROOT / "html_templates" / "questions.html"

  def produced_files():
    yield OldHTML.working_dir / "index.html"
    for test_number, domain_code in scrape_pairs():
      yield OldHTML.working_dir / f"SAT_{test_number}_{domain_code}.html"

  def run():
    loader = jinja2.FileSystemLoader(ROOT / "html_templates")
    env = jinja2.Environment(loader=loader, trim_blocks=True, lstrip_blocks=True)
    env.filters['format_attribute'] = OldHTML._format_attribute

    taxonomy = pickle.load(open(Distill.working_dir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))

    domain_to_questions = {}
    for question in questions:
      if question.domain not in domain_to_questions:
        domain_to_questions[question.domain] = []

      domain_to_questions[question.domain].append(question)

    domain_name_to_code = {}
    domain_name_to_test_number = {}
    for test_number, domains in parameters.DOMAINS.items():
      for code, name in domains.items():
        domain_name_to_code[name] = code
        domain_name_to_test_number[name] = test_number

    index = {}
    for domain, domain_questions in domain_to_questions.items():
      domain_code = domain_name_to_code[domain]
      test_number = domain_name_to_test_number[domain]
      test_name = parameters.TEST_NAMES[test_number]
      subdomains = taxonomy[test_name][domain]
      html_name = f"SAT_{test_number}_{domain_code}.html"

      with open(OldHTML.working_dir / html_name, 'w') as f:
        f.write(env.get_template("questions.html").render(
          domain=domain, subdomains=subdomains, questions=domain_questions, timestamp=TIMESTAMP
        ))

      if test_name not in index: index[test_name] = {}
      index[test_name][domain] = (html_name, subdomains)

    with open(OldHTML.working_dir / "index.html", 'w') as f:
      f.write(env.get_template("index.html").render(index=index, timestamp=TIMESTAMP))

def run_pipeline(stages):
  for stage in stages:
    if hasattr(stage, 'working_dir'):
      stage.working_dir.mkdir(exist_ok=True)

    description = stage.__doc__

    upstream_mtime = max((f.stat().st_mtime for f in stage.required_files()), default=0)
    downstream_mtime = min(f.stat().st_mtime for f in stage.produced_files())
    upstream_changed = upstream_mtime > downstream_mtime

    if all(path.exists() for path in stage.produced_files()) \
        and not upstream_changed \
        and not getattr(stage, 'force_run', False):
      print(f"[{description}] Already produced its files and no upstream changes, skipping.")
    else:
      print(f"[{description}] Started running...")
      stage.run()
      print(f"[{description}] Finished running.")

def main():
  stages = [Scrape, Distill, NewHTML, OldHTML]
  run_pipeline(stages)

if __name__ == '__main__':
  main()
