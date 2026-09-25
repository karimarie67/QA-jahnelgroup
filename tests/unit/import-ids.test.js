import test from 'node:test';
import assert from 'node:assert/strict';
import { TC_ID, areaFromSection, collectUsedIds, nextId, assignIds } from '../../.claude/skills/import-test-cases/lib/ids.js';

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

test('TC_ID', async t => {
  await t.test('matches a well-formed ID', () => {
    assert.match('TC_LOGIN_001', TC_ID);
    assert.match('TC_LOGIN_1234', TC_ID);
  });

  await t.test('rejects malformed IDs', () => {
    assert.doesNotMatch('TC_login_001', TC_ID);
    assert.doesNotMatch('TC_LOGIN_01', TC_ID);
    assert.doesNotMatch('LOGIN_001', TC_ID);
  });
});

test('areaFromSection', async t => {
  await t.test('uppercases the first word and strips non-alphanumerics', () => {
    assert.equal(areaFromSection('Login Tests'), 'LOGIN');
    assert.equal(areaFromSection('e-commerce checkout'), 'ECOMMERC');
  });

  await t.test('truncates to 8 characters', () => {
    assert.equal(areaFromSection('Registration Flow'), 'REGISTRA');
  });

  await t.test('falls back to GEN when there is no usable word', () => {
    assert.equal(areaFromSection(null), 'GEN');
    assert.equal(areaFromSection('   '), 'GEN');
    assert.equal(areaFromSection('---'), 'GEN');
  });
});

test('collectUsedIds', async t => {
  await t.test('finds every test case ID across the given texts', () => {
    const used = collectUsedIds({
      texts: [
        '| TC_LOGIN_001 | ... |\n| TC_LOGIN_002 | ... |',
        '{"test_case_id":"TC_CART_003"}',
        '[TEST CASE] TC_LOGIN_002 - Sign in with valid credentials',
      ],
    });
    assert.deepEqual([...used].sort(), ['TC_CART_003', 'TC_LOGIN_001', 'TC_LOGIN_002']);
  });

  await t.test('ignores null/empty texts and ID-shaped substrings that are too short', () => {
    const used = collectUsedIds({ texts: [null, '', 'TC_LOGIN_01 is not an id'] });
    assert.equal(used.size, 0);
  });
});

test('nextId', async t => {
  await t.test('is one past the highest used number in that area', () => {
    const used = new Set(['TC_LOGIN_001', 'TC_LOGIN_002', 'TC_CART_005']);
    assert.equal(nextId('LOGIN', used), 'TC_LOGIN_003');
  });

  await t.test('starts at 001 when the area is unused', () => {
    const used = new Set(['TC_LOGIN_001']);
    assert.equal(nextId('CART', used), 'TC_CART_001');
  });
});

test('assignIds', async t => {
  await t.test('assigns the next free ID across coverage map, cases.json, and issue titles, never reusing one', () => {
    const used = collectUsedIds({
      texts: [
        '| TC_LOGIN_001 | ... |', // coverage map markdown
        JSON.stringify({ cases: [{ import: { test_case_id: 'TC_LOGIN_002' } }] }), // cases.json text
        '[TEST CASE] TC_LOGIN_003 - Some closed issue', // issue title (open or closed)
      ],
    });
    const cases = [
      { client_id: 'C-1', section: 'Login', import: baseImport({ bucket: 'automatable' }) },
      { client_id: 'C-2', section: 'Login', import: baseImport({ bucket: 'automatable' }) },
    ];

    const result = assignIds(cases, used);

    assert.equal(result[0].import.test_case_id, 'TC_LOGIN_004');
    assert.equal(result[1].import.test_case_id, 'TC_LOGIN_005');
  });

  await t.test('uses a TC_ id client_id unchanged', () => {
    const cases = [{ client_id: 'TC_CART_009', section: 'Cart', import: baseImport({ bucket: 'automatable' }) }];
    const result = assignIds(cases, new Set());
    assert.equal(result[0].import.test_case_id, 'TC_CART_009');
  });

  await t.test('leaves a covered case pointed at its covered_by ID', () => {
    const cases = [
      { client_id: 'C-3', section: 'Cart', import: baseImport({ bucket: 'automatable', covered_by: 'TC_CART_001' }) },
    ];
    const result = assignIds(cases, new Set(['TC_CART_001']));
    assert.equal(result[0].import.test_case_id, 'TC_CART_001');
  });

  await t.test('leaves a stale case without an ID', () => {
    const cases = [{ client_id: 'C-4', section: 'Cart', import: baseImport({ bucket: 'stale' }) }];
    const result = assignIds(cases, new Set());
    assert.equal(result[0].import.test_case_id, null);
  });

  await t.test('is idempotent: running twice yields the same result', () => {
    const cases = [
      { client_id: 'C-1', section: 'Login', import: baseImport({ bucket: 'automatable' }) },
      { client_id: 'C-2', section: 'Login', import: baseImport({ bucket: 'automatable' }) },
    ];
    const first = assignIds(cases, new Set());
    const second = assignIds(first, new Set());
    assert.deepEqual(
      second.map(c => c.import.test_case_id),
      first.map(c => c.import.test_case_id),
    );
  });

  await t.test('does not mutate its inputs', () => {
    const used = new Set(['TC_LOGIN_001']);
    const cases = [{ client_id: 'C-1', section: 'Login', import: baseImport({ bucket: 'automatable' }) }];
    assignIds(cases, used);
    assert.equal(cases[0].import.test_case_id, null);
    assert.deepEqual([...used], ['TC_LOGIN_001']);
  });
});
