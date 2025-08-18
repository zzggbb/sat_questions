const DIFFICULTIES = ["easy", "medium", "hard"]
function get_checkbox(key, value) {
  return document.querySelector(`[${key}="${value}"]`)
}
function set_total_matches(value) {
  let elem = document.querySelector("#total-matching-questions")
  if (value === 'loading')
    elem.textContent = "loading..."
  else
    elem.textContent = `${value} selected`
}
function set_loading_indicator(state) {
  console.log(`setting loading indicator to ${state}`)
  let elem = document.querySelector('#loading-indicator')
  elem.style.visibility = state ? 'visible' : 'hidden'
}
function generate_question_element(question, total_matches) {
  var options_html = ''
  if (question.options.length > 0) {
    let li_html = question.options.map(o => `<li>${o}</li>`).join('')
    options_html = `<div class="question-body-item"><ol type="A">${li_html}</ol></div>`
  }

  let correct_answer_html = question.correct_answer ?
    `<b>Correct Answer: ${question.correct_answer}</b>` :
    ''

  let temp = document.createElement('div')
  temp.innerHTML = `<div class="question-block">
    <div class="question-header">
      <span class="question-index">Question ${question.index+1}</span>
      <span class="match-index">${question.match_index+1} of ${total_matches}</span>
      <span class="question-taxonomy">${question.domain.name} > ${question.subdomain}</span>
      <span class="question-response-type response-type-${question.response_type}">
        ${question.response_type.toUpperCase()}
      </span>
      <span class="difficulty-rating difficulty-${question.difficulty}">
        ${question.difficulty[0].toUpperCase()}
      </span>
    </div>
    <div class="question-body">
      <div class="question-body-item">
        ${question.stimulus}
        ${question.stem}
      </div>
      ${options_html}
    </div>
    <details>
      <summary>Show Answer</summary>
      ${correct_answer_html}
      ${question.rationale}
    </details>
  </div>`
  return temp.firstChild
}
function question_matches_filters(question) {
  let needle = document.querySelector("#search").value
  let haystack_elem = document.createElement('div')
  haystack_elem.innerHTML = question.stimulus + question.stem
  let haystack = haystack_elem.textContent

  if (!get_checkbox("difficulty", question.difficulty).checked)
    return false

  if (!get_checkbox("response-type", question.response_type).checked)
    return false

  if (!get_checkbox("subdomain", question.subdomain).checked)
    return false

  if (!((needle === '') || haystack.includes(needle)))
    return false

  return true
}
function refresh_questions() {
  console.log("refreshing questions")
  set_total_matches("loading")
  let prev_node = null
  let total_matches = 0
  for (let question of question_data) {
    let match = question_matches_filters(question)
    question.match = match
    if (match) {
      question.match_index = total_matches
      total_matches += 1
    }
  }

  let questions_element = document.querySelector("#questions")
  questions_element.replaceChildren()
  for (let question of question_data) {
    if (question.match) {
      let question_element = generate_question_element(question, total_matches)
      questions_element.appendChild(question_element)
    }
  }

  set_total_matches(total_matches)
}
window.onload = () => {
  refresh_questions()

  /*
  Refresh questions when user types 'Enter' in the search bar
  */
  document.querySelector("#search").onkeydown = (event) => {
    if (event.key === "Enter") {
      refresh_questions()
    }
  }

  /*
  Refresh questions when user changes a checkbox
  */
  for (let checkbox of document.querySelectorAll('.checkbox')) {
    checkbox.checked = false
    checkbox.onchange = refresh_questions
  }

  /*
  Refresh questions when user clicks a 'Show All' or 'Hide All' button
  */
  for (let toggle of document.querySelectorAll('.toggle.button')) {
    let state = toggle.hasAttribute("show")
    let key = toggle.getAttribute('key')
    let value = toggle.getAttribute('value')
    let checkboxes = document.querySelectorAll(`.subdomain-filter .checkbox[${key}="${value}"]`)
    toggle.onclick = (event) => {
      for (let checkbox of checkboxes) {
        checkbox.checked = state
      }
      refresh_questions()
    }
  }

  /*
  Toggle showing the answer of the hovered question when 'a' is pressed
  */
  document.onkeyup = (event) => {
    if (event.key !== 'a') return
    event.preventDefault()
    let hovered_question = document.querySelector(".question-block:hover")
    if (hovered_question === null) return
    hovered_question.querySelector("details").toggleAttribute("open")
  }

  /*
  Make the top bar visibile/invisible as the user scrolls up/down
  */
  let last_scrollY = window.scrollY
  let bar_visible = (window.scrollY > 0)
  document.onscroll = (event) => {
    let diff_scrollY = (window.scrollY - last_scrollY)
    last_scrollY = window.scrollY
    if (diff_scrollY > 0) {
      // scrolling down, this triggers hiding the bar
      if (bar_visible) {
        document.querySelector("#bar").style.position = 'static'
        bar_visible = false
      }
    } else {
      // scrolling back to the top, this triggers showing the bar
      if (!bar_visible) {
        document.querySelector("#bar").style.position = 'sticky'
        bar_visible = true
      }
    }
  }
}
