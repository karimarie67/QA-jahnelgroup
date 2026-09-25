import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../../.claude/skills/import-test-cases/lib/csv.js';

test('parseCsv', async t => {
  await t.test('parses a simple unquoted row', () => {
    assert.deepEqual(parseCsv('a,b,c\n1,2,3\n'), [
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  await t.test('strips a leading UTF-8 BOM', () => {
    const withBom = '﻿a,b\n1,2\n';
    assert.deepEqual(parseCsv(withBom), [
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  await t.test('handles CRLF line endings', () => {
    assert.deepEqual(parseCsv('a,b\r\n1,2\r\n'), [
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  await t.test('handles a quoted field containing a comma', () => {
    assert.deepEqual(parseCsv('a,b\n"1, one",2\n'), [
      ['a', 'b'],
      ['1, one', '2'],
    ]);
  });

  await t.test('unescapes a doubled quote inside a quoted field', () => {
    assert.deepEqual(parseCsv('a\n"She said ""hi""."\n'), [['a'], ['She said "hi".']]);
  });

  await t.test('preserves an embedded newline inside a quoted field, spanning physical lines', () => {
    const text = 'a,b\n"line one\nline two",2\n';
    assert.deepEqual(parseCsv(text), [
      ['a', 'b'],
      ['line one\nline two', '2'],
    ]);
  });

  await t.test('a record spans several physical lines when quoted', () => {
    const text = 'id,notes\n1,"first\nsecond\nthird"\n2,ok\n';
    assert.deepEqual(parseCsv(text), [
      ['id', 'notes'],
      ['1', 'first\nsecond\nthird'],
      ['2', 'ok'],
    ]);
  });

  await t.test('keeps trailing empty columns as empty strings', () => {
    assert.deepEqual(parseCsv('a,b,,\n1,2,,\n'), [
      ['a', 'b', '', ''],
      ['1', '2', '', ''],
    ]);
  });

  await t.test('represents a genuinely blank physical line as an empty record', () => {
    assert.deepEqual(parseCsv('a,b\n1,2\n\n3,4\n'), [
      ['a', 'b'],
      ['1', '2'],
      [],
      ['3', '4'],
    ]);
  });

  await t.test('a row of only commas is not collapsed to an empty record', () => {
    assert.deepEqual(parseCsv('a,b,c\n,,\n'), [
      ['a', 'b', 'c'],
      ['', '', ''],
    ]);
  });

  await t.test('handles a file with no trailing newline', () => {
    assert.deepEqual(parseCsv('a,b\n1,2'), [
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  await t.test('returns an empty array for an empty string', () => {
    assert.deepEqual(parseCsv(''), []);
  });

  await t.test('a quote inside an unquoted field, after other characters, is literal text', () => {
    assert.deepEqual(parseCsv('a\n5" screen,foo\n'), [['a'], ['5" screen', 'foo']]);
  });

  await t.test('a quote still open at end of input throws, naming the line it started on', () => {
    assert.throws(
      () => parseCsv('a,b\n1,"unterminated\n2,3\n'),
      /Unterminated quoted field starting on line 2/,
    );
  });
});
