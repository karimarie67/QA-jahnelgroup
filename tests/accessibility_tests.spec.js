import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { selectors } from '../selectors.js';
import { buildURL, urlPatterns, siteConfig, requireEntries } from '../config-helper.js';
import { testPatterns } from '../test-helpers.js';
import { captureEvidence } from '../utils.js';

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

  test.describe('axe scan', () => {
    // No retry: it fails on known defects (#48-#54) every time, and a retry
    // reruns the whole 27-page scan against the live site.
    test.describe.configure({ retries: 0 });

    // The template's accessibility scan: axe-core on every page against WCAG 2.1
    // A and AA. It fails on serious and critical violations and lists the rest;
    // siteConfig.a11y.exclude skips third-party embeds the site doesn't control.
    // Fails on the live site today: known defects #48–#54 (one per axe rule).
    test('TC_A11Y_003 No page has a serious or critical accessibility violation', {
      annotation: [{ type: 'test_case', description: 'TC_A11Y_003' }, { type: 'issue', description: `${ISSUES}/45` }],
    }, async ({ page }, testInfo) => {
      test.setTimeout(300000);
      const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
      const BLOCKING = ['serious', 'critical'];
      const blocking = [];
      for (const p of requireEntries('pages', siteConfig.pages)) {
        let response;
        try {
          response = await page.goto(buildURL(testInfo, p.path), { waitUntil: 'load' });
        } catch (err) {
          expect.soft(err.message, `${p.path} failed to load, so it can't be scanned`).toBe('');
          continue;
        }
        // A page that doesn't load would scan clean: it must fail, not pass.
        const status = response?.status() ?? 0;
        if (status >= 400) {
          expect.soft(status, `${p.path} must load to be scanned`).toBeLessThan(400);
          continue;
        }
        let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);
        for (const selector of siteConfig.a11y?.exclude ?? []) builder = builder.exclude(selector);
        const results = await builder.analyze();
        // Rule, impact, help, and where: not the nodes' HTML, so page content
        // stays out of reports and evidence.
        const summary = results.violations.map(v => ({ rule: v.id, impact: v.impact, help: v.helpUrl, targets: v.nodes.map(n => n.target) }));
        await testInfo.attach(`axe ${p.path}`, { body: JSON.stringify(summary, null, 2), contentType: 'application/json' });
        for (const v of results.violations) {
          console.log(`${p.path}: ${v.impact} ${v.id} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'}), first: ${JSON.stringify(v.nodes[0]?.target)}`);
          if (BLOCKING.includes(v.impact)) blocking.push(`${p.path}: ${v.impact} ${v.id} (${v.nodes.length})`);
        }
      }
      await captureEvidence(page, testInfo);
      expect(blocking, 'serious or critical accessibility violations').toEqual([]);
    });
  });
});
