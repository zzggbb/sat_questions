'use strict';

const ANONYMOUS = "anonymous"

class UserInput {
  constructor() {
    this.element = ELEMENT("input", {
      "id": "user-input", "class": "button",
      "type": "text", "placeholder": "enter a new username"
    })
  }
}

class UserAdd {
  constructor() {
    this.element = DIV({"id":"user-add", "class":"button"}, "add", null,
      {"click": this.click.bind(this)}
    )
  }
  add_user(username) {
    let users = storage.get("users")
    users.push(username)
    storage.set("users", users)
  }
  click() {
    let user_input = ELEMENTS["user-input"]
    let username = user_input.value
    if (username === '') {
      alert("username is empty!")
      return
    }
    if (storage.get("users").includes(username)) {
      alert("username is already used!")
      return
    }
    user_input.value = ''
    this.add_user(username)
    storage.set("current_user", username)
  }
}

class UserSelect {
  constructor() {
    this.element = this.get_element()
    storage.when_set("current_user", (username) => { this.refresh_element() })
    storage.when_set("users", (users) => { this.refresh_element() })
  }
  get_options() {
    let options = []
    for (let username of storage.get("users")) {
      let option = ELEMENT("option", null, username)
      if (username == storage.get("current_user"))
        option.setAttribute("selected", true)

      options.push(option)
    }
    return options
  }
  get_element() {
    return ELEMENT("select", {"id":"user-select"}, null, this.get_options(),
      {'change': this.change.bind(this)}
    )
  }
  refresh_element() {
    let new_element = this.get_element()
    this.element.replaceWith(new_element)
    this.element = new_element
  }
  change(e) {
    let username = this.element.value
    storage.set("current_user", username)
  }
}

class UserDelete {
  constructor() {
    this.element = DIV({
        "id":"user-delete",
        "class": "button",
        "visible": storage.get("current_user") !== ANONYMOUS
      }, "delete", null, {'click': this.click.bind(this)}
    )
    storage.when_set("current_user", (username) => {
      this.element.setAttribute("visible", username !== ANONYMOUS)
    })
  }
  click() {
    let target_user = storage.get("current_user")

    if (target_user === ANONYMOUS) return
    if (!confirm(`Are you sure you want to delete user "${target_user}"?`)) return

    let users = storage.get("users")
    let index = users.indexOf(target_user)
    users.splice(index, 1)
    let fallback_user = users[users.length - 1]
    storage.set("current_user", fallback_user)
    storage.set("users", users)
  }
}

class Users {
  constructor() {
    storage.initialize("users", [ANONYMOUS])
    storage.initialize("current_user", ANONYMOUS)
  }
}

class UsersRow extends Users {
  constructor() {
    super()
    this.element = DIV({"class": "flex-row"}, null, [
      (new UserSelect()).element,
      (new UserDelete()).element,
      (new UserInput()).element,
      (new UserAdd()).element,
    ])
  }
}

class UsersCompact extends Users {
  constructor() {
    super()
    this.element = DIV({"id": "user-panel"}, null, [
      DIV({"class":"flex-row"}, null, [
        (new UserSelect()).element,
        (new UserDelete()).element,
      ]),
      DIV({"class":"flex-row"}, null, [
        (new UserInput()).element,
        (new UserAdd()).element,
      ])
    ])
  }
}
