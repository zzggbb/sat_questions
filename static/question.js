'use strict';

class Question {
  constructor(question_uuid) {
    let attribute_values = QUESTION_METADATA_MAP.rows[question_uuid]
    for (let [i, attribute_name] of QUESTION_METADATA_MAP.columns.entries()) {
      this[attribute_name] = attribute_values[i]
    }
  }
  static check_uuid(question_uuid) {
    return question_uuid in QUESTION_METADATA_MAP.rows
  }
}
