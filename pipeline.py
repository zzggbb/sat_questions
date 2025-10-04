class Pipeline:
  def __init__(self):
    self.stages = []

  def add_stage(self, stage):
    self.stages.append(stage)
    return stage

  def run(self):
    for stage in self.stages:
      if hasattr(stage, 'working_dir'):
        stage.working_dir.mkdir(exist_ok=True)

      description = stage.__name__

      upstream_mtime = max(
        (f.stat().st_mtime for f in stage.required_files() if f.exists()),
        default=0
      )
      downstream_mtime = min(
        (f.stat().st_mtime for f in stage.produced_files() if f.exists()),
        default=1
      )
      upstream_changed = upstream_mtime > downstream_mtime

      forced = getattr(stage, 'force_run', False)
      forced_string = f" [forced]" if forced else ''

      if all(path.exists() for path in stage.produced_files()) \
          and not upstream_changed \
          and not forced:
        print(f"[{description}] Already produced files; no upstream changes; skipping")
      else:
        print(f"[{description}]{forced_string} Started running...")
        stage.run()
        print(f"[{description}] Finished running.")

