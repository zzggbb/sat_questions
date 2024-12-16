import sys
import json
import string
from pathlib import Path

import sat_question_api as SAT

STYLE = """<style>
  .sr-only {
    display: none;
  }
  .index-button {
    color: black;
    text-decoration: none;
    border: 1px solid black;
    padding: 5px;
    margin-bottom: 5px;
    display: table;
  }
  .question-block {
    margin: auto;
    margin-bottom: 5px;
    max-width: 12in;
    border: 1px solid black;
    padding: 5px;
  }
  .question-header {
    display: flex;
    justify-content: space-between;
  }
  .question-type {
    font-style: italic;
    font-size: small;
  }
  .difficulty-H {
    color: red;
  }
  .difficulty-M {
    color: orange;
  }
  .difficulty-E {
    color: green;
  }
  .flex-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
  .flex-row-item {
    /*max-width: 6in;*/
    flex-basis: 6in;
  }
</style>"""

HEAD = f"""<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {STYLE}
</head>"""

def log(message):
  print(f"[LOG] {message}", file=sys.stderr)

def die(message):
  print(message)
  sys.exit(1)

def usage():
  die(f"usage: {sys.argv[0]} <scrape_directory> <output_directory>")

def format_options(options):
  list_items = ''.join(f"<li>{option}</li>" for option in options)
  return f"""<div class="flex-row-item"><ol type="A">{list_items}</ol></div>"""

def get_question_html_blocks(questions_file_path):
  questions = json.load(open(questions_file_path))
  N = len(questions)
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

    yield f"""
    <div class="question-block">
      <div class="question-header">
        <b>Question {index+1}</b>
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
    """
    #log(f"parsed question {identifier} {index+1}/{N}")

def main():
  if len(sys.argv) != 3:
    usage()

  scrape_directory = Path(sys.argv[1])
  output_directory = Path(sys.argv[2])
  index = {}
  for questions_file_path in sorted(scrape_directory.glob("*.json")):
    questions = ''.join(get_question_html_blocks(questions_file_path))
    output_html = f"""
    <!DOCTYPE html><html>
    {HEAD}
    <body>
      <a class="index-button" href="index.html">Return to Index</a>
      {questions}
    </body>
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
    output_file_title = f"SAT > {test_name} > {test_domain}"
    index[output_file_name] = output_file_title

  with open(output_directory / "index.html", "w") as f:
    index_row = """<a class="index-button" href="{}">{}</a>"""
    items = ''.join(index_row.format(name, title) for name, title in index.items())

    index_html = f"""
    <!DOCTYPE html>
    <html>
    {HEAD}
    <body>
    {items}
    </body>
    </html>
    """
    print(index_html, file=f)

if __name__ == '__main__':
  main()
