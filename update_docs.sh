python3 stages.py d2-graph > docs/pipeline_diagram.d2
d2 docs/pipeline_diagram.d2

write_readme() {
  echo "# Backend Pipeline Diagram"
  echo "![backend pipeline diagram](pipeline_diagram.svg)"
  echo "# File Layout"
  echo "\`\`\`"
  tree --dirsfirst -a -I '.git|__pycache__'
  echo "\`\`\`"
}

write_readme > docs/README.md
