#!/usr/bin/env node
/**
 * import.js
 *
 * The `/import-test-cases` CLI: wires the readers, format detection,
 * normaliser, and checks in `lib/` into the commands the skill's steps run.
 * `SKILL.md` gives the step each command belongs to.
 *
 * Usage: node .claude/skills/import-test-cases/import.js <command> [options]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCsv } from './lib/csv.js';
import { readXlsx } from './lib/xlsx.js';
import { FORMATS, detectFormat } from './lib/formats.js';
import { proposeMap } from './lib/propose-map.js';
import { normalise } from './lib/normalise.js';
import { validate } from './lib/validate.js';
import { renderReport } from './lib/report.js';
import { reconcile } from './lib/reconcile.js';
import { collectUsedIds, nextId, assignIds } from './lib/ids.js';
import { collectTests } from '../../../scripts/coverage-map.js';

const __filename = fileURLToPath(import.meta.url);

const DEFAULT_CASES_PATH = path.join('docs', 'client-test-cases', 'cases.json');
const DEFAULT_COVERAGE_PATH = path.join('docs', 'coverage-map.md');

const IMPORT_STATE_KEYS = [
  'bucket',
  'reason',
  'probe',
  'stale',
  'covered_by',
  'test_case_id',
  'story',
  'issue',
  'test',
];

const USAGE = 'Usage: import.js <normalise|validate|report|reconcile|next-id|assign-ids> [options]';

/** Print a usage/error message to stderr and exit (default: usage error). */
function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

/**
 * Minimal argv parser: positional args go to `_`; `--flag value` pairs (and
 * bare `--flag` booleans, when the next token is itself a flag or absent)
 * go to `flags`.
 * @param {string[]} argv
 * @returns {{_: string[], flags: Record<string, string|true>}}
 */
function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args.flags[key] = next;
        i += 1;
      } else {
        args.flags[key] = true;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

/**
 * Read a spreadsheet file into `string[][]` rows, by extension.
 * @param {string} file
 * @param {string|undefined} sheet
 * @returns {Promise<string[][]>}
 */
async function readFileRows(file, sheet) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.csv') {
    return parseCsv(fs.readFileSync(file, 'utf8'));
  }
  if (ext === '.xlsx') {
    return readXlsx(file, sheet ? { sheet } : {});
  }
  fail(`Unsupported file format "${ext}". Supported formats: .csv, .xlsx`);
  return [];
}

/** Load and parse a JSON file, failing with a usage error when it's missing. */
function readJsonFile(filePath) {
  if (typeof filePath !== 'string' || !fs.existsSync(filePath)) {
    fail(`File not found: ${filePath}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function casesPathFrom(args) {
  return typeof args.flags.cases === 'string' ? args.flags.cases : DEFAULT_CASES_PATH;
}

function loadCasesFile(args) {
  const casesPath = casesPathFrom(args);
  const doc = readJsonFile(casesPath);
  return { casesPath, doc };
}

/**
 * `normalise <file> --preview|--write ...`
 */
async function cmdNormalise(args) {
  const file = args._[1];
  const preview = args.flags.preview === true;
  const write = args.flags.write === true;
  if (!file || (!preview && !write)) {
    fail('Usage: import.js normalise <file> --preview|--write [--format <name>] [--map <column-map.json>] [--out <path>] [--sheet <name>]');
  }

  let mapFromFile = null;
  if (write) {
    const mapArg = args.flags.map;
    if (typeof mapArg !== 'string' || !fs.existsSync(mapArg)) {
      fail('normalise --write requires --map <column-map.json>, and the file must exist');
    }
    mapFromFile = readJsonFile(mapArg);
  } else if (typeof args.flags.map === 'string') {
    mapFromFile = readJsonFile(args.flags.map);
  }

  if (!fs.existsSync(file)) {
    fail(`File not found: ${file}`);
  }

  const sheet = typeof args.flags.sheet === 'string' ? args.flags.sheet : undefined;
  const rows = await readFileRows(file, sheet);
  const headers = rows[0] || [];

  let format;
  let column_map;
  let unmapped = [];

  if (mapFromFile) {
    format = mapFromFile.format;
    column_map = mapFromFile.column_map;
  } else if (typeof args.flags.format === 'string') {
    const found = FORMATS.find(f => f.name === args.flags.format);
    if (!found) {
      fail(`Unknown format "${args.flags.format}". Known formats: ${FORMATS.map(f => f.name).join(', ')}`);
    }
    format = found.name;
    column_map = found.column_map;
  } else {
    const detected = detectFormat(headers);
    if (detected) {
      format = detected.name;
      column_map = detected.column_map;
    } else {
      const proposed = proposeMap(headers);
      format = 'proposed';
      column_map = proposed.column_map;
      unmapped = proposed.unmapped;
    }
  }

  const cases = normalise(rows, column_map);

  if (preview) {
    console.log(`Format: ${format}`);
    console.log(`Case count: ${cases.length}`);
    console.log('Column map:');
    console.log(JSON.stringify(column_map, null, 2));
    console.log(`Unmapped headers: ${unmapped.length ? unmapped.join(', ') : 'none'}`);
    console.log('First 3 cases:');
    console.log(JSON.stringify(cases.slice(0, 3), null, 2));
    const confirmedMap = { format, column_map, confirmed_at: new Date().toISOString() };
    console.log('column-map.json:');
    console.log(JSON.stringify(confirmedMap, null, 2));
    return;
  }

  // --write
  const outPath = typeof args.flags.out === 'string' ? args.flags.out : DEFAULT_CASES_PATH;
  const fileBytes = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(fileBytes).digest('hex');

  if (fs.existsSync(outPath)) {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (existing.sha256 === sha256) {
      console.log(`cases.json reused (sha256 unchanged): ${outPath}`);
      return;
    }
    fail(
      `Refusing to overwrite ${outPath}: its sha256 does not match ${file}. ` +
        'Re-import is out of scope; ask for a fresh file name instead.',
      3,
    );
  }

  const emptyImportState = Object.fromEntries(IMPORT_STATE_KEYS.map(key => [key, null]));
  const casesWithState = cases.map(c => ({ ...c, import: { ...emptyImportState } }));

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const doc = {
    source_file: path.relative(process.cwd(), file),
    sha256,
    format,
    column_map,
    imported_at: new Date().toISOString(),
    cases: casesWithState,
  };
  fs.writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`);
  console.log(`Wrote ${outPath} (${casesWithState.length} cases).`);
}

/** `validate [--cases <path>]` */
function cmdValidate(args) {
  const { doc } = loadCasesFile(args);
  const result = validate(doc.cases ?? []);
  if (result.ok) {
    console.log('OK: all cases valid.');
    return;
  }
  for (const error of result.errors) {
    console.error(error);
  }
  process.exit(1);
}

/** `report [--cases <path>]` */
function cmdReport(args) {
  const { doc } = loadCasesFile(args);
  console.log(renderReport(doc));
}

/** `reconcile --issues <file> --tests <file> [--cases <path>]` */
function cmdReconcile(args) {
  if (typeof args.flags.issues !== 'string') {
    fail('reconcile requires --issues <gh json file>');
  }
  if (typeof args.flags.tests !== 'string') {
    fail('reconcile requires --tests <playwright --list json file>');
  }
  const issues = readJsonFile(args.flags.issues);
  const testsReport = readJsonFile(args.flags.tests);
  const { doc } = loadCasesFile(args);
  const coverageTests = collectTests(testsReport);
  const result = reconcile(doc, issues, coverageTests);
  console.log(JSON.stringify(result.counts, null, 2));
  for (const error of result.errors) {
    console.error(error);
  }
  if (!result.ok) {
    process.exit(1);
  }
}

/** Gather the texts `collectUsedIds` scans, per `next-id`/`assign-ids`. */
function collectUsed(args) {
  const casesPath = casesPathFrom(args);
  const coveragePath = typeof args.flags.coverage === 'string' ? args.flags.coverage : DEFAULT_COVERAGE_PATH;
  const texts = [];

  if (fs.existsSync(coveragePath)) {
    texts.push(fs.readFileSync(coveragePath, 'utf8'));
  }

  let doc = null;
  if (fs.existsSync(casesPath)) {
    const casesText = fs.readFileSync(casesPath, 'utf8');
    texts.push(casesText);
    doc = JSON.parse(casesText);
  }

  if (typeof args.flags.issues === 'string' && fs.existsSync(args.flags.issues)) {
    const issues = JSON.parse(fs.readFileSync(args.flags.issues, 'utf8'));
    for (const issue of issues) {
      texts.push(issue.title ?? '');
    }
  }

  return { used: collectUsedIds({ texts }), casesPath, doc };
}

/** `next-id <AREA> [--cases <path>] [--coverage <path>] [--issues <file>]` */
function cmdNextId(args) {
  const area = args._[1];
  if (!area) {
    fail('Usage: import.js next-id <AREA> [--cases <path>] [--coverage <path>] [--issues <file>]');
  }
  const { used } = collectUsed(args);
  console.log(nextId(area, used));
}

/** `assign-ids [--cases <path>] [--coverage <path>] [--issues <file>]` */
function cmdAssignIds(args) {
  const { used, casesPath, doc } = collectUsed(args);
  if (!doc) {
    fail(`File not found: ${casesPath}`);
  }
  const before = doc.cases.map(c => c.import?.test_case_id ?? null);
  const updatedCases = assignIds(doc.cases, used);
  updatedCases.forEach((c, i) => {
    if (before[i] === null && c.import.test_case_id !== null) {
      console.log(`${c.client_id} -> ${c.import.test_case_id}`);
    }
  });
  fs.writeFileSync(casesPath, `${JSON.stringify({ ...doc, cases: updatedCases }, null, 2)}\n`);
}

const COMMANDS = {
  normalise: cmdNormalise,
  validate: cmdValidate,
  report: cmdReport,
  reconcile: cmdReconcile,
  'next-id': cmdNextId,
  'assign-ids': cmdAssignIds,
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const handler = COMMANDS[args._[0]];
  if (!handler) {
    fail(USAGE);
    return;
  }
  await handler(args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch(err => {
    console.error(err.stack || String(err));
    process.exit(1);
  });
}
