'use strict';

class Progress {
  constructor() {
    storage.when_set("users", (users) => {
      let answered = storage.get("answered")

      // if "answered" has a user that "users" doesn't -> delete user from "answered"
      for (let user of Object.keys(answered))
        if (!users.includes(user))
          delete answered[user]

      // if "users" has a user that "answered" doesn't -> add user to "answered"
      for (let user of users)
        if (!(user in answered))
          answered[user] = []

      storage.set("answered", answered)
    })
  }
  initialize() {
    storage.initialize("answered", Object.fromEntries(
      storage.get("users").map(user => [user, []])
    ))
  }

  static get_current_user_answered() {
    let user = storage.get("current_user")
    let answered = storage.get("answered")
    return answered[user]
  }

  static mark_current_user_answered(question_uuid) {
    let answered = storage.get("answered")
    let current_user = storage.get("current_user")
    if (answered[current_user].includes(question_uuid))
      return

    answered[current_user].push(question_uuid)
    storage.set("answered", answered)
  }
}
