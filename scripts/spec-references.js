/**
 * spec-references.js
 *
 * Finds spec paths that `package.json`'s scripts or the CI workflow name but
 * that don't exist. When an Engagement removes a skeleton spec (step 3 of
 * new-engagement), the npm script and CI job for it are easy to leave behind:
 * every Engagement so far did. `scripts/test-skeleton.js` names the skeleton
 * specs too. `scripts/template-check.js` runs this and fails
 * on any it finds.
 */

import fs from 'node:fs';
import path from 'node:path';

const SPEC_PATH = /tests\/[\w./-]+?\.spec\.js/g;

/** Every `tests/….spec.js` path named in a piece of text, once each. */
export function specPathsIn(text) {
  return [...new Set(String(text).match(SPEC_PATH) || [])];
}

/**
 * @param {string} repoRoot
 * @param {string[]} [files] - repo-relative files to read; missing ones are skipped
 * @returns {{file: string, spec: string}[]} the references to specs that don't exist
 */
export function findMissingSpecReferences(repoRoot, files = ['package.json', '.github/workflows/qa-test.yml', 'scripts/test-skeleton.js']) {
  const missing = [];
  for (const file of files) {
    const full = path.join(repoRoot, file);
    if (!fs.existsSync(full)) continue;
    for (const spec of specPathsIn(fs.readFileSync(full, 'utf8'))) {
      if (!fs.existsSync(path.join(repoRoot, spec))) missing.push({ file, spec });
    }
  }
  return missing;
}
