const DIFFICULTIES = ["easy", "medium", "hard"]

function get_checkbox(key, value) {
  return document.querySelector(`[${key}="${value}"]`)
}

function is_question_selected(question) {
  let difficulty = question.getAttribute('difficulty')
  let subdomain = question.getAttribute('subdomain')
  let search_text = document.querySelector("#search").value
  return (
    get_checkbox("difficulty", difficulty).checked &&
    get_checkbox("subdomain", subdomain).checked &&
    (search_text === '' || question.querySelector('.question-body').textContent.includes(search_text))
  )
}

function get_total_selected_questions() {
  let count = 0
  for (let question of document.querySelectorAll('.question-block')) {
    if (is_question_selected(question))
      count += 1
  }
  return count
}

function update_total_selected_questions() {
  let elem = document.querySelector("#total-selected-questions")
  let total = get_total_selected_questions()
  elem.textContent = `${total} selected`
  return total
}

function refresh_questions() {
  let selected_N = update_total_selected_questions()
  let selected_index = 1;
  for (let question of document.querySelectorAll('.question-block')) {
    if (is_question_selected(question)) {
      question.removeAttribute("hidden")
      question.querySelector('.selected-index').textContent = `${selected_index} of ${selected_N} selected`
      selected_index += 1
    } else {
      question.setAttribute("hidden", "true")
    }
  }
}

window.onload = () => {
  console.log("window loaded!")

  document.querySelector("#search").onkeyup = (event) => {
    if (event.key === "Enter") {
      refresh_questions()
    }
  }

  for (let checkbox of document.querySelectorAll('.checkbox')) {
    checkbox.checked = false
    checkbox.onchange = refresh_questions
  }

  console.log("updating total selected questions...")
  update_total_selected_questions()
  console.log("done!")

  for (let toggle of document.querySelectorAll('.toggle.button')) {
    let state = toggle.hasAttribute("show")
    let key = toggle.getAttribute('key')
    let value = toggle.getAttribute('value')
    let checkboxes = document.querySelectorAll(`.subdomain-filter .checkbox[${key}="${value}"]`)
    toggle.onclick = (event) => {
      console.log(state, key, value, checkboxes)
      for (let checkbox of checkboxes) {
        checkbox.checked = state
        refresh_questions()
      }
    }
  }
}

document.onkeyup = (event) => {
  if (event.key !== 'a') return
  event.preventDefault()
  let hovered_question = document.querySelector(".question-block:hover")
  if (hovered_question === null) return
  hovered_question.querySelector("details").toggleAttribute("open")
}


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
