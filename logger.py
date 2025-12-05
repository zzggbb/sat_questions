# standard
import sys
import time
from contextlib import contextmanager

def log(message, **kwargs):
  print(f"[LOG] {message}", file=sys.stderr, flush=True, **kwargs)

@contextmanager
def timer(title, end='... '):
  t_start = time.time()
  log(title, end=end)
  yield
  t_elapsed = time.time() - t_start
  print(f"done [{t_elapsed:.3f} (s)]")
