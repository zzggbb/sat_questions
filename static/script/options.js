let OPTION_INDEX = {"A":0, "B":1, "C":2, "D":3}

class Option {
  #wrong

  constructor(option_html_string) {
    this.element = ELEMENT(
      'li',
      { 'class':'answer-option' },
      null,
      [option_html_string],
      { 'click': () => { this.wrong = !this.wrong } }
    )
    this.wrong = false
  }
  set wrong(state) {
    this.#wrong = state
    this.element.setAttribute("wrong", state)
  }
  get wrong() {
    return this.#wrong
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
    if (Progress.is_answered_by_current_user(uuid))
      this.reveal()
  }
  conceal() {
    for (let option_obj of this.option_objs)
      option_obj.wrong = false
  }
  reveal() {
    for (let [i, option_obj] of enumerate(this.option_objs))
      option_obj.wrong = (i !== OPTION_INDEX[this.correct_answer])
  }
}

