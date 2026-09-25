/**
 * report.js
 *
 * Human-readable Markdown summary of a `cases.json` import.
 */

const BUCKETS = ['automatable', 'partly-automatable', 'manual', 'stale'];

/**
 * Count cases per import bucket.
 * @param {object[]} cases
 * @returns {{automatable: number, 'partly-automatable': number, manual: number, stale: number, total: number}}
 */
export function countBuckets(cases) {
  const counts = { automatable: 0, 'partly-automatable': 0, manual: 0, stale: 0, total: cases.length };
  for (const c of cases) {
    const bucket = c.import?.bucket;
    if (bucket && bucket in counts) counts[bucket]++;
  }
  return counts;
}

/** Escape Markdown table pipes. */
function cell(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replace(/\|/g, '\\|');
}

/** Render a linked-or-plain issue number cell. */
function issueCell(number) {
  return number ? `#${number}` : '—';
}

/**
 * Render the Markdown import report for a parsed `cases.json`.
 * @param {object} casesFile - the parsed `cases.json` document
 * @returns {string} Markdown
 */
export function renderReport(casesFile) {
  const cases = casesFile.cases ?? [];
  const counts = countBuckets(cases);
  const automated = counts.automatable + counts['partly-automatable'];

  const lines = [
    `## Import report: ${casesFile.source_file}`,
    '',
    `${automated} of ${counts.total} automated, ${counts['partly-automatable']} partly automated, ${counts.manual} manual, ${counts.stale} stale`,
    '',
    '| Bucket | Count |',
    '|---|---|',
    ...BUCKETS.map(bucket => `| ${bucket} | ${counts[bucket]} |`),
    '',
  ];

  const reasons = cases.filter(c => c.import?.bucket === 'manual' || c.import?.bucket === 'partly-automatable');
  lines.push('| Client ID | Bucket | Reason |', '|---|---|---|');
  for (const c of reasons) {
    lines.push(`| ${cell(c.client_id)} | ${cell(c.import.bucket)} | ${cell(c.import.reason)} |`);
  }
  lines.push('');

  const stale = cases.filter(c => c.import?.bucket === 'stale');
  lines.push('| Client ID | Missing | Outcome | Finding issue |', '|---|---|---|---|');
  for (const c of stale) {
    lines.push(
      `| ${cell(c.client_id)} | ${cell(c.import.stale?.missing)} | ${cell(c.import.stale?.outcome)} | ${issueCell(c.import.stale?.finding_issue)} |`,
    );
  }
  lines.push('');

  const traceability = cases.filter(c => c.import?.bucket !== 'stale');
  lines.push('| Client case | Test case | Issue | Test |', '|---|---|---|---|');
  for (const c of traceability) {
    lines.push(
      `| ${cell(c.client_id)} | ${cell(c.import.test_case_id)} | ${issueCell(c.import.issue)} | ${cell(c.import.test)} |`,
    );
  }

  return lines.join('\n');
}
