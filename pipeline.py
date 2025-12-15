# standard
import sys
import time
import inspect
import itertools
from pathlib import Path

# project local
import logger

class Artifact:
  def __init__(self, identifier, path, template):
    self.identifier = identifier
    self.path = path
    self.template = template

  def get_mtime(self):
    return self.path.stat().st_mtime

  def exists(self):
    return self.path.exists()

  def read(self):
    return self.template.read(self.path)

  def write(self, obj):
    with logger.timer(f"writing {type(obj)} to {self.path}"):
      self.template.write(obj, self.path)

  def __repr__(self):
    return f"{self.identifier}"

  def __str__(self):
    return f"{self.identifier}"

  def short_path(self):
    return self.path.relative_to(Path(__file__).parent)

class Pipeline:
  def __init__(self, default_path):
    self.default_path = default_path

    # stage name -> stage object
    self.stages = dict()

    # artifact identifier -> artifact object
    self.artifacts = dict()

    # artifact identifier -> stage object
    self.producers = dict()

  def artifact_template(self, obj):
    def artifact(identifier, path_or_filename):
      if isinstance(path_or_filename, str):
        path = self.default_path / path_or_filename
      else:
        path = path_or_filename

      return Artifact(identifier, path, obj)

    return artifact

  def add_artifact(self, artifact):
    if artifact.identifier in self.artifacts:
      return

    self.artifacts[artifact.identifier] = artifact

  def add_stage(self, stage):
    self.stages[stage.__name__] = stage

    if not hasattr(stage, 'required'):
      '''
      Most stages do not define their required artifacts, because they have already
      been defined by a previous stage.

      However some stages must define their required artifacts because their
      required artifacts are pre-existing files, not files produced by a
      previous stage of the pipeline.
      '''
      stage.required = [
        self.artifacts[identifier] for identifier in
        inspect.signature(stage.run).parameters
      ]

    for artifact in stage.required:
      self.add_artifact(artifact)

    for artifact in stage.produced:
      self.add_artifact(artifact)
      self.producers[artifact.identifier] = stage

  def run_all(self):
    for i, name in enumerate(self.stages.keys()):
      cancel_downstream = self.run(name)
      if cancel_downstream:
        break

  def run(self, name, force=False, show_duration=True):
    time_start = time.time()

    stage = self.stages[name]
    show_duration = getattr(stage, 'show_duration', show_duration)

    upstream_mtime = max(
      [artifact.get_mtime() for artifact in stage.required if artifact.exists()],
      default=0
    )
    downstream_mtime = min(
      [artifact.get_mtime() for artifact in stage.produced if artifact.exists()],
      default=1
    )
    upstream_changed = upstream_mtime > downstream_mtime

    force = getattr(stage, 'force_run', force)
    force_string = f" [force]" if force else ''

    if all(artifact.exists() for artifact in stage.produced) \
        and not upstream_changed \
        and not force:
      print(f"[{name}] Already produced files; no upstream changes; skipping")
    else:
      print(f"[{name}]{force_string} Started running...")

      required_objects = [artifact.read() for artifact in stage.required]
      produced_objects = stage.run(*required_objects)
      for produced_object, produced_artifact in zip(produced_objects, stage.produced):
        produced_artifact.write(produced_object)

      duration = time.time() - time_start
      duration_string = f" [{duration:.2f} (s)]" if show_duration else ''
      print(f"[{name}] Finished running.{duration_string}")

    cancel_downstream = getattr(stage, 'cancel_downstream', False)
    return cancel_downstream

  def command_line_interface(self):
    usage = '\n'.join([
      f"{sys.argv[0]} [-h|--help] [command]",
      "commands:",
      "  run-stage <stage>... | all",
      "  list-stages"
    ])

    args = sys.argv[1:]

    if '-h' in args or '--help' in args:
      print(usage)
      return

    match args:
      case ['run-stage', *stage_names]:
        if stage_names == ['all']:
          self.run_all()
        elif stage_names == []:
          print(usage)
        else:
          for name in stage_names:
            self.run(name, force=True)

      case ['list-stages']:
        for name, stage in self.stages.items():
          required = ', '.join(str(artifact) for artifact in stage.required)
          produced = ', '.join(str(artifact) for artifact in stage.produced)
          print(required, '->', name, '->', produced)

      case ['d2-graph']:
        self.generate_d2_graph()

      case _:
        print(usage)

  def generate_d2_graph(self):
    print("vars: { d2-config: { layout-engine: elk } }")
    for name, stage in self.stages.items():
      produced = '\n'.join(f"'{artifact.short_path()}'" for artifact in stage.produced)
      print(f"{name}: {{\n{produced}\n}}")

      for artifact in stage.required:
        producer = self.producers.get(artifact.identifier)
        producer_prefix = f"{producer.__name__}." if producer else ''
        print(f"{producer_prefix}'{artifact.short_path()}' -> {stage.__name__}: changes")
