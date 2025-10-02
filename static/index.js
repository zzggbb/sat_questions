'use strict';

const storage = new Storage()
const progress = new Progress()
window.onload = () => {
  console.log("index.js loaded")

  storage.initialize()

  progress.initialize_user_select()
  progress.initialize_username_input()
  progress.initialize_answered_grid()
  progress.update_answered_grid_totals_DOM()
}
