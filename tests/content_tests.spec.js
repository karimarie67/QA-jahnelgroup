import { test, expect } from '@playwright/test';
import { selectors } from '../selectors.js';
import { buildURL, testData, urlPatterns, expectedUrlPatterns, siteConfig, pageTitles } from '../config-helper.js';
import { testPatterns } from '../test-helpers.js';

// The Engagement's own test data (config-helper.js, siteConfig.jg).
const site = siteConfig.jg;

// Stories #24 (content), #29 (contact), and #32 (careers). Read-only: nothing
// is typed into or sent, and Apply is never pressed.
const { jg } = selectors;
const ISSUES = 'https://github.com/karimarie67/QA-jahnelgroup/issues';

async function open(page, testInfo, key, testId) {
  await testPatterns.loadAndValidatePage(page, testInfo, buildURL(testInfo, urlPatterns[key], { cachebust: true }), testId);
  // The header menu is drawn by the site's script once the page has loaded.
  await expect(jg.nav(page)).toBeAttached();
}

test.describe('Content Tests (stories #24, #29, #32)', { tag: ['@regression', '@content'] }, () => {

  test('TC_CONTENT_001 Case Studies page links to its three case studies', {
    annotation: [{ type: 'test_case', description: 'TC_CONTENT_001' }, { type: 'issue', description: `${ISSUES}/26` }],
  }, async ({ page }, testInfo) => {
    for (const [name, key] of site.caseStudies) {
      await test.step(name, async () => {
        await open(page, testInfo, 'caseStudies', 'TC_CONTENT_001');
        await jg.contentLink(page, name).click();
        await expect(page).toHaveURL(expectedUrlPatterns.page(urlPatterns[key]));
        await expect(page).toHaveTitle(pageTitles[key]);
        await expect(jg.mainHeading(page)).toBeVisible();
      });
    }
  });

  test('TC_CONTENT_002 Videos and Our HQ embed their videos, map, and tour, each with a title', {
    annotation: [{ type: 'test_case', description: 'TC_CONTENT_002' }, { type: 'issue', description: `${ISSUES}/27` }],
  }, async ({ page }, testInfo) => {
    // Only that each embed is on the page, titled, from its host. How the
    // players behave inside is out of scope.
    for (const key of ['videos', 'office']) {
      await test.step(key, async () => {
        await open(page, testInfo, key, 'TC_CONTENT_002');
        for (const [title, host] of site.embeds[key]) {
          const embed = jg.embed(page, title);
          await expect.soft(embed, `${key}: "${title}"`).toHaveCount(1);
          if (await embed.count() === 1) {
            expect.soft(new URL(await embed.getAttribute('src')).hostname, `${key}: "${title}" host`).toBe(host);
          }
        }
      });
    }
  });

  test('TC_CONTACT_001 Contact page\'s phone and email are links', {
    annotation: [{ type: 'test_case', description: 'TC_CONTACT_001' }, { type: 'issue', description: `${ISSUES}/31` }],
  }, async ({ page }, testInfo) => {
    // Only the links are checked; nothing is called or emailed.
    await open(page, testInfo, 'contact', 'TC_CONTACT_001');
    for (const [text, href] of site.contactLinks) {
      await expect.soft(page.getByRole('link', { name: text, exact: true }), text).toHaveAttribute('href', href);
    }
  });

  test('TC_CAREERS_001 Careers previews open roles and See All Positions opens Open Positions', {
    annotation: [{ type: 'test_case', description: 'TC_CAREERS_001' }, { type: 'issue', description: `${ISSUES}/33` }],
  }, async ({ page }, testInfo) => {
    await open(page, testInfo, 'careers', 'TC_CAREERS_001');
    // The roles load from Greenhouse after the page does. Apply is never pressed.
    await expect(jg.roleApplyButtons(page).first()).toBeVisible({ timeout: testData.timeouts.long });

    await page.getByRole('link', { name: 'See All Positions', exact: true }).click();
    await expect(page).toHaveURL(expectedUrlPatterns.page(urlPatterns.positions));
    await expect(page).toHaveTitle(pageTitles.positions);
    await expect(jg.roleFilters(page)).toBeVisible();
  });
});
