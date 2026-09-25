# Engagement log — QA-jahnelgroup

The record of how this Engagement was built from the `QA-framework-template`
Framework against https://www.jahnelgroup.com, one entry per step of the
`new-engagement` skill.

## Step 1 — Create the repo (2026-09-25)

**What we did**

- Created `karimarie67/QA-jahnelgroup` from the `karimarie67/QA-framework-template`
  template and cloned it to `~/QA-jahnelgroup`.
- Installed dependencies and ran both self-checks.
- Renamed the Atlas framing from the template to this Engagement: the issue
  tracker's repo, the workspace, repository, and protected-branch names, and the
  repository framing in `CLAUDE.md`; the repository `id` in
  `.atlas/manifest.json`; the repository name and purpose in
  `docs/agents/issue-tracker.md` and `docs/atlas-operators-guide.md`; and the
  title and opening line of `CONTEXT.md`.

**Decisions**

- **Private repo.** jahnelgroup.com is a real company's site.
- **Repo name `QA-jahnelgroup`.** Follows the `QA-<site>` pattern of the other
  Engagements.
- **Kept the "created from `QA-framework-template`" mentions** in `CLAUDE.md`,
  `CONTEXT.md`, and the operators guide, since they say where the repo came from.
- **Left the template's own files alone.** `scripts/template-check.js` (the
  Framework's structural check, which still runs here), the
  `new-engagement` skill, and `test-results/import-test-cases/` (the template's
  recorded evidence for its import-test-cases PR) still name the template; they
  describe the Framework, not this repo.
- **Left `CLAUDE.md`'s Structure and rules as the template's.** Step 3 brings
  them up to date with the specs and projects kept.

**Result**

| Command | Outcome |
|---|---|
| `gh repo create karimarie67/QA-jahnelgroup --private --template karimarie67/QA-framework-template --clone` | Repo created and cloned |
| `npm install` | OK |
| `npm run test:unit` | 263 pass, 0 fail |
| `npm run test:template-check` | PASS (both modules import; all 5 expected specs discovered) |
| `grep -rn QA-framework-template` | Only "created from" mentions and the template-owned files listed above |
| `grep -rc "TODO(Engagement)"` | 35 markers left: 28 in code (`config-helper.js` 8, `download_search_tests.spec.js` 6, `playwright.config.js` 4, `check-links.spec.js` 4, `smoke_tests.spec.js` 3, `documentation_tests.spec.js` 2, `selectors.js` 1) and 7 in docs (`README.md` 4, the skill 2, the brief template 1) |
| `grep hooksPath .git/config` | `core.hooksPath = .githooks` (set by the human) |

**Next**

- Human: approve this PR's `CLAUDE.md` and manifest edits by merging it, then
  run the `setup-atlas` **verify** step in a Claude Code session started in this
  repo.
- Step 2: probe the site and draft the brief.
