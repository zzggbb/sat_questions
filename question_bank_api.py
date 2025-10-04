# standard library
import sys
import requests
import multiprocessing

# local
import parameters

HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
}

def log(message):
  print(f"[LOG] {message}", file=sys.stderr, flush=True)

def get_eid_question(external_id: str):
  url = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-question'
  method = 'POST'
  payload = {
    'external_id': external_id,
  }
  response = requests.request(method, url, headers=HEADERS, json=payload)
  if response.status_code == 200:
    return response.json()

  raise RuntimeError(f"get_eid_question: SAT API returned error: {response.json()}")
  """
  example response:
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
          },
          {
              "id": "faeacd70-4539-4aad-b1db-67e1f2265bb9",
              "content": "ESCAPED HTML"
          },
          {
              "id": "90e604c9-cf62-4f87-a7d5-f1867a3cd081",
              "content": "ESCAPED HTML"
          },
          {
              "id": "9bb36dc4-0d54-42b3-87ca-fff4941ae2a0",
              "content": "ESCAPED HTML"
          }
      ],
      "correct_answer": [
          "B"
      ]
  }
  """

def get_ibn_question(ibn: str):
  url = f'https://saic.collegeboard.org/disclosed/{ibn}.json'
  method = 'GET'
  response = requests.request(method, url, headers=HEADERS)
  if response.status_code == 200:
    data = response.json()
    assert len(data) == 1
    return data[0]

  raise RuntimeError("get_ibn_question: SAT API returned error: {response.json()}")
  """
  example response:
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

def get_question(metadata):
  ibn = metadata['ibn']
  eid = metadata['external_id']
  #domain_code = metadata['primary_class_cd']

  if ibn:
    question = get_ibn_question(ibn)
  else:
    question = get_eid_question(eid)

  extra_metadata = {
    'subdomain': metadata['skill_desc'],
    'difficulty': metadata['difficulty'],
  }
  return question | extra_metadata

def get_questions(event_id: int, domain):
  """
  event_id: parameters.EVENT_IDS
  domain: parameters.Domain
  """
  event_name = parameters.EVENT_NAMES[event_id]
  superdomain = parameters.SUPERDOMAINS[domain.superdomain_key]
  line_header = f"{event_name} > {superdomain.name:<19} > {domain.name:<33}"

  url = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/get-questions'
  method = 'POST'
  payload = {
    'asmtEventId': event_id,
    'test': superdomain.number,
    'domain': domain.ugly,
  }
  response = requests.request(method, url, headers=HEADERS, json=payload)
  if response.status_code != 200:
    raise RuntimeError(f"get_questions: SAT API returned error: {response.json()}")

  question_metadatas = response.json()
  N = len(question_metadatas)
  with multiprocessing.Pool() as pool:
    questions = []
    for i, question in enumerate(pool.imap(get_question, question_metadatas)):
      questions.append(question)
      index = i+1
      percent = index/N*100
      line_status = f"{index:03}/{N} {percent:05.1f}%"
      print(f"[LOG] {line_header} {line_status}", end='\r', flush=True)

    print(f"[LOG] {line_header} {line_status} finished.", flush=True)
    return questions

  """
  example response:
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
    {
      ...
    },
    ...
  ]
  """
