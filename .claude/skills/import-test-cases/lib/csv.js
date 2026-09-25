/**
 * csv.js
 *
 * A small RFC 4180 CSV parser. No dependency is used because Node has no
 * built-in CSV parser and this reader only needs to produce a plain
 * `string[][]`, not a streaming API.
 *
 * Handles: quoted fields, the `""` escape for a literal quote inside a
 * quoted field, embedded newlines inside quoted fields (a "record" may span
 * more than one physical line), both CRLF and LF line endings, and a
 * leading UTF-8 byte-order mark. A genuinely empty physical line becomes an
 * empty record `[]` (not `['']`), so row indices stay aligned with
 * spreadsheet row numbers for the normaliser (see `normalise.js`). A `"`
 * that appears in a field after other characters is literal text, not a
 * quote (only a `"` as a field's first character opens a quoted field). A
 * quoted field left open at end of input throws rather than silently
 * swallowing the rest of the file.
 */

/**
 * Parse CSV text into an array of records, one `string[]` per record.
 * @param {string} text - Raw CSV file contents.
 * @returns {string[][]} One array of field values per record. `rows[0]` is
 *   the header row when the source has one.
 * @throws {Error} when a quoted field is still open at end of input.
 */
export function parseCsv(text) {
  let s = String(text ?? '');
  if (s.charCodeAt(0) === 0xfeff) {
    s = s.slice(1);
  }
  // Normalise line endings so the state machine only has to reason about `\n`.
  s = s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let quoteStartLine = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    // A physical line with no commas at all parses to a single empty
    // field; that is the signature of a blank line, so represent it as [].
    rows.push(row.length === 1 && row[0] === '' ? [] : row);
    row = [];
  };

  const len = s.length;
  let i = 0;
  while (i < len) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      if (c === '\n') {
        line += 1;
      }
      field += c;
      i += 1;
      continue;
    }
    // A `"` only opens a quoted field as the field's first character; a `"`
    // after other characters is literal text (for example `5" screen`).
    if (c === '"' && field === '') {
      inQuotes = true;
      quoteStartLine = line;
      i += 1;
      continue;
    }
    if (c === ',') {
      endField();
      i += 1;
      continue;
    }
    if (c === '\n') {
      endRecord();
      line += 1;
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (inQuotes) {
    throw new Error(`Unterminated quoted field starting on line ${quoteStartLine}`);
  }
  // A trailing newline already closed the last record above; only close a
  // final unterminated record here.
  if (field !== '' || row.length > 0) {
    endRecord();
  }
  return rows;
}
