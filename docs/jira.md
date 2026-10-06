# Running an Engagement with Jira

The template tracks QA work in GitHub Issues, with a GitHub project board. Many
clients work in Jira instead. This page says what carries over unchanged, what
moves to Jira, and what to switch off, so an Engagement can keep its tests in
this repo and its tickets in the client's Jira.

## What doesn't change

The tests and everything that runs them live in the repo and don't depend on
the tracker:

- the specs, the Site config, the test case IDs (`TC_<AREA>_<NNN>`), and the
  `test_case` and `client_case` annotations;
- CI, the dashboard, the coverage map, and the evidence under `test-results/`;
- pull requests: code changes are still reviewed and merged on GitHub.

A test case ID is the link between the two: it's in the test's title and
annotation here, and in the Jira ticket's summary there. Search either side
for it.

## What moves to Jira

| In the template (GitHub) | In Jira |
|---|---|
| User Story form (`user-story.yml`), label `user-story` | A **Story**, with its acceptance criteria numbered in the description |
| Test Case form (`test-case.yml`), label `test-case` | A **Test** issue type if the project has one, otherwise a **Task** labelled `test-case`. Summary: `[TEST CASE] TC_<AREA>_<NNN> - <title>`. If the client uses a test-management app (Xray, Zephyr), the case lives there, with the same ID in its summary |
| The test case as a sub-issue of its story | A **"tests" / "is tested by" link** from the case to the story (or a sub-task, if the project uses those) |
| Labels `test-manual`, `test-needs-automation`, `test-automated` | The same three Jira **labels**, or one "Automation Status" field with those values: pick one, and say which in the brief |
| QA Finding and Bug forms | A **Bug**, with the same fields: steps, expected and actual results, severity, the run or evidence link |
| The `issue` annotation: the GitHub issue URL | The Jira ticket's URL (`https://<site>.atlassian.net/browse/PROJ-123`). The coverage map shows it as `PROJ-123`, linked |
| The project board (`npm run board:setup`): Backlog → To Do → In Progress → In QA → Done | The Jira project's workflow. Map each template state to a Jira status in the brief; who may move a ticket to In QA and Done stays as the handbook says |
| A manual run, recorded as a comment on the Test Case issue | A comment on the Jira ticket (or a test execution, in Xray or Zephyr) |

In a test, the `issue` annotation takes the Jira URL:

```javascript
test('TC_CART_001 The cart keeps its items after a reload', {
  tag: '@regression',
  annotation: [
    { type: 'test_case', description: 'TC_CART_001' },
    { type: 'issue', description: 'https://client.atlassian.net/browse/SHOP-142' },
  ],
}, async ({ page }) => {
  // ...
});
```

## What to switch off in the Engagement repo

- **Don't run** `npm run labels:setup` or `npm run board:setup` (`/new-engagement`
  step 4's labels and board): their work is the Jira project's.
- **The issue forms** (`.github/ISSUE_TEMPLATE/`): keep them only if people
  will still file things on GitHub. Otherwise remove them, and point
  `config.yml`'s contact links at the Jira project, so nobody files a ticket in
  the wrong place.
- **The Atlas tracker policy** (`docs/agents/issue-tracker.md`) says
  `Tracker type: github`. Re-run the `setup-atlas` skill and choose Jira, so
  the agents read and write tickets there. It's a guardrail change, so it's a
  hand-off: a human approves it.

## The skills, step by step

- **`/new-engagement`:** steps 1–3 and 5 work unchanged. In step 4, skip the
  labels and the board, and do the contact links as above. Steps 6 and 7 file
  findings, stories and test cases: create them in Jira with the mapping
  above, and put each Jira URL in its test's `issue` annotation. The brief
  names the Jira project, its issue types, and the status mapping.
- **`/import-test-cases`:** steps 1–4 (taking in the file, probing, buckets,
  IDs) and step 6 (automating) don't touch the tracker. Steps 5, 7 and 8
  create and relabel GitHub issues and reconcile against them, and its
  `issue` and `story` fields hold GitHub issue numbers. With Jira, do those
  steps by hand in Jira (Jira's CSV import works from `cases.json`'s
  fields), record the Jira keys in the log, and skip `reconcile`.

## In the brief

The Engagement brief's "People and access" has a **Tracker** line: for Jira,
give the Jira site and project key, the issue types used for stories, test cases and bugs,
how automation status is recorded (labels or a field), the status mapping,
and who on the client side owns the project.
