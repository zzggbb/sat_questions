# standard
import re
import pickle
import datetime
import itertools
from pathlib import Path
from collections import namedtuple

# project local
import question_bank_api as qbank
import parameters
from question import Question
from pipeline import Pipeline

# 3rd party
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

ROOT = Path(__file__).parent
TIMESTAMP = datetime.datetime.now(datetime.timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
TEMPLATES = "template_html"
LOADER = jinja2.FileSystemLoader(ROOT / TEMPLATES)
ENV = jinja2.Environment(loader=LOADER, trim_blocks=True, lstrip_blocks=True)
ENV.globals['timestamp'] = TIMESTAMP
ENV.filters['fmtattr'] = format_attribute

pipeline = Pipeline()

@pipeline.add_stage
class Scrape:
  working_dir = ROOT / "scrapes"

  def required_files():
    yield from []

  def produced_files():
    for domain in parameters.DOMAINS.values():
      yield Scrape.working_dir / domain.filename("json")

  def run():
    for domain in parameters.DOMAINS.values():
      questions = list(qbank.get_questions(EVENT_NUMBER, domain))
      json.dump(questions, open(Scrape.working_dir / domain.filename("json"), "w"))

@pipeline.add_stage
class Distill:
  working_dir = ROOT / "distilled"

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

  def parse_questions(domain):
    '''
    returns tuple(
      sorted list[str] of shortened subdomain names,
      list[Question]
    )
    '''
    domain_scrape_path = Scrape.working_dir / domain.filename('json')
    questions = json.load(open(domain_scrape_path))
    subdomain_objects = dict()
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

      '''
      DO NOT KEY WITH THE ORIGINAL SUBDOMAIN NAME
      The college board made mistakes, like inconsistent capitalization:
      * Cross-Text Connections
      * Cross-text Connections
      '''
      '''
      subdomain_name = question['subdomain']
      obj = parameters.Subdomain(subdomain_name)
      if obj.name not in subdomain_name_to_obj:
        subdomain_name_to_obj[obj.name] = obj

      subdomain = subdomain_name_to_obj[obj.name]
      '''
      original_subdomain_name = question['subdomain']
      temp_subdomain = parameters.Subdomain(original_subdomain_name)
      if temp_subdomain.name not in subdomain_objects:
        subdomain_objects[temp_subdomain.name] = temp_subdomain

      subdomain = subdomain_objects[temp_subdomain.name]


      response_type = 'mcq' if len(options) > 0 else 'frq'
      difficulty = question['difficulty']

      stimulus = Distill.replace_mfenced(stimulus)
      stem = Distill.replace_mfenced(stem)
      options = list(map(Distill.replace_mfenced, options))
      rationale = Distill.replace_mfenced(rationale)

      question = Question(
        domain, index, subdomain, response_type, difficulty,
        stimulus, stem, options, correct_answer, rationale
      )
      question_objects.append(question)

    subdomains = sorted(subdomain_objects.values())
    return subdomains, question_objects

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
    for domain in parameters.DOMAINS.values():
      superdomain = parameters.SUPERDOMAINS[domain.superdomain_key]

      print(f"Parsing {superdomain.name} > {domain.name}", end='... ')
      subdomains, questions = Distill.parse_questions(domain)

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

@pipeline.add_stage
class TaxonomyJS:
  working_dir = ROOT / "static" / "data"
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

@pipeline.add_stage
class SubdomainsJS:
  working_dir = ROOT / "static" / "data"
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

@pipeline.add_stage
class DifficultiesJS:
  working_dir = ROOT / "static" / "data"
  output_file = working_dir / "difficulties.js"

  def required_files():
    yield ROOT / "parameters.py"

  def produced_files():
    yield DifficultiesJS.output_file

  def run():
    difficulties = list(parameters.DIFFICULTIES.keys())
    difficulties_string = json.dumps(difficulties, indent=2)
    output = f"const DIFFICULTIES = {difficulties_string}"
    with open(DifficultiesJS.output_file, 'w') as f:
      f.write(output)

@pipeline.add_stage
class QuestionArrayJS:
  working_dir = ROOT / "static" / "data"

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

@pipeline.add_stage
class QuestionMetadataMapJS:
  working_dir = ROOT / "static" / "data"
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

#@pipeline.add_stage
class NewHTML:
  working_dir = ROOT / "html"

  def required_files():
    yield from Distill.produced_files()
    yield ROOT / TEMPLATES / "base.html"
    yield ROOT / TEMPLATES / "index2.html"

  def produced_files():
    yield NewHTML.working_dir / "index2.html"

  def run():
    taxonomy = pickle.load(open(Distill.working_dir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.working_dir / "questions.pickle", "rb"))

    html = ENV.get_template("index2.html").render(
      taxonomy=taxonomy, questions=questions
    )

    open(NewHTML.working_dir / "index2.html", "w").write(html)

@pipeline.add_stage
class OldHTML:
  working_dir = ROOT / "html"

  def required_files():
    yield from Distill.produced_files()
    yield ROOT / TEMPLATES / "base.html"
    yield ROOT / TEMPLATES / "index.html"
    yield ROOT / TEMPLATES / "section.html"

  def produced_files():
    yield OldHTML.working_dir / "index.html"
    for domain in parameters.DOMAINS.values():
      yield OldHTML.working_dir / domain.html_name

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
      with open(OldHTML.working_dir / domain.html_name, 'w') as f:
        f.write(ENV.get_template("section.html").render(
          taxonomy=taxonomy,
          domain=domain,
          difficulties=parameters.DIFFICULTIES.keys(),
          questions=list(questions)
        ))

def main():
  pipeline.run()

if __name__ == '__main__':
  main()
