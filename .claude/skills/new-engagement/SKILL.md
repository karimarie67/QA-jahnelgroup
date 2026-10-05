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

Read [`shared-rules.md`](shared-rules.md) first. It holds the step loop, the
log format, what a hand-off is, how to create issues, the guardrails you'll
meet, and how to prove a test can fail. This skill doesn't repeat them.

## How this skill runs

Each step below is one pass through the step loop and ends in one PR. Its log
entries are titled `## Step N — <what> (<date>)`.

When a step's **Done when** is true, tick the matching box in the Kickoff
checklist of `docs/engagement-brief.md`, in that step's commit. Step 8 expects
every box ticked except the client agreement.

| Kickoff checklist item | Ticked in |
|---|---|
| Git hooks activated | step 1 |
| Site config replaced | step 3 |
| Labels created; Project board created; `config.yml` links point at the Engagement's channels | step 4 |
| Browser e2e jobs enabled on push and PR | step 5 |
| `npm run coverage` run and `docs/coverage-map.md` committed | step 7 |
| `README.md` rewritten for the Engagement | step 8 |
| Brief filled in and agreed with the client contact | the client agreement hand-off, after step 8 |

### Hand-offs in this skill

On top of merging each PR and approving guardrail-file edits (see
`shared-rules.md`):

- Activating git hooks: `git config core.hooksPath .githooks`. The guardrail
  blocks the agent from any hook-path command, including reads, so check
  `.git/config` directly.
- Adding the project board's Board view (grouped by Status). GitHub's API
  can't create views.
- Turning on auto-delete of merged branches for the new repo:
  `gh repo edit <owner/repo> --delete-branch-on-merge`. Repo settings are the
  human's. Without it, a stacked PR whose parent merged first lands on the
  parent's branch, not on `main`, and has to be re-landed.
- Adopting an approved edit to a guard or git-hook file, when the verify
  check below names one as needing it:
  `/setup-atlas adopt <file> --approval <PR URL> --approver "<name>"`. That
  skill is user-invoked; the agent can't run it. Adopt covers the installed
  guard and git-hook files, and refuses the rest, `CLAUDE.md` included.
- Agreeing the brief and the user stories with the client contact.

### Checking an approved edit

After a PR with a `CLAUDE.md` or `.atlas/manifest.json` edit merges, run the
Atlas **verify** check on the updated `main` of the Engagement repo. It's not a
hand-off: the check is read-only, so the agent runs it. `setup-atlas` has no
`verify` command to find, and `/verify` is something else. Verify is the
script that section 4 ("Verify") of the `setup-atlas` skill runs:

```
root=$(dirname "$(dirname "$(dirname "$(find ~/.claude/plugins -path '*/skills/setup-atlas/SKILL.md' -not -path '*/.trash/*' | head -1)")")")
CLAUDE_PLUGIN_ROOT="$root" python3 "$root/scripts/atlas_scaffold" verify --repo .
```

It prints JSON. Top-level `"passed": true` is the result to log, with the
number of checks. An edited Atlas-managed section (`CLAUDE.md`,
`docs/agents/*`, the operators guide) shows as `"sanctioned_drift": true`
("sanctioned drift (preserved edit)"): setup keeps it on reruns, and nothing
more is needed. Hand off an adopt (above) only for a file a failed check names.

## Steps

### 1. Create the repo

Run `gh repo view --json isTemplate`.

- If this clone **isn't** the template, it's already an Engagement. Read
  `docs/engagement-log.md`, say which steps it records as done, and carry on
  from the first one it doesn't.
- If it **is** the template, ask the human for the new repo's `owner/repo` and
  its visibility (private for a real company's site), then
  `gh repo create <owner/repo> --template <this repo> --clone --private` (or
  `--public`, as they said). Work in the new clone from here.

**Rename the Atlas framing.** The new repo inherits the template's: it calls
itself `QA-framework-template`, names the template repo as its issue tracker,
and describes itself as the generic template. Agents read those files as
instructions, so a stale name sends them to the wrong repo (a bare `#N` means
the template's issue, not the Engagement's), and a stale description has them
treat the Engagement as the template. Change the workspace and repository name
to the new repo's, and describe it as the Engagement for the site:

- `CLAUDE.md`: the issue tracker's repo; the workspace, repository, and
  protected-branch names; and the repository framing.
- `.atlas/manifest.json`: the repository `id`.
- `docs/agents/issue-tracker.md` and `docs/atlas-operators-guide.md`: the
  repository name, and what the repo is for.
- `CONTEXT.md`: its title and opening line. The vocabulary stays.
- `package.json`: `name` and `description`. Then run `npm install`, so
  `package-lock.json` follows.
- `scripts/template-check.js`: the name in its header comment.

Keep mentions that say where the repo came from. Hand off the approval of the
`CLAUDE.md` and manifest edits, and after the PR merges, run the verify check
(see "Checking an approved edit"). Verify accepts the rename, the manifest's
repository `id` included, so there's normally nothing to adopt. The framing's
structure and rules name the template's specs and projects; step 3 brings them
up to date.

**Clear the template's proof of work.** Whatever the template committed under
`test-results/` (other than `.gitkeep`) is the template's evidence, not this
Engagement's. List it with `git ls-files test-results`, and remove it with
`git rm -r`. Empty the template's dashboard history too: write `[]` to
`dashboards/test-results/history.json`, or the template's own runs show up as
this Engagement's first rows on its dashboard. CI owns `dashboards/` from here
on.

Then run `npm run test:unit`, `npm run test:template-check`, and `npm run
lint`, hand off the git hooks, and start the log.

**Done when:** the new repo exists, the three self-checks pass, the hooks are
active, the framing names the new repo, and step 1's log entry records the
count of `TODO(Engagement)` markers left. The framing check is:

```
grep -rIl QA-framework-template . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=.claude
```

It may list only files whose mention says where the repo came from.

### 2. Draft the brief

**Probe** the site: load every page, and list its forms, outbound links, and
downloads. Follow the links from the home page, then load the sitemap's pages
(`/sitemap.xml`) that the links didn't reach, and check each download with a
`HEAD` request rather than fetching it. Space the requests (a second or so
apart) on a live site. Ask the human what the tests may do there. For a live site with no
staging copy, the answer is **read-only**: load and look, and never submit a
form, not even an empty one, since a form with no required fields sends a real
submission. Copy the brief template to `docs/engagement-brief.md` and fill in
everything the site shows. Mark the people and contacts `TBD`, and the status
Draft. Under "Browsers and devices", name the phone emulation the tests will
use (step 3 sets it up), not a window width.

Ask the human whether the site has a login the tests need, and if so which
test account: one account, holding nothing about a real person. Name it in the
brief's "Test accounts and data" by its secret names, `QA_USERNAME` and
`QA_PASSWORD`, never its values (step 3 fills in `siteConfig.auth`; step 5
sets the secrets).

Ask the human whether the client has manual test cases already written, and
log the answer, since steps 7 and 8 depend on it. If so, run
`node .claude/skills/import-test-cases/import.js normalise <file> --preview`
on the file, and draft the brief's scope from the section list it prints (each
section with its case count) instead of guessing it from the probe alone.
Otherwise draft the scope from the probe as usual.

**Done when:** every section of the brief is filled in or explicitly `TBD`, and
the read-only rule (or what the client allows instead) is in the Environments
table's "What we may do there".

### 3. Replace the Site config

Follow [`site-config.md`](site-config.md).

Update `CLAUDE.md`'s repository structure and rules to match: the specs kept,
the Playwright projects, and what the tests may do on each environment. It's a
guardrail edit, so it's a hand-off like step 1's.

**Done when:** no `TODO(Engagement)` marker is left in code; the skeleton specs
that don't fit the site are replaced or removed; the `*-mobile` projects use a
phone emulation; every remaining test has run against the live site on desktop
and phone twice, with the same results both times; each passing test has been
proven able to fail (see `shared-rules.md`); and each failure is a real defect,
named in the log.

### 4. Set up the GitHub side

**A client that tracks work in Jira:** follow [`docs/jira.md`](../../../docs/jira.md)
instead of the labels and the board, and do the contact links as it says.

Three small, independent pieces in one step and one PR:

1. **Labels:** `npm run labels:setup -- <owner/repo> --dry-run`, read it, then
   without `--dry-run`.
2. **Project board:** `npm run board:setup -- <owner/repo>`. Hand off the Board
   view. The script prints the human-only Status option ids for
   `.atlas/manifest.json` `human_only_state_ids`. Offer that edit as a guardrail
   hand-off; it's optional, because the state names are already listed.
3. **Issue form contact links:** replace the placeholders in
   `.github/ISSUE_TEMPLATE/config.yml` with the Engagement's channels. Until
   there are real ones, link the brief, the handbook, and the board.

**Done when:** the labels script reports every label present; the board exists
and is linked, the human has added the Board view, and the option ids are in
the log; and no `example.com` URL is left in `config.yml`.

### 5. Run the browser tests in CI

In `.github/workflows/qa-test.yml`:

- Run the e2e jobs on push and PR (not only on dispatch). Each job already runs
  the desktop and `-mobile` projects. Change each job's `if:` to the
  expression in the comment above `smoke-tests`.
- The template's e2e jobs are `smoke-tests` (every `@smoke` test) and
  `functional-tests` (every `@regression` test, in one job and one JSON
  file). They select by tag, so a spec removed in step 3 needs no edit here.
  But a job whose tag no longer matches any test fails ("No tests found"):
  drop that job, **and** take it out of the `needs` list of
  `update-dashboard`. The dashboard job runs only on dispatch, so
  without a change it never updates from a push to `main`. Change its `if:`
  to the expression in its comment: on dispatch (except a links-only run) and
  on a push to `main`, and **never** on a PR, because it commits to the branch
  that ran.
- Match the dashboard generator's inputs in
  `dashboards/scripts/generate-dashboard.js`, and name the functional section
  for the suites that remain.
- Keep the link checker on demand: its `link-check` job runs only on
  dispatch, with `links` or `all`.
- **The nightly schedule** (to monitor the live site): ask the human whether
  to turn it on and at what time; it's their call. If so, uncomment the
  `schedule:` block under `on:` (set the cron time), use the
  `update-dashboard` `if:` with `schedule` from its comment, and pick the
  environment (`TEST_ENV`'s comment shows production). Optionally add the
  link checker to it. Record it in the brief's "When the tests run". After
  the first night, check the run and the dashboard.

**A site with a login:** hand off setting the repo secrets `QA_USERNAME` and
`QA_PASSWORD` (Settings → Secrets and variables → Actions); the human sets
them, and never pastes the values into the session. The first `regression`
run checks they reach the tests: TC_AUTH_001 (the login) passes, and
TC_AUTH_002 and TC_AUTH_003 run rather than skip.

Ask the human how to treat a test that fails on a known site defect: leave it
**red** (honest, and the default), or mark it as a known failure linked to its
bug. Update the brief's "When the tests run", and the "When" and "Coverage"
columns of the commands table in `docs/agents/testing.md` (an Atlas-managed
section, so its edit shows as sanctioned drift and needs nothing more).

**Done when:** the PR's CI has run, every red check is a known defect, and the
brief and `testing.md` describe what CI now runs.

### 6. File the findings

Follow the "Findings" section of [`stories-and-tests.md`](stories-and-tests.md).

**Done when:** every defect named in the log so far is re-checked and either
filed or dropped (with the reason logged), and every filed one is on the board.

### 7. Write the stories and test cases

Use the answer logged in step 2.

- **The client has manual test cases.** Ask the human to run
  `/import-test-cases <file>`. It's user-invoked, so you can't start it
  yourself. Or, if they'd rather, read and follow
  [its SKILL.md](../import-test-cases/SKILL.md) with them. Its steps 1 to 8
  replace the "Stories and test cases" section of `stories-and-tests.md`, its
  log entries are titled `## Import step N`, and its findings follow this
  skill's step 6 rules. If `docs/client-test-cases/cases.json` already exists,
  the import has started: carry on from the step its log says is next.

  **The import alone leaves step 3's tests untraced.** It creates issues only
  for the client's cases, but the tests written in step 3 still need stories
  and Test Case issues for this step's "Done when", and a client case matched
  to one of them is meant to comment on that test's issue. So trace them in
  the same import: in its step 3, tell the human, and in its step 5 preview,
  add QA-drafted stories and a Test Case issue for each step 3 test, written
  by `stories-and-tests.md`'s "Stories and test cases" rules (findings as
  acceptance criteria, `test-automated` for merged tests). A filed finding no
  test catches yet becomes a new test case there too. In its first batch,
  give the step 3 tests their ID-first titles and `issue` annotations.
- **No client cases.** Follow the "Stories and test cases" section of
  `stories-and-tests.md`.

**Done when:** `npm run coverage` lists every test with a test case ID and an
issue, and no untraced tests, and `docs/coverage-map.md` is committed; every
acceptance criterion has a test case; and every filed finding is caught by a
test or says why it can't be. When the import ran, its `reconcile --final`
exits 0 as well.

### 8. Close out

After the step 7 PR merges:

- **Relabel.** Relabel its new test cases `test-automated`, and in each Test
  Case issue set Automation Status to `Automated` and fill in Automation File
  Path. When the import ran, its step 7 already did this, so skip it.
- **Watch the first runs on `main`,** read the dashboard they publish, and
  check that its counts match the runs'. Check against the run's own results,
  not by eye: download each suite's JSON artifact, and add up its `expected`
  (passed), `unexpected` (failed), `flaky`, and `skipped` stats. The pass rate
  leaves skipped tests out (passed ÷ (total − skipped)), and a test's time is
  its last attempt's, marked "×2" when CI retried it.
- **Rewrite `README.md`** as the Engagement's front door. It still describes
  the template: how to create an Engagement, and the Framework's history.
  Replace that with:
  - what the repo tests, and on which devices;
  - where things stand: the stories and test cases, the known defects, and any
    check that's red on purpose;
  - the rules the tests keep (read-only, no staging, rate limits);
  - where things are: the brief, the log, the board, the coverage map, the
    dashboard, and the Site config;
  - how to run each suite, and what CI runs when;
  - what to do going forward: triage, a red test turning green, a new defect,
    and an intended site change.

  Link to the brief and the log rather than copying facts from them. Carry the
  Atlas section over byte for byte: setup manages everything between its
  `atlas-v3:readme` markers. Prove it. Before you rewrite, save the block with
  `sed -n '/atlas-v3:readme:start/,/atlas-v3:readme:end/p' README.md` into a
  scratch file, do the same after, and `diff` the two: no output means it's
  intact.
- Hand off the client agreement.

**Done when:** every test case is `test-automated`; the dashboard's pass, fail,
and skip counts match the latest run; the README describes the Engagement, not
the template, and its Atlas block is unchanged; and every box in the Kickoff
checklist is ticked except the client agreement.

### After the client agrees

When the human reports the agreement (from the client contact, or standing in
for one), log who agreed and when, then:

- Set the brief's status to "Agreed on <date> with <who>", its "Last
  reviewed" date, and tick its last Kickoff box. A `TBD` the client leaves
  open is agreed as open: say so in the log.
- In each story, replace "pending agreement" with the agreement.
- Record the client's answers to open questions (a stale case, a finding's
  scope) in the log. A stale case the client says the site should meet comes
  back into the import: see the import skill's step 3.
- Triage is the human's: they confirm each finding's severity and remove
  `needs-triage` (`docs/agents/triage-labels.md`). The board's `In QA` and
  `Done` stay human-only. Afterwards, bring the README's known-defects list in
  line with what triage decided (a `wontfix` drops its test and acceptance
  criterion too).
