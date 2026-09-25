import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { parseCsv } from '../../.claude/skills/import-test-cases/lib/csv.js';
import { readXlsx, cellToText } from '../../.claude/skills/import-test-cases/lib/xlsx.js';
import { proposeMap } from '../../.claude/skills/import-test-cases/lib/propose-map.js';
import { normalise } from '../../.claude/skills/import-test-cases/lib/normalise.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'import');

test('readXlsx + normalise matches parseCsv + normalise for the Boost fixture', async () => {
  const csvText = fs.readFileSync(path.join(fixturesDir, 'boost-format.csv'), 'utf8');
  const csvRows = parseCsv(csvText);
  const { column_map } = proposeMap(csvRows[0]);

  const xlsxRows = await readXlsx(path.join(fixturesDir, 'boost-format.xlsx'));

  const fromCsv = normalise(csvRows, column_map);
  const fromXlsx = normalise(xlsxRows, column_map);

  assert.ok(fromCsv.length >= 3);
  assert.deepEqual(fromXlsx, fromCsv);
});

test('readXlsx accepts a Buffer as well as a file path', async () => {
  const buffer = fs.readFileSync(path.join(fixturesDir, 'boost-format.xlsx'));
  const rows = await readXlsx(buffer);
  assert.equal(rows[0][0], 'Test Case ID');
});

test('readXlsx cell text conversion', async t => {
  async function readOneRow(configureSheet) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');
    configureSheet(sheet);
    const buffer = await workbook.xlsx.writeBuffer();
    const rows = await readXlsx(Buffer.from(buffer));
    return rows[1]; // row 2, since row 1 is the header we add below
  }

  await t.test('joins rich text runs into plain text', async () => {
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header']);
      sheet.addRow([{ richText: [{ text: 'Hello, ' }, { text: 'world' }] }]);
    });
    assert.deepEqual(row, ['Hello, world']);
  });

  await t.test('uses a formula cell\'s computed result, not the formula text', async () => {
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header']);
      sheet.addRow([{ formula: 'A1', result: 'computed value' }]);
    });
    assert.deepEqual(row, ['computed value']);
  });

  await t.test('cellToText treats a sharedFormula cell like a formula cell', () => {
    assert.equal(cellToText({ sharedFormula: 'D2', result: 3 }), '3');
  });

  await t.test('uses a hyperlink cell\'s display text', async () => {
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header']);
      sheet.addRow([{ text: 'Boost site', hyperlink: 'https://www.boost.org' }]);
    });
    assert.deepEqual(row, ['Boost site']);
  });

  await t.test('renders a midnight Date as a plain YYYY-MM-DD string', async () => {
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header']);
      sheet.addRow([new Date(Date.UTC(2026, 0, 15, 0, 0, 0, 0))]);
    });
    assert.deepEqual(row, ['2026-01-15']);
  });

  await t.test('renders a non-midnight Date as a full ISO string', async () => {
    const when = new Date(Date.UTC(2026, 0, 15, 13, 30, 0, 0));
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header']);
      sheet.addRow([when]);
    });
    assert.deepEqual(row, [when.toISOString()]);
  });

  await t.test('renders a number as its plain string form', async () => {
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header']);
      sheet.addRow([42]);
    });
    assert.deepEqual(row, ['42']);
  });

  await t.test('trims trailing empty cells from a row', async () => {
    const row = await readOneRow(sheet => {
      sheet.addRow(['Header', 'H2', 'H3']);
      sheet.addRow(['value', '', '']);
    });
    assert.deepEqual(row, ['value']);
  });
});

test('readXlsx honours the sheet option to select a non-first worksheet', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('First').addRow(['from first sheet']);
  workbook.addWorksheet('Second').addRow(['from second sheet']);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  const firstRows = await readXlsx(buffer);
  const secondRows = await readXlsx(buffer, { sheet: 'Second' });

  assert.deepEqual(firstRows[0], ['from first sheet']);
  assert.deepEqual(secondRows[0], ['from second sheet']);
});
