import test from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../../.claude/skills/import-test-cases/lib/validate.js';

let nextRow = 2;

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
    client_id: `C-${nextRow}`,
    title: 'Some case',
    objective: null,
    preconditions: null,
    steps: [],
    expected: [],
    section: 'Login',
    priority: null,
    notes: null,
    source_row: nextRow++,
    import: baseImport(),
    ...overrides,
  };
}

test('validate: rule 1 - bucket must be one of the four values', async t => {
  await t.test('passes when bucket is a valid value', () => {
    const result = validate([makeCase({ import: baseImport({ bucket: 'automatable' }) })]);
    assert.equal(result.ok, true);
  });

  await t.test('fails when bucket is null or unrecognised', () => {
    const result = validate([makeCase({ import: baseImport({ bucket: null }) })]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('import.bucket')));
  });
});

test('validate: rule 2 - client_id unique and non-null', async t => {
  await t.test('passes with unique, non-null client_ids', () => {
    const result = validate([
      makeCase({ client_id: 'A-1', import: baseImport({ bucket: 'manual', reason: 'legacy UI' }) }),
      makeCase({ client_id: 'A-2', import: baseImport({ bucket: 'manual', reason: 'legacy UI' }) }),
    ]);
    assert.equal(result.ok, true);
  });

  await t.test('fails on a duplicate or null client_id', () => {
    const dup = validate([
      makeCase({ client_id: 'A-1', import: baseImport({ bucket: 'manual', reason: 'x' }) }),
      makeCase({ client_id: 'A-1', import: baseImport({ bucket: 'manual', reason: 'x' }) }),
    ]);
    assert.equal(dup.ok, false);
    assert.ok(dup.errors.some(e => e.includes('duplicates')));

    const missing = validate([makeCase({ client_id: null, import: baseImport({ bucket: 'manual', reason: 'x' }) })]);
    assert.equal(missing.ok, false);
    assert.ok(missing.errors.some(e => e.includes('client_id is required')));
  });
});

test('validate: rule 3 - manual and partly-automatable require a reason', async t => {
  await t.test('passes when a reason is given', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'manual', reason: 'requires visual review' }) }),
      makeCase({ import: baseImport({ bucket: 'partly-automatable', reason: 'flaky third-party widget' }) }),
    ]);
    assert.equal(result.ok, true);
  });

  await t.test('fails when the reason is missing', () => {
    const manual = validate([makeCase({ import: baseImport({ bucket: 'manual', reason: null }) })]);
    assert.equal(manual.ok, false);
    assert.ok(manual.errors.some(e => e.includes('manual requires import.reason')));

    const partly = validate([makeCase({ import: baseImport({ bucket: 'partly-automatable', reason: '' }) })]);
    assert.equal(partly.ok, false);
    assert.ok(partly.errors.some(e => e.includes('partly-automatable requires import.reason')));
  });
});

test('validate: rule 4 - stale requires missing and forbids a test', async t => {
  await t.test('passes when stale.missing is set and test/covered_by/test_case_id are null', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'stale', stale: { missing: 'page removed', outcome: null, finding_issue: null } }) }),
    ]);
    assert.equal(result.ok, true);
  });

  await t.test('fails when stale.missing is absent', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'stale', stale: { missing: '', outcome: null, finding_issue: null } }) }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('stale requires import.stale.missing')));
  });

  await t.test('fails when a stale case still carries a test, covered_by, or test_case_id', () => {
    const result = validate([
      makeCase({
        import: baseImport({
          bucket: 'stale',
          stale: { missing: 'page removed', outcome: null, finding_issue: null },
          test: 'checkout.spec.js › does a thing',
        }),
      }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('stale forbids')));
  });
});

test('validate: rule 5 - test_case_id shape and client_id agreement', async t => {
  await t.test('passes when a TC_ client_id matches its own test_case_id', () => {
    const result = validate([
      makeCase({ client_id: 'TC_LOGIN_001', import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_001' }) }),
    ]);
    assert.equal(result.ok, true);
  });

  await t.test('fails on a malformed test_case_id', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'not-an-id' }) }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('does not match')));
  });

  await t.test('fails when a TC_ client_id disagrees with its own (non-covered) test_case_id', () => {
    const result = validate([
      makeCase({ client_id: 'TC_LOGIN_001', import: baseImport({ bucket: 'automatable', test_case_id: 'TC_LOGIN_002' }) }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('must equal client_id')));
  });

  await t.test('skips the client_id agreement check for a stale case (its test_case_id must be null)', () => {
    const result = validate([
      makeCase({
        client_id: 'TC_BST_009',
        import: baseImport({ bucket: 'stale', stale: { missing: 'page removed', outcome: null, finding_issue: null } }),
      }),
    ]);
    assert.equal(result.ok, true);
  });
});

test('validate: rule 6 - covered_by agreement and bucket restriction', async t => {
  await t.test('passes when test_case_id equals covered_by on an automatable case', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'automatable', covered_by: 'TC_CART_001', test_case_id: 'TC_CART_001' }) }),
    ]);
    assert.equal(result.ok, true);
  });

  await t.test('fails when test_case_id disagrees with covered_by', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'automatable', covered_by: 'TC_CART_001', test_case_id: 'TC_CART_002' }) }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('must equal import.covered_by')));
  });

  await t.test('fails when covered_by is set on a manual case', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'manual', reason: 'x', covered_by: 'TC_CART_001', test_case_id: 'TC_CART_001' }) }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('only allowed on automatable or partly-automatable')));
  });
});

test('validate: rule 7 - non-covered test_case_id values are unique', async t => {
  await t.test('passes with distinct, non-covered test_case_ids', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'TC_CART_001' }) }),
      makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'TC_CART_002' }) }),
    ]);
    assert.equal(result.ok, true);
  });

  await t.test('fails when two non-covered cases share a test_case_id', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'TC_CART_001' }) }),
      makeCase({ import: baseImport({ bucket: 'automatable', test_case_id: 'TC_CART_001' }) }),
    ]);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some(e => e.includes('test_case_id "TC_CART_001" duplicates')));
  });

  await t.test('allows two covered cases to legitimately share the covered test_case_id', () => {
    const result = validate([
      makeCase({ import: baseImport({ bucket: 'automatable', covered_by: 'TC_CART_001', test_case_id: 'TC_CART_001' }) }),
      makeCase({ import: baseImport({ bucket: 'automatable', covered_by: 'TC_CART_001', test_case_id: 'TC_CART_001' }) }),
    ]);
    assert.equal(result.ok, true);
  });
});
