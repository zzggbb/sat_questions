'use strict';

const DIFFICULTIES = ["E", "M", "H"]

class Progress {
  /* storage manipulation methods */
  add_user(username) {
    let users = storage.get("users")
    users.push(username)
    storage.set("users", users)

    let answered = storage.get("answered")
    answered[username] = []
    storage.set("answered", answered)
  }
  get_current_user_answered() {
    let user = storage.get("current_user")
    let answered = storage.get("answered")
    return answered[user]
  }
  get_current_user_answered_section() {
    if (DOMAIN_KEY === null)
      return []

    return this.get_current_user_answered().filter(
      (uuid) => uuid.startsWith(DOMAIN_KEY)
    )
  }
  set_answered_storage(question_uuid) {
    let answered = storage.get("answered")
    let current_user = storage.get("current_user")
    answered[current_user].push(question_uuid)
    storage.set("answered", answered)
  }

  /* DOM manipulation methods */
  update_total_answered_DOM() {
    let elem = document.querySelector("#total-answered-questions")
    if (!elem) {
      console.warn("#total-answered-questions is missing, couldn't update")
      return
    }
    let total = this.get_current_user_answered_section().length
    elem.textContent = total
  }
  set_answered_DOM(question_elem, state) {
    let checkmark = question_elem.querySelector('.question-checkmark')
    if (state) {
      question_elem.setAttribute('answered', 'true')
      checkmark.removeAttribute('invisible')
    } else {
      question_elem.removeAttribute('answered')
      checkmark.setAttribute('invisible', 'true')
    }
  }
  update_answered_grid_totals_DOM() {
    if (!document.querySelector("#taxonomy"))
      return

    let per_difficulty_totals = []
    for (let i=0; i<SUBDOMAINS.length; i++)
      per_difficulty_totals[i] = new Uint32Array(DIFFICULTIES.length)

    for (let question_uuid of this.get_current_user_answered()) {
      if (!Question.check_uuid(question_uuid)) {
        let current_user = storage.get("current_user")
        console.warn(`user ${current_user} answered missing question ${question_uuid}`)
        continue
      }
      let question = new Question(question_uuid)
      let d = DIFFICULTIES.indexOf(question.difficulty)
      per_difficulty_totals[question.subdomain_index][d] += 1
    }

    for (let i=0; i<SUBDOMAINS.length; i++) {
      for (let d=0; d<DIFFICULTIES.length; d++) {
        let total = per_difficulty_totals[i][d]
        let difficulty = DIFFICULTIES[d]
        let query = `.answered-total[subdomain_index="${i}"][difficulty="${difficulty}"]`
        let cell = document.querySelector(query)
        cell.textContent = (total > 0) ? total : " "
      }
    }
  }

  /* DOM and storage manipulation methods */
  set_answered(question_elem) {
    if (question_elem.getAttribute('answered') === 'true')
      return

    // mark as answered in storage
    let uuid = question_elem.getAttribute('uuid')
    this.set_answered_storage(uuid)

    // mark as answered on the UI
    this.set_answered_DOM(question_elem, true)
    this.update_total_answered_DOM()
  }

  /* initialization methods */
  initialize_user_select() {
    let container = document.querySelector("#username-select")
    for (let option of container.querySelectorAll('option'))
      option.remove()

    let delete_button = document.querySelector("#username-delete")

    container.onchange = () => {
      let username = container.value
      console.log(`selected username ${container.value}`)
      storage.set("current_user", username)
      delete_button.setAttribute("visible", username !== "anonymous")

      this.initialize_questions()
      this.update_total_answered_DOM()
      this.update_answered_grid_totals_DOM()
    }

    delete_button.onclick = () => {
      let target_user = container.value

      if (target_user === "anonymous")
        return

      if (!confirm(`Are you sure you want delete user "${target_user}"?`))
        return

      console.log(`deleting username ${target_user}`)
      let users = storage.get("users")
      let index = users.indexOf(target_user)
      users.splice(index, 1)
      let fallback_user = users[users.length - 1]
      storage.set("current_user", fallback_user)
      storage.set("users", users)

      let answered = storage.get("answered")
      delete answered[target_user]
      storage.set("answered", answered)

      this.initialize_user_select()
      this.initialize_questions()
      this.update_total_answered_DOM()
    }

    delete_button.setAttribute("visible",
      storage.get("current_user") !== "anonymous")

    for (let username of storage.get("users")) {
      let option = ELEMENT("option", {}, username)
      if (username === storage.get("current_user"))
        option.setAttribute("selected", true)

      container.appendChild(option)
    }
  }
  initialize_answered_grid() {
    for (let i=0; i<SUBDOMAINS.length; i++) {
      for (let d=0; d<DIFFICULTIES.length; d++) {
        let difficulty = DIFFICULTIES[d]
        let query = `.answered-total[subdomain_index="${i}"][difficulty="${difficulty}"]`
        let cell = document.querySelector(query)
        let domain = cell.getAttribute("domain")
        let superdomain = cell.getAttribute("superdomain")
        cell.onclick = () => {
          // disable all filters
          for (let [type, value] of Filters.get_checkbox_pairs(superdomain, domain))
            Filters.set_cached_checkbox_state(domain, type, value, false)

          // enable cell-specific filters
          Filters.set_cached_checkbox_state(domain, "difficulty", difficulty, true)
          Filters.set_cached_checkbox_state(domain, "subdomain_index", i, true)

          location.href = `SAT_${superdomain}_${domain}.html`
        }
      }
    }
  }
  initialize_answer_buttons() {
    for (let button of document.querySelectorAll('.answer-toggle')) {
      let question_elem = button.closest('.question-block')
      button.onclick = (event) => {
        this.set_answered(question_elem)
      }
    }
  }
  initialize_undo_answer_buttons() {
    for (let button of document.querySelectorAll('.question-checkmark')) {
      button.onclick = (event) => {
        event.preventDefault()
        let question_elem = button.closest('.question-block')
        let uuid = question_elem.getAttribute('uuid')
        console.log(`undo answer for ${uuid}`)

        // update the backend
        let answered = storage.get("answered")
        let current_user = storage.get("current_user")
        let index = answered[current_user].indexOf(uuid)
        answered[current_user].splice(index, 1)
        storage.set("answered", answered)

        // make the question display as unanswered
        this.set_answered_DOM(question_elem, false)
        question_elem.querySelector(".content-toggle").setAttribute("open", true)

        // update the total answered count
        this.update_total_answered_DOM()

      }
    }
  }
  initialize_username_input() {
    document.querySelector('#username-submit-input').onclick = (event) => {
      let username_element = document.querySelector('#username-input')
      let username = username_element.value
      if (username === '') {
        alert("username is empty!")
        return
      }
      if (storage.get("users").includes(username)) {
        alert("username is already used!")
        username_element.value = ""
        return
      }

      username_element.value = ""
      this.add_user(username)
      window.localStorage.setItem("current_user", username)
      this.initialize_user_select()
      this.initialize_questions()
      this.update_total_answered_DOM()
    }
  }
  initialize_inputs() {
    this.initialize_user_select()
    this.initialize_answer_buttons()
    this.initialize_undo_answer_buttons()
    this.initialize_username_input()
  }
  initialize_questions() {
    for (let question_elem of document.querySelectorAll('.question-block')) {
      this.set_answered_DOM(question_elem, false)
      question_elem.querySelector('.content-toggle').setAttribute('open', true)
    }
    for (let question_uuid of this.get_current_user_answered_section()) {
      let question_elem = document.querySelector(`[uuid="${question_uuid}"]`)
      this.set_answered_DOM(question_elem, true)
      question_elem.querySelector('.content-toggle').removeAttribute('open')
    }
  }
  initialize() {
    this.initialize_inputs()
    this.initialize_questions()
    this.update_total_answered_DOM()
  }
}
