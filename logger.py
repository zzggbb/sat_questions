import sys

def log(message, **kwargs):
  print(f"[LOG] {message}", file=sys.stderr, flush=True, **kwargs)
