---
name: import-test-cases
description: Turn a client's manual test cases into this Framework's traced, automated tests, one hand-off at a time.
disable-model-invocation: true
argument-hint: <file>
---

# Import test cases

Take the client's spreadsheet or test-tool export named in the argument, and
turn each case into one of five outcomes:

1. **Automated:** a new test that's been proven able to fail.
2. **Already covered:** an existing test that covers it gets a `client_case`
   annotation, and the case gets no new test or issue.
3. **Partly automated:** a test checks what it can, and the Test Case issue
   says what stays manual.
4. **Manual:** a Test Case issue kept `test-manual`, with the reason.
5. **Stale:** raised with the client as a question, or filed as a finding.

The shared process is [`docs/qa-handbook.md`](../../../docs/qa-handbook.md).
This skill applies it to a client's own test cases the way
[`stories-and-tests.md`](../new-engagement/stories-and-tests.md) applies it to
cases written from scratch. Read
[`shared-rules.md`](../new-engagement/shared-rules.md) first. It holds the step
loop, the log format, what a hand-off is, how to create issues, the guardrails
you'll meet, and how to prove a test can fail. This skill doesn't repeat them.

"Automated" in the report includes the partly automated cases, so "41 of 58
automated, 6 partly automated" means 41 in all, 6 of which are partly.

## Running it again is safe

- **Same file, same map:** `docs/client-test-cases/cases.json` is reused
  unchanged when its `sha256` and its column map both still match.
- **Same file, a corrected map:** `normalise --write` refuses (exit 3), because
  reusing the file would ignore the new map and rewriting it would lose the
  import state. Use `--remap`: it re-reads the file with the new map and keeps
  each case's state, and refuses if the new map no longer finds an existing
  case. Never delete `cases.json` to get round it.
- **A changed file:** `normalise --write` refuses (exit 3) to touch a
  `cases.json` whose `sha256` doesn't match. Re-importing over an old import is
  out of scope: ask the client for a fresh file name. Also don't open and
  re-save the client's file: that changes its `sha256`.
- **Every step after that** looks for what it would create before it creates it
  (`shared-rules.md`, "Issues you create"), and records each issue number as it
  goes, so a stopped run resumes where it stopped.

## How this skill runs

The steps share one step loop and end in these PRs. Log entries are titled
`## Import step N — <what> (<date>)`, one per batch for steps 6 and 7. After a
PR merges, `git fetch` and branch from `origin/main` for the next one.

| Steps | PR | Branch (example) |
|---|---|---|
| 1 | Take in the file | `docs/import-<file>` |
| 2 to 5 | Triage: probes, buckets, IDs, and the issues' record | `docs/import-<file>-triage` |
| 6 | One per automation batch | `test/import-<story>` |
| 7 | None: labels and issue fields only | |
| 8 | Closing: the log's report | `docs/import-<file>-report` |

### The CLI

`node .claude/skills/import-test-cases/import.js <command>`. Change import
state with `set`, never by editing `cases.json` by hand. It validates what you
give it and refuses what it can't place.

| Command | Used in step |
|---|---|
| `normalise <file> --preview [--format <name>] [--sheet <name>] [--map-out <path>]` | 1 |
| `normalise <file> --write --map <column-map.json> [--remap]` | 1 |
| `set <client id> <field> <value>` (`null` clears a field) | 2, 3, 4, 5, 6 |
| `validate --stage probe` / `triage` / `all` | 2 / 3 / 4 |
| `assign-ids --issues <issues file>` | 4 |
| `report` | 8 |
| `reconcile --issues <file> --tests <file> --final` | 8 |

`set` writes these fields: `bucket` (`automatable`, `partly-automatable`,
`manual`, `stale`), `reason`, `probe`, `covered_by`, `test_case_id`, `test`,
`story` and `issue` (issue numbers), and `stale.missing`, `stale.outcome`
(`question` or `finding`), `stale.question`, `stale.finding_issue`.

### Hand-offs in this skill

On top of merging each PR and approving guardrail-file edits:

- **The column map.** Confirm or correct it before anything is written.
- **Buckets and matches.** Confirm the table (case, bucket, reason, proposed
  match). Agreeing it with the client contact, when there is one, is theirs
  too.
- **A stale case's outcome.** Choose a question for the client, or a finding.
- **The IDs.** Confirm the assigned IDs, and above all their areas.
- **Creating the issues.** Approve the preview of the stories and Test Case
  issues before any of them is created.
- **The client agreement.** Agreeing the stories and test cases with the client
  contact, or standing in for them when there is no client yet to ask. Log who
  agreed and when. Until then the stories say "pending agreement".

## Steps

### 1. Take in the file

**Hand-off first:** the client's file can hold test accounts, passwords, or real
customer data, and a pushed file can't be taken back (`shared-rules.md`). Check
`gh repo view --json isPrivate`, and have the human skim the file.

If the file holds a password, even a public demo one, don't commit it: the
Atlas guard blocks any file that holds a password, and `cases.json` would copy
it into the repo too. Don't edit or re-save the client's file either, since
that changes its `sha256`. Ask the client, or the human standing in for them,
for a fresh file with the password replaced (for example "the password shown
on the login page"), under a new name such as `<name>-v2.csv`. Check it with
`grep` that nothing secret is left, and `diff` it against the original to see
that only those lines changed. Then import the fresh file, and log why.

Commit the file, unchanged, to `docs/client-test-cases/<original file name>`,
in its own commit. Then:

```
node .claude/skills/import-test-cases/import.js normalise <file> --preview [--format <name>] [--sheet <name>]
```

The human sees the detected format (or `proposed`), the column map, the
unmapped headers, the case count, the **sections with the ID area each would
give**, and the first 3 normalised cases. If there are no sections, it warns
that every new ID would be `TC_GEN_###`.

**Hand-off:** confirm or correct the map. Write it with `--map-out
docs/client-test-cases/column-map.json` on the same command, then apply any
correction to that file. Then:

```
node .claude/skills/import-test-cases/import.js normalise <file> --write --map docs/client-test-cases/column-map.json
```

Commit `docs/client-test-cases/cases.json`. Log the format, the confirmed map,
and the case count. If the map proves wrong later, use `--remap` (see above).

**Done when:** the original file, the confirmed map, and `cases.json` are all
committed, `cases.json`'s case count matches the preview's, and the PR for this
step is merged.

### 2. Probe each case against the site

For each case, walk its steps against the live site, doing only what the
brief's "What we may do there" allows: load pages and look for the elements the
case names. Never take a forbidden action to find out whether a step can be
automated. A case whose next step needs one stops there, with that reason in
its probe note. Record what you saw:

```
node .claude/skills/import-test-cases/import.js set <client id> probe "<what you saw>"
```

A page, control, or text the case names that isn't on the site makes it stale.
Note what's missing with `set <client id> stale.missing "<what is missing>"`.
Keep your proposed bucket and match for each case in a working table. They go
into `cases.json` only once the human confirms them in step 3.

**Done when:** `validate --stage probe` exits 0, and every case a forbidden
action would block says so in its probe note.

### 3. Sort into buckets, and decide the stale outcomes

Propose a bucket for each case: Automatable, Partly automatable, Manual, or
Stale. For an Automatable case, also propose a match to an existing test case
when one covers the same page and the same assertion intent.

**Hand-off:** confirm the buckets. Show the table: case, bucket, reason,
proposed match, and, for a partly automatable case, what stays manual. A
partly automatable case keeps one Test Case issue with its manual remainder on
it, and manual runs are recorded as comments there (handbook section 2). If the
client wants the manual part tracked as a case of its own, say so here, and it
becomes two cases.

Record what's confirmed:

```
node .claude/skills/import-test-cases/import.js set <client id> bucket <automatable|partly-automatable|manual|stale>
node .claude/skills/import-test-cases/import.js set <client id> reason "<why>"        # manual and partly automatable
node .claude/skills/import-test-cases/import.js set <client id> covered_by TC_<AREA>_<NNN>  # a confirmed match
```

A confirmed match stays Automatable, with `covered_by` set to the existing test
case's ID. It gets no new issue and no new test.

For every stale case, propose whether it's a question for the client (the case
is out of date) or a finding (the site is wrong).

**Hand-off:** the human decides. A question: `set <client id> stale.outcome
question`, and `set <client id> stale.question "<the question>"`. List every
open question in the log and in the PR, so they go to the client. A finding:
file it with the QA Finding form (`shared-rules.md`), put it on the board in
`Backlog`, then `set <client id> stale.outcome finding` and `set <client id>
stale.finding_issue <number>`.

**When the client answers.** If the client says the site should do what a
stale case describes (a missing feature, not an out-of-date case), the case
comes back in, as a correction: with the human's confirmation, `set <client
id> bucket automatable`, clear its `stale.*` fields (`set <client id>
stale.outcome null`, and the same for `stale.finding_issue` and
`stale.missing`), run step 4's `assign-ids` on fresh data, and carry on from
step 5 for that case. Its test fails until the site meets it. If the feature
doesn't exist yet, the test's control names are guesses: say so in the test
and its Test Case issue, and pin them once the feature can be probed.

**Done when:** `validate --stage triage` exits 0, every match is confirmed or
rejected, the confirmed table is logged, and every finding from a stale case is
on the board.

### 4. Assign IDs

An ID that's never been used is one you can only know is free from current
data. So first `git fetch` and merge `origin/main`, then run `npm run coverage`
(`assign-ids` reads `docs/coverage-map.md`, and a stale one can hand out an ID
a spec on `main` already uses). Then, with the issues file in a scratch
directory outside the repo:

```
gh issue list --state all --limit 5000 --json number,title,labels,state > <issues file>
node .claude/skills/import-test-cases/import.js assign-ids --issues <issues file>
```

If `gh` returned exactly 5000 issues the list was cut off: stop and tell the
human.

A client ID already shaped `TC_<AREA>_<NNN>` is kept as the test case ID. Any
other client ID gets the next free ID in its area. The area is the first word of
the case's section, uppercased, with anything but letters and digits removed,
and cut to 8 characters (`GEN` when there is no section), so "Shopping Cart"
gives `TC_SHOPPING_001`. "Free" counts every ID in `docs/coverage-map.md`,
`cases.json`, and all Test Case issue titles, open and closed, so no ID is ever
reused. The client's own ID is kept alongside it. An ID already in `cases.json`
is never changed by `assign-ids`.

**Hand-off:** show the human each client ID and the ID it got, with its area.
An ID goes into an issue title in step 5 and is never renumbered after that, so
this is the moment to change one: `set <client id> test_case_id <new id>`. Log
the confirmed IDs. Then:

```
node .claude/skills/import-test-cases/import.js validate --stage all
```

Fix anything it reports (a missing reason, a bucket not set, a bad stale
record), re-running `assign-ids` first if the fix changes an ID, and re-run
`validate` until it exits 0.

**Done when:** `validate --stage all` exits 0, every non-stale, non-covered case
has a `test_case_id`, and the confirmed IDs are logged.

### 5. Preview and create the stories and Test Case issues

**Stories.** Write one story per `section` (or per group the human picks; with
no sections, ask how to group), with the User Story form, marked "from the
client's test cases, pending agreement", and the cases' objectives as its
acceptance criteria. Keep a story under GitHub's sub-issue cap (see
`shared-rules.md`).

**Test Case issues.** Write one per non-stale, non-covered case. Fill the Test
Case form like this, and apply the labels from `shared-rules.md`:

| Form field | From the client's case |
|---|---|
| Title | `[TEST CASE] <TC id> - <client title>` |
| Test Case ID | the TC id |
| Source ticket | `#<story> — acceptance criteria <n>` |
| Test Type | `Functional` unless the case is plainly accessibility, performance, or integration. Never `Smoke` unless the human says so |
| Priority | the client's priority mapped onto Critical, High, Medium, or Low. Show the mapping in the preview. `Medium` when the client gave none |
| Prerequisites | the case's preconditions |
| Test Steps, Expected Results | the case's steps and expected results, numbered to match |
| Automation Status | `Needs Automation` (automatable, partly automatable) or `Manual` |
| Additional Notes | the client's own ID, the source file and row, a link to its `cases.json` entry, the probe note, the reason, and for a partly automatable case a **Manual remainder** section |
| Labels | `test-case`, plus `test-needs-automation` or `test-manual` (with the reason in the notes) |

**Matched cases** (`covered_by` set) get no story and no issue. Comment once on
the existing Test Case issue instead, starting with the line `Client case
<client id> (from <source file>)`, then the client's ID, wording, steps,
expected results, and the `cases.json` link.

**A matched test with no Test Case issue.** Tests written before the import,
such as the ones `/new-engagement` step 3 writes, may have none yet. Then
add them to this preview: a QA-drafted story and a Test Case issue for each
such test (labelled `test-automated` if its test is merged), written by
`stories-and-tests.md`'s "Stories and test cases" rules. Create them before
the comments, so each comment has its issue. Their tests get `issue`
annotations in the first batch. `reconcile` doesn't check these issues, since
they aren't client cases; `/new-engagement` step 7's "Done when" does.

**Hand-off:** approve the preview (titles, labels, priority mapping, parents)
before creating anything.

Create resumably (`shared-rules.md`). After each create, record it at once:
`set <client id> issue <number>`, and `set <client id> story <number>` for the
story. Add each Test Case issue as a sub-issue of its story. Reuse existing
board items; add new ones to `Backlog`. Then commit `cases.json`, and open the
triage PR (steps 2 to 5). Hand off the client agreement.

**Done when:** every non-stale, non-covered case has a Test Case issue that's a
sub-issue of its story, with `import.issue` and `import.story` recorded; every
matched case's existing issue has its comment; everything is on the board;
`validate --stage all` still exits 0; and the triage PR is open. Step 6 starts
from it once it's merged.

### 6. Automate and prove, in batches

Automate one story, or at most about 10 cases, per batch and PR, branching from
`origin/main` once the triage PR has merged. Prefer an existing spec file. Each
test follows the handbook's anatomy: its ID first in its title, and
`test_case`, `issue`, and (for an imported case) `client_case` annotations,
declared in the test's details object. Selectors go in `selectors.<site>.*`,
and data in `config-helper.js`.

- A partly automatable case's test checks what it can and says, in a comment,
  what stays manual and why.
- A matched case gets no new test: add the `client_case` annotation to the
  existing test instead.
- A case that needs a new spec file can't go in a batch. Leave its issue
  `test-needs-automation` and raise the spec as its own reviewed change
  (`shared-rules.md`).

**Prove each test** as `shared-rules.md` describes: break its expected value
once and see it fail on the assertion under test, put it back, then run the
batch twice on desktop and phone and confirm each test agrees with itself. Save
the evidence under `test-results/<TC id>/` and commit it after the last run,
for the reason the guardrails give. A real failure is a finding, filed the same
way as any other.

Record each test with `set <client id> test "<spec file> › <test title>"`.
Run `npm run coverage` and commit the regenerated `docs/coverage-map.md`; CI
fails when it's stale. Write the batch's log entry, open the batch PR, and stop
until it's merged.

**Done when:** every automatable and partly automatable case in the batch has a
test or an annotation; every test has been proven able to fail and reverted,
with its evidence committed; both runs agree; `import.test` is recorded; the
coverage map is committed; and the batch PR is open.

### 7. Relabel after each merge

After a batch PR merges, for each of its Test Case issues:

- swap the label `test-needs-automation` for `test-automated`;
- set Automation Status to `Automated`, and Automation File Path to `<spec
  file> › <test title>`, as in the handbook's step by step (section 4).

Those two fields are sections of the issue body. Read the body with `gh issue
view <n> --json body --jq .body`, edit the two sections in a scratch file, and
write it back with `gh issue edit <n> --body-file <scratch file>`.

**Done when:** every merged case's issue is `test-automated`, with both fields
filled in.

### 8. Report and reconcile

```
node .claude/skills/import-test-cases/import.js report
```

Add its output to `docs/engagement-log.md` as the import report, and carry its
counts into the PR summary, for example "41 of 58 automated (6 of them partly
automated), 12 manual, 5 stale". Put every open question to the client in the
log too.

```
gh issue list --state all --limit 5000 --json number,title,labels,state > <issues file>
npx playwright test --list --reporter=json > <tests file>
node .claude/skills/import-test-cases/import.js reconcile --issues <issues file> --tests <tests file> --final
```

`--final` makes `reconcile` fail any case whose issue is still
`test-needs-automation`, or whose story or test isn't recorded, so a skipped
step 7 can't pass. It also fails any Test Case issue carrying two of the three
automation labels (the Test Case form applies `test-manual` by default, so an
issue made on the web and relabelled by hand can end up with both). Open the
closing PR with the log entry.

**Done when:** `reconcile --final` exits 0, and the log's import report and the
PR summary carry the same counts.
