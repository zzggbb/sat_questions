const DIFFICULTIES = ["easy", "medium", "hard"]

function get_checkbox(key, value) {
  return document.getElementById(`checkbox-${key}-${value}`)
}

function is_question_selected(question) {
  let difficulty = question.getAttribute('difficulty')
  let subdomain = question.getAttribute('subdomain')
  return (
    get_checkbox("difficulty", difficulty).checked &&
    get_checkbox("subdomain", subdomain).checked
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
}

window.onload = () => {
  for (let checkbox of document.querySelectorAll('input[type="checkbox"]')) {
    checkbox.checked = true
    checkbox.onchange = () => {
      update_total_selected_questions()

      let selected_N = get_total_selected_questions()
      let selected_index = 1;
      for (let question of document.querySelectorAll('.question-block')) {
        if (is_question_selected(question)) {
          question.removeAttribute("hidden")
          question.querySelector('.selected-index').textContent =
            `${selected_index} of ${selected_N} selected`
          selected_index += 1
        } else {
          question.setAttribute("hidden", "true")
        }
      }
    }
  }

  update_total_selected_questions()
}

document.onkeypress = (event) => {
  if (event.keyCode === 'a'.charCodeAt()) {
    console.log("received 'a' press")
    event.preventDefault()
    hovered_question = document.querySelector(".question-block:hover")
    if (hovered_question === null)
      return

    hovered_question.querySelector("details").toggleAttribute("open")
  }
}
