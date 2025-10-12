'use strict';

function split_stream(substring) {
  let buffer = ''

  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk
      const parts = buffer.split(substring)
      parts.slice(0, -1).forEach(part => controller.enqueue(part))
      buffer = parts[parts.length - 1]
    },
    flush(controller) {
      if (buffer) controller.enqueue(buffer)
    }
  })
}

function parse_json() {
  return new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(JSON.parse(chunk))
    }
  });
}

class Migrate {
  constructor() {
    this.exam_shortnames = EXAMS.map(exam => exam.short_name)
  }
  uuid(uuid_original) {
    let prefix, hash = uuid_original.split("-")
    if (!this.exam_shortnames.includes(prefix))
      prefix = "SAT"

    return `${prefix}-${hash}`
  }
}

class StoreQuestions {
  constructor() {
    this.questions_map = new Map()

    this.stream = new WritableStream({
      start: this.start.bind(this),
      write: this.write.bind(this),
      close: this.close.bind(this),
    })

    this.questions_loaded_count = 0

    this.questions_visible_count = 0
    this.questions_visible_max = 50

    this.questions_element = DIV({'id': 'questions'})
    this.progress_element = DIV()
    this.question_objects = []
  }
  start(controller) {
    this.start_time = Date.now()
  }
  write(chunk, controller) {
    let uuid = chunk['uuid']

    if (this.questions_map.has(uuid))
      console.log(`questions_map got duplicate uuid: ${uuid}`)
    else
      this.questions_map.set(uuid,  chunk)

    this.questions_loaded_count += 1
    let percent_loaded = (this.questions_loaded_count / TOTAL_QUESTIONS * 100)
    let percent_loaded_string = percent_loaded.toFixed(0) + "%"
    let fraction_string = `(${this.questions_loaded_count}/${TOTAL_QUESTIONS})`
    let prefix = "Total Questions Loaded: "
    this.progress_element.textContent = [
      prefix, percent_loaded_string, fraction_string
    ].join(' ')

    if (this.questions_visible_count < this.questions_visible_max) {
      let question_obj = Question.from_json(chunk)
      if (question_obj.is_selected_by_filters()) {
        this.questions_element.appendChild(question_obj.element)
        this.questions_visible_count += 1
      }
    }
  }
  close(controller) {
    this.end_time = Date.now()
    let duration_ms = this.end_time - this.start_time
    let duration_s = duration_ms / 1000
    this.progress_element.textContent += ` (Finished in ${duration_s} seconds)`
  }
}

const migrate = new Migrate()
const storage = new Storage()
new Users()
const progress = new Progress()
const filters = new Filters()
const store_questions = new StoreQuestions()

window.onload = async () => {
  console.log("index3 loaded")

  progress.initialize()
  filters.initialize()

  document.querySelector("#control-panel").appendChild(filters.element)
  document.querySelector("#control-panel").appendChild(store_questions.progress_element)
  document.querySelector('#content').appendChild(store_questions.questions_element)

  let resource = '../pipeline/Questions/questions.json'
  let options = {
    mode: 'same-origin',
    headers: {
     'Cache-Control': 'no-cache, no-store'
    }
  }
  const response = await fetch(resource, options)

  response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(split_stream('\n'))
  .pipeThrough(parse_json())
  .pipeTo(store_questions.stream)
}
