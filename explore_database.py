# standard
import code
import readline
import rlcompleter

import pickle
import json

# project local
import models
from stages import Schema, Metaquestions, Questions
from models import Exam, Superdomain, Domain, Subdomain

# 3rd party
import pandas as pd

pd.set_option('display.max_rows', None)

def repl(namespace):
    readline.set_completer(rlcompleter.Completer(namespace).complete)
    readline.parse_and_bind("tab: complete")
    code.interact(local=namespace, banner='', exitmsg='')

exams, classifications = map(pd.read_pickle, Schema.produced_paths().values())
metaquestions = pd.read_pickle(Metaquestions.produced_paths())
questions = pickle.load(open(Questions.produced_paths(), 'rb'))

print("locals: exams classifications metaquestions questions")

repl(locals())
