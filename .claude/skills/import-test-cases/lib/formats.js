/**
 * formats.js
 *
 * Built-in column maps for known test-tool CSV exports, and detection of
 * which one (if any) a header row matches. See
 * `tests/unit/fixtures/import/SOURCES.md` for the full research trail
 * behind each map (vendor doc URLs, access date, and what was and was not
 * directly confirmed).
 */

/**
 * TestRail (Test Case (Text) template).
 *
 * Verified 2026-09-25 against:
 * - "Test case fields" (default fields Title, Section, Priority):
 *   https://support.testrail.com/hc/en-us/articles/14940939006740-Test-case-fields
 * - "Test case templates" (Preconditions, Steps, Expected Result field
 *   names on the Text template):
 *   https://support.testrail.com/hc/en-us/articles/14927678348052-Test-case-templates
 * - "Export test cases" (CSV export exists and offers an "Include
 *   separated steps on separate rows" option, i.e. the multi-row layout
 *   this map's continuation-row fixture exercises):
 *   https://support.testrail.com/hc/en-us/articles/15144643126932-Export-test-cases
 * - "Import test cases from CSV or Excel" (confirms the multi-row layout
 *   mechanism: one row per step, new case detected by a unique column):
 *   https://support.testrail.com/hc/en-us/articles/7101779988372-Import-test-cases-from-CSV-or-Excel
 * - The article's own downloadable sample export, `reference.csv`
 *   (confirms the literal `ID,Title,...,Priority,...,Section,...` header
 *   text for a case exported without the Steps template):
 *   https://support.testrail.com/hc/en-us/article_attachments/15150901396884
 *
 * Not directly confirmed: the literal header text TestRail's CSV export
 * uses for the *per-row* Step/Expected Result columns when "Include
 * separated steps on separate rows" is checked (the downloadable
 * `reference.csv` sample happened to use a project with no populated
 * steps). This map uses the Text template's field names ("Steps",
 * "Expected Result") for those columns, consistent with the "Test case
 * templates" article.
 */
const TESTRAIL = {
  name: 'testrail',
  signature: ['ID', 'Title', 'Preconditions', 'Steps', 'Expected Result', 'Priority', 'Section'],
  column_map: {
    client_id: 'ID',
    title: 'Title',
    objective: null,
    preconditions: 'Preconditions',
    steps: 'Steps',
    expected: 'Expected Result',
    section: 'Section',
    priority: 'Priority',
    notes: null,
  },
  source:
    'https://support.testrail.com/hc/en-us/articles/14940939006740-Test-case-fields ; ' +
    'https://support.testrail.com/hc/en-us/articles/14927678348052-Test-case-templates ; ' +
    'https://support.testrail.com/hc/en-us/articles/15144643126932-Export-test-cases ; ' +
    'https://support.testrail.com/hc/en-us/articles/7101779988372-Import-test-cases-from-CSV-or-Excel ' +
    '(accessed 2026-09-25)',
};

/**
 * Zephyr Scale. SmartBear has folded the "Zephyr Scale" branding into the
 * unified "Zephyr" cloud docs (the doc site still resolves under the
 * `zephyr-scale.statuspage.io` status page and documents the Squad-to-Scale
 * upgrade path), so the current official docs live under
 * `support.smartbear.com/zephyr/docs/`.
 *
 * Verified 2026-09-25 against "Import Test Cases" > "System Fields
 * Available for Import" (Name, Precondition, Objective, and the
 * "Test Script (Steps) - Step" / "Test Script (Steps) - Expected Result"
 * pair, shortened in the same article's own CSV example to "Step" and
 * "Expected Result"):
 * https://support.smartbear.com/zephyr/docs/en/test-cases/import-test-cases.html
 *
 * Not directly confirmed: the literal header text for an existing test
 * case's key/ID column on export (the reachable docs describe *importing*
 * new cases, which do not carry an external key). This map uses "Key",
 * the standard Jira-ecosystem issue-key column name, by inference rather
 * than a directly observed export sample.
 */
const ZEPHYR_SCALE = {
  name: 'zephyr-scale',
  signature: ['Key', 'Name', 'Precondition', 'Objective', 'Step', 'Expected Result', 'Priority', 'Folder'],
  column_map: {
    client_id: 'Key',
    title: 'Name',
    objective: 'Objective',
    preconditions: 'Precondition',
    steps: 'Step',
    expected: 'Expected Result',
    section: 'Folder',
    priority: 'Priority',
    notes: null,
  },
  source:
    'https://support.smartbear.com/zephyr/docs/en/test-cases/import-test-cases.html (accessed 2026-09-25); ' +
    'client_id column ("Key") inferred from standard Jira issue-key naming, not directly observed in the ' +
    'reachable docs',
};

/**
 * Xray (Server/Data Center), CSV Test Case Importer.
 *
 * Verified 2026-09-25 against:
 * - "Importing Manual Tests using Test Case Importer" (the three mandatory
 *   fields TCID, Test Summary, Action):
 *   https://docs.getxray.app/space/XRAY/301695197
 * - "Xray Server + DC: Examples using Test Case Importer" (literal CSV
 *   samples with the header row
 *   `TCID;Test Summary;Test Priority;Component;Action;Data;Result`,
 *   including a multi-row case where later rows repeat the columns for
 *   each step):
 *   https://docs.getxray.app/space/XRAY/301406204
 *
 * Xray's CSV Test Case Importer has no Preconditions or Objective column
 * (Xray models preconditions as a separate linked "Pre-Condition" issue
 * type, not a column on this import format), so those two fields are
 * unmapped for this format; the fixture reflects that (no case has a
 * populated precondition).
 */
const XRAY = {
  name: 'xray',
  signature: ['TCID', 'Test Summary', 'Test Priority', 'Component', 'Action', 'Data', 'Result'],
  column_map: {
    client_id: 'TCID',
    title: 'Test Summary',
    objective: null,
    preconditions: null,
    steps: 'Action',
    expected: 'Result',
    section: 'Component',
    priority: 'Test Priority',
    notes: null,
  },
  source: 'https://docs.getxray.app/space/XRAY/301695197 ; https://docs.getxray.app/space/XRAY/301406204 (accessed 2026-09-25)',
};

/**
 * qTest (Manager), Excel/CSV Test Case Importer and the Test Case Detail
 * export used to modify existing cases.
 *
 * Verified 2026-09-25 against:
 * - "Import test cases" (the "Test Case Id" field, left blank to create a
 *   new case, mapped exactly to update an existing one; module comes from
 *   the sheet name):
 *   https://docs.tricentis.com/qtest-saas/content/manager/import_test_cases.htm
 * - "Manage test cases" (per-test-case Description field; per-step
 *   "Step Description" and "Expected Result" columns, with row 0 holding
 *   the precondition):
 *   https://docs.tricentis.com/qtest-saas/content/manager/manage_test_cases.htm
 * - "Export Requirements and Test Design Reports" > "Test Case Detail"
 *   (confirms the Test Case Detail export used to round-trip existing
 *   cases through Excel; exact column list is user-selected in the export
 *   dialog rather than shown as text):
 *   https://docs.tricentis.com/qtest-saas/content/manager/requirements_and_test_design/export_requirements_and_test_design_reports.htm
 */
const QTEST = {
  name: 'qtest',
  signature: [
    'Test Case Id',
    'Name',
    'Description',
    'Precondition',
    'Module',
    'Priority',
    'Step Description',
    'Expected Result',
  ],
  column_map: {
    client_id: 'Test Case Id',
    title: 'Name',
    objective: 'Description',
    preconditions: 'Precondition',
    steps: 'Step Description',
    expected: 'Expected Result',
    section: 'Module',
    priority: 'Priority',
    notes: null,
  },
  source:
    'https://docs.tricentis.com/qtest-saas/content/manager/import_test_cases.htm ; ' +
    'https://docs.tricentis.com/qtest-saas/content/manager/manage_test_cases.htm ; ' +
    'https://docs.tricentis.com/qtest-saas/content/manager/requirements_and_test_design/export_requirements_and_test_design_reports.htm ' +
    '(accessed 2026-09-25)',
};

/** @type {Array<{name: string, signature: string[], column_map: object, source: string}>} */
export const FORMATS = [TESTRAIL, ZEPHYR_SCALE, XRAY, QTEST];

/**
 * Reduce a header to its comparison key: trimmed, lowercased.
 * @param {string} header
 * @returns {string}
 */
function headerKey(header) {
  return (header ?? '').trim().toLowerCase();
}

/**
 * Detect which built-in format a header row matches, if any.
 * @param {string[]} headers
 * @returns {{name: string, column_map: object}|null}
 */
export function detectFormat(headers) {
  const present = new Set((headers || []).map(headerKey));
  for (const format of FORMATS) {
    if (format.signature.every(header => present.has(headerKey(header)))) {
      return { name: format.name, column_map: format.column_map };
    }
  }
  return null;
}
