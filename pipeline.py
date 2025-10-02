import re
import pickle
import datetime
import itertools
from pathlib import Path
from collections import namedtuple

import question_bank_api as qbank
import parameters
from question import Question

import jinja2
from bs4 import BeautifulSoup
import simplejson as json

EVENT_NUMBER = 99 # see parameters.EVENT_NAMES

def format_attribute(s):
  out = s
  out = out.lower()
  out = out.replace(',','')
  out = out.replace(' ', '-')
  out = out.replace(':','-')
  out = out.replace('&', 'and')
  return out

def get_domain_filename(domain_key, extension):
  superdomain_key = parameters.DOMAINS[domain_key].superdomain_key
  return f"SAT_{superdomain_key}_{domain_key}.{extension}"

def get_domain_html_name(domain_key):
  return get_domain_filename(domain_key, "html")

ROOT = Path(__file__).parent
TIMESTAMP = datetime.datetime.now(datetime.timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
LOADER = jinja2.FileSystemLoader(ROOT / "html_templates")
ENV = jinja2.Environment(loader=LOADER, trim_blocks=True, lstrip_blocks=True)
ENV.globals['timestamp'] = TIMESTAMP
ENV.filters['fmtattr'] = format_attribute
ENV.filters['get_domain_html_name'] = get_domain_html_name

class Scrape:
  """Scrape"""

  working_dir = ROOT / "scrapes"

  def required_files():
    yield from []

  def produced_files():
    for domain_key in parameters.DOMAINS.keys():
      yield Scrape.working_dir / get_domain_filename(domain_key, "json")

  def run():
    for domain_key, domain in parameters.DOMAINS.items():
      filename = get_domain_filename(domain_key, "json")
      questions = list(qbank.get_questions(EVENT_NUMBER, domain))
      json.dump(questions, open(Scrape.working_dir / filename, "w"))

class Distill:
  """Distill"""

  working_dir = ROOT / "distilled"

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

  def parse_questions(domain_key):
    '''
    returns tuple(
      sorted list[str] of shortened subdomain names,
      list[Question]
    )
    '''
    domain_scrape_path = Scrape.working_dir / get_domain_filename(domain_key, 'json')
    questions = json.load(open(domain_scrape_path))
    subdomain_name_to_obj = dict()
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

      subdomain_name = question['subdomain']
      if subdomain_name not in subdomain_name_to_obj:
        subdomain_name_to_obj[subdomain_name] = parameters.Subdomain(subdomain_name)
      subdomain = subdomain_name_to_obj[subdomain_name]

      response_type = 'mcq' if len(options) > 0 else 'frq'
      difficulty = question['difficulty']

      stimulus = Distill._replace_mfenced(stimulus)
      stem = Distill._replace_mfenced(stem)
      options = list(map(Distill._replace_mfenced, options))
      rationale = Distill._replace_mfenced(rationale)

      question = Question(
        domain_key, index, subdomain, response_type, difficulty,
        stimulus, stem, options, correct_answer, rationale
      )
      question_objects.append(question)

    subdomains = subdomain_name_to_obj.values()
    return sorted(subdomains), question_objects

  def required_files():
    yield from Scrape.produced_files()

  def produced_files():
    yield Distill.working_dir / "questions.pickle"
    yield Distill.working_dir / "taxonomy.pickle"
    yield Distill.working_dir / "subdomains.pickle"

  def run():
    all_subdomains = []
    all_questions = []
    taxonomy = {}
    for domain_key, domain in parameters.DOMAINS.items():
      superdomain = parameters.SUPERDOMAINS[domain.superdomain_key]

      print(f"Parsing {superdomain.name} > {domain.name}", end='... ')
      subdomains, questions = Distill.parse_questions(domain_key)

      all_subdomains.extend(subdomains)
      all_questions.extend(questions)

      if superdomain not in taxonomy: taxonomy[superdomain] = {}
      taxonomy[superdomain][domain] = subdomains
      print("Finished")

    '''
    Subdomain index can only be calculated once all the questions have been processed
    '''
    for i, subdomain in enumerate(all_subdomains):
      subdomain.set_index(i)

    pickle.dump(all_questions, open(Distill.working_dir / "questions.pickle", "wb"))
    pickle.dump(taxonomy, open(Distill.working_dir / "taxonomy.pickle", "wb"))
    pickle.dump(all_subdomains, open(Distill.working_dir / "subdomains.pickle", "wb"))

class TaxonomyJS:
  """TaxonomyJS"""

  working_dir = ROOT / "static"
  input_file = Distill.working_dir / "taxonomy.pickle"
  output_file = working_dir / "taxonomy.js"

  def required_files():
    yield TaxonomyJS.input_file

  def produced_files():
    yield TaxonomyJS.output_file

  def run():
    taxonomy = pickle.load(open(TaxonomyJS.input_file, "rb"))
    taxonomy_json = {}
    for superdomain, domains in taxonomy.items():
      taxonomy_json[superdomain.key] = {}
      for domain, subdomains in domains.items():
        taxonomy_json[superdomain.key][domain.key] = []
        for subdomain in subdomains:
          taxonomy_json[superdomain.key][domain.key].append(subdomain.index)

    taxonomy_string = json.dumps(taxonomy_json, indent=2)
    output = f"const TAXONOMY = {taxonomy_string}"
    with open(TaxonomyJS.output_file, 'w') as f:
      f.write(output)

class SubdomainsJS:
  """SubdomainsJS"""

  working_dir = ROOT / "static"
  input_file = Distill.working_dir / "subdomains.pickle"
  output_file = working_dir / "subdomains.js"

  def required_files():
    yield SubdomainsJS.input_file

  def produced_files():
    yield SubdomainsJS.output_file

  def run():
    subdomains = pickle.load(open(SubdomainsJS.input_file, "rb"))
    subdomains_string = json.dumps([s.name for s in subdomains], indent=2)
    output = f"const SUBDOMAINS = {subdomains_string}"
    with open(SubdomainsJS.output_file, "w") as f:
      f.write(output)

class QuestionArrayJS:
  """QuestionArrayJS"""

  working_dir = ROOT / "static"

  def required_files():
    yield Distill.working_dir / "questions.pickle"

  def produced_files():
    yield QuestionArrayJS.working_dir / "question_array.js"

  def run():
    path = QuestionArrayJS.working_dir / "question_array.js"
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))
    question_array_string = json.dumps(questions, default=lambda o: vars(o), indent=2)
    output = f"const QUESTION_ARRAY = {question_array_string}"
    with open(path, 'w') as f:
      f.write(output)

class QuestionMetadataMapJS:
  """QuestionMetadataMapJS"""

  force_run = True
  working_dir = ROOT / "static"
  input_file = Distill.working_dir / "questions.pickle"
  output_file = working_dir / "question_metadata_map.js"

  def required_files():
    yield QuestionMetadataMapJS.input_file

  def produced_files():
    yield QuestionMetadataMapJS.output_file

  def run():
    questions = pickle.load(open(QuestionMetadataMapJS.input_file, "rb"))
    metadata_keys = [
      "index",
      "subdomain_index",
      "response_type",
      "difficulty"
    ]
    question_metadata_map = {
      'columns': metadata_keys,
      'rows': {}
    }
    for question in questions:
      question_metadata = []
      for key in metadata_keys:
        value = question.subdomain.index if key == "subdomain_index" else getattr(question, key)
        question_metadata.append(value)

      question_metadata_map['rows'][question.uuid] = question_metadata

    question_metadata_map_string = json.dumps(question_metadata_map, separators=(',', ':'))
    output = f"const QUESTION_METADATA_MAP = {question_metadata_map_string}"
    with open(QuestionMetadataMapJS.output_file, 'w') as f:
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
    taxonomy = pickle.load(open(Distill.working_dir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))

    html = ENV.get_template("index2.html").render(
      taxonomy=taxonomy, questions=questions
    )

    open(NewHTML.working_dir / "index2.html", "w").write(html)

class OldHTML:
  """OldHTML"""

  working_dir = ROOT / "html"
  force_run = True

  def required_files():
    yield from Distill.produced_files()
    yield ROOT / "html_templates" / "base.html"
    yield ROOT / "html_templates" / "index.html"
    yield ROOT / "html_templates" / "section.html"

  def produced_files():
    yield OldHTML.working_dir / "index.html"
    for domain_key in parameters.DOMAINS.keys():
      yield OldHTML.working_dir / get_domain_html_name(domain_key)

  def run():
    taxonomy = pickle.load(open(Distill.working_dir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))
    subdomains = pickle.load(open(Distill.working_dir / "subdomains.pickle", "rb"))

    subdomains_per_superdomain = {
      superdomain: sum(len(subdomains) for domain, subdomains in domains.items())
      for superdomain, domains in taxonomy.items()
    }

    with open(OldHTML.working_dir / "index.html", 'w') as f:
      f.write(ENV.get_template("index.html").render(
        taxonomy=taxonomy,
        all_subdomains=subdomains,
        subdomains_per_superdomain=subdomains_per_superdomain,
        difficulties=parameters.DIFFICULTIES.keys()
      ))

    for domain, questions in itertools.groupby(questions, lambda q: q.domain):
      with open(OldHTML.working_dir / get_domain_html_name(domain.key), 'w') as f:
        f.write(ENV.get_template("section.html").render(
          taxonomy=taxonomy,
          domain=domain,
          difficulties=parameters.DIFFICULTIES.keys(),
          questions=list(questions)
        ))

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
      print(f"[{description}] Already produced files; no upstream changes; skipping")
    else:
      print(f"[{description}] Started running...")
      stage.run()
      print(f"[{description}] Finished running.")

def main():
  stages = [
    Scrape,
    Distill,
    SubdomainsJS, TaxonomyJS, QuestionArrayJS, QuestionMetadataMapJS,
    NewHTML, OldHTML
  ]
  run_pipeline(stages)

if __name__ == '__main__':
  main()
