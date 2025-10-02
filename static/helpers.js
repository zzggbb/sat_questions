"use strict";

function remove_element(selector) {
  let e = document.querySelector(selector)
  if (e !== null)
    e.remove()
}

function set_text(element, text) {
  if (element)
    element.textContent = text
}

function ELEMENT(tag, attributes=null, text_content=null, children=null,
                 onmouseup=null, oninput=null) {
  let e = document.createElement(tag)

  if (attributes)
    for (let [k, v] of Object.entries(attributes))
      e.setAttribute(k, v)

  if (text_content !== null)
    if (tag === "input")
      e.value = text_content
    else
      e.textContent = text_content

  if (children !== null) for (let child of children) e.appendChild(child)

  if (onmouseup !== null) e.onmouseup = onmouseup

  if (oninput !== null) e.oninput = oninput

  return e
}

function DIV(attributes, text_content=null, children=null, onclick=null) {
  return ELEMENT("div", attributes, text_content, children, onclick)
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
