'use strict';

class ControlPanel {
  #element = null

  constructor() {

  }
  get element() {
    if (this.#element === null)
      this.#element = DIV({"id":"control-panel"}, null, [
        filters.element,
        DIV({"class":"flex-row", "style":"justify-content:space-between"}, null, [
          question_viewer.progress_element,
          question_viewer.matched_element
        ])
      ])

    return this.#element
  }
}
