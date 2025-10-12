# standard
import sys
import pickle
from datetime import datetime, timezone
import itertools
from pathlib import Path
import multiprocessing

# project local
import question_bank as qbank
import models
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
  #force_run = True
  wdir = ROOT / "pipeline" / "Schema"

  def required_paths():
    return {}

  def produced_paths():
    return {
      "exams": Schema.wdir / "exams.pickle",
      "classifications": Schema.wdir / f"classifications.pickle",
    }

  def get_schema():
    lookup = qbank.get_lookup()

    exams = pd.DataFrame(lookup['assessment'])
    exams.id = exams.id.astype('int')
    exams.rename(columns=dict(text='name'), inplace=True)
    exams = exams.apply(
      lambda r: models.Exam(**r),
      axis="columns"
    )
    exams.sort_values(inplace=True, ignore_index=True)

    superdomains = pd.DataFrame(lookup['test'])
    assert superdomains.text.str.contains('Reading and Writing').any()
    superdomains.text.replace('Reading and Writing', 'R&W', inplace=True)
    superdomains.set_index('text', inplace=True)
    superdomains.id = superdomains.id.astype(int)

    classifications = []
    for superdomain_name, domains in lookup['domain'].items():
      superdomain_id = superdomains.loc[superdomain_name, 'id']
      superdomain_obj = models.Superdomain(superdomain_name,superdomain_id)
      for domain in domains:
        domain_obj = models.Domain(domain['text'], domain['primaryClassCd'])
        for skill in domain['skill']:
          subdomain_obj = models.Subdomain(skill['text'])
          classifications.append(dict(
            superdomain=superdomain_obj,
            domain=domain_obj,
            subdomain=subdomain_obj
          ))

    classifications = pd.DataFrame(classifications)
    columns = classifications.columns.values.tolist()
    classifications.sort_values(by=columns, inplace=True, ignore_index=True)

    for i, subdomain_obj in enumerate(classifications.subdomain):
      subdomain_obj.index = i

    for i, domain_obj in enumerate(classifications.domain.unique()):
      domain_obj.index = i

    return exams, classifications

  def run():
    for path, df in zip(Schema.produced_paths().values(), Schema.get_schema()):
      with logger.timer(f"write {type(df)} {df.shape} to {path.relative_to(ROOT)}"):
        df.to_pickle(path)

@pipeline.add_stage
class QuestionsMeta:
  cancel_downstream = False
  #force_run = True
  wdir = ROOT / "pipeline" / "QuestionsMeta"

  def required_paths():
    return Schema.produced_paths()

  def produced_paths():
    return QuestionsMeta.wdir / f"questions_meta.pickle"

  def run():
    exams, classifications = map(pd.read_pickle, QuestionsMeta.required_paths().values())

    def get_subdomain_obj(row):
      original_subdomain_name = row['skill_desc']
      needle = models.Subdomain(original_subdomain_name)
      return classifications.loc[
        classifications.subdomain.map(lambda s: s == needle),
        'subdomain'
      ].item()

    df = pd.DataFrame()
    for exam, (superdomain, domain) in itertools.product(
      exams,
      classifications.groupby(['superdomain', 'domain']).groups.keys()
    ):
      with logger.timer(' > '.join([exam.short_name, superdomain.name, domain.name])):
        questions_meta = qbank.get_questions_meta(exam, superdomain, domain)
        mq_df = pd.DataFrame(questions_meta)
        mq_df['exam'] = exam
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

    df.to_pickle(QuestionsMeta.produced_paths())

@pipeline.add_stage
class QuestionCounts:
  cancel_downstream = False
  #force_run = True
  wdir = ROOT / "pipeline" / "QuestionCounts"

  def required_paths():
    return QuestionsMeta.produced_paths()

  def produced_paths():
    return QuestionCounts.wdir / "question_counts.html"

  def run():
    questions_meta = pd.read_pickle(QuestionsMeta.produced_paths())
    cross_table = pd.crosstab(
      [questions_meta.superdomain, questions_meta.domain, questions_meta.subdomain],
      questions_meta.exam
    )
    html = cross_table.replace(0, 'NONE').to_html(
      formatters={
        'superdomain': str,
        'domain': str,
        'subdomain': str
      },
      header=True,
      table_id = 'question-counts-table'
    )
    css = '''
    <style>
    #question-counts-table {
      border-collapse: collapse;
      td {
        padding: 1px;
        text-align: center;
      }
      th {
        vertical-align: middle;
      }
    }
    </style>
    '''
    out = f"{html}{css}"
    with open(QuestionCounts.produced_paths(), 'w') as f:
      print(out, file=f)


@pipeline.add_stage
class QuestionsMain:
  cancel_downstream = False
  wdir = ROOT / "pipeline" / "QuestionsMain"

  def required_paths():
    return QuestionsMeta.produced_paths()

  def produced_paths():
    return QuestionsMain.wdir / "questions_main.pickle"

  def run():
    questions_meta = pd.read_pickle(QuestionsMeta.produced_paths())
    logger.log(f"shape={questions_meta.shape} columns={questions_meta.columns}")

    n_questions = len(questions_meta)
    questions_main = []
    questions_meta = questions_meta.to_dict(orient='records')
    with logger.timer("downloading question main data", end="...\n"):
      with multiprocessing.Pool() as pool:
        for i, (question_meta, question_main) in enumerate(zip(
          questions_meta,
          pool.imap(qbank.get_question_main, questions_meta)
        )):
          questions_main.append(question_main)
          percent = i/n_questions*100
          line_status = f"{i:04}/{n_questions} {percent:05.1f}%"
          logger.log(f"{line_status}", end='\r')

      pickle.dump(questions_main, open(QuestionsMain.produced_paths(), 'wb'))

@pipeline.add_stage
class Questions:
  cancel_downstream = False
  #force_run = True
  wdir = ROOT / "pipeline" / "Questions"

  def required_paths():
    return {
      'meta': QuestionsMeta.produced_paths(),
      'main': QuestionsMain.produced_paths()
    }

  def produced_paths():
    return Questions.wdir / f"questions.pickle"

  def run():
    questions_meta = pd.read_pickle(Questions.required_paths()['meta']).to_dict(orient='records')
    questions_main = pickle.load(open(Questions.required_paths()['main'], 'rb'))
    n_questions = len(questions_meta)

    questions = []
    question_copies = {}

    index = 0
    for dirty_index, (question_meta, question_main) in enumerate(zip(
      questions_meta,
      questions_main
    )):
      question = models.Question(
        index = index,
        index_within_domain = question_meta['index_within_domain'],
        exam = question_meta['exam'],
        superdomain = question_meta['superdomain'],
        domain = question_meta['domain'],
        subdomain = question_meta['subdomain'],
        difficulty = question_meta['difficulty'],

        stimulus = question_main['stimulus'],
        stem = question_main['stem'],
        options = question_main['options'],
        correct_answer = question_main['correct_answer'],
        rationale = question_main['rationale']
      )

      if question.uuid not in question_copies:
        question_copies[question.uuid] = 0

      question_copies[question.uuid] += 1

      if question_copies[question.uuid] > 1:
        continue

      index += 1
      questions.append(question)
      percent = dirty_index/n_questions*100
      line_status = f"{dirty_index:04}/{n_questions} {percent:05.1f}%"
      logger.log(f"{line_status}", end='\r')

    pickle.dump(questions, open(Questions.produced_paths(), 'wb'))

    print()
    for uuid, count in question_copies.items():
      if count > 1:
        print(f"Question {uuid}: found {count} copies")

@pipeline.add_stage
class QuestionsJSON:
  cancel_downstream = False
  wdir = ROOT / "pipeline" / "Questions"

  def required_paths():
    return Questions.produced_paths()

  def produced_paths():
    return QuestionsJSON.wdir / "questions.json"

  def run():
    questions = pickle.load(open(QuestionsJSON.required_paths(), 'rb'))
    with open(QuestionsJSON.produced_paths(), 'w') as f:
      for question in questions:
        json_line = json.dumps(question, default=dict)
        print(json_line, file=f)

@pipeline.add_stage
class FrontendData:
  cancel_downstream = False
  wdir = ROOT / "pipeline" / "FrontendData"

  def required_paths():
    return {
      'questions': Questions.produced_paths(),
      'exams': Schema.wdir / "exams.pickle",
      'classifications': Schema.wdir / "classifications.pickle",
      'models': ROOT / "models.py",
    }

  def produced_paths():
    return FrontendData.wdir / "frontend_data.js"

  def run():
    questions = pickle.load(open(Questions.produced_paths(), 'rb'))
    exams = pd.read_pickle(FrontendData.required_paths()['exams'])
    classifications = pd.read_pickle(FrontendData.required_paths()['classifications'])

    out = dict(
      TOTAL_QUESTIONS = len(questions),
      EXAMS = exams.to_json(orient='records', indent=2),
      CLASSIFICATIONS = classifications.to_json(orient='records', indent=2),
      SUPERDOMAINS = json.dumps(list(classifications.superdomain.unique()), indent=2, default=dict),
      DOMAINS = json.dumps(list(classifications.domain.unique()), indent=2, default=dict),
      SUBDOMAINS = json.dumps(list(classifications.subdomain), indent=2, default=dict),
      DIFFICULTIES = json.dumps(list(models.Difficulty.values()), indent=2),
      ANSWER_TYPES = json.dumps(list(models.AnswerType.values()), indent=2)
    )
    out = '\n'.join(f"const {k} = {v}" for k, v in out.items())
    with open(FrontendData.produced_paths(), 'w') as f:
      print(out, file=f)

@pipeline.add_stage
class Index:
  cancel_downstream = True

  def required_paths():
    return ROOT / TEMPLATES / 'index.html'

  def produced_paths():
    return ROOT / 'html' / 'index.html'

  def run():
    with open(Index.produced_paths(), 'w') as f:
      f.write(ENV.get_template('index.html').render())

#@pipeline.add_stage
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

#@pipeline.add_stage
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

#@pipeline.add_stage
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

#@pipeline.add_stage
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

#@pipeline.add_stage
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

#@pipeline.add_stage
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

#@pipeline.add_stage
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
  if len(sys.argv) > 1:
    stage_names = sys.argv[1:]
    for stage_name in stage_names:
      pipeline.run(stage_name, force=True)
  else:
    pipeline.run_all()

if __name__ == '__main__':
  main()
