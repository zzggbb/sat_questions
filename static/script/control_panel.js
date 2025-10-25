'use strict';

class ControlPanel {
  #element = null

  constructor() { }

  get element() {
    if (this.#element === null)
      this.#element = DIV({"id":"control-panel"}, null, [
        DIV({"class":"flex-row space-between"}, null, [
          question_viewer.all_questions_load_status.element,
          question_viewer.control.element,
          //(new AnswerTypeFilter()).element,
          new ToggleButton(true, "hide controls", "show controls", (state) => {
            filters.element.setAttribute("visible", state)
            document.querySelector("#footer").setAttribute("visible", state)
          }),
        ]),
        filters.element,
      ])

    return this.#element
  }
}
