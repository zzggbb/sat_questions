'use strict';

const STATE_FLAG = "initialized"

class Storage {
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
    console.log(`set storage.${key} = ${value}`)
    window.localStorage.setItem(key, value)
  }
  get(key, fallback = null) {
    let value = window.localStorage.getItem(key)
    if (value == null) return fallback
    try { return JSON.parse(value) } catch { return value }
  }
  clear() {
    window.localStorage.clear()
  }
}
