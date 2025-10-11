'use strict';

class UserFilters {
  constructor() {
    this.exam = EXAMS.length - 1
    this.superdomains = [/* all super domain indices */]
    this.domains = [/* all domain indices */]
    this.subdomain = [/* all subdomain indices */]
    this.difficulties = [/* all difficulty letters */]
    this.answer_types = [/* all answer_type codes */]
  }
}

class ExamFilter {
  constructor() {
    this.element = ELEMENT("select", {"id":"exam-select"}, null,
      EXAMS.map(exam => ELEMENT("option", {"value":exam.index}, exam.name)),
      {'change': this.change.bind(this)}
    )
    this.element.value = Filters.get_current_user_filters().exam

    storage.when_set("current_user", (username) => {
      this.element.value = Filters.get_current_user_filters().exam
    })
  }
  change(e) {
    let index = this.element.value
    let user_filters = Filters.get_current_user_filters()
    user_filters.exam = index
    Filters.set_current_user_filters(user_filters)
  }
}

class Filters {
  constructor() {
    storage.when_set('users', (users) => {
      let filters = storage.get('filters')

      // if 'filters' has a user that 'users' doesn't -> delete user from filters
      for (let user of Object.keys(filters))
        if (!users.includes(user))
          delete filters[user]

      // if 'users' has a user that 'filters' doesn't -> add new user to filters
      for (let user of users)
        if (!(user in filters))
          filters[user] = new UserFilters()

      storage.set('filters', filters)
    })

  }
  initialize() {
    storage.initialize('filters', Object.fromEntries(
      storage.get("users").map(user => [user, new UserFilters()])
    ))

    let row_elements = []

    let rowspans = {}
    for (let row of CLASSIFICATIONS) {
      rowspans[row.superdomain.name] = (rowspans[row.superdomain.name] ?? 0) + 1
      rowspans[row.domain.name] = (rowspans[row.domain.name] ?? 0) + 1
    }

    for (let row of CLASSIFICATIONS) {
      let superdomain = row.superdomain.name
      let domain = row.domain.name
      let subdomain = row.subdomain.name

      let superdomain_element = EMPTY_ELEMENT
      if (superdomain in rowspans) {
        superdomain_element = ELEMENT(
          "td",
          {"class":"superdomain","rowspan":rowspans[superdomain]},
          superdomain,
          null,
          {'click': () => {
            console.log(`filtering: "${superdomain}"`)
          }
        })
        delete rowspans[superdomain]
      }

      let domain_element = EMPTY_ELEMENT
      if (domain in rowspans) {
        domain_element = ELEMENT(
          "td",
          {"class":"domain","rowspan":rowspans[domain]},
          domain,
          null,
          {'click': () => {
            console.log(`filtering: "${superdomain}" > "${domain}"`)
          }
        })
        delete rowspans[domain]
      }

      let subdomain_element = ELEMENT(
        "td",
        {"class":"subdomain"},
        subdomain,
        null,
        {
          'click': () => {
            console.log(`filtering: "${superdomain}" > "${domain}" > "${subdomain}"`)
          }
        }
      )

      let row_element = ELEMENT("tr", null, null, [
        superdomain_element,
        domain_element,
        subdomain_element,
        ...DIFFICULTIES.map(d => {
          return ELEMENT("td", {"class":"difficulty"}, "?", null, {'click': () => {
            console.log(`filtering: "${superdomain}" > "${domain}" > "${subdomain}" > "${d}"`)
          }})
        })
      ])
      row_elements.push(row_element)
    }

    this.element = DIV(null, null, [
      ELEMENT("table", {"id":"grid"}, null, [
        ELEMENT("thead", null, null, [
          ELEMENT("tr", null, null, [
            ELEMENT("td", {"colspan":"3"}, null, [
              DIV({"class":"flex-row"}, null, [
                (new UserSelect()).element,
                (new UserDelete()).element,
                (new UserInput()).element,
                (new UserAdd()).element,
                (new ExamFilter()).element,
              ])
            ]),
            ...DIFFICULTIES.map(d => ELEMENT("td", {"class":`difficulty-${d}`}))
          ])
        ]),
        ELEMENT("tbody", null, null, row_elements)
      ]),
    ])
  }
  static get_current_user_filters() {
    let user = storage.get("current_user")
    let filters = storage.get("filters")
    return filters[user]
  }
  static set_current_user_filters(user_filters) {
    let user = storage.get("current_user")
    let filters = storage.get("filters")
    filters[user] = user_filters
    storage.set("filters", filters)
  }
}
