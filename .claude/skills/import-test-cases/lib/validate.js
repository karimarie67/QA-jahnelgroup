/**
 * validate.js
 *
 * Structural checks on a set of normalised, bucketed cases (the `cases`
 * array of `cases.json`), independent of GitHub or the coverage map. See
 * `reconcile.js` for the checks that cross-reference issues and tests.
 */
import { TC_ID } from './ids.js';

const BUCKETS = ['automatable', 'partly-automatable', 'manual', 'stale'];

function label(c) {
  return `${c.client_id ?? '(no client_id)'} (row ${c.source_row})`;
}

/**
 * Validate a set of normalised, bucketed cases.
 * @param {object[]} cases
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validate(cases) {
  const errors = [];

  // Rule 1: import.bucket is one of the four values (never null).
  for (const c of cases) {
    if (!BUCKETS.includes(c.import?.bucket)) {
      errors.push(`${label(c)}: import.bucket must be one of ${BUCKETS.join(', ')}, got ${JSON.stringify(c.import?.bucket ?? null)}`);
    }
  }

  // Rule 2: client_id values are unique and non-null.
  const seenClientIds = new Map();
  for (const c of cases) {
    if (!c.client_id) {
      errors.push(`${label(c)}: client_id is required`);
      continue;
    }
    if (seenClientIds.has(c.client_id)) {
      errors.push(`${label(c)}: client_id "${c.client_id}" duplicates row ${seenClientIds.get(c.client_id)}`);
    } else {
      seenClientIds.set(c.client_id, c.source_row);
    }
  }

  // Rule 3: manual and partly-automatable need a non-empty import.reason.
  for (const c of cases) {
    if ((c.import?.bucket === 'manual' || c.import?.bucket === 'partly-automatable') && !c.import?.reason) {
      errors.push(`${label(c)}: ${c.import.bucket} requires import.reason`);
    }
  }

  // Rule 4: stale needs import.stale.missing non-empty, and import.test,
  // import.covered_by, import.test_case_id all null.
  for (const c of cases) {
    if (c.import?.bucket !== 'stale') continue;
    if (!c.import?.stale?.missing) {
      errors.push(`${label(c)}: stale requires import.stale.missing`);
    }
    if (c.import?.test !== null || c.import?.covered_by !== null || c.import?.test_case_id !== null) {
      errors.push(`${label(c)}: stale forbids import.test, import.covered_by, and import.test_case_id`);
    }
  }

  // Rule 5: a non-null test_case_id matches TC_ID; when client_id matches
  // TC_ID and the case is not covered, test_case_id === client_id. A stale
  // case is exempt from the client_id agreement half of this rule, since
  // Rule 4 already requires its test_case_id to be null.
  for (const c of cases) {
    const tcid = c.import?.test_case_id ?? null;
    if (tcid !== null && !TC_ID.test(tcid)) {
      errors.push(`${label(c)}: import.test_case_id "${tcid}" does not match ${TC_ID}`);
    }
    if (
      c.import?.bucket !== 'stale' &&
      c.client_id &&
      TC_ID.test(c.client_id) &&
      !c.import?.covered_by &&
      tcid !== c.client_id
    ) {
      errors.push(`${label(c)}: import.test_case_id must equal client_id "${c.client_id}"`);
    }
  }

  // Rule 6: when covered_by is set, test_case_id === covered_by;
  // covered_by only on automatable or partly-automatable.
  for (const c of cases) {
    if (!c.import?.covered_by) continue;
    if (c.import.test_case_id !== c.import.covered_by) {
      errors.push(`${label(c)}: import.test_case_id must equal import.covered_by "${c.import.covered_by}"`);
    }
    if (!['automatable', 'partly-automatable'].includes(c.import.bucket)) {
      errors.push(`${label(c)}: import.covered_by only allowed on automatable or partly-automatable`);
    }
  }

  // Rule 7: non-covered test_case_id values are unique.
  const seenTestCaseIds = new Map();
  for (const c of cases) {
    const tcid = c.import?.test_case_id;
    if (!tcid || c.import?.covered_by) continue;
    if (seenTestCaseIds.has(tcid)) {
      errors.push(`${label(c)}: test_case_id "${tcid}" duplicates row ${seenTestCaseIds.get(tcid)}`);
    } else {
      seenTestCaseIds.set(tcid, c.source_row);
    }
  }

  return { ok: errors.length === 0, errors };
}
