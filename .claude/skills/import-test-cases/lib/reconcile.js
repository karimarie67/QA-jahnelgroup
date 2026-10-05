/**
 * reconcile.js
 *
 * Cross-references a parsed `cases.json` against GitHub issues and the
 * coverage map's collected tests, for traceability.
 *
 * Without `final`, a case's issue may still be `test-needs-automation` (its
 * test is in an open PR). With `final` (step 10, after every batch has
 * merged), each non-stale, non-covered case must also have its story
 * recorded, and each automatable or partly-automatable case must be
 * `test-automated` with its test recorded, so a skipped relabel (step 9)
 * cannot pass.
 */
import { countBuckets } from './report.js';

const LABELS = ['test-manual', 'test-automated', 'test-needs-automation'];

function label(c) {
  return `${c.client_id ?? '(no client_id)'} (row ${c.source_row})`;
}

/**
 * @param {object} casesFile - the parsed `cases.json` document
 * @param {{number: number, title: string, labels: {name: string}[], state: string}[]} issues
 *   `gh issue list --state all --json number,title,labels,state` output
 * @param {{testCase: string|null, clientCases: string[]}[]} coverageTests
 *   `collectTests()` output from `scripts/coverage-map.js`
 * @param {{final?: boolean}} [options]
 * @returns {{ok: boolean, errors: string[], counts: object}}
 */
export function reconcile(casesFile, issues, coverageTests, { final = false } = {}) {
  const cases = casesFile.cases ?? [];
  const errors = [];
  const issueByNumber = new Map(issues.map(i => [i.number, i]));

  // Rule 1: no two issues share a `[TEST CASE] <id> - ` prefix, and no two
  // share an identical `[STORY] ` title.
  const testCaseTitles = new Map();
  const storyTitles = new Map();
  for (const issue of issues) {
    const tcMatch = issue.title.match(/^\[TEST CASE\] \S+ - /);
    if (tcMatch) {
      const key = tcMatch[0];
      if (!testCaseTitles.has(key)) testCaseTitles.set(key, []);
      testCaseTitles.get(key).push(issue.number);
    }
    if (issue.title.startsWith('[STORY] ')) {
      if (!storyTitles.has(issue.title)) storyTitles.set(issue.title, []);
      storyTitles.get(issue.title).push(issue.number);
    }
  }
  for (const [prefix, numbers] of testCaseTitles) {
    if (numbers.length > 1) {
      errors.push(`duplicate test case issue title "${prefix}" on issues ${numbers.map(n => `#${n}`).join(', ')}`);
    }
  }
  for (const [title, numbers] of storyTitles) {
    if (numbers.length > 1) {
      errors.push(`duplicate story issue title "${title}" on issues ${numbers.map(n => `#${n}`).join(', ')}`);
    }
  }

  for (const c of cases) {
    const bucket = c.import?.bucket;
    if (bucket === 'stale') continue;

    const covered = Boolean(c.import?.covered_by);
    const tcid = c.import?.test_case_id;
    let issue = null;

    if (!covered) {
      // Rule 2: has import.issue, that issue exists, its title starts with
      // `[TEST CASE] <test_case_id> - `.
      const issueNumber = c.import?.issue;
      if (!issueNumber) {
        errors.push(`${label(c)}: missing import.issue`);
      } else {
        issue = issueByNumber.get(issueNumber);
        if (!issue) {
          errors.push(`${label(c)}: import.issue #${issueNumber} does not exist`);
        } else {
          const expectedPrefix = `[TEST CASE] ${tcid} - `;
          if (!issue.title.startsWith(expectedPrefix)) {
            errors.push(`${label(c)}: issue #${issueNumber} title does not start with "${expectedPrefix}"`);
          }
        }
      }

      // Rule 3: bucket vs label, and never two automation labels at once (the
      // Test Case form applies `test-manual` by default, so an issue made on
      // the web and relabelled by hand can end up with both).
      if (issue) {
        const issueLabels = (issue.labels ?? []).map(l => l.name);
        const automationLabels = LABELS.filter(l => issueLabels.includes(l));
        if (automationLabels.length > 1) {
          errors.push(`${label(c)}: issue #${issue.number} has conflicting labels ${automationLabels.join(', ')}; keep exactly one`);
        }
        if (bucket === 'manual' && !issueLabels.includes('test-manual')) {
          errors.push(`${label(c)}: issue #${issue.number} missing label test-manual`);
        }
        if (
          (bucket === 'automatable' || bucket === 'partly-automatable') &&
          !issueLabels.includes('test-automated') &&
          !issueLabels.includes('test-needs-automation')
        ) {
          errors.push(`${label(c)}: issue #${issue.number} missing label test-automated or test-needs-automation`);
        }
      }
    }

    // Rule 4: a case whose issue is labelled test-automated, and every
    // covered case, has a matching coverage test.
    const issueLabels = issue ? (issue.labels ?? []).map(l => l.name) : [];

    // Final: everything created in step 6 is recorded, and everything
    // automatable is relabelled test-automated with its test recorded.
    if (final && !covered) {
      if (!c.import?.story) {
        errors.push(`${label(c)}: missing import.story`);
      }
      if (bucket === 'automatable' || bucket === 'partly-automatable') {
        if (issue && !issueLabels.includes('test-automated')) {
          errors.push(`${label(c)}: issue #${issue.number} must be labelled test-automated once its test has merged`);
        }
        if (!c.import?.test) {
          errors.push(`${label(c)}: missing import.test`);
        }
      }
    }
    const needsCoverageTest = covered || issueLabels.includes('test-automated');
    if (needsCoverageTest) {
      const test = coverageTests.find(t => t.testCase === tcid);
      if (!test) {
        errors.push(`${label(c)}: no coverage test for ${tcid}`);
      } else if (c.client_id !== tcid && !(test.clientCases ?? []).includes(c.client_id)) {
        errors.push(`${label(c)}: coverage test for ${tcid} is missing client_case ${c.client_id}`);
      }
    }
  }

  // Rule 5: no coverage test's testCase or clientCases refers to a stale
  // case's client_id.
  const staleClientIds = new Set(cases.filter(c => c.import?.bucket === 'stale').map(c => c.client_id).filter(Boolean));
  for (const test of coverageTests) {
    if (test.testCase && staleClientIds.has(test.testCase)) {
      errors.push(`coverage test ${test.testCase} refers to stale case ${test.testCase}`);
    }
    for (const clientCase of test.clientCases ?? []) {
      if (staleClientIds.has(clientCase)) {
        errors.push(`coverage test ${test.testCase ?? '(no test case)'} refers to stale client case ${clientCase}`);
      }
    }
  }

  const counts = countBuckets(cases);
  const referencedIssueNumbers = new Set(cases.map(c => c.import?.issue).filter(Boolean));
  const issuesByLabel = Object.fromEntries(LABELS.map(l => [l, 0]));
  for (const issue of issues) {
    if (!referencedIssueNumbers.has(issue.number)) continue;
    for (const l of issue.labels ?? []) {
      if (LABELS.includes(l.name)) issuesByLabel[l.name]++;
    }
  }
  counts.issues_by_label = issuesByLabel;

  return { ok: errors.length === 0, errors, counts };
}
