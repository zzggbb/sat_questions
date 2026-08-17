'use strict';

function migrate_uuids() {
  let EXAM_SHORTNAMES = EXAMS.map(exam => exam.short_name)

  function migrate_uuid(uuid_original) {
    let [prefix, hash] = uuid_original.split("-")
    if (!EXAM_SHORTNAMES.includes(prefix))
      prefix = "SAT"

    return `${prefix}-${hash}`
  }

  let answered = storage.get("answered")
  for (let user in answered) {
    for (let index in answered[user]) {
      answered[user][index] = migrate_uuid(answered[user][index])
    }
  }
  storage.set("answered", answered)
}

function migrate_filters() {
  storage.remove("filters")
}

/*
  To add a migration:
    * Append it to the END of this list
    * Bump the APPLICATION_VERSION number in `versions.js`
*/
const MIGRATIONS = [
  {
    'name': 'prefix uuids',
    'run': migrate_uuids
  },
  {
    'name': 'remove old keys',
    'run': () => {
      storage.remove("checkboxes")
      storage.remove("state")
      storage.remove("total_selected_questions")
    }
  },
  {
    'name': 'clear filters',
    'run': migrate_filters
  }
]

function apply_migrations() {
  let starting_application_version = storage.get("application_version", 0)

  if (starting_application_version == APPLICATION_VERSION) {
    console.log(`migrate: up to date, nothing to do`)
  } else {
    console.log(`migrate: migrating ${starting_application_version} -> ${APPLICATION_VERSION}`)
    for (let v = starting_application_version; v < APPLICATION_VERSION; v++) {
      let migration = MIGRATIONS[v]
      console.log(`migrate: running migration "${migration.name}"`)
      migration.run()
    }

    storage.set("application_version", APPLICATION_VERSION)
    console.log(`migrate: done, setting application_version to ${APPLICATION_VERSION}`)
  }
}
