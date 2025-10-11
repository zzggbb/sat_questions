'use strict';

class Storage {
  constructor() {
    this.handlers = {}
  }
  set(key, value) {
    let string_value = value
    if (typeof(value) === 'object')
      string_value = JSON.stringify(value)

    window.localStorage.setItem(key, string_value)
    console.log(`set storage.${key} = ${string_value} (type: ${typeof(value)})`)

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
  initialize(key, value) {
    if (this.get(key) === null)
      this.set(key, value)
  }
  clear() {
    window.localStorage.clear()
  }
}
