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

// ---------------------------------------------------------------------------
// Map guard, --remap, --map-out, section warnings, `set`, stages, --final
// ---------------------------------------------------------------------------

/** Preview a fixture, write its confirmed map and cases.json, and return the paths. */
function importFixture(fixtureName) {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, fixtureName), path.join(dir, fixtureName));
  const preview = run(['normalise', fixtureName, '--preview'], dir);
  assert.equal(preview.status, 0, preview.stderr);
  const confirmedMap = extractColumnMapJson(preview.stdout);
  fs.writeFileSync(path.join(dir, 'column-map.json'), JSON.stringify(confirmedMap, null, 2));
  const write = run(['normalise', fixtureName, '--write', '--map', 'column-map.json'], dir);
  assert.equal(write.status, 0, write.stderr);
  return { dir, fixtureName, confirmedMap, casesPath: path.join(dir, 'docs', 'client-test-cases', 'cases.json') };
}

const readCases = casesPath => JSON.parse(fs.readFileSync(casesPath, 'utf8'));

test('normalise --preview lists each section with the ID area it gives', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'testrail.csv'), path.join(dir, 'testrail.csv'));
  const result = run(['normalise', 'testrail.csv', '--preview'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Sections \(with the ID area each would give\):/);
  assert.match(result.stdout, /Authentication: \d+ cases? -> TC_AUTHENTI_###/);
  assert.doesNotMatch(result.stdout, /WARNING: no section values/);
  // The confirmed map must still be the last thing printed.
  extractColumnMapJson(result.stdout);
});

test('normalise --preview warns when there are no sections, because every new ID would be TC_GEN_###', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.csv'), path.join(dir, 'boost-format.csv'));
  const result = run(['normalise', 'boost-format.csv', '--preview'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\(no section\): 3 cases -> TC_GEN_###/);
  assert.match(result.stdout, /WARNING: no section values\..*TC_GEN_###/);
  extractColumnMapJson(result.stdout);
});

test('normalise --preview --map-out writes the map file, and only when asked', () => {
  const dir = freshDir();
  fs.copyFileSync(path.join(FIXTURES_DIR, 'boost-format.csv'), path.join(dir, 'boost-format.csv'));
  const result = run(['normalise', 'boost-format.csv', '--preview', '--map-out', 'docs/client-test-cases/column-map.json'], dir);
  assert.equal(result.status, 0, result.stderr);
  const written = JSON.parse(fs.readFileSync(path.join(dir, 'docs', 'client-test-cases', 'column-map.json'), 'utf8'));
  assert.deepEqual(written.column_map, extractColumnMapJson(result.stdout).column_map);
  assert.equal(written.format, 'proposed');
});

test('normalise --write refuses a different column map for the same file, and --remap keeps the import state', () => {
  const { dir, fixtureName, confirmedMap, casesPath } = importFixture('boost-format.csv');
  const firstId = readCases(casesPath).cases[0].client_id;
  assert.equal(run(['set', firstId, 'bucket', 'manual'], dir).status, 0);
  assert.equal(run(['set', firstId, 'reason', 'needs a human eye'], dir).status, 0);

  // Correct the map: a column the human wants mapped that was left out.
  const corrected = { ...confirmedMap, column_map: { ...confirmedMap.column_map, notes: null } };
  fs.writeFileSync(path.join(dir, 'corrected-map.json'), JSON.stringify(corrected, null, 2));
  const before = fs.readFileSync(casesPath);

  const refused = run(['normalise', fixtureName, '--write', '--map', 'corrected-map.json'], dir);
  assert.equal(refused.status, 3);
  assert.match(refused.stderr, /different column map/);
  assert.match(refused.stderr, /--remap/);
  assert.ok(fs.readFileSync(casesPath).equals(before), 'a refused write must leave cases.json untouched');

  const remapped = run(['normalise', fixtureName, '--write', '--map', 'corrected-map.json', '--remap'], dir);
  assert.equal(remapped.status, 0, remapped.stderr);
  assert.match(remapped.stdout, /Remapped .*3 cases kept their import state, 0 new/);
  const doc = readCases(casesPath);
  assert.equal(doc.column_map.notes, null);
  assert.equal(doc.cases[0].notes, null, 'the new map should be applied');
  assert.equal(doc.cases[0].import.bucket, 'manual', 'import state must survive a remap');
  assert.equal(doc.cases[0].import.reason, 'needs a human eye');
  assert.ok(doc.remapped_at);
});

test('normalise --remap refuses when the new map no longer finds an existing case', () => {
  const { dir, fixtureName, confirmedMap, casesPath } = importFixture('boost-format.csv');
  // Mapping client_id to the title column changes every client_id.
  const wrong = { ...confirmedMap, column_map: { ...confirmedMap.column_map, client_id: 'Test Case Name' } };
  fs.writeFileSync(path.join(dir, 'wrong-map.json'), JSON.stringify(wrong, null, 2));
  const before = fs.readFileSync(casesPath);

  const result = run(['normalise', fixtureName, '--write', '--map', 'wrong-map.json', '--remap'], dir);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /would drop 3 case\(s\)/);
  assert.ok(fs.readFileSync(casesPath).equals(before), 'nothing may change when a remap would drop cases');
});

test('set writes one import field, validates it, and refuses what it cannot place', () => {
  const { dir, casesPath } = importFixture('boost-format.csv');
  const [first] = readCases(casesPath).cases;
  const id = first.client_id;

  // Plain and nested fields, and integers.
  assert.equal(run(['set', id, 'bucket', 'stale'], dir).status, 0);
  assert.equal(run(['set', id, 'probe', 'Checkout page returns 404'], dir).status, 0);
  assert.equal(run(['set', id, 'stale.missing', 'Checkout page'], dir).status, 0);
  assert.equal(run(['set', id, 'stale.outcome', 'finding'], dir).status, 0);
  assert.equal(run(['set', id, 'stale.finding_issue', '31'], dir).status, 0);
  let imp = readCases(casesPath).cases[0].import;
  assert.equal(imp.bucket, 'stale');
  assert.equal(imp.probe, 'Checkout page returns 404');
  assert.deepEqual(imp.stale, { missing: 'Checkout page', outcome: 'finding', finding_issue: 31 });

  // `null` clears a field, and a number-looking reason stays text.
  assert.equal(run(['set', id, 'stale.finding_issue', 'null'], dir).status, 0);
  assert.equal(readCases(casesPath).cases[0].import.stale.finding_issue, null);
  assert.equal(run(['set', id, 'reason', '404'], dir).status, 0);
  assert.equal(readCases(casesPath).cases[0].import.reason, '404');

  // Refusals leave the file alone.
  const before = fs.readFileSync(casesPath);
  const refusals = [
    [['set', id, 'bucket', 'Manual'], /bucket must be one of/],
    [['set', id, 'stale.outcome', 'ignore'], /stale\.outcome must be one of/],
    [['set', id, 'issue', 'abc'], /issue number/],
    [['set', id, 'issue', '-4'], /issue number/],
    [['set', id, 'title', 'Renamed'], /Unknown field/],
    [['set', 'NOPE', 'bucket', 'manual'], /No case with client_id/],
    [['set', id], /Usage: import\.js set/],
  ];
  for (const [args, pattern] of refusals) {
    const result = run(args, dir);
    assert.equal(result.status, 2, `${args.join(' ')} should exit 2`);
    assert.match(result.stderr, pattern);
  }
  assert.ok(fs.readFileSync(casesPath).equals(before), 'refused sets must not change cases.json');
});

test('validate --stage triage checks probes and stale outcomes before any ID exists', () => {
  const { dir, casesPath } = importFixture('boost-format.csv');
  const ids = readCases(casesPath).cases.map(c => c.client_id);

  // Bucket everything automatable, but probe only two of the three cases.
  for (const id of ids) assert.equal(run(['set', id, 'bucket', 'automatable'], dir).status, 0);
  for (const id of ids.slice(0, 2)) assert.equal(run(['set', id, 'probe', 'page loads'], dir).status, 0);
  const missing = run(['validate', '--stage', 'triage'], dir);
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, new RegExp(`${ids[2]}.*import\\.probe is required`));

  assert.equal(run(['set', ids[2], 'probe', 'page loads'], dir).status, 0);
  const ok = run(['validate', '--stage', 'triage'], dir);
  assert.equal(ok.status, 0, ok.stderr);

  // These client IDs are already TC_-shaped, so `full` needs assign-ids first.
  assert.equal(run(['validate'], dir).status, 1);
  assert.equal(run(['assign-ids'], dir).status, 0);
  assert.equal(run(['validate', '--stage', 'all'], dir).status, 0);

  const bad = run(['validate', '--stage', 'nope'], dir);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Unknown stage/);
});

test('reconcile --final fails a case whose issue was never relabelled test-automated', () => {
  const { dir, casesPath } = importFixture('boost-format.csv');
  const [first] = readCases(casesPath).cases;
  const tcid = first.client_id;
  const fields = { bucket: 'automatable', test_case_id: tcid, issue: '7', story: '3', test: `tests/home.spec.js › ${tcid}` };
  for (const [field, value] of Object.entries(fields)) assert.equal(run(['set', tcid, field, value], dir).status, 0);

  // Only the first case is under test; drop the rest from the file.
  const doc = readCases(casesPath);
  doc.cases = [doc.cases[0]];
  fs.writeFileSync(casesPath, JSON.stringify(doc, null, 2));

  const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
  write('tests.json', { suites: [{ specs: [{ title: `${tcid} Homepage search`, file: 'tests/home.spec.js', tests: [{ annotations: [{ type: 'test_case', description: tcid }] }] }] }] });
  write('issues-needs.json', [{ number: 7, title: `[TEST CASE] ${tcid} - Homepage search`, labels: [{ name: 'test-needs-automation' }], state: 'open' }]);
  write('issues-done.json', [{ number: 7, title: `[TEST CASE] ${tcid} - Homepage search`, labels: [{ name: 'test-automated' }], state: 'open' }]);

  const relaxed = run(['reconcile', '--issues', 'issues-needs.json', '--tests', 'tests.json'], dir);
  assert.equal(relaxed.status, 0, relaxed.stderr);

  const strict = run(['reconcile', '--issues', 'issues-needs.json', '--tests', 'tests.json', '--final'], dir);
  assert.equal(strict.status, 1);
  assert.match(strict.stderr, /must be labelled test-automated/);

  const done = run(['reconcile', '--issues', 'issues-done.json', '--tests', 'tests.json', '--final'], dir);
  assert.equal(done.status, 0, done.stderr);
});
