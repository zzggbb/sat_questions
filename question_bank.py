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
  response = requests.request(method, url, headers=HEADERS)
  ''' response structure: see example_responses/lookup.structure'''
  key = 'lookupData'
  with ok_response_json(response) as data:
    assert key in data
    return data[key]

def get_metaquestions(exam: models.Exam,
                      superdomain: models.Superdomain,
                      domain: models.Domain):
  url = URLS['questions']
  method = 'POST'
  payload = {
    'asmtEventId': exam.id,
    'test': superdomain.id,
    'domain': domain.original_acronym,
  }
  response = requests.request(method, url, headers=HEADERS, json=payload)
  """ example response:
    [
      {
          "updateDate": 1691007959838,
          "pPcc": "SAT#S",
          "questionId": "6d99b141",
          "skill_cd": "S.B.",
          "score_band_range_cd": 6,
          "uId": "0053ca91-ad76-40ab-8f72-b5b3ced85bee",
          "skill_desc": "Lines, angles, and triangles",
          "createDate": 1691007959838,
          "program": "SAT",
          "primary_class_cd_desc": "Geometry and Trigonometry",
          "ibn": null,
          "external_id": "dbda3b6a-f820-4919-8708-c6088f04c080",
          "primary_class_cd": "S",
          "difficulty": "H"
      },
      ...
    ]
  """

  with ok_response_json(response) as metaquestions:
    return metaquestions

def get_eid_question(metaquestion: dict):
  external_id = metaquestion['external_id']
  url = URLS['question_eid']
  method = 'POST'
  payload = {
    'external_id': external_id,
  }
  response = requests.request(method, url, headers=HEADERS, json=payload)
  """ example response:
    {
      "keys": [
          "faeacd70-4539-4aad-b1db-67e1f2265bb9"
      ],
      "rationale": "ESCAPED HTML",
      "origin": "manifold",
      "stem": "ESCAPED HTML",
      "externalid": "62bc2dfe-0a0c-45ec-a764-c5f84ddbce67",
      "templateid": "cec7c28f-c417-4bf5-a857-a441ed54e2d0",
      "vaultid": "d20a75cb-b0e3-42e8-bf52-d342e850550f",
      "type": "mcq",
      "answerOptions": [
        {
          "id": "ae00d44c-9ee5-4524-aac2-6d8f6118919a",
          "content": "ESCAPED HTML"
        }, {
          "id": "faeacd70-4539-4aad-b1db-67e1f2265bb9",
          "content": "ESCAPED HTML"
        }, {
          "id": "90e604c9-cf62-4f87-a7d5-f1867a3cd081",
          "content": "ESCAPED HTML"
        }, {
          "id": "9bb36dc4-0d54-42b3-87ca-fff4941ae2a0",
          "content": "ESCAPED HTML"
        }
      ],
      "correct_answer": [ "B" ]
    }
  """

  with ok_response_json(response) as data:
    return data

def get_ibn_question(metaquestion: dict):
  ibn = metaquestion['ibn']
  url = URLS['question_ibn'].format(ibn=ibn)
  method = 'GET'
  response = requests.request(method, url, headers=HEADERS)
  """ example response:
    [
      {
          "item_id": "05759-DC",
          "section": "Math",
          "body": "ESCAPED HTML",
          "prompt": "ESCAPED HTML",
          "answer": {
              "style": "SPR",
              "rationale": "ESCAPED HTML"
          }
      }
    ]
  """

  with ok_response_json(response) as data:
    assert len(data) == 1
    return data[0]

def get_question_maindata(metaquestion):
  ibn = metaquestion['ibn']
  eid = metaquestion['external_id']
  method = get_eid_question if (ibn is None) else get_ibn_question
  maindata = method(metaquestion)

  if 'item_id' in maindata:
    identifier = maindata['item_id']
    stimulus = maindata.get('body', '')
    stem = maindata.get('prompt', '')
    rationale = maindata['answer']['rationale']

    qtype = maindata['answer']['style']
    if qtype == 'Multiple Choice':
      options = [option['body'] for option in maindata['answer']['choices'].values()]
      if 'correct_choice' in maindata['answer']:
        correct_answer = maindata['answer']['correct_choice'].upper()
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

  elif 'externalid' in maindata:
    identifier = maindata['externalid']
    stimulus = maindata.get('stimulus', '')
    stem = maindata['stem']
    rationale = maindata['rationale']

    qtype = maindata['type']
    if qtype == 'mcq':
      options = [option['content'] for option in maindata ['answerOptions']]
    elif qtype == 'spr':
      options = []
    else:
      raise RuntimeError(f"Unexpected question type {qtype}")

    correct_answer = ', '.join(maindata['correct_answer'])

  else:
    raise RuntimeError(f"Question maindata had no 'item_id' or 'externalid'")

  answer_type = models.AnswerType['MCQ'] if len(options) > 0 else models.AnswerType['FRQ']

  return {
    'answer_type': answer_type,
    'stimulus': stimulus,
    'stem': stem,
    'options': options,
    'correct_answer': correct_answer,
    'rationale': rationale,
  }
