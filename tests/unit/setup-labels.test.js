import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTriageLabels, parseFormLabels, plannedLabels, TEST_MANAGEMENT_LABELS } from '../../scripts/setup-labels.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('parseTriageLabels', async t => {
  await t.test('reads the tracker label and meaning from each row', () => {
    const md = [
      '| Label in mattpocock/skills | Label in our tracker | Meaning |',
      '| --- | --- | --- |',
      '| `needs-triage` | `triage-me` | Maintainer needs to evaluate this issue |',
    ].join('\n');
    assert.deepEqual(parseTriageLabels(md), [{ name: 'triage-me', description: 'Maintainer needs to evaluate this issue' }]);
  });

  await t.test('throws when there are no rows', () => {
    assert.throws(() => parseTriageLabels('# Triage Labels'), /no label table rows/);
  });

  await t.test("parses this repo's triage-labels.md", () => {
    const labels = parseTriageLabels(fs.readFileSync(path.join(repoRoot, 'docs/agents/triage-labels.md'), 'utf8'));
    assert.deepEqual(labels.map(l => l.name), ['needs-triage', 'needs-info', 'ready-for-agent', 'ready-for-human', 'wontfix']);
  });
});

test('parseFormLabels', async t => {
  await t.test('reads quoted and unquoted labels', () => {
    assert.deepEqual(parseFormLabels('name: X\nlabels: ["bug", \'qa\', needs-triage]\nbody: []'), ['bug', 'qa', 'needs-triage']);
  });

  await t.test('returns [] for a form without labels', () => {
    assert.deepEqual(parseFormLabels('name: X\nbody: []'), []);
  });
});

test('plannedLabels', async t => {
  const planned = plannedLabels({
    triage: [{ name: 'needs-triage', description: 'Evaluate' }],
    forms: [{ file: 'bug_report.yml', labels: ['bug', 'needs-triage'] }, { file: 'odd.yml', labels: ['custom'] }],
  });
  const byName = Object.fromEntries(planned.map(l => [l.name, l]));

  await t.test('lists each label once, test-management labels first', () => {
    assert.deepEqual(planned.slice(0, 5).map(l => l.name), TEST_MANAGEMENT_LABELS);
    assert.equal(planned.filter(l => l.name === 'needs-triage').length, 1);
  });

  await t.test('records every reason a label is needed', () => {
    assert.equal(byName['needs-triage'].why, 'triage; applied by bug_report.yml');
  });

  await t.test('uses known colors and falls back to a neutral one', () => {
    assert.equal(byName['needs-triage'].color, 'fbca04');
    assert.equal(byName.custom.color, 'ededed');
    assert.equal(byName.custom.description, 'Applied by the odd.yml issue form');
  });

  await t.test("covers every label this repo's issue forms apply", () => {
    const dir = path.join(repoRoot, '.github/ISSUE_TEMPLATE');
    const forms = fs.readdirSync(dir).filter(f => f.endsWith('.yml') && f !== 'config.yml')
      .map(file => ({ file, labels: parseFormLabels(fs.readFileSync(path.join(dir, file), 'utf8')) }));
    const names = new Set(plannedLabels({ triage: [], forms }).map(l => l.name));
    for (const { labels } of forms) for (const l of labels) assert.ok(names.has(l), l);
    for (const l of ['qa', 'needs-triage', 'user-story', 'test-case']) assert.ok(names.has(l), l);
  });
});
