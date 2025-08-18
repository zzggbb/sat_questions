const STATE_FLAG = "initialized"

class Storage {
  set(key, value) {
    if (typeof(value) === 'object')
      value = JSON.stringify(value)

    window.localStorage.setItem(key, value)
  }
  initialize() {
    if (window.localStorage.getItem("state") === STATE_FLAG)
      return

    window.localStorage.clear()
    this.set("state", STATE_FLAG)
    this.set("users", ["anonymous"])
    this.set("current_user", "anonymous")
    this.set("answered", {"anonymous": []})
    this.set("checkboxes", {})
    this.set("total_selected_questions", {})
  }
}
