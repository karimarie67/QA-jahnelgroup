import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findMissingSpecReferences, specPathsIn } from '../../scripts/spec-references.js';

function repo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'specrefs-'));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), content);
  }
  return root;
}

test('specPathsIn', async t => {
  await t.test('finds each tests/….spec.js path once', () => {
    assert.deepEqual(
      specPathsIn('npx playwright test tests/a.spec.js tests/b_c.spec.js --x && tests/a.spec.js'),
      ['tests/a.spec.js', 'tests/b_c.spec.js'],
    );
  });

  await t.test('ignores text with none', () => {
    assert.deepEqual(specPathsIn('node --test tests/unit/*.test.js'), []);
  });
});

test('findMissingSpecReferences', async t => {
  await t.test('passes when every named spec exists', () => {
    const root = repo({
      'package.json': '{"scripts":{"test:smoke":"playwright test tests/smoke.spec.js"}}',
      '.github/workflows/qa-test.yml': 'run: npx playwright test tests/smoke.spec.js',
      'tests/smoke.spec.js': '',
    });
    assert.deepEqual(findMissingSpecReferences(root), []);
  });

  await t.test('reports a spec removed but still named by a script or a CI job', () => {
    const root = repo({
      'package.json': '{"scripts":{"test:regression":"playwright test tests/gone.spec.js tests/kept.spec.js"}}',
      '.github/workflows/qa-test.yml': 'run: npx playwright test tests/gone.spec.js --project=staging',
      'tests/kept.spec.js': '',
    });
    assert.deepEqual(findMissingSpecReferences(root), [
      { file: 'package.json', spec: 'tests/gone.spec.js' },
      { file: '.github/workflows/qa-test.yml', spec: 'tests/gone.spec.js' },
    ]);
  });

  await t.test('skips a file that is not there', () => {
    const root = repo({ 'package.json': '{}' });
    assert.deepEqual(findMissingSpecReferences(root), []);
  });
});
