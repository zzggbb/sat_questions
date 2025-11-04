'use strict';

class Clock {
  constructor() {
    this.element = DIV()
    window.setInterval(
      () => {
        let date = new Date()
        let hours_24 = date.getHours() // 0...23
        let minutes = date.getMinutes() // 0...59

        let am_pm = (hours_24 < 12) ? "AM" : "PM"
        let hours_12 = (hours_24 + 11) % 12 + 1

        let minutes_padded = String(minutes).padStart(2, "0")

        this.element.textContent = `${hours_12}:${minutes_padded} ${am_pm}`
      },
      500
    )

  }
}

class ControlPanel {
  #element = null

  get element() {
    if (this.#element === null)
      this.#element = DIV({"id":"control-panel"}, null, [
        DIV({"class":"flex-row space-between"}, null, [
          question_viewer.all_questions_load_status.element,
          (new Clock()).element,
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
