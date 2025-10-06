from pathlib import Path

class Pipeline:
  def __init__(self):
    self.stages = []

  def add_stage(self, stage):
    self.stages.append(stage)
    return stage

  def run(self):
    for i, stage in enumerate(self.stages):
      name = stage.__name__

      if hasattr(stage, 'wdir'):
        stage.wdir.mkdir(exist_ok=True, parents=True)

      upstream_mtime = max(
        (path.stat().st_mtime for path in stage.required_paths() if path.exists()),
        default=0
      )
      downstream_mtime = min(
        (path.stat().st_mtime for path in stage.produced_paths() if path.exists()),
        default=1
      )
      upstream_changed = upstream_mtime > downstream_mtime

      forced = getattr(stage, 'force_run', False)
      forced_string = f" [forced]" if forced else ''

      if all(path.exists() for path in stage.produced_paths()) \
          and not upstream_changed \
          and not forced:
        print(f"[{name}] Already produced files; no upstream changes; skipping")
      else:
        print(f"[{name}]{forced_string} Started running...")
        stage.run()
        print(f"[{name}] Finished running.")

      if getattr(stage, 'cancel_downstream', False):
        break
