'use strict';

class Question {
  #element = null

  constructor(index, uuid, exam, superdomain, domain, subdomain, answer_type,
              difficulty, stimulus, stem, options, correct_answer, rationale) {
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
  }
  get element() {
    if (this.#element !== null)
      return this.#element

    let options_obj = new Options(this.uuid, this.options, this.correct_answer)

    let answer_toggle_element = ELEMENT('details', {'class':'answer-toggle'}, null,
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
          question_checkmark_element.setAttribute("invisible", false)
          options_obj.reveal()
        }
      }
    )

    let question_checkmark_element = ELEMENT('span',
      {
      'class': 'button question-checkmark',
      'invisible': !Progress.is_answered_by_current_user(this.uuid),
      },
      null,
      [ ELEMENT('span') ],
      {
        'click': (e) => {
          Progress.remove_current_user_answered(this.uuid)
          question_checkmark_element.setAttribute("invisible", true)
          options_obj.conceal()
          answer_toggle_element.removeAttribute("open")
          e.preventDefault()
        }
      }
    )

    this.#element = DIV({'class': 'question-block'}, null, [
      ELEMENT('details',
        {
          'class': 'content-toggle',
          'open': true,
        }, null, [
        ELEMENT('summary', {'class':'question-header'}, null, [
          question_checkmark_element,
          ELEMENT('span',
            {
              'class': 'question-index',
              'title': this.uuid,
            }, this.index
          ),
          ELEMENT('span',
            {
              'class': 'matches-index',
            }, this.get_matches_index_string()
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
            options_obj.element
          ]) : EMPTY_ELEMENT
        ]),
        answer_toggle_element
      ])
    ])

    return this.#element
  }
  matches_filters(filters) {
    return (
      filters.exam == this.exam.index &&
      filters.superdomain == this.superdomain.index &&
      filters.domains.includes(this.domain.index) &&
      filters.subdomains.includes(this.subdomain.index) &&
      filters.difficulties.includes(this.difficulty) &&
      filters.answer_types.includes(this.answer_type)
    )
  }
  get_matches_index_string() {
    return `${this.matches_index+1}`
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
