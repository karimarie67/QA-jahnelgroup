# Findings, stories, and test cases (steps 6 and 7)

The chain and the ID scheme are in the handbook's "The QA chain"; the test
anatomy is in its "Writing an automated test". This is how to apply them to a
new site. How to create the issues (labels, resumable creates, sub-issues, the
board) is in [`shared-rules.md`](shared-rules.md); read "Before you touch the
tracker" there first.

## Findings

1. **Re-check** each defect named in the log, on desktop and phone, before
   filing. Sharpen what the re-check shows, and drop what it doesn't confirm.
   Log each drop and its reason. Wait for the page to settle before a
   screenshot: one taken too early shows missing images that aren't missing.
   For a third-party embed or link, confirm with the vendor's API or a real
   browser first; a bot check isn't the site's defect.
2. File each with the **QA Finding** form's sections, filling every required
   one, with the labels `qa` and `needs-triage`, plus `bug` or `accessibility`.
   The body states what was observed (the exact attribute, text, or status), and
   names anything inferred and not confirmed. For example, the effect of a form
   field's type on a phone keyboard is inferred when nothing was typed.
   Link screenshots and logs at the commit that holds them (see "Proof of
   work" in `shared-rules.md`), so the links outlive later steps.
3. Take severity examples from the brief. They are proposals: triage confirms
   them, and removes `needs-triage`.
4. Add each to the board in `Backlog`.
5. A finding caught by a test gets a one-line comment at the failing assertion
   (`// Fails on the live site today: known defect #N (...)`). Leave the test's
   `issue` annotation for its Test Case issue.

## Stories and test cases

1. Write the user stories from the brief's scope, with the **User Story** form
   (label `user-story`), each with numbered acceptance criteria. Each story says
   it's QA-drafted, pending agreement with the client. Every filed finding
   becomes an acceptance criterion, so fixing the site turns its test green.
2. Write one Test Case issue per acceptance criterion (or per distinct check
   within one), with the **Test Case** form's sections and the labels from
   `shared-rules.md`. Fill every required field:
   - **Test Case ID:** keep existing test IDs (IDs are never renumbered), and
     name new ones by area (`TC_ORDER_001`).
   - **Source ticket:** `#<story> — acceptance criteria <n>`.
   - **Test Type** and **Priority:** take them from the acceptance criterion
     and the brief's severity examples. `Smoke` only for a check that belongs
     in the smoke set.
   - **Test Steps** and **Expected Results:** numbered to match.
   - **Automation Status** and **Automation File Path:** `Automated` and the
     spec and test once merged; `Needs Automation` while the test is in the
     open PR.

   Label a case `test-automated` when its test is already merged, and
   `test-needs-automation` when its test is in the open PR.
3. Add each test case as a **sub-issue** of its story (the recipe is in
   `shared-rules.md`).
4. Give every test its ID first in its title, `@smoke` where it applies, and
   `test_case` and `issue` annotations, in the test's details object. A new
   spec is its own reviewed change (see "A new spec file" in `shared-rules.md`).
5. Run `npm run coverage` and commit the regenerated `docs/coverage-map.md`.
   CI's `template-check` job fails when it's out of date.
6. Comment on each finding with the test case that now catches it, including
   anything more the test found (another page with the same defect).
7. Add the stories and test cases to the board in `Backlog`.
