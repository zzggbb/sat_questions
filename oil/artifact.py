# standard
from pathlib import Path

# project local
from common import logger

class Artifact:
  def __init__(self, identifier, path_or_filename, base_artifact):
    self.identifier = identifier

    match path_or_filename:
      case str():
        self.path = None
        self.filename = path_or_filename
      case Path():
        self.path = path_or_filename
        self.filename = self.path.name

    self.base_artifact = base_artifact

  def use_spill(self, spill):
    if self.path is None:
      self.path = spill.path / self.filename

  def get_mtime(self):
    return self.path.stat().st_mtime

  def exists(self):
    return self.path.exists()

  def read(self):
    return self.base_artifact.read(self.path)

  def write(self, obj):
    self.path.parent.mkdir(parents=True, exist_ok=True)

    with logger.timer(f"writing {type(obj)} to {self.path}"):
      self.base_artifact.write(obj, self.path)

  def __repr__(self):
    return f"{self.identifier}"

  def __str__(self):
    return f"{self.identifier}"
