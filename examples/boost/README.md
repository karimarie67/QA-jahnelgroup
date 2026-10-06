# Sample test case spreadsheets

Two test case tables from the Boost.org Engagement, a closed Engagement, kept
as sample input for [`/import-test-cases`](../../.claude/skills/import-test-cases/SKILL.md):

| File | Cases |
|---|---|
| `Functional-Table 1.csv` | 14 functional cases |
| `Regression-Table 1.csv` | 10 regression cases |

They're a common real-world shape: an ID, a name, an objective, numbered
steps, an expected result, and a Pass/Fail column, with no section column. So
the import proposes a column map for you to confirm, and every new ID lands
in the `GEN` area. To try it without changing anything:

```bash
node .claude/skills/import-test-cases/import.js normalise "examples/boost/Functional-Table 1.csv" --preview
```

Keep the files unchanged: the import records each file's checksum, and the
unit tests' Boost-format fixture copies these columns
(`tests/unit/fixtures/import/SOURCES.md`).

The rest of the Boost Engagement's files (its specs, scripts, guides, and
original QA handbook) were removed from the template on 2026-10-05. They're
in this repository's history, at
[`76f455d`](https://github.com/karimarie67/QA-framework-template/tree/76f455d/examples/boost),
and the complete Boost.org repo is
[`karimarie67/QA-boost`](https://github.com/karimarie67/QA-boost) (archived).
Nothing here runs in CI or is found by `playwright.config.js`.
