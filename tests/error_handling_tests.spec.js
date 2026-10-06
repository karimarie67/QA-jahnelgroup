import { test, expect } from '@playwright/test';
import fs from 'fs';
import { selectors } from '../selectors.js';
import { buildURL, testData, urlPatterns, siteConfig } from '../config-helper.js';
import { testPatterns } from '../test-helpers.js';

// The Engagement's own test data (config-helper.js, siteConfig.jg).
const site = siteConfig.jg;

fs.mkdirSync('playwright-output', { recursive: true });

// Read-only, like every test in this Engagement: no form is ever typed into or sent.
const { jg } = selectors;
const ISSUES = 'https://github.com/karimarie67/QA-jahnelgroup/issues';

test.describe('Error Handling Tests', { tag: ['@regression', '@errors'] }, () => {

  test('TC_ERROR_001 Unknown page shows the 404 page', {
    annotation: [{ type: 'test_case', description: 'TC_ERROR_001' }, { type: 'issue', description: `${ISSUES}/21` }],
  }, async ({ page }, testInfo) => {
    const response = await page.goto(buildURL(testInfo, '/this-page-does-not-exist-qa', { cachebust: true }));
    expect(response.status()).toBe(404);
    await expect(jg.notFoundHeading(page)).toBeVisible();
    await expect(page).toHaveTitle(site.notFoundTitle);
    // The 404 page keeps the header menu, so a visitor can find their way back.
    await expect(jg.logo(page)).toBeVisible();
  });

  test('TC_ERROR_004 Malformed addresses never cause a server error', {
    annotation: [{ type: 'test_case', description: 'TC_ERROR_004' }, { type: 'issue', description: `${ISSUES}/22` }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_ERROR_004';

    for (const malformedPath of ['/team/////', '/careers/../contact', '/contact?..', '/CONTACT']) {
      const response = await page.goto(buildURL(testInfo, malformedPath), { timeout: testData.timeouts.long });
      const status = response.status();
      fs.appendFileSync('playwright-output/test-logs.txt', `${testId} ${malformedPath}: status ${status}, final URL ${page.url()}\n`);

      // Either a working page or the site's own 404 page, never a server error.
      expect.soft(status, `${malformedPath} returned ${status}`).toBeLessThan(500);
      if (status >= 400) {
        await expect.soft(jg.notFoundHeading(page), `${malformedPath} shows the 404 page`).toBeVisible();
      }
    }
  });

  test('TC_ERROR_005 Outbound links lead somewhere', {
    annotation: [{ type: 'test_case', description: 'TC_ERROR_005' }, { type: 'issue', description: `${ISSUES}/28` }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_ERROR_005';
    testInfo.setTimeout(3 * 60 * 1000);

    // The social links (every page's footer) and the vendor policy links on
    // the trust pages. Only the link is checked; the linked sites are out of scope.
    const hrefs = new Set();
    for (const key of ['homepage', 'privacyNotice', 'securityCompliance', 'aiSecurity']) {
      await testPatterns.loadAndValidatePage(page, testInfo, buildURL(testInfo, urlPatterns[key], { cachebust: true }), testId);
      await expect(jg.footer(page)).toBeVisible();
      const found = await page.locator('a[href^="http"]').evaluateAll(links =>
        links.map(a => a.href).filter(h => !new URL(h).hostname.endsWith('jahnelgroup.com'))
      );
      found.forEach(h => hrefs.add(h));
    }
    fs.appendFileSync('playwright-output/test-logs.txt', `${testId} ${hrefs.size} external links: ${[...hrefs].join(', ')}\n`);
    expect(hrefs.size).toBeGreaterThan(0);

    // A single stalled request isn't a broken link, so a link that doesn't
    // answer gets one more try.
    const get = href => page.request.get(href, { timeout: testData.timeouts.medium, maxRedirects: 5 }).catch(() => null);
    for (const href of hrefs) {
      const response = (await get(href)) || (await get(href));
      const status = response ? response.status() : 'no response';
      fs.appendFileSync('playwright-output/test-logs.txt', `${testId} ${href}: ${status}\n`);
      // Social sites often answer bots with 999 or 403; only a 404/410 or no answer is a broken link.
      expect.soft(response, `${href} did not respond`).not.toBeNull();
      if (response) expect.soft([404, 410], `${href} returned ${status}`).not.toContain(status);
    }
  });

  test('TC_CONSOLE_001 No page runs the ads pixel in debug mode', {
    annotation: [{ type: 'test_case', description: 'TC_CONSOLE_001' }, { type: 'issue', description: `${ISSUES}/39` }],
  }, async ({ page }, testInfo) => {
    // Story #38. The pixel is in the shared <head>, so a few pages stand for all.
    for (const key of ['homepage', 'contact', 'positions']) {
      await test.step(key, async () => {
        const debugLines = [];
        const collect = msg => { if (msg.text().startsWith('[oaiq]')) debugLines.push(msg.text()); };
        page.on('console', collect);
        await testPatterns.loadAndValidatePage(page, testInfo, buildURL(testInfo, urlPatterns[key], { cachebust: true }), 'TC_CONSOLE_001');
        await expect(jg.footer(page)).toBeVisible();
        // The pixel logs as it starts and again as it sends; give it a moment.
        // eslint-disable-next-line playwright/no-wait-for-timeout -- the ads pixel starts after load; this waits for it to log
        await page.waitForTimeout(2000);
        page.off('console', collect);

        // Fails on the live site today: known defect #11 (the pixel starts with debug:true).
        expect.soft(await page.content(), `${key} starts the pixel with debug:true`).not.toMatch(/oaiq\("init",\{[^}]*debug:\s*true/);
        expect.soft(debugLines, `${key} [oaiq] console messages`).toEqual([]);
      });
    }
  });
});
