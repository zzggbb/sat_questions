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
import simplejson as json

pd.set_option('display.max_colwidth', 100)
pd.set_option('display.width', 1000)
pd.set_option('display.max_columns', None)

ROOT = Path(__file__).parent
TIMESTAMP_HUMAN = datetime.now(timezone.utc).astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')
TIMESTAMP_MACHINE = int(datetime.now(timezone.utc).timestamp())
TEMPLATES = "template_html"
LOADER = jinja2.FileSystemLoader(ROOT / TEMPLATES)
ENV = jinja2.Environment(loader=LOADER)
ENV.globals['timestamp_human'] = TIMESTAMP_HUMAN

pipeline = Pipeline(ROOT / "pipeline")

class PickledDataFrameArtifact:
  read = lambda path: pd.read_pickle(path)
  write = lambda obj, path: obj.to_pickle(path)

class PickledArtifact:
  read = lambda path: pickle.load(open(path, 'rb'))
  write = lambda obj, path: pickle.dump(obj, open(path, 'wb'))

class StringArtifact:
  read = lambda path: open(path, 'r').read()
  write = lambda obj, path: open(path, 'w').write(obj)

class JinjaTemplateArtifact:
  read = lambda path: ENV.from_string(open(path).read())

@pipeline.add_stage
class Schema:
  produced = [
    ("exams", "exams.pickle", PickledDataFrameArtifact),
    ("classifications", "classifications.pickle", PickledDataFrameArtifact)
  ]

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
    for df in Schema.get_schema():
      yield df

@pipeline.add_stage
class QuestionsMeta:
  produced = [
    ("questions_meta", "questions_meta.pickle", PickledDataFrameArtifact)
  ]

  def run(exams, classifications):
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
        mq_df.difficulty = mq_df.difficulty.map(lambda d: models.Difficulty(d))
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

    yield df

@pipeline.add_stage
class QuestionsMain:
  produced = [
    ("questions_main", "questions_main.pickle", PickledArtifact)
  ]

  def run(questions_meta):
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

      yield questions_main

@pipeline.add_stage
class Questions:
  produced = [
    ('questions', "questions.pickle", PickledArtifact)
  ]

  def run(questions_meta, questions_main):
    questions_meta = questions_meta.to_dict(orient='records')
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
        difficulty = question_meta['difficulty'].letter,

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

    yield questions

    for uuid, count in question_copies.items():
      if count > 1:
        print(f"Question {uuid}: found {count} copies")

@pipeline.add_stage
class QuestionCounts:
  produced = [
    ('question_counts_html', 'question_counts.html', StringArtifact),
    ('question_counts_json', 'question_counts.json', StringArtifact)
  ]

  def run(questions):
    df = pd.DataFrame(dict(
      superdomain=[q.superdomain for q in questions],
      domain=[q.domain for q in questions],
      subdomain=[q.subdomain for q in questions],
      exam=[q.exam for q in questions],
      difficulty=[q.difficulty for q in questions],
    ))

    html_detailed = pd.crosstab(
      [df.superdomain, df.domain, df.subdomain],
      [df.exam, df.difficulty]
    ).replace(0, '-').to_html(
      header=True,
      table_id='question-counts-detailed'
    )

    html_simple = pd.crosstab(
     [df.superdomain, df.domain, df.subdomain],
     df.exam
    ).replace(0, '-').to_html(
      header=True,
      table_id='question-counts-simple'
    )

    css = open(ROOT / "static" / "style" / "question-counts.css", "r").read()
    yield f"{html_detailed}{html_simple}<style>{css}</style>"

    json = pd.crosstab(
      df.subdomain,
      [df.exam, df.difficulty]
    ).to_json(orient='records', indent=2)
    yield json

@pipeline.add_stage
class QuestionsJSON:
  produced = [
    ("questions_json", "questions.json", StringArtifact)
  ]
  def run(questions):
    yield '\n'.join(json.dumps(question, default=dict) for question in questions)

@pipeline.add_stage
class FrontendData:
  produced = [
    ('frontend_data', 'frontend_data.js', StringArtifact)
  ]
  def run(questions, exams, classifications, question_counts_json):
    out = dict(
      TOTAL_QUESTIONS = len(questions),
      EXAMS = exams.to_json(orient='records', indent=2),
      CLASSIFICATIONS = classifications.to_json(orient='records', indent=2),
      SUPERDOMAINS = json.dumps(list(classifications.superdomain.unique()), indent=2, default=dict),
      DOMAINS = json.dumps(list(classifications.domain.unique()), indent=2, default=dict),
      SUBDOMAINS = json.dumps(list(classifications.subdomain), indent=2, default=dict),
      DIFFICULTIES = json.dumps(models.DIFFICULTY_LETTERS, indent=2),
      ANSWER_TYPES = json.dumps(list(models.AnswerType.values()), indent=2),
      QUESTION_COUNTS = question_counts_json
    )
    out = '\n'.join(f"const {k} = {v}" for k, v in out.items())
    yield out

@pipeline.add_stage
class Index:
  required = [
    ('index_template', ROOT / TEMPLATES / 'index.html', JinjaTemplateArtifact)
  ]
  produced = [
    ('index_html', ROOT / 'html/index.html', StringArtifact)
  ]
  def run(index_template):
    yield index_template.render()

def main():
  if len(sys.argv) > 1:
    stage_names = sys.argv[1:]
    for stage_name in stage_names:
      pipeline.run(stage_name, force=True)
  else:
    pipeline.run_all()

if __name__ == '__main__':
  main()
