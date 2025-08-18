import re
import pickle
import datetime
from pathlib import Path
from collections import namedtuple

import question_bank_api as qbank
import parameters
from question import Question

import jinja2
from bs4 import BeautifulSoup
import simplejson as json

ROOT = Path(__file__).parent
TIMESTAMP = datetime.datetime.now(datetime.timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')

class Scrape:
  """Scrape"""

  working_dir = ROOT / "scrapes"

  def _get_scrape_filename(domain_key):
    return f"SAT_{domain_key}.json"

  def required_files():
    yield from []

  def produced_files():
    for domain_key in parameters.DOMAINS.keys():
      yield Scrape.working_dir / Scrape._get_scrape_filename(domain_key)

  def run():
    for domain_key, domain in parameters.DOMAINS.items():
      filename = Scrape._get_scrape_filename(domain_key)
      questions = list(qbank.get_questions(99, domain))
      json.dump(questions, open(Scrape.working_dir / filename, "w"))

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

      domain_name = question['domain']
      domain_key = parameters.DOMAINS_NAME_TO_KEY[domain_name]

      subdomain = Distill._sanitize_subdomain(question['subdomain'])
      response_type = 'mcq' if len(options) > 0 else 'frq'
      difficulty = parameters.DIFFICULTIES[question['difficulty']].lower()

      stimulus = Distill._replace_mfenced(stimulus)
      stem = Distill._replace_mfenced(stem)
      options = list(map(Distill._replace_mfenced, options))
      rationale = Distill._replace_mfenced(rationale)

      subdomains.add(subdomain)

      question = Question(
        domain_key, index, subdomain, response_type, difficulty,
        stimulus, stem, options, correct_answer, rationale
      )
      question_objects.append(question)

    return sorted(subdomains), question_objects

  def required_files():
    yield from Scrape.produced_files()

  def produced_files():
    yield Distill.working_dir / "questions.pickle"
    yield Distill.working_dir / "taxonomy.pickle"

  def run():
    all_questions = []
    taxonomy = {}
    for domain_key, domain in parameters.DOMAINS.items():
      superdomain = parameters.SUPERDOMAINS[domain.superdomain_key]

      print(f"Parsing {superdomain.name} > {domain.name}", end='... ')
      scrape_path = Scrape.working_dir / Scrape._get_scrape_filename(domain_key)
      subdomains, questions = Distill._parse_questions(scrape_path)
      all_questions.extend(questions)
      if superdomain not in taxonomy:
        taxonomy[superdomain] = {}
      taxonomy[superdomain][domain] = subdomains
      print("Finished")

    pickle.dump(all_questions, open(Distill.working_dir / "questions.pickle", "wb"))
    pickle.dump(taxonomy, open(Distill.working_dir / "taxonomy.pickle", "wb"))

class QuestionDataJS:
  """QuestionDataJS"""

  working_dir = ROOT / "static"

  def required_files():
    yield Distill.working_dir / "questions.pickle"

  def produced_files():
    yield QuestionDataJS.working_dir / "question_data.js"

  def run():
    path = QuestionDataJS.working_dir / "question_data.js"
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))
    question_data_string = json.dumps(questions, default=lambda o: vars(o), indent=2)
    output = f"let question_data = {question_data_string}"
    with open(path, 'w') as f:
      f.write(output)

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
    return s.lower().replace(',','').replace(' ', '-').replace(':','-')

  def required_files():
    yield from Distill.produced_files()
    yield ROOT / "html_templates" / "base.html"
    yield ROOT / "html_templates" / "index.html"
    yield ROOT / "html_templates" / "section.html"

  def produced_files():
    yield OldHTML.working_dir / "index.html"
    for domain_key in parameters.DOMAINS.keys():
      yield OldHTML.working_dir / f"SAT_{domain_key}.html"

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

    index = {}
    for domain, questions in domain_to_questions.items():
      superdomain = parameters.SUPERDOMAINS[domain.superdomain_key]
      subdomains = taxonomy[superdomain][domain]
      html_name = f"SAT_{domain.key}.html"

      with open(OldHTML.working_dir / html_name, 'w') as f:
        f.write(env.get_template("section.html").render(
          domain_name=domain.name,
          domain_key=domain.key,
          subdomains=subdomains,
          questions=questions,
          timestamp=TIMESTAMP
        ))

      if superdomain.name not in index:
        index[superdomain.name] = {}
      index[superdomain.name][domain.name] = (html_name, subdomains)

    with open(OldHTML.working_dir / "index.html", 'w') as f:
      f.write(env.get_template("index.html").render(index=index, timestamp=TIMESTAMP))

def run_pipeline(stages):
  for stage in stages:
    if hasattr(stage, 'working_dir'):
      stage.working_dir.mkdir(exist_ok=True)

    description = stage.__doc__

    upstream_mtime = max(
      (f.stat().st_mtime for f in stage.required_files() if f.exists()),
      default=0
    )
    downstream_mtime = min(
      (f.stat().st_mtime for f in stage.produced_files() if f.exists()),
      default=1
    )
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
  stages = [Scrape, Distill, QuestionDataJS, NewHTML, OldHTML]
  run_pipeline(stages)

if __name__ == '__main__':
  main()
