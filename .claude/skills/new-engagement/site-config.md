# Site config (step 3)

The handbook's "Where things go" (section 4) says where the site-specific
values live. This is how to fill them in so the tests hold up.

## Probe before writing

Load each page in a real browser (a throwaway Playwright script in a scratch
directory), and read what's actually there: titles, the header menu, headings,
the footer, form fields and their `type`, `name`, `placeholder`, and
`required` attributes, image alt text, and the 404 page. Every expected value
in config comes from a probe, never from what the site "should" say. Probes
are read-only, like the tests, or do no more than the brief's "What we may do
there" allows.

Wait for the page to finish loading before interacting. A site builder (Wix,
Squarespace, and so on) wires up its controls after `load`, so an early click
or tap can do nothing and look like a defect. Before logging anything as a
defect, probe it again, with a screenshot. A screenshot taken before the page
settles can show missing images or menus that aren't missing: wait for the
network to go quiet (`waitForLoadState('networkidle')`) before trusting one.

Also look for:

- **The accessibility tree, not just the DOM.** Read
  `locator.ariaSnapshot()` for each page. It shows the names and roles the
  tests will hook, and what a role lookup can't see: entries of a closed menu
  are often not in the page at all, or are `aria-hidden`, and a link styled as
  a button may be `<a role="button">`, which `getByRole('link')` won't find.
- **Single-page apps.** If the URL changes before the page renders (a React or
  Vue app), wait for the new page's content, not for the URL.
- **Embedded forms and iframes.** Check that each `<iframe>` has a `title`
  (a missing one is a WCAG 4.1.2 finding). A hidden spam-trap field can share a
  visible field's label: filter it out (`filter({ visible: true })`).
- **Third-party responses.** A vendor's embed or link can answer an automated
  request with a bot check (401, 403, 999, a challenge page). Confirm with the
  vendor's API or a real browser before calling it a defect.

## Selectors

Site builders generate class names and IDs that change on every publish. Hook
elements by role, accessible name, and placeholder (`getByRole`,
`getByPlaceholder`), and put them in one site-named block in `selectors.js`
(`selectors.<site>.*`), for example:

```javascript
shop: {
  username: page => page.getByPlaceholder('Username'),
  loginButton: page => page.getByRole('button', { name: 'Login' }),
  cartLink: page => page.getByRole('link', { name: /cart/i }),
},
```

Rewrite `config-helper.js` for the site's pages, titles, and test data, and
update `tests/unit/` to match. Two exceptions:

- **A site that ships its own test hooks.** Some sites (often apps, not
  builder sites) put a stable attribute such as `data-test` on their controls
  for test automation. It doesn't change between releases, so use it for
  elements with no role or name of their own (an error message, a badge, a
  card), and set `use.testIdAttribute` in `playwright.config.js` if you use
  `getByTestId`.
- **A control with no accessible name.** It can't be found by role, so hook it
  by a stable data attribute, file the missing name as an accessibility
  finding, and say so in the log.

## Logins and test data

The brief says which accounts the tests may use. Never write a password into
the repo: the Atlas guard blocks any file write that holds one, and a pushed
secret can only be removed by rewriting history. A demo site that prints its
password on the page (a practice store, say) is read from the page when the
test runs, so it's never in the repo at all.

**A site with a login.** The template logs in once per run per environment
and runs the specs that need it from the saved session; every other spec
keeps running logged out.

- **Fill in `siteConfig.auth`** in `config-helper.js`: `loginPath`, the
  fields' exact labels (`usernameLabel`, `passwordLabel`), the button's name
  (`submitName`), the text that shows once logged in (`successText`), and a
  page that needs the login with text it shows (`protectedPath`,
  `protectedText`). Leave it `null` for a site with no login: the login and
  the logged-in specs then skip.
- **Name a spec `*.auth.spec.js`** to run it logged in. Only the `-auth`
  projects (`staging-auth`, `production-auth`, and their `-mobile`) run those
  specs, after the `-setup` project's login (`tests/auth.setup.js`); the other
  projects ignore them. `tests/account.auth.spec.js` checks the session works
  (TC_AUTH_002) and that the protected page needs it (TC_AUTH_003).
- **The account is `QA_USERNAME` and `QA_PASSWORD`**: environment variables
  locally, repo secrets in CI (`functional-tests` passes them to its run step
  only). Setting the secrets is a **hand-off**: the human sets them, out of
  band; never ask for the values. A PR from a fork or Dependabot gets no
  secrets, so its login skips; any other run without them fails, naming the
  missing variable.
- **SSO or MFA:** edit the login steps in `tests/auth.setup.js`, keeping its
  rules: the password entered without `fill` (a fill step's title holds the
  value, in the HTML report), the field cleared on failure, short step
  timeouts, and no trace, screenshot, or video.
- **The login never retries**, so a wrong password is tried once and the
  account isn't locked out. A command-line `--retries` overrides that, so
  never pass `--retries` to a run that includes the logged-in projects.
- **The test account holds no real personal data.** A logged-in page's
  failure output (the error message, the page snapshot) can show what's on
  it, and CI's artifacts are public on a public repo.
- **Session files** (`playwright/.auth/`) are git-ignored: never commit one,
  keep one as evidence, or upload one. Whoever holds it is logged in.
- **Evidence from a run against a real account is its JSON and log only:
  never commit or upload its HTML report or `playwright-output/`.** The setup
  is built so neither holds the password, but they show the logged-in pages.
  The template's own CI jobs and the self-test's fixture runs are safe.
- Sessions can expire: one login per run keeps a run inside one session. A
  site whose sessions last only minutes needs the login in each spec instead.

## Phones

The template's `*-mobile` projects use a phone emulation
(`...devices['Pixel 5']`), not a narrow viewport. Keep it, and change only the
`baseURL`. Many sites send phones a separate layout, often with a menu button
in place of the header menu, which a desktop browser never sees at any width.
If a project still sets `viewport: { width: 800, height: 600 }`, replace it with
the emulation. The brief's "Browsers and devices" names the device.

**Other browsers, when the brief asks:** `QA_BROWSERS=firefox,webkit,iphone`
(or `all`) adds `<env>-firefox`, `<env>-webkit` (Safari's engine), and
`<env>-iphone` (an iPhone 13, also WebKit), running the public specs. They're
off by default, so a plain run needs only Chromium. Install them once with
`npx playwright install firefox webkit`, then, for example,
`QA_BROWSERS=all npx playwright test --project=staging-firefox
--project=staging-webkit --project=staging-iphone`. To run them in CI too,
the job installs them and names the projects: a workflow change, so it gets
its red-team review. Request-only tests (`skipOnPhone`) still run once, on
desktop Chromium.

Tests that navigate need to open the phone menu first, and should retry the tap
until the menu is open, for the reason above. "Open" means on screen: a closed
slide-in menu often sits off-screen, where Playwright still counts it as
visible, so check `toBeInViewport`, not `toBeVisible`. Click only while the
menu is still closed, so a retry can't close a menu that opened late.
`test-helpers.js`'s `handleMobileMenu` does this; the pattern is:

```javascript
const menu = page.getByRole('navigation');
await expect(async () => {
  const open = await expect(menu).toBeInViewport({ timeout: 250 }).then(() => true, () => false);
  if (!open) await page.getByRole('button', { name: /menu/i }).click();
  await expect(menu).toBeInViewport({ timeout: 1000 });
}).toPass();
```

## A live site

When the tests run against the live site, keep the load gentle:

- **No staging copy:** point the `staging` and `staging-mobile` projects at
  the live site too, under the same rules, and say so in the brief. CI's
  default target and manual runs use `staging`, so they then test the real
  site. (The dashboard's "Env" then reads STAGING; the brief explains it.)
- **Request rate:** set `workers` in `playwright.config.js` when the site asks
  for a gentle rate, or rate-limits (Cloudflare answers 429). `workers: 1` is
  the safe default for a small site.
- **Request-only checks** (link status, downloads, sitemaps) use
  `test-helpers.js`'s `politeGet`, which spaces requests and retries a 429
  after its `Retry-After`. A 429 that persists is "rate limited", never the
  page's status: it would pass a "below 500" check. Their result can't differ
  by device, so run them once, with `skipOnPhone(testInfo)`.
- **Forms on a read-only site:** check what the markup says (`type`,
  `required`, `name`, `placeholder`, the label) and stop. Never type into a
  field or click submit, not even with the form empty. Say in the finding what
  is inferred from markup, such as the phone keyboard a field's type would
  bring up.

## Skeleton specs

The template ships six site-agnostic specs, driven by one `siteConfig` block
in `config-helper.js`:

| Spec | Checks |
|---|---|
| `smoke_tests.spec.js` | Every page loads with its title and one `<h1>`; the header menu's links reach their pages (on a phone, through its menu button); the footer and its links |
| `error_handling_tests.spec.js` | An unknown address gets a 404 with a not-found message; a malformed address never causes a 5xx |
| `forms_tests.spec.js` | Each form's fields have their label, type, and required state. **Read-only**: it never types or submits, and fails if a request other than GET or HEAD goes to the site's own origin |
| `accessibility_tests.spec.js` | An axe-core scan of every page against WCAG 2.1 A and AA: fails on serious and critical violations, and lists the rest |
| `api_tests.spec.js` | Each API endpoint in `siteConfig.api` answers with its status and content type, and each JSON one returns the fields it promises. **Read-only** (GET, spaced out), on the desktop project only. Skips when `siteConfig.api` is `null` |
| `visual_tests.spec.js` | Each page's screenshot against its committed baseline (`siteConfig.visual`). Runs only in Playwright's Docker image (`npm run test:visual`), where every machine renders alike; skips anywhere else, CI's jobs included. Skips when `siteConfig.visual` is `null` |
| `performance_tests.spec.js` | Each page's Web Vitals (LCP, CLS, TTFB, load time) during a normal load, against the budgets in `siteConfig.perf`; the measurements are attached to the report. Chromium projects only. Skips when `siteConfig.perf` is `null` |

Fill in `siteConfig` from the probe: `pages` (path and title; a title in
slashes is a pattern), `nav` and `footer.links` (by accessible name),
`notFoundPath` and `notFoundText`, `malformedPaths`, `forms` (path, a CSS
`selector`, and fields by exact label), `a11y.exclude` (third-party
embeds), and `api.endpoints` if the site has an API to test (each GET
endpoint's path, status, content type, and the JSON fields it promises:
`jsonKeys` for an object, `itemKeys` and `minItems` for a list). Find the
endpoints in the browser's network panel while using the site, or in the
client's API docs; test only what the brief allows, and never an endpoint
that changes data. And `perf` if the brief sets performance budgets
(`budgets`: any of `lcpMs`, `cls`, `ttfbMs`, `loadMs`; `pages`, if not every
page). There's no CPU or network throttling and a CI machine's speed varies,
so give the budgets headroom: start from Google's "good" thresholds (LCP
2.5 s, CLS 0.1), or a few runs' measurements plus a margin, and treat a
failure as a reason to look before calling it a defect. And `visual` if the
brief asks for visual checks (`pages`, `mask` for moving or personal parts,
`maxDiffPixelRatio`): start Docker, run `npm run test:visual:update` to make
the baselines (`tests/visual_tests.spec.js-snapshots/`), look at every image,
and commit them; after that `npm run test:visual` compares. When a page
changes on purpose, update and review the baselines in the same PR. To run
them in CI too, the job runs in the same image (`container:
mcr.microsoft.com/playwright:v<version>-noble`) with `QA_VISUAL=1`: a
workflow change, so it gets its red-team review. An empty list fails its test on purpose, so a test can't pass
checking nothing. Then extend the specs with the site's own checks, or add
specs, by its areas. Give each one suite tag (`@smoke` or `@regression`,
usually on its `describe`), since CI selects tests by it; see the handbook's
"Anatomy". `npm run lint` must pass on them: a line that really
needs a rule off says why, inline (`// eslint-disable-next-line <rule> --
<reason>`), rather than turning the rule off for every spec.

Keep what fits, and remove what doesn't, and log which and why. **A site with
no forms**: remove `forms_tests.spec.js`, and drop it from
`scripts/test-skeleton.js` and `scripts/template-check.js`'s spec list
(`template-check` fails while a script still names a removed spec). CI and
the npm scripts select by tag, so they need no edit.

**Two overrides** let the same specs run against another address without
editing the config: `QA_BASE_URL` (the staging and production projects'
base URL) and `QA_SITE_CONFIG` (a JSON Site config). The template uses them
for its own self-test: `npm run test:skeleton` runs the six specs, and the
login with the logged-in spec, against a small committed fixture site
(`tests/fixtures/site/`, with a random password per run), and CI's
`skeleton-self-test` job runs that on every push and PR. An Engagement may
keep the fixture and job as a check of its specs' plumbing, or remove them.

`check-links.spec.js` crawls from `/` along `<a href>` links. Set its domains
and start pages for the site. If the crawl can't reach the pages (a login
wall, or a single-page app whose links are buttons), rewrite it to check what
the site does link to instead, such as its images and outbound links.

## Proving the tests

Run every spec against the site, on desktop and phone, twice. A test that
passes must be able to fail, and a test that fails must fail on a real defect,
which the log names. The procedure for both is in
[`shared-rules.md`](shared-rules.md) ("Prove a test can fail"). Use
`expect.soft` where one test checks several things, so one defect doesn't hide
the others. In a loop over pages, make a failed page load soft too, so one page
can't stop the rest being checked.

Two things that look like flaky tests but aren't:

- **A page that times out only after a very long page.** A full-page
  screenshot of a tall page used to stall the browser; `utils.js` now takes a
  screen-sized shot over 20,000 px. Load the page on its own before filing it.
- **A test that's slow only while it's red.** A web-first assertion
  (`toHaveAttribute`, `toHaveURL`) retries until its timeout, 5 s each, before
  failing, so a test with many failing soft checks takes minutes. Where a value
  is fixed once the page has settled, wait for the page, then read the value
  once and compare it (`expect.soft(await el.getAttribute('src')).toMatch(…)`).
