class Migrate {
  constructor() {
    this.exam_shortnames = EXAMS.map(exam => exam.short_name)
  }
  uuid(uuid_original) {
    let prefix, hash = uuid_original.split("-")
    if (!this.exam_shortnames.includes(prefix))
      prefix = "SAT"

    return `${prefix}-${hash}`
  }
}
