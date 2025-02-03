import sys
import json
import string
from pathlib import Path

import sat_question_api as SAT

from bs4 import BeautifulSoup

HEAD = f"""<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>"""

INDEX_HTML_FORMAT = f"<!DOCTYPE html><html>{HEAD}<body>{{}}</body></html>"

def log(message, **kwargs):
  print(f"[LOG] {message}", file=sys.stderr, flush=True, **kwargs)

def die(message):
  print(message)
  sys.exit(1)

def usage():
  die(f"usage: {sys.argv[0]} <scrape_directory> <output_directory>")

def format_options(options):
  list_items = ''.join(f"<li>{option}</li>" for option in options)
  return f"""<div class="flex-row-item"><ol type="A">{list_items}</ol></div>"""

def replace_mfenced(html_string):
  '''
  <mfenced>...</mfenced> -> <mrow><mo>(</mo>...<mo>)</mo></mrow>
  '''
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
  N = len(questions)

  subdomains = set()
  question_elements = []

  for index, question in enumerate(questions):
    if 'item_id' in question:
      # special handling
      identifier = question['item_id']
      assert question['item_id'].endswith('DC')
      stimulus = question.get('body', '')
      stem = question.get('prompt', '')
      qtype = question['answer']['style']
      if qtype == 'Multiple Choice':
        options = format_options(option['body'] for option in question['answer']['choices'].values())
        correct_answer = question['answer'].get('correct_choice', '')
      elif qtype == 'SPR':
        options = ''
        correct_answer = ''
      else:
        raise RuntimeError(f"Unexpected question type {qtype}")

      rationale = question['answer']['rationale']

    else:
      identifier = question['externalid']
      stimulus = question.get('stimulus', '')
      stem = question['stem']
      qtype = question['type']
      if qtype == 'mcq':
        options = format_options(option['content'] for option in question['answerOptions'])
      elif qtype == 'spr':
        options = ''
      else:
        raise RuntimeError(f"Unexpected question type {qtype}")

      correct_answer = ', '.join(question['correct_answer'])
      rationale = question['rationale']

    stimulus = replace_mfenced(stimulus)
    stem = replace_mfenced(stem)
    options = replace_mfenced(options)
    rationale = replace_mfenced(rationale)

    subdomains.add(question['subdomain'].title())
    question_elements.append(f"""
    <div class="question-block" difficulty="{question['difficulty']}">
      <div class="question-header">
        <b>Question {index+1}</b>
        <i class="selected-index">{index+1} of {N} selected</i>
        <span class="question-type">{question['domain']} > {question['subdomain']}</span>
        <span class="difficulty-{question['difficulty']}">{question['difficulty']}</span>
      </div>
      <div class="flex-row">
        <div class="flex-row-item">
          {stimulus}
          {stem}
        </div>
        {options}
      </div>
      <hr>
      <details>
        <summary>Show Answer</summary>
        <b>Correct Answer:</b> {correct_answer}
        {rationale}
      </details>
    </div>
    """)

  return subdomains, question_elements

def format_subdomains(subdomains):
  out = """<ul class="subdomains-list">"""
  for subdomain in subdomains:
    out += f"<li>{subdomain}</li>"
  out += "</ul>"
  return out

def main():
  if len(sys.argv) != 3:
    usage()

  scrape_directory = Path(sys.argv[1])
  output_directory = Path(sys.argv[2])
  index = {}
  for questions_file_path in sorted(scrape_directory.glob("*.json")):
    log(f"generating from {questions_file_path}", end='... ')
    subdomains, questions = parse_questions(questions_file_path)
    questions_string = ''.join(questions)

    output_html = f"""
    <!DOCTYPE html><html>
    {HEAD}
    <body>
      <a id="index-button" class="button" href="index.html">Return to Index</a>
      <div id="difficulty-filters">
        <div class="difficulty-filter">
          <label for="checkbox-H" class="difficulty-H">H</label>
          <input type="checkbox" id="checkbox-H" class="checkbox" checked>
        </div>

        <div class="difficulty-filter">
          <label for="checkbox-M" class="difficulty-M">M</label>
          <input type="checkbox" id="checkbox-M" class="checkbox" checked>
        </div>

        <div class="difficulty-filter">
          <label for="checkbox-E" class="difficulty-E">E</label>
          <input type="checkbox" id="checkbox-E" class="checkbox" checked>
        </div>
      </div>
      {questions_string}
    </body>
    <script src="script.js"></script>
    </html>
    """
    output_file_name = f"{questions_file_path.stem}.html"
    output_file_path = output_directory / output_file_name
    with open(output_file_path, 'w') as f:
      print(output_html, file=f)

    _, test_number, domain_code = questions_file_path.stem.split('_')
    test_number = int(test_number)
    test_name = SAT.parameters.TEST_NAMES[test_number]
    test_domain = SAT.parameters.DOMAINS[test_number][domain_code]
    #output_file_title = f"SAT > {test_name} > {test_domain}"
    #index[output_file_name] = (output_file_title, subdomains_string)

    if test_name not in index:
      index[test_name] = {}

    index[test_name][test_domain] = (output_file_name, sorted(subdomains))
    log("done")

  print(json.dumps(index, indent=4))

  with open(output_directory / "index.html", "w") as f:
    index_body = ""
    index_body += '<div class="outer">'
    for test_name, test_domains in index.items():
      index_body += '<div class="column">'
      index_body += f'<div class="column-title">{test_name}</div>'
      for test_domain, (filename, subdomains) in test_domains.items():
        index_body += f'<a class="button" href="{filename}">'
        index_body += f'<div class="test-domain">{test_domain}</div>'
        index_body += format_subdomains(subdomains)
        index_body += '</a>'

      index_body += '</div>'

    index_body += '</div>'
    '''
    index_row = """<a class="button" href="{}"><div>{}</div><div>{}</div></a>"""
    items = ''.join(
      index_row.format(filename, title, subdomains) for filename, (title, subdomains) in index.items()
    )
    '''

    index_html = INDEX_HTML_FORMAT.format(index_body)
    print(index_html, file=f)

if __name__ == '__main__':
  main()
