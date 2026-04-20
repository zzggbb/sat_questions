'use strict';

const STATE_UNDECIDED = "undecided"
const STATE_CORRECT = "correct"
const STATE_WRONG = "wrong"

const OPTION_INDEX = {"A":0, "B":1, "C":2, "D":3}

class Option {
  #state

  constructor(option_html_string) {
    this.element = ELEMENT(
      'li',
      { 'class':'answer-option' },
      null,
      [option_html_string],
      {
        'click': () => {
          // clicking toggles between undecided and wrong
          if (this.state === STATE_UNDECIDED)
            this.state = STATE_WRONG
          else if (this.state === STATE_WRONG)
            this.state = STATE_UNDECIDED
        }
      }
    )
    this.state = STATE_UNDECIDED
  }
  set state(s) {
    this.#state = s
    this.element.setAttribute("state", s)
  }
  get state() {
    return this.#state
  }
}

class Options {
  constructor(uuid, options_array, correct_answer) {
    this.option_objs = options_array.map(option_string => new Option(option_string))
    this.correct_answer = correct_answer
    this.element = ELEMENT(
      "ol",
      {'class':'answer-options','type': 'A'},
      null,
      this.option_objs.map(o => o.element)
    )
  }
  conceal() {
    for (let option_obj of this.option_objs) option_obj.state = STATE_UNDECIDED
  }
  reveal() {
    for (let option_obj of this.option_objs) option_obj.state = STATE_WRONG
    this.option_objs[OPTION_INDEX[this.correct_answer]].state = STATE_CORRECT
  }
}
