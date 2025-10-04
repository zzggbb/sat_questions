'use strict';

const storage = new Storage()
const progress = new Progress()
const filters = new Filters()

window.onload = () => {
  storage.initialize()
  progress.initialize()
  const control_panel = new ControlPanel()
  document.querySelector("#content").prepend(control_panel.element)

  filters.initialize()

  for (let option of document.querySelectorAll('.answer-option')) {
    option.onclick = () => { option.toggleAttribute('wrong') }
  }
}

document.onkeydown = (event) => {
  if (event.key === 'a') {
    let hovered_question = document.querySelector(".question-block:hover")
    if (hovered_question === null) return
    hovered_question.querySelector(".answer-toggle").toggleAttribute("open")
    progress.set_answered(hovered_question)
  }
  if (event.key === 'c') {
    let hovered_question = document.querySelector(".question-block:hover")
    if (hovered_question === null) return
    hovered_question.querySelector(".content-toggle").toggleAttribute("open")
  }
}
