# Vendor header research

Every fixture in this directory is hand-made. Before writing the four
test-tool fixtures below, each tool's real CSV export/import column headers
were checked against that vendor's own official documentation, per
issue #11's plan. Access date for every source below is
**2026-09-25**. `formats.js` carries the same URLs in a comment above each
map.

The Boost-format and unknown-headers fixtures need no vendor research: the
Boost columns are copied from `examples/boost/Functional-Table 1.csv`,
already in this repository, and the unknown-headers fixture is deliberately
invented (it exists to exercise the "no built-in format matches" path).

## TestRail

- **Column names** — "Test case fields" (default fields: Title, Section,
  Priority) and "Test case templates" (the Text template's Preconditions,
  Steps, and Expected Result fields; ID is TestRail's case identifier,
  shown as `C<n>` in the product and as the `ID` column on export):
  - https://support.testrail.com/hc/en-us/articles/14940939006740-Test-case-fields
  - https://support.testrail.com/hc/en-us/articles/14927678348052-Test-case-templates
- **CSV export exists, with a multi-row option** — "Export test cases"
  describes CSV export and an "Include separated steps on separate rows"
  checkbox (the multi-row/continuation-row layout this fixture's
  `several steps` and `continuation rows` cases exercise), and links a
  downloadable `reference.csv` sample confirming the literal header row
  `ID,Title,Created By,Created On,Estimate,Forecast,Priority,References,
  Section,Section Depth,Section Description,Steps (Expected Result),Suite,
  Suite ID,Type,Updated By,Updated On` for a project using the Text
  template's *combined* Steps field:
  - https://support.testrail.com/hc/en-us/articles/15144643126932-Export-test-cases
  - https://support.testrail.com/hc/en-us/article_attachments/15150901396884 (the reference.csv sample)
- **Multi-row / continuation-row mechanism** — "Import test cases from CSV
  or Excel", Import Step 2, describes the multi-row layout explicitly: "a
  multi-row layout is used for test cases with multiple individually
  defined steps and expected results and one row/record per step/expected
  result", with a chosen ID/title column marking the start of a new case:
  - https://support.testrail.com/hc/en-us/articles/7101779988372-Import-test-cases-from-CSV-or-Excel

**Headers used:** `ID, Title, Preconditions, Steps, Expected Result,
Priority, Section`.

**Not directly confirmed:** the literal header text TestRail's CSV export
uses for the per-row Step/Expected Result columns specifically when
"Include separated steps on separate rows" is checked — the downloaded
`reference.csv` sample's project had no populated steps to show that
variant. This map uses the Text template's own field names ("Steps",
"Expected Result") for those columns, which is the closest verified,
current wording. **Status: verified** for the field vocabulary and the
continuation-row mechanism; the specific separated-steps header spelling is
a documented, reasoned inference rather than an observed sample.

## Zephyr Scale

SmartBear has folded the "Zephyr Scale" branding into its unified "Zephyr"
cloud product; the current official docs live under
`support.smartbear.com/zephyr/docs/`, and that doc site itself documents the
Zephyr Squad → Zephyr (Scale) upgrade path and links the
`zephyr-scale.statuspage.io` status page, confirming it is the same
product's current home.

- **Column names** — "Import Test Cases" > "System Fields Available for
  Import" lists, verbatim: Name (required), Precondition, Objective, "Test
  Script (Steps) - Step" / "Test Script (Steps) - Expected Result" (the
  article's own worked CSV example shortens these to "Step" and "Expected
  Result"), Test Script (Plain Text), Folder, Status, Priority, Component,
  Labels, Owner, Estimated Time, Coverage:
  - https://support.smartbear.com/zephyr/docs/en/test-cases/import-test-cases.html

**Headers used:** `Key, Name, Precondition, Objective, Step, Expected
Result, Priority, Folder`.

**Not directly confirmed:** the literal header for an existing test case's
key/ID column. The reachable docs describe *creating new* cases (which
carry no external key on import); exporting an *existing* case's key was
not shown as literal export column text in the pages reached (the "Export
Test Cases" section of "Working with test cases" only shows screenshots of
the exported file, which are not machine-readable text). `Key` is used by
inference from the standard Jira-ecosystem issue-key naming convention
(Zephyr Scale test case keys look like `PROJ-T12`), not from an observed
export sample. **Status: partly verified** — the case-body field
vocabulary (Name, Precondition, Objective, Step, Expected Result, Priority,
Folder) is directly confirmed; the `client_id` column name (`Key`) is
inferred.

## Xray

- **Column names and multi-row layout** — "Importing Manual Tests using
  Test Case Importer" states the three mandatory fields (Test Case
  Identifier, Summary, Action) and names the example columns TCID, Test
  Summary, Action:
  - https://docs.getxray.app/space/XRAY/301695197
- **Literal CSV header row and continuation-row shape** — "Xray Server +
  DC: Examples using Test Case Importer" gives several literal CSV samples
  with the header row
  `TCID;Test Summary;Test Priority;Component;Component;Action;Data;Result`
  (the doubled "Component" column is that page's own multi-component
  example; this fixture uses a single Component column) and shows a
  continuation row for a case's later steps repeating the TCID column on
  every row (`1;Test 1...;High;...;Go to login page;;` then
  `1;;;;;Enter username;peter;`), rather than leaving it blank:
  - https://docs.getxray.app/space/XRAY/301406204

**Headers used:** `TCID, Test Summary, Test Priority, Component, Action,
Data, Result`. `Data` (a per-step input value) is a real column in the
vendor format but is left unmapped in `column_map`, same as any other
extra column a real export might carry. This fixture's step rows repeat the
TCID column, matching the vendor sample above, rather than leaving it
blank.

Xray's CSV Test Case Importer has no Preconditions or Objective column —
Xray models a precondition as a separate, linked "Pre-Condition" issue
type, not a column on this import format — so `preconditions` and
`objective` are `null` in this map, and no Xray fixture case has a
populated precondition. **Status: verified.**

## qTest

- **Test Case Id and the import/update flow** — "Import test cases"
  states the Test Case Id field is left blank to create a new case and
  must be mapped exactly to update an existing one, and that a case's
  module comes from the Excel sheet name:
  - https://docs.tricentis.com/qtest-saas/content/manager/import_test_cases.htm
- **Per-case and per-step field names** — "Manage test cases" describes
  the Description field, and states that in the Test Steps section "step
  0" holds the precondition, and each subsequent step has a "Step
  Description" and an "Expected Result":
  - https://docs.tricentis.com/qtest-saas/content/manager/manage_test_cases.htm
- **Export used to round-trip existing cases** — "Export Requirements and
  Test Design Reports" > "Test Case Detail" confirms the export used to
  download and re-import existing test cases via Excel; the exact column
  list is chosen in an export dialog (screenshot only, not literal text in
  the page), not fixed:
  - https://docs.tricentis.com/qtest-saas/content/manager/requirements_and_test_design/export_requirements_and_test_design_reports.htm

**Headers used:** `Test Case Id, Name, Description, Precondition, Module,
Priority, Step Description, Expected Result`. **Status: verified** — every
header in this map is a field name given verbatim in the reachable docs.
