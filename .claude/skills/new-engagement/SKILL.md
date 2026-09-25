---
name: new-engagement
description: Stand up a new QA Engagement from this template against a client site, one logged, reviewed step at a time.
disable-model-invocation: true
argument-hint: <site URL> [owner/repo]
---

# New Engagement

Build a working Engagement from this Framework against the site in the
arguments: from an empty repo to CI that runs the site's tests and a board that
traces every story to its tests. The shared process is
[`docs/qa-handbook.md`](../../../docs/qa-handbook.md); the per-Engagement
checklist is the **Kickoff checklist** in
[`docs/engagement-brief-template.md`](../../../docs/engagement-brief-template.md).
This skill is the order to work through them, and what they don't say.

## Every step

Each step below is one **step loop**:

1. `git fetch`, then branch from `origin/main`. Every step appends to the same
   log, so a stale base is a merge conflict.
2. Do the step. Verify it with the commands it names, and read the output.
3. Append the step's entry to `docs/engagement-log.md` (format below).
4. Commit with a conventional type (`feat`, `fix`, `docs`, `test`, `ci`,
   `chore`); the commit-msg hook rejects any other. Push, and open a PR that
   says what was verified and what's expected to fail.
5. Stop until the human merges it. When they want to keep moving, stack the
   next branch on this one, and say "stacked on #N, merge in order" in the PR.

A step is done when its PR is open with its log entry, and every **hand-off**
in it has been given to the human.

### The log

`docs/engagement-log.md` is the Engagement's record and the demo trail: one
`## Step N — <what> (<date>)` entry per step, with **What we did**,
**Decisions** (each with its reason), **Result** (the verification, as a table
of command and outcome), and **Next**. Record corrections as corrections: when
a later step changes an earlier decision, say so in the later entry, and leave
the earlier one as it was.

### Hand-offs

A **hand-off** is work only the human can do. Stop, give them the exact
command or clicks, say why it's theirs, and confirm the result before logging
it. Hand-offs in this skill:

- Activating git hooks: `git config core.hooksPath .githooks`. The guardrail
  blocks the agent from any hook-path command, including reads, so check
  `.git/config` directly.
- Adding the project board's Board view (grouped by Status). GitHub's API
  can't create views.
- Approving any edit to a guardrail file (`.atlas/manifest.json`,
  `.claude/settings.json`, `.claude/hooks/**`, `.githooks/**`) or to
  `CLAUDE.md`. Auto mode may refuse the edit outright; when it does, stop, and
  leave the edit to the human.
- Checking an approved edit, after its PR merges, in a Claude Code session
  started in the Engagement repo: ask for the `setup-atlas` skill's **verify**
  step, not a setup or refresh. An edited Atlas-managed section (`CLAUDE.md`,
  `docs/agents/*`, the operators guide) shows as "sanctioned drift (preserved
  edit)": setup keeps it on reruns, and nothing more is needed. Run
  `/setup-atlas adopt <file> --approval <PR URL> --approver "<name>"` only for
  a file verify names as needing it. Adopt covers the installed guard and
  git-hook files, and refuses the rest, `CLAUDE.md` included. That skill is
  user-invoked; the agent can't run it.
- Agreeing the brief and the user stories with the client contact.

### Guardrails you'll meet

- `git checkout -- <path>` is blocked. Playwright runs delete
  `playwright-report/.gitkeep` and `test-results/.gitkeep`; recreate them with
  `: > <path>` before committing.
- Force-push is denied. Resolve a conflict by merging `origin/main` into the
  branch.
- The shell guardrail can't evaluate very long compound commands. Write the
  script to a scratch file and run it.
- Local runs rewrite `dashboards/`, which CI owns. Restore the generated files
  (`dashboards/qa-metrics.md`, `dashboards/test-results/*`) from `HEAD` before
  committing, and leave `dashboards/scripts/` alone.

## Steps

### 1. Create the repo

If this clone is the template itself (`gh repo view --json isTemplate`), ask the human for the new repo's
`owner/repo` and visibility (private for a real company's site), then
`gh repo create <owner/repo> --template <this repo> --clone`, and work in the
new clone from here. Run `npm install`, `npm run test:unit`, and
`npm run test:template-check`. Hand off the git hooks. Start the log.

Rename the Atlas framing. The new repo inherits the template's: it calls
itself `QA-framework-template`, names the template repo as its issue
tracker, and describes itself as the generic template. Agents read those
files as instructions, so a stale name sends them to the wrong repo (a bare
`#N` means the template's issue, not the Engagement's), and a stale
description has them treat the Engagement as the template. Change the
workspace and repository name to the new repo's, and describe it as the
Engagement for the site:

- `CLAUDE.md`: the issue tracker's repo; the workspace, repository, and
  protected-branch names; and the repository framing.
- `.atlas/manifest.json`: the repository `id`.
- `docs/agents/issue-tracker.md` and `docs/atlas-operators-guide.md`: the
  repository name, and what the repo is for.
- `CONTEXT.md`: its title and opening line. The vocabulary stays.

Keep mentions that say where the repo came from. Hand off the approval of
the `CLAUDE.md` and manifest edits and, after the PR merges, the verify check
(see Hand-offs). Verify accepts the rename, the manifest's repository `id`
included, so there's normally nothing to adopt. The framing's structure and
rules name the template's specs and projects; step 3 brings them up to date.

**Done when:** the new repo exists, both self-checks pass, the hooks are
active, the framing names the new repo (`grep -rn QA-framework-template`
finds only "created from" mentions), and step 1's log entry records the
count of `TODO(Engagement)` markers left.

### 2. Draft the brief

**Probe** the site: load every page, and list its forms, outbound links, and
downloads. Ask the human what the tests may do there. For a live site with no
staging copy, the answer is **read-only**: load and look, and never submit a
form, not even an empty one, since a form with no required fields sends a real
submission. Copy the brief template to `docs/engagement-brief.md` and fill in
everything the site shows. Mark the people and contacts `TBD`, and the status
Draft.

Ask the human whether the client has manual test cases already written. If
so, run `node .claude/skills/import-test-cases/import.js normalise <file>
--preview` on the file, and draft the brief's scope from the cases' `section`
values instead of guessing it from the probe alone. Otherwise draft the scope
from the probe as usual.

**Done when:** every section of the brief is filled in or explicitly `TBD`, and
the read-only rule (or what the client allows instead) is in the Environments table's "What we may do there".

### 3. Replace the Site config

Follow [`site-config.md`](site-config.md).

Update `CLAUDE.md`'s repository structure and rules to match: the specs
kept, the Playwright projects, and what the tests may do on each environment.
It's a guardrail edit, so it's a hand-off like step 1's.

**Done when:** no `TODO(Engagement)` marker is left in code; the skeleton
specs that don't fit the site are replaced or removed; every remaining test
has run against the live site on desktop and phone twice, with the same
results both times; and each failure is a real defect, named in the log.

### 4. Create the labels

`npm run labels:setup -- <owner/repo>`, after a `--dry-run`.

**Done when:** the script reports every label present.

### 5. Create the project board

`npm run board:setup -- <owner/repo>`. Hand off the Board view. The script
prints the human-only Status option ids for `.atlas/manifest.json`
`human_only_state_ids`. Offer that edit as a guardrail hand-off; it's optional,
because the state names are already listed.

**Done when:** the board exists and is linked, the human has added the Board
view, and the option ids are in the log.

### 6. Point the issue forms' contact links

Replace the placeholders in `.github/ISSUE_TEMPLATE/config.yml` with the
Engagement's channels. Until there are real ones, link the brief, the handbook,
and the board.

**Done when:** no `example.com` URL is left in the file.

### 7. Run the browser tests in CI

In `.github/workflows/qa-test.yml`, run the e2e jobs on push and PR (not only
on dispatch), for both the desktop and `-mobile` projects. Drop the jobs for
specs removed in step 3, and match the dashboard generator's inputs in
`dashboards/scripts/generate-dashboard.js`. Keep the link checker on demand.
Ask the human how to treat a test that fails on a known site defect: leave it
**red** (honest, and the default), or mark it as a known failure linked to its
bug. Update the brief's "When the tests run".

**Done when:** the PR's CI has run, and every red check is a known defect.

### 8. File the findings

Follow the "Findings" section of [`stories-and-tests.md`](stories-and-tests.md).

**Done when:** every defect named in the log so far is re-checked and either
filed or dropped (with the reason logged), and every filed one is on the board.

### 9. Write the stories and test cases

Ask the human whether the client has manual test cases. If so, run
[`/import-test-cases <file>`](../import-test-cases/SKILL.md) in place of the
"Stories and test cases" section of
[`stories-and-tests.md`](stories-and-tests.md). Otherwise follow that
section.

**Done when:** `npm run coverage` lists every test with a test case ID and an
issue, and no untraced tests; every acceptance criterion has a test case; and
every filed finding is caught by a test or says why it can't be.

### 10. Close out

After the step 9 PR merges, relabel its new test cases `test-automated` and
set their Automation Status. Watch the first runs on `main`, read the
dashboard they publish, and check that its counts match the runs'.

Rewrite `README.md` as the Engagement's front door. It still describes the
template: how to create an Engagement, and the Framework's history. Replace
that with:

- what the repo tests, and on which devices;
- where things stand: the stories and test cases, the known defects, and any
  check that's red on purpose;
- the rules the tests keep (read-only, no staging, rate limits);
- where things are: the brief, the log, the board, the coverage map, the
  dashboard, and the Site config;
- how to run each suite, and what CI runs when;
- what to do going forward: triage, a red test turning green, a new defect,
  and an intended site change.

Carry the Atlas section over byte for byte: setup manages everything between
its `atlas-v3:readme` markers. Link to the brief and the log rather than
copying facts from them.

Hand off the client agreement.

**Done when:** every test case is `test-automated`; the dashboard's pass,
fail, and skip counts match the latest run; the README describes the
Engagement, not the template; and the only unticked kickoff item is the
client agreement.
