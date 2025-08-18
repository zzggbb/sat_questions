class Filters {
  initialize() {
    console.log("initializing filters")
    this.initialize_toggle_all('show')
    this.initialize_toggle_all('hide')
    this.initialize_checkboxes()
    this.process_questions()
  }
  set_total_selected_questions(value) {
    let current = JSON.parse(window.localStorage.getItem('total_selected_questions'))
    current[DOMAIN_KEY] = value
    window.localStorage.setItem('total_selected_questions', JSON.stringify(current))
    console.log(`set localStorage.total_selected_questions = ${value}`)
  }
  get_total_selected_questions() {
    let current = JSON.parse(window.localStorage.getItem('total_selected_questions'))
    return current[DOMAIN_KEY]
  }
  initialize_toggle_all(mode) {
    let bool = (mode === 'show')
    document.querySelector(`#${mode}-all-subdomains`).onclick = (event) => {
      console.log(`setting all subdomains: ${mode}`)
      for (let checkbox of document.querySelectorAll('.subdomain-filter .checkbox')) {
        checkbox.checked = bool
        this.set_cached_checkbox_state(checkbox)
      }
      this.set_total_selected_questions('unknown')
      this.process_questions()
    }
  }

  get_cached_checkbox_state(checkbox) {
    let checkboxes = JSON.parse(window.localStorage.getItem('checkboxes'))
    if (checkbox.id in checkboxes)
      return checkboxes[checkbox.id]
    else
      return true
  }
  set_cached_checkbox_state(checkbox) {
    let checkboxes = JSON.parse(window.localStorage.getItem('checkboxes'))
    checkboxes[checkbox.id] = checkbox.checked
    window.localStorage.setItem('checkboxes', JSON.stringify(checkboxes))
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

    // might be cached, or might be 'unknown'
    let total_selected = this.get_total_selected_questions()
    console.log(`1st pass: total selected = ${total_selected}`)
    for (let question of this.all_questions()) {
      if (this.is_question_selected(question)) {
        count += 1
        question.removeAttribute("hidden")
        this.set_selected_index(question, count, total_selected)
      } else {
        question.setAttribute("hidden", "true")
      }
    }

    if (total_selected === 'unknown') {
      this.set_total_selected_questions(count)
      console.log(`2nd pass: total selected = ${count}`)
      let index = 1
      for (let question of document.querySelectorAll('.question-block:not([hidden])')) {
        this.set_selected_index(question, index, count)
        index += 1
      }
    }

    let elem = document.querySelector('#total-matching-questions')
    elem.textContent = `${count} selected questions`

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
        this.set_total_selected_questions('unknown')
        this.process_questions()
     }
    }
  }
}
