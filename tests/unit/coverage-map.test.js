import test from 'node:test';
import assert from 'node:assert/strict';
import { collectTests, renderMarkdown } from '../../scripts/coverage-map.js';

// Minimal shape of `playwright test --list --reporter=json`: a file suite
// holding a describe suite, one test listed under two projects, and one test
// with no test_case annotation.
const report = {
  suites: [{
    title: 'cart.spec.js',
    file: 'cart.spec.js',
    specs: [],
    suites: [{
      title: 'Cart',
      specs: [
        {
          title: 'TC_CART_002 Second',
          file: 'cart.spec.js',
          tags: [],
          tests: [{ projectName: 'staging', annotations: [{ type: 'test_case', description: 'TC_CART_002' }] }],
        },
        {
          title: 'TC_CART_001 First',
          file: 'cart.spec.js',
          tags: ['@smoke'],
          tests: [
            { projectName: 'staging', annotations: [
              { type: 'test_case', description: 'TC_CART_001' },
              { type: 'issue', description: 'https://github.com/o/r/issues/7' },
              { type: 'client_case', description: 'SD-7' },
              { type: 'client_case', description: 'SD-9' },
            ] },
            { projectName: 'production', annotations: [
              { type: 'test_case', description: 'TC_CART_001' },
              { type: 'issue', description: 'https://github.com/o/r/issues/7' },
              { type: 'client_case', description: 'SD-7' },
              { type: 'client_case', description: 'SD-9' },
            ] },
          ],
        },
        { title: 'Untracked | check', file: 'cart.spec.js', tags: [], tests: [{ projectName: 'staging', annotations: [] }] },
      ],
    }],
  }],
};

test('collectTests', async t => {
  const tests = collectTests(report);

  await t.test('returns one entry per test, merging projects', () => {
    assert.equal(tests.length, 3);
    const first = tests.find(x => x.testCase === 'TC_CART_001');
    assert.deepEqual(first.projects, ['staging', 'production']);
  });

  await t.test('reads test_case, issue, tags, and the describe path', () => {
    const first = tests.find(x => x.testCase === 'TC_CART_001');
    assert.equal(first.issue, 'https://github.com/o/r/issues/7');
    assert.deepEqual(first.tags, ['@smoke']);
    assert.equal(first.title, 'Cart › TC_CART_001 First');
    assert.equal(first.file, 'cart.spec.js');
  });

  await t.test('leaves testCase null when the annotation is missing', () => {
    assert.equal(tests.find(x => x.title.includes('Untracked')).testCase, null);
  });

  await t.test('collects clientCases from all client_case annotations', () => {
    const first = tests.find(x => x.testCase === 'TC_CART_001');
    assert.deepEqual(first.clientCases, ['SD-7', 'SD-9']);
  });

  await t.test('returns empty array for clientCases when no client_case annotation', () => {
    const second = tests.find(x => x.testCase === 'TC_CART_002');
    assert.deepEqual(second.clientCases, []);
    const untracked = tests.find(x => x.title.includes('Untracked'));
    assert.deepEqual(untracked.clientCases, []);
  });
});

test('renderMarkdown', async t => {
  const md = renderMarkdown(collectTests(report));

  await t.test('sorts rows by test case ID', () => {
    assert.ok(md.indexOf('| TC_CART_001 |') < md.indexOf('| TC_CART_002 |'));
  });

  await t.test('links issues by number and shows tags, with client cases', () => {
    assert.match(md, /\| TC_CART_001 \| SD-7, SD-9 \| \[#7\]\(https:\/\/github\.com\/o\/r\/issues\/7\) \| `@smoke` \|/);
    assert.match(md, /\| TC_CART_002 \| — \| — \| — \|/);
  });

  await t.test('lists tests without an ID separately and escapes pipes', () => {
    assert.match(md, /## Tests without a test case ID/);
    assert.match(md, /Untracked \\\| check/);
  });

  await t.test('summarizes the counts', () => {
    assert.match(md, /2 automated test cases, plus 1 test without a test case ID\./);
  });
});
