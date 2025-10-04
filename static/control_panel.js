'use strict';

class ControlPanelToggle {
  constructor() {
    this.state = true
    this.element = DIV(
      {"id":"control-panel-toggle", "class":"button", "state":this.state},
      null,
      null,
      {'click': this.click.bind(this)}
    )
  }
  click() {
    this.state = !state
    ELEMENTS["control-panel-columns"].setAttribute("visible", this.toggle_state)
    this.element.setAttribute("state", this.state)
  }
}

class ControlPanel {
  constructor() {
    this.toggle_state = true

    this.last_scroll_y = window.scrollY ?? 0
    this.visible = (window.scrollY > 0)

    this.element = DIV({"id":"control-panel"}, null, [
      DIV({"id":"control-panel-top-row"}, null, [
        ELEMENT("a", {"id":"index-button", "class":"button","href":"index.html"}, "home"),
        DIV({"id":"domain"}, DOMAIN_KEY),
        DIV({"id":"questions-count"}, document.querySelector("#question-blocks").children.length),
        (new SelectedCount()).element,
        (new AnsweredCount()).element,
        (new ControlPanelToggle()).element
      ]),
      DIV({"id":"control-panel-columns"}, null, [
        DIV({"id":"control-panel-users"}, null, [
          DIV({"class":"flex-row"}, null, [
            (new UserSelect()).element,
            (new UserDelete()).element
          ]),
          DIV({"class":"flex-row"}, null, [
            (new UserInput()).element,
            (new UserAdd()).element
          ])
        ]),
        DIV({"id":"control-panel-difficulty"}, null,
          DIFFICULTIES.map((d) => {
            let id = `checkbox-${DOMAIN_KEY}-difficulty-${d}`
            return DIV({"class":"difficulty-filter"}, null, [
              ELEMENT("input", {"id":id, "type":"checkbox"}),
              ELEMENT("label", {"for":id, "class":`difficulty-rating difficulty-${d}`})
            ])
          })
        ),
        DIV({"id":"control-panel-subdomain"}, null, [
          DIV({"class":"flex-row center"}, null, [
            DIV({"id":"show-all-subdomains", "class":"button"}, "Show All Subdomains"),
            DIV({"id":"hide-all-subdomains", "class":"button"}, "Hide All Subdomains"),
          ]),
          ...TAXONOMY[SUPERDOMAIN_KEY][DOMAIN_KEY].map((subdomain_index) => {
            let id = `checkbox-${DOMAIN_KEY}-subdomain_index-${subdomain_index}`
            return DIV({"class":"subdomain-filter"}, null, [
              ELEMENT("input", {"id":id, "type":"checkbox"}),
              ELEMENT("label", {"for":id}, SUBDOMAINS[subdomain_index])
            ])
          })
        ])
      ])
    ])
    document.onscroll = this.scroll.bind(this)
  }
  scroll() {
    let diff_scroll_y = (window.scrollY - this.last_scroll_y)
    this.last_scroll_y = window.scrollY

    if (diff_scroll_y > 0) {
      if (!this.visible)
        return

      console.log("scroll down, hiding the panel")
      this.element.style.position = 'static'
      this.visible = false

    } else {
      if (this.visible)
        return

      console.log("scroll up, showing the panel")
      this.element.style.position = 'sticky'
      this.visible = true
    }
  }
}
