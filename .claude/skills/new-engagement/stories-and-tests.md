# Findings, stories, and test cases (steps 8 and 9)

The chain and the ID scheme are in the handbook's "The QA chain"; the test
anatomy is in its "Writing an automated test". This is how to apply them to a
new site.

## Findings

1. **Re-check** each defect named in the log, on desktop and phone, before
   filing. Sharpen what the re-check shows, and drop what it doesn't confirm.
   Log each drop and its reason.
2. File each with the **QA Finding** form's sections, with `qa` and
   `needs-triage`, plus `bug` or `accessibility`. The body states what was
   observed (the exact attribute, text, or status), and names anything
   inferred and not confirmed. For example, the effect of a form field's type
   on a phone keyboard is inferred when nothing was typed.
3. Take severity examples from the brief. They are proposals: triage confirms
   them, and removes `needs-triage`.
4. Add each to the board in `Backlog`.
5. A finding caught by a test gets a one-line comment at the failing assertion
   (`// Fails on the live site today: known defect #N (...)`). Leave the test's
   `issue` annotation for its Test Case issue.

## Stories and test cases

1. Write the user stories from the brief's scope, with the User Story form,
   each with numbered acceptance criteria. Each story says it's QA-drafted,
   pending agreement with the client. Every filed finding becomes an acceptance
   criterion, so fixing the site turns its test green.
2. Write one Test Case issue per acceptance criterion (or per distinct check
   within one), with the Test Case form's sections. Keep existing test IDs
   (IDs are never renumbered), and name new ones by area (`TC_ORDER_001`).
   Label a case `test-automated` when its test is already merged, and
   `test-needs-automation` when its test is in the open PR.
3. Add each test case as a **sub-issue** of its story:
   `gh api --method POST repos/<owner/repo>/issues/<story>/sub_issues -F sub_issue_id=<id>`,
   where `<id>` is the case's database id
   (`gh api repos/<owner/repo>/issues/<n> --jq .id`), not its number.
4. Give every test its ID first in its title, `@smoke` where it applies, and
   `test_case` and `issue` annotations, in the test's details object. New specs
   need their own CI job, an entry in the dashboard generator's inputs, and a
   place in `template-check`'s spec list.
5. Comment on each finding with the test case that now catches it, including
   anything more the test found (another page with the same defect).
6. Add the stories and test cases to the board in `Backlog`. `gh project
   item-list` lags behind `item-add`; count the items with the GraphQL API
   before re-adding any.
