const TOTAL_QUESTIONS = 8550
const EXAMS = [
  {
    "id":102,
    "index":0,
    "name":"PSAT 8\/9",
    "short_name":"P89"
  },
  {
    "id":100,
    "index":1,
    "name":"PSAT\/NMSQT & PSAT 10",
    "short_name":"P10"
  },
  {
    "id":99,
    "index":2,
    "name":"SAT",
    "short_name":"SAT"
  }
]
const CLASSIFICATIONS = [
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"CAS",
      "index":0,
      "name":"Craft & Structure",
      "original_acronym":"CAS",
      "original_name":"Craft and Structure"
    },
    "subdomain":{
      "index":0,
      "name":"Cross-Text Connections",
      "original_name":"Cross-Text Connections"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"CAS",
      "index":0,
      "name":"Craft & Structure",
      "original_acronym":"CAS",
      "original_name":"Craft and Structure"
    },
    "subdomain":{
      "index":1,
      "name":"Text Structure & Purpose",
      "original_name":"Text Structure and Purpose"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"CAS",
      "index":0,
      "name":"Craft & Structure",
      "original_acronym":"CAS",
      "original_name":"Craft and Structure"
    },
    "subdomain":{
      "index":2,
      "name":"Words In Context",
      "original_name":"Words in Context"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"EOI",
      "index":1,
      "name":"Expression Of Ideas",
      "original_acronym":"EOI",
      "original_name":"Expression of Ideas"
    },
    "subdomain":{
      "index":3,
      "name":"Rhetorical Synthesis",
      "original_name":"Rhetorical Synthesis"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"EOI",
      "index":1,
      "name":"Expression Of Ideas",
      "original_acronym":"EOI",
      "original_name":"Expression of Ideas"
    },
    "subdomain":{
      "index":4,
      "name":"Transitions",
      "original_name":"Transitions"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"IAI",
      "index":2,
      "name":"Information & Ideas",
      "original_acronym":"INI",
      "original_name":"Information and Ideas"
    },
    "subdomain":{
      "index":5,
      "name":"Central Ideas & Details",
      "original_name":"Central Ideas and Details"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"IAI",
      "index":2,
      "name":"Information & Ideas",
      "original_acronym":"INI",
      "original_name":"Information and Ideas"
    },
    "subdomain":{
      "index":6,
      "name":"Command Of Evidence",
      "original_name":"Command of Evidence"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"IAI",
      "index":2,
      "name":"Information & Ideas",
      "original_acronym":"INI",
      "original_name":"Information and Ideas"
    },
    "subdomain":{
      "index":7,
      "name":"Inferences",
      "original_name":"Inferences"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"SEC",
      "index":3,
      "name":"Standard English Conventions",
      "original_acronym":"SEC",
      "original_name":"Standard English Conventions"
    },
    "subdomain":{
      "index":8,
      "name":"Boundaries",
      "original_name":"Boundaries"
    }
  },
  {
    "superdomain":{
      "id":1,
      "index":0,
      "name":"English",
      "original_name":"R&W"
    },
    "domain":{
      "acronym":"SEC",
      "index":3,
      "name":"Standard English Conventions",
      "original_acronym":"SEC",
      "original_name":"Standard English Conventions"
    },
    "subdomain":{
      "index":9,
      "name":"Form, Structure & Sense",
      "original_name":"Form, Structure, and Sense"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ADV",
      "index":4,
      "name":"Advanced Math",
      "original_acronym":"P",
      "original_name":"Advanced Math"
    },
    "subdomain":{
      "index":10,
      "name":"Equivalent Expressions",
      "original_name":"Equivalent expressions"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ADV",
      "index":4,
      "name":"Advanced Math",
      "original_acronym":"P",
      "original_name":"Advanced Math"
    },
    "subdomain":{
      "index":11,
      "name":"Nonlinear Equations In 1 Variable & Systems Of Equations In 2 Variables",
      "original_name":"Nonlinear equations in one variable and systems of equations in two variables"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ADV",
      "index":4,
      "name":"Advanced Math",
      "original_acronym":"P",
      "original_name":"Advanced Math"
    },
    "subdomain":{
      "index":12,
      "name":"Nonlinear Functions",
      "original_name":"Nonlinear functions"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ALG",
      "index":5,
      "name":"Algebra",
      "original_acronym":"H",
      "original_name":"Algebra"
    },
    "subdomain":{
      "index":13,
      "name":"Linear Equations In 1 Variable",
      "original_name":"Linear equations in one variable"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ALG",
      "index":5,
      "name":"Algebra",
      "original_acronym":"H",
      "original_name":"Algebra"
    },
    "subdomain":{
      "index":14,
      "name":"Linear Equations In 2 Variables",
      "original_name":"Linear equations in two variables"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ALG",
      "index":5,
      "name":"Algebra",
      "original_acronym":"H",
      "original_name":"Algebra"
    },
    "subdomain":{
      "index":15,
      "name":"Linear Functions",
      "original_name":"Linear functions"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ALG",
      "index":5,
      "name":"Algebra",
      "original_acronym":"H",
      "original_name":"Algebra"
    },
    "subdomain":{
      "index":16,
      "name":"Linear Inequalities In 1 Or 2 Variables",
      "original_name":"Linear inequalities in one or two variables"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"ALG",
      "index":5,
      "name":"Algebra",
      "original_acronym":"H",
      "original_name":"Algebra"
    },
    "subdomain":{
      "index":17,
      "name":"Systems Of 2 Linear Equations In 2 Variables",
      "original_name":"Systems of two linear equations in two variables"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"GAT",
      "index":6,
      "name":"Geometry & Trigonometry",
      "original_acronym":"S",
      "original_name":"Geometry and Trigonometry"
    },
    "subdomain":{
      "index":18,
      "name":"Area & Volume",
      "original_name":"Area and volume"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"GAT",
      "index":6,
      "name":"Geometry & Trigonometry",
      "original_acronym":"S",
      "original_name":"Geometry and Trigonometry"
    },
    "subdomain":{
      "index":19,
      "name":"Circles",
      "original_name":"Circles"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"GAT",
      "index":6,
      "name":"Geometry & Trigonometry",
      "original_acronym":"S",
      "original_name":"Geometry and Trigonometry"
    },
    "subdomain":{
      "index":20,
      "name":"Lines, Angles & Triangles",
      "original_name":"Lines, angles, and triangles"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"GAT",
      "index":6,
      "name":"Geometry & Trigonometry",
      "original_acronym":"S",
      "original_name":"Geometry and Trigonometry"
    },
    "subdomain":{
      "index":21,
      "name":"Right Triangles & Trigonometry",
      "original_name":"Right triangles and trigonometry"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":22,
      "name":"1-Variable Data: Distributions & Measures Of Center & Spread",
      "original_name":"One-variable data: Distributions and measures of center and spread"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":23,
      "name":"2-Variable Data: Models & Scatterplots",
      "original_name":"Two-variable data: Models and scatterplots"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":24,
      "name":"Evaluating Statistical Claims: Observational Studies & Experiments",
      "original_name":"Evaluating statistical claims: Observational studies and experiments"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":25,
      "name":"Inference From Sample Statistics & Margin Of Error",
      "original_name":"Inference from sample statistics and margin of error"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":26,
      "name":"Percentages",
      "original_name":"Percentages"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":27,
      "name":"Probability & Conditional Probability",
      "original_name":"Probability and conditional probability"
    }
  },
  {
    "superdomain":{
      "id":2,
      "index":1,
      "name":"Math",
      "original_name":"Math"
    },
    "domain":{
      "acronym":"PSDA",
      "index":7,
      "name":"Problem Solving & Data Analysis",
      "original_acronym":"Q",
      "original_name":"Problem-Solving and Data Analysis"
    },
    "subdomain":{
      "index":28,
      "name":"Ratios, Rates, Proportional Relationships & Units",
      "original_name":"Ratios, rates, proportional relationships, and units"
    }
  }
]
const SUPERDOMAINS = [
  {
    "name": "English",
    "id": 1,
    "index": 0
  },
  {
    "name": "Math",
    "id": 2,
    "index": 1
  }
]
const DOMAINS = [
  {
    "name": "Craft & Structure",
    "acronym": "CAS",
    "index": 0
  },
  {
    "name": "Expression Of Ideas",
    "acronym": "EOI",
    "index": 1
  },
  {
    "name": "Information & Ideas",
    "acronym": "IAI",
    "index": 2
  },
  {
    "name": "Standard English Conventions",
    "acronym": "SEC",
    "index": 3
  },
  {
    "name": "Advanced Math",
    "acronym": "ADV",
    "index": 4
  },
  {
    "name": "Algebra",
    "acronym": "ALG",
    "index": 5
  },
  {
    "name": "Geometry & Trigonometry",
    "acronym": "GAT",
    "index": 6
  },
  {
    "name": "Problem Solving & Data Analysis",
    "acronym": "PSDA",
    "index": 7
  }
]
const SUBDOMAINS = [
  {
    "name": "Cross-Text Connections",
    "index": 0
  },
  {
    "name": "Text Structure & Purpose",
    "index": 1
  },
  {
    "name": "Words In Context",
    "index": 2
  },
  {
    "name": "Rhetorical Synthesis",
    "index": 3
  },
  {
    "name": "Transitions",
    "index": 4
  },
  {
    "name": "Central Ideas & Details",
    "index": 5
  },
  {
    "name": "Command Of Evidence",
    "index": 6
  },
  {
    "name": "Inferences",
    "index": 7
  },
  {
    "name": "Boundaries",
    "index": 8
  },
  {
    "name": "Form, Structure & Sense",
    "index": 9
  },
  {
    "name": "Equivalent Expressions",
    "index": 10
  },
  {
    "name": "Nonlinear Equations In 1 Variable & Systems Of Equations In 2 Variables",
    "index": 11
  },
  {
    "name": "Nonlinear Functions",
    "index": 12
  },
  {
    "name": "Linear Equations In 1 Variable",
    "index": 13
  },
  {
    "name": "Linear Equations In 2 Variables",
    "index": 14
  },
  {
    "name": "Linear Functions",
    "index": 15
  },
  {
    "name": "Linear Inequalities In 1 Or 2 Variables",
    "index": 16
  },
  {
    "name": "Systems Of 2 Linear Equations In 2 Variables",
    "index": 17
  },
  {
    "name": "Area & Volume",
    "index": 18
  },
  {
    "name": "Circles",
    "index": 19
  },
  {
    "name": "Lines, Angles & Triangles",
    "index": 20
  },
  {
    "name": "Right Triangles & Trigonometry",
    "index": 21
  },
  {
    "name": "1-Variable Data: Distributions & Measures Of Center & Spread",
    "index": 22
  },
  {
    "name": "2-Variable Data: Models & Scatterplots",
    "index": 23
  },
  {
    "name": "Evaluating Statistical Claims: Observational Studies & Experiments",
    "index": 24
  },
  {
    "name": "Inference From Sample Statistics & Margin Of Error",
    "index": 25
  },
  {
    "name": "Percentages",
    "index": 26
  },
  {
    "name": "Probability & Conditional Probability",
    "index": 27
  },
  {
    "name": "Ratios, Rates, Proportional Relationships & Units",
    "index": 28
  }
]
const DIFFICULTIES = [
  "E",
  "M",
  "H"
]
const ANSWER_TYPES = [
  "MCQ",
  "FRQ"
]
const QUESTION_COUNTS = [
  {
    "(P89, 'E')":4,
    "(P89, 'H')":25,
    "(P89, 'M')":12,
    "(P10, 'E')":8,
    "(P10, 'H')":28,
    "(P10, 'M')":15,
    "(SAT, 'E')":16,
    "(SAT, 'H')":20,
    "(SAT, 'M')":20
  },
  {
    "(P89, 'E')":5,
    "(P89, 'H')":68,
    "(P89, 'M')":36,
    "(P10, 'E')":9,
    "(P10, 'H')":43,
    "(P10, 'M')":46,
    "(SAT, 'E')":41,
    "(SAT, 'H')":37,
    "(SAT, 'M')":52
  },
  {
    "(P89, 'E')":31,
    "(P89, 'H')":82,
    "(P89, 'M')":84,
    "(P10, 'E')":59,
    "(P10, 'H')":55,
    "(P10, 'M')":66,
    "(SAT, 'E')":123,
    "(SAT, 'H')":50,
    "(SAT, 'M')":53
  },
  {
    "(P89, 'E')":4,
    "(P89, 'H')":120,
    "(P89, 'M')":36,
    "(P10, 'E')":9,
    "(P10, 'H')":60,
    "(P10, 'M')":72,
    "(SAT, 'E')":41,
    "(SAT, 'H')":42,
    "(SAT, 'M')":99
  },
  {
    "(P89, 'E')":9,
    "(P89, 'H')":73,
    "(P89, 'M')":60,
    "(P10, 'E')":27,
    "(P10, 'H')":39,
    "(P10, 'M')":62,
    "(SAT, 'E')":71,
    "(SAT, 'H')":33,
    "(SAT, 'M')":57
  },
  {
    "(P89, 'E')":8,
    "(P89, 'H')":67,
    "(P89, 'M')":24,
    "(P10, 'E')":10,
    "(P10, 'H')":43,
    "(P10, 'M')":41,
    "(SAT, 'E')":33,
    "(SAT, 'H')":38,
    "(SAT, 'M')":45
  },
  {
    "(P89, 'E')":18,
    "(P89, 'H')":139,
    "(P89, 'M')":52,
    "(P10, 'E')":24,
    "(P10, 'H')":115,
    "(P10, 'M')":57,
    "(SAT, 'E')":70,
    "(SAT, 'H')":98,
    "(SAT, 'M')":77
  },
  {
    "(P89, 'E')":4,
    "(P89, 'H')":74,
    "(P89, 'M')":16,
    "(P10, 'E')":9,
    "(P10, 'H')":58,
    "(P10, 'M')":26,
    "(SAT, 'E')":20,
    "(SAT, 'H')":57,
    "(SAT, 'M')":40
  },
  {
    "(P89, 'E')":8,
    "(P89, 'H')":106,
    "(P89, 'M')":45,
    "(P10, 'E')":27,
    "(P10, 'H')":75,
    "(P10, 'M')":46,
    "(SAT, 'E')":55,
    "(SAT, 'H')":77,
    "(SAT, 'M')":48
  },
  {
    "(P89, 'E')":12,
    "(P89, 'H')":77,
    "(P89, 'M')":73,
    "(P10, 'E')":46,
    "(P10, 'H')":45,
    "(P10, 'M')":50,
    "(SAT, 'E')":87,
    "(SAT, 'H')":47,
    "(SAT, 'M')":43
  },
  {
    "(P89, 'E')":8,
    "(P89, 'H')":43,
    "(P89, 'M')":31,
    "(P10, 'E')":26,
    "(P10, 'H')":27,
    "(P10, 'M')":19,
    "(SAT, 'E')":39,
    "(SAT, 'H')":27,
    "(SAT, 'M')":36
  },
  {
    "(P89, 'E')":9,
    "(P89, 'H')":88,
    "(P89, 'M')":26,
    "(P10, 'E')":16,
    "(P10, 'H')":68,
    "(P10, 'M')":38,
    "(SAT, 'E')":38,
    "(SAT, 'H')":55,
    "(SAT, 'M')":54
  },
  {
    "(P89, 'E')":12,
    "(P89, 'H')":91,
    "(P89, 'M')":38,
    "(P10, 'E')":26,
    "(P10, 'H')":92,
    "(P10, 'M')":48,
    "(SAT, 'E')":56,
    "(SAT, 'H')":88,
    "(SAT, 'M')":82
  },
  {
    "(P89, 'E')":25,
    "(P89, 'H')":36,
    "(P89, 'M')":31,
    "(P10, 'E')":39,
    "(P10, 'H')":22,
    "(P10, 'M')":20,
    "(SAT, 'E')":59,
    "(SAT, 'H')":19,
    "(SAT, 'M')":26
  },
  {
    "(P89, 'E')":14,
    "(P89, 'H')":71,
    "(P89, 'M')":39,
    "(P10, 'E')":29,
    "(P10, 'H')":41,
    "(P10, 'M')":29,
    "(SAT, 'E')":53,
    "(SAT, 'H')":31,
    "(SAT, 'M')":40
  },
  {
    "(P89, 'E')":15,
    "(P89, 'H')":76,
    "(P89, 'M')":60,
    "(P10, 'E')":50,
    "(P10, 'H')":31,
    "(P10, 'M')":43,
    "(SAT, 'E')":75,
    "(SAT, 'H')":25,
    "(SAT, 'M')":51
  },
  {
    "(P89, 'E')":6,
    "(P89, 'H')":41,
    "(P89, 'M')":18,
    "(P10, 'E')":11,
    "(P10, 'H')":25,
    "(P10, 'M')":20,
    "(SAT, 'E')":24,
    "(SAT, 'H')":18,
    "(SAT, 'M')":27
  },
  {
    "(P89, 'E')":13,
    "(P89, 'H')":66,
    "(P89, 'M')":20,
    "(P10, 'E')":25,
    "(P10, 'H')":46,
    "(P10, 'M')":19,
    "(SAT, 'E')":34,
    "(SAT, 'H')":38,
    "(SAT, 'M')":40
  },
  {
    "(P89, 'E')":7,
    "(P89, 'H')":58,
    "(P89, 'M')":21,
    "(P10, 'E')":14,
    "(P10, 'H')":29,
    "(P10, 'M')":17,
    "(SAT, 'E')":28,
    "(SAT, 'H')":28,
    "(SAT, 'M')":30
  },
  {
    "(P89, 'E')":0,
    "(P89, 'H')":0,
    "(P89, 'M')":0,
    "(P10, 'E')":0,
    "(P10, 'H')":0,
    "(P10, 'M')":0,
    "(SAT, 'E')":3,
    "(SAT, 'H')":33,
    "(SAT, 'M')":14
  },
  {
    "(P89, 'E')":1,
    "(P89, 'H')":25,
    "(P89, 'M')":19,
    "(P10, 'E')":16,
    "(P10, 'H')":27,
    "(P10, 'M')":19,
    "(SAT, 'E')":33,
    "(SAT, 'H')":25,
    "(SAT, 'M')":21
  },
  {
    "(P89, 'E')":0,
    "(P89, 'H')":22,
    "(P89, 'M')":9,
    "(P10, 'E')":3,
    "(P10, 'H')":18,
    "(P10, 'M')":7,
    "(SAT, 'E')":10,
    "(SAT, 'H')":31,
    "(SAT, 'M')":13
  },
  {
    "(P89, 'E')":18,
    "(P89, 'H')":35,
    "(P89, 'M')":15,
    "(P10, 'E')":24,
    "(P10, 'H')":27,
    "(P10, 'M')":14,
    "(SAT, 'E')":33,
    "(SAT, 'H')":21,
    "(SAT, 'M')":19
  },
  {
    "(P89, 'E')":10,
    "(P89, 'H')":23,
    "(P89, 'M')":18,
    "(P10, 'E')":21,
    "(P10, 'H')":21,
    "(P10, 'M')":16,
    "(SAT, 'E')":31,
    "(SAT, 'H')":11,
    "(SAT, 'M')":21
  },
  {
    "(P89, 'E')":0,
    "(P89, 'H')":0,
    "(P89, 'M')":0,
    "(P10, 'E')":0,
    "(P10, 'H')":0,
    "(P10, 'M')":0,
    "(SAT, 'E')":2,
    "(SAT, 'H')":6,
    "(SAT, 'M')":3
  },
  {
    "(P89, 'E')":0,
    "(P89, 'H')":0,
    "(P89, 'M')":0,
    "(P10, 'E')":6,
    "(P10, 'H')":5,
    "(P10, 'M')":9,
    "(SAT, 'E')":9,
    "(SAT, 'H')":4,
    "(SAT, 'M')":11
  },
  {
    "(P89, 'E')":12,
    "(P89, 'H')":49,
    "(P89, 'M')":15,
    "(P10, 'E')":19,
    "(P10, 'H')":32,
    "(P10, 'M')":14,
    "(SAT, 'E')":27,
    "(SAT, 'H')":27,
    "(SAT, 'M')":22
  },
  {
    "(P89, 'E')":11,
    "(P89, 'H')":21,
    "(P89, 'M')":11,
    "(P10, 'E')":18,
    "(P10, 'H')":8,
    "(P10, 'M')":12,
    "(SAT, 'E')":22,
    "(SAT, 'H')":7,
    "(SAT, 'M')":14
  },
  {
    "(P89, 'E')":18,
    "(P89, 'H')":45,
    "(P89, 'M')":21,
    "(P10, 'E')":31,
    "(P10, 'H')":21,
    "(P10, 'M')":21,
    "(SAT, 'E')":39,
    "(SAT, 'H')":15,
    "(SAT, 'M')":30
  }
]

