import { defineConfig, devices } from '@playwright/test';
import { authStatePath, EXTRA_BROWSERS, parseBrowsers } from './config-helper.js';

// QA_BASE_URL points every staging and production project at one address, for
// testing the template against its fixture site (npm run test:skeleton) or a
// preview deploy. Namespaced, since many machines export BASE_URL for other
// projects; logged (to stderr, so JSON output stays clean), so a run never
// silently tests another site.
const QA_BASE_URL = process.env.QA_BASE_URL;
if (QA_BASE_URL) console.warn(`QA_BASE_URL in use: ${QA_BASE_URL}`);
const site = placeholder => QA_BASE_URL || placeholder;

// There's no staging copy: staging and production, and their phone projects,
// all point at the live site (CLAUDE.md, the brief).
const LIVE = 'https://www.jahnelgroup.com';

// The link checker crawls the whole site: it runs only on its own project.
// Logged-in specs (*.auth.spec.js) run only on the logged-in projects.
const notTheLinkChecker = /check-links\.spec\.js$/;
const loggedIn = /\.auth\.spec\.js$/;
const publicOnly = [notTheLinkChecker, loggedIn];

// Opt-in browsers beyond Chromium and the Pixel 5: QA_BROWSERS=firefox,webkit,
// iphone (or all) adds <env>-firefox, <env>-webkit, and <env>-iphone, running
// the public specs (not the link checker or the logged-in specs). Off by
// default, so a plain run needs only Chromium; the brief says when to use
// them. Install them first: npx playwright install firefox webkit.
const extraBrowsers = parseBrowsers(process.env.QA_BROWSERS);
if (extraBrowsers.length) console.warn(`QA_BROWSERS in use: ${extraBrowsers.join(', ')}`);
function browserProjects(env, baseURL) {
  return extraBrowsers.map(b => ({
    name: `${env}-${b}`,
    testIgnore: publicOnly,
    use: { ...EXTRA_BROWSERS[b], baseURL, headless: true, trace: 'on-first-retry' },
  }));
}

// The login and the logged-in projects for one environment. They record no
// trace, screenshot, or video: a trace holds what was typed and the session
// cookie, and a logged-in page can show the account's data. The login never
// retries, so a wrong password is tried once and a real account isn't locked
// out (a --retries flag would override this: never pass one to these).
const noRecording = { trace: 'off', screenshot: 'off', video: 'off' };
function loginProjects(env, baseURL) {
  const session = { storageState: authStatePath(env), baseURL, browserName: 'chromium', headless: true, ...noRecording };
  return [
    {
      name: `${env}-setup`,
      testMatch: /auth\.setup\.js$/,
      retries: 0,
      use: { baseURL, browserName: 'chromium', headless: true, viewport: { width: 1280, height: 720 }, ...noRecording },
    },
    {
      name: `${env}-auth`,
      testMatch: loggedIn,
      dependencies: [`${env}-setup`],
      use: { ...session, viewport: { width: 1280, height: 720 } },
    },
    {
      name: `${env}-auth-mobile`,
      testMatch: loggedIn,
      dependencies: [`${env}-setup`],
      use: { ...devices['Pixel 5'], ...session },
    },
  ];
}

export default defineConfig({
  // Playwright empties its output directory at the start of every run. Keep it
  // away from `test-results/`, which holds committed proof of work
  // (docs/agents/testing.md): with the default, a run deleted that evidence.
  outputDir: 'playwright-output',
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }]
  ],
  projects: [
    {
      name: 'local',
      testIgnore: publicOnly,
      use: {
        baseURL: 'http://localhost:8000',
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
      },
    },
    
    {
      name: 'staging',
      testIgnore: publicOnly,
      use: {
        baseURL: site(LIVE),
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
      },
    },
    {
      name: 'production',
      testIgnore: publicOnly,
      use: {
        baseURL: site(LIVE),
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        trace: 'on-first-retry',
      },
    },
    {
      name: 'staging-mobile',
      testIgnore: publicOnly,
      use: {
        // A phone emulation, not a narrow desktop window: many sites send phones
        // a separate layout (for example a menu button instead of the header menu).
        ...devices['Pixel 5'],
        baseURL: site(LIVE),
        browserName: 'chromium',
        headless: true,
        trace: 'on-first-retry',
      },
    },
    {
      name: 'production-mobile',
      testIgnore: publicOnly,
      use: {
        // A phone emulation, not a narrow desktop window: many sites send phones
        // a separate layout (for example a menu button instead of the header menu).
        ...devices['Pixel 5'],
        baseURL: site(LIVE),
        browserName: 'chromium',
        headless: true,
        trace: 'on-first-retry',
      },
    },
    ...loginProjects('staging', site(LIVE)),
    ...loginProjects('production', site(LIVE)),
    ...browserProjects('staging', site(LIVE)),
    ...browserProjects('production', site(LIVE)),
    // Special project for link checking - no traces/screenshots to avoid thousands of files
    {
      name: 'link-checker',
      testMatch: /check-links\.spec\.js$/,
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 720 },
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
      timeout: 1800000, // 30 minutes for link checking
      retries: 0, // Don't retry link checks
    },
  ],
  use: {
    // A screenshot of every failure. Evidence for a passing test is taken on
    // purpose, with utils.js's captureEvidence (docs/agents/testing.md).
    screenshot: 'only-on-failure',
    video: 'off',
  },
  testDir: './tests',
  testMatch: ['**/*.spec.js'],
  timeout: 90000,
  // Retry once in CI, where a one-off network blip shouldn't fail the run.
  // Never locally: a retry there hides a flaky test while you're writing it.
  retries: process.env.CI ? 1 : 0,
  // One page at a time: the tests run against the live site.
  workers: 1,
  // A test.only that reaches CI fails the run, rather than running one test.
  forbidOnly: !!process.env.CI,
});