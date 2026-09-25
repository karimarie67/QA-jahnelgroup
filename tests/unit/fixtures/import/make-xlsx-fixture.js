#!/usr/bin/env node
/**
 * make-xlsx-fixture.js
 *
 * Regenerates `boost-format.xlsx` from `boost-format.csv`, so the two
 * fixtures always hold the same content: one sheet, the same rows and
 * cells (as plain strings, including embedded newlines), built with
 * `exceljs` (this skill's one dependency).
 *
 * Usage: node tests/unit/fixtures/import/make-xlsx-fixture.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { parseCsv } from '../../../../.claude/skills/import-test-cases/lib/csv.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, 'boost-format.csv');
const xlsxPath = path.join(__dirname, 'boost-format.xlsx');

const csvText = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvText);

const workbook = new ExcelJS.Workbook();
const worksheet = workbook.addWorksheet('Sheet1');
for (const row of rows) {
  worksheet.addRow(row);
}

await workbook.xlsx.writeFile(xlsxPath);
console.log(`Wrote ${xlsxPath} (${rows.length} rows) from ${csvPath}`);
