function get_checkbox(difficulty) {
  return document.getElementById(`checkbox-${difficulty}`)
}

function get_total_selected_questions() {
  let count = 0
  for (let difficulty of ["E", "M", "H"]) {
    if (get_checkbox(difficulty).checked) {
      questions = document.querySelectorAll(`.question-block[difficulty="${difficulty}"]`)
      count += questions.length
    }
  }
  return count
}

window.onload = () => {
  let all_questions = document.getElementsByClassName('question-block')

  for (let difficulty of ["E", "M", "H"]) {
    get_checkbox(difficulty).checked = true

    get_checkbox(difficulty).onchange = () => {
      let selected_N = get_total_selected_questions()
      let selected_index = 1

      for (let question of all_questions) {
        if (question.getAttribute("difficulty") === difficulty) {
          if (question.getAttribute("hidden") === null) {
            question.setAttribute("hidden", "true")
          } else {
            question.removeAttribute("hidden")
          }
        }

        if (question.getAttribute("hidden") === null) {
            question.getElementsByClassName("selected-index")[0].textContent =
              `${selected_index} of ${selected_N} selected`
            selected_index += 1
        }

      }
    }
  }
}
