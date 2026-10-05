import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getBaseURL,
  buildURL,
  defaultSiteConfig,
  loadSiteConfig,
  siteConfig,
  titleMatcher,
  requireEntries,
  testData,
  authConfig,
  missingCredentials,
  authSkipReason,
  EXTRA_BROWSERS,
  parseBrowsers,
  urlPatterns,
  pageTitles,
  expectedUrlPatterns,
} from '../../config-helper.js';

// Minimal fake TestInfo shape - these functions only ever read
// testInfo.project.use.baseURL, so no real Playwright page/browser is needed.
function fakeTestInfo(baseURL) {
  return { project: { use: { baseURL } } };
}

test('getBaseURL', async t => {
  await t.test('returns testInfo.project.use.baseURL when set', () => {
    const info = fakeTestInfo('https://staging.example.com');
    assert.equal(getBaseURL(info), 'https://staging.example.com');
  });

  await t.test('falls back to the Jahnel Group site when baseURL is undefined', () => {
    const info = fakeTestInfo(undefined);
    assert.equal(getBaseURL(info), 'https://www.jahnelgroup.com');
  });

  await t.test('falls back to the Jahnel Group site when baseURL is falsy (empty string)', () => {
    const info = fakeTestInfo('');
    assert.equal(getBaseURL(info), 'https://www.jahnelgroup.com');
  });
});

test('buildURL', async t => {
  await t.test('constructs a basic URL by joining baseURL and path', () => {
    const info = fakeTestInfo('https://www.example.com');
    const url = buildURL(info, '/libraries/');
    assert.equal(url, 'https://www.example.com/libraries/');
  });

  await t.test('defaults path to "/" when omitted', () => {
    const info = fakeTestInfo('https://www.example.com');
    const url = buildURL(info);
    assert.equal(url, 'https://www.example.com/');
  });

  await t.test('cachebust option adds a cachebust query param', () => {
    const info = fakeTestInfo('https://www.example.com');
    const url = new URL(buildURL(info, '/releases/', { cachebust: true }));
    assert.ok(url.searchParams.has('cachebust'));
    // Should be a numeric-looking timestamp string.
    assert.match(url.searchParams.get('cachebust'), /^\d+$/);
  });

  await t.test('params option adds custom query parameters', () => {
    const info = fakeTestInfo('https://www.example.com');
    const url = new URL(
      buildURL(info, '/search/', { params: { q: 'widgets', page: '2' } })
    );
    assert.equal(url.searchParams.get('q'), 'widgets');
    assert.equal(url.searchParams.get('page'), '2');
  });

  await t.test('cachebust and params can be combined', () => {
    const info = fakeTestInfo('https://www.example.com');
    const url = new URL(
      buildURL(info, '/search/', { cachebust: true, params: { q: 'widgets' } })
    );
    assert.ok(url.searchParams.has('cachebust'));
    assert.equal(url.searchParams.get('q'), 'widgets');
  });
});

test('siteConfig', async t => {
  await t.test('has every section the skeleton specs read', () => {
    for (const key of ['pages', 'nav', 'footer', 'notFoundPath', 'notFoundText', 'malformedPaths', 'forms', 'a11y', 'auth', 'api', 'perf', 'visual']) {
      assert.ok(key in defaultSiteConfig, key);
    }
    assert.ok(Array.isArray(defaultSiteConfig.footer.links));
    assert.ok(Array.isArray(defaultSiteConfig.a11y.exclude));
  });

  await t.test('each page has a path and a title', () => {
    for (const page of defaultSiteConfig.pages) {
      assert.match(page.path, /^\//);
      assert.equal(typeof page.title, 'string');
    }
  });

  await t.test('each form has a path and labelled fields', () => {
    for (const form of defaultSiteConfig.forms) {
      assert.match(form.path, /^\//);
      for (const f of form.fields) {
        assert.equal(typeof f.label, 'string');
        assert.equal(typeof f.required, 'boolean');
      }
    }
  });

  await t.test('without QA_SITE_CONFIG, the specs get the committed defaults', () => {
    // The unit tests run without QA_SITE_CONFIG set.
    assert.equal(process.env.QA_SITE_CONFIG, undefined);
    assert.deepEqual(siteConfig, defaultSiteConfig);
  });
});

test('loadSiteConfig (the QA_SITE_CONFIG override)', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'siteconfig-'));

  await t.test('unset gives the defaults', () => {
    assert.equal(loadSiteConfig({}), defaultSiteConfig);
  });

  await t.test('set gives the named file\'s values', () => {
    const file = path.join(dir, 'site.json');
    fs.writeFileSync(file, JSON.stringify({ pages: [{ path: '/x', title: 'X' }] }));
    assert.deepEqual(loadSiteConfig({ QA_SITE_CONFIG: file }), { pages: [{ path: '/x', title: 'X' }] });
  });

  await t.test('a missing file throws, naming the path', () => {
    const file = path.join(dir, 'missing.json');
    assert.throws(() => loadSiteConfig({ QA_SITE_CONFIG: file }), new RegExp(`can't be read: ${file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  await t.test('an invalid file throws, naming the path', () => {
    const file = path.join(dir, 'bad.json');
    fs.writeFileSync(file, '{ not json');
    assert.throws(() => loadSiteConfig({ QA_SITE_CONFIG: file }), /isn't valid JSON/);
  });
});

test('authConfig, missingCredentials, authSkipReason (the login)', async t => {
  const login = { auth: { loginPath: '/login' } };
  // An environment with the named variables set (to a placeholder).
  const withVars = (...names) => Object.fromEntries(names.map(n => [n, 'x']));

  await t.test('no login by default', () => {
    assert.equal(defaultSiteConfig.auth, null);
    assert.equal(authConfig(defaultSiteConfig), null);
  });

  await t.test('a QA_SITE_CONFIG file with no auth key means no login', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'siteconfig-'));
    const file = path.join(dir, 'site.json');
    fs.writeFileSync(file, JSON.stringify({ pages: [] }));
    assert.equal(authConfig(loadSiteConfig({ QA_SITE_CONFIG: file })), null);
    assert.match(authSkipReason(loadSiteConfig({ QA_SITE_CONFIG: file }), {}), /no login configured/);
  });

  await t.test('a configured login is returned as is', () => {
    assert.deepEqual(authConfig(login), login.auth);
  });

  await t.test('missingCredentials names the unset variables, never values', () => {
    assert.deepEqual(missingCredentials({}), ['QA_USERNAME', 'QA_PASSWORD']);
    assert.deepEqual(missingCredentials(withVars('QA_USERNAME')), ['QA_PASSWORD']);
    assert.deepEqual(missingCredentials(withVars('QA_USERNAME', 'QA_PASSWORD')), []);
  });

  await t.test('with a login and both variables set, nothing skips', () => {
    assert.equal(authSkipReason(login, withVars('QA_USERNAME', 'QA_PASSWORD')), null);
  });

  await t.test('no variables on a PR without secrets (fork or Dependabot) skips', () => {
    assert.match(authSkipReason(login, { QA_PR_WITHOUT_SECRETS: 'true' }), /aren't available to this pull request/);
  });

  await t.test('no variables anywhere else is not a skip (the setup fails instead)', () => {
    assert.equal(authSkipReason(login, {}), null);
    assert.equal(authSkipReason(login, { QA_PR_WITHOUT_SECRETS: 'false', GITHUB_EVENT_NAME: 'pull_request' }), null);
  });

  await t.test('one variable missing on a PR without secrets is not a skip', () => {
    assert.equal(authSkipReason(login, { ...withVars('QA_USERNAME'), QA_PR_WITHOUT_SECRETS: 'true' }), null);
  });
});

test('parseBrowsers (QA_BROWSERS)', async t => {
  await t.test('unset or empty means none', () => {
    assert.deepEqual(parseBrowsers(undefined), []);
    assert.deepEqual(parseBrowsers(''), []);
    assert.deepEqual(parseBrowsers(' , '), []);
  });

  await t.test('names, trimmed, any case, each once', () => {
    assert.deepEqual(parseBrowsers('firefox, WebKit,firefox'), ['firefox', 'webkit']);
  });

  await t.test('all means every opt-in browser', () => {
    assert.deepEqual(parseBrowsers('all'), ['firefox', 'webkit', 'iphone']);
    assert.deepEqual(Object.keys(EXTRA_BROWSERS), ['firefox', 'webkit', 'iphone']);
  });

  await t.test('an unknown name throws, naming the valid ones', () => {
    assert.throws(() => parseBrowsers('firefox,chrome'), /unknown browser: chrome \(use firefox, webkit, iphone, or all\)/);
  });

  await t.test('each opt-in browser is the engine it says', () => {
    assert.equal(EXTRA_BROWSERS.firefox.defaultBrowserType, 'firefox');
    assert.equal(EXTRA_BROWSERS.webkit.defaultBrowserType, 'webkit');
    assert.equal(EXTRA_BROWSERS.iphone.defaultBrowserType, 'webkit');
    assert.equal(EXTRA_BROWSERS.iphone.isMobile, true);
  });
});

test('titleMatcher', async t => {
  await t.test('a plain title is matched exactly', () => {
    assert.equal(titleMatcher('Home | Shop'), 'Home | Shop');
  });

  await t.test('a /pattern/flags title becomes a RegExp', () => {
    const m = titleMatcher('/shop|store/i');
    assert.ok(m instanceof RegExp);
    assert.ok(m.test('The STORE'));
  });
});

test('requireEntries', async t => {
  await t.test('returns a non-empty list', () => {
    assert.deepEqual(requireEntries('pages', [1]), [1]);
  });

  await t.test('throws on an empty or missing list, naming it', () => {
    assert.throws(() => requireEntries('pages', []), /siteConfig\.pages is empty/);
    assert.throws(() => requireEntries('footer.links', undefined), /siteConfig\.footer\.links is empty/);
  });
});

test('testData', async t => {
  await t.test('timeouts.short/medium/long/download are numbers', () => {
    assert.equal(typeof testData.timeouts.short, 'number');
    assert.equal(typeof testData.timeouts.medium, 'number');
    assert.equal(typeof testData.timeouts.long, 'number');
    assert.equal(typeof testData.timeouts.download, 'number');
  });

  await t.test('viewport.desktop/.mobile are {width, height} objects', () => {
    for (const key of ['desktop', 'mobile']) {
      assert.equal(typeof testData.viewport[key].width, 'number');
      assert.equal(typeof testData.viewport[key].height, 'number');
    }
  });

  await t.test('holds only timeouts and viewport (site data lives in siteConfig)', () => {
    assert.deepEqual(Object.keys(testData).sort(), ['timeouts', 'viewport']);
  });
});

// The Engagement's own values (config-helper.js siteConfig.pages and siteConfig.jg).
const site = siteConfig.jg;

test('urlPatterns', async t => {
  await t.test('has the 27 pages the crawl found, each a distinct path starting with "/"', () => {
    const paths = Object.values(urlPatterns);
    assert.equal(paths.length, 27);
    assert.equal(new Set(paths).size, 27, 'no duplicate paths');
    for (const [key, path] of Object.entries(urlPatterns)) {
      assert.match(path, /^\//, `urlPatterns.${key}`);
    }
  });
});

test('expectedUrlPatterns', async t => {
  await t.test('homepage matches the root, with or without a query, and not another page', () => {
    assert.match('https://www.jahnelgroup.com/', expectedUrlPatterns.homepage);
    assert.match('https://www.jahnelgroup.com/?cachebust=1', expectedUrlPatterns.homepage);
    assert.doesNotMatch('https://www.jahnelgroup.com/team', expectedUrlPatterns.homepage);
  });

  await t.test('page(path) matches that page, and not a longer path that starts the same', () => {
    const team = expectedUrlPatterns.page(urlPatterns.team);
    assert.match('https://www.jahnelgroup.com/team', team);
    assert.match('https://www.jahnelgroup.com/team/', team);
    assert.match('https://www.jahnelgroup.com/team?cachebust=1', team);
    assert.doesNotMatch('https://www.jahnelgroup.com/teams', team);
    assert.doesNotMatch('https://www.jahnelgroup.com/culture', team);
  });

  await t.test('page(path) treats the path literally', () => {
    assert.doesNotMatch('https://www.jahnelgroupXcom/team', expectedUrlPatterns.page('/team'));
  });

  await t.test('mailto and tel match the site\'s contact links and reject others', () => {
    assert.match('mailto:general@jahnelgroup.com', expectedUrlPatterns.mailto);
    assert.doesNotMatch('mailto:someone@example.com', expectedUrlPatterns.mailto);
    assert.match('tel:+15183560039', expectedUrlPatterns.tel);
    assert.doesNotMatch('tel:356-0039', expectedUrlPatterns.tel);
  });
});

test("siteConfig.jg: the Engagement's test data", async t => {
  await t.test('there is an expected title for every page, each naming the site', () => {
    assert.deepEqual(Object.keys(pageTitles).sort(), Object.keys(urlPatterns).sort());
    for (const [key, title] of Object.entries(pageTitles)) {
      assert.ok(title.includes(site.siteName), `pageTitles.${key}`);
    }
  });

  await t.test('every header, Services, and footer link names a known page', () => {
    for (const [name, key] of [...site.navLinks, ...site.serviceLinks, ...site.footerLinks]) {
      assert.ok(urlPatterns[key], `${name} -> ${key}`);
    }
  });

  await t.test('lists the five header links, six services, and five social links', () => {
    assert.equal(site.navLinks.length, 5);
    assert.equal(site.serviceLinks.length, 6);
    assert.equal(site.socialLinks.length, 5);
    for (const [name, href] of site.socialLinks) {
      assert.match(href, /^https:\/\//, name);
    }
  });

  await t.test('every required contact field is one of the form\'s fields', () => {
    assert.equal(new Set(site.contactFormFields).size, site.contactFormFields.length, 'no duplicate fields');
    for (const field of site.contactRequiredFields) {
      assert.ok(site.contactFormFields.includes(field), field);
    }
  });

  await t.test('every case study names a known page', () => {
    assert.equal(site.caseStudies.length, 3);
    for (const [name, key] of site.caseStudies) {
      assert.ok(urlPatterns[key], `${name} -> ${key}`);
    }
  });

  await t.test('lists six embeds on Videos and four on Our HQ, each with a title and a host', () => {
    assert.equal(site.embeds.videos.length, 6);
    assert.equal(site.embeds.office.length, 4);
    for (const [title, host] of [...site.embeds.videos, ...site.embeds.office]) {
      assert.ok(title.length > 0);
      assert.match(host, /^[a-z0-9.-]+\.[a-z]+$/, title);
    }
  });

  await t.test('the contact links are a tel: and a mailto: link to the site\'s contacts', () => {
    const [[, tel], [, mail]] = site.contactLinks;
    assert.match(tel, expectedUrlPatterns.tel);
    assert.match(mail, expectedUrlPatterns.mailto);
  });

  await t.test('lists the four role filters, starting with All Roles', () => {
    assert.equal(site.roleFilters.length, 4);
    assert.equal(site.roleFilters[0], 'All Roles');
  });

  await t.test('contact address, phone, and email are non-empty strings', () => {
    for (const key of ['address', 'phone', 'email']) {
      assert.equal(typeof site.contact[key], 'string');
      assert.ok(site.contact[key].length > 0);
    }
  });
});
