'use strict';

class UserFilters {
  constructor() {
    // only one can be selected
    this.exam = EXAMS.length - 1 // index
    this.superdomain = SUPERDOMAINS.length - 1 // index

    // multiple can be selected
    this.domains = UserFilters.matching_domains(this.superdomain) // index
    this.subdomains = UserFilters.matching_subdomains(this.domains) // index
    this.difficulties = DIFFICULTIES // letter
    this.answer_types = ANSWER_TYPES // acronym
  }
  static matching_domains(superdomain) {
    return [... new Set(CLASSIFICATIONS.filter(r => r.superdomain.index===superdomain).map(r => r.domain.index))]
  }
  static matching_subdomains(domains) {
    return [... new Set(CLASSIFICATIONS.filter(r => domains.includes(r.domain.index)).map(r => r.subdomain.index))]
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

class Cell {
  constructor(text, superdomain, domain=null, subdomain=null, difficulty=null) {
    // all arguments are indices
    this.superdomain = superdomain
    this.domain = domain
    this.subdomain = subdomain
    this.difficulty = difficulty

    this.domains = (domain === null) ? UserFilters.matching_domains(this.superdomain) : [domain]
    this.subdomains = (subdomain === null) ? UserFilters.matching_subdomains(this.domains) : [subdomain]
    this.difficulties = (difficulty === null) ? DIFFICULTIES : [difficulty]

    this.element = ELEMENT('td',
      {
        'class':'filter-cell',
        'selected': this.is_selected_by_filters()
      }, text, null, {
      'click': this.click.bind(this)
    })

    storage.when_set('filters', (_) => {
      this.element.setAttribute('selected', this.is_selected_by_filters())
    })
    storage.when_set('current_user', (_) => {
      this.element.setAttribute('selected', this.is_selected_by_filters())
    })
  }
  is_selected_by_filters() {
    let user_filters = Filters.get_current_user_filters()
    return (
      user_filters.superdomain === this.superdomain &&
      (user_filters.domains.includes(this.domain) || this.domain === null) &&
      (user_filters.subdomains.includes(this.subdomain) || this.subdomain === null) &&
      (user_filters.difficulties.includes(this.difficulty) || this.difficulty === null)
    )
  }
  click(e) {
    console.log(`superdomain=${this.superdomain} domains=${this.domains} subdomains=${this.subdomains} difficulties=${this.difficulties}`)
    let user_filters = Filters.get_current_user_filters()
    user_filters.superdomain = this.superdomain
    user_filters.domains = this.domains
    user_filters.subdomains = this.subdomains
    user_filters.difficulties = this.difficulties
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


    let rowspans = {}
    for (let row of CLASSIFICATIONS) {
      rowspans[row.superdomain.name] = (rowspans[row.superdomain.name] ?? 0) + 1
      rowspans[row.domain.name] = (rowspans[row.domain.name] ?? 0) + 1
    }

    let row_elements = []
    for (let row of CLASSIFICATIONS) {
      let superdomain = row.superdomain.name
      let domain = row.domain.name
      let subdomain = row.subdomain.name

      let superdomain_element = EMPTY_ELEMENT
      if (superdomain in rowspans) {
        superdomain_element = (new Cell(row.superdomain.name, row.superdomain.index)).element
        superdomain_element.setAttribute('rowspan', rowspans[superdomain])
        delete rowspans[superdomain]
      }

      let domain_element = EMPTY_ELEMENT
      if (domain in rowspans) {
        domain_element = (new Cell(row.domain.name, row.superdomain.index, row.domain.index)).element
        domain_element.setAttribute('rowspan', rowspans[domain])
        delete rowspans[domain]
      }

      let subdomain_element = (new Cell(row.subdomain.name, row.superdomain.index, row.domain.index, row.subdomain.index)).element

      let row_element = ELEMENT("tr", null, null, [
        superdomain_element,
        domain_element,
        subdomain_element,
        ...DIFFICULTIES.map(
          d => (new Cell('?', row.superdomain.index, row.domain.index, row.subdomain.index, d)).element
        )
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
