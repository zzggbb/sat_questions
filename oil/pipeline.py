# standard
import sys
import time
import inspect
import argparse
import itertools
from enum import Enum, auto
from pathlib import Path

# package local
from oil.artifact import Artifact
from oil.spill import Spill

class Pipeline:
  def __init__(self, spills_path):
    self.spills_path = Path(spills_path)
    #self.spill = self._latest_spill() or Spill.new(self.spills_path)

    # stage name -> stage object
    self.stages = dict()

    # artifact identifier -> artifact object
    self.artifacts = dict()

    # artifact identifier -> stage object
    self.producers = dict()

  def _get_spills(self):
    return [
      Spill.from_path(path) for path in self.spills_path.iterdir()
      if path.name != 'active'
    ]

  def _latest_spill(self):
    spills = self._get_spills()
    if spills:
      return spills[-1]

    return None

  def artifact(self, base_artifact):
    '''
    A decorator for creating artifacts.

    `base_artifact` is a class that defines two methods:
      read(path) -> object
      write(object, path) -> None

    A "real" artifact is made based on a `base_artifact`, and
    additional context (its identifier and file path).
    '''

    def f(identifier, path_or_filename):
      '''
      This is the actual call signature to use when instantiating artifacts
      in a stage's `produced` or `required` fields.
      '''
      return Artifact(identifier, path_or_filename, base_artifact)

    return f

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
    for stage_name in self.stages.keys():
      cancel_downstream = self.run(stage_name)
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
    def run_stage(args):
      match args.spill_id:
        case 'latest':
          spill = self._latest_spill()
          print(f"Running pipeline using latest spill ({spill})")

        case 'new':
          spill = Spill.new(self.spills_path)
          print(f"Running pipeline using new spill ({spill})")

        case n:
          spill_ids = [spill.id for spill in self._get_spills()]
          if n.isnumeric() and int(n) in spill_ids:
            spill = Spill(self.spills_path, int(n))
            print(f"Running pipeline using specific spill ({spill})")
          else:
            print(f"'{n}' is an invalid spill ID. See `list-spills` for valid spill IDs")

      # kludge to make SPILL_TIME_HUMAN work in Index stage
      self.spill = spill
      for artifact in self.artifacts.values():
        artifact.use_spill(spill)

      if args.stage_name == ['all']:
        self.run_all()
      else:
        for name in args.stage_name:
          self.run(name, force=args.force)

    def list_stages(args):
      for name, stage in self.stages.items():
        required = ', '.join(str(artifact) for artifact in stage.required)
        produced = ', '.join(str(artifact) for artifact in stage.produced)
        print(f"{name}: ({required}) -> ({produced})")

    def list_spills(args):
      for spill in self._get_spills():
        print(spill)

    def set_active_spill(args):
      match args.spill_id:
        case 'latest':
          spill = self._latest_spill()

        case n:
          spill_ids = [spill.id for spill in self._get_spills()]
          if n.isnumeric() and int(n) in spill_ids:
            spill = Spill(self.spills_path, int(n))
          else:
            print(f"'{n}' is an invalid spill ID. See `list-spills` for valid spill IDs")

      print(f"Setting spill {spill} as active spill")
      active_symlink_path = self.spills_path / 'active'
      active_symlink_path.unlink(missing_ok=True)
      active_symlink_path.symlink_to(str(spill.id))

    def d2_graph(args):
      self.generate_d2_graph()

    parser = argparse.ArgumentParser(prog='python3 -m SAT')
    subparsers = parser.add_subparsers(required=True)

    parser_run_stage = subparsers.add_parser("run-stage",
                                             help="Run a specific stage or stages, or all stages")
    parser_run_stage.add_argument('-s', '--spill-id',
                                  help="A spill ID, or 'new' or 'latest'",
                                  default='latest',
                                  required=False)
    parser_run_stage.add_argument('-f', '--force',
                                  help="Run this stage even if it can be skipped",
                                  action='store_true')
    parser_run_stage.add_argument('stage_name',
                                  nargs='+',
                                  help="A space separated list of stage names, or 'all'. See `list-stages` for valid stage names")
    parser_run_stage.set_defaults(func=run_stage)

    parser_list_stages = subparsers.add_parser('list-stages',
                          help="Print the name of each stage.")
    parser_list_stages.set_defaults(func=list_stages)

    parser_list_spills = subparsers.add_parser('list-spills',
                          help="Print information about each spill.")
    parser_list_spills.set_defaults(func=list_spills)

    parser_set_active_spill = subparsers.add_parser('set-active-spill',
                                                    help="Set the active spill")
    parser_set_active_spill.add_argument('spill_id',
                                         help="A spill ID, or 'latest'")
    parser_set_active_spill.set_defaults(func=set_active_spill)

    parser_d2_graph = subparsers.add_parser('d2-graph',
                          help="Generate a graph (in d2 format) of the pipeline stages")
    parser_d2_graph.set_defaults(func=d2_graph)


    args = parser.parse_args()
    args.func(args)

  def generate_d2_graph(self):
    def artifact_path(artifact):
      if artifact.path is None:
        return artifact.filename
      elif artifact.path.is_relative_to(self.spills_path.parent):
        return artifact.path.relative_to(self.spills_path.parent)
      else:
        return artifact.path

    print("vars: { d2-config: { layout-engine: elk } }")
    for name, stage in self.stages.items():
      produced = '\n'.join(f"'{artifact_path(artifact)}'" for artifact in stage.produced)
      print(f"{name}: {{\n{produced}\n}}")

      for artifact in stage.required:
        producer = self.producers.get(artifact.identifier)
        producer_prefix = f"{producer.__name__}." if producer else ''
        print(f"{producer_prefix}'{artifact_path(artifact)}' -> {stage.__name__}: changes")
