'use strict';

class ControlPanel {
  initialize() {
    this.last_scroll_y = window.scrollY
    this.visible = (window.scrollY > 0)
    this.element = document.querySelector("#control-panel")
    this.toggle_state = true;

    this.toggle_elem = document.querySelector("#control-panel-toggle")
    this.toggle_elem.onclick = () => {
      this.toggle_state = !this.toggle_state;
      document.querySelector("#control-panel-columns").setAttribute("visible", this.toggle_state)
      this.toggle_elem.setAttribute("state", this.toggle_state)
    }

    document.onscroll = this.handle_scroll_event.bind(this)
  }

  handle_scroll_event() {
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
