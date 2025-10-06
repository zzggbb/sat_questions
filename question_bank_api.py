# standard
from contextlib import contextmanager

# project local
from models import StandardizedTest, Superdomain, Domain
from logger import log

# 3rd party
import requests

HEADERS = { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64)' }

# A question is an "EID"-type if the "IBN" is null or an empty string
NULL_IBN = [None, '']

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

def get_eid_question(metadata: dict):
  external_id = metadata['external_id']
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

def get_ibn_question(metadata: dict):
  ibn = metadata['ibn']
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

def get_question(metaquestion):
  ibn = metadata['ibn']
  eid = metadata['external_id']
  method = get_eid_question if (ibn in NULL_IBN) else get_ibn_question
  return method(metadata) | {
    'difficulty': metadata['difficulty'],
    'subdomain_name': metadata['skill_desc']
  }

def get_metaquestions(test: StandardizedTest, superdomain: Superdomain, domain: Domain):
  line_header_suffix = f"({test.id} {superdomain.id} {domain.original_acronym})"
  line_header = ' > '.join([
    f"{test.name:<20}",
    "{superdomain.name:<4}",
    "{domain.name:<33}",
  ]) + line_header_suffix

  url = URLS['questions']
  method = 'POST'
  payload = {
    'asmtEventId': test.id,
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
