'use strict';

const storage = new Storage()
const progress = new Progress()
const filters = new Filters()
const control_panel = new ControlPanel()

window.onload = () => {
  storage.initialize()
  progress.initialize()
  filters.initialize()
  control_panel.initialize()

  for (let option of document.querySelectorAll('.answer-option')) {
    option.onclick = () => { option.toggleAttribute('wrong') }
  }
}

document.onkeydown = (event) => {
  if (event.key === 'a') {
    hovered_question = document.querySelector(".question-block:hover")
    if (hovered_question === null) return
    hovered_question.querySelector(".answer-toggle").toggleAttribute("open")
    progress.set_answered(hovered_question)
  }
  if (event.key === 'c') {
    hovered_question = document.querySelector(".question-block:hover")
    if (hovered_question === null) return
    hovered_question.querySelector(".content-toggle").toggleAttribute("open")
  }
}
