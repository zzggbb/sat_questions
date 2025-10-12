'use strict';

let OPTION_LETTERS = ["A", "B", "C", "D"]

class Option {
  constructor(option_html_string) {
    this.element = ELEMENT(
      'li',
      {'class':'answer-option'},
      null,
      [option_html_string],
      {
        'click': () => {
          this.element.toggleAttribute("wrong")
        }
      }
    )
  }
}

class Question {
  constructor(index, uuid,
              exam, superdomain, domain, subdomain,
              answer_type, difficulty,
              stimulus, stem, options, correct_answer, rationale) {
    this.index = index
    this.uuid = uuid

    this.exam = exam
    this.superdomain = superdomain
    this.domain = domain
    this.subdomain = subdomain

    this.answer_type = answer_type
    this.difficulty = difficulty

    this.stimulus = stimulus
    this.stem = stem
    this.options = options
    this.correct_answer = correct_answer
    this.rationale = rationale

    if (this.answer_type === "MCQ")
      this.correct_answer_index = OPTION_LETTERS.indexOf(this.correct_answer)

  }
  is_selected_by_filters() {
    let filters = Filters.get_current_user_filters()
    return (
      filters.exam == this.exam.index &&
      filters.superdomain == this.superdomain.index &&
      filters.domains.includes(this.domain.index) &&
      filters.subdomains.includes(this.subdomain.index) &&
      filters.difficulties.includes(this.difficulty) &&
      filters.answer_types.includes(this.answer_type)
    )
  }
  get element() {
    if (Object.hasOwn(this, '_element'))
      return this._element

    this.option_elements = this.options.map(option => (new Option(option)).element)

    this.question_checkmark_element = ELEMENT('span',
      {
      'class': 'button question-checkmark',
      'invisible': !Progress.is_answered_by_current_user(this.uuid),
      },
      null,
      [ ELEMENT('span') ],
      {
        'click': (e) => {
          Progress.remove_current_user_answered(this.uuid)
          this.question_checkmark_element.setAttribute("invisible", true)
          for (let option_element of this.option_elements) {
            option_element.removeAttribute("wrong")
          }
          e.preventDefault()
        }
      }
    )

    this._element = DIV({'class': 'question-block'}, null, [
      ELEMENT('details',
        {
          'class': 'content-toggle',
          'open': true,
        }, null, [
        ELEMENT('summary', {'class':'question-header'}, null, [
          this.question_checkmark_element,
          ELEMENT('span',
            {
              'class': 'question-index',
              'title': this.uuid,
            }, this.index
          ),
          ELEMENT('span',
            {
              'class': 'selected-index',
            }, this.get_selected_index_string()
          ),
          ELEMENT('span',
            {'class': 'question-classification'},
            this.get_classification_string()
          ),
          ELEMENT('span',
            {'class': `difficulty-rating difficulty-${this.difficulty}`}
          )
        ]),
        DIV({'class':'question-body'}, null, [
          DIV({'class':'question-body-item'}, null, [
            this.stimulus,
            this.stem,
          ]),
          this.options.length > 0 ? DIV({'class':'question-body-item'}, null, [
            ELEMENT('ol', {'type':'A'}, null, this.option_elements)
          ]) : EMPTY_ELEMENT
        ]),
        ELEMENT('details', {'class':'answer-toggle'}, null,
          [
            ELEMENT('summary', null, 'Show Answer'),
            this.correct_answer !== null
              ? ELEMENT('b', null, `Correct Answer: ${this.correct_answer}`)
              : EMPTY_ELEMENT,
            this.rationale
          ],
          {
            'click': () => {
              Progress.mark_current_user_answered(this.uuid)
              this.question_checkmark_element.setAttribute("invisible", false)
              if (this.answer_type === "MCQ") {
                for (let i in this.option_elements)
                  if (i == this.correct_answer_index)
                    this.option_elements[i].removeAttribute("wrong")
                  else
                    this.option_elements[i].setAttribute("wrong", "true")

              }
            }
          }
        )
      ])
    ])

    return this._element
  }
  get_selected_index_string() {
    return '?'
  }
  get_classification_string() {
    let parts = [
      this.exam.short_name,
      this.superdomain.name,
      this.domain.acronym,
      this.subdomain.name
    ]
    return parts.join(' > ')
  }
  static from_json(json) {
    return new Question(
      json['index'], json['uuid'],
      json['exam'], json['superdomain'], json['domain'], json['subdomain'],
      json['answer_type'], json['difficulty'],
      json['stimulus'], json['stem'], json['options'],
      json['correct_answer'], json['rationale']
    )
  }
}
