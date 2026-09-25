import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proposeMap } from '../../.claude/skills/import-test-cases/lib/propose-map.js';
import { parseCsv } from '../../.claude/skills/import-test-cases/lib/csv.js';
import { detectFormat } from '../../.claude/skills/import-test-cases/lib/formats.js';

const fixturesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'import');
const readFixture = name => fs.readFileSync(path.join(fixturesDir, name), 'utf8');

const BOOST_HEADERS = [
  'Test Case ID',
  'Test Case Name',
  'Test Objective',
  'Test Steps',
  'Expected Result',
  'Pass/Fail',
  'Notes/Comments',
];

test('proposeMap', async t => {
  await t.test('maps every Boost header', () => {
    const { column_map, unmapped } = proposeMap(BOOST_HEADERS);
    assert.deepEqual(column_map, {
      client_id: 'Test Case ID',
      title: 'Test Case Name',
      objective: 'Test Objective',
      preconditions: null,
      steps: 'Test Steps',
      expected: 'Expected Result',
      section: null,
      priority: null,
      notes: 'Notes/Comments',
    });
    assert.deepEqual(unmapped, ['Pass/Fail']);
  });

  await t.test('ignores trailing empty header columns', () => {
    const { column_map, unmapped } = proposeMap([...BOOST_HEADERS, '', '', '']);
    assert.equal(column_map.client_id, 'Test Case ID');
    assert.deepEqual(unmapped, ['Pass/Fail']);
  });

  await t.test('maps the Boost fixture headers read straight off the CSV file', () => {
    const rows = parseCsv(readFixture('boost-format.csv'));
    const { column_map, unmapped } = proposeMap(rows[0]);
    assert.equal(column_map.client_id, 'Test Case ID');
    assert.equal(column_map.title, 'Test Case Name');
    assert.equal(column_map.objective, 'Test Objective');
    assert.equal(column_map.steps, 'Test Steps');
    assert.equal(column_map.expected, 'Expected Result');
    assert.equal(column_map.notes, 'Notes/Comments');
    assert.deepEqual(unmapped, ['Pass/Fail']);
  });

  await t.test('partly maps unknown headers, listing the rest as unmapped', () => {
    const rows = parseCsv(readFixture('unknown-headers.csv'));
    const { column_map, unmapped } = proposeMap(rows[0]);
    assert.deepEqual(column_map, {
      client_id: null,
      title: 'Title',
      objective: null,
      preconditions: null,
      steps: 'Steps',
      expected: 'Expected',
      section: null,
      priority: null,
      notes: null,
    });
    assert.deepEqual(unmapped, ['Case Ref', 'Owner', 'Team']);
  });

  await t.test('a header matching an already-filled field is left unmapped rather than overwriting it', () => {
    const { column_map, unmapped } = proposeMap(['Title', 'Name']);
    assert.equal(column_map.title, 'Title');
    assert.deepEqual(unmapped, ['Name']);
  });
});

test('detectFormat returns null for formats with no built-in map', async t => {
  await t.test('the Boost format', () => {
    assert.equal(detectFormat(BOOST_HEADERS), null);
  });

  await t.test('unknown headers', () => {
    const rows = parseCsv(readFixture('unknown-headers.csv'));
    assert.equal(detectFormat(rows[0]), null);
  });
});
