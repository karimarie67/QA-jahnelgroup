/**
 * validate.js
 *
 * Structural checks on a set of normalised, bucketed cases (the `cases`
 * array of `cases.json`), independent of GitHub or the coverage map. See
 * `reconcile.js` for the checks that cross-reference issues and tests.
 *
 * Checks run in stages, because some can only be true at certain points of
 * the import:
 *
 * - `probe` - step 2's promise only: every case has a probe note.
 * - `triage` - what steps 2 and 3 promise: every case probed and bucketed,
 *   reasons given, stale cases with an outcome. Needs no test case IDs.
 * - `full` (default) - the ID and bucket rules that step 5 needs, once
 *   `assign-ids` has run. Rules 5 and 6 need assigned IDs, so `full` cannot
 *   pass before step 5.
 * - `all` - both.
 */
import { TC_ID } from './ids.js';

const BUCKETS = ['automatable', 'partly-automatable', 'manual', 'stale'];
export const STALE_OUTCOMES = ['question', 'finding'];
export const STAGES = ['probe', 'triage', 'full', 'all'];

function label(c) {
  return `${c.client_id ?? '(no client_id)'} (row ${c.source_row})`;
}

function isBlank(value) {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

// Rule 1: import.bucket is one of the four values (never null).
function ruleBucket(cases) {
  const errors = [];
  for (const c of cases) {
    if (!BUCKETS.includes(c.import?.bucket)) {
      errors.push(`${label(c)}: import.bucket must be one of ${BUCKETS.join(', ')}, got ${JSON.stringify(c.import?.bucket ?? null)}`);
    }
  }
  return errors;
}

// Rule 2: client_id values are unique and non-null.
function ruleClientIds(cases) {
  const errors = [];
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
  return errors;
}

// Rule 3: manual and partly-automatable need a non-empty import.reason.
function ruleReason(cases) {
  const errors = [];
  for (const c of cases) {
    if ((c.import?.bucket === 'manual' || c.import?.bucket === 'partly-automatable') && !c.import?.reason) {
      errors.push(`${label(c)}: ${c.import.bucket} requires import.reason`);
    }
  }
  return errors;
}

// Rule 4: stale needs import.stale.missing non-empty, and import.test,
// import.covered_by, import.test_case_id all null.
function ruleStale(cases) {
  const errors = [];
  for (const c of cases) {
    if (c.import?.bucket !== 'stale') continue;
    if (!c.import?.stale?.missing) {
      errors.push(`${label(c)}: stale requires import.stale.missing`);
    }
    if (c.import?.test !== null || c.import?.covered_by !== null || c.import?.test_case_id !== null) {
      errors.push(`${label(c)}: stale forbids import.test, import.covered_by, and import.test_case_id`);
    }
  }
  return errors;
}

// Rule 5: a non-null test_case_id matches TC_ID; when client_id matches
// TC_ID and the case is not covered, test_case_id === client_id. A stale
// case is exempt from the client_id agreement half of this rule, since
// Rule 4 already requires its test_case_id to be null.
function ruleTestCaseIdShape(cases) {
  const errors = [];
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
  return errors;
}

// Rule 6: when covered_by is set, test_case_id === covered_by;
// covered_by only on automatable or partly-automatable.
function ruleCoveredBy(cases) {
  const errors = [];
  for (const c of cases) {
    if (!c.import?.covered_by) continue;
    if (c.import.test_case_id !== c.import.covered_by) {
      errors.push(`${label(c)}: import.test_case_id must equal import.covered_by "${c.import.covered_by}"`);
    }
    if (!['automatable', 'partly-automatable'].includes(c.import.bucket)) {
      errors.push(`${label(c)}: import.covered_by only allowed on automatable or partly-automatable`);
    }
  }
  return errors;
}

// Rule 7: non-covered test_case_id values are unique.
function ruleUniqueTestCaseIds(cases) {
  const errors = [];
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
  return errors;
}

// Rule 8 (triage): every case has a probe note, step 2's "Done when".
function ruleProbe(cases) {
  const errors = [];
  for (const c of cases) {
    if (isBlank(c.import?.probe)) {
      errors.push(`${label(c)}: import.probe is required (record what the probe saw)`);
    }
  }
  return errors;
}

// Rule 9 (triage): a stale case has an outcome, step 4's "Done when". A
// question to the client carries its text; a finding carries its issue.
function ruleStaleOutcome(cases) {
  const errors = [];
  for (const c of cases) {
    if (c.import?.bucket !== 'stale') continue;
    const stale = c.import?.stale ?? {};
    if (!STALE_OUTCOMES.includes(stale.outcome)) {
      errors.push(`${label(c)}: stale requires import.stale.outcome, one of ${STALE_OUTCOMES.join(', ')}, got ${JSON.stringify(stale.outcome ?? null)}`);
      continue;
    }
    if (stale.outcome === 'question' && isBlank(stale.question)) {
      errors.push(`${label(c)}: a stale case raised as a question requires import.stale.question`);
    }
    if (stale.outcome === 'finding' && !Number.isInteger(stale.finding_issue)) {
      errors.push(`${label(c)}: a stale case filed as a finding requires import.stale.finding_issue (an issue number)`);
    }
  }
  return errors;
}

const PROBE_RULES = [ruleClientIds, ruleProbe];
const TRIAGE_RULES = [ruleBucket, ruleClientIds, ruleReason, ruleStale, ruleProbe, ruleStaleOutcome];
const FULL_RULES = [
  ruleBucket,
  ruleClientIds,
  ruleReason,
  ruleStale,
  ruleTestCaseIdShape,
  ruleCoveredBy,
  ruleUniqueTestCaseIds,
];

/**
 * Validate a set of normalised, bucketed cases.
 * @param {object[]} cases
 * @param {{stage?: 'probe'|'triage'|'full'|'all'}} [options] `full` by default
 * @returns {{ok: boolean, errors: string[]}}
 */
export function validate(cases, { stage = 'full' } = {}) {
  if (!STAGES.includes(stage)) {
    throw new Error(`Unknown validation stage "${stage}". Use one of: ${STAGES.join(', ')}`);
  }
  const byStage = { probe: PROBE_RULES, triage: TRIAGE_RULES, full: FULL_RULES, all: [...TRIAGE_RULES, ...FULL_RULES] };
  const rules = byStage[stage];
  const errors = [...new Set(rules.flatMap(rule => rule(cases)))];
  return { ok: errors.length === 0, errors };
}
