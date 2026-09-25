import test from 'node:test';
import assert from 'node:assert/strict';
import { countBuckets, renderReport } from '../../.claude/skills/import-test-cases/lib/report.js';

function baseImport(overrides = {}) {
  return {
    bucket: null,
    reason: null,
    probe: null,
    stale: null,
    covered_by: null,
    test_case_id: null,
    story: null,
    issue: null,
    test: null,
    ...overrides,
  };
}

function makeCase(overrides = {}) {
  return {
    client_id: 'C-1',
    title: 'Some case',
    objective: null,
    preconditions: null,
    steps: [],
    expected: [],
    section: 'Login',
    priority: null,
    notes: null,
    source_row: 2,
    import: baseImport(),
    ...overrides,
  };
}

test('countBuckets', async t => {
  await t.test('tallies each bucket plus a total', () => {
    const counts = countBuckets([
      makeCase({ import: baseImport({ bucket: 'automatable' }) }),
      makeCase({ import: baseImport({ bucket: 'automatable' }) }),
      makeCase({ import: baseImport({ bucket: 'partly-automatable' }) }),
      makeCase({ import: baseImport({ bucket: 'manual' }) }),
      makeCase({ import: baseImport({ bucket: 'stale' }) }),
    ]);
    assert.deepEqual(counts, { automatable: 2, 'partly-automatable': 1, manual: 1, stale: 1, total: 5 });
  });

  await t.test('returns zero counts for an empty case list', () => {
    assert.deepEqual(countBuckets([]), { automatable: 0, 'partly-automatable': 0, manual: 0, stale: 0, total: 0 });
  });
});

test('renderReport', async t => {
  const casesFile = {
    source_file: 'docs/client-test-cases/boost-cases.xlsx',
    sha256: 'deadbeef',
    format: 'testrail',
    column_map: {},
    imported_at: '2026-01-01T00:00:00.000Z',
    cases: [
      makeCase({
        client_id: 'C-1',
        source_row: 2,
        import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001', issue: 42, test: 'login.spec.js › signs in' }),
      }),
      makeCase({
        client_id: 'C-2',
        source_row: 3,
        import: baseImport({ bucket: 'partly-automatable', reason: 'CAPTCHA blocks automation', test_case_id: 'TC_LOGIN_002', issue: 43 }),
      }),
      makeCase({
        client_id: 'C-3 | edge',
        source_row: 4,
        import: baseImport({ bucket: 'manual', reason: 'visual regression only' }),
      }),
      makeCase({
        client_id: 'C-4',
        source_row: 5,
        import: baseImport({ bucket: 'stale', stale: { missing: 'checkout removed', outcome: 'finding', finding_issue: 50 } }),
      }),
    ],
  };

  const md = renderReport(casesFile);

  await t.test('has the heading and summary line', () => {
    assert.match(md, /^## Import report: docs\/client-test-cases\/boost-cases\.xlsx$/m);
    assert.match(md, /^2 of 4 automated, 1 partly automated, 1 manual, 1 stale$/m);
  });

  await t.test('has a counts table', () => {
    assert.match(md, /\| automatable \| 1 \|/);
    assert.match(md, /\| partly-automatable \| 1 \|/);
    assert.match(md, /\| manual \| 1 \|/);
    assert.match(md, /\| stale \| 1 \|/);
  });

  await t.test('has a reasons table for manual and partly-automatable cases', () => {
    assert.match(md, /\| C-2 \| partly-automatable \| CAPTCHA blocks automation \|/);
    assert.match(md, /\| C-3 \\\| edge \| manual \| visual regression only \|/);
  });

  await t.test('has a stale table', () => {
    assert.match(md, /\| C-4 \| checkout removed \| finding \| #50 \|/);
  });

  await t.test('has a traceability table for every non-stale case, and omits stale cases', () => {
    assert.match(md, /\| Client case \| Test case \| Issue \| Test \|/);
    assert.match(md, /\| C-1 \| TC_LOGIN_001 \| #42 \| login\.spec\.js › signs in \|/);
    assert.match(md, /\| C-2 \| TC_LOGIN_002 \| #43 \| — \|/);
    assert.doesNotMatch(md.split('| Client case | Test case | Issue | Test |')[1], /C-4/);
  });
});
