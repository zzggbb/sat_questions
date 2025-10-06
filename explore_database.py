# standard
import code
import readline
import rlcompleter

import json

# project local
from stages import Schema
from models import StandardizedTest, Superdomain, Domain, Subdomain

# 3rd party
import pandas as pd

def repl(namespace):
    readline.set_completer(rlcompleter.Completer(namespace).complete)
    readline.parse_and_bind("tab: complete")
    code.interact(local=namespace, banner='', exitmsg='')

standardized_tests, classifications = map(pd.read_pickle, Schema.produced_paths())

print("locals: standardized_tests classifications")

repl(locals())
