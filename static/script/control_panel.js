'use strict';

class ControlPanel {
  #element = null

  constructor() {
    this.time_element = DIV({}, null, null, null)
    window.setInterval(
      () => {
        let date = new Date()
        let hours_24 = date.getHours() // 0...23
        let minutes = date.getMinutes() // 0...59

        let am_pm = (hours_24 < 12) ? "AM" : "PM"
        let hours_12 = (hours_24 + 11) % 12 + 1
        this.time_element.textContent = `${hours_12}:${minutes} ${am_pm}`
      },
      500
    )
  }

  get element() {
    if (this.#element === null)
      this.#element = DIV({"id":"control-panel"}, null, [
        DIV({"class":"flex-row space-between"}, null, [
          question_viewer.all_questions_load_status.element,
          this.time_element,
          question_viewer.control.element,
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
