from pathlib import Path

class Pipeline:
  def __init__(self):
    self.stages = {}

  def add_stage(self, stage):
    self.stages[stage.__name__] = stage
    return stage

  def run_all(self):
    for i, name in enumerate(self.stages.keys()):
      cancel_downstream = self.run(name)
      if cancel_downstream:
        break

  def run(self, name, force=False):
    stage = self.stages[name]
    if hasattr(stage, 'wdir'):
      stage.wdir.mkdir(exist_ok=True, parents=True)

    required_paths = stage.required_paths()
    if isinstance(required_paths, Path):
      required_paths = {'only': required_paths}
    elif isinstance(required_paths, dict):
      pass
    else:
      raise ValueError(f"stage.required_paths has wrong return type")

    produced_paths = stage.produced_paths()
    if isinstance(produced_paths, Path):
      produced_paths = {'only': produced_paths}
    elif isinstance(produced_paths, dict):
      pass
    else:
      raise ValueError(f"stage.produced_paths has wrong return type")

    upstream_mtime = max(
      (path.stat().st_mtime for path in required_paths.values() if path.exists()),
      default=0
    )
    downstream_mtime = min(
      (path.stat().st_mtime for path in produced_paths.values() if path.exists()),
      default=1
    )
    upstream_changed = upstream_mtime > downstream_mtime

    force = getattr(stage, 'force_run', force)
    force_string = f" [force]" if force else ''

    if all(path.exists() for path in produced_paths.values()) \
        and not upstream_changed \
        and not force:
      print(f"[{name}] Already produced files; no upstream changes; skipping")
    else:
      print(f"[{name}]{force_string} Started running...")
      stage.run()
      print(f"[{name}] Finished running.")

    cancel_downstream = getattr(stage, 'cancel_downstream', False)
    return cancel_downstream
