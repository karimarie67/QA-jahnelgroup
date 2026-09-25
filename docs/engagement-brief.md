# Engagement brief: QA-jahnelgroup

<!--
Keep this to what is specific to this Engagement; everything that is the
same for every Engagement is in docs/qa-handbook.md. Link to the repo's own
sources for test counts, spec lists, pass rates, and CI schedules.
-->

**Status:** Draft (not yet agreed with the client contact)
**Last reviewed:** 2026-09-25

## What we test

- **Product:** The Jahnel Group website, https://www.jahnelgroup.com: the
  public marketing and recruiting site for Jahnel Group, a software and AI
  services firm in Schenectady, NY. It's a static site (served from Amazon S3)
  of 27 pages with a site-wide header, a Services menu, and a footer.
- **In scope:**
  - **Every page loads.** All 27 pages return 200 with their own title and
    main heading, and an unknown path returns the custom 404 page with a 404
    status.
  - **Navigation.** The header (Services menu, Case Studies, Team, Culture,
    Careers, Contact), the phone menu (`Toggle menu`), and the footer's
    links to the company pages, the services, and the trust pages (Privacy
    Notice, Security & Compliance, AI Security).
  - **Services pages.** AI Transformation, AI Accelerated App Dev, AI Legacy
    Modernization, AI-Native Staff Aug, Recruiting, and Subscription AI.
  - **Case studies.** The Case Studies index and its three case studies
    (AI-Assisted Onboarding, AI-Assisted Quality Documentation, Agentic SDLC).
  - **Company pages.** Team, Culture, Photos, Videos, Our HQ, the Capital
    Region, War Week, the Mugshot Challenge, Community Partnerships, and JG
    Atlas.
  - **Careers.** Careers and Open Positions. The roles are loaded from
    Greenhouse, with filters (All roles, JG Internal, Latin America,
    External) and an About and an Apply button per role. About opens the
    role's details. Tests check that the list loads, that the filters work,
    and that a role's details open and close. They don't check a
    fixed count of roles, which changes as roles open and close.
  - **Contact form, looked at but never sent.** On the homepage and Contact
    page: the fields and their labels are present, Email and Message are
    required, and reCAPTCHA loads.
  - **Trust pages.** Privacy Notice, Security & Compliance, and AI Security,
    including their outbound links to vendors' policy pages.
  - **Outbound links.** Social profiles (LinkedIn, Facebook, Instagram,
    YouTube, X), the vendor policy links, and the `mailto:` and `tel:` links
    are present and well-formed. The on-demand link checker requests the
    outbound links.
  - **Embeds.** The videos on Videos and Our HQ (YouTube and Vimeo), the
    Google Map, and the Matterport tour on Our HQ are present.
  - **Phone layout.** No page scrolls sideways at phone width, and the phone
    menu opens and closes.
- **Out of scope:**
  - **Submitting any form.** That covers the contact form and the job
    application form in the Apply modal. The site is live with no staging
    copy, and a submission sends real mail to Jahnel Group and real
    applications to Greenhouse. See Environments.
  - **Third-party content.** Greenhouse, reCAPTCHA, the video players, maps,
    and the tracking scripts belong to their vendors. We check they're on the
    page, not how they behave inside.
  - **Performance and load testing, and security testing.** A test run must
    not look like an attack on a live site.
  - **Search and downloads.** The site has neither.
- **Browsers and devices:** Chromium on desktop (`production`, 1280×720) and
  Chromium emulating a Pixel 5 phone (`production-mobile`), matching
  `playwright.config.js`. It's a phone emulation, not a narrow window: on a
  phone, the header menu is behind a menu button that slides it in.

## Environments

| Environment | URL | Playwright project | What we may do there |
|---|---|---|---|
| Staging | None. The client hasn't provided a staging copy, so `staging` points at the live site. | `staging`, `staging-mobile` | The same as Production: read-only. |
| Production | https://www.jahnelgroup.com | `production`, `production-mobile` | **Read-only.** Load pages and look: navigate, read the page, and open and close menus, filters, and modals. **Never submit a form**, not even an empty one: the contact form sends real mail, and an application goes to Greenhouse. Never type into a form, or press a form's submit button. Keep the request rate gentle: one worker, no load or stress runs. |

**Test accounts and data:** None. The site has no logins, and read-only
tests create no data, so there's nothing to clean up.

## When the tests run

TBD. Set in step 7 to match
[`.github/workflows/qa-test.yml`](../.github/workflows/qa-test.yml). The plan
is for the browser tests to run on every push and PR, on desktop and phone,
and for the link checker to run on demand.

## Release gates

The site's releases are the client's, and we have no staging copy to test
before one. TBD with the client contact:

- [ ] TBD: whether the client runs this suite before a release, and against
      what, since there's no staging copy
- [ ] TBD: which open bugs block a release
- [ ] TBD: who approves a release

After release: TBD. The suggestion is to run the full read-only suite against
production after every release. The client owns rollback.

## Severity examples

The scale is the handbook's (Critical, High, Medium, Low). Draft examples for
this product, to agree with the client contact:

| Severity | Example for this product |
|---|---|
| Critical | The site is down, or the homepage or Contact page doesn't load |
| High | The contact form or the job list is broken, or the header navigation fails on a phone |
| Medium | A page's embed (video, map) or an outbound link is broken, or a page is missing its main heading |
| Low | A cosmetic or copy problem, or a console error with no visible effect |

## Targets

| Measure | Target |
|---|---|
| Smoke pass rate | TBD (suggested 100%) |
| Full-suite pass rate | TBD (suggested 100%, apart from known defects) |
| Open Critical bugs | TBD (suggested 0) |
| Triage cadence | TBD |

## People and access

| Role | Who | Contact |
|---|---|---|
| QA lead | TBD | TBD |
| Client contact | TBD | TBD |
| Release owner | TBD | TBD |

- **Chat:** TBD
- **Access needed:** This repo (`karimarie67/QA-jahnelgroup`, private) and
  its project board. The site is public, so testing it needs no access.

## Kickoff checklist

- [ ] Brief filled in and agreed with the client contact
- [ ] Site config replaced (`playwright.config.js`, `config-helper.js`, `selectors.js`; search for `TODO(Engagement)`)
- [x] Labels created: `npm run labels:setup -- karimarie67/QA-jahnelgroup`. It creates the test-management labels (see [`docs/github_test_management.md`](./github_test_management.md)), the triage labels in [`docs/agents/triage-labels.md`](./agents/triage-labels.md), and every label an issue form applies, such as `qa` and `needs-triage`. GitHub quietly drops a form's label when the repo doesn't have it.
- [ ] Project board created: `npm run board:setup -- karimarie67/QA-jahnelgroup`, then add a Board view grouped by Status in the web UI
- [ ] `.github/ISSUE_TEMPLATE/config.yml` links point at the Engagement's channels
- [ ] Browser e2e jobs in `qa-test.yml` enabled on push and PR once the Site config is real
- [ ] `npm run coverage` run and `docs/coverage-map.md` committed
- [ ] `README.md` rewritten for the Engagement: where things stand, where things are, how to run it, and what to do going forward
- [x] Git hooks activated (`git config core.hooksPath .githooks`)
