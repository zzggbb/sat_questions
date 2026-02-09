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

    this.options_obj = new Options(this.uuid, this.options, this.correct_answer)
    this.answer_toggle_element = null
    this.question_checkmark_element = null
  }

  set_answered_interface(answered) {
    /* answered: boolean */
    if (answered) {
      this.question_checkmark_element.setAttribute("visible", true)
      this.options_obj.reveal()
      this.answer_toggle_element.setAttribute("open", "")
    } else {
      this.question_checkmark_element.setAttribute("visible", false)
      this.options_obj.conceal()
      this.answer_toggle_element.removeAttribute("open")
    }
  }

  set_answered(state) {
    /* state: boolean */
    Progress.mark_current_user_answered(this.uuid, state)
    this.set_answered_interface(state)
  }

  toggle_answered() {
    this.set_answered(!Progress.is_answered_by_current_user(this.uuid))
  }

  get element() {
    if (this.#element !== null)
      return this.#element

    this.answer_toggle_element = ELEMENT('details',
      {
        'class':'answer-toggle',
      },
      null,
      [
        ELEMENT('summary', null, 'Show Answer'),
        this.correct_answer !== null
          ? ELEMENT('b', null, `Correct Answer: ${this.correct_answer}`)
          : EMPTY_ELEMENT,
        this.rationale
      ],
      {
        'click': (e) => {
          // mark the question as answered
          this.set_answered(true)
          e.preventDefault()
        }
      }
    )
    if (Progress.is_answered_by_current_user(this.uuid))
      this.answer_toggle_element.setAttribute("open", "")

    this.question_checkmark_element = ELEMENT('span',
      {
        'class': 'button question-checkmark',
        'visible': Progress.is_answered_by_current_user(this.uuid),
      },
      null,
      [ ELEMENT('span') ],
      {
        'click': (e) => {
          // mark the question as unanswered
          this.set_answered(false)
          e.preventDefault()
        }
      }
    )

    storage.when_set("current_user", (_) => {
      this.set_answered_interface(Progress.is_answered_by_current_user(this.uuid))
    })

    this.#element = DIV({'class': 'question-block'}, null, [
      DIV({'class':'question-header'}, null, [
        this.question_checkmark_element,
        ELEMENT('span', {'class': 'question-index'}, `${this.index + 1} / ${TOTAL_QUESTIONS}`),
        ELEMENT('span', {'class': 'question-uuid'}, this.uuid.slice(0,3) + '...' + this.uuid.slice(-4),
                null, {'click': ()=> navigator.clipboard.writeText(this.uuid)}),
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
          this.options_obj.element
        ]) : EMPTY_ELEMENT
      ]),
      this.answer_toggle_element
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
