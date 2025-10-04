'use strict';

const UNKNOWN = 'unknown'

class SelectedCount {
  constructor() {
    this.element = DIV({"id":"selected-questions-count"}, SelectedCount.get_count())
    storage.when_set("total_selected_questions", (_) => {
      this.element.textContent = SelectedCount.get_count()
    })
  }
  static get_count() {
    return Filters.get_total_selected_questions()
  }
}

class Filters {
  initialize() {
    console.log("initializing filters")
    this.initialize_toggle_all('show')
    this.initialize_toggle_all('hide')
    this.initialize_checkboxes()
    this.process_questions()
  }
  static set_total_selected_questions(value) {
    let current = storage.get("total_selected_questions")
    current[DOMAIN_KEY] = value
    storage.set("total_selected_questions", current)
  }
  static get_total_selected_questions() {
    let current = storage.get("total_selected_questions")
    return (DOMAIN_KEY in current) ? current[DOMAIN_KEY] : UNKNOWN
  }
  initialize_toggle_all(mode) {
    let bool = (mode === 'show')
    document.querySelector(`#${mode}-all-subdomains`).onclick = (event) => {
      console.log(`setting all subdomains: ${mode}`)
      for (let subdomain_index of TAXONOMY[SUPERDOMAIN_NUMBER][DOMAIN_KEY]) {
        this.get_checkbox(DOMAIN_KEY, "subdomain_index", subdomain_index).checked = bool
        Filters.set_cached_checkbox_state(DOMAIN_KEY, "subdomain_index", subdomain_index, bool)
      }
      Filters.set_total_selected_questions(UNKNOWN)
      this.process_questions()
    }
  }
  static get_checkbox_pairs(superdomain_key=SUPERDOMAIN_KEY, domain_key=DOMAIN_KEY) {
    let pairs = []
    for (let subdomain_index of TAXONOMY[superdomain_key][domain_key]) {
      pairs.push(["subdomain_index", subdomain_index])
    }
    for (let difficulty of DIFFICULTIES) {
      pairs.push(["difficulty", difficulty])
    }
    return pairs
  }
  get_checkbox(domain, type, value) {
    return document.querySelector(`#checkbox-${domain}-${type}-${value}`)
  }

  get_cached_checkbox_state(domain, type, value) {
    // domain: IAI
    // type: difficulty | subdomain
    // value: E|M|H|integer
    let checkboxes = storage.get("checkboxes")
    let key = `${domain}-${type}-${value}`
    return (key in checkboxes) ? checkboxes[key] : true
  }
  static set_cached_checkbox_state(domain, type, value, state) {
    let checkboxes = storage.get("checkboxes")
    let key = `${domain}-${type}-${value}`
    checkboxes[key] = state
    storage.set("checkboxes", checkboxes)
  }

  all_questions() {
    return document.querySelectorAll('.question-block')
  }
  is_checked(domain, key, value) {
    return this.get_checkbox(domain, key, value).checked
  }
  is_question_selected(question) {
    return (
      this.is_checked(DOMAIN_KEY, "difficulty", question.getAttribute('difficulty')) &&
      this.is_checked(DOMAIN_KEY, "subdomain_index", question.getAttribute('subdomain_index'))
    )
  }
  process_questions() {
    let count = 0
    // might be cached, or might be UNKNOWN
    let total_selected = Filters.get_total_selected_questions()
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
      Filters.set_total_selected_questions(count)
      console.log(`2nd pass: total selected = ${count}`)
      let index = 1
      for (let question of selected_questions) {
        this.set_selected_index(question, index, count)
        index += 1
      }
    }

    //document.querySelector('#matching-questions-count').textContent = count
  }
  set_selected_index(question, i, N) {
    let elem = question.querySelector('.match-index')
    elem.textContent = `${i} of ${N} selected`
  }
  initialize_checkboxes() {
    for (let [type, value] of Filters.get_checkbox_pairs()) {
      let checkbox = this.get_checkbox(DOMAIN_KEY, type, value)
      checkbox.checked = this.get_cached_checkbox_state(DOMAIN_KEY, type, value)
      checkbox.onchange = () => {
        Filters.set_cached_checkbox_state(DOMAIN_KEY, type, value, checkbox.checked)
        Filters.set_total_selected_questions(UNKNOWN)
        this.process_questions()
      }
    }
  }
}
