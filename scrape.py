import sys
import json
import multiprocessing
from pathlib import Path

import sat_question_api as SAT

def die(message):
  print(message)
  sys.exit(1)

def usage():
  print(f"""
  usage: {sys.argv[0]} <event_id> <test_id> <domain_id>
            event IDs: 99 - SAT
                       100 - PSAT/NMSQT & PSAT 10
                       102 - PSAT 8/9
             test IDS: 1 - Reading & Writing
                       2 - Math
           domain IDS: INI - Information and Ideas
                       CAS - Craft and Structure
                       EOI - Expression of Ideas
                       SEC - Standard English Conventions
                       H - Algebra
                       P - Advanced Math
                       Q - Problem-Solving and Data Analysis
                       S - Geometry and Trigonometry

         {sys.argv[0]} <scrape_directory>
  """)

def download(directory, test_number, domain_code):
  output_path = directory / f"SAT_{test_number}_{domain_code}.json"
  questions = list(SAT.get_questions(99, test_number, domain_code))
  with open(output_path, 'w') as f:
    json.dump(questions, f)

def main():
  nargs = len(sys.argv)
  match nargs:
    case 2:
      # scrape all
      directory = Path(sys.argv[1])
      for test_number, test_name in SAT.parameters.TEST_NAMES.items():
        for domain_code, domain_name in SAT.parameters.DOMAINS[test_number].items():
          download(directory, test_number, domain_code)

    case 4:
      # scrape specific
      event_id = int(sys.argv[1])
      test_number = int(sys.argv[2])
      domain_code = sys.argv[3]

      questions = list(SAT.get_questions(event_id, test_number, domain_code))
      json.dump(questions, sys.stdout, indent=2)

    case _:
      usage()

if __name__ == '__main__':
  main()
