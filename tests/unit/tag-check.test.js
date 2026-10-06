import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findTagProblems, SUITE_TAGS } from '../../scripts/tag-check.js';

// A real `playwright test --list --reporter=json` report of the template,
// trimmed to the fields the check reads (no absolute paths). Its tags are
// listed without '@', as Playwright lists them.
const here = path.dirname(fileURLToPath(import.meta.url));
const real = () => JSON.parse(fs.readFileSync(path.join(here, 'fixtures/playwright-list.json'), 'utf8'));

// The spec objects (every project's copy) whose title starts with an ID.
function specsOf(report, id) {
  const found = [];
  const walk = s => { for (const sp of s.specs || []) if (sp.title.startsWith(id)) found.push(sp); (s.suites || []).forEach(walk); };
  report.suites.forEach(walk);
  assert.ok(found.length, `no spec ${id} in the fixture`);
  return found;
}
const change = (report, id, fn) => { specsOf(report, id).forEach(fn); return report; };

test('findTagProblems', async t => {
  await t.test("the template's own tests pass, with tags listed without '@'", () => {
    const report = real();
    assert.deepEqual(specsOf(report, 'TC_SMOKE_001')[0].tags, ['smoke']);
    assert.deepEqual(findTagProblems(report), []);
    assert.deepEqual(SUITE_TAGS, ['@smoke', '@regression', '@links']);
  });

  await t.test('no tag fails, naming the test', () => {
    const problems = findTagProblems(change(real(), 'TC_FORM_001', s => { s.tags = []; }));
    assert.equal(problems.length, 1);
    assert.match(problems[0], /forms_tests\.spec\.js › Forms Tests › TC_FORM_001 .*: needs exactly one suite tag .* has none/);
  });

  await t.test('two suite tags fail', () => {
    const problems = findTagProblems(change(real(), 'TC_FORM_001', s => { s.tags = ['smoke', 'regression']; }));
    assert.match(problems.join('\n'), /needs exactly one suite tag .* has @smoke @regression/);
  });

  await t.test('a repeated suite tag (describe and test) counts once', () => {
    assert.deepEqual(findTagProblems(change(real(), 'TC_SMOKE_001', s => { s.tags = ['smoke', 'smoke']; })), []);
  });

  await t.test('an area tag only fails; a suite tag plus area tags passes', () => {
    assert.match(findTagProblems(change(real(), 'TC_A11Y_001', s => { s.tags = ['a11y']; })).join('\n'), /has @a11y/);
    assert.deepEqual(findTagProblems(change(real(), 'TC_A11Y_001', s => { s.tags = ['regression', 'a11y', 'forms']; })), []);
  });

  await t.test('@links only on the link checker, and always there', () => {
    assert.match(findTagProblems(change(real(), 'TC_ERROR_001', s => { s.tags = ['links']; })).join('\n'), /only check-links\.spec\.js may be @links/);
    assert.match(findTagProblems(change(real(), 'TC_LINKS_001', s => { s.tags = ['regression']; })).join('\n'), /link checker must be tagged @links/);
  });

  await t.test('a logged-in spec or the setup must be @regression', () => {
    assert.match(findTagProblems(change(real(), 'TC_AUTH_002', s => { s.tags = ['smoke', 'auth']; })).join('\n'), /logged-in spec or setup must be @regression/);
    assert.match(findTagProblems(change(real(), 'TC_AUTH_001', s => { s.tags = ['smoke']; })).join('\n'), /logged-in spec or setup must be @regression/);
  });

  await t.test('a tag extending a suite tag fails', () => {
    for (const tag of ['smoke-visual', 'regressionx']) {
      const problems = findTagProblems(change(real(), 'TC_A11Y_001', s => { s.tags = ['regression', tag]; }));
      assert.match(problems.join('\n'), new RegExp(`tag @${tag} starts with a suite tag's name`));
    }
  });

  await t.test('a suite tag in a title, a describe title, a file path, or a project name fails', () => {
    assert.match(findTagProblems(change(real(), 'TC_FORM_001', s => { s.title += ' @regression'; })).join('\n'), /title or describe title contains a suite tag/);

    const inDescribe = real();
    const walk = s => { for (const c of s.suites || []) { if (c.title === 'Forms Tests') c.title = 'Forms @smoke'; walk(c); } };
    inDescribe.suites.forEach(walk);
    assert.match(findTagProblems(inDescribe).join('\n'), /Forms @smoke › TC_FORM_001.*title or describe title contains a suite tag/);

    assert.match(findTagProblems(change(real(), 'TC_FORM_001', s => { s.file = 'sub@smoke/forms_tests.spec.js'; })).join('\n'), /file path contains a suite tag/);

    const project = real();
    project.config.projects.push({ name: 'b@regression' });
    assert.match(findTagProblems(project).join('\n'), /project "b@regression": its name contains a suite tag/);
  });

  await t.test('one test on several projects is reported once; same-titled tests in two describes separately', () => {
    const report = real();
    assert.ok(specsOf(report, 'TC_FORM_001').length > 1, 'the fixture lists TC_FORM_001 for several projects');
    assert.equal(findTagProblems(change(report, 'TC_FORM_001', s => { s.tags = []; })).length, 1);

    const twice = {
      config: { projects: [{ name: 'p' }] },
      suites: [{ title: 'x.spec.js', file: 'x.spec.js', suites: ['A', 'B'].map(d => ({ title: d, specs: [{ title: 'same', file: 'x.spec.js', tags: [], tests: [{ projectName: 'p' }] }] })) }],
    };
    assert.equal(findTagProblems(twice).length, 2);
  });
});
