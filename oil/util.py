# standard
from datetime import datetime, timezone

def file_tree_size(root_path):
  total_size = 0
  for dirpath, dirnames, filenames in root_path.walk():
    for filename in filenames:
      filepath = dirpath / filename
      if not filepath.is_symlink():
        total_size += filepath.stat().st_size
  return total_size

def format_byte_size(n_bytes):
  units = [
    'B',
    'KB',
    'MB',
    'GB',
    'TB'
  ]
  for i, unit in enumerate(units):
    n = 1000**i
    if n_bytes < n*1000:
      return f"{n_bytes/n:.1f} {unit}"

def format_datetime(datetime):
  return datetime.astimezone().strftime('%Y-%m-%d %H:%M:%S %Z')

def format_timestamp_int(timestamp_int):
  return format_datetime(datetime.fromtimestamp(timestamp_int))

def current_timestamp_int():
  return int(datetime.now(timezone.utc).timestamp())
