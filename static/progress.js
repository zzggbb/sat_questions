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
  set_answered_storage(question_uuid) {
    let answered = storage.get("answered")
    let current_user = storage.get("current_user")
    answered[current_user].push(question_uuid)
    storage.set("answered", answered)
  }

  /* DOM manipulation methods */
  set_feedback_DOM(message) {
    let elem = document.querySelector('#username-feedback')
    if (message === false) {
      elem.setAttribute('hidden', 'true')
      return
    }
    elem.removeAttribute('hidden')
    elem.textContent = message
    setTimeout(() => { elem.textContent = "" }, 5000)
  }
  update_total_answered_DOM() {
    let elem = document.querySelector("#total-answered-questions")
    let total = this.get_current_user_answered().length
    elem.textContent = `${total} answered questions`
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
    let container = document.querySelector("#username-radios")
    for (let radio_wrapper of container.querySelectorAll('div'))
      radio_wrapper.remove()

    let username_index = 0
    for (let username of storage.get("users")) {
      let id = `username-radio-${username_index}`
      let username_radio_wrapper = document.createElement('div')
      let username_radio_input = document.createElement('input')
      let username_radio_label = document.createElement('label')

      username_radio_input.onchange = (event) => {
        console.log(`selected username ${username}`)
        window.localStorage.setItem("current_user", username)
        this.initialize_questions()
        this.update_total_answered_DOM()
      }

      username_radio_input.setAttribute('type', 'radio')
      username_radio_input.setAttribute('id', id)
      username_radio_input.setAttribute('name', 'username')
      username_radio_input.setAttribute('value', username)
      if (username == storage.get("current_user"))
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
      let question_elem = button.closest('.question-block')
      button.onclick = (event) => {
        this.set_answered(question_elem)
      }
    }
  }
  initialize_username_input() {
    document.querySelector('#username-submit-input').onclick = (event) => {
      let username_element = document.querySelector('#username-input')
      let username = username_element.value
      if (username === '') {
        this.set_feedback_DOM("username is empty!")
        return
      }
      if (storage.get("users").includes(username)) {
        this.set_feedback_DOM("username is already used!")
        username_element.value = ""
        return
      }

      this.set_feedback_DOM(false)
      username_element.value = ""
      this.add_user(username)
      window.localStorage.setItem("current_user", username)
      this.initialize_user_select()
      this.initialize_questions()
      this.update_total_answered_DOM()
    }
  }
  initialize_username_delete() {
    let element = document.querySelector('#username-delete')
    element.onclick = (event) => {
      let target_user = storage.get("current_user")
      if (target_user === "anonymous") {
        this.set_feedback_DOM("cannot delete anonymous user!")
        return
      }
      let users = storage.get("users")
      let index = users.indexOf(target_user)
      users.pop(index)
      let fallback_user = users[users.length - 1]
      storage.set("current_user", fallback_user)
      storage.set("users", users)

      let answered = this.get_answered()
      delete answered[target_user]
      storage.set("answered", answered)

      this.initialize_user_select()
      this.initialize_questions()
      this.update_total_answered_DOM()
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
      this.set_answered_DOM(question_elem, false)
      question_elem.querySelector('.content-toggle').setAttribute('open', true)
    }
    for (let question_uuid of this.get_current_user_answered()) {
      if (!question_uuid.startsWith(DOMAIN_KEY))
        continue

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
