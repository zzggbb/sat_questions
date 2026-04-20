# Finished

* Frontend: View questions
* Frontend: filter by MCQ/FRQ
* Frontend: Display total questions per difficulty
* BUG: (FIXED) clicking on P89>Circles problems displays questions from wrong subdomain, it should display no questions because there aren't any P89>Circle problems!
* BUG: (FIXED) Backend: running an individual pipeline stage is broken!
* BUG: (FIXED 2026-04-19)

  A question's options will be revealed (color coded red/green) when a user hasn't answered the question.
  The answer dropdown is still properly closed.

  A question's `set_answered_interface` callback (when setting `current_user`) is only registered when
  the question's `element` is created by the question viewer. This means that a question that hasn't been
  seen yet will not update its answered interface when switching users.

  Steps to reproduce:

  * Call `storage.clear()` and reload the page. (This will wipe all users, answer progress, etc)
  * Create two new users: `User1`, `User2`.
  * Select `User2`, select `Cross-Text Connections > Easy`.
  * Select `User1`, select `Equivalent Expressions > Easy`, go to question #2, mark it answered. This is the "stuck question".
  * Reload the page. User1 and `Equivalent Expressions > Easy > #1` will be automatically selected.
  * Select `User2`, select `Equivalent Expressions > Easy`, go to question #2. It will be revealed, even though `User2` never answered this question!

# High Priority

* Frontend: Caching questions locally so they don't have to download every time
* Frontend: Syncing storage data to/from server

# Low Priority

* Set URL param uuid based on current question:

    ```javascript
    let url = new URL(window.location.href)
    url.searchParams.set("uuid", uuid)
    window.history.replaceState(null, '', url)
    ```

* Read URL param uuid to set current question:
    ```javascript
    let params = new URLSearchParams(window.location.search)
    params.get("uuid")
    ```

* Backend: Keep a running "changelog" of changes to the quesiton set (deletes, insertions, updates)

* Frontend: Indicating total number of questions per superdomain/domain/subdomain/difficulty
    * Special handling when number is zero, like P89 doesn't have Circle problems

* Backend: Pipeline: Hashing of stage code, to automatically run stages when the code changes

* Testing System
    * Students select answers and then they get a score report at the end. Basically doing what bluebook does, except better. Bluebook is difficult to access. Also bluebook sucks because its hard to go over the wrong answers. When going over wrong answers, it shows the answers by default and you have to click to hide them. Also it doesn't say whether or not you got the question wrong, so we always look at a question thinking the student got it wrong, when they really got it right. Also bluebook displays parenthesis wrong!

    * standard bluebook test:
        * IAI: 12-14 questions
        * CAS: 13-15 questions
        * EOI: 8-12 questions
        * SEC: 11-15 questions
        * ALG: 13-15 questions
        * PSDA: 5-7 questions
        * ADV: 13-15 questions
        * GAT: 5-7 questions
        * (total: 98-100 questions)
