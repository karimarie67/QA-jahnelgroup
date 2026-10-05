# Skills

Claude Code skills for setting up and running an Engagement. Each folder is one
skill: Claude Code finds it by its `SKILL.md`, which must keep that name. The
skill's command is the folder's name.

Both skills are **user-invoked**: you type the command in a Claude Code session
started in the repo, and an agent can't start them on its own. Each works one
step at a time, writes a dated entry per step to `docs/engagement-log.md`, lands
each step through a PR that you review and merge, and stops at every hand-off
only you can do (approving guardrail edits, board views, client agreement).

| Skill | What it does | Run it when |
|---|---|---|
| [`/new-engagement`](./new-engagement/SKILL.md) | Creates an Engagement repo from this template and works through its kickoff: the brief, the Site config, labels and the project board, CI, findings, stories and test cases, and the README | You're starting QA for a new client site |
| [`/import-test-cases`](./import-test-cases/SKILL.md) | Turns a client's own manual test cases into traced Test Case issues and automated tests, and reports each case as automated, partly automated, manual, or stale | The client already has written test cases. `/new-engagement` step 7 hands off to it |

## `/new-engagement <site URL> [owner/repo]`

Run it from a clone of this template. It creates the new repo (private for a
real company's site) and carries on there, in eight steps:

1. Create the repo, and rename the Atlas framing to it
2. Probe the site and draft the brief
3. Replace the Site config, and prove every test
4. Labels, the project board, and the issue form links
5. Browser tests in CI on every push and PR
6. File the findings
7. Stories and test cases (or `/import-test-cases`)
8. Close out: the dashboard, the README, and the client agreement

Run it again in an Engagement repo and it reads the log and carries on from the
first step not done. Its supporting files, read along the way:

- [`shared-rules.md`](./new-engagement/shared-rules.md): the step loop, the
  log format, hand-offs, creating issues, guardrails, and proving a test can
  fail. `/import-test-cases` follows it too.
- [`site-config.md`](./new-engagement/site-config.md): probing the site, and
  filling in the Site config so the tests hold up.
- [`stories-and-tests.md`](./new-engagement/stories-and-tests.md): filing
  findings, and writing stories and test cases.

## `/import-test-cases <file>`

Run it in an Engagement repo, with the client's file. It reads CSV and XLSX
spreadsheets, and CSV exports from TestRail, Zephyr Scale, Xray, and qTest; for
any other layout it proposes a column map for you to confirm. A file that holds
a password is replaced by a fresh copy without it before import.

It works in eight steps: take in the file, probe each case against the site,
sort the cases into buckets, assign IDs, create the stories and Test Case
issues, automate in batches, relabel after each merge, and report. Its state is
kept in `docs/client-test-cases/cases.json` and changed only through its CLI
(`node .claude/skills/import-test-cases/import.js`), so running it again
resumes where it stopped and never creates anything twice.

## Prerequisites

- `gh` signed in, with access to the client repo, and Node with
  `npm install` and `npx playwright install chromium` run.
- Git hooks active in the repo: `git config core.hooksPath .githooks`
  (`/new-engagement` step 1 asks you to).
- The site's URL, and what the tests may do there. Step 2 asks; on a live site
  with no staging copy the default is read-only.
