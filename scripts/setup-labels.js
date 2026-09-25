#!/usr/bin/env node
/**
 * setup-labels.js
 *
 * Creates the labels an Engagement repo needs, so no issue form or triage
 * step points at a label that doesn't exist. (GitHub quietly drops a form's
 * label when the repo doesn't have it.) Safe to rerun.
 *
 * The labels come from the repo itself, so the list can't drift from it:
 *   1. The test-management labels (docs/github_test_management.md).
 *   2. The triage labels in docs/agents/triage-labels.md's table.
 *   3. Every label an issue form in .github/ISSUE_TEMPLATE/ applies.
 *
 * It only creates labels that are missing. It never changes or deletes an
 * existing label, including GitHub's defaults (bug, enhancement, ...).
 *
 * Usage: node scripts/setup-labels.js <owner/repo> [--dry-run]
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');

// Colors and descriptions for the labels this Framework defines. A label found
// only on an issue form, and not listed here, gets a neutral color.
export const KNOWN_LABELS = {
  'user-story': { color: '0e8a16', description: 'Source ticket describing a feature and its acceptance criteria' },
  'test-case': { color: '5319e7', description: 'Manual test case derived from a user story' },
  'test-manual': { color: '17a2b8', description: 'Test case executed manually; not yet automated' },
  'test-needs-automation': { color: 'ffc107', description: 'Manual test case approved for automation' },
  'test-automated': { color: '28a745', description: 'Test case automated in Playwright' },
  qa: { color: '1d76db', description: 'Finding from QA testing' },
  'needs-triage': { color: 'fbca04' },
  'needs-info': { color: 'd876e3' },
  'ready-for-agent': { color: '0e8a16' },
  'ready-for-human': { color: '1d76db' },
};

export const TEST_MANAGEMENT_LABELS = ['user-story', 'test-case', 'test-manual', 'test-needs-automation', 'test-automated'];

/**
 * Read the triage labels from triage-labels.md: the backticked name in the
 * table's second column ("Label in our tracker") and the third column's meaning.
 * @param {string} markdown - Contents of docs/agents/triage-labels.md
 * @returns {{name: string, description: string}[]}
 */
export function parseTriageLabels(markdown) {
  const labels = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(/^\|\s*`[^`]+`\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) labels.push({ name: m[1], description: m[2] });
  }
  if (!labels.length) throw new Error('triage-labels.md has no label table rows');
  return labels;
}

/**
 * Read the labels an issue form applies: its top-level `labels: [...]` line.
 * @param {string} yaml - Contents of one .github/ISSUE_TEMPLATE/*.yml file
 * @returns {string[]}
 */
export function parseFormLabels(yaml) {
  const m = yaml.match(/^labels:\s*\[(.*)\]\s*$/m);
  if (!m) return [];
  return m[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

/**
 * Every label the repo needs, once each, with why it's needed.
 * @param {{triage: {name: string, description: string}[], forms: {file: string, labels: string[]}[]}} sources
 * @returns {{name: string, color: string, description: string, why: string}[]}
 */
export function plannedLabels({ triage, forms }) {
  const planned = new Map();
  const add = (name, why, description) => {
    if (planned.has(name)) {
      planned.get(name).why += `; ${why}`;
      return;
    }
    const known = KNOWN_LABELS[name] || {};
    planned.set(name, {
      name,
      color: known.color || 'ededed',
      description: known.description || description || '',
      why,
    });
  };
  for (const name of TEST_MANAGEMENT_LABELS) add(name, 'test management');
  for (const { name, description } of triage) add(name, 'triage', description);
  for (const { file, labels } of forms) {
    for (const name of labels) add(name, `applied by ${file}`, `Applied by the ${file} issue form`);
  }
  return [...planned.values()];
}

function gh(args) {
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  if (result.status !== 0) {
    console.error(`FAIL: gh ${args.join(' ')}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  return result.stdout;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const repo = args.find(a => !a.startsWith('--'));
  if (!repo || !repo.includes('/')) {
    console.error('Usage: node scripts/setup-labels.js <owner/repo> [--dry-run]');
    process.exit(2);
  }

  const formsDir = path.join(repoRoot, '.github', 'ISSUE_TEMPLATE');
  const forms = fs.readdirSync(formsDir)
    .filter(f => /\.ya?ml$/.test(f) && f !== 'config.yml')
    .sort()
    .map(file => ({ file, labels: parseFormLabels(fs.readFileSync(path.join(formsDir, file), 'utf8')) }));
  const triage = parseTriageLabels(fs.readFileSync(path.join(repoRoot, 'docs', 'agents', 'triage-labels.md'), 'utf8'));
  const labels = plannedLabels({ triage, forms });

  const existing = new Set(JSON.parse(gh(['label', 'list', '--repo', repo, '--limit', '500', '--json', 'name'])).map(l => l.name));
  let created = 0;
  for (const label of labels) {
    if (existing.has(label.name)) {
      console.log(`  exists   ${label.name.padEnd(22)} (${label.why})`);
      continue;
    }
    if (!dryRun) {
      gh(['label', 'create', label.name, '--repo', repo, '--color', label.color, '--description', label.description]);
    }
    created++;
    console.log(`  ${dryRun ? 'would add' : 'created'} ${label.name.padEnd(22)} (${label.why})`);
  }
  console.log(`\n${created} ${dryRun ? 'to create' : 'created'}, ${labels.length - created} already there.`);
  if (!dryRun) console.log('Every label an issue form or triage step applies now exists.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
