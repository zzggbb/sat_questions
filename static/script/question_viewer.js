class QuestionViewer {
  constructor() {
    this.map = new Map()
    this.match_array = new Array()

    this.stream = new WritableStream({
      start: this.start.bind(this),
      write: this.write.bind(this),
      close: this.close.bind(this),
    })

    this.progress_element = DIV()
    this.matched_element = DIV({}, "Matching Questions: calculating...")

    this.element = DIV({"id":"question-viewer"}, null, [
      DIV({"id":"question-viewer-loading"})
    ])

    this.question_index = 0

    document.onkeydown = (event) => {
      if (event.key === 'ArrowLeft') {
        this.decrement_question_index()
        this.show_question(this.question_index)
      }
      else if (event.key === 'ArrowRight') {
        this.increment_question_index()
        this.show_question(this.question_index)
      }
    }

    this.question_view_index = 0
  }

  update_progress_element() {
    let percent = (this.map.size / TOTAL_QUESTIONS * 100)
    let percent_string = percent.toFixed(0) + "%"
    let fraction_string = `(${this.map.size}/${TOTAL_QUESTIONS})`
    this.progress_element.textContent = [percent_string, fraction_string].join(' ')
  }

  decrement_question_index() {
    if (this.question_index == 0)
      this.question_index = this.match_array.length - 1
    else
      this.question_index = this.question_index - 1
  }
  increment_question_index() {
    if (this.question_index == this.match_array.length - 1)
      this.question_index = 0
    else
      this.question_index = this.question_index + 1
  }
  show_question(i) {
    this.element.replaceChildren(this.match_array[i].element)
  }

  start(controller) {
    this.start_time = Date.now()
  }
  write(chunk, controller) {
    let question = chunk

    this.map.set(question.uuid,  question)

    if (question.matches_filters(Filters.get_current_user_filters())) {
      this.match_array.push(question)
      question.matches_index = this.match_array.length - 1
      if (this.match_array.length === 1) {
        this.show_question(0)
      }
    }

    this.update_progress_element()
  }
  close(controller) {
    let duration_ms = Date.now() - this.start_time
    let duration_s = duration_ms / 1000
    this.progress_element.textContent += ` [elapsed: ${duration_s}s]`
    this.matched_element.textContent = `Matching Questions: ${this.match_array.length}`
  }
}
