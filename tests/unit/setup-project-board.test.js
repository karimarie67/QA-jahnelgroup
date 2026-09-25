import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStates, statusOptions } from '../../scripts/setup-project-board.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('parseStates', async t => {
  await t.test('reads the table rows in order and the human-only line', () => {
    const md = [
      '## States', '', '| State | Meaning |', '|---|---|',
      '| `Backlog` | New work |', '| `Done` | Finished; human-only transition |', '',
      'Human-only states: `Done`.', '', '## Next section', '| `Ignored` | not a state |',
    ].join('\n');
    assert.deepEqual(parseStates(md), {
      states: [{ name: 'Backlog', meaning: 'New work' }, { name: 'Done', meaning: 'Finished; human-only transition' }],
      humanOnly: ['Done'],
    });
  });

  await t.test('throws when the section or its rows are missing', () => {
    assert.throws(() => parseStates('# Tracker'), /no "## States" section/);
    assert.throws(() => parseStates('## States\n\nnothing here\n'), /has no rows/);
  });

  await t.test("parses this repo's issue-tracker.md", () => {
    const { states, humanOnly } = parseStates(fs.readFileSync(path.join(repoRoot, 'docs/agents/issue-tracker.md'), 'utf8'));
    assert.deepEqual(states.map(s => s.name), ['Backlog', 'To Do', 'In Progress', 'In QA', 'Done']);
    assert.deepEqual(humanOnly, ['In QA', 'Done']);
  });
});

test('statusOptions', async t => {
  await t.test('keeps order, uses the meaning as description, and assigns a color', () => {
    const opts = statusOptions([{ name: 'A', meaning: 'first' }, { name: 'B', meaning: 'second' }]);
    assert.deepEqual(opts, [
      { name: 'A', color: 'GRAY', description: 'first' },
      { name: 'B', color: 'BLUE', description: 'second' },
    ]);
  });
});
