<!-- atlas-v3:testing:start -->
# Testing and proof of work

This document is the authoritative repository policy for verification commands,
acceptance evidence, and `PASS`, `FAIL`, `BLOCKED`, and `SKIPPED` verdict
semantics.

Run surface: **local + deployed**.

Read this guide while planning acceptance criteria, Definition of Done,
fixtures, and verification. Resolve the applicable commands and evidence rules
into each execution packet; implementation workers execute that packet without
rereading this guide.

## Commands

| Check | Command | Coverage | When | Status |
|---|---|---|---|---|
| test | `npm run test` | Full Playwright suite under tests/ (against the live site, one worker) | Before PR and after implementation | inferred |
| unit | `npm run test:unit` | Unit tests for the Site config (config-helper, selectors), the coverage map, the dashboard generator, the tag check, board/label setup, and the import-test-cases scripts | On every push/PR to main/develop, as part of the automatic gate | verified |
| template-check | `npm run test:template-check` | Structural check: the config imports, the specs are found, every spec CI names exists, and every test's tags fit the rules CI selects by | On every push/PR to main/develop, as part of the automatic gate | verified |
| lint | `npm run lint` | ESLint over the JavaScript (outside `examples/`): recommended rules, and the Playwright plugin's for the specs; fails on any error or warning | On every push/PR to main/develop (`lint` job), and before a PR | verified |
| smoke | `npm run test:smoke` | Tests tagged `@smoke` (TC_SMOKE_001–008), desktop and phone, against the live site | On every push/PR to main/develop, and on a manual run | inferred |
| regression | `npm run test:regression` | Tests tagged `@regression`: error handling, content, and accessibility, desktop and phone, against the live site | On every push/PR to main/develop, and on a manual run | inferred |
| links | `npm run test:links` | The link checker (`@links`), on its own project | On demand only: a manual run with `links` or `all` | inferred |

`verified` means the command ran successfully here. `inferred` means configuration names it but setup did not execute it. `unavailable` is an explicit gap.

## Evidence policy

- Repository-local proof-artifact root: `test-results`.
- Clear the entire proof-artifact root before capturing evidence for each work
  package. It intentionally contains only the latest work package's evidence.
- For UI screenshots and videos, use one directory per test name beneath the
  proof-artifact root. Rerunning a test replaces that test directory.
- Visual/browser behavior: screenshot by default for UI/browser assertions; video only when motion, timing, or a multi-step interaction cannot be proved by a still image.
- Integration and non-UI behavior: committed Playwright HTML report and test-results.json for each run. Playwright writes these outside the proof-artifact root (`playwright-report/` and the repository-root `test-results.json`, both git-ignored), so copy the ones cited as evidence beneath `test-results/` before committing. Its other run output (`playwright-output/`, also git-ignored) is cleared at the start of each run and is never proof of work.
- External integration: real staging/production smoke or regression run against the Engagement's configured target (playwright.config.js's staging/production baseURL, once replaced from its placeholder).
- Sensitive data: scrub any auth tokens, cookies, session data, or PII captured in traces before commit; do not assume the target site has none.
- Any screenshot, video, test report, captured output, or other artifact cited as
  `PASS` evidence is saved beneath `test-results` and committed
  on the feature branch. The PR links to the committed path; it never describes
  an uncommitted local file as attached evidence.
- Screenshot is the default visual proof. Add video only when motion, timing, or
  a multi-step interaction is material and a still image cannot prove it. Do not
  require screenshots or video when the repository has no UI/browser surface.
- Failure-only diagnostics not cited as `PASS` evidence, such as large traces,
  may remain uncommitted when repository policy says so.
- A blocked or skipped check records the attempted command and raw failure.
- `BLOCKED`, `SKIPPED`, ambiguity, and worker self-report are never `PASS`.

Run formatting before lint review, avoid unrelated reformatting, and rerun
affected tests after automatic fixes. Give every real integration seam at least
one criterion against the real dependency. Name test accounts, seed data,
confirmation flows, and cleanup. Human-gated criteria name the prerequisite,
human action, expected result, and post-action check. Runnable work must be
startable and exercisable by a fresh context using committed instructions.

Use `PASS` when evidence proves the criterion, `FAIL` when observable behavior is
incorrect, `BLOCKED` when it cannot be observed or exercised, and `SKIPPED` only
for an approved exception with the attempted command and reason. Sanitize every
retained artifact before storage or sharing.
<!-- atlas-v3:testing:end -->
