'use strict';

const storage = new Storage()

function get_html_file(superdomain, domain) {
  return `SAT_${superdomain}_${domain}.html`
}

class Cell {
  constructor(superdomain, domain, subdomain, difficulty) {
    this.superdomain = superdomain
    this.domain = domain
    this.subdomain = subdomain
    this.difficulty = difficulty
    this.html_file = get_html_file(superdomain, domain)
    this.element = ELEMENT(
      "td",
      {"class":"answered-total"},
      this.get_total_answered_string(),
      null,
      {"click": this.click.bind(this)}
    )
    storage.when_set("current_user", (username) => {
      this.element.textContent = this.get_total_answered_string()
    })
    storage.when_set("answered", (answered) => {
      this.element.textContent = this.get_total_answered_string()
    })
  }
  get_total_answered() {
    let total = 0;
    for (let uuid of Progress.get_current_user_answered()) {
      if (!Question.check_uuid(uuid)) {
        console.warn(`user ${storage.get("current_user")} answered missing question ${uuid}`)
        continue
      }
      let question = new Question(uuid)
      if (question.subdomain_index === this.subdomain && question.difficulty == this.difficulty)
        total += 1
    }
    return total
  }
  get_total_answered_string() {
    let total = this.get_total_answered()
    return (total > 0) ? total : ""
  }
  click() {
    for (let [type, value] of Filters.get_checkbox_pairs(this.superdomain, this.domain))
      Filters.set_cached_checkbox_state(this.domain, type, value, false)

    Filters.set_cached_checkbox_state(this.domain, "difficulty", this.difficulty, true)
    Filters.set_cached_checkbox_state(this.domain, "subdomain_index", this.subdomain, true)
    location.href = this.html_file
  }
}

class Grid {
  constructor() {
    let rows = []
    for (let [superdomain, domains] of entries(TAXONOMY)) {
      let superdomain_rowspan = Object.values(domains).flat().length
      for (let [i, [domain, subdomains]] of enumerate(entries(domains))) {
        for (let [j, subdomain_index] of enumerate(subdomains)) {
          let row = ELEMENT("tr", null, null, [
            (i === 0 && j === 0) ? ELEMENT("td", {"rowspan": superdomain_rowspan}, superdomain) : EMPTY_ELEMENT,
            (j === 0) ?
              ELEMENT("td", {"rowspan": subdomains.length}, null, [
                ELEMENT("a", {"href": get_html_file(superdomain, domain)}, domain)
              ]) : EMPTY_ELEMENT,
            ELEMENT("td", null, SUBDOMAINS[subdomain_index]),
            ...DIFFICULTIES.map((difficulty) => {
              let cell = new Cell(superdomain, domain, subdomain_index, difficulty)
              return cell.element
            })
          ])
          rows.push(row)
        }
      }
    }

    this.element = ELEMENT("table", {"id": "grid"}, null, [
      ELEMENT("thead", null, null, [
        ELEMENT("tr", null, null, [
          ELEMENT("td", {"colspan": "3"}, null, [
            DIV({"id":"index-users"}, null, [
              (new UserSelect()).element,
              (new UserDelete()).element,
              (new UserInput()).element,
              (new UserAdd()).element,
            ])
          ]),
          ...DIFFICULTIES.map(d => ELEMENT("td", {"class":`difficulty-${d}`}))
        ])
      ]),
      ELEMENT("tbody", null, null, rows)
    ])
  }
}

window.onload = () => {
  storage.initialize()
  let grid = new Grid()
  document.querySelector("#content").appendChild(grid.element)
}
