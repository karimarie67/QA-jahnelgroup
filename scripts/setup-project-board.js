#!/usr/bin/env node
/**
 * setup-project-board.js
 *
 * Creates (or reuses) the Engagement's GitHub project board and makes its
 * Status field match the lifecycle in docs/agents/issue-tracker.md, so the
 * board can't drift from the policy agents follow. Safe to rerun.
 *
 *   1. Find a project with the given title under the repo's owner, or create it.
 *   2. Set the Status field's options to the "## States" table of
 *      docs/agents/issue-tracker.md, in order, with each meaning as its description.
 *   3. Link the project to the repo.
 *   4. Print each state's option id. The ids of the human-only states belong in
 *      .atlas/manifest.json `human_only_state_ids` (a guardrail change: see
 *      docs/agents/guardrails.md).
 *
 * Needs the gh CLI with the `project` scope: gh auth refresh -h github.com -s project
 *
 * Usage: node scripts/setup-project-board.js <owner/repo> [--title "Board title"]
 *        (the title defaults to the repo name)
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..');
const COLORS = ['GRAY', 'BLUE', 'YELLOW', 'PURPLE', 'GREEN', 'ORANGE', 'PINK', 'RED'];

/**
 * Read the lifecycle states from issue-tracker.md's "## States" table and its
 * "Human-only states:" line.
 * @param {string} markdown - Contents of docs/agents/issue-tracker.md
 * @returns {{states: {name: string, meaning: string}[], humanOnly: string[]}}
 */
export function parseStates(markdown) {
  const section = markdown.split(/^## States\s*$/m)[1];
  if (!section) throw new Error('issue-tracker.md has no "## States" section');
  const body = section.split(/^## /m)[0];
  const states = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*$/);
    if (m) states.push({ name: m[1], meaning: m[2] });
  }
  if (!states.length) throw new Error('the "## States" table in issue-tracker.md has no rows');
  const humanLine = body.match(/^Human-only states:\s*(.+)$/m);
  const humanOnly = humanLine ? [...humanLine[1].matchAll(/`([^`]+)`/g)].map(m => m[1]) : [];
  return { states, humanOnly };
}

/**
 * The singleSelectOptions input for updateProjectV2Field.
 * @param {{name: string, meaning: string}[]} states - Parsed states
 * @returns {{name: string, color: string, description: string}[]}
 */
export function statusOptions(states) {
  return states.map((s, i) => ({ name: s.name, color: COLORS[i % COLORS.length], description: s.meaning }));
}

function gh(args, { json = true, allowFail = false } = {}) {
  const result = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 * 20 });
  if (result.status !== 0 && !allowFail) {
    console.error(`FAIL: gh ${args.join(' ')}`);
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  if (result.status !== 0) return { failed: true, stderr: result.stderr };
  return json ? JSON.parse(result.stdout) : result.stdout;
}

function main() {
  const [repo, ...rest] = process.argv.slice(2);
  if (!repo || !repo.includes('/')) {
    console.error('Usage: node scripts/setup-project-board.js <owner/repo> [--title "Board title"]');
    process.exit(2);
  }
  const owner = repo.split('/')[0];
  const titleFlag = rest.indexOf('--title');
  const title = titleFlag >= 0 ? rest[titleFlag + 1] : repo.split('/')[1];
  if (!title) {
    console.error('Usage: node scripts/setup-project-board.js <owner/repo> [--title "Board title"]');
    process.exit(2);
  }

  const { states, humanOnly } = parseStates(
    fs.readFileSync(path.join(repoRoot, 'docs', 'agents', 'issue-tracker.md'), 'utf8')
  );

  // 1. Find or create the project.
  const existing = gh(['project', 'list', '--owner', owner, '--limit', '100', '--format', 'json'])
    .projects.find(p => p.title === title);
  const project = existing || gh(['project', 'create', '--owner', owner, '--title', title, '--format', 'json']);
  console.log(`${existing ? 'Reusing' : 'Created'} project #${project.number} "${title}": ${project.url}`);

  // 2. Make the Status field match issue-tracker.md.
  const status = gh(['project', 'field-list', String(project.number), '--owner', owner, '--format', 'json'])
    .fields.find(f => f.name === 'Status');
  if (!status) {
    console.error('FAIL: the project has no Status field');
    process.exit(1);
  }
  const current = (status.options || []).map(o => o.name);
  let options = status.options || [];
  if (JSON.stringify(current) !== JSON.stringify(states.map(s => s.name))) {
    const query = `mutation($field: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]) {
      updateProjectV2Field(input: { fieldId: $field, singleSelectOptions: $options }) {
        projectV2Field { ... on ProjectV2SingleSelectField { options { id name } } }
      }
    }`;
    const payload = JSON.stringify({ query, variables: { field: status.id, options: statusOptions(states) } });
    const result = spawnSync('gh', ['api', 'graphql', '--input', '-'], { input: payload, encoding: 'utf8' });
    if (result.status !== 0) {
      console.error('FAIL: could not update the Status field options');
      console.error(result.stderr || result.stdout);
      process.exit(1);
    }
    options = JSON.parse(result.stdout).data.updateProjectV2Field.projectV2Field.options;
    console.log(`Set Status options: ${options.map(o => o.name).join(' → ')}`);
  } else {
    console.log(`Status options already match: ${current.join(' → ')}`);
  }

  // 3. Link it to the repo (a repeat link is harmless).
  const link = gh(['project', 'link', String(project.number), '--owner', owner, '--repo', repo], { json: false, allowFail: true });
  console.log(link.failed ? `Link to ${repo}: ${link.stderr.trim()}` : `Linked to ${repo}`);

  // 4. Report option ids.
  console.log('\nStatus option ids:');
  for (const o of options) {
    console.log(`  ${o.name.padEnd(12)} ${o.id}${humanOnly.includes(o.name) ? '   (human-only)' : ''}`);
  }
  console.log('\nThe board opens as a table. To see columns, add a Board view grouped by Status in the web UI;');
  console.log("GitHub's API can't create views.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main();
}
