import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { devices } from '@playwright/test';

/**
 * Get the base URL from the current project configuration
 * @param {import('@playwright/test').TestInfo} testInfo - Test info object
 * @returns {string} The base URL for the current project
 */
export function getBaseURL(testInfo) {
  const config = testInfo.project.use;
  // The live site: there's no staging copy (CLAUDE.md, the brief).
  return config.baseURL || 'https://www.jahnelgroup.com';
}

/**
 * Build a URL relative to the current project's base URL
 * @param {import('@playwright/test').TestInfo} testInfo - Test info object
 * @param {string} path - The path to append to base URL
 * @param {Object} options - URL options
 * @param {boolean} options.cachebust - Add cachebust parameter
 * @param {Object} options.params - Additional query parameters
 * @returns {string} Complete URL
 */
export function buildURL(testInfo, path = '/', options = {}) {
  const baseURL = getBaseURL(testInfo);
  const url = new URL(path, baseURL);

  if (options.cachebust) {
    url.searchParams.set('cachebust', Date.now().toString());
  }

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  return url.toString();
}

/**
 * The site under test: what the skeleton specs check. Fill it in from a probe
 * of the site (.claude/skills/new-engagement/site-config.md). Every value
 * below is a placeholder.
 *
 * - pages: each page's path and title. A title in slashes ("/Shop|Store/i")
 *   is a pattern; anything else must match exactly.
 * - nav: the header menu's links, by accessible name, and where each goes.
 * - footer.links: the footer's links, by accessible name.
 * - notFoundPath / notFoundText: an address that isn't a page, and the text
 *   its not-found page shows.
 * - malformedPaths: addresses that must never cause a server error (5xx).
 * - forms: each form's page, a CSS selector for it (default "form"), and its
 *   fields by their exact label, with the input type and whether it's
 *   required. The forms spec only reads them; it never types or submits.
 * - a11y.exclude: CSS selectors the accessibility scan skips (third-party
 *   embeds the client doesn't control).
 * - auth: the site's login, for the logged-in specs (*.auth.spec.js), or null
 *   when the site has none. See authConfig below.
 * - api: the site's API, for tests/api_tests.spec.js, or null when there's
 *   none to test. `endpoints` lists each GET endpoint: its path, the status
 *   and content type it answers with, and for JSON the fields it promises:
 *   `jsonKeys` for an object's top-level fields, or `itemKeys` (with
 *   `minItems`) for each item of an array. The API spec only reads (GET); it
 *   never sends data.
 * - perf: performance budgets for tests/performance_tests.spec.js, or null for
 *   none. `budgets` sets any of lcpMs, cls, ttfbMs, loadMs (from the brief's
 *   targets); `pages` lists the paths to measure (default: every page above);
 *   `settleMs` is how long to wait after load for late paints and shifts
 *   (default 1000).
 * - visual: visual regression checks for tests/visual_tests.spec.js, or null
 *   for none. `pages` lists the paths to compare (default: every page above);
 *   `mask` lists CSS selectors to blank out (a clock, a carousel, a name);
 *   `maxDiffPixelRatio` is how much may differ (default 0.01). They run in
 *   Playwright's Docker image only: npm run test:visual.
 */
export const defaultSiteConfig = {
  // Every page a crawl from the home page reaches (the site has no sitemap),
  // each with its key: the specs name pages by key in their messages.
  pages: [
    { key: 'homepage', path: '/', title: 'Jahnel Group — Where AI Becomes Reality' },
    { key: 'aiTransformation', path: '/ai-transformation', title: 'AI Transformation — Jahnel Group' },
    { key: 'aiAcceleratedAppDev', path: '/ai-accelerated-app-dev', title: 'AI Accelerated App Development — Jahnel Group' },
    { key: 'aiLegacyModernization', path: '/ai-legacy-modernization', title: 'AI Legacy Modernization — Jahnel Group' },
    { key: 'aiNativeStaffAug', path: '/ai-native-staff-aug', title: 'AI-Native Staff Aug — Jahnel Group' },
    { key: 'recruiting', path: '/recruiting', title: 'Recruiting — Jahnel Group' },
    { key: 'subscriptionAi', path: '/subscription-ai', title: 'Subscription AI — Jahnel Group' },
    { key: 'caseStudies', path: '/case-studies', title: 'Case Studies — Jahnel Group' },
    { key: 'aiAssistedOnboarding', path: '/ai-assisted-onboarding', title: 'AI-Assisted Onboarding — Jahnel Group' },
    { key: 'aiAssistedQualityDocumentation', path: '/ai-assisted-quality-documentation', title: 'AI-Assisted Quality Documentation — Jahnel Group' },
    { key: 'agenticSdlc', path: '/agentic-sdlc', title: 'Agentic SDLC — Jahnel Group' },
    { key: 'team', path: '/team', title: 'Team — Jahnel Group' },
    { key: 'culture', path: '/culture', title: 'Culture — Jahnel Group' },
    { key: 'photos', path: '/photos', title: 'Photos — Jahnel Group' },
    { key: 'videos', path: '/videos', title: 'Videos — Jahnel Group' },
    { key: 'office', path: '/office', title: 'Our HQ — Jahnel Group' },
    { key: 'capitalRegion', path: '/capital-region', title: 'Life in the Capital Region — Jahnel Group' },
    { key: 'warWeek', path: '/war-week', title: 'War Week — Jahnel Group' },
    { key: 'mugshots', path: '/mugshots', title: 'The Mugshot Challenge — Jahnel Group' },
    { key: 'communityPartnerships', path: '/community-partnerships', title: 'Community Partnerships — Jahnel Group' },
    { key: 'jgAtlas', path: '/jg-atlas', title: 'JG Atlas — Idea to Deployed Software · Jahnel Group' },
    { key: 'careers', path: '/careers', title: 'Careers — Jahnel Group' },
    { key: 'positions', path: '/positions', title: 'Open Positions — Jahnel Group' },
    { key: 'contact', path: '/contact', title: 'Contact — Jahnel Group' },
    { key: 'privacyNotice', path: '/privacy-notice', title: 'Privacy Notice — Jahnel Group' },
    { key: 'securityCompliance', path: '/security-compliance', title: 'Security & Compliance — Jahnel Group' },
    { key: 'aiSecurity', path: '/ai-security', title: 'AI Security — Jahnel Group' },
  ],
  // The header menu's links after the Services menu, in order.
  nav: [
    { name: 'Case Studies', path: '/case-studies' },
    { name: 'Team', path: '/team' },
    { name: 'Culture', path: '/culture' },
    { name: 'Careers', path: '/careers' },
    { name: 'Contact', path: '/contact' },
  ],
  // The footer's links to the site's own pages, by name (siteConfig.jg.footerLinks has their pages).
  footer: { links: ['Team', 'Culture', 'Case Studies', 'Careers', 'Photos', 'Videos', 'Contact', 'AI Transformation', 'AI Accelerated App Dev', 'AI Legacy Modernization', 'AI Native Staff Aug/Pods', 'Recruiting & Direct Placements', 'Subscription AI', 'Privacy Notice', 'Security & Compliance', 'AI Security'] },
  notFoundPath: '/this-page-does-not-exist-qa',
  // The 404 page is checked by its heading (selectors.jg.notFoundHeading) and
  // title (siteConfig.jg.notFoundTitle); no skeleton spec here reads this.
  notFoundText: null,
  // TC_ERROR_004's addresses.
  malformedPaths: ['/team/////', '/careers/../contact', '/contact?..', '/CONTACT'],
  // The contact form, by its exact labels (asterisks included), as
  // TC_SMOKE_006 checks it too. TC_FORM_001 only reads it: it never types or
  // submits, and fails on any non-GET/HEAD request to the site's own origin.
  forms: [
    {
      path: '/contact',
      selector: '#conForm',
      fields: [
        { label: 'Company', required: false },
        { label: 'First Name', required: false },
        { label: 'Last Name', required: false },
        { label: 'Work Phone', required: false },
        { label: 'Email*', type: 'email', required: true },
        { label: 'Tell Us About Your Project*', required: true },
      ],
    },
  ],
  // Third-party frames the site doesn't control: reCAPTCHA, the video
  // players, the map, and the virtual tour.
  a11y: {
    exclude: [
      'iframe[src*="recaptcha"]',
      'iframe[src*="youtube-nocookie.com"]',
      'iframe[src*="vimeo.com"]',
      'iframe[src*="maps.google.com"]',
      'iframe[src*="mpembed.com"]',
    ],
  },
  // The site has no logins (the brief), no API to test, and no visual checks.
  auth: null,
  api: null,
  // The five key pages' Web Vitals (TC_PERF_001), against the brief's
  // budgets: Google's "good" thresholds, and 4 s for the load. Measured worst
  // over three runs on 2026-10-06: LCP 1.1 s, CLS 0.008, TTFB 242 ms, load 1.5 s.
  perf: {
    pages: ['/', '/contact', '/careers', '/positions', '/case-studies'],
    budgets: { lcpMs: 2500, cls: 0.1, ttfbMs: 800, loadMs: 4000 },
  },
  visual: null,
  // The Engagement's own test data, which the template's shape has no slot for.
  jg: {
    siteName: 'Jahnel Group',
    notFoundTitle: 'Page Not Found — Jahnel Group',
    // Header menu links after the Services menu, in order, with the page each reaches.
    navLinks: [
      ['Case Studies', 'caseStudies'],
      ['Team', 'team'],
      ['Culture', 'culture'],
      ['Careers', 'careers'],
      ['Contact', 'contact'],
    ],
    // The Services menu's links (their names start with these), and their pages.
    serviceLinks: [
      ['AI Transformation', 'aiTransformation'],
      ['AI Accelerated App Development', 'aiAcceleratedAppDev'],
      ['AI Legacy Modernization', 'aiLegacyModernization'],
      ['AI Native Staff Augmentation/Pods', 'aiNativeStaffAug'],
      ['Recruiting & Direct Placements', 'recruiting'],
      ['Subscription AI', 'subscriptionAi'],
    ],
    // Footer links to the site's own pages, by name, and their pages.
    footerLinks: [
      ['Team', 'team'],
      ['Culture', 'culture'],
      ['Case Studies', 'caseStudies'],
      ['Careers', 'careers'],
      ['Photos', 'photos'],
      ['Videos', 'videos'],
      ['Contact', 'contact'],
      ['AI Transformation', 'aiTransformation'],
      ['AI Accelerated App Dev', 'aiAcceleratedAppDev'],
      ['AI Legacy Modernization', 'aiLegacyModernization'],
      ['AI Native Staff Aug/Pods', 'aiNativeStaffAug'],
      ['Recruiting & Direct Placements', 'recruiting'],
      ['Subscription AI', 'subscriptionAi'],
      ['Privacy Notice', 'privacyNotice'],
      ['Security & Compliance', 'securityCompliance'],
      ['AI Security', 'aiSecurity'],
    ],
    // Footer social links, by name, and where each points.
    socialLinks: [
      ['LinkedIn', 'https://www.linkedin.com/company/jahnelgroup'],
      ['Facebook', 'https://www.facebook.com/jahnelgroup/'],
      ['Instagram', 'https://www.instagram.com/jahnelgroup/'],
      ['YouTube', 'https://www.youtube.com/c/JahnelGroupSchenectady'],
      ['X', 'https://x.com/JahnelGroup'],
    ],
    contact: {
      address: '108 State St, 5th Floor',
      phone: '(518) 356-0039',
      email: 'general@jahnelgroup.com',
    },
    // Contact form fields, by label as the site shows them. The tests only
    // check that these exist; they never type into them or send the form.
    contactFormFields: ['Company', 'First Name', 'Last Name', 'Work Phone', 'Email*', 'Tell Us About Your Project*'],
    // The contact form fields marked required, by label.
    contactRequiredFields: ['Email*', 'Tell Us About Your Project*'],
    // The Case Studies page's case studies, by the name in each link, and their pages.
    caseStudies: [
      ['AI-Assisted Onboarding', 'aiAssistedOnboarding'],
      ['AI-Assisted Quality Documentation', 'aiAssistedQualityDocumentation'],
      ['Agentic SDLC', 'agenticSdlc'],
    ],
    // Embedded players, maps, and tours, by the title each <iframe> carries, and
    // the host its src must be on. Only their presence is checked.
    embeds: {
      videos: [
        ['Jahnel Group TrackSuit Reveal', 'www.youtube-nocookie.com'],
        ['The Charity Spotlight at Jahnel Group', 'player.vimeo.com'],
        ['1 Million Pushup Challenge', 'www.youtube-nocookie.com'],
        ['Why Choose Jahnel Group?', 'www.youtube-nocookie.com'],
        ['14 Year Old Memorizes 256 Digits of Pi!', 'www.youtube-nocookie.com'],
        ['Project Spotlight: 3D Printer', 'www.youtube-nocookie.com'],
      ],
      office: [
        ['Directions to Jahnel Group from Albany', 'player.vimeo.com'],
        ['Directions to Jahnel Group from Downtown Schenectady', 'player.vimeo.com'],
        ['Jahnel Group on Google Maps', 'maps.google.com'],
        ['Jahnel Group HQ Virtual Tour', 'mpembed.com'],
      ],
    },
    // The Contact page's phone and email links, by their text.
    contactLinks: [
      ['(518) 356-0039', 'tel:+15183560039'],
      ['general@jahnelgroup.com', 'mailto:general@jahnelgroup.com'],
    ],
    // The Open Positions filters, by the start of their names. Each name ends
    // with its role count, which changes as roles open and close.
    roleFilters: ['All Roles', 'JG Internal', 'Latin America', 'External'],
  },
};

/**
 * The Site config the specs use: the JSON file named by QA_SITE_CONFIG when
 * it's set (for testing the template against its fixture site, or a site's
 * config kept outside the code), otherwise defaultSiteConfig.
 * @param {Record<string, string | undefined>} env
 */
export function loadSiteConfig(env = process.env) {
  const file = env.QA_SITE_CONFIG;
  if (!file) return defaultSiteConfig;
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (err) {
    throw new Error(`QA_SITE_CONFIG names a file that can't be read: ${file} (${err.code || err.message})`, { cause: err });
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`QA_SITE_CONFIG names a file that isn't valid JSON: ${file} (${err.message})`, { cause: err });
  }
}

export const siteConfig = loadSiteConfig();

/**
 * The site's login, for tests/auth.setup.js and the logged-in specs, or null
 * when there's none: auth is null, or missing (a QA_SITE_CONFIG file replaces
 * the whole config, so an older one has no auth key).
 *
 * When set: { loginPath, usernameLabel, passwordLabel, submitName,
 * successText, protectedPath, protectedText }. The fields are found by their
 * exact label and the button by its name; a login has worked when the page
 * leaves loginPath and shows successText. protectedPath is a page that needs
 * the login, showing protectedText. The account itself comes from the
 * environment (QA_USERNAME and QA_PASSWORD; repo secrets in CI), never from
 * this config.
 * @param {object} config
 */
export function authConfig(config = siteConfig) {
  return config?.auth ?? null;
}

/**
 * Where tests/auth.setup.js saves an environment's login session, and its
 * logged-in projects read it: playwright/.auth/<env>.json, git-ignored. Never
 * commit it, never keep it as evidence: it logs whoever holds it in.
 * @param {string} env - "staging" or "production"
 */
export function authStatePath(env) {
  return path.join(path.dirname(fileURLToPath(import.meta.url)), 'playwright', '.auth', `${env}.json`);
}

/**
 * The login variables that aren't set: names only, never values.
 * @param {Record<string, string | undefined>} env
 */
export function missingCredentials(env = process.env) {
  return ['QA_USERNAME', 'QA_PASSWORD'].filter(name => !env[name]);
}

/**
 * Why the login and the logged-in specs skip, or null when they run:
 * - no login configured;
 * - no credentials, on a pull request GitHub gives no secrets (a fork's or
 *   Dependabot's), which the workflow marks with QA_PR_WITHOUT_SECRETS=true.
 * Missing credentials anywhere else aren't a skip: the setup fails, naming
 * the variable (missingCredentials).
 * @param {object} config
 * @param {Record<string, string | undefined>} env
 */
export function authSkipReason(config = siteConfig, env = process.env) {
  if (!authConfig(config)) return 'no login configured (siteConfig.auth is not set)';
  if (missingCredentials(env).length === 2 && env.QA_PR_WITHOUT_SECRETS === 'true') {
    return "the login secrets aren't available to this pull request (from a fork or Dependabot)";
  }
  return null;
}

/**
 * A page title from siteConfig as Playwright expects it: "/pattern/flags" is a
 * RegExp, anything else an exact string.
 * @param {string} title
 */
export function titleMatcher(title) {
  const m = /^\/(.+)\/([a-z]*)$/.exec(title);
  return m ? new RegExp(m[1], m[2]) : title;
}

/**
 * A siteConfig list that must not be empty: a test looping over an empty list
 * would pass while checking nothing.
 * @param {string} name - e.g. "pages", "footer.links"
 * @param {unknown[]} list
 */
export function requireEntries(name, list) {
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error(`siteConfig.${name} is empty: configure it (see .claude/skills/new-engagement/site-config.md)`);
  }
  return list;
}

/**
 * The opt-in browsers (QA_BROWSERS): each adds a project per environment
 * (`<env>-firefox`, `<env>-webkit`, `<env>-iphone`), running the public specs.
 * Install them first: `npx playwright install firefox webkit`.
 */
export const EXTRA_BROWSERS = {
  firefox: devices['Desktop Firefox'],
  webkit: devices['Desktop Safari'],
  iphone: devices['iPhone 13'],
};

/**
 * QA_BROWSERS, as a list of EXTRA_BROWSERS names: "firefox,webkit", "all",
 * or unset/empty for none. An unknown name throws, naming the valid ones.
 * @param {string | undefined} value
 * @returns {string[]}
 */
export function parseBrowsers(value) {
  const names = (value || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  if (names.includes('all')) return Object.keys(EXTRA_BROWSERS);
  const unknown = names.filter(n => !(n in EXTRA_BROWSERS));
  if (unknown.length) {
    throw new Error(`QA_BROWSERS names an unknown browser: ${unknown.join(', ')} (use ${Object.keys(EXTRA_BROWSERS).join(', ')}, or all)`);
  }
  return [...new Set(names)];
}

const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Each page's path and title, by key (siteConfig.pages). */
export const urlPatterns = Object.fromEntries((siteConfig.pages || []).filter(p => p.key).map(p => [p.key, p.path]));
export const pageTitles = Object.fromEntries((siteConfig.pages || []).filter(p => p.key).map(p => [p.key, p.title]));

/**
 * Expected URL patterns for navigation validation
 */
export const expectedUrlPatterns = {
  homepage: /jahnelgroup\.com\/?(\?.*)?$/,
  // A page's own path, with at most a trailing slash or a query string after it.
  page: path => new RegExp(`jahnelgroup\\.com${escapeRegExp(path)}\\/?(\\?.*)?$`),
  mailto: /^mailto:[^@\s]+@jahnelgroup\.com$/,
  tel: /^tel:\+1\d{10}$/,
};

/**
 * Test data constants
 */
export const testData = {
  timeouts: {
    short: 5000,
    medium: 15000,
    long: 30000,
    download: 60000,
  },
  viewport: {
    desktop: { width: 1280, height: 720 },
    // The same phone the *-mobile projects emulate (playwright.config.js).
    mobile: devices['Pixel 5'].viewport,
  }
};
