import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { testStatus, parsePlaywrightJson, calculateMetrics, slackPayload, collectTestResults, generate } from '../../dashboards/scripts/generate-dashboard.js';

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

// The single-artifact layout, and a run with no results (the update-dashboard
// job's two cases that used to go wrong: see the generator's
// resultFileCandidates and generate).
const report = specs => JSON.stringify({ suites: [{ specs }] });
const oneSpec = (title, status) => ({ title, tests: [{ projectName: 'staging', status, results: [attempt(status === 'expected' ? 'passed' : 'failed')] }] });
function artifacts(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'artifacts-'));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  }
  return dir;
}

test('collectTestResults: where a single artifact lands', async t => {
  await t.test('a functional file at the root alone (a regression-only run) is read', () => {
    const r = collectTestResults(artifacts({ 'functional-results.json': report([oneSpec('TC_A 1', 'expected'), oneSpec('TC_B 2', 'unexpected')]) }));
    assert.equal(r.functional.length, 2);
    assert.equal(r.smoke.length, 0);
  });

  await t.test('a smoke file at the root alone (a smoke-only run) is read', () => {
    const r = collectTestResults(artifacts({ 'smoke-results.json': report([oneSpec('TC_S 1', 'expected')]) }));
    assert.equal(r.smoke.length, 1);
  });

  await t.test('the subfolder is preferred when a file is in both places', () => {
    const r = collectTestResults(artifacts({
      'functional-test-results/functional-results.json': report([oneSpec('TC_SUB 1', 'expected')]),
      'functional-results.json': report([oneSpec('TC_ROOT 1', 'expected'), oneSpec('TC_ROOT 2', 'expected')]),
    }));
    assert.deepEqual(r.functional.map(x => x.name), ['TC_SUB 1']);
  });
});

test('generate', async t => {
  const outDirs = () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-'));
    return { dashboardPath: path.join(out, 'qa-metrics.md'), resultsDir: path.join(out, 'test-results') };
  };
  const env = { GITHUB_RUN_NUMBER: '7', GITHUB_RUN_ID: '123', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'o/r', TEST_ENV: 'staging' };

  await t.test('with results: writes the dashboard, a history row, and the latest results', () => {
    const o = outDirs();
    const m = generate({ artifactsDir: artifacts({ 'functional-results.json': report([oneSpec('TC_A 1', 'expected'), oneSpec('TC_B 2', 'unexpected')]) }), ...o, env });
    assert.equal(m.totalTests, 2);
    const history = JSON.parse(fs.readFileSync(path.join(o.resultsDir, 'history.json'), 'utf8'));
    assert.deepEqual(history.map(h => [h.runNumber, h.total, h.passed, h.failed]), [['7', 2, 1, 1]]);
    assert.match(fs.readFileSync(o.dashboardPath, 'utf8'), /Run:\*\* \[#7\]\(https:\/\/github\.com\/o\/r\/actions\/runs\/123\)/);
    assert.ok(fs.existsSync(path.join(o.resultsDir, 'latest-results.json')));
    assert.ok(fs.existsSync(path.join(o.resultsDir, 'slack-payload.json')), 'a failing run writes its payload');
  });

  for (const [name, files] of [
    ['no results file', {}],
    ['an empty results file', { 'functional-results.json': '' }],
    ['a results file with no tests', { 'functional-test-results/functional-results.json': JSON.stringify({ suites: [] }) }],
  ]) {
    await t.test(`${name}: throws, and leaves every file as it was`, () => {
      const o = outDirs();
      fs.mkdirSync(o.resultsDir, { recursive: true });
      const before = { [o.dashboardPath]: '# the last dashboard', [path.join(o.resultsDir, 'history.json')]: '[{"runNumber":"6"}]', [path.join(o.resultsDir, 'slack-payload.json')]: '{"old":true}' };
      for (const [f, body] of Object.entries(before)) fs.writeFileSync(f, body);
      assert.throws(() => generate({ artifactsDir: artifacts(files), ...o, env }), /No test results to report/);
      for (const [f, body] of Object.entries(before)) assert.equal(fs.readFileSync(f, 'utf8'), body, f);
      assert.equal(fs.existsSync(path.join(o.resultsDir, 'latest-results.json')), false);
    });
  }
});

test('the generator as CI runs it, with no artifacts', async t => {
  await t.test('exits 1 with an ::error:: line, and the committed dashboard files are unchanged', () => {
    const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
    assert.equal(fs.existsSync(path.join(repo, 'artifacts')), false, 'this test needs no artifacts/ folder');
    const tracked = ['dashboards/qa-metrics.md', 'dashboards/test-results/history.json', 'dashboards/test-results/latest-results.json', 'dashboards/test-results/slack-payload.json'];
    const hash = f => (fs.existsSync(path.join(repo, f)) ? crypto.createHash('sha256').update(fs.readFileSync(path.join(repo, f))).digest('hex') : 'absent');
    const before = tracked.map(hash);
    const run = spawnSync(process.execPath, [path.join(repo, 'dashboards/scripts/generate-dashboard.js')], { cwd: repo, encoding: 'utf8', env: { ...process.env, GITHUB_RUN_NUMBER: '999' } });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /::error::No test results to report/);
    assert.deepEqual(tracked.map(hash), before);
  });
});
