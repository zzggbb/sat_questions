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

class LightDarkToggle {
  /*
  state can be 'light', 'dark', or 'light dark'
  */
  #sun = 'M2 2 3 4 0 5 3 6 2 8 4 7l1 3L6 7 8 8 7 6l3-1L7 4 8 2 6 3 5 0 4 3Z'
  #moon = 'M8.75 1A4.75 4.75 0 108.75 9 3.5 3.5 0 118.75 1'
  #params = 'M3.5 1.5A1.5 1.5 0 103.5 2.5L9.5 2.5 9.5 1.5ZM6.5 4.5A1.5 1.5 0 116.5 5.5L.5 5.5.5 4.5ZM3.5 7.5A1.5 1.5 0 103.5 8.5L9.5 8.5 9.5 7.5Z'

  constructor() {
    this.buttons = {
      'light':      ICON('0 0 10 10', this.#sun),
      'light dark': ICON('0 0 10 10', this.#params),
      'dark':       ICON('0 0 10 10', this.#moon)
    }
    this.state_to_filter = {
      'light': 'invert(0)',
      'light dark': null,
      'dark': 'invert(1)'
    }
    this.element = DIV({"id":"light-dark-toggle"}, null, Object.values(this.buttons))
    this.state = 'light dark'
    for (let [name, button] of Object.entries(this.buttons))
      button.addEventListener('click', () => { this.state = name })
  }

  set state(new_state) {
    document.documentElement.style.colorScheme = new_state
    document.documentElement.style.setProperty('--math-image-filter',
      this.state_to_filter[new_state]
    )

    for (let [name, button] of Object.entries(this.buttons))
      button.setAttribute('active', name === new_state)
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

    this.toggle_button = new ToggleButton(true, "▲", "▼", (state) => {
      filters.element.setAttribute("in-layout", state)
      document.querySelector("#footer").setAttribute("in-layout", state)
    })

    this.#element = DIV({"id":"control-panel"}, null, [
      DIV({"class":"flex-row space-between"}, null, [
        question_viewer.all_questions_load_status,
        new Clock(),
        question_viewer.control,
        new LightDarkToggle(),
        this.toggle_button,
      ]),
      filters,
    ])

    return this.#element
  }
}
