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
  })
}

function json_to_question() {
  return new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(Question.from_json(chunk))
    }
  })
}

const storage = new Storage()
const users = new Users()
const progress = new Progress()
const filters = new Filters()

const control_panel = new ControlPanel()
const question_viewer = new QuestionViewer()

window.onload = async () => {
  console.log("index: window loaded")

  progress.initialize()
  filters.initialize()

  document.querySelector("#content").appendChild(control_panel.element)
  document.querySelector("#content").appendChild(question_viewer.element)

  let resource = '../pipeline/Questions/questions.json'
  let options = {
    mode: 'same-origin',
    headers: {
     'Cache-Control': 'no-cache, no-store'
    }
  }
  const response = await fetch(resource, options)

  await response.body
  .pipeThrough(new TextDecoderStream())
  .pipeThrough(split_stream('\n'))
  .pipeThrough(parse_json())
  .pipeThrough(json_to_question())
  .pipeTo(question_viewer.stream)

  console.log("index: finished loading questions")
  filters.update_answered_counts()
}
