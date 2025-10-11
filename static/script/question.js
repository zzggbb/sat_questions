'use strict';

class Question {
  constructor(index, uuid,
              exam, superdomain, domain, subdomain, difficulty,
              stimulus, stem, options, correct_answer, rationale) {
    this.index = index
    this.uuid = uuid
    this.exam = exam
    this.superdomain = superdomain
    this.domain = domain
    this.subdomain = subdomain
    this.difficulty = difficulty

    this.stimulus = stimulus
    this.stem = stem
    this.options = options
    this.correct_answer = correct_answer
    this.rationale = rationale

    this.element = DIV({'class': 'question-block'}, null, [
      ELEMENT('details',
        {
          'class': 'content-toggle',
          'open': true,
        }, null, [
        ELEMENT('summary', {'class':'question-header'}, null, [
          ELEMENT('span',
            {
            'class': 'button question-checkmark',
            'invisible': true,
            },
            null,
            [ ELEMENT('span') ]
          ),
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
            ELEMENT('ol', {'type':'A'}, null, [
              ...this.options.map((option) => {
                return ELEMENT('li', {'class':'answer-option'}, null, [option])
              })
            ])
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
          {'click': () => Progress.mark_current_user_answered(this.uuid)}
        )
      ])
    ])
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
    return parts.join('>')
  }
  static from_json(json) {
    return new Question(
      json['index'], json['uuid'],
      json['exam'], json['superdomain'], json['domain'], json['subdomain'],
      json['difficulty'],
      json['stimulus'], json['stem'], json['options'],
      json['correct_answer'], json['rationale']
    )
  }
}
