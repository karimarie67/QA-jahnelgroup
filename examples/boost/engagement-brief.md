# Engagement brief: Boost.org

<!--
The Boost-specific part of the original QA_handbook.md, restated in the
docs/engagement-brief-template.md format. The generic process from that
handbook is now docs/qa-handbook.md. Facts about what ran are taken from
the repo itself (karimarie67/QA-boost at 1eecc1a).
-->

**Status:** Closed Engagement (last pre-Framework run: 2026-07-02, dashboard run #170)
**Repo:** [`karimarie67/QA-boost`](https://github.com/karimarie67/QA-boost)

## What we test

- **Product:** the Boost C++ Libraries website (boost.org), source in [`boostorg/website-v2`](https://github.com/boostorg/website-v2)
- **In scope:** homepage and navigation, library browsing, documentation pages (TOC, breadcrumbs, version switcher, anchors, in-doc search), site search, release downloads and version selection, error handling (404s, malformed URLs, invalid searches), and a site-wide link check
- **Out of scope:** the libraries themselves; site authoring and CMS workflows
- **Browsers and devices:** Chromium at 1280x720, plus an 800x600 mobile viewport.

## Environments

| Environment | URL | Playwright project | What we may do there |
|---|---|---|---|
| Staging | https://www.stage.boost.org | `staging` | Everything: all PR, post-merge, and manual runs |
| Production | https://www.boost.org | `production` | Monitoring and post-release validation only |

**Test accounts and data:** none. Every test is anonymous and read-only.

## When the tests run

From `.github/workflows/qa-test.yml` at `1eecc1a`:

- **Every PR and push** to `main`/`develop`: smoke tests against staging.
- **Push to `develop`**: the full suite (functional, version, error handling, download/search, documentation) against staging.
- **Manual dispatch**: any suite, against staging or production.
- The dashboard is regenerated after every run.

## Release gates

Deployments were owned by the website team in `boostorg/website-v2`. QA
gated them:

- [ ] Full suite passing on `develop` at ≥ 95%
- [ ] No open Critical or High bugs
- [ ] Dashboard trend stable (no sudden drop in pass rate)
- [ ] Smoke tests passing on staging
- [ ] Stakeholders notified of the deployment window

After release: smoke tests against production, a 5-minute manual spot check,
and 15 minutes of monitoring. Rollback belonged to the website team's
deployment process.

## Severity examples

| Severity | Example for boost.org |
|---|---|
| Critical | Site down, documentation completely inaccessible, or a security issue |
| High | A major feature broken for many users, such as search returning nothing or downloads failing |
| Medium | A feature partially broken with a workaround, such as one documentation version's links broken |
| Low | Cosmetic issues and minor layout problems |

## Targets

| Measure | Target |
|---|---|
| Smoke pass rate | > 98% |
| Full-suite pass rate | > 95% |
| Open Critical bugs | 0 |
| Open High bugs | < 3 |
| Bug escape rate (found in production) | < 5% |
| Smoke runtime / full-suite runtime | < 10 min / < 60 min |
| Triage cadence | Weekly (QA lead) |

## People and access

| Role | Who | Contact |
|---|---|---|
| QA lead | @karimarie67 | GitHub |
| Website team | Boost website maintainers | Slack `#boost-website` |

- **Access needed:** the QA repo, and read access to `boostorg/website-v2` for context on changes.
