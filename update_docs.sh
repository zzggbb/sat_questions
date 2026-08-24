python3 -m SAT d2-graph > docs/pipeline_diagram.d2
d2 docs/pipeline_diagram.d2 docs/pipeline_diagram.svg

write_readme() {
  echo '# CLI Usage'
  echo
  echo '## Run entire pipeline to get the current CollegeBoard question set'
  echo '```bash'
  echo '$ python3 -m SAT run-stage all --spill-id new'
  echo '```'
  echo
  echo '## List the available question set versions'
  echo '```bash'
  echo '$ python3 -m SAT list-spills'
  echo '```'
  echo
  echo '## Activate a question set version'
  echo '```bash'
  echo "$ python3 -m SAT set-active-spill <spill ID or 'latest'>"
  echo '```'
  echo
  echo "# Backend Pipeline Diagram"
  echo "![backend pipeline diagram](pipeline_diagram.svg)"
  echo
  echo "# File Layout"
  echo '```'
  tree --dirsfirst -a -I '.git|__pycache__'
  echo '```'
}

write_readme > docs/README.md
