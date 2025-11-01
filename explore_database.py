# standard
import code
import readline
import rlcompleter

import pickle
import json

# project local
import models
import stages
from models import (
  Exam, Superdomain, Domain, Subdomain, Classification,
  AnswerType, DIFFICULTY_LETTERS, Difficulty,
  Question
)

# 3rd party
import pandas as pd

pd.set_option('display.max_rows', None)

def repl(namespace):
    readline.set_completer(rlcompleter.Completer(namespace).complete)
    readline.parse_and_bind("tab: complete")
    code.interact(local=namespace, banner='', exitmsg='')

artifacts = stages.pipeline.scan_artifacts()
for identifier, artifact in artifacts.items():
  globals()[identifier] = artifact.read()

identifiers = ' '.join(artifacts.keys())
print(f"variables: identifiers {identifiers}")

repl(globals())
