import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { testStatus, parsePlaywrightJson, calculateMetrics, slackPayload, collectTestResults } from '../../dashboards/scripts/generate-dashboard.js';

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

  await t.test("a test's duration is its last attempt's, with its attempts counted; the error comes from a failed one", () => {
    assert.equal(tests[3].durationSec, 3);
    assert.equal(tests[3].attempts, 2);
    assert.equal(tests[3].allAttemptsSec, 6);
    assert.equal(tests[0].attempts, 1);
    assert.equal(tests[2].error, 'boom');
  });

  await t.test("the run's total duration counts every attempt", () => {
    const m = calculateMetrics({ smoke: tests.slice(0, 2), functional: tests.slice(2) });
    assert.equal(m.totalDuration, 2 + 0 + 2 + 6);
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

test('failedTestNames', async t => {
  await t.test('a test failing on desktop and phone is listed once', () => {
    const fail = project => ({ name: 'TC_X fails', status: 'failed', projectName: project, durationSec: 1 });
    const m = calculateMetrics({ smoke: [fail('staging'), fail('staging-mobile')], functional: [] });
    assert.equal(m.failed, 2);
    assert.deepEqual(m.failedTestNames, ['TC_X fails']);
  });
});

test('slackPayload', async t => {
  const base = { failed: 0, flaky: 0, branch: 'main', runId: '42' };
  const env = { GITHUB_REPOSITORY: 'o/r' };

  await t.test('a clean run has nothing to report', () => {
    assert.equal(slackPayload(base, env), null);
  });

  await t.test('a failing run names its failures and links the run', () => {
    const p = slackPayload({ ...base, failed: 3 }, env);
    assert.equal(p.text, 'QA alert: 3 failed, 0 flaky on main');
    assert.match(p.blocks[0].text.text, /\*3 failed\*/);
    assert.doesNotMatch(p.blocks[0].text.text, /flaky/);
    assert.match(p.blocks[0].text.text, /<https:\/\/github\.com\/o\/r\/actions\/runs\/42\|View the run>/);
  });

  await t.test('a flaky-only run is reported as flaky, not as failed', () => {
    const p = slackPayload({ ...base, flaky: 1 }, env);
    assert.match(p.blocks[0].text.text, /\*1 flaky\*/);
    assert.doesNotMatch(p.blocks[0].text.text, /failed/);
  });

  await t.test("uses Slack's bold (single asterisks), not Markdown's", () => {
    const p = slackPayload({ ...base, failed: 1, flaky: 2 }, env);
    assert.doesNotMatch(JSON.stringify(p), /\*\*/);
  });
});

test('collectTestResults', async t => {
  // The same artifact names and files the workflow uploads (qa-test.yml).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-'));
  const write = (rel, specs) => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), JSON.stringify({ suites: [{ specs }] }));
  };
  const spec = (title, status) => ({ title, tests: [{ projectName: 'staging', status, results: [attempt(status === 'expected' ? 'passed' : 'failed')] }] });
  write('smoke-test-results/smoke-results.json', [spec('TC_SMOKE_001 a', 'expected')]);
  write('functional-test-results/functional-results.json', [spec('TC_ERROR_001 b', 'expected'), spec('TC_FORM_001 c', 'unexpected'), spec('TC_A11Y_001 d', 'expected')]);

  await t.test('reads the smoke and the functional artifact, with their test counts', () => {
    const results = collectTestResults(dir);
    assert.equal(results.smoke.length, 1);
    assert.equal(results.functional.length, 3);
    assert.deepEqual(results.functional.map(x => x.name), ['TC_ERROR_001 b', 'TC_FORM_001 c', 'TC_A11Y_001 d']);
  });

  await t.test('finds nothing where no artifacts were downloaded', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-'));
    const results = collectTestResults(empty);
    assert.equal(results.smoke.length + results.functional.length, 0);
  });
});
