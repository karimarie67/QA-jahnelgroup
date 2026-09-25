# QA Automation Framework

A generic, site-agnostic Playwright QA automation **Framework** — a template
you instantiate per Engagement, not a finished product built for one site.

## Instantiating this for a new Engagement

Pick one:

- **Click "Use this template" on GitHub.** This creates a new repo with a
  clean history.
- **Clone the repo.**

Then copy [`docs/engagement-brief-template.md`](./docs/engagement-brief-template.md)
to `docs/engagement-brief.md` and fill it in with the client. It's the only
per-Engagement document to write, and its kickoff checklist covers the rest of
the setup. The process itself is in the shared
[QA Handbook](./docs/qa-handbook.md).

**Or let Claude Code do it.** From a clone of this template, run
**`/new-engagement <site URL>`**. It creates the repo and works through the
kickoff checklist, one logged, reviewed PR per step, and hands you the steps
only you can do. See
[`.claude/skills/new-engagement/`](./.claude/skills/new-engagement/SKILL.md).

## Where we started, and where we are now

This Framework was extracted from a real Engagement, and a new Engagement has
since been built from it. The three repos show the path:

| | Repo | What it is |
|---|---|---|
| **Where we started** | [`karimarie67/QA-boost`](https://github.com/karimarie67/QA-boost) | The original Boost.org Engagement, with its real history: 7 Boost-specific specs (47 tests) run against stage and production boost.org, and a CI dashboard with 170 runs through July 2026. Restored from [`QA-documentation@boost-final`](https://github.com/karimarie67/QA-documentation/tree/boost-final). |
| **The Framework** | this repo | That Engagement generalized: the Boost content is removed, Site config is isolated in `config-helper.js` and `selectors.js` behind `TODO(Engagement)` markers, self-checks are added, and Atlas guardrails are on. |
| **Where we are now** | [`karimarie67/QA-example`](https://github.com/karimarie67/QA-example) (private) | A new Engagement created from this template against [Sauce Demo](https://www.saucedemo.com). It traces every user story to its manual test cases (as GitHub sub-issues) and every test case to one automated Playwright test. |

| | Started (QA-boost) | Framework (this repo) | Now (QA-example) |
|---|---|---|---|
| Site config | Boost URLs, selectors, and content in both the config files and the specs | Isolated in `config-helper.js` / `selectors.js`, marked `TODO(Engagement)` | Filled in for Sauce Demo; element hooks in `selectors.shop.*` |
| Test cases | Spreadsheets ([functional](./examples/boost/Functional-Table%201.csv), [regression](./examples/boost/Regression-Table%201.csv)) | A Test Case issue design ([`docs/github_test_management.md`](./docs/github_test_management.md)) | 9 Test Case issues, each a sub-issue of its user story |
| Traceability | `TC_*` IDs as test annotations | — | Story → test case → test (named by ID, linked to its issue) → CI → dashboard |
| CI e2e | On every push and PR, against staging | Manual dispatch only, until Site config is real | Smoke and functional jobs on every push and PR |
| Self-checks | None | Unit tests and `template-check` | 94 unit tests and `template-check` |
| Guardrails | None | Atlas | Atlas |

## Worked example

[`examples/boost/README.md`](./examples/boost/README.md) is a complete, real
(though non-live/historical) instance of this Framework wired up for a past
Engagement (Boost.org). It's a useful reference for seeing the shape of a
working configuration, including the [QA Handbook](./examples/boost/QA_handbook.md),
[functional test cases](./examples/boost/Functional-Table%201.csv), and
[regression test cases](./examples/boost/Regression-Table%201.csv) from that
Engagement.

## Quick start

```bash
npm install

npm test                     # run the full test suite
npm run test:smoke           # smoke tests only
npm run test:regression      # regression suite (documentation, download/search, error handling)
npm run test:links           # link checker
npm run test:unit            # unit tests for config-helper.js/selectors.js
npm run test:template-check  # structural smoke check that the template itself is intact
npm run coverage             # regenerate docs/coverage-map.md from the specs' test_case annotations
npm run labels:setup -- owner/repo  # create the labels the issue forms and triage need
npm run board:setup -- owner/repo   # create the project board, with Status from docs/agents/issue-tracker.md
```

## Configuring a new site

A new Engagement edits Site config across a few files, all marked with
`TODO(Engagement)` comments:

- [`config-helper.js`](./config-helper.js) and
  [`playwright.config.js`](./playwright.config.js) — base URLs, download-file
  patterns, and other placeholder values.
- [`selectors.js`](./selectors.js) — the fallback CSS selectors and element
  IDs each `selectors.X` function tries; not every entry is `TODO`-marked, so
  read through the fallback arrays too, not just the comments.
- The skeleton specs under `tests/` and `tests/check-links.spec.js` — each has
  `TODO(Engagement)` markers at the assertions that need real content.

## CI

- `unit-tests` and `template-check` run automatically on every push and PR to
  `main`/`develop` — no configuration needed.
- The real browser e2e jobs (`smoke-tests`, `error-handling-tests`,
  `download-search-tests`, `documentation-tests`) only run via manual
  `workflow_dispatch`, until the placeholders in `playwright.config.js`,
  `config-helper.js`, and `selectors.js` are replaced with real Site config.

<!-- atlas-v3:readme:start -->
## Atlas

This repo uses Atlas, a Claude Code plugin that acts as a shared path for AI-assisted development — generated, customizable policies, guidelines, and guardrails that keep agent-driven work safe and consistent without locking teams into one rigid workflow. Read [`docs/atlas-operators-guide.md`](./docs/atlas-operators-guide.md) for how to work in this repo, in plain language, and the **Atlas** section in [`CLAUDE.md`](./CLAUDE.md) for the policy the agents follow.

**Before working in this repo:**

1. **Activate git hooks** (one-time, per clone):

   ```bash

   git config core.hooksPath .githooks

   ```

   These block a handful of destructive git operations before they run.

2. **Claude Code hooks** are already configured in `.claude/settings.json` — they guard against risky file, shell, and MCP actions during agent sessions. See `docs/agents/guardrails.md` if you need to change them.

Everything Atlas generated here — hooks, the `CLAUDE.md` section, `docs/agents/` — is a **base recommendation**, not fixed policy. Adapt it to this project's actual needs and processes.
<!-- atlas-v3:readme:end -->
