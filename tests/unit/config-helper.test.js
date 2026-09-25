import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getBaseURL,
  buildURL,
  urlPatterns,
  expectedUrlPatterns,
  testData,
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

test('testData', async t => {
  await t.test('there is an expected title for every page, each naming the site', () => {
    assert.deepEqual(Object.keys(testData.pageTitles).sort(), Object.keys(urlPatterns).sort());
    for (const [key, title] of Object.entries(testData.pageTitles)) {
      assert.ok(title.includes(testData.siteName), `pageTitles.${key}`);
    }
  });

  await t.test('every header, Services, and footer link names a known page', () => {
    for (const [name, key] of [...testData.navLinks, ...testData.serviceLinks, ...testData.footerLinks]) {
      assert.ok(urlPatterns[key], `${name} -> ${key}`);
    }
  });

  await t.test('lists the five header links, six services, and five social links', () => {
    assert.equal(testData.navLinks.length, 5);
    assert.equal(testData.serviceLinks.length, 6);
    assert.equal(testData.socialLinks.length, 5);
    for (const [name, href] of testData.socialLinks) {
      assert.match(href, /^https:\/\//, name);
    }
  });

  await t.test('every required contact field is one of the form\'s fields', () => {
    assert.equal(new Set(testData.contactFormFields).size, testData.contactFormFields.length, 'no duplicate fields');
    for (const field of testData.contactRequiredFields) {
      assert.ok(testData.contactFormFields.includes(field), field);
    }
  });

  await t.test('lists the four role filters, starting with All Roles', () => {
    assert.equal(testData.roleFilters.length, 4);
    assert.equal(testData.roleFilters[0], 'All Roles');
  });

  await t.test('contact address, phone, and email are non-empty strings', () => {
    for (const key of ['address', 'phone', 'email']) {
      assert.equal(typeof testData.contact[key], 'string');
      assert.ok(testData.contact[key].length > 0);
    }
  });

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
});
