'use strict';
const EXAM_SHORTNAMES = EXAMS.map(exam => exam.short_name)

class Migrate {
  static fix_uuid(uuid_original) {
    let [prefix, hash] = uuid_original.split("-")
    if (!EXAM_SHORTNAMES.includes(prefix))
      prefix = "SAT"

    return `${prefix}-${hash}`
  }
  static fix_uuids() {
    let answered = storage.get("answered")
    for (let user in answered) {
      for (let index in answered[user]) {
        answered[user][index] = Migrate.fix_uuid(answered[user][index])
      }
    }
    storage.set("answered", answered)
  }
  static fix_filters_superdomains() {
    let filters = storage.get("filters")
    for (let user in filters) {
      if ("superdomain" in filters[user]) {
        let old_superdomain = filters[user]["superdomain"]
        filters[user]["superdomains"] = [old_superdomain]
        delete filters[user]["superdomain"]
      }
    }
    storage.set("filters", filters)
  }
}
