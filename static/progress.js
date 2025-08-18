class Progress {
  update_users(list) {
    window.localStorage.setItem("users", JSON.stringify(list))
  }
  update_answered(dict) {
    window.localStorage.setItem("answered", JSON.stringify(dict))
  }
  add_user(username) {
    let users = this.get_users()
    users.push(username)
    this.update_users(users)

    let answered = this.get_answered()
    answered[username] = []
    this.update_answered(answered)
  }
  set_feedback(message) {
    let elem = document.querySelector('#username-feedback')

    if (message === false) {
      elem.setAttribute('hidden', 'true')
      return
    }

    elem.removeAttribute('hidden')
    elem.textContent = message
    setTimeout(() => {
      elem.textContent = ""
    }, 5000)
  }
  set_answered_state(question_elem, state) {
    if (state) {
      question_elem.setAttribute('answered', 'true')
      question_elem.querySelector('.question-checkmark').removeAttribute('invisible')
    } else {
      question_elem.removeAttribute('answered')
      question_elem.querySelector('.question-checkmark').setAttribute('invisible', 'true')
    }
  }
  initialize_user_select() {
    let container = document.querySelector("#username-radios")
    for (let radio_wrapper of container.querySelectorAll('div'))
      radio_wrapper.remove()

    let username_index = 0
    for (let username of this.get_users()) {
      let id = `username-radio-${username_index}`
      let username_radio_wrapper = document.createElement('div')
      let username_radio_input = document.createElement('input')
      let username_radio_label = document.createElement('label')

      username_radio_input.onchange = (event) => {
        console.log(`selected username ${username}`)
        window.localStorage.setItem("current_user", username)
        this.initialize_questions()
        this.update_total_answered_questions()
      }

      username_radio_input.setAttribute('type', 'radio')
      username_radio_input.setAttribute('id', id)
      username_radio_input.setAttribute('name', 'username')
      username_radio_input.setAttribute('value', username)
      if (username == this.get_current_user())
        username_radio_input.setAttribute("checked", true)

      username_radio_label.setAttribute('for', id)
      username_radio_label.textContent = username

      username_radio_wrapper.appendChild(username_radio_input)
      username_radio_wrapper.appendChild(username_radio_label)

      container.appendChild(username_radio_wrapper)
      username_index += 1
    }
  }
  initialize_answer_buttons() {
    for (let button of document.querySelectorAll('.answer-toggle')) {
      button.onclick = (event) => {
        let question_elem = button.closest('.question-block')
        if (question_elem.getAttribute('answered') === 'true')
          return

        // mark as answered in local storage
        let question_uuid = question_elem.getAttribute('uuid')
        this.set_question_answered(question_uuid)

        // mark as answered on the UI
        this.set_answered_state(question_elem, true)

        this.update_total_answered_questions()
      }
    }
  }
  initialize_username_input() {
    document.querySelector('#username-submit-input').onclick = (event) => {
      let username_element = document.querySelector('#username-input')
      let username = username_element.value
      if (username === '') {
        this.set_feedback("username is empty!")
        return
      }
      if (this.get_users().includes(username)) {
        this.set_feedback("username is already used!")
        username_element.value = ""
        return
      }

      this.set_feedback(false)
      username_element.value = ""
      this.add_user(username)
      window.localStorage.setItem("current_user", username)
      this.initialize_user_select()
      this.initialize_questions()
      this.update_total_answered_questions()
    }
  }
  initialize_username_delete() {
    let element = document.querySelector('#username-delete')
    element.onclick = (event) => {
      let target_user = this.get_current_user()
      if (target_user === "anonymous") {
        this.set_feedback("cannot delete anonymous user!")
        return
      }
      let users = this.get_users()
      let index = users.indexOf(target_user)
      users.pop(index)
      let fallback_user = users[users.length - 1]
      window.localStorage.setItem("current_user", fallback_user)
      this.update_users(users)

      let answered = this.get_answered()
      delete answered[target_user]
      this.update_answered(answered)

      this.initialize_user_select()
      this.initialize_questions()
      this.update_total_answered_questions()
    }
  }
  initialize_inputs() {
    this.initialize_user_select()
    this.initialize_answer_buttons()
    this.initialize_username_input()
    this.initialize_username_delete()
  }
  initialize_questions() {
    for (let question_elem of document.querySelectorAll('.question-block')) {
      this.set_answered_state(question_elem, false)
      question_elem.querySelector('.content-toggle').setAttribute('open', true)
    }
    for (let question_uuid of this.get_current_user_answered()) {
      let question_elem = document.querySelector(`[uuid="${question_uuid}"]`)

      /* Happens if we are referencing a question from a different domain.
       * This might have some performance impact...
       */
      if (question_elem === null)
        continue

      this.set_answered_state(question_elem, true)
      question_elem.querySelector('.content-toggle').removeAttribute('open')
    }
  }
  initialize() {
    this.initialize_inputs()
    this.initialize_questions()
    this.update_total_answered_questions()
  }
  get_users() {
    return JSON.parse(window.localStorage.getItem("users"))
  }
  get_current_user() {
    return window.localStorage.getItem("current_user")
  }
  get_answered() {
    return JSON.parse(window.localStorage.getItem("answered"))
  }
  get_current_user_answered() {
    let user = this.get_current_user()
    let answered = this.get_answered()
    return answered[user]
  }
  update_total_answered_questions() {
    let elem = document.querySelector("#total-answered-questions")
    let total = this.get_current_user_answered().length
    elem.textContent = `${total} answered questions`
  }
  set_question_answered(question_uuid) {
    let answered = this.get_answered()
    answered[this.get_current_user()].push(question_uuid)
    this.update_answered(answered)
  }
  toString() {
    if (window.localStorage.getItem("state") !== "initialized")
      return "not initialized"

    let out = ""
    out += `current user: ${this.get_current_user()}\n`
    out += `users: [${this.get_users()}]\n`
    out += `answered: ${JSON.stringify(this.get_answered(), null, 2)}\n`
    return out
  }
  display() {
    console.log(this.toString())
  }
}
