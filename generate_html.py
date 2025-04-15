import re
import sys
import json
import string
from pathlib import Path

from question import Question
import sat_question_api as SAT

import jinja2
from bs4 import BeautifulSoup

def log(message, **kwargs):
  print(f"[LOG] {message}", file=sys.stderr, flush=True, **kwargs)

def die(message):
  print(message)
  sys.exit(1)

def usage():
  die(f"usage: {sys.argv[0]} <scrape_directory> <output_directory>")

def format_attribute(s):
  return s.lower().replace(' ', '-')

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

def parse_questions(questions_file_path):
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

    stimulus = replace_mfenced(stimulus)
    stem = replace_mfenced(stem)
    options = list(map(replace_mfenced, options))
    rationale = replace_mfenced(rationale)

    subdomains.add(question['subdomain'].title())
    question_objects.append(Question(
      SAT.parameters.DIFFICULTIES[question['difficulty']].lower(),
      index,
      question['domain'],
      question['subdomain'],
      stimulus,
      stem,
      options,
      correct_answer,
      rationale
    ))

  return subdomains, question_objects

def main():
  if len(sys.argv) != 3:
    usage()

  scrape_directory = Path(sys.argv[1])
  output_directory = Path(sys.argv[2])
  loader = jinja2.FileSystemLoader(Path(__file__).parent / 'html_templates')
  env = jinja2.Environment(loader=loader)
  env.filters['format_attribute'] = format_attribute

  index = {}
  for questions_json_path in sorted(scrape_directory.glob("*.json")):
    questions_file_name = f"{questions_json_path.stem}.html"
    questions_path = output_directory / questions_file_name

    log(f"generating {questions_path} from {questions_json_path}", end='... ')

    # get metadata (test name, domain)
    _, test_number, domain_code = questions_path.stem.split('_')
    test_number = int(test_number)
    test_name = SAT.parameters.TEST_NAMES[test_number]
    test_domain = SAT.parameters.DOMAINS[test_number][domain_code]

    # get questions
    subdomains, questions = parse_questions(questions_json_path)
    subdomains = sorted(subdomains)

    # write question file
    questions_template = env.get_template("questions.html")
    questions_html = questions_template.render(
      domain=test_domain, subdomains=subdomains, questions=questions
    )
    open(questions_path, 'w').write(questions_html)

    # save metadata for generating the index
    if test_name not in index:
      index[test_name] = {}
    index[test_name][test_domain] = (questions_file_name, subdomains)
    print("done")

  index_path = output_directory / "index.html"
  log(f"generating {index_path}", end="... ")
  index_html = env.get_template("index.html").render(index=index)
  open(index_path, 'w').write(index_html)
  print("done")

if __name__ == '__main__':
  main()
