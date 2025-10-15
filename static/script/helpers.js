"use strict";

const EMPTY_ELEMENT = null
const ELEMENTS = {}

function remove_element(selector) {
  let e = document.querySelector(selector)
  if (e !== null)
    e.remove()
}

function set_text(element, text) {
  if (element)
    element.textContent = text
}

function string_to_elements(html_string) {
    const template = document.createElement('template');
    template.innerHTML = html_string;
    return template.content.childNodes;
}

function string_to_element(html_string) {
  const e = DIV()
  e.innerHTML = html_string
  return e
}

function ELEMENT(tag, attributes=null, text_content=null, children=null,
                 event_handlers=null) {
  let e = document.createElement(tag)

  if (attributes !== null)
    for (let [k, v] of Object.entries(attributes)) {
      e.setAttribute(k, v)
      if (k === "id")
        ELEMENTS[v] = e
    }

  if (text_content !== null)
    if (tag === "input")
      e.value = text_content
    else
      e.textContent = text_content

  if (children !== null)
    for (let child of children)
      if (child !== EMPTY_ELEMENT) {
        if (typeof(child) === 'string') {
          child = string_to_element(child)
          e.appendChild(child)
        } else {
          e.appendChild(child)
        }
      }

  if (event_handlers !== null)
    for (let [event_name, f] of Object.entries(event_handlers))
      e.addEventListener(event_name, f)

  return e
}

function DIV(attributes, text_content=null, children=null, event_handlers=null) {
  return ELEMENT("div", attributes, text_content, children, event_handlers)
}

function format_timestamp(time_ms) {
  if (time_ms === null)
    return ["never"]

  let date = new Date(time_ms)
  let calendar_part = date.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "2-digit", year: "numeric"
  }).replaceAll(",", "")
  let time_part = date.toLocaleString("en-US", {
    timeStyle: "long",
  })
  return [calendar_part, time_part]
}

function* enumerate(list) {
  let i = 0
  for (let v of list) {
    yield [i, v]
    i++
  }
}

function* entries(object) {
  for (let [k, v] of Object.entries(object))
    yield [k, v]
}
