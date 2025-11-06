'use strict';

const INITIAL_VIEW_INDEX = NaN

class LoadingStatus {
  constructor(name, N=null) {
    this.name = name
    this.N = N
    this.element = DIV({}, null, [
      DIV({}, name),
      DIV({}, null),
    ])
  }
  start() {
    this.t0 = Date.now()
  }
  update(i) {
    if (this.N !== null) {
      let percent = i / this.N * 100
      let percent_string = percent.toFixed(0) + "%"
      let fraction_string = `(${i}/${this.N})`
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
    this.index_element = DIV({})
    this.set_index(INITIAL_VIEW_INDEX)
    this.matches_element = DIV({}, "?")

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
    this.map = new Map()
    this.match_array = new Array()

    this.all_questions_load_status = new LoadingStatus("All Questions", TOTAL_QUESTIONS)

    this.element = DIV({"id":"question-viewer"}, null, [
      DIV({"id":"question-viewer-loading"})
    ])

    this.control = new QuestionViewerControl()

    document.onkeydown = (event) => {
      switch (event.key) {
        case 'ArrowLeft': this.view_index -= 1; break;
        case 'ArrowRight': this.view_index += 1; break;
      }
    }

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
      if (!this.map.has(uuid))
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
      this.#view_index = this.match_array.length - 1
    else if (i === this.match_array.length)
      this.#view_index = 0
    else
      this.#view_index = i

    let question = this.match_array[this.#view_index]
    this.element.replaceChildren(question.element)
    this.control.set_index(this.#view_index)
  }

  update_matching_questions() {
    this.match_array = []
    for (let question of this.map.values()) {
      if (question.matches_filters(Filters.get_current_user_filters()))
        this.match_array.push(question)
    }

    this.control.set_n_matches(this.match_array.length)

    if (this.match_array.length > 0)
      this.view_index = 0
    else
      this.view_index = NaN
  }

  start(controller) {
    this.all_questions_load_status.start()
  }
  write(chunk, controller) {
    let question = chunk

    this.map.set(question.uuid,  question)

    if (question.matches_filters(Filters.get_current_user_filters())) {
      this.match_array.push(question)
      if (this.match_array.length === 1) {
        this.view_index = 0
      }
    }

    this.all_questions_load_status.update(this.map.size)
  }
  close(controller) {
    this.control.set_n_matches(this.match_array.length)

    if (this.match_array.length === 0)
      this.view_index = NaN

    this.all_questions_load_status.stop()

    this.check_deleted_questions()
    storage.when_set("current_user", (_) => {
      this.check_deleted_questions()
    })
  }
}
