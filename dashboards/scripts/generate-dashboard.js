import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CONFIGURATION: QUALITY GATES ---
const QUALITY_GATES = {
  SMOKE_TARGET: 100,
  FUNCTIONAL_TARGET: 95,
  MAX_DURATION_SEC: 600
};

const ARTIFACTS_DIR = path.join(__dirname, '../../artifacts');
const DASHBOARD_PATH = path.join(__dirname, '../qa-metrics.md');
const RESULTS_DIR = path.join(__dirname, '../test-results');
const HISTORY_FILE = path.join(RESULTS_DIR, 'history.json');

/**
 * Build the dashboard from the downloaded artifacts: the dashboard markdown,
 * the run's history row, the latest results, and the Slack payload. Throws,
 * before touching any file, when the artifacts hold no tests at all (no
 * results file, or files with zero tests): a run with no results is a
 * failure, and writing it up would wipe the dashboard or record a run that
 * never happened.
 * @param {{artifactsDir?: string, dashboardPath?: string, resultsDir?: string, env?: Record<string, string|undefined>}} options
 */
function generate({ artifactsDir = ARTIFACTS_DIR, dashboardPath = DASHBOARD_PATH, resultsDir = RESULTS_DIR, env = process.env } = {}) {
  console.log('🔄 Generating QA Dashboard...');

  const testResults = collectTestResults(artifactsDir);
  const total = testResults.smoke.length + testResults.functional.length;
  if (total === 0) {
    throw new Error(`No test results to report: no tests in ${resultFileCandidates(artifactsDir, 'smoke').join(' or ')}, or in ${resultFileCandidates(artifactsDir, 'functional').join(' or ')}. The dashboard was left unchanged.`);
  }

  fs.mkdirSync(resultsDir, { recursive: true });
  const historyFile = path.join(resultsDir, 'history.json');
  const slackFile = path.join(resultsDir, 'slack-payload.json');

  // A payload belongs to the run that wrote it: remove the last run's first.
  if (fs.existsSync(slackFile)) fs.unlinkSync(slackFile);

  const metrics = calculateMetrics(testResults, env);
  updateHistory(metrics, historyFile, env);
  const history = loadHistory(historyFile);

  fs.writeFileSync(dashboardPath, generateDashboardMarkdown(metrics, testResults, history, env));

  // Save detailed latest results
  fs.writeFileSync(
    path.join(resultsDir, 'latest-results.json'),
    JSON.stringify({ timestamp: new Date().toISOString(), metrics, testResults }, null, 2)
  );

  // --- SLACK PAYLOAD ---
  // Nothing sends it yet; it's ready for a step that will (see slackPayload).
  const payload = slackPayload(metrics, env);
  if (payload) fs.writeFileSync(slackFile, JSON.stringify(payload));

  console.log('✅ Dashboard generated successfully!');
  return metrics;
}

function main() {
  try {
    generate();
  } catch (err) {
    // A failed job: its commit step doesn't run, so nothing is pushed.
    console.error(`::error::${err.message}`);
    process.exitCode = 1;
  }
}

/**
 * Where a suite's results file can be, in order. The update-dashboard job
 * downloads every artifact into artifacts/: with two or more, each lands in
 * artifacts/<artifact name>/; with exactly one (a smoke-only or
 * regression-only run), its files land in artifacts/ itself. The two file
 * names differ, so the second place can't mix up the suites.
 * @param {string} artifactsDir
 * @param {'smoke'|'functional'} suite
 */
function resultFileCandidates(artifactsDir, suite) {
  return [
    path.join(artifactsDir, `${suite}-test-results`, `${suite}-results.json`),
    path.join(artifactsDir, `${suite}-results.json`),
  ];
}

/**
 * Read the CI artifacts: the smoke suite's results, and the functional
 * suite's (error handling, forms, and accessibility, in one file). The paths
 * match the artifact names and files in .github/workflows/qa-test.yml.
 * @param {string} artifactsDir
 */
function collectTestResults(artifactsDir = ARTIFACTS_DIR) {
  const results = { smoke: [], functional: [] };
  for (const suite of Object.keys(results)) {
    const file = resultFileCandidates(artifactsDir, suite).find(f => fs.existsSync(f));
    if (file) {
      console.log(`Found ${suite} results: ${file}`);
      results[suite] = parsePlaywrightJson(file);
    } else {
      console.log(`⚠️ No ${suite} results (looked in ${resultFileCandidates(artifactsDir, suite).join(' and ')})`);
    }
  }
  return results;
}

/**
 * A test's outcome from Playwright's own verdict, across all its attempts:
 * 'expected' passed first time, 'flaky' passed on a retry, 'skipped' never ran
 * (e.g. a phone-only test in a desktop project), and 'unexpected' failed.
 * @param {{status?: string, results?: {status: string}[]}} test - A test from the JSON report
 * @returns {'passed'|'flaky'|'skipped'|'failed'}
 */
function testStatus(test) {
  switch (test.status) {
    case 'expected': return 'passed';
    case 'flaky': return 'flaky';
    case 'skipped': return 'skipped';
    case 'unexpected': return 'failed';
    default: {
      // Older reports without a verdict: fall back to the last attempt.
      const last = test.results[test.results.length - 1].status;
      return last === 'passed' ? 'passed' : last === 'skipped' ? 'skipped' : 'failed';
    }
  }
}

function parsePlaywrightJson(filepath) {
  try {
    const fileContent = fs.readFileSync(filepath, 'utf8');
    if (!fileContent.trim()) return [];

    const data = JSON.parse(fileContent);
    const tests = [];

    function traverse(node) {
      if (node.specs) {
        node.specs.forEach(spec => {
          if (spec.tests) {
            spec.tests.forEach(test => {
              if (test.results && test.results.length > 0) {
                const failedAttempt = test.results.find(r => r.errors && r.errors.length > 0);
                tests.push({
                  name: spec.title || test.title || 'Unknown Test',
                  status: testStatus(test),
                  // The last attempt's time: the one that decided the
                  // verdict. Adding retries together made a test retried
                  // once look as if it hit its timeout.
                  durationSec: (test.results[test.results.length - 1].duration || 0) / 1000,
                  attempts: test.results.length,
                  allAttemptsSec: test.results.reduce((acc, r) => acc + (r.duration || 0), 0) / 1000,
                  projectName: test.projectName || 'Default',
                  error: failedAttempt ? failedAttempt.errors[0].message : null
                });
              }
            });
          }
        });
      }
      if (node.suites) node.suites.forEach(suite => traverse(suite));
    }

    traverse(data);
    return tests;
  } catch (e) {
    console.error(`✗ Error parsing ${filepath}:`, e.message);
    return [];
  }
}

function calculateMetrics(results, env = process.env) {
  const allTests = [
    ...results.smoke,
    ...results.functional
  ];

  const passed = allTests.filter(t => t.status === 'passed' || t.status === 'flaky').length;
  const flaky = allTests.filter(t => t.status === 'flaky').length;
  const skipped = allTests.filter(t => t.status === 'skipped').length;
  const failedTests = allTests.filter(t => t.status === 'failed');
  const ran = allTests.length - skipped;
  // The run's time includes every attempt, retries too.
  const totalDuration = allTests.reduce((acc, t) => acc + (t.allAttemptsSec ?? t.durationSec ?? 0), 0);

  return {
    totalTests: allTests.length,
    passed,
    flaky,
    skipped,
    failed: failedTests.length,
    // One name per failing test: a test that fails on desktop and phone is
    // one failing test, not two.
    failedTestNames: [...new Set(failedTests.map(t => t.name))],
    // Skipped tests didn't run, so they count neither for nor against.
    passRate: ran > 0 ? (passed / ran) * 100 : 0,
    totalDuration: totalDuration,
    smokeCount: results.smoke.length,
    functionalCount: results.functional.length,
    allTestObjects: allTests,
    timestamp: new Date().toISOString(),
    environment: env.TEST_ENV || 'staging',
    runId: env.GITHUB_RUN_ID || 'local',
    runNumber: env.GITHUB_RUN_NUMBER || '0',
    branch: env.GITHUB_REF?.replace('refs/heads/', '') || 'unknown'
  };
}

function updateHistory(metrics, historyFile = HISTORY_FILE, env = process.env) {
  let history = [];
  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch {
      console.warn('⚠️ Could not parse history file, starting fresh.');
    }
  }

  const runNumber = env.GITHUB_RUN_NUMBER || '0';

  const newEntry = {
    date: new Date().toISOString().split('T')[0],
    time: new Date().toISOString(),
    total: metrics.totalTests,
    passed: metrics.passed,
    failed: metrics.failed,
    passRate: metrics.passRate,
    duration: metrics.totalDuration,
    failedTestNames: metrics.failedTestNames,
    runNumber: runNumber
  };

  history = history.filter(entry => entry.runNumber !== runNumber);
  history.push(newEntry);

  if (history.length > 50) history = history.slice(-50);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function loadHistory(historyFile = HISTORY_FILE) {
  return fs.existsSync(historyFile) ? JSON.parse(fs.readFileSync(historyFile, 'utf8')) : [];
}

/**
 * The Slack alert for this run, or null when there's nothing to report: this
 * run's failures or flaky tests (passed only on retry). It looks at this run
 * alone, never at earlier ones, so a clean run never sends an old alert.
 * @param {{failed: number, flaky: number, branch: string, runId: string}} metrics
 * @param {{GITHUB_REPOSITORY?: string}} env
 */
function slackPayload(metrics, env = {}) {
  if (!(metrics.failed > 0 || metrics.flaky > 0)) return null;
  const parts = [];
  if (metrics.failed > 0) parts.push(`*${metrics.failed} failed*`);
  if (metrics.flaky > 0) parts.push(`*${metrics.flaky} flaky*`);
  const runUrl = `https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${metrics.runId}`;
  return {
    text: `QA alert: ${metrics.failed} failed, ${metrics.flaky} flaky on ${metrics.branch}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚨 QA alert: ${parts.join(', ')} on \`${metrics.branch}\`\n<${runUrl}|View the run>`,
        },
      },
    ],
  };
}

// --- MARKDOWN GENERATION ---

function generateDashboardMarkdown(metrics, results, history, runEnv = process.env) {
  const env = (metrics.environment || 'staging').toUpperCase();
  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' });
  const durationText = `${formatDuration(metrics.totalDuration)}`;

  return `# 📊 QA Metrics Dashboard

> **Automated Quality Gate Report**

**Last Updated:** ${timestamp} | **Env:** ${env} | **Branch:** ${metrics.branch}
**Run:** [#${metrics.runNumber}](https://github.com/${runEnv.GITHUB_REPOSITORY}/actions/runs/${metrics.runId})

---

## 🎯 Executive Summary

| Metric | Current Value | Status |
|--------|---------------|----------------|
| **Pass Rate** | **${metrics.passRate.toFixed(1)}%** | ${getPassRateStatus(metrics.passRate)} |
| **Duration** | **${durationText}** | ${metrics.totalDuration > QUALITY_GATES.MAX_DURATION_SEC ? '⚠️ Long' : '✅ Good'} |
| **Total Tests** | ${metrics.totalTests} | ${metrics.passed} Pass (${metrics.flaky} flaky) / ${metrics.failed} Fail / ${metrics.skipped} Skipped |
| **Functional** | ${results.functional.length} Tests | ${results.functional.length > 0 ? '✅ Active' : '❌ Missing'} |

---

${generateBrowserBreakdown(metrics.allTestObjects)}

---

## 🔍 Detailed Test Results

### 🔥 Smoke Tests
${generateTestTable(results.smoke)}

### 🧩 Functional Tests
${generateTestTable(results.functional)}

---

## 📈 History (Last 10 Runs)
| Date | Pass Rate | Duration | Failures |
|------|-----------|----------|----------|
${generateHistoryTable(history.slice(-10))}

---
`;
}

// --- HELPER FUNCTIONS ---

function generateBrowserBreakdown(allTests) {
  if (!allTests || allTests.length === 0) return '';
  const browsers = {};
  allTests.forEach(t => {
    const p = t.projectName || 'Default';
    if (!browsers[p]) browsers[p] = { total: 0, passed: 0 };
    if (t.status === 'skipped') return;
    browsers[p].total++;
    if (t.status === 'passed' || t.status === 'flaky') browsers[p].passed++;
  });
  const keys = Object.keys(browsers);
  if (keys.length < 2 && keys[0] === 'Default') return '';
  let section = '### 🌐 Browser Breakdown\n\n| Project | Pass Rate | Status |\n|---|---|---|\n';
  keys.forEach(b => {
    const rate = (browsers[b].passed / browsers[b].total) * 100;
    const icon = rate >= 98 ? '🟢' : (rate >= 90 ? '🟡' : '🔴');
    section += `| **${b}** | ${rate.toFixed(1)}% | ${icon} |\n`;
  });
  return section;
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(0);
  return `${m}m ${s}s`;
}

function getPassRateStatus(passRate) {
  if (passRate >= 98) return '🟢 Excellent';
  if (passRate >= 90) return '🟡 Good';
  return '🔴 Attention';
}

function generateTestTable(tests) {
  if (!tests || tests.length === 0) return '> *No tests found in this category* \n';
  const icons = { passed: '✅', flaky: '⚠️', skipped: '⏭️', failed: '❌' };
  let table = '| Test Name | Status | Duration | Project |\n|-----------|--------|----------|---------|\n';
  tests.forEach(test => {
    const statusIcon = icons[test.status] || '❌';
    const dur = (test.durationSec < 1 ? '<1s' : `${test.durationSec.toFixed(1)}s`) + (test.attempts > 1 ? ` ×${test.attempts}` : '');
    table += `| ${test.name} | ${statusIcon} ${test.status} | ${dur} | ${test.projectName} |\n`;
  });
  return table;
}

function generateHistoryTable(history) {
  if (!history || history.length === 0) return '*No history yet*';
  return history.reverse().map(entry => {
    const date = new Date(entry.time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dur = formatDuration(entry.duration);
    const passRate = parseFloat(entry.passRate).toFixed(1);
    return `| ${date} | ${passRate}% | ${dur} | ${entry.failed} |`;
  }).join('\n');
}

// Run when invoked as a command, not when imported (the unit tests import it).
// realpath on both sides, so a symlinked path (macOS /tmp) still matches.
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  main();
}

export { testStatus, parsePlaywrightJson, calculateMetrics, slackPayload, collectTestResults, generate };
