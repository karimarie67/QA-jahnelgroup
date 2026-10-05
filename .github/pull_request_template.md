<!--
Delete any section or checklist line that doesn't apply. The rules behind each
line are in docs/qa-handbook.md and docs/agents/testing.md.
-->

## What and why

<!-- What changes, and why. One or two sentences. -->

Closes #<!-- the issue: a test case, a bug, a finding, or a plan -->

## Tests

<!-- For a test change. One line per test case: ID, spec, what it checks. -->

| Test case | Spec | Checks |
|---|---|---|
| TC_ | `tests/` | |

## Evidence

<!--
Committed under test-results/ on this branch, linked here: never "attached"
from someone's machine. From a run against a real account, keep the JSON and
the log only, never the HTML report or playwright-output/.
-->

- `test-results/`

## Checklist

- [ ] `npm run lint`, `npm run test:unit`, and `npm run test:template-check` pass
- [ ] Each new or changed test has its suite tag, and ran on desktop and phone, twice, with the same result
- [ ] Each new test was broken once to see it fail on the check it makes, then restored
- [ ] `npm run coverage` re-run, and `docs/coverage-map.md` committed if it changed
- [ ] `test-results/` holds only this change's evidence
- [ ] No password, token, session file, or real personal data in the diff or the evidence
- [ ] A failure that's a real site defect is filed as a finding and linked here (left red, or marked a known failure, as the Engagement decided)
- [ ] A `.github/workflows/` or dashboard-generator change had its red-team review: link it
