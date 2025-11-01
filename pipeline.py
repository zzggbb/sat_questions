# standard
import time
import inspect
import itertools
from pathlib import Path

# project local
import logger

class Artifact:
  def __init__(self, identifier, default_path, path_or_filename, object_manager):
    self.identifier = identifier

    if isinstance(path_or_filename, str):
      self.path = default_path / path_or_filename
    else:
      self.path = path_or_filename

    self.object_manager = object_manager

  def get_mtime(self):
    return self.path.stat().st_mtime

  def exists(self):
    return self.path.exists()

  def read(self):
    return self.object_manager.read(self.path)

  def write(self, obj):
    with logger.timer(f"write {type(obj)} to {self.path}"):
      self.object_manager.write(obj, self.path)

  def __repr__(self):
    return f"{self.identifier}"

class Pipeline:
  def __init__(self, default_path):
    self.default_path = default_path
    self.stages = dict()
    self.artifacts = dict()

  def add_stage(self, stage):
    self.stages[stage.__name__] = stage
    return stage

  def add_artifact(self, identifier, path_or_filename, object_manager):
    artifact = Artifact(
      identifier,
      self.default_path,
      path_or_filename,
      object_manager
    )
    self.artifacts[identifier] = artifact
    return artifact

  def scan_artifacts(self):
    artifacts = {}
    for stage in self.stages.values():
      for (identifier, path_or_filename, object_manager) in stage.produced:
        artifacts[identifier] = Artifact(identifier, self.default_path, path_or_filename, object_manager)
    return artifacts

  def run_all(self):
    for i, name in enumerate(self.stages.keys()):
      cancel_downstream = self.run(name)
      if cancel_downstream:
        break

  def run(self, name, force=False, show_duration=True):
    stage = self.stages[name]
    show_duration = getattr(stage, 'show_duration', show_duration)

    time_start = time.time()

    for artifact in getattr(stage, 'required', []):
      self.add_artifact(*artifact)

    required_artifacts = [
      self.artifacts[identifier] for identifier in
      inspect.signature(stage.run).parameters
    ]

    produced_artifacts = list(itertools.starmap(self.add_artifact, stage.produced))

    upstream_mtime = max(
      [artifact.get_mtime() for artifact in required_artifacts if artifact.exists()],
      default=0
    )
    downstream_mtime = min(
      [artifact.get_mtime() for artifact in produced_artifacts if artifact.exists()],
      default=1
    )
    upstream_changed = upstream_mtime > downstream_mtime

    force = getattr(stage, 'force_run', force)
    force_string = f" [force]" if force else ''

    if all(artifact.exists() for artifact in produced_artifacts) \
        and not upstream_changed \
        and not force:
      print(f"[{name}] Already produced files; no upstream changes; skipping")
    else:
      print(f"[{name}]{force_string} Started running...")

      required_objects = [artifact.read() for artifact in required_artifacts]
      produced_objects = stage.run(*required_objects)
      for produced_object, produced_artifact in zip(produced_objects, produced_artifacts):
        produced_artifact.write(produced_object)

      duration = time.time() - time_start
      duration_string = f" [{duration:.2f} (s)]" if show_duration else ''
      print(f"[{name}] Finished running.{duration_string}")

    cancel_downstream = getattr(stage, 'cancel_downstream', False)
    return cancel_downstream
