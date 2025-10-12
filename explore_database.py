# standard
import code
import readline
import rlcompleter

import pickle
import json

# project local
import models
from stages import Schema, QuestionsMeta, QuestionsMain, Questions, QuestionsJSON
from models import Exam, Superdomain, Domain, Subdomain

# 3rd party
import pandas as pd

pd.set_option('display.max_rows', None)

def repl(namespace):
    readline.set_completer(rlcompleter.Completer(namespace).complete)
    readline.parse_and_bind("tab: complete")
    code.interact(local=namespace, banner='', exitmsg='')

exams, classifications = map(pd.read_pickle, Schema.produced_paths().values())
questions_meta = pd.read_pickle(QuestionsMeta.produced_paths())
questions = pickle.load(open(Questions.produced_paths(), 'rb'))
questions_json = open(QuestionsJSON.produced_paths()).read().splitlines()

print("locals: exams classifications questions_meta questions questions_json")

repl(locals())
