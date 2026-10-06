import { test, expect } from '@playwright/test';
import { selectors } from '../selectors.js';
import { buildURL, urlPatterns } from '../config-helper.js';
import { testPatterns } from '../test-helpers.js';

// Story #35: screen reader and keyboard users can find their way around. Read-only.
const { jg } = selectors;
const ISSUES = 'https://github.com/karimarie67/QA-jahnelgroup/issues';

const onPhone = testInfo => Boolean(testInfo.project.use.isMobile);

async function open(page, testInfo, key, testId) {
  await testPatterns.loadAndValidatePage(page, testInfo, buildURL(testInfo, urlPatterns[key], { cachebust: true }), testId);
  // The header menu is drawn by the site's script once the page has loaded.
  await expect(jg.nav(page)).toBeAttached();
}

test.describe('Accessibility Tests (story #35)', { tag: ['@regression', '@a11y'] }, () => {

  test('TC_A11Y_001 Every page has a main and a header landmark', {
    annotation: [{ type: 'test_case', description: 'TC_A11Y_001' }, { type: 'issue', description: `${ISSUES}/36` }],
  }, async ({ page }, testInfo) => {
    testInfo.setTimeout(5 * 60 * 1000);
    // Fails on the live site today: known defect #12 (22 pages have no <main>, 20 no <header>).
    for (const key of Object.keys(urlPatterns)) {
      await test.step(key, async () => {
        await open(page, testInfo, key, 'TC_A11Y_001');
        await expect.soft(jg.mainLandmark(page), `${key} has one <main>`).toHaveCount(1);
        expect.soft(await jg.headerLandmark(page).count(), `${key} has a <header>`).toBeGreaterThan(0);
      });
    }
  });

  test('TC_A11Y_002 Phone menu button says whether the menu is open', {
    annotation: [{ type: 'test_case', description: 'TC_A11Y_002' }, { type: 'issue', description: `${ISSUES}/37` }],
  }, async ({ page }, testInfo) => {
    test.skip(!onPhone(testInfo), 'Phone layout only: runs in the *-mobile projects');

    await open(page, testInfo, 'homepage', 'TC_A11Y_002');
    const button = jg.menuButton(page);
    const firstLink = jg.navLink(page, 'Case Studies');
    // Fails on the live site today: known defect #13 (no aria-expanded).
    await expect.soft(button, 'closed').toHaveAttribute('aria-expanded', 'false');

    // Tap until the menu is on screen: a tap before the site's script is
    // ready does nothing.
    await expect(async () => {
      await button.tap();
      await expect(firstLink).toBeInViewport({ timeout: 2000 });
    }).toPass({ timeout: 15000 });
    await expect.soft(button, 'open').toHaveAttribute('aria-expanded', 'true');
  });
});
