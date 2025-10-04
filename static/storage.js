'use strict';

const STATE_FLAG = "initialized"

class Storage {
  constructor() {
    this.handlers = {}
  }
  initialize() {
    if (window.localStorage.getItem("state") === STATE_FLAG)
      return

    this.clear()
    this.set("state", STATE_FLAG)
    this.set("users", ["anonymous"])
    this.set("current_user", "anonymous")
    this.set("answered", {"anonymous": []})
    this.set("checkboxes", {})
    this.set("total_selected_questions", {})
  }
  set(key, value) {
    if (typeof(value) === 'object') value = JSON.stringify(value)
    window.localStorage.setItem(key, value)
    console.log(`set storage.${key} = ${value}`)
    if (key in this.handlers) {
      for (let handler of this.handlers[key]) {
        handler(value)
      }
    }
  }
  get(key, fallback = null) {
    let value = window.localStorage.getItem(key)
    if (value == null) return fallback
    try { return JSON.parse(value) } catch { return value }
  }
  when_set(key, handler) {
    if (!(key in this.handlers))
      this.handlers[key] = []

    this.handlers[key].push(handler)
  }
  clear() {
    window.localStorage.clear()
  }
}
