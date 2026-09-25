/**
 * normalise.js
 *
 * Turns raw spreadsheet rows plus a confirmed column map into the shared
 * normalised case shape (see the `normalise()` JSDoc below for its exact
 * fields). Pure: no I/O, no knowledge of CSV vs XLSX.
 */

const SCALAR_FIELDS = [
  'client_id',
  'title',
  'objective',
  'preconditions',
  'section',
  'priority',
  'notes',
];
const ARRAY_FIELDS = ['steps', 'expected'];

/**
 * Split a steps/expected cell into individual items.
 *
 * A cell holding numbered lines (`1. Do this` / `2) Do that`, one per
 * physical line) is split into one item per number, with the number prefix
 * removed and each item trimmed; empty items are dropped. A cell with no
 * numbering is returned as a single-item array. `null`/empty input returns
 * `[]`.
 * @param {string|null} text
 * @returns {string[]}
 */
export function splitNumbered(text) {
  if (text === null || text === undefined) {
    return [];
  }
  const s = String(text);
  const marker = /^\s*\d+[.)]\s/m;
  if (!marker.test(s)) {
    const trimmed = s.trim();
    return trimmed === '' ? [] : [trimmed];
  }
  return s
    .split(marker)
    .map(item => item.trim())
    .filter(item => item !== '');
}

/**
 * Build a header-name -> column-index lookup, matching case-insensitively
 * (trimmed, lowercased), and ignoring empty (trailing) header columns. When
 * a header name repeats, the first occurrence wins.
 * @param {string[]} headerRow
 * @returns {Record<string, number>}
 */
function buildHeaderIndex(headerRow) {
  const index = {};
  (headerRow || []).forEach((header, i) => {
    const trimmed = (header ?? '').trim();
    const key = trimmed.toLowerCase();
    if (trimmed !== '' && !(key in index)) {
      index[key] = i;
    }
  });
  return index;
}

/**
 * Read a single mapped cell from a row, trimmed, `null` when absent, unmapped,
 * or empty. The column map's header name is matched against the header row
 * case-insensitively (trimmed, lowercased), same as `buildHeaderIndex`.
 * @param {string[]} row
 * @param {Record<string, number>} headerIndex
 * @param {string|null} headerName
 * @returns {string|null}
 */
function readCell(row, headerIndex, headerName) {
  if (!headerName) {
    return null;
  }
  const idx = headerIndex[headerName.trim().toLowerCase()];
  if (idx === undefined) {
    return null;
  }
  const value = row[idx];
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Normalise raw spreadsheet rows into the shared case shape: `client_id`,
 * `title`, `objective`, `preconditions`, `steps` (string[]), `expected`
 * (string[]), `section`, `priority`, `notes`, and `source_row`.
 *
 * `rows[0]` is treated as the header row. A row continues the case above
 * it — its mapped steps cell adds steps, and its mapped expected cell adds
 * expected results, independently of one another — in either of two cases:
 * its mapped `client_id` cell is empty, or its mapped `client_id` cell
 * repeats the current case's client_id while its mapped `title` cell is
 * empty. The second form is the layout some tools use for a case's step
 * rows (for example Xray's Test Case Importer, which repeats the TCID on
 * every step row), and is also how a merged ID cell reads back from XLSX.
 * A row with no non-empty mapped cell at all is skipped. A continuation row
 * before any case has started is ignored.
 * @param {string[][]} rows
 * @param {object} columnMap - maps each normalised field name to the header
 *   text of the column that holds it, or `null` when the source has no such
 *   column.
 * @returns {object[]} NormalisedCase[]
 */
export function normalise(rows, columnMap) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }
  const headerIndex = buildHeaderIndex(rows[0]);
  const cases = [];
  let current = null;

  for (let r = 1; r < rows.length; r += 1) {
    const row = rows[r] || [];
    const cell = field => readCell(row, headerIndex, columnMap[field]);

    const anyMappedNonEmpty = [...SCALAR_FIELDS, ...ARRAY_FIELDS].some(
      field => cell(field) !== null,
    );
    if (!anyMappedNonEmpty) {
      continue; // Fully empty row (with respect to mapped columns): skipped.
    }

    const clientId = cell('client_id');
    const continuesCurrentId = clientId !== null && current !== null && clientId === current.client_id && cell('title') === null;

    if (clientId !== null && !continuesCurrentId) {
      const stepsCell = cell('steps');
      const expectedCell = cell('expected');
      current = {
        client_id: clientId,
        title: cell('title'),
        objective: cell('objective'),
        preconditions: cell('preconditions'),
        steps: stepsCell !== null ? splitNumbered(stepsCell) : [],
        expected: expectedCell !== null ? splitNumbered(expectedCell) : [],
        section: cell('section'),
        priority: cell('priority'),
        notes: cell('notes'),
        source_row: r + 1,
      };
      cases.push(current);
      continue;
    }

    if (!current) {
      continue; // A continuation row before any case has started is ignored.
    }
    const stepsCell = cell('steps');
    const expectedCell = cell('expected');
    if (stepsCell !== null) {
      current.steps.push(...splitNumbered(stepsCell));
    }
    if (expectedCell !== null) {
      current.expected.push(...splitNumbered(expectedCell));
    }
  }

  return cases;
}
