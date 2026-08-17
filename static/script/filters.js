'use strict';

const CONTAINS = 0
const CONTAINED_BY = 1

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
  equals(other) {
    if (!(other instanceof QuestionGroup))
      throw new Error("other must be a QuestionGroup")

    for (let field of ['exam', 'superdomain', 'domain', 'subdomain', 'difficulty', 'answer_type'])
      if (this[field] !== other[field])
        return false

    return true
  }
  contains(other) {
    if (!(other instanceof QuestionGroup))
      throw new Error("other must be a QuestionGroup")

    for (let field of ['exam', 'superdomain', 'domain', 'subdomain', 'difficulty', 'answer_type'])
      if (this[field] !== null && this[field] !== other[field])
        return false

    return true
  }
  lowest_field() {
    for (let field of ['difficulty', 'subdomain', 'domain', 'superdomain'])
      if (this[field] !== null)
        return field
  }
  expand() {
    /* Only used by cell question-groups, so:
       * exam is null
       * superdomain is always set
       * domain, subdomain, difficulty may be set
       * answer_type is unset
    */
    let subgroups = []
    for (let {superdomain, domain, subdomain} of CLASSIFICATIONS) {
      for (let difficulty of DIFFICULTIES) {
        let group = new QuestionGroup(null, superdomain.index, domain.index, subdomain.index, difficulty)
        if (this.contains(group))
          subgroups.push(group)
      }
    }
    return subgroups
  }
}

class UserFilters {
  constructor(answer_type, exam, groups) {
    this.answer_type = answer_type
    this.exam = exam
    this.groups = groups
  }
  static default() {
    return new UserFilters(
      null,
      2,
      [
        new QuestionGroup(null, 0, 0, 0, "E", null)
      ]
    )
  }
  static from_json(json) {
    return new UserFilters(
      json['answer_type'],
      json['exam'],
      json['groups'].map(QuestionGroup.from_json)
    )
  }
  match(question_group, mode) {
    /*
    mode=CONTAINS: Returns true if any group in this filter contains question_group
    mode=CONTAINED_BY: Returns true if any group in this filter is contained by question_group
    */
    if (!(question_group instanceof QuestionGroup))
      throw new Error("question_group must be a QuestionGroup")

    for (let i_group of this.groups) {
      i_group.answer_type = this.answer_type
      i_group.exam = this.exam

      if (mode === CONTAINS && i_group.contains(question_group))
        return true
      if (mode === CONTAINED_BY && question_group.contains(i_group))
        return true
    }

    return false
  }
}

class Cell {
  constructor(text, question_group, rowspan=1) {
    this.question_group = question_group

    let classes = ['filter-cell', question_group.lowest_field()]
    let child = (question_group.difficulty === null) ?
      EMPTY_ELEMENT :
      DIV(null, null, [
        DIV({'class': 'answered-questions-count'}, "?"),
        DIV({'class': 'total-questions-count'}, this.get_total_count())
      ])

    this.element = ELEMENT('td',
      {
        'class': classes.join(' '),
        'selected': this.matches_filters(),
        'rowspan': rowspan
      },
      text,
      [child],
      { 'click': this.click.bind(this) }
    )

    storage.when_set('filters', () => {
      this.element.setAttribute('selected', this.matches_filters())
    })
    storage.when_set('current_user', () => {
      this.element.setAttribute('selected', this.matches_filters())
    })
  }
  matches_filters() {
    // Are any of the current filter groups contained by this cell's question-group?
    return FilterGrid.get_filters().match(this.question_group, CONTAINED_BY)
  }
  get_answered_count() {
    /* How many answered questions are in this cell's question-group? */
    let matches = 0
    let exam = FilterGrid.get_filters().exam

    for (let uuid of Progress.get_current_user_answered()) {
      if (!question_viewer.uuid_to_question_map.has(uuid))
        continue

      let question = question_viewer.uuid_to_question_map.get(uuid)
      if (this.question_group.contains(question.group) && question.group.exam == exam)
        matches += 1
    }
    return matches
  }
  update_answered_count() {
    let count = this.get_answered_count()
    this.element.children[0].children[0].textContent = (count === 0) ? "-" : count
  }
  get_total_count() {
    let exam_index = FilterGrid.get_filters().exam
    let exam_short_name = EXAMS[exam_index].short_name
    let key_string = `(${exam_short_name}, '${this.question_group.difficulty}')`
    return QUESTION_COUNTS[this.question_group.subdomain][key_string]
  }
  update_total_count() {
    let count = this.get_total_count()
    this.element.children[0].children[1].textContent = count
  }
  click(event) {
    event.preventDefault()
    console.log(this.question_group)
    let filters = FilterGrid.get_filters()
    let subgroups = this.question_group.expand()

    if (event.ctrlKey) {
      if (this.matches_filters()) {
        /* Copy over all groups in filters.groups that aren't a subgroup of this cell's question-group */
        let new_groups = []
        for (let candidate_group of filters.groups)
          if (!this.question_group.contains(candidate_group))
            new_groups.push(candidate_group)
        filters.groups = new_groups
      }
      else {
        /* Add all subgroups of this cell's question-group to groups */
        for (let subgroup of subgroups)
          filters.groups.push(subgroup)
      }
    } else {
      /* Set filters.groups to all subgroups of this.question_group */
      filters.groups = subgroups
    }

    FilterGrid.set_filters(filters)
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
          filters[user] = UserFilters.default()

      storage.set('filters', filters)
    })

    storage.when_set("current_user", (_) => { this.update_answered_counts() })
    storage.when_set("answered", (_) => { this.update_answered_counts() })

    this.progress_cells = []
  }
  initialize() {
    console.log("FilterGrid: initialize")

    storage.initialize('filters', Object.fromEntries(
      storage.get("users").map(user => [user, UserFilters.default()])
    ))

    let rowspans = {}
    for (let row of CLASSIFICATIONS) {
      if (!(row.superdomain.name in rowspans)) rowspans[row.superdomain.name] = 0
      if (!(row.domain.name in rowspans)) rowspans[row.domain.name] = 0

      rowspans[row.superdomain.name] += 1
      rowspans[row.domain.name] += 1
    }

    let row_elements = []
    for (let row of CLASSIFICATIONS) {
      let superdomain = row.superdomain.index
      let domain = row.domain.index
      let subdomain = row.subdomain.index

      let superdomain_cell = EMPTY_ELEMENT
      if (row.superdomain.name in rowspans) {
        superdomain_cell = new Cell(
          row.superdomain.name,
          new QuestionGroup(null, superdomain),
          rowspans[row.superdomain.name]
        )
        delete rowspans[row.superdomain.name]
      }

      let domain_cell = EMPTY_ELEMENT
      if (row.domain.name in rowspans) {
        domain_cell = new Cell(
          row.domain.name,
          new QuestionGroup(null, superdomain, domain),
          rowspans[row.domain.name]
        )
        delete rowspans[row.domain.name]
      }

      let subdomain_cell = new Cell(
        row.subdomain.name,
        new QuestionGroup(null, superdomain, domain, subdomain)
      )

      let difficulty_cells = DIFFICULTIES.map(
        difficulty => new Cell(
          null,
          new QuestionGroup(null, superdomain, domain, subdomain, difficulty)
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
                new ExamFilter()
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
  static get_filters() {
    let user = storage.get("current_user")
    let filters = storage.get("filters")
    return UserFilters.from_json(filters[user])
  }
  static set_filters(user_filters) {
    let user = storage.get("current_user")
    let filters = storage.get("filters")
    filters[user] = user_filters
    storage.set("filters", filters)
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
  change(event) {
    let index = parseInt(this.element.value)
    let filters = FilterGrid.get_filters()
    filters.answer_type = (index === 2) ? null : ANSWER_TYPES[index]
    FilterGrid.set_filters(filters)
  }
  static get_filter_index() {
    return FilterGrid.get_filters().answer_type ?? 2
  }
}

class ExamFilter {
  constructor() {
    this.element = ELEMENT("select", {"id":"exam-select"}, null,
      EXAMS.map(exam => ELEMENT("option", {"value":exam.index}, exam.name)),
      {'change': this.change.bind(this)}
    )
    this.element.value = FilterGrid.get_filters().exam

    storage.when_set("current_user", (_) => {
      this.element.value = FilterGrid.get_filters().exam
    })
  }
  change(event) {
    let index = parseInt(this.element.value)
    let filters = FilterGrid.get_filters()
    filters.exam = index
    FilterGrid.set_filters(filters)

    //This really should be handled by a when_set("filters"), but
    // currently when_set doesn't allow detecting changes to sub-objects;
    // We really only want to trigger this when storage.filters.exam changes
    filter_grid.update_answered_counts()
    filter_grid.update_total_counts()
  }
}
