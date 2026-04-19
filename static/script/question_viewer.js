'use strict';

const INITIAL_VIEW_INDEX = NaN

class LoadingStatus {
  constructor(name, N=null) {
    /* N is optional, for when the total number of things to load isn't known ahead of time */
    this.name = name
    this.N = N
    this.element = DIV({"class": "loading-status"}, null, [
      DIV({}, name),
      DIV({"style": "white-space: pre"}, null),
    ])
  }
  start() {
    this.t0 = Date.now()
  }
  update(i) {
    if (this.N !== null) {
      let percent = i / this.N * 100
      let percent_string = percent.toFixed(0).padStart(3) + "%"
      let fraction_string = `(${String(i).padStart(4)}/${this.N})`
      this.element.children[1].textContent = [percent_string, fraction_string].join(' ')
    } else {
      this.element.children[1].textContent = i
    }
  }
  stop() {
    let duration_ms = Date.now() - this.t0
    let duration_s = duration_ms / 1000
    this.element.setAttribute('title', `elapsed: ${duration_s} (s)`)
  }
}

class QuestionViewerControl {
  constructor() {
    this.index_element = DIV({"id": "question-viewer-index"})
    this.set_index(INITIAL_VIEW_INDEX)
    this.matches_element = DIV({"id": "question-viewer-matches"}, "?")

    this.element = DIV({"id":"question-viewer-control"}, null, [
      BUTTON({},"◄", null, {'click':() => { question_viewer.view_index -= 1 }}),
      DIV({'class':'flex-row'}, null, [
        this.index_element,
        DIV({}, "/"),
        this.matches_element,
      ]),
      BUTTON({}, "►", null, {'click':() => { question_viewer.view_index += 1 }})
    ])
  }

  set_index(i) {
    if (Number.isNaN(i))
      this.index_element.textContent = "-"
    else
      // add one so that index is 1...N instead of 0...N-1
      this.index_element.textContent = i + 1

  }
  set_n_matches(m) {
    this.matches_element.textContent = m
  }
}

class QuestionViewer {
  #view_index = INITIAL_VIEW_INDEX

  constructor() {
    this.uuid_to_question_map = new Map()
    this.matching_questions = new Array()

    this.all_questions_load_status = new LoadingStatus("All Questions", TOTAL_QUESTIONS)

    this.element = DIV({"id":"question-viewer"}, null, [
      DIV({"id":"question-viewer-loading"})
    ])

    this.control = new QuestionViewerControl()
    this.current_question = null

    this.stream = new WritableStream({
      start: this.start.bind(this),
      write: this.write.bind(this),
      close: this.close.bind(this),
    })
  }

  initialize() {
    storage.when_set("filters", (_) => { this.update_matching_questions() })
    storage.when_set("current_user", (_) => { this.update_matching_questions() })
  }

  check_deleted_questions() {
    let current_user = storage.get("current_user")
    for (let uuid of Progress.get_current_user_answered())
      if (!this.uuid_to_question_map.has(uuid))
        console.warn(`User ${current_user} answered deleted question ${uuid}`)
  }

  get view_index() {
    return this.#view_index
  }
  set view_index(i) {
    if (Number.isNaN(i)) {
      this.#view_index = NaN
      this.element.replaceChildren(DIV({"id":"question-viewer-no-questions"}))
      this.control.set_index(NaN)
      return
    }

    if (i === -1)
      this.#view_index = this.matching_questions.length - 1
    else if (i === this.matching_questions.length)
      this.#view_index = 0
    else
      this.#view_index = i

    this.current_question = this.matching_questions[this.#view_index]
    this.element.replaceChildren(this.current_question.element)
    this.control.set_index(this.#view_index)
  }

  update_matching_questions() {
    this.matching_questions = new Array()
    for (let question of this.uuid_to_question_map.values()) {
      if (question.matches_filters(Filters.get_current_user_filters()))
        this.matching_questions.push(question)
    }

    this.control.set_n_matches(this.matching_questions.length)

    if (this.matching_questions.length > 0)
      this.view_index = 0
    else
      this.view_index = NaN
  }

  start(controller) {
    this.all_questions_load_status.start()
  }
  write(chunk, controller) {
    let question = chunk

    this.uuid_to_question_map.set(question.uuid,  question)

    if (question.matches_filters(Filters.get_current_user_filters())) {
      this.matching_questions.push(question)
      if (this.matching_questions.length === 1) {
        // first matching question was pushed
        this.view_index = 0
      }
    }

    this.all_questions_load_status.update(this.uuid_to_question_map.size)
  }
  close(controller) {
    this.control.set_n_matches(this.matching_questions.length)

    if (this.matching_questions.length === 0)
      this.view_index = NaN

    this.all_questions_load_status.stop()

    this.check_deleted_questions()
    storage.when_set("current_user", (_) => {
      this.check_deleted_questions()
    })
  }
}
