/**
 * propose-map.js
 *
 * Proposes a column map for a spreadsheet that doesn't match one of the
 * built-in formats in `formats.js`, from a table of header synonyms. Never
 * used without a human confirming or correcting the result first.
 */

/**
 * Synonyms for each normalised field, matched case/space/punctuation
 * insensitively (see `normaliseHeader`). Order within a field's list
 * doesn't matter; first-matching-field-in-header-order wins when a header
 * could plausibly match more than one already-unfilled field.
 * @type {Record<string, string[]>}
 */
const SYNONYMS = {
  client_id: ['test case id', 'testcaseid', 'id', 'tcid', 'case id', 'key', 'test case key'],
  title: ['test case name', 'title', 'name', 'summary', 'test summary'],
  objective: ['test objective', 'objective', 'description', 'purpose'],
  preconditions: ['preconditions', 'precondition', 'prerequisites', 'setup'],
  steps: ['test steps', 'steps', 'step', 'action', 'step description'],
  expected: ['expected result', 'expected results', 'expected', 'result'],
  section: ['section', 'module', 'folder', 'component', 'category'],
  priority: ['priority', 'test priority'],
  notes: ['notes/comments', 'notes', 'comments', 'remarks'],
};

/**
 * Normalise a header for case/space/punctuation-insensitive comparison:
 * lower-cased, with runs of non-alphanumeric characters collapsed to a
 * single space and trimmed.
 * @param {string} header
 * @returns {string}
 */
function normaliseHeader(header) {
  return (header ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Propose a column map from a header row, using the synonym table above.
 * @param {string[]} headers
 * @returns {{column_map: object, unmapped: string[]}}
 */
export function proposeMap(headers) {
  const column_map = {
    client_id: null,
    title: null,
    objective: null,
    preconditions: null,
    steps: null,
    expected: null,
    section: null,
    priority: null,
    notes: null,
  };
  const unmapped = [];

  for (const header of headers || []) {
    const trimmed = (header ?? '').trim();
    if (trimmed === '') {
      continue; // Ignore empty (trailing) header columns.
    }
    const normalised = normaliseHeader(trimmed);
    let matchedField = null;
    for (const [field, synonyms] of Object.entries(SYNONYMS)) {
      if (column_map[field] !== null) {
        continue; // Already mapped; a later header matching only this field is unmapped.
      }
      if (synonyms.some(synonym => normaliseHeader(synonym) === normalised)) {
        matchedField = field;
        break;
      }
    }
    if (matchedField) {
      column_map[matchedField] = trimmed;
    } else {
      unmapped.push(trimmed);
    }
  }

  return { column_map, unmapped };
}
