class ControlPanel {
  initialize() {
    this.last_scroll_y = window.scrollY
    this.visible = (window.scrollY > 0)
    this.element = document.querySelector("#control-panel")

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
