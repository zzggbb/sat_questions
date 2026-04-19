'use strict';

class Clock {
  constructor() {
    this.element = DIV({
      "class": "clock",
      "style": "white-space: pre"
    })
    this.update_interval = 500 // milliseconds
    window.setInterval(
      () => {
        let date = new Date()
        let hours_24 = date.getHours() // 0...23
        let minutes = date.getMinutes() // 0...59

        let am_pm = (hours_24 < 12) ? "AM" : "PM"
        let hours_12 = (hours_24 + 11) % 12 + 1

        let minutes_padded = String(minutes).padStart(2, "0")
        let hours_12_padded = String(hours_12).padStart(2, " ")

        this.element.textContent = `${hours_12_padded}:${minutes_padded} ${am_pm}`
      },
      this.update_interval
    )
  }
}

class ControlPanel {
  #element = null

  constructor() {
    this.toggle_button = null
  }

  get element() {
    if (this.#element !== null)
      return this.#element

    this.toggle_button = new ToggleButton(true, "hide controls", "show controls", (state) => {
      filters.element.setAttribute("in-layout", state)
      document.querySelector("#footer").setAttribute("in-layout", state)
    })

    this.#element = DIV({"id":"control-panel"}, null, [
      DIV({"class":"flex-row space-between"}, null, [
        question_viewer.all_questions_load_status,
        new Clock(),
        question_viewer.control,
        this.toggle_button,
      ]),
      filters,
    ])

    return this.#element
  }
}
