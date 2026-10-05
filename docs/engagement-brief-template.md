# Engagement brief: <Engagement name>

<!--
Copy this file to docs/engagement-brief.md at kickoff and fill it in with the
client. Keep it to what is specific to this Engagement; everything that is the
same for every Engagement is in docs/qa-handbook.md.

Don't copy in facts the repo already states (test counts, spec lists, pass
rates, CI schedules). Link to their source instead; see the handbook's
opening table.
-->

**Status:** Draft | Agreed on <date> with <client contact>
**Last reviewed:** <date>

## What we test

- **Product:** <name, one-line description>
- **In scope:** <user journeys and features under test>
- **Out of scope:** <what we deliberately don't test, and why>
- **Browsers and devices:** <e.g. Chromium desktop and Pixel 5 phone emulation; add Firefox, WebKit (Safari), or an iPhone if the client's users need them (`QA_BROWSERS`), and say how often they run>. Must match the `playwright.config.js` projects.

## Environments

| Environment | URL | Playwright project | What we may do there |
|---|---|---|---|
| Staging | <url> | `staging` | <e.g. full suite, any time> |
| Production | <url> | `production` | <e.g. read-only smoke tests after a release; no test data> |

**No staging copy?** Say so in the Staging row, and point the `staging`
projects at the live site under Production's rules (CI's default target is
`staging`). **Request rate:** <e.g. one worker, requests spaced; what the site
does when rate-limited>.

**Test accounts and data:** <which accounts, who owns them, where credentials live (a CI secret name, never a value), and what gets cleaned up>. A site with a login: the test account is `QA_USERNAME` and `QA_PASSWORD` (repo secrets, set by a human), and it holds no real personal data, since a logged-in page's failure output can show what's on it.

## When the tests run

<Which suites run on PRs, after merge, on a schedule, and before and after a release. This must match `.github/workflows/qa-test.yml`; describe the intent and link the file.>

## Release gates

A release to production may proceed when:

- [ ] <e.g. the full suite passes on staging, with a pass rate of at least N%>
- [ ] <e.g. no open Critical or High bugs>
- [ ] <e.g. the client's release manager has approved>

After release: <e.g. smoke tests against production within 15 minutes; rollback owner and procedure>

## Severity examples

The scale is the handbook's (Critical, High, Medium, Low). Examples agreed
for this product:

| Severity | Example for this product |
|---|---|
| Critical | <e.g. checkout unavailable> |
| High | <e.g. search returns no results> |
| Medium | <…> |
| Low | <…> |

## Targets

| Measure | Target |
|---|---|
| Smoke pass rate | <e.g. 100%> |
| Full-suite pass rate | <e.g. ≥ 95%> |
| Open Critical bugs | <e.g. 0> |
| Triage cadence | <e.g. weekly, Mondays> |
| Visual checks (optional) | <e.g. the home and pricing pages, compared with reviewed baselines before each release; `siteConfig.visual`> |
| Performance budgets (optional) | <e.g. LCP ≤ 2.5 s, CLS ≤ 0.1, TTFB ≤ 0.8 s, load ≤ 4 s, on the key pages; `siteConfig.perf`> |

## People and access

| Role | Who | Contact |
|---|---|---|
| QA lead | <name> | <handle or channel> |
| Client contact | <name> | <…> |
| Release owner | <name> | <…> |

- **Chat:** <channel>
- **Access needed:** <repos, environments, dashboards; who grants it>
- **Tracker:** <GitHub Issues and this repo's project board (the default), or the client's Jira: the site and project key, the issue types for stories, test cases and bugs, how automation status is recorded, and the status mapping (see `docs/jira.md`)>

## Kickoff checklist

- [ ] Brief filled in and agreed with the client contact
- [ ] Site config replaced (`playwright.config.js`, `config-helper.js`, `selectors.js`; search for `TODO(Engagement)`)
- [ ] Labels created: `npm run labels:setup -- owner/repo`. It creates the test-management labels (see [`docs/github_test_management.md`](./github_test_management.md)), the triage labels in [`docs/agents/triage-labels.md`](./agents/triage-labels.md), and every label an issue form applies, such as `qa` and `needs-triage`. GitHub quietly drops a form's label when the repo doesn't have it.
- [ ] Project board created: `npm run board:setup -- owner/repo`, then add a Board view grouped by Status in the web UI
- [ ] `.github/ISSUE_TEMPLATE/config.yml` links point at the Engagement's channels
- [ ] Browser e2e jobs in `qa-test.yml` enabled on push and PR once the Site config is real
- [ ] `npm run coverage` run and `docs/coverage-map.md` committed
- [ ] `README.md` rewritten for the Engagement: where things stand, where things are, how to run it, and what to do going forward
- [ ] Git hooks activated (`git config core.hooksPath .githooks`)
