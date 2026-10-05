# Shared rules for the Engagement skills

`/new-engagement` and `/import-test-cases` both work the way this file
describes. Each skill says which of its steps open a PR, what its log entries
are called, and what "done" means for its steps. Everything else lives here,
once, so the two can't drift apart. Read this file before the first step.

## The step loop

1. `git fetch`, then branch from `origin/main`. Every step appends to the same
   log, so a stale base is a merge conflict.
2. Do the step. Run the commands it names and read their output.
3. Append the step's entry to `docs/engagement-log.md` (see "The log").
4. Commit. The subject is `type(scope): subject`, at most 100 characters, with
   a lowercase scope, and the type is one the hook accepts: `feat`, `fix`,
   `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, or
   `revert`. Stage by path, never `git add -A`: Playwright and the dashboard
   generator write files you didn't mean to commit.
5. If the step ends in a PR: push, open it with
   `gh pr create --base main --head <branch>`, and say in the body what was
   verified and what's expected to fail. Then stop until the human merges it.
   You never merge (`gh pr merge` is denied). When the human wants to keep
   moving, stack the next branch on this one and say "stacked on #N, merge in
   order" in the PR.

A step is **done** when its "Done when" is true, every hand-off in it has been
given to the human, its log entry is written, and, for a step that ends in a
PR, the PR is open.

## The log

`docs/engagement-log.md` is the Engagement's record and the demo trail. Each
entry is `## <prefix> N — <what> (<date>)`, with **What we did**, **Decisions**
(each with its reason), **Result** (the verification, as a table of command and
outcome), and **Next**. The skill names its prefix (`Step` or `Import step`). A
step that repeats, such as an automation batch, gets one entry per repeat,
named for it. Record corrections as corrections: when a later step changes an
earlier decision, say so in the later entry and leave the earlier one as it
was.

## Hand-offs

A **hand-off** is work only the human can do. Stop, show the exact command,
clicks, or output, say why it's theirs, and confirm the result before logging
it. Every skill's own list of hand-offs comes on top of two that are always
there: merging each PR, and approving any edit to a guardrail file
(`.atlas/manifest.json`, `.claude/settings.json`, `.claude/hooks/**`,
`.githooks/**`) or to `CLAUDE.md`. Auto mode may refuse such an edit outright.
When it does, stop and leave the edit to the human.

## Before you touch the tracker or write acceptance criteria

`CLAUDE.md` makes two reads mandatory, and the skills' steps rely on them:

- Before any issue read, write, comment, or label change, read
  `docs/agents/issue-tracker.md`. The board states `In QA` and `Done` are
  human-only. These skills only ever put items in `Backlog`.
- Before writing acceptance criteria, verification steps, or evidence, read
  `docs/agents/testing.md`.

### Issues you create

An issue form's labels apply only when it's filled in on the web. An issue
made with `gh issue create` gets exactly the labels you pass, so pass them:

| Issue | Form | Title | Labels |
|---|---|---|---|
| Story | User Story | `[STORY] <title>` | `user-story` |
| Test case | Test Case | `[TEST CASE] <TC id> - <title>` | `test-case`, plus exactly one of `test-manual`, `test-needs-automation`, `test-automated` |
| Finding | QA Finding | `[QA]: <title>` | `qa`, `needs-triage`, plus `bug` or `accessibility` |

Fill in the form's sections in the body, in the form's order, and fill every
required one. `gh issue create` won't stop you leaving one out.

Resumable recipes, so that running a step twice never doubles anything:

- **Create:** list every issue first
  (`gh issue list --state all --limit 5000 --json number,title,labels,state`;
  if it returns exactly 5000, it was cut off, so stop and tell the human),
  look for the title (or the `[TEST CASE] <TC id> - ` prefix), and reuse what
  exists. Record the new number straight away, before the next create.
- **Comment once:** start the comment with a fixed first line that names what
  it's about, and read the issue's existing comments
  (`gh issue view <n> --json comments --jq '.comments[].body'`) before
  posting. Skip it when that line is already there.
- **Sub-issue:** a test case is a sub-issue of its story. List the story's
  existing ones first (`gh api repos/<owner/repo>/issues/<story>/sub_issues
  --jq '.[].number'`), then add the missing one with
  `gh api --method POST repos/<owner/repo>/issues/<story>/sub_issues -F sub_issue_id=<id>`,
  where `<id>` is the case's database id
  (`gh api repos/<owner/repo>/issues/<n> --jq .id`), not its number. GitHub
  caps how many sub-issues one parent can hold (100 when this was written), so
  split a very large story into groups.
- **Board:** add new items to `Backlog`, and reuse items already there.
  `gh project item-list` lags behind `item-add`, so count the board's items
  with the GraphQL API before adding any again.

## Guardrails you'll meet

- **Undoing your own edit.** `git checkout -- <path>`,
  `git checkout HEAD -- <path>`, and `git restore <file>` are all denied
  (`git restore --staged` is allowed). Put a deliberate edit back by editing it
  back with the file tool, then check with `git diff -- <file>`: it prints
  nothing once it's undone.
- **Nothing pushed comes back.** Force-push is denied. Resolve a conflict by
  merging `origin/main` into the branch. The same rule means a secret, or a
  client's data, that reaches a pushed branch can only be removed by a human
  rewriting history, so check before you commit.
- **Long compound commands.** The shell guardrail can't evaluate them. Write
  the script to a scratch file outside the repo, with the file tool, and run it.
- **Playwright wipes its output directory on every run.** With no `outputDir`
  in `playwright.config.js`, that directory is `test-results/`, so a run deletes
  everything committed there, evidence included, not only `.gitkeep`. If the
  config sets `outputDir: 'playwright-output'`, Playwright's files land there
  and `test-results/` is safe. Check which you have before you capture
  evidence. If the evidence root is unprotected, capture it after the last run
  of the step, and read a deleted tracked file back with `git show HEAD:<path>`
  and the file tool.
- **CI owns `dashboards/`.** Don't run `npm run dashboard` locally. If a file
  there changed anyway, leave it out of the commit by staging by path.
- **Probing and automating stay inside the brief.** The brief's Environments
  table entry for "What we may do there" is the limit. A step that would go
  past it, such as submitting a form on a read-only site, stops there.
- **Files the agent must not commit.** Client-supplied files can carry
  credentials or personal data. Check `gh repo view --json isPrivate` and have
  the human skim the file first. The Atlas guard and gitleaks catch known
  secret shapes, not everything.

### A new spec file is its own reviewed change

A new spec file needs its own CI job, an entry in the dashboard generator's
inputs, and a place in `scripts/template-check.js`'s spec list. It touches
`.github/workflows/` and `dashboards/scripts/generate-dashboard.js`, so:

- **During kickoff** (`/new-engagement` steps 3 and 5), the step's own PR is
  where the human reviews it.
- **After kickoff**, it's its own change, and it's red-teamed *before* it's
  built. `/atlas-red-team` reviews planning documents, not a finished PR, so
  first write the plan: a short spec or ticket that says what the new spec
  covers, which CI, dashboard, and `template-check` edits it needs, and what
  could go wrong. Give the path of that file to `/atlas-red-team` (for example
  `/atlas-red-team docs/plans/new-spec.md`), and build only after it passes.
  Never fold the change into a batch PR.

## Proof of work

`docs/agents/testing.md` is the policy. In short: evidence for a `PASS` is
committed under `test-results/<name>/` on the branch, one directory per test,
and the PR links the committed path. Scrub tokens, cookies, and personal data
from anything you commit. `BLOCKED`, `SKIPPED`, and your own say-so are never a
`PASS`. Clear `test-results/` of the previous work package's evidence before
capturing new evidence, and leave `.gitkeep`.

`utils.js`'s `captureEvidence(page, testInfo)` saves a screenshot to
`test-results/<test case ID>/<project>.png`, so evidence is found by test case,
not by Playwright's hashed output folders.

Because each work package clears `test-results/`, a link to evidence from an
issue or a later log entry breaks once the next package lands. Link to it at
the commit that added it (`…/tree/<sha>/test-results/…`), and when a log entry
clears earlier evidence, name the commit that still has it.

### Prove a test can fail

This is the one place the procedure is written down. Do it for every test you
write or change, because a test that has never failed proves nothing.

1. Break the expected value once, with the file tool. Note the original text.
2. Run the test. It must fail **on the assertion under test**, not on an
   earlier line. If it fails anywhere else, the test isn't checking what you
   think. Save that run's output as evidence.
3. Put the original back (see "Undoing your own edit") and check that
   `git diff -- <file>` is empty.
4. Run the tests you wrote twice on desktop and twice on phone (the brief's
   projects, for example `production` and `production-mobile`). **Agree** means
   each test gives the same result in both runs of a project. A test that
   disagrees with itself is flaky: fix the test, don't rerun until it's green
   (handbook section 5). A test that passes on desktop and fails on phone, or
   the reverse, is a real difference to look into, not noise. It's a finding or
   a phone-menu problem in the test.
5. A failure that holds in every run and isn't the test's fault is a real
   defect. File it as a finding (`stories-and-tests.md`).

A test that **fails today on a real defect** can't be broken to prove it can
fail. Prove the other side instead: run it where the site is right, and see it
pass. For example, point it at a page or a user without the defect, then put
it back as in step 3. That shows the failure is the site's, not the test's.
For a feature that doesn't exist yet, there's nowhere it can pass: show it
fails on the assertion under test, with everything before it passing, and log
that its pass-proof waits for the feature.

A run in which nearly every test fails with a network error
(`net::ERR_INTERNET_DISCONNECTED`, or the like) says the machine lost its
connection, not that the site broke. Discard it and run again.
