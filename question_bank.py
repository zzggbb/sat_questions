# standard
import re
from contextlib import contextmanager

# project local
import models
import logger

# 3rd party
import requests

HEADERS = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' }

URLS = {
  'lookup': 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/lookup',
  'question_eid': 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question',
  'question_ibn': 'https://saic.collegeboard.org/disclosed/{ibn}.json',
  'questions': 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions'
}

@contextmanager
def ok_response_json(response):
  if response.status_code == 200:
    yield response.json()
  else:
    req = response.request
    raise RuntimeError(f"ERROR: {req.method} {req.url} -> {response.text}")

def get_lookup():
  url = URLS['lookup']
  method = 'GET'

  # see docs/example_responses/lookup.json
  response = requests.request(method, url, headers=HEADERS)

  key = 'lookupData'
  with ok_response_json(response) as data:
    assert key in data
    return data[key]

def get_questions_meta(exam: models.Exam,
                      superdomain: models.Superdomain,
                      domain: models.Domain):
  url = URLS['questions']
  method = 'POST'
  payload = {
    'asmtEventId': exam.id,
    'test': superdomain.id,
    'domain': domain.original_acronym,
  }

  # see docs/example_responses/questions_meta.json
  response = requests.request(method, url, headers=HEADERS, json=payload)

  with ok_response_json(response) as questions_meta:
    return questions_meta

def get_eid_question(question_meta: dict):
  external_id = question_meta['external_id']
  url = URLS['question_eid']
  method = 'POST'
  payload = {
    'external_id': external_id,
  }

  # see docs/example_responses/eid_question.json
  response = requests.request(method, url, headers=HEADERS, json=payload)

  with ok_response_json(response) as data:
    return data

def get_ibn_question(question_meta: dict):
  ibn = question_meta['ibn']
  url = URLS['question_ibn'].format(ibn=ibn)
  method = 'GET'

  # see docs/example_responses/ibn_question.json
  response = requests.request(method, url, headers=HEADERS)

  with ok_response_json(response) as data:
    assert len(data) == 1
    return data[0]

def get_question_main(question_meta):
  ibn = question_meta['ibn']
  eid = question_meta['external_id']
  method = get_eid_question if (ibn is None) else get_ibn_question
  question_main = method(question_meta)

  if 'item_id' in question_main:
    identifier = question_main['item_id']
    stimulus = question_main.get('body', '')
    stem = question_main.get('prompt', '')
    rationale = question_main['answer']['rationale']

    qtype = question_main['answer']['style']
    if qtype == 'Multiple Choice':
      options = [option['body'] for option in question_main['answer']['choices'].values()]
      if 'correct_choice' in question_main['answer']:
        correct_answer = question_main['answer']['correct_choice'].upper()
      else:
        needle = r'Choice ([A-Z]) is correct'
        search_result = re.search(needle, rationale)
        if search_result:
          correct_answer = search_result.group(1).upper() # first match
        else:
          logger.log(f"FAILED TO DETECT MULTIPLE CHOICE ANSWER FOR {identifier}")
          correct_answer = None

    elif qtype == 'SPR':
      options = []
      correct_answer = None
    else:
      raise RuntimeError(f"Unexpected question type {qtype}")

  elif 'externalid' in question_main:
    identifier = question_main['externalid']
    stimulus = question_main.get('stimulus', '')
    stem = question_main['stem']
    rationale = question_main['rationale']

    qtype = question_main['type']
    if qtype == 'mcq':
      options = [option['content'] for option in question_main ['answerOptions']]
    elif qtype == 'spr':
      options = []
    else:
      raise RuntimeError(f"Unexpected question type {qtype}")

    correct_answer = ', '.join(question_main['correct_answer'])

  else:
    raise RuntimeError(f"question_main had no 'item_id' or 'externalid'")

  return {
    'stimulus': stimulus,
    'stem': stem,
    'options': options,
    'correct_answer': correct_answer,
    'rationale': rationale,
  }
