const UNKNOWN = 'unknown'

class Filters {
  initialize() {
    console.log("initializing filters")
    this.initialize_toggle_all('show')
    this.initialize_toggle_all('hide')
    this.initialize_checkboxes()
    this.process_questions()
  }
  set_total_selected_questions(value) {
    let current = storage.get("total_selected_questions")
    current[DOMAIN_KEY] = value
    storage.set("total_selected_questions", current)
  }
  get_total_selected_questions() {
    let current = storage.get("total_selected_questions")
    return current[DOMAIN_KEY] ?? UNKNOWN
  }
  initialize_toggle_all(mode) {
    let bool = (mode === 'show')
    document.querySelector(`#${mode}-all-subdomains`).onclick = (event) => {
      console.log(`setting all subdomains: ${mode}`)
      for (let checkbox of document.querySelectorAll('.subdomain-filter .checkbox')) {
        checkbox.checked = bool
        this.set_cached_checkbox_state(checkbox)
      }
      this.set_total_selected_questions(UNKNOWN)
      this.process_questions()
    }
  }

  get_cached_checkbox_state(checkbox) {
    let checkboxes = storage.get("checkboxes")
    return checkboxes[checkbox.id] ?? true
  }
  set_cached_checkbox_state(checkbox) {
    let checkboxes = storage.get("checkboxes")
    checkboxes[checkbox.id] = checkbox.checked
    storage.set("checkboxes", checkboxes)
  }

  all_questions() {
    return document.querySelectorAll('.question-block')
  }
  is_checked(key, value) {
    return document.querySelector(`#checkbox-${DOMAIN_KEY}-${key}-${value}`).checked
  }
  is_question_selected(question) {
    return (
      this.is_checked("difficulty", question.getAttribute('difficulty')) &&
      this.is_checked("subdomain", question.getAttribute('subdomain'))
    )
  }
  process_questions() {
    let count = 0

    // might be cached, or might be UNKNOWN
    let total_selected = this.get_total_selected_questions()
    console.log(`1st pass: total selected = ${total_selected}`)
    let selected_questions = []
    for (let question of this.all_questions()) {
      if (this.is_question_selected(question)) {
        count += 1
        question.removeAttribute("hidden")
        if (total_selected !== UNKNOWN)
          this.set_selected_index(question, count, total_selected)

        selected_questions.push(question)
      } else {
        question.setAttribute("hidden", "true")
      }
    }

    if (total_selected === UNKNOWN) {
      this.set_total_selected_questions(count)
      console.log(`2nd pass: total selected = ${count}`)
      let index = 1
      for (let question of selected_questions) {
        this.set_selected_index(question, index, count)
        index += 1
      }
    }

    let elem = document.querySelector('#total-matching-questions')
    elem.textContent = count

  }
  set_selected_index(question, i, N) {
    let elem = question.querySelector('.match-index')
    elem.textContent = `${i} of ${N} selected`
  }
  initialize_checkboxes() {
    for (let checkbox of document.querySelectorAll('.checkbox')) {
      checkbox.checked = this.get_cached_checkbox_state(checkbox)
      checkbox.onchange = () => {
        this.set_cached_checkbox_state(checkbox)
        this.set_total_selected_questions(UNKNOWN)
        this.process_questions()
     }
    }
  }
}
