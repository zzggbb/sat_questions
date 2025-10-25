'use strict';

class ToggleButton {
  constructor(initial_state, text_true, text_false, callback) {
    this.state = initial_state

    this.text = {
      true: text_true,
      false: text_false
    }

    this.element = DIV({"class":"button"}, this.text[this.state], null, {
      'click': () => {
        this.state = !this.state
        callback(this.state)
        this.element.textContent = this.text[this.state]
      }
    })

    callback(initial_state)

    return this.element
  }
}
