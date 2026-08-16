'use strict';

class QuestionGroup {
  constructor(exam=null, superdomain=null, domain=null, subdomain=null, difficulty=null, answer_type=null) {
    // integers (0-based indices)
    this.exam = exam
    this.superdomain = superdomain
    this.domain = domain
    this.subdomain = subdomain

    // letter E/M/H
    this.difficulty = difficulty

    // acronym MCQ/FRQ
    this.answer_type = answer_type
  }
  static from_json(json) {
    return new QuestionGroup(
      json['exam'],
      json['superdomain'],
      json['domain'],
      json['subdomain'],
      json['difficulty'],
      json['answer_type']
    )
  }
  contains(other) {
    if (!(other instanceof QuestionGroup))
      throw new Error("other must be a QuestionGroup")

    for (let level of ['exam', 'superdomain', 'domain', 'subdomain'])
      if (this[level] === null)
        continue
      else
        if (this[level] !== other[level])
          return false

    if (this.difficulty !== null && this.difficulty !== other.difficulty)
      return false

    if (this.answer_type !== null && this.answer_type !== other.answer_type)
      return false

    return true
  }
}

// Filters are OR'd together
const DEFAULT_FILTERS = [
  new QuestionGroup(
    2,    // SAT
    0,    // English
    0,    // Craft & Structure
    0,    // Cross-Text Connections
    "E",  // Easy
    null  // any answer-type
  )
]

class Cell {
  constructor(text, question_group, rowspan=1) {
    this.question_group = question_group

    let classes = ['filter-cell']
    for (let level of ['difficulty', 'subdomain', 'domain', 'superdomain'])
      if (question_group[level] !== null) {
        classes.push(level)
        break
      }

    let children = null
    if (question_group.difficulty !== null)
      children = [
        DIV({}, null, [
          DIV({'class': 'answered-questions-count'}, "?"),
          DIV({'class': 'total-questions-count'}, this.get_total_count())
        ])
      ]

    this.element = ELEMENT('td',
      {
        'class': classes.join(' '),
        'selected': this.matches_filters(),
        'rowspan': rowspan
      },
      text,
      children,
      { 'click': this.click.bind(this) }
    )

    storage.when_set('filters', (_) => {
      /*
      Every cell's question-group specifies an exam. It is technically possible
      to mix questions from different exams, but the UI doesn't currently support
      this. So we just use the exam from the first filter-group.
      */
      this.question_group.exam = filter_grid.get_exam_index()

      this.element.setAttribute('selected', this.matches_filters())
    })
    storage.when_set('current_user', (_) => {
      this.element.setAttribute('selected', this.matches_filters())
    })
  }
  matches_filters() {
    /*
    Does this cell's question-group contain any of the current filter groups,
    Or do any of the current filter groups contain this cell's question-group
    */
    for (let group of FilterGrid.get_current_user_filters())
      if (this.question_group.contains(group) || group.contains(this.question_group))
        return true
    return false
  }
  get_answered_count() {
    /* How many answered questions are in this cell's question-group? */
    let matches = 0
    for (let uuid of Progress.get_current_user_answered()) {
      if (!question_viewer.uuid_to_question_map.has(uuid))
        continue

      let question = question_viewer.uuid_to_question_map.get(uuid)
      if (this.question_group.contains(question.group))
        matches += 1
    }
    return matches
  }
  update_answered_count() {
    let count = this.get_answered_count()
    this.element.children[0].children[0].textContent = (count === 0) ? "-" : count
  }
  get_total_count() {
    let exam_index = filter_grid.get_exam_index()
    let exam_short_name = EXAMS[exam_index].short_name
    let key_string = `(${exam_short_name}, '${this.question_group.difficulty}')`
    return QUESTION_COUNTS[this.question_group.subdomain][key_string]
  }
  update_total_count() {
    let count = this.get_total_count()
    this.element.children[0].children[1].textContent = count
  }
  click(e) {
    e.preventDefault()
    console.log(this.question_group)
    let groups = FilterGrid.get_current_user_filters()

    for (let [i, group] of enumerate(groups)) {
      if (JSON.stringify(group) === JSON.stringify(this.question_group)) {
        // we have clicked on an already-active cell
        if (e.ctrlKey) {
          groups.splice(i, 1)
          FilterGrid.set_current_user_filters(groups)
        }
        return
      }
    }

    // There is no group for this cell yet
    if (e.ctrlKey) {
      groups.push(this.question_group)
    } else {
      groups = [this.question_group]
    }
    FilterGrid.set_current_user_filters(groups)
  }
}

class FilterGrid {
  constructor() {
    console.log("FilterGrid: constructor")

    storage.when_set('users', (users) => {
      let filters = storage.get('filters')

      // if 'filters' has a user that 'users' doesn't -> delete user from filters
      for (let user of Object.keys(filters))
        if (!users.includes(user))
          delete filters[user]

      // if 'users' has a user that 'filters' doesn't -> add new user to filters
      for (let user of users)
        if (!(user in filters))
          filters[user] = DEFAULT_FILTERS

      storage.set('filters', filters)
    })

    storage.when_set("current_user", (_) => { this.update_answered_counts() })
    storage.when_set("answered", (_) => { this.update_answered_counts() })

    this.progress_cells = []
  }
  initialize() {
    console.log("FilterGrid: initialize")

    storage.initialize('filters', Object.fromEntries(
      storage.get("users").map(user => [user, DEFAULT_FILTERS])
    ))

    this.exam_filter = new ExamFilter()
    let rowspans = {}
    for (let row of CLASSIFICATIONS) {
      if (!(row.superdomain.name in rowspans)) rowspans[row.superdomain.name] = 0
      if (!(row.domain.name in rowspans)) rowspans[row.domain.name] = 0

      rowspans[row.superdomain.name] += 1
      rowspans[row.domain.name] += 1
    }

    let row_elements = []
    let exam = this.get_exam_index()
    for (let row of CLASSIFICATIONS) {
      let superdomain = row.superdomain.index
      let domain = row.domain.index
      let subdomain = row.subdomain.index

      let superdomain_cell = EMPTY_ELEMENT
      if (row.superdomain.name in rowspans) {
        superdomain_cell = new Cell(
          row.superdomain.name,
          new QuestionGroup(exam, superdomain),
          rowspans[row.superdomain.name]
        )
        delete rowspans[row.superdomain.name]
      }

      let domain_cell = EMPTY_ELEMENT
      if (row.domain.name in rowspans) {
        domain_cell = new Cell(
          row.domain.name,
          new QuestionGroup(exam, superdomain, domain),
          rowspans[row.domain.name]
        )
        delete rowspans[row.domain.name]
      }

      let subdomain_cell = new Cell(
        row.subdomain.name,
        new QuestionGroup(exam, superdomain, domain, subdomain)
      )

      let difficulty_cells = DIFFICULTIES.map(
        difficulty => new Cell(
          null,
          new QuestionGroup(exam, superdomain, domain, subdomain, difficulty)
        )
      )

      let row_element = ELEMENT("tr", null, null, [
        superdomain_cell, domain_cell, subdomain_cell, ...difficulty_cells
      ])
      row_elements.push(row_element)
      this.progress_cells.push(...difficulty_cells)
    }

    this.element = DIV(null, null, [
      ELEMENT("table", {"id":"grid"}, null, [
        ELEMENT("thead", null, null, [
          ELEMENT("tr", null, null, [
            ELEMENT("td", {"colspan":"3"}, null, [
              DIV({"class":"flex-row"}, null, [
                users,
                new AnswerTypeFilter(),
                this.exam_filter
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
    for (let cell of this.progress_cells) cell.update_answered_count()
  }
  update_total_counts() {
    for (let cell of this.progress_cells) cell.update_total_count()
  }
  get_exam_index() {
    return parseInt(this.exam_filter.element.value)
  }
  static get_current_user_filters() {
    let user = storage.get("current_user")
    let filters = storage.get("filters")
    return filters[user].map(QuestionGroup.from_json)
  }
  static get_current_user_first_filter_group() {
    let groups = FilterGrid.get_current_user_filters()
    if (groups.length === 0)
      return DEFAULT_FILTERS[0]
    return groups[0]
  }
  static set_current_user_filters(user_filters) {
    let user = storage.get("current_user")
    let filters = storage.get("filters")
    filters[user] = user_filters
    storage.set("filters", filters)
  }
  static any_group_contains(question_group) {
    for (let group of FilterGrid.get_current_user_filters())
      if (group.contains(question_group))
        return true
    return false
  }
}

class AnswerTypeFilter {
  constructor() {
    this.element = ELEMENT("select", {"id":"answer-type-select"}, null, [
      ELEMENT("option", {"value":"0"}, "MCQ"),
      ELEMENT("option", {"value":"1"}, "FRQ"),
      ELEMENT("option", {"value":"2"}, "MCQ | FRQ")
    ], {
      'change': this.change.bind(this)
    })
    this.element.value = AnswerTypeFilter.get_filter_index()

    storage.when_set("current_user", (_) => {
      this.element.value = AnswerTypeFilter.get_filter_index()
    })
  }
  change(e) {
    let index = parseInt(this.element.value)
    let groups = FilterGrid.get_current_user_filters()
    for (let group of groups)
      group.answer_type = (index === 2) ? null : ANSWER_TYPES[index]

    FilterGrid.set_current_user_filters(groups)
  }
  static get_filter_index() {
    return FilterGrid.get_current_user_first_filter_group().answer_type ?? 2
  }
}

class ExamFilter {
  constructor() {
    this.element = ELEMENT("select", {"id":"exam-select"}, null,
      EXAMS.map(exam => ELEMENT("option", {"value":exam.index}, exam.name)),
      {'change': this.change.bind(this)}
    )
    this.element.value = FilterGrid.get_current_user_first_filter_group().exam

    storage.when_set("current_user", (_) => {
      this.element.value = FilterGrid.get_current_user_first_filter_group().exam
    })
  }
  change(e) {
    let index = parseInt(this.element.value)
    let groups = FilterGrid.get_current_user_filters()
    for (let group of groups)
      group.exam = index

    FilterGrid.set_current_user_filters(groups)

    //This really should be handled by a when_set("filters"), but
    // currently when_set doesn't allow detecting changes to sub-objects;
    // We really only want to trigger this when storage.filters.exam changes
    filter_grid.update_answered_counts()
    filter_grid.update_total_counts()
  }
}
