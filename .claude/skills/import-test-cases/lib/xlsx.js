/**
 * xlsx.js
 *
 * Reads an XLSX workbook into the same `string[][]` shape `csv.js`
 * produces, so `normalise()` doesn't need to know which reader produced its
 * input. Uses `exceljs` (the only dependency this skill adds).
 */
import ExcelJS from 'exceljs';

/**
 * Render one cell's resolved value as text, matching how the same content
 * would appear in a CSV export: rich-text runs joined, a formula or
 * shared-formula cell's computed result (not the formula), a hyperlink's
 * display text, a Date at exactly midnight as `YYYY-MM-DD`, any other Date
 * as a full ISO string, and a number as its plain string form.
 * @param {*} value - An ExcelJS cell value.
 * @returns {string}
 */
export function cellToText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    const isMidnight =
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0;
    return isMidnight ? value.toISOString().slice(0, 10) : value.toISOString();
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map(run => run.text).join('');
    }
    if (value.hyperlink !== undefined) {
      return cellToText(value.text);
    }
    if (value.formula !== undefined || value.sharedFormula !== undefined) {
      return cellToText(value.result);
    }
    if (value.error !== undefined) {
      return String(value.error);
    }
    return String(value);
  }
  return String(value);
}

/**
 * Read an XLSX file (or its bytes) into `string[][]`, one array per sheet
 * row, aligned to the sheet's own row numbers (`rows[0]` is sheet row 1),
 * with trailing empty cells trimmed from each row.
 * @param {string|Buffer} source - A file path, or the file's bytes.
 * @param {{sheet?: string}} [options] - `sheet` selects a worksheet by
 *   name; omitted, the first worksheet is used.
 * @returns {Promise<string[][]>}
 */
export async function readXlsx(source, options = {}) {
  const { sheet } = options;
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(source)) {
    await workbook.xlsx.load(source);
  } else {
    await workbook.xlsx.readFile(source);
  }

  const worksheet = sheet ? workbook.getWorksheet(sheet) : workbook.worksheets[0];
  if (!worksheet) {
    if (sheet) {
      throw new Error(`Sheet not found: ${sheet}`);
    }
    return [];
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const values = row.values || []; // sparse, 1-based (index 0 unused)
    const cells = [];
    for (let c = 1; c < values.length; c += 1) {
      cells.push(cellToText(values[c]));
    }
    while (cells.length > 0 && cells[cells.length - 1] === '') {
      cells.pop();
    }
    rows[rowNumber - 1] = cells;
  });

  // Fill any gap left by `eachRow` skipping a row with no cell ever touched.
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i] === undefined) {
      rows[i] = [];
    }
  }
  return rows;
}
