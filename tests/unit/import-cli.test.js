import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Wiring-level tests for the CLI: each command is exercised as a spawned
// process, against fixture files copied into a fresh temp directory, so
// nothing here touches the real repo working tree. See
// `tests/unit/import-*.test.js` for exhaustive coverage of the underlying
// lib functions; these tests cover only how the CLI wires them together
// how the CLI wires them together.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CLI_PATH = path.join(repoRoot, '.claude', 'skills', 'import-test-cases', 'import.js');
const FIXTURES_DIR = path.join(repoRoot, 'tests', 'unit', 'fixtures', 'import');

/** Spawn the CLI with `cwd` set inside a fixture-populated temp directory. */
function run(args, cwd) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], { cwd, encoding: 'utf8' });
}

/** A fresh, empty directory for one test. */
function freshDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'import-cli-'));
}

function sha256Of(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

/** Pull the `column-map.json:` blob a preview prints (always its last output). */
function extractColumnMapJson(stdout) {
  const marker = 'column-map.json:\n';
  const idx = stdout.indexOf(marker);
  assert.notEqual(idx, -1, 'preview output should include the column-map.json marker');
  return JSON.parse(stdout.slice(idx + marker.length).trim());
}

function extractCaseCount(stdout) {
  const match = stdout.match(/Case count: (\d+)/);
  assert.ok(match, 'preview output should include a case count');
  return Number(match[1]);
}

const emptyImportState = {
  bucket: null,
  reason: null,
  probe: null,
  stale: null,
  covered_by: null,
  test_case_id: null,
  story: null,
  issue: null,
  test: null,
};

test('normalise --preview writes nothing', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.csv'), path.join(dir, 'boost-format.csv'));
  const before = fs.readdirSync(dir).sort();

  const result = run(['normalise', 'boost-format.csv', '--preview'], dir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Format: proposed/);
  assert.equal(extractCaseCount(result.stdout), 3);
  assert.match(result.stdout, /"client_id": "Test Case ID"/);
  assert.deepEqual(fs.readdirSync(dir).sort(), before, 'preview must not create or change any file');
});

test('normalise --write without --map exits 2 and creates nothing', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.csv'), path.join(dir, 'boost-format.csv'));

  const result = run(['normalise', 'boost-format.csv', '--write'], dir);

  assert.equal(result.status, 2);
  assert.equal(fs.existsSync(path.join(dir, 'docs')), false, '--write without a confirmed map must create nothing');
});

test('normalise --write with a confirmed map creates cases.json, reuses it unchanged, and refuses a changed source', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.csv'), path.join(dir, 'boost-format.csv'));

  const preview = run(['normalise', 'boost-format.csv', '--preview'], dir);
  assert.equal(preview.status, 0, preview.stderr);
  const previewCount = extractCaseCount(preview.stdout);
  const confirmedMap = extractColumnMapJson(preview.stdout);
  fs.writeFileSync(path.join(dir, 'column-map.json'), JSON.stringify(confirmedMap, null, 2));

  const firstWrite = run(['normalise', 'boost-format.csv', '--write', '--map', 'column-map.json'], dir);
  assert.equal(firstWrite.status, 0, firstWrite.stderr);

  const casesPath = path.join(dir, 'docs', 'client-test-cases', 'cases.json');
  assert.ok(fs.existsSync(casesPath));
  const bytesAfterFirstWrite = fs.readFileSync(casesPath);
  const doc = JSON.parse(bytesAfterFirstWrite.toString('utf8'));

  assert.equal(doc.cases.length, previewCount);
  for (const c of doc.cases) {
    assert.deepEqual(c.import, emptyImportState);
  }
  assert.equal(doc.sha256, sha256Of(path.join(dir, 'boost-format.csv')));

  // Re-running --write with the same source reuses the file unchanged.
  const secondWrite = run(['normalise', 'boost-format.csv', '--write', '--map', 'column-map.json'], dir);
  assert.equal(secondWrite.status, 0, secondWrite.stderr);
  assert.match(secondWrite.stdout, /reused/);
  assert.ok(fs.readFileSync(casesPath).equals(bytesAfterFirstWrite), 'reused write must leave cases.json byte-identical');

  // Changing the source file makes --write refuse, leaving cases.json untouched.
  fs.appendFileSync(path.join(dir, 'boost-format.csv'), '\n');
  const thirdWrite = run(['normalise', 'boost-format.csv', '--write', '--map', 'column-map.json'], dir);
  assert.equal(thirdWrite.status, 3);
  assert.ok(fs.readFileSync(casesPath).equals(bytesAfterFirstWrite), 'a refused write must leave cases.json untouched');
});

test('normalise --preview detects a built-in format', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'testrail.csv'), path.join(dir, 'testrail.csv'));

  const result = run(['normalise', 'testrail.csv', '--preview'], dir);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Format: testrail/);
});

test('normalise --preview on an .xlsx fixture gives the same case count as the equivalent .csv', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.csv'), path.join(dir, 'boost-format.csv'));
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.xlsx'), path.join(dir, 'boost-format.xlsx'));

  const csvResult = run(['normalise', 'boost-format.csv', '--preview'], dir);
  const xlsxResult = run(['normalise', 'boost-format.xlsx', '--preview'], dir);

  assert.equal(csvResult.status, 0, csvResult.stderr);
  assert.equal(xlsxResult.status, 0, xlsxResult.stderr);
  assert.equal(extractCaseCount(xlsxResult.stdout), extractCaseCount(csvResult.stdout));
});

test('normalise rejects an unsupported file format', () => {
  const dir = freshDir();
  fs.writeFileSync(path.join(dir, 'cases.txt'), 'ID,Title\n1,Example\n');

  const result = run(['normalise', 'cases.txt', '--preview'], dir);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /\.csv/);
  assert.match(result.stderr, /\.xlsx/);
});

test('validate, report, and assign-ids wire through to the lib functions', () => {
  const dir = freshDir();
  const casesDir = path.join(dir, 'docs', 'client-test-cases');
  fs.mkdirSync(casesDir, { recursive: true });
  const casesPath = path.join(casesDir, 'cases.json');
  const relCasesPath = path.join('docs', 'client-test-cases', 'cases.json');

  const baseCase = (client_id, source_row) => ({
    client_id,
    title: `Case ${client_id}`,
    objective: null,
    preconditions: null,
    steps: ['Do a thing'],
    expected: ['Thing happens'],
    section: null,
    priority: null,
    notes: null,
    source_row,
    import: { ...emptyImportState },
  });

  const doc = {
    source_file: 'fixture.csv',
    sha256: 'deadbeef',
    format: 'proposed',
    column_map: {
      client_id: 'ID',
      title: 'Title',
      objective: null,
      preconditions: null,
      steps: 'Steps',
      expected: 'Expected',
      section: null,
      priority: null,
      notes: null,
    },
    imported_at: new Date().toISOString(),
    cases: [baseCase('BST-1', 2), baseCase('BST-2', 3)],
  };
  fs.writeFileSync(casesPath, `${JSON.stringify(doc, null, 2)}\n`);

  // validate: buckets are null, so it fails.
  const invalid = run(['validate', '--cases', relCasesPath], dir);
  assert.equal(invalid.status, 1);
  assert.ok(invalid.stderr.length > 0);

  // Set valid buckets; validate now passes.
  const withBuckets = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  for (const c of withBuckets.cases) c.import.bucket = 'automatable';
  fs.writeFileSync(casesPath, `${JSON.stringify(withBuckets, null, 2)}\n`);

  const valid = run(['validate', '--cases', relCasesPath], dir);
  assert.equal(valid.status, 0, valid.stderr);

  // report prints the Markdown heading.
  const report = run(['report', '--cases', relCasesPath], dir);
  assert.equal(report.status, 0, report.stderr);
  assert.match(report.stdout, /## Import report:/);

  // assign-ids: an issue title already claims TC_GEN_001, so it must never
  // be (re-)assigned; both cases (section null -> area GEN) get the next
  // two free IDs instead.
  const issuesPath = path.join(dir, 'issues.json');
  fs.writeFileSync(
    issuesPath,
    JSON.stringify([{ number: 5, title: '[TEST CASE] TC_GEN_001 - x', labels: [], state: 'open' }]),
  );

  const assign = run(['assign-ids', '--cases', relCasesPath, '--issues', 'issues.json'], dir);
  assert.equal(assign.status, 0, assign.stderr);
  assert.match(assign.stdout, /BST-1 -> TC_GEN_002/);
  assert.match(assign.stdout, /BST-2 -> TC_GEN_003/);
  assert.doesNotMatch(assign.stdout, /-> TC_GEN_001\b/);

  const assigned = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  assert.deepEqual(
    assigned.cases.map(c => c.import.test_case_id),
    ['TC_GEN_002', 'TC_GEN_003'],
  );

  // next-id: TC_GEN_001..003 are all now in use (issues.json + cases.json).
  const next = run(['next-id', 'GEN', '--cases', relCasesPath, '--issues', 'issues.json'], dir);
  assert.equal(next.status, 0, next.stderr);
  assert.equal(next.stdout.trim(), 'TC_GEN_004');
});

test('reconcile exits 0 for a consistent set and 1 for a duplicate test case issue title', () => {
  const dir = freshDir();

  const reconDoc = {
    source_file: 'fixture2.csv',
    sha256: 'cafebabe',
    format: 'proposed',
    column_map: {
      client_id: 'ID',
      title: 'Title',
      objective: null,
      preconditions: null,
      steps: 'Steps',
      expected: 'Expected',
      section: 'Section',
      priority: null,
      notes: null,
    },
    imported_at: new Date().toISOString(),
    cases: [
      {
        client_id: 'TC_X_001',
        title: 'Sample',
        objective: null,
        preconditions: null,
        steps: ['Do a thing'],
        expected: ['Thing happens'],
        section: 'X',
        priority: null,
        notes: null,
        source_row: 2,
        import: {
          ...emptyImportState,
          bucket: 'automatable',
          test_case_id: 'TC_X_001',
          issue: 10,
          test: 'spec.js › TC_X_001 does something',
        },
      },
    ],
  };
  fs.writeFileSync(path.join(dir, 'recon-cases.json'), JSON.stringify(reconDoc, null, 2));

  const testsReport = {
    suites: [
      {
        title: 'spec.js',
        file: 'spec.js',
        specs: [
          {
            title: 'TC_X_001 does something',
            file: 'spec.js',
            tags: [],
            tests: [{ projectName: 'staging', annotations: [{ type: 'test_case', description: 'TC_X_001' }] }],
          },
        ],
        suites: [],
      },
    ],
  };
  fs.writeFileSync(path.join(dir, 'tests.json'), JSON.stringify(testsReport));

  const consistentIssues = [{ number: 10, title: '[TEST CASE] TC_X_001 - Sample', labels: [{ name: 'test-automated' }], state: 'open' }];
  fs.writeFileSync(path.join(dir, 'issues-consistent.json'), JSON.stringify(consistentIssues));

  const ok = run(['reconcile', '--issues', 'issues-consistent.json', '--tests', 'tests.json', '--cases', 'recon-cases.json'], dir);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /"total": 1/);

  const duplicateIssues = [
    { number: 10, title: '[TEST CASE] TC_X_001 - Sample', labels: [{ name: 'test-automated' }], state: 'open' },
    { number: 11, title: '[TEST CASE] TC_X_001 - Sample duplicate', labels: [{ name: 'test-automated' }], state: 'open' },
  ];
  fs.writeFileSync(path.join(dir, 'issues-duplicate.json'), JSON.stringify(duplicateIssues));

  const duplicate = run(['reconcile', '--issues', 'issues-duplicate.json', '--tests', 'tests.json', '--cases', 'recon-cases.json'], dir);
  assert.equal(duplicate.status, 1);
  assert.match(duplicate.stderr, /duplicate/);
});
