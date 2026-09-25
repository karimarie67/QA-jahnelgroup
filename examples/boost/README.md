# Boost.org Example (Closed Engagement)

This directory is a **closed-engagement reference**: the original Boost.org
implementation of this QA Framework, kept here for illustration only.

The complete, runnable Boost.org repo, with its full history, is
[`karimarie67/QA-boost`](https://github.com/karimarie67/QA-boost). The guides
below still refer to its old name, `karimarie67/QA-documentation`. That repo
now holds the genericized Framework, and its Boost state is tagged
[`boost-final`](https://github.com/karimarie67/QA-documentation/tree/boost-final).

It is **not live**. The Boost.org engagement has ended, and nothing in this
directory is actively maintained, updated, or tested against a real site.

It is **not run in CI**. No pipeline automatically executes anything here.

It is **not discoverable by the tracked `playwright.config.js`** at all. That
config's `testDir` is `./tests`, so nothing under `examples/boost/` is ever
picked up by `npm test` or any other Playwright command that uses the repo's
own config — even accidentally.

## What's here

- `boost_io_tests.spec.js` and `boost_version_tests.spec.js` — the Boost.io
  and Boost version Playwright specs, as they were written against the live
  Boost.org site.
- `engagement-brief.md`: the Boost-specific part of the QA handbook (what
  was tested, environments, release gates, severity examples, targets,
  people) in the Framework's brief format. The generic process from the same
  handbook is now the Framework's [`docs/qa-handbook.md`](../../docs/qa-handbook.md).
- `QA_handbook.md`: the original Boost handbook, kept unchanged as the
  historical source.
- `playwright_setup_guide.md`, `playwright_cicd_implementation.md`, and
  `playwright_test_optimization_guide.md`: the setup, CI, and optimization
  guides written for the Boost engagement.
- `Functional-Table 1.csv` and `Regression-Table 1.csv` — the Boost
  functional and regression test-case tables.
- `Automate Release Notes.md` and `Ticketing Workflow for Boost.md` — the
  release-notes automation and ticketing workflow docs for Boost.
- `boost_prod_link_checker.py`, `boost-verify.sh`, and `check_links.py` — the
  link-checker and verification scripts used against the Boost site.

Together, these files demonstrate one complete, real instantiation of the
Framework's `config-helper.js` / `selectors.js` / `test-helpers.js` /
`utils.js` layer, wired up against an actual client project.
