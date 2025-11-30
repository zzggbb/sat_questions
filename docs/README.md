# Backend Pipeline Diagram
![backend pipeline diagram](pipeline_changes.svg)

# File Layout

```
├── docs
│   ├── example_responses
│   │   ├── eid_question.json
│   │   ├── ibn_question.json
│   │   ├── lookup.json
│   │   └── questions_meta.json
│   ├── pipeline.d2
│   ├── pipeline.svg
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
│   │   ├── section.js
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
└── stages.py

9 directories, 42 files
```
