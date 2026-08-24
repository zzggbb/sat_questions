# standard
from pathlib import Path

# package local
from oil import util

class Spill:
  def __init__(self, base_path, id):
    self.id = int(id)
    self.path = Path(base_path) / str(self.id)
    self.size = util.file_tree_size(self.path)
    self.size_human = util.format_byte_size(self.size)
    self.timestamp = util.format_timestamp_int(self.id)
    self.active = (base_path / 'active').resolve() == self.path

  @staticmethod
  def from_path(path):
    return Spill(path.parent, path.name)

  @staticmethod
  def new(base_path):
    id = util.current_timestamp_int()
    return Spill(base_path, id)

  def __str__(self):
    out = f"{self.timestamp} (id={self.id} size={self.size_human})"
    if self.active:
      out += " (active)"
    return out

  def __repr__(self):
    return str(self)
