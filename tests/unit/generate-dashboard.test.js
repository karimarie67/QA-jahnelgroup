import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { testStatus, parsePlaywrightJson, calculateMetrics } = require('../../dashboards/scripts/generate-dashboard.js');

const attempt = (status, duration = 1000) => ({ status, duration, errors: status === 'failed' ? [{ message: 'boom' }] : [] });

test('testStatus', async t => {
  await t.test('maps Playwright verdicts', () => {
    assert.equal(testStatus({ status: 'expected', results: [attempt('passed')] }), 'passed');
    assert.equal(testStatus({ status: 'flaky', results: [attempt('failed'), attempt('passed')] }), 'flaky');
    assert.equal(testStatus({ status: 'skipped', results: [attempt('skipped')] }), 'skipped');
    assert.equal(testStatus({ status: 'unexpected', results: [attempt('failed'), attempt('failed')] }), 'failed');
  });

  await t.test('without a verdict, uses the last attempt', () => {
    assert.equal(testStatus({ results: [attempt('failed'), attempt('passed')] }), 'passed');
    assert.equal(testStatus({ results: [attempt('skipped')] }), 'skipped');
    assert.equal(testStatus({ results: [attempt('timedOut')] }), 'failed');
  });
});

test('parsePlaywrightJson and calculateMetrics', async t => {
  const report = {
    suites: [{
      specs: [
        { title: 'TC_A passes', tests: [{ projectName: 'staging', status: 'expected', results: [attempt('passed', 2000)] }] },
        { title: 'TC_B phone only', tests: [{ projectName: 'staging', status: 'skipped', results: [attempt('skipped', 0)] }] },
        { title: 'TC_C flaky', tests: [{ projectName: 'staging', status: 'flaky', results: [attempt('failed', 1000), attempt('passed', 1000)] }] },
      ],
      suites: [{
        specs: [{ title: 'TC_D fails', tests: [{ projectName: 'staging-mobile', status: 'unexpected', results: [attempt('failed', 3000), attempt('failed', 3000)] }] }],
      }],
    }],
  };
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dash-')), 'results.json');
  fs.writeFileSync(file, JSON.stringify(report));
  const tests = parsePlaywrightJson(file);

  await t.test('reads every test, including nested suites', () => {
    assert.deepEqual(tests.map(x => [x.name, x.status]), [
      ['TC_A passes', 'passed'],
      ['TC_B phone only', 'skipped'],
      ['TC_C flaky', 'flaky'],
      ['TC_D fails', 'failed'],
    ]);
  });

  await t.test('duration covers every attempt, and the error comes from a failed one', () => {
    assert.equal(tests[3].durationSec, 6);
    assert.equal(tests[2].error, 'boom');
  });

  await t.test('skipped tests are left out of the pass rate; flaky counts as a pass', () => {
    const m = calculateMetrics({ smoke: tests.slice(0, 2), functional: tests.slice(2) });
    assert.equal(m.totalTests, 4);
    assert.equal(m.passed, 2);
    assert.equal(m.flaky, 1);
    assert.equal(m.skipped, 1);
    assert.equal(m.failed, 1);
    assert.deepEqual(m.failedTestNames, ['TC_D fails']);
    assert.ok(Math.abs(m.passRate - (2 / 3) * 100) < 1e-9);
  });
});
