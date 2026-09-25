---
name: import-test-cases
description: Turn a client's manual test cases into this Framework's traced, automated tests, one hand-off at a time.
disable-model-invocation: true
argument-hint: <file>
---

# Import test cases

Take the client's spreadsheet or test-tool export named in the argument, and
turn each case into one of three outcomes: an automated test that's been
proven able to fail, a Test Case issue kept `test-manual` with the reason, or
a stale case raised with the client or filed as a finding. The shared process
is [`docs/qa-handbook.md`](../../../docs/qa-handbook.md); this skill applies
it to a client's own test cases the way
[`stories-and-tests.md`](../new-engagement/stories-and-tests.md) applies it
to cases written from scratch.

Running this skill again on the same file is safe. `docs/client-test-cases/cases.json`
is reused unchanged when its `sha256` still matches the file, and every issue
is looked for by its exact title before a new one is created, so nothing is
duplicated. A file that has changed since the last import is out of scope for
now: `normalise --write` refuses to touch a `cases.json` whose `sha256`
doesn't match. Ask the client for a fresh file name instead of re-importing
over the old one.

## Every step

1. Do the step. Run the CLI command it names, and read the output.
2. Append the step's entry to `docs/engagement-log.md`: what ran, what the
   human saw, and what was decided.
3. Commit what the step produced, with a conventional type (`docs`, `feat`,
   `test`, `chore`); the commit-msg hook rejects any other.
4. The take-in-file commit and each automation batch open a PR. Stop until
   the human merges it before the next step continues.

A step is done when its **Done when** is true and every **hand-off** in it
has been given to the human.

### Hand-offs

A **hand-off** is work only the human can do. Stop, show the exact output,
say why it's theirs, and confirm the result before logging it.

- **The column map.** Confirm or correct the proposed map before anything is
  written from the file.
- **Buckets and matches.** Confirm the bucket table (case, bucket, reason,
  proposed match). Agreeing it with the client contact, when there is one, is
  theirs too.
- **A stale case's outcome.** Choose a question for the client, or a finding.
  A finding is filed with the QA Finding form and put on the board.
- **Creating the issues.** Approve the preview of the stories and Test Case
  issues (titles, labels, parents) before any of them is created.
- **Agreeing the stories and test cases with the client contact**, or
  standing in for them when there is no client yet to ask.
- **Merging each PR**, so the next step starts from a merged base.

### Guardrails you'll meet

- `git checkout -- <path>` is blocked. Automating a batch runs Playwright,
  which deletes `playwright-report/.gitkeep` and `test-results/.gitkeep`;
  recreate them with `: > <path>` before committing.
- Force-push is denied. Resolve a conflict by merging `origin/main` into the
  branch.
- The shell guardrail can't evaluate very long compound commands. Write the
  script to a scratch file and run it.
- Probing and automating stay inside the brief's Environments table entry for
  "What we may do there." A step that would go past it, such as submitting a
  form on a read-only site, stops there; that case goes Manual instead.
- A new spec file is a bigger change than one batch: it needs its own CI job,
  an entry in the dashboard generator's inputs, and a place in
  `template-check`'s spec list. Because it touches `.github/workflows/` and
  `dashboards/scripts/generate-dashboard.js`, it needs `/atlas-red-team`
  review first. Make that its own reviewed change, never folded into a batch
  PR.

## Steps

### 1. Take in the file

Commit the file, unchanged, to `docs/client-test-cases/<original file name>`,
in its own commit; the Engagement repo is private.

```
node .claude/skills/import-test-cases/import.js normalise <file> --preview [--format <name>] [--sheet <name>]
```

The human sees the detected format (or `proposed`), the column map, the
unmapped headers, the case count, and the first 3 normalised cases.

**Hand-off:** confirm or correct the map. Write the confirmed JSON to
`docs/client-test-cases/column-map.json` (the exact content the preview
printed, corrected if needed).

```
node .claude/skills/import-test-cases/import.js normalise <file> --write --map docs/client-test-cases/column-map.json
```

Commit the resulting `docs/client-test-cases/cases.json`. Log the format, the
confirmed map, and the case count.

**Done when:** the original file, the confirmed map, and `cases.json` are all
committed, `cases.json`'s case count matches the preview's, and the PR for
this step is merged.

### 2. Probe each case against the site

For each case, walk its steps against the live site, doing only what the
brief's "What we may do there" allows: load pages and look for the elements
the case names. Never take a forbidden action to find out whether a step can
be automated. A case whose next step needs one stops there and goes in the
Manual bucket, with that reason. Record what you saw in `import.probe`.

Mark a case stale when a page, control, or text it names isn't on the site.
Note what's missing; that becomes `import.stale.missing`.

**Done when:** every case has a probe note, and every case a forbidden action
would block is already Manual with a reason.

### 3. Sort each case into a bucket

Propose a bucket for each remaining case (Automatable, Partly automatable,
Manual, Stale). For an Automatable case, also propose a match to an existing
test case when one covers the same page and the same assertion intent.

**Hand-off:** confirm the buckets. Show the table: case, bucket, reason,
proposed match. A confirmed match stays Automatable with `covered_by` set to
the existing test case's ID; it gets no new issue and no new test.

Set `import.bucket` to exactly one of `automatable`, `partly-automatable`,
`manual`, or `stale` (lowercase). Put the reason for a manual or
partly-automatable case in `import.reason`. Record a confirmed match in
`import.covered_by`.

**Done when:** `import.bucket` is set on every case, every match is
confirmed or rejected, and the confirmed table is logged.

### 4. Decide each stale case's outcome

For every stale case, propose whether it's a question for the client (the
case is out of date) or a finding (the site is wrong).

**Hand-off:** the human decides. A finding is filed with the QA Finding
form's sections, with `qa` and `needs-triage`, and put on the board in
`Backlog`. Record the outcome in `import.stale.outcome` and, for a finding,
its issue number in `import.stale.finding_issue`.

**Done when:** every stale case has an outcome, and every finding from one is
on the board.

### 5. Assign IDs and validate

```
gh issue list --state all --limit 1000 --json number,title,labels,state > <issues file>
node .claude/skills/import-test-cases/import.js assign-ids --issues <issues file>
```

A client ID already shaped like `TC_<AREA>_<NNN>` is kept as the test case
ID. Any other client ID gets the next free ID in its area, which comes from
the case's section. "Free" counts every ID in `docs/coverage-map.md`,
`cases.json`, and all Test Case issue titles, open and closed, so no ID is
ever reused. The client's own ID is kept alongside it. An ID already in
`cases.json` is never changed. Show the assigned IDs to the human, and log
them. Then:

```
node .claude/skills/import-test-cases/import.js validate
```

Fix anything it reports (a missing reason, a bucket not set, a bad stale
record), re-running `assign-ids` first if the fix changes an ID, and re-run
`validate` until it exits 0.

**Done when:** `validate` exits 0, and every non-stale, non-covered case has
a `test_case_id`.

### 6. Preview and create the stories and Test Case issues

Write one story per `section` (or per group the human picks), with the User
Story form, marked "from the client's test cases, pending agreement", and the
cases' objectives as its acceptance criteria. Write one Test Case issue per
non-stale, non-covered case, with the Test Case form's sections: the client's
own ID, wording, steps, and expected results, and a link to its `cases.json`
entry and original row. Label it from its bucket: `test-needs-automation`, or
`test-manual` with the reason.

For a case matched to an existing test (`covered_by` is set), skip the story
and the issue. Instead, comment on the existing Test Case issue with the
client's ID, wording, steps, expected results, and the `cases.json` link.

**Hand-off:** approve the preview (titles, labels, parents) before creating
anything.

Create resumably: before any `gh issue create`, look for an existing issue by
its exact title prefix (`[TEST CASE] <TC id> - ` or `[STORY] <title>`), and
reuse it instead of creating a duplicate. Add each Test Case issue as a
sub-issue of its story with the sub-issues API, as in
[`stories-and-tests.md`](../new-engagement/stories-and-tests.md). Reuse
existing board items; add new ones to `Backlog`. Record each story's issue
number in `import.story` and each Test Case issue's number in `import.issue`.

**Done when:** every non-stale, non-covered case has a Test Case issue that's
a sub-issue of its story, every matched case's existing issue has its
comment, and everything is on the board.

### 7. Automate in batches

Automate one story, or at most about 10 cases, per batch and PR. Prefer an
existing spec file. Each test follows the handbook's anatomy: its ID first in
its title, and `test_case`, `issue`, and (for an imported case) `client_case`
annotations, declared in the test's details object. Selectors go in
`selectors.<site>.*`, and data in `config-helper.js`. A partly automatable
case's test checks what it can and says, in a comment, what stays manual and
why. A matched case (`covered_by` set) gets no new test: add the
`client_case` annotation to the existing test instead. Record `import.test`
as `<spec file> › <test title>`.

**Done when:** every automatable and partly automatable case in the batch has
a test or an annotation, and its batch PR is open.

### 8. Prove each test

Break its expected value once, run it, and confirm it fails on the assertion
under test, exactly as at kickoff step 3. Revert the break. Then run the
whole batch twice on desktop and phone (`production` and `production-mobile`,
or the brief's equivalents), and confirm both runs agree. A real failure is a
finding, filed the same way as any other.

**Done when:** every test in the batch has been proven able to fail and
reverted, both runs agree, and the batch PR is merged.

### 9. Relabel after merge

After a batch PR merges, relabel its Test Case issues `test-automated` and
fill in Automation File Path, as in the handbook's step-by-step.

**Done when:** every merged case's issue is `test-automated`.

### 10. Report and reconcile

```
node .claude/skills/import-test-cases/import.js report
```

Add its output to `docs/engagement-log.md`'s import report, and carry its
counts into the PR summary, for example "41 of 58 automated, 6 partly
automated, 12 manual, 5 stale".

```
gh issue list --state all --limit 1000 --json number,title,labels,state > <issues file>
npx playwright test --list --reporter=json > <tests file>
node .claude/skills/import-test-cases/import.js reconcile --issues <issues file> --tests <tests file>
```

**Done when:** `reconcile` exits 0, and the log's import report and the PR
summary carry the same counts.
