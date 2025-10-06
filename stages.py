# standard
import re
import pickle
from datetime import datetime, timezone
import itertools
from pathlib import Path
from collections import namedtuple

# project local
import question_bank_api as qbank
import parameters
import models
from question import Question
from pipeline import Pipeline
import logger

# 3rd party
import pandas as pd
import jinja2
from bs4 import BeautifulSoup
import simplejson as json

pd.set_option('display.max_colwidth', 100)
pd.set_option('display.width', 1000)
pd.set_option('display.max_columns', None)

def format_attribute(s):
  out = s
  out = out.lower()
  out = out.replace(',','')
  out = out.replace(' ', '-')
  out = out.replace(':','-')
  out = out.replace('&', 'and')
  return out

ROOT = Path(__file__).parent
TIMESTAMP_HUMAN = datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
TIMESTAMP_MACHINE = int(datetime.now(timezone.utc).timestamp())
TEMPLATES = "template_html"
LOADER = jinja2.FileSystemLoader(ROOT / TEMPLATES)
ENV = jinja2.Environment(loader=LOADER, trim_blocks=True, lstrip_blocks=True)
ENV.globals['timestamp_human'] = TIMESTAMP_HUMAN
ENV.filters['fmtattr'] = format_attribute

pipeline = Pipeline()

@pipeline.add_stage
class Schema:
  cancel_downstream = False
  force_run = True
  wdir = ROOT / "pipeline" / "Schema"

  def required_paths():
    yield from []

  def produced_paths():
    yield Schema.wdir / f"standardized_tests.pickle"
    yield Schema.wdir / f"classifications.pickle"

  def get_schema():
    lookup = qbank.get_lookup()

    standardized_tests = pd.DataFrame(lookup['assessment'])
    standardized_tests.id = standardized_tests.id.astype('int')
    standardized_tests.rename(columns=dict(text='name'), inplace=True)
    standardized_tests = standardized_tests.apply(
      lambda r: models.StandardizedTest(**r),
      axis="columns"
    )

    superdomains = pd.DataFrame(lookup['test'])
    assert superdomains.text.str.contains('Reading and Writing').any()
    superdomains.text.replace('Reading and Writing', 'R&W', inplace=True)
    superdomains.set_index('text', inplace=True)
    superdomains.id = superdomains.id.astype(int)

    classifications = []
    for superdomain_name, domains in lookup['domain'].items():
      superdomain_obj = models.Superdomain(superdomain_name,superdomains.loc[superdomain_name, 'id'])
      for domain in domains:
        domain_obj = models.Domain(domain['text'], domain['primaryClassCd'])
        for skill in domain['skill']:
          subdomain_obj = models.Subdomain(skill['text'])
          subdomain_name = subdomain_obj.name
          classifications.append(
            dict(
              superdomain=superdomain_obj,
              domain=domain_obj,
              subdomain_obj=subdomain_obj,
              subdomain_name=subdomain_name,
            )
          )

    classifications = pd.DataFrame(classifications)
    columns = classifications.columns.values.tolist()
    classifications.sort_values(by=columns, inplace=True, ignore_index=True)

    for i, subdomain_obj in enumerate(classifications.subdomain_obj):
      subdomain_obj.index = i

    for i, domain in enumerate(classifications.domain.unique()):
      domain.index = i

    return standardized_tests, classifications

  def run():
    for path, df in zip(Schema.produced_paths(), Schema.get_schema()):
      with logger.timer(f"write {type(df)} {df.shape} to {path}"):
        df.to_pickle(path)

@pipeline.add_stage
class Metaquestions:
  cancel_downstream = False
  force_run = True
  wdir = ROOT / "pipeline" / "Metaquestions"

  def required_paths():
    yield from Schema.produced_paths()

  def produced_paths():
    yield Metaquestions.wdir / f"metaquestions.pickle"

  def run():
    stests, classifications = map(pd.read_pickle, Metaquestions.required_paths())

    def get_subdomain_obj(row):
      original_subdomain_name = row['skill_desc']
      subdomain_name = models.Subdomain.fix_name(original_subdomain_name)
      return classifications.loc[classifications.subdomain_name == subdomain_name, 'subdomain_obj'].item()


    df = pd.DataFrame()
    for test, (superdomain, domain) in itertools.product(
      stests,
      classifications.groupby(['superdomain', 'domain']).groups.keys()
    ):
      with logger.timer(' > '.join([test.name, superdomain.name, domain.name])):
        metaquestions = qbank.get_metaquestions(test, superdomain, domain)
        mq_df = pd.DataFrame(metaquestions)
        mq_df['test'] = test
        mq_df['superdomain'] = superdomain
        mq_df['domain'] = domain
        mq_df['subdomain'] = mq_df.apply(get_subdomain_obj, axis="columns")
        mq_df['index_within_domain'] = mq_df.index

        # usually the ibn is null, but sometimes it's an empty string
        mq_df.ibn = mq_df.ibn.replace('', None)

        mq_df.drop(columns=[
          'pPcc',
          'questionId',
          'skill_cd',
          'score_band_range_cd',
          'uId',
          'skill_desc',
          'program',
          'primary_class_cd_desc',
          'primary_class_cd',
        ], inplace=True)

        df = pd.concat([df, mq_df], ignore_index=True)

    for path in Metaquestions.produced_paths():
      df.to_pickle(path)

@pipeline.add_stage
class Questions:
  cancel_downstream = True
  force_run = True
  wdir = ROOT / "pipeline" / "Questions"

  def required_paths():
    yield from Metaquestions.produced_paths()

  def produced_paths():
    yield Questions.wdir / f"questions.pickle"

  def run():
    metaquestions = pd.read_pickle(next(Metaquestions.produced_paths()))
    logger.log(f"shape={metaquestions.shape} columns={metaquestions.columns}")

    '''
    line_header_suffix = f"({test.id} {superdomain.id} {domain.original_acronym})"
    line_header = ' > '.join([
      f"{test.name:<20}",
      "{superdomain.name:<4}",
      "{domain.name:<33}",
    ]) + line_header_suffix

    N = len(question_metadatas)
    with multiprocessing.Pool() as pool:
      questions = []
      for i, question in enumerate(pool.imap(get_question, question_metadatas)):
        questions.append(question)
        index = i+1
        percent = index/N*100
        line_status = f"{index:03}/{N} {percent:05.1f}%"
        log(f"{line_header} {line_status}", end='\r')

      log(f"{line_header} {line_status} finished.")
      return questions
    '''

@pipeline.add_stage
class Distill:
  wdir = ROOT / "pipeline"

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
    domain_scrape_path = Scrape.wdir / domain.filename('json')
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

  def required_paths():
    yield from Scrape.produced_paths()

  def produced_paths():
    yield Distill.wdir / "questions.pickle"
    yield Distill.wdir / "taxonomy.pickle"
    yield Distill.wdir / "subdomains.pickle"

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

    pickle.dump(all_questions, open(Distill.wdir / "questions.pickle", "wb"))
    pickle.dump(taxonomy, open(Distill.wdir / "taxonomy.pickle", "wb"))
    pickle.dump(all_subdomains, open(Distill.wdir / "subdomains.pickle", "wb"))

@pipeline.add_stage
class TaxonomyJS:
  wdir = ROOT / "static" / "data"
  input_file = Distill.wdir / "taxonomy.pickle"
  output_file = wdir / "taxonomy.js"

  def required_paths():
    yield TaxonomyJS.input_file

  def produced_paths():
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
  wdir = ROOT / "static" / "data"
  input_file = Distill.wdir / "subdomains.pickle"
  output_file = wdir / "subdomains.js"

  def required_paths():
    yield SubdomainsJS.input_file

  def produced_paths():
    yield SubdomainsJS.output_file

  def run():
    subdomains = pickle.load(open(SubdomainsJS.input_file, "rb"))
    subdomains_string = json.dumps([s.name for s in subdomains], indent=2)
    output = f"const SUBDOMAINS = {subdomains_string}"
    with open(SubdomainsJS.output_file, "w") as f:
      f.write(output)

@pipeline.add_stage
class DifficultiesJS:
  wdir = ROOT / "static" / "data"
  output_file = wdir / "difficulties.js"

  def required_paths():
    yield ROOT / "parameters.py"

  def produced_paths():
    yield DifficultiesJS.output_file

  def run():
    difficulties = list(parameters.DIFFICULTIES.keys())
    difficulties_string = json.dumps(difficulties, indent=2)
    output = f"const DIFFICULTIES = {difficulties_string}"
    with open(DifficultiesJS.output_file, 'w') as f:
      f.write(output)

@pipeline.add_stage
class QuestionArrayJS:
  wdir = ROOT / "static" / "data"

  def required_paths():
    yield Distill.wdir / "questions.pickle"

  def produced_paths():
    yield QuestionArrayJS.wdir / "question_array.js"

  def run():
    path = QuestionArrayJS.wdir / "question_array.js"
    questions = pickle.load(open(Distill.wdir / "questions.pickle", "rb"))
    question_array_string = json.dumps(questions, default=lambda o: vars(o), indent=2)
    output = f"const QUESTION_ARRAY = {question_array_string}"
    with open(path, 'w') as f:
      f.write(output)

@pipeline.add_stage
class QuestionMetadataMapJS:
  wdir = ROOT / "static" / "data"
  input_file = Distill.wdir / "questions.pickle"
  output_file = wdir / "question_metadata_map.js"

  def required_paths():
    yield QuestionMetadataMapJS.input_file

  def produced_paths():
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
  wdir = ROOT / "html"

  def required_paths():
    yield from Distill.produced_paths()
    yield ROOT / TEMPLATES / "base.html"
    yield ROOT / TEMPLATES / "index2.html"

  def produced_paths():
    yield NewHTML.wdir / "index2.html"

  def run():
    taxonomy = pickle.load(open(Distill.wdir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.wdir / "questions.pickle", "rb"))

    html = ENV.get_template("index2.html").render(
      taxonomy=taxonomy, questions=questions
    )

    open(NewHTML.wdir / "index2.html", "w").write(html)

@pipeline.add_stage
class OldHTML:
  wdir = ROOT / "html"

  def required_paths():
    yield from Distill.produced_paths()
    yield ROOT / TEMPLATES / "base.html"
    yield ROOT / TEMPLATES / "index.html"
    yield ROOT / TEMPLATES / "section.html"

  def produced_paths():
    yield OldHTML.wdir / "index.html"
    for domain in parameters.DOMAINS.values():
      yield OldHTML.wdir / domain.html_name

  def run():
    taxonomy = pickle.load(open(Distill.wdir / "taxonomy.pickle", "rb"))
    questions = pickle.load(open(Distill.wdir / "questions.pickle", "rb"))
    subdomains = pickle.load(open(Distill.wdir / "subdomains.pickle", "rb"))

    subdomains_per_superdomain = {
      superdomain: sum(len(subdomains) for domain, subdomains in domains.items())
      for superdomain, domains in taxonomy.items()
    }

    with open(OldHTML.wdir / "index.html", 'w') as f:
      f.write(ENV.get_template("index.html").render(
        taxonomy=taxonomy,
        all_subdomains=subdomains,
        subdomains_per_superdomain=subdomains_per_superdomain,
        difficulties=parameters.DIFFICULTIES.keys()
      ))

    for domain, questions in itertools.groupby(questions, lambda q: q.domain):
      with open(OldHTML.wdir / domain.html_name, 'w') as f:
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
