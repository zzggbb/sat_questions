# Backend Pipeline Diagram
![backend pipeline diagram](pipeline_diagram.svg)
# File Layout
```
.
├── docs
│   ├── example_responses
│   │   ├── eid_question.json
│   │   ├── ibn_question.json
│   │   ├── lookup.json
│   │   └── questions_meta.json
│   ├── pipeline_diagram.d2
│   ├── pipeline_diagram.svg
│   ├── README.md
│   └── TODO.md
├── html
│   └── index.html
├── pipeline
│   ├── classifications.pickle
│   ├── exams.pickle
│   ├── frontend_data.js
│   ├── question_counts.html
│   ├── question_counts.json
│   ├── questions.json
│   ├── questions_main.pickle
│   ├── questions_meta.pickle
│   └── questions.pickle
├── static
│   ├── script
│   │   ├── control_panel.js
│   │   ├── filters.js
│   │   ├── helpers.js
│   │   ├── index.js
│   │   ├── migrate.js
│   │   ├── options.js
│   │   ├── progress.js
│   │   ├── question.js
│   │   ├── question_viewer.js
│   │   ├── storage.js
│   │   ├── toggle_button.js
│   │   └── users.js
│   └── style
│       ├── main.css
│       └── question-counts.css
├── template_html
│   ├── base.html
│   └── index.html
├── explore_database.py
├── .gitignore
├── logger.py
├── models.py
├── pipeline.py
├── question_bank.py
├── requirements.txt
├── stages.py
└── update_docs.sh

9 directories, 43 files
```
