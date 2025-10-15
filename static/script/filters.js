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

    //This really should be handled by a when_set("filters"), but
    // currently when_set doesn't allow detecting changes to sub-objects;
    // We really only want to trigger this when storage.filters.exam changes
    Filters.update_answered_counts()
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
        'selected': this.matches_filters()
      },
      text,
      null,
      {
      'click': this.click.bind(this)
      }
    )

    storage.when_set('filters', (_) => {
      this.element.setAttribute('selected', this.matches_filters())
    })
    storage.when_set('current_user', (_) => {
      this.element.setAttribute('selected', this.matches_filters())
    })
  }
  matches_filters() {
    let user_filters = Filters.get_current_user_filters()
    return (
      user_filters.superdomain === this.superdomain &&
      (user_filters.domains.includes(this.domain) || this.domain === null) &&
      (user_filters.subdomains.includes(this.subdomain) || this.subdomain === null) &&
      (user_filters.difficulties.includes(this.difficulty) || this.difficulty === null)
    )
  }
  get_n_matching_questions() {
    let current_user_filters = Filters.get_current_user_filters()
    let matches = 0
    for (let uuid of Progress.get_current_user_answered()) {
      if (!question_viewer.map.has(uuid)) {
        console.warn(`User ${storage.get("current_user")} answered deleted question ${uuid}`)
        continue
      }
      let question = question_viewer.map.get(uuid)
      let filters = {
        exam: current_user_filters.exam,
        superdomain: this.superdomain,
        domains: this.domains,
        subdomains: this.subdomains,
        difficulties: this.difficulties,
        answer_types: ANSWER_TYPES,
      }
      if (question.matches_filters(filters))
        matches += 1
    }
    return matches
  }
  click(e) {
    console.log(`${this.superdomain} > ${this.domains} > ${this.subdomains} > ${this.difficulties}`)
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

    storage.when_set("current_user", (_) => {
      this.update_answered_counts()
    })

    storage.when_set("answered", (_) => {
      this.update_answered_counts()
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
    this.answered_count_cells = []
    for (let row of CLASSIFICATIONS) {
      let superdomain = row.superdomain.index
      let domain = row.domain.index
      let subdomain = row.subdomain.index

      let superdomain_element = EMPTY_ELEMENT
      if (row.superdomain.name in rowspans) {
        superdomain_element = (new Cell(row.superdomain.name, superdomain)).element
        superdomain_element.setAttribute('rowspan', rowspans[row.superdomain.name])
        delete rowspans[row.superdomain.name]
      }

      let domain_element = EMPTY_ELEMENT
      if (row.domain.name in rowspans) {
        domain_element = (new Cell(row.domain.name, superdomain, domain)).element
        domain_element.setAttribute('rowspan', rowspans[row.domain.name])
        delete rowspans[row.domain.name]
      }

      let subdomain_element = (new Cell(row.subdomain.name, superdomain, domain, subdomain)).element

      let difficulty_cells = DIFFICULTIES.map(
        difficulty => new Cell('?', superdomain, domain, subdomain, difficulty)
      )
      let difficulty_elements = difficulty_cells.map(o => o.element)

      let row_element = ELEMENT("tr", null, null, [
        superdomain_element, domain_element, subdomain_element, ...difficulty_elements
      ])
      row_elements.push(row_element)
      this.answered_count_cells.push(...difficulty_cells)
    }

    this.element = DIV(null, null, [
      ELEMENT("table", {"id":"grid"}, null, [
        ELEMENT("thead", null, null, [
          ELEMENT("tr", null, null, [
            ELEMENT("td", {"colspan":"3"}, null, [
              DIV({"class":"flex-row"}, null, [
                users.element,
                (new ExamFilter()).element,
              ])
            ]),
            ...DIFFICULTIES.map(difficulty => ELEMENT("td", {"class":`difficulty-${difficulty}`}))
          ])
        ]),
        ELEMENT("tbody", null, null, row_elements)
      ]),
    ])
  }
  update_answered_counts() {
    for (let cell of this.answered_count_cells)
      cell.element.textContent = cell.get_n_matching_questions()
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
