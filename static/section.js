const storage = new Storage()
const progress = new Progress()
const filters = new Filters()

window.onload = () => {
  storage.initialize()
  progress.initialize()
  filters.initialize()

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

/*
// Manage the top bar so it appears when scrolling up
let last_scrollY = window.scrollY
let bar_visible = (window.scrollY > 0)
document.onscroll = (event) => {
  let diff_scrollY = (window.scrollY - last_scrollY)
  last_scrollY = window.scrollY
  if (diff_scrollY > 0) {
    // scrolling down, this triggers hiding the bar
    if (bar_visible) {
      console.log("hiding bar")
      document.querySelector("#bar").style.position = 'static'
      bar_visible = false
    }
  } else {
    // scrolling back to the top, this triggers showing the bar
    if (!bar_visible) {
      console.log("showing bar")
      document.querySelector("#bar").style.position = 'sticky'
      bar_visible = true
    }
  }
}
*/
