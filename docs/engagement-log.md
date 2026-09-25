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

## Step 2 — Draft the brief (2026-09-25)

Stacked on step 1 (#1).

**What we did**

- Probed https://www.jahnelgroup.com read-only with a headless Chromium crawl
  that follows the site's own links from the homepage. It made GET navigations
  only, one page at a time and 1.5 s apart, and never clicked, typed, or
  submitted. It found 27 pages, all 200. There's no `robots.txt` or
  `sitemap.xml`; both return the 404 page.
- Listed what the pages hold:
  - **Forms:** the contact form (`#conForm`) on `/` and `/contact` has Email
    and Message required, a honeypot, and reCAPTCHA. The job application form
    (`#apl-form`) on `/careers` and `/positions` is hidden until Apply opens
    it, and its fields load from Greenhouse (`greenhouse.js`).
  - **Outbound links:** social profiles (LinkedIn, Facebook, Instagram,
    YouTube, X); vendor policy pages on the trust pages (Anthropic/Claude,
    GitHub, Google Workspace and Gemini, Cursor, JetBrains, Fireflies); and
    `mailto:general@`, `mailto:security@`, and `tel:+15183560039`.
  - **Downloads:** none. **Search:** none.
  - **Embeds:** YouTube and Vimeo videos on `/videos` and `/office`, a Google
    Map and a Matterport tour on `/office`, and reCAPTCHA on the contact form.
  - **Phone (390×844):** the homepage has no sideways scroll, and a
    `Toggle menu` button opens the nav.
  - **404:** an unknown path returns the custom 404 page with a 404 status.
- Copied the brief template to `docs/engagement-brief.md` and filled in what
  the site shows. People, contacts, release gates, targets, and "When the
  tests run" are `TBD`, and the status is Draft.

**Decisions**

- **Read-only on production.** The human confirmed it. The site is live with
  no staging copy, and both forms send real submissions: the contact form to
  Jahnel Group, and applications to Greenhouse. Tests load and look, open and
  close menus, filters, and modals, and never type into or submit a form.
  This is in the brief's Environments table.
- **No client test cases.** The human confirmed there are none, so the scope
  is drafted from the probe.
- **Don't count the open roles.** The Greenhouse list (18 roles today)
  changes as roles open and close, so tests check that it loads, not how many.
- **Staging is recorded as none.** The `staging` projects stay unused until
  the client provides one.

**Result**

| Command | Outcome |
|---|---|
| Read-only crawl (`page.goto` from `/`, following same-origin links) | 27 pages, all 200; none left unvisited |
| `curl https://www.jahnelgroup.com/robots.txt` and `/sitemap.xml` | 404 for both |
| Unknown path `/this-page-does-not-exist-qa-probe` | 404 status, "Page Not Found — Jahnel Group" |
| Brief sections | All filled in, or explicitly `TBD` |

**Candidate findings** (to re-check and file or drop in step 8)

- `/contact` has no `<h1>`; its first heading is the `<h2>` "Send us a
  message." Every other page has one.
- On `/videos`, the Vimeo embed `746945239` returned 401 to the headless
  browser. It may be a private video, or Vimeo's bot check; re-check in a
  real browser.
- The tracking pixel in the shared `<head>` runs with `debug:true` on the
  production hostname.
- No `robots.txt` or `sitemap.xml`.

**Next**

- Human: agree the brief and its `TBD`s with the client contact (tracked to
  step 10).
- Step 3: replace the Site config.
