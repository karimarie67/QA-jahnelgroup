import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv } from '../../.claude/skills/import-test-cases/lib/csv.js';
import { detectFormat } from '../../.claude/skills/import-test-cases/lib/formats.js';
import { normalise } from '../../.claude/skills/import-test-cases/lib/normalise.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'import');

function readAndNormalise(fixtureName, expectedFormat) {
  const text = fs.readFileSync(path.join(fixturesDir, fixtureName), 'utf8');
  const rows = parseCsv(text);
  const detected = detectFormat(rows[0]);
  assert.ok(detected, `expected ${fixtureName}'s headers to be detected`);
  assert.equal(detected.name, expectedFormat);
  return normalise(rows, detected.column_map);
}

test('testrail.csv normalises to the full expected shape for every case', () => {
  const cases = readAndNormalise('testrail.csv', 'testrail');
  assert.deepEqual(cases, [
    {
      client_id: 'C1',
      title: 'Login with valid credentials',
      objective: null,
      preconditions: null,
      steps: ['Open the login page', 'Enter a valid username and password', 'Click Log In'],
      expected: ['Login page is displayed', 'Fields accept the input', 'User lands on the dashboard'],
      section: 'Authentication',
      priority: 'Medium',
      notes: null,
      source_row: 2,
    },
    {
      client_id: 'C2',
      title: 'Reset password with an expired link',
      objective: null,
      preconditions: 'User has requested a password reset and the link has expired',
      steps: ['Open the expired reset link'],
      expected: ['An error message explains the link has expired'],
      section: 'Authentication',
      priority: 'High',
      notes: null,
      source_row: 5,
    },
    {
      client_id: 'C3',
      title: 'Update profile email address',
      objective: null,
      preconditions: null,
      steps: ['Open Account Settings', 'Enter a new email address'],
      expected: ['Account Settings page is displayed', 'Confirmation email is sent to the new address'],
      section: 'Profile',
      priority: 'Low',
      notes: null,
      source_row: 6,
    },
  ]);
});

test('zephyr-scale.csv normalises to the full expected shape for every case', () => {
  const cases = readAndNormalise('zephyr-scale.csv', 'zephyr-scale');
  assert.deepEqual(cases, [
    {
      client_id: 'PROJ-T10',
      title: 'Search returns matching products',
      objective: 'Verify the search bar returns relevant results',
      preconditions: null,
      steps: ['Open the search bar', 'Type a known product name', 'Press Enter'],
      expected: ['Search bar is focused', 'Suggestions list appears', 'Matching products are listed'],
      section: 'Search',
      priority: 'Medium',
      notes: null,
      source_row: 2,
    },
    {
      client_id: 'PROJ-T11',
      title: 'Checkout blocked without shipping address',
      objective: 'Verify checkout cannot proceed without a shipping address',
      preconditions: 'Cart contains at least one item and no shipping address is saved',
      steps: ['Proceed to checkout'],
      expected: ['An error prompts for a shipping address'],
      section: 'Checkout',
      priority: 'High',
      notes: null,
      source_row: 5,
    },
    {
      client_id: 'PROJ-T12',
      title: 'Update quantity in cart',
      objective: 'Verify cart totals recalculate',
      preconditions: null,
      steps: ['Open the cart page', 'Increase quantity of an item'],
      expected: ['Cart page lists items', 'Cart subtotal updates'],
      section: 'Cart',
      priority: 'Low',
      notes: null,
      source_row: 6,
    },
  ]);
});

test('xray.csv normalises to the full expected shape for every case', () => {
  const cases = readAndNormalise('xray.csv', 'xray');
  assert.deepEqual(cases, [
    {
      client_id: 'WEB-101',
      title: 'Login with valid credentials',
      objective: null,
      preconditions: null,
      steps: ['Go to login page', 'Enter username', 'Enter password', 'Click login'],
      expected: ['User is redirected to the dashboard'],
      section: 'Authentication',
      priority: 'Medium',
      notes: null,
      source_row: 2,
    },
    {
      client_id: 'WEB-102',
      title: 'Logout clears session',
      objective: null,
      preconditions: null,
      steps: ['Click logout'],
      expected: ['User is returned to the login page and back button does not restore session'],
      section: 'Authentication',
      priority: 'High',
      notes: null,
      source_row: 6,
    },
    {
      client_id: 'WEB-103',
      title: 'Filter products by category',
      objective: null,
      preconditions: null,
      steps: ['Open the catalog page', 'Select the Electronics category filter'],
      expected: ['Catalog page lists all products', 'Only Electronics products are listed'],
      section: 'Catalog',
      priority: 'Low',
      notes: null,
      source_row: 7,
    },
  ]);
});

test('qtest.csv normalises to the full expected shape for every case', () => {
  const cases = readAndNormalise('qtest.csv', 'qtest');
  assert.deepEqual(cases, [
    {
      client_id: 'TC-501',
      title: 'Add item to cart',
      objective: 'Verify an item can be added to the cart from the product page',
      preconditions: null,
      steps: ['Open a product page', 'Click Add to Cart', 'Open the cart page'],
      expected: ['Product details are displayed', 'Item is added to the cart', 'The added item is listed with quantity 1'],
      section: 'Cart',
      priority: 'Medium',
      notes: null,
      source_row: 2,
    },
    {
      client_id: 'TC-502',
      title: 'Apply an expired coupon code',
      objective: 'Verify an expired coupon is rejected',
      preconditions: 'Cart contains items and an expired coupon code is available',
      steps: ['Enter the expired coupon code and apply it'],
      expected: ['An error states the coupon has expired'],
      section: 'Checkout',
      priority: 'High',
      notes: null,
      source_row: 5,
    },
    {
      client_id: 'TC-503',
      title: 'Remove item from cart',
      objective: 'Verify an item can be removed from the cart',
      preconditions: null,
      steps: ['Open the cart page', 'Click Remove on an item'],
      expected: ['Cart page lists items', 'Item no longer appears in the cart'],
      section: 'Cart',
      priority: 'Low',
      notes: null,
      source_row: 6,
    },
  ]);
});

test('splitNumbered edge cases used by the row rules', async t => {
  const { splitNumbered } = await import('../../.claude/skills/import-test-cases/lib/normalise.js');

  await t.test('a cell with no numbering is a single item', () => {
    assert.deepEqual(splitNumbered('Open the login page'), ['Open the login page']);
  });

  await t.test('numbered lines split into one item per number, prefix removed and trimmed', () => {
    assert.deepEqual(splitNumbered('1. Open Chrome.\n2. Navigate to the site.\n3. Observe.'), [
      'Open Chrome.',
      'Navigate to the site.',
      'Observe.',
    ]);
  });

  await t.test('accepts a ")" number style too', () => {
    assert.deepEqual(splitNumbered('1) First\n2) Second'), ['First', 'Second']);
  });

  await t.test('null and empty input return an empty array', () => {
    assert.deepEqual(splitNumbered(null), []);
    assert.deepEqual(splitNumbered(''), []);
    assert.deepEqual(splitNumbered('   '), []);
  });
});

test('normalise: a row that repeats the current case\'s client_id with an empty title continues that case', () => {
  const rows = [
    ['TCID', 'Test Summary', 'Action', 'Result'],
    ['WEB-1', 'Login', 'Go to login page', ''],
    ['WEB-1', '', 'Enter username', ''],
    ['WEB-1', '', 'Click login', 'User is redirected to the dashboard'],
  ];
  const columnMap = { client_id: 'TCID', title: 'Test Summary', steps: 'Action', expected: 'Result' };
  const cases = normalise(rows, columnMap);
  assert.equal(cases.length, 1);
  assert.deepEqual(cases[0].steps, ['Go to login page', 'Enter username', 'Click login']);
  assert.deepEqual(cases[0].expected, ['User is redirected to the dashboard']);
});

test('normalise: headers are matched case-insensitively', () => {
  const rows = [
    ['tcid', 'TEST SUMMARY'],
    ['WEB-1', 'Login'],
  ];
  const columnMap = { client_id: 'TCID', title: 'Test Summary' };
  const cases = normalise(rows, columnMap);
  assert.deepEqual(cases, [
    {
      client_id: 'WEB-1',
      title: 'Login',
      objective: null,
      preconditions: null,
      steps: [],
      expected: [],
      section: null,
      priority: null,
      notes: null,
      source_row: 2,
    },
  ]);
});
