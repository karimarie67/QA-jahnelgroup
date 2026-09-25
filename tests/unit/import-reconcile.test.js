import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile } from '../../.claude/skills/import-test-cases/lib/reconcile.js';

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

function casesFile(cases) {
  return { source_file: 'docs/client-test-cases/boost-cases.xlsx', sha256: 'x', format: 'testrail', column_map: {}, imported_at: 'x', cases };
}

test('reconcile: rule 1 - no duplicate TEST CASE or STORY issue titles', async t => {
  await t.test('passes with distinct titles', () => {
    const issues = [
      { number: 1, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-automated' }], state: 'open' },
      { number: 2, title: '[TEST CASE] TC_LOGIN_002 - Sign out', labels: [{ name: 'test-automated' }], state: 'open' },
      { number: 3, title: '[STORY] Login', labels: [], state: 'open' },
    ];
    const result = reconcile(casesFile([]), issues, []);
    assert.equal(result.ok, true);
  });

  await t.test('fails when two issues share a [TEST CASE] <id> - prefix', () => {
    const issues = [
      { number: 1, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [], state: 'open' },
      { number: 2, title: '[TEST CASE] TC_LOGIN_001 - Sign in (dup)', labels: [], state: 'closed' },
    ];
    const result = reconcile(casesFile([]), issues, []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('duplicate test case issue title') && e.includes('#1') && e.includes('#2')));
  });

  await t.test('fails when two issues share an identical [STORY] title', () => {
    const issues = [
      { number: 1, title: '[STORY] Checkout', labels: [], state: 'open' },
      { number: 2, title: '[STORY] Checkout', labels: [], state: 'closed' },
    ];
    const result = reconcile(casesFile([]), issues, []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('duplicate story issue title')));
  });
});

test('reconcile: rule 2 - non-stale, non-covered cases need a matching issue', async t => {
  await t.test('passes when the issue exists with the expected title', () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'manual', reason: 'x', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-manual' }], state: 'open' }];
    const result = reconcile(casesFile(cases), issues, []);
    assert.equal(result.ok, true);
  });

  await t.test('fails when import.issue is missing', () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'manual', reason: 'x', test_case_id: 'TC_LOGIN_001', issue: null }) })];
    const result = reconcile(casesFile(cases), [], []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing import.issue')));
  });

  await t.test("fails when the issue's title does not match the test case ID", () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'manual', reason: 'x', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_999 - Wrong', labels: [{ name: 'test-manual' }], state: 'open' }];
    const result = reconcile(casesFile(cases), issues, []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('does not start with')));
  });
});

test('reconcile: rule 3 - label matches bucket', async t => {
  await t.test('passes when a manual case has the test-manual label', () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'manual', reason: 'x', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-manual' }], state: 'open' }];
    assert.equal(reconcile(casesFile(cases), issues, []).ok, true);
  });

  await t.test('fails when a manual case is labelled test-automated instead of test-manual', () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'manual', reason: 'x', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-automated' }], state: 'open' }];
    const result = reconcile(casesFile(cases), issues, []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing label test-manual')));
  });

  await t.test('fails when an automatable case has neither test-automated nor test-needs-automation', () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-manual' }], state: 'open' }];
    const result = reconcile(casesFile(cases), issues, []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing label test-automated or test-needs-automation')));
  });
});

test('reconcile: rule 4 - test-automated and covered cases need a matching coverage test', async t => {
  await t.test('passes when a test-automated case has a matching coverage test', () => {
    const cases = [makeCase({ client_id: 'TC_LOGIN_001', import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-automated' }], state: 'open' }];
    const coverageTests = [{ testCase: 'TC_LOGIN_001', clientCases: [] }];
    assert.equal(reconcile(casesFile(cases), issues, coverageTests).ok, true);
  });

  await t.test('fails when a test-automated case has no coverage test', () => {
    const cases = [makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001', issue: 10 }) })];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-automated' }], state: 'open' }];
    const result = reconcile(casesFile(cases), issues, []);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('no coverage test for TC_LOGIN_001')));
  });

  await t.test('fails when the client_id differs from the test_case_id and the coverage test is missing that client_case', () => {
    const cases = [
      makeCase({ client_id: 'BOOST-42', import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001', issue: 10 }) }),
    ];
    const issues = [{ number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-automated' }], state: 'open' }];
    const coverageTests = [{ testCase: 'TC_LOGIN_001', clientCases: [] }];
    const result = reconcile(casesFile(cases), issues, coverageTests);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('missing client_case BOOST-42')));
  });

  await t.test('passes for a covered case with a matching coverage test, and needs no issue', () => {
    const cases = [
      makeCase({
        client_id: 'BOOST-9',
        import: baseImport({ bucket: 'automatable', covered_by: 'TC_LOGIN_001', test_case_id: 'TC_LOGIN_001' }),
      }),
    ];
    const coverageTests = [{ testCase: 'TC_LOGIN_001', clientCases: ['BOOST-9'] }];
    const result = reconcile(casesFile(cases), [], coverageTests);
    assert.equal(result.ok, true);
  });
});

test('reconcile: rule 5 - no coverage test may reference a stale case', async t => {
  await t.test('passes when no coverage test references a stale client_id', () => {
    const cases = [makeCase({ client_id: 'C-STALE', import: baseImport({ bucket: 'stale', stale: { missing: 'gone', outcome: null, finding_issue: null } }) })];
    const coverageTests = [{ testCase: 'TC_LOGIN_001', clientCases: [] }];
    assert.equal(reconcile(casesFile(cases), [], coverageTests).ok, true);
  });

  await t.test('fails when a coverage test lists a stale case in clientCases', () => {
    const cases = [makeCase({ client_id: 'C-STALE', import: baseImport({ bucket: 'stale', stale: { missing: 'gone', outcome: null, finding_issue: null } }) })];
    const coverageTests = [{ testCase: 'TC_LOGIN_001', clientCases: ['C-STALE'] }];
    const result = reconcile(casesFile(cases), [], coverageTests);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('refers to stale client case C-STALE')));
  });
});

test('reconcile: counts', async t => {
  await t.test('reports bucket counts plus issues_by_label restricted to the cases referenced issues', () => {
    const cases = [
      makeCase({ client_id: 'C-1', import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001', issue: 10 }) }),
      makeCase({ client_id: 'C-2', source_row: 3, import: baseImport({ bucket: 'manual', reason: 'x', test_case_id: 'TC_LOGIN_002', issue: 11 }) }),
    ];
    const issues = [
      { number: 10, title: '[TEST CASE] TC_LOGIN_001 - Sign in', labels: [{ name: 'test-automated' }], state: 'open' },
      { number: 11, title: '[TEST CASE] TC_LOGIN_002 - Sign out', labels: [{ name: 'test-manual' }], state: 'open' },
      { number: 99, title: '[TEST CASE] TC_UNRELATED_001 - Unrelated', labels: [{ name: 'test-automated' }], state: 'open' },
    ];
    const coverageTests = [{ testCase: 'TC_LOGIN_001', clientCases: [] }];
    const result = reconcile(casesFile(cases), issues, coverageTests);
    assert.equal(result.counts.automatable, 1);
    assert.equal(result.counts.manual, 1);
    assert.deepEqual(result.counts.issues_by_label, { 'test-manual': 1, 'test-automated': 1, 'test-needs-automation': 0 });
  });
});
