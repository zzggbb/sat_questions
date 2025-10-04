'use strict';

class AnsweredCount {
  constructor() {
    this.element = DIV({"id":"answered-questions-count"}, AnsweredCount.get_count())
    storage.when_set("current_user", (username) => {
      this.element.textContent = AnsweredCount.get_count()
    })
    storage.when_set("answered", (answered) => {
      this.element.textContent = AnsweredCount.get_count()
    })
  }
  static get_count() {
    return Progress.get_current_user_answered_section().length
  }
}

class Progress {
  constructor() {
    storage.when_set("current_user", (username) => {
      this.initialize_questions()
    })
  }
  /* storage manipulation methods */
  static get_current_user_answered() {
    let user = storage.get("current_user")
    let answered = storage.get("answered")
    return answered[user]
  }
  static get_current_user_answered_section() {
    if (DOMAIN_KEY === null) return []

    return Progress.get_current_user_answered().filter(uuid => uuid.startsWith(DOMAIN_KEY))
  }
  static set_answered_storage(question_uuid) {
    let answered = storage.get("answered")
    let current_user = storage.get("current_user")
    answered[current_user].push(question_uuid)
    storage.set("answered", answered)
  }

  /* DOM manipulation methods */
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
    Progress.set_answered_storage(uuid)

    // mark as answered on the UI
    this.set_answered_DOM(question_elem, true)
  }

  /* initialization methods */
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

        // update the backend
        let answered = storage.get("answered")
        let current_user = storage.get("current_user")
        let index = answered[current_user].indexOf(uuid)
        answered[current_user].splice(index, 1)
        storage.set("answered", answered)

        // make the question display as unanswered
        this.set_answered_DOM(question_elem, false)
        question_elem.querySelector(".content-toggle").setAttribute("open", true)
      }
    }
  }
  initialize_inputs() {
    this.initialize_answer_buttons()
    this.initialize_undo_answer_buttons()
  }
  initialize_questions() {
    for (let question_elem of document.querySelectorAll('.question-block')) {
      this.set_answered_DOM(question_elem, false)
      question_elem.querySelector('.content-toggle').setAttribute('open', true)
    }
    for (let question_uuid of Progress.get_current_user_answered_section()) {
      let question_elem = document.querySelector(`[uuid="${question_uuid}"]`)
      this.set_answered_DOM(question_elem, true)
      question_elem.querySelector('.content-toggle').removeAttribute('open')
    }
  }
  initialize() {
    this.initialize_inputs()
    this.initialize_questions()
  }
}
