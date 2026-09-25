# Engagement log — QA-jahnelgroup

The record of how this Engagement was built from the `QA-framework-template`
Framework against https://www.jahnelgroup.com, one entry per step of the
`new-engagement` skill.

## Step 1 — Create the repo (2026-09-25)

**What we did**

- Created `karimarie67/QA-jahnelgroup` from the `karimarie67/QA-framework-template`
  template and cloned it to `~/QA-jahnelgroup`.
- Installed dependencies and ran both self-checks.
- Renamed the Atlas framing from the template to this Engagement: the issue
  tracker's repo, the workspace, repository, and protected-branch names, and the
  repository framing in `CLAUDE.md`; the repository `id` in
  `.atlas/manifest.json`; the repository name and purpose in
  `docs/agents/issue-tracker.md` and `docs/atlas-operators-guide.md`; and the
  title and opening line of `CONTEXT.md`.

**Decisions**

- **Private repo.** jahnelgroup.com is a real company's site.
- **Repo name `QA-jahnelgroup`.** Follows the `QA-<site>` pattern of the other
  Engagements.
- **Kept the "created from `QA-framework-template`" mentions** in `CLAUDE.md`,
  `CONTEXT.md`, and the operators guide, since they say where the repo came from.
- **Left the template's own files alone.** `scripts/template-check.js` (the
  Framework's structural check, which still runs here), the
  `new-engagement` skill, and `test-results/import-test-cases/` (the template's
  recorded evidence for its import-test-cases PR) still name the template; they
  describe the Framework, not this repo.
- **Left `CLAUDE.md`'s Structure and rules as the template's.** Step 3 brings
  them up to date with the specs and projects kept.

**Result**

| Command | Outcome |
|---|---|
| `gh repo create karimarie67/QA-jahnelgroup --private --template karimarie67/QA-framework-template --clone` | Repo created and cloned |
| `npm install` | OK |
| `npm run test:unit` | 263 pass, 0 fail |
| `npm run test:template-check` | PASS (both modules import; all 5 expected specs discovered) |
| `grep -rn QA-framework-template` | Only "created from" mentions and the template-owned files listed above |
| `grep -rc "TODO(Engagement)"` | 35 markers left: 28 in code (`config-helper.js` 8, `download_search_tests.spec.js` 6, `playwright.config.js` 4, `check-links.spec.js` 4, `smoke_tests.spec.js` 3, `documentation_tests.spec.js` 2, `selectors.js` 1) and 7 in docs (`README.md` 4, the skill 2, the brief template 1) |
| `grep hooksPath .git/config` | `core.hooksPath = .githooks` (set by the human) |

**Next**

- Human: approve this PR's `CLAUDE.md` and manifest edits by merging it, then
  run the `setup-atlas` **verify** step in a Claude Code session started in this
  repo.
- Step 2: probe the site and draft the brief.

## Step 2 — Draft the brief (2026-09-25)

Stacked on step 1 (#1).

**What we did**

- Probed https://www.jahnelgroup.com read-only with a headless Chromium crawl
  that follows the site's own links from the homepage. It made GET navigations
  only, one page at a time and 1.5 s apart, and never clicked, typed, or
  submitted. It found 27 pages, all 200. There's no `robots.txt` or
  `sitemap.xml`; both return the 404 page.
- Listed what the pages hold:
  - **Forms:** the contact form (`#conForm`) on `/` and `/contact` has Email
    and Message required, a honeypot, and reCAPTCHA. The job application form
    (`#apl-form`) on `/careers` and `/positions` is hidden until Apply opens
    it, and its fields load from Greenhouse (`greenhouse.js`).
  - **Outbound links:** social profiles (LinkedIn, Facebook, Instagram,
    YouTube, X); vendor policy pages on the trust pages (Anthropic/Claude,
    GitHub, Google Workspace and Gemini, Cursor, JetBrains, Fireflies); and
    `mailto:general@`, `mailto:security@`, and `tel:+15183560039`.
  - **Downloads:** none. **Search:** none.
  - **Embeds:** YouTube and Vimeo videos on `/videos` and `/office`, a Google
    Map and a Matterport tour on `/office`, and reCAPTCHA on the contact form.
  - **Phone (390×844):** the homepage has no sideways scroll, and a
    `Toggle menu` button opens the nav.
  - **404:** an unknown path returns the custom 404 page with a 404 status.
- Copied the brief template to `docs/engagement-brief.md` and filled in what
  the site shows. People, contacts, release gates, targets, and "When the
  tests run" are `TBD`, and the status is Draft.

**Decisions**

- **Read-only on production.** The human confirmed it. The site is live with
  no staging copy, and both forms send real submissions: the contact form to
  Jahnel Group, and applications to Greenhouse. Tests load and look, open and
  close menus, filters, and modals, and never type into or submit a form.
  This is in the brief's Environments table.
- **No client test cases.** The human confirmed there are none, so the scope
  is drafted from the probe.
- **Don't count the open roles.** The Greenhouse list (18 roles today)
  changes as roles open and close, so tests check that it loads, not how many.
- **Staging is recorded as none.** The `staging` projects stay unused until
  the client provides one.

**Result**

| Command | Outcome |
|---|---|
| Read-only crawl (`page.goto` from `/`, following same-origin links) | 27 pages, all 200; none left unvisited |
| `curl https://www.jahnelgroup.com/robots.txt` and `/sitemap.xml` | 404 for both |
| Unknown path `/this-page-does-not-exist-qa-probe` | 404 status, "Page Not Found — Jahnel Group" |
| Brief sections | All filled in, or explicitly `TBD` |

**Candidate findings** (to re-check and file or drop in step 8)

- `/contact` has no `<h1>`; its first heading is the `<h2>` "Send us a
  message." Every other page has one.
- On `/videos`, the Vimeo embed `746945239` returned 401 to the headless
  browser. It may be a private video, or Vimeo's bot check; re-check in a
  real browser.
- The tracking pixel in the shared `<head>` runs with `debug:true` on the
  production hostname.
- No `robots.txt` or `sitemap.xml`.

**Next**

- Human: agree the brief and its `TBD`s with the client contact (tracked to
  step 10).
- Step 3: replace the Site config.

## Step 3 — Replace the Site config (2026-09-25)

Stacked on step 2 (#3).

**What we did**

- Probed the pages again, read-only, for the hooks the tests need: the
  header's and footer's accessible names, the Services menu, the contact
  form's labels and `required` attributes, the Open Positions filters and role
  details, the 404 page, and the phone menu on an emulated Pixel 5. Each
  candidate defect was re-checked with a screenshot.
- **`playwright.config.js`:** every project points at
  `https://www.jahnelgroup.com`. The two `*-mobile` projects emulate a Pixel 5,
  and a run uses one worker.
- **`config-helper.js`:** rewritten for the site. It holds the 27 page paths
  and their titles, the header, Services, footer, and social links, the
  footer's contact details, the six contact form fields (two required), and
  the four role filters.
- **`selectors.js`:** added a `selectors.jg` block, hooked by role and
  accessible name, and dropped the template's leftover `#gecko-search-button`.
- **Specs:**
  - `smoke_tests.spec.js` is rewritten as 8 smoke tests: the home page, the
    header menu, the Services menu, every page's title and main heading, the
    footer, the contact form (looked at, never sent), Open Positions (filters,
    and a role's details), and the phone layout and menu.
  - `error_handling_tests.spec.js` keeps 3 tests: the 404 page, malformed
    addresses, and outbound links (the footer's social links and the trust
    pages' vendor links). It drops the documentation-link and search tests,
    which don't apply, and `TC_ERROR_006`, which clicks submit on the first
    form it finds.
  - `check-links.spec.js` crawls the site from `/`, and now fails on a broken
    link (see Decisions).
  - `documentation_tests.spec.js` and `download_search_tests.spec.js` are
    removed: the site has no documentation, downloads, or search.
- Updated the unit tests, `template-check`'s spec list,
  `npm run test:regression`, the test-case issue form's example, and the
  operators guide's regression row to match, and regenerated
  [`docs/coverage-map.md`](./coverage-map.md).
- Updated `CLAUDE.md`'s structure and rules: the specs, the Site config, and
  the read-only rule for every project.

**Decisions**

- **Staging points at the live site.** This corrects step 2, which recorded
  the `staging` projects as unused. Manual CI runs default to `staging`, so
  pointing it at the live site gives those runs a real target, and the tests
  are read-only either way. The brief's Environments table now says so.
- **Phone emulation, not an 800x600 window.** On a phone, the header menu is
  behind a `Toggle menu` button that slides it in from the right.
- **"Menu open" means the link is on screen.** The closed phone menu sits
  off-screen, where Playwright still counts its links as visible. So the
  tests check `toBeInViewport`, and tap the button until the first link is on
  screen.
- **Role details, not role counts.** The role buttons are named About (step 2
  called them Overview; the brief is corrected). The Open Positions test
  checks that each filter shows as many roles as its label says, and that
  About opens a role's details and closes them. It never presses Apply.
- **One worker.** The brief asks for a gentle request rate on the live site.
- **The link checker can fail now.** The template's version always passed:
  it read `response?.status` without calling it, and `status` is a method,
  so no response ever counted as broken. It also filed pages that failed to
  load under their error message rather than as `site`. Both are fixed, and a
  broken site link now fails `TC_LINKS_001`. The template and QA-kcs have the
  same bug.
- **No full-page screenshot of a very tall page.** On the phone, `/photos` is
  163,129 px tall. The load helper's full-page screenshot outlasts its 3 s
  timeout and leaves the browser busy, and the next page (`/videos`) then
  timed out loading in 3 of 7 phone passes. Loaded on their own, both pages
  take under 250 ms. `utils.js` now takes a screen-sized screenshot of any
  page over 20,000 px. The template has the same helper.
- **A link that doesn't answer gets a second try.** One run's request to
  `support.google.com` stalled for 15 s, though it answers in under a second.
  One stalled request isn't a broken link, but a 404 or 410 is.
- **Soft checks per page.** In `TC_SMOKE_004` a failed page load is soft too,
  so one page can't stop the rest being checked.

**Result**

| Check | Result |
|---|---|
| `npm run test:unit` | 285 passed, 0 failed |
| `npm run test:template-check` | PASS (3 specs discovered) |
| Smoke and error handling, desktop and phone (`production`, `production-mobile`), `--retries=0`, run twice | 19 passed, 1 skipped (phone-only test on desktop), **2 failed**, the same both runs |
| `npm run test:links` | 36 URLs checked, 0 broken |
| Each test made to fail once (an expected value broken, then restored) | All 11 passing tests failed on the assertion under test; `TC_SMOKE_004` already fails on the defect below |
| `TODO(Engagement)` markers left in code | 0 |

**The 2 failures are one defect, caught on desktop and phone:** `/contact` has
no `<h1>`. `TC_SMOKE_004` expects one on every page, and the Contact page's
top heading is the `<h2>` "Send us a message." Every other page has one.

**Candidate findings** (carried to step 8 with step 2's)

| Finding | Where | Brief severity |
|---|---|---|
| No `<h1>` (confirmed; caught by `TC_SMOKE_004`) | `/contact` | Medium |
| No `<main>` or `<header>` element, so screen readers can't jump to the content | Every page | To triage |
| The phone menu button has no `aria-expanded`, so a screen reader can't tell whether the menu is open | Every page, phone | To triage |
| The JG Atlas title uses "·" where every other title uses "—" | `/jg-atlas` | Low |

**Carried forward:** `qa-test.yml` still has manual-dispatch jobs for the two
removed specs. Step 7 removes them, when it turns on the browser jobs.

**Next**

- Human: approve this PR's `CLAUDE.md` edit by merging it, then run the
  `setup-atlas` **verify** step.
- Step 4: create the labels.

## Step 4 — Create the labels (2026-09-25)

Stacked on step 3 (#4).

**What we did**

- Ran `npm run labels:setup` against `karimarie67/QA-jahnelgroup`, after a dry
  run. It created the test-management labels (`user-story`, `test-case`,
  `test-manual`, `test-needs-automation`, `test-automated`), the triage labels
  (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`), and
  `qa`, which the QA finding form applies. `wontfix`, `bug`, and
  `enhancement` were already there, as GitHub defaults.
- Ticked the brief's "Labels created" kickoff item.

**Decisions**

- **Dry run first.** It showed exactly the 10 labels to add and nothing to
  change, so the real run went ahead as-is.

**Result**

| Command | Outcome |
|---|---|
| `npm run labels:setup -- karimarie67/QA-jahnelgroup --dry-run` | 10 to create, 3 already there |
| `npm run labels:setup -- karimarie67/QA-jahnelgroup` | 10 created, 3 already there |
| The dry run again | 0 to create, 13 already there |

**Next**

- Step 5: create the project board.

## Step 5 — Create the project board (2026-09-25)

Stacked on step 4 (#6).

**What we did**

- Ran `npm run board:setup -- karimarie67/QA-jahnelgroup`. It created project
  [#8 "QA-jahnelgroup"](https://github.com/users/karimarie67/projects/8), set
  its Status options to the lifecycle in `docs/agents/issue-tracker.md`
  (Backlog → To Do → In Progress → In QA → Done), and linked it to the repo.
- The human added the Board view, "JG BOARD", with columns by Status. They
  also renamed the table view "JG".
- Ticked the brief's "Project board created" kickoff item.

**Decisions**

- **Auto-delete merged branches.** The human turned this on for the repo
  (`gh repo edit --delete-branch-on-merge`), after two stacked PRs landed on
  their parent's branch rather than `main`: #2 (step 2, re-landed by #3) and
  #5 (step 4, re-landed by #6). With the parent's branch deleted on merge,
  GitHub moves a stacked PR to `main` by itself.
- **Human-only state IDs not recorded yet.** Adding them to
  `.atlas/manifest.json` `human_only_state_ids` is optional, because the
  manifest already names the states (`In QA`, `Done`), and it's a guardrail
  edit. The IDs are below, for when it's wanted.

**Result**

| Check | Outcome |
|---|---|
| `npm run board:setup -- karimarie67/QA-jahnelgroup` | Created project #8, set 5 Status options, linked to the repo |
| The repo's linked projects (GraphQL `repository.projectsV2`) | Project #8 "QA-jahnelgroup" |
| The project's views (GraphQL `projectV2.views`) | "JG" (table), and "JG BOARD" (board, columns by Status) |

Status option IDs:

| Status | Option ID |
|---|---|
| Backlog | `500ffda0` |
| To Do | `744d5384` |
| In Progress | `0bca9950` |
| In QA | `21d172b9` (human-only) |
| Done | `1dcc3c62` (human-only) |

**Next**

- Step 6: point the issue forms' contact links.

## Step 6 — Point the issue forms' contact links (2026-09-25)

**What we did**

- Replaced the three `example.com` placeholders in
  `.github/ISSUE_TEMPLATE/config.yml`. The links shown when someone opens a
  new issue now go to the Engagement brief, the QA handbook, and the project
  board.
- Ticked the brief's contact-links kickoff item.

**Decisions**

- **Link the brief, the handbook, and the board for now.** The Engagement has
  no chat channel or mailing list yet (the brief's Chat is `TBD`). When it
  does, add them here.
- **Not stacked.** #6 and #7 had both landed on `main`, so this step branches
  from `main`.

**Result**

| Check | Outcome |
|---|---|
| `grep -c example.com .github/ISSUE_TEMPLATE/config.yml` | 0 |
| `ruby -ryaml` parse of `config.yml` | Parses: 3 contact links (Engagement brief, QA Handbook, Project board) |
| Each link's target | `docs/engagement-brief.md` and `docs/qa-handbook.md` are on `main`; project #8 exists |

**Next**

- Step 7: run the browser tests in CI.

## Step 7 — Run the browser tests in CI (2026-09-25)

**What we did**

- In [`qa-test.yml`](../.github/workflows/qa-test.yml), the Smoke and Error
  Handling jobs now run on every push and PR, not only by hand, on desktop and
  phone (`staging` and `staging-mobile`, both pointed at the live site). They
  install only Chromium.
- Removed the jobs for the documentation and download/search specs dropped in
  step 3, and removed their files from the dashboard generator
  (`dashboards/scripts/generate-dashboard.js`).
- Gave the link checker a job of its own, on demand only: a manual run with
  `links` or `all`.
- The dashboard now updates from pushes to `main` and from manual runs, not
  from PRs.
- Updated the brief's "When the tests run" and the operators guide's check
  table to match, and ticked the brief's CI kickoff item.

**Decisions**

- **A test that fails on a known site defect stays red.** The human chose
  this. The alternative was to mark the test as a known failure linked to its
  bug, so the check stays green while the defect is open. A red check is the
  honest result.
- **Link checker on demand only.** It loads every page, so running it on
  every push would put more traffic on the live site than the brief allows.
- **No dashboard update from a PR.** The dashboard reflects `main`; a PR's
  results are on the PR.

**Result** (PR #9's CI run
[36180615228](https://github.com/karimarie67/QA-jahnelgroup/actions/runs/36180615228))

| Job | Result |
|---|---|
| Smoke Tests | **Failed**: 13 passed, 1 skipped (phone-only test on desktop), 2 failed |
| Error Handling Tests | Passed: 6 of 6 (3 tests, desktop and phone) |
| Unit Tests | Passed |
| Template Structural Check | Passed |
| Link Check, Update QA Dashboard | Skipped (not run on PRs) |

Both Smoke failures are `TC_SMOKE_004` on desktop and phone: `/contact` has no
`<h1>`. They failed again on the retry. That's the known defect from step 3,
and the only red check.

**Kickoff checklist: 6 of 9.** This entry also ticks the Site config item,
done in step 3 but never ticked. The three left are the coverage map with
story and issue links (step 9), the README (step 10), and the client
agreement (step 10).

**Next**

- Step 8: file the findings.

## Step 8 — File the findings (2026-09-25)

**What we did**

- Re-checked, on desktop and phone (Pixel 5), every candidate finding logged
  in steps 2 and 3, read-only. The re-check loaded all 27 pages and counted
  their headings and landmarks. It captured the console, looked at the Vimeo
  embed and asked Vimeo about the video, and inspected the phone menu button
  before and after a tap.
- Filed four findings with the QA Finding form's sections, labelled `qa` and
  `needs-triage`, plus `accessibility` or `bug`, and added each to the board
  in Backlog:

| Issue | Finding | Labels | Proposed severity | Caught by |
|---|---|---|---|---|
| #10 | `/contact` has no `<h1>` | accessibility | Medium | `TC_SMOKE_004` |
| #11 | The OpenAI ads pixel runs with `debug:true` on the live site, writing about 190 `[oaiq]` debug lines to the console over a crawl | bug | Low | — |
| #12 | 22 of 27 pages have no `<main>`, 20 have no `<header>`, and there's no skip link | accessibility | Low | — |
| #13 | The phone menu button has no `aria-expanded` (or `aria-controls`), open or closed | accessibility | Low | — |

- Added a comment at `TC_SMOKE_004`'s failing assertion naming #10.

**Decisions**

- **Dropped: the Vimeo 401 on `/videos`.** The video is public: Vimeo's
  oEmbed API returns it (200). It plays in the phone run. The desktop run's
  401 came with Vimeo's page "We couldn't verify the security of your
  connection", which is its bot check reacting to the automated browser. It
  isn't a site defect.
- **Dropped: no `robots.txt` or `sitemap.xml`.** Both still return 404. But
  search-engine setup isn't in the brief's scope, and nothing a visitor does
  is affected. Worth mentioning to the client contact as a suggestion.
- **Dropped: the JG Atlas title's "·".** "JG Atlas — Idea to Deployed
  Software · Jahnel Group" uses the dot to separate a subtitle that already
  has a dash. That reads as deliberate, not a slip.
- **Sharpened: landmarks.** Step 3 logged "no `<main>` or `<header>` on every
  page". The re-check found 5 pages with both (`/ai-assisted-onboarding`,
  `/ai-assisted-quality-documentation`, `/agentic-sdlc`, `/team`,
  `/jg-atlas`), and 2 more with a `<header>` only. #12 lists them.
- **Observed facts only, with anything inferred marked.** #11 doesn't claim
  debug mode changes what the pixel sends; only its console output was seen.
  #13 doesn't claim what a particular screen reader says; no screen reader was
  run.
- **Severities are proposals.** #10 and #11 follow the brief's examples
  ("a page is missing its main heading" is Medium, "a console error with no
  visible effect" is Low). The brief has no accessibility example, so #12 and
  #13 propose Low. Triage confirms each, and removes `needs-triage`.

**Result**

| Check | Outcome |
|---|---|
| Heading and landmark counts, all 27 pages, desktop and phone | `/contact`: 0 `<h1>`; every other page 1. Landmarks as in #12, the same on both |
| `oaiq("init", …)` in the home page source | `{pixelId:"3FyEBkYTNGNoXGi7dLwKVv",debug:true}` |
| `[oaiq]` console lines over the re-check crawl | 192 on desktop, 188 on phone |
| `curl https://vimeo.com/api/oembed.json?url=https://vimeo.com/746945239` | 200 (public video) |
| Phone menu button, before and after a tap | `<button class="nav-toggle" aria-label="Toggle menu">` both times |
| `gh project item-list 8` | #10–#13, all in Backlog |
| `npm run test:template-check` | PASS; `docs/coverage-map.md` unchanged |

**Next**

- Human: triage #10–#13 (confirm the severities, and remove `needs-triage`).
- Step 9: write the stories and test cases.
