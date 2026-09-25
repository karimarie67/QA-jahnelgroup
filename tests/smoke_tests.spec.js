import { test, expect } from '@playwright/test';
import fs from 'fs';
import { selectors } from '../selectors.js';
import { buildURL, testData, urlPatterns, expectedUrlPatterns } from '../config-helper.js';
import { testPatterns } from '../test-helpers.js';

fs.mkdirSync('test-results', { recursive: true });

// Read-only: these tests load pages and look, and open and close menus,
// filters, and dialogs. They never type into or send a form, because
// jahnelgroup.com is the live site.
const { jg } = selectors;

// The *-mobile projects emulate a phone, where the header menu is behind a
// menu button.
const onPhone = testInfo => Boolean(testInfo.project.use.isMobile);

async function open(page, testInfo, key, testId) {
  const result = await testPatterns.loadAndValidatePage(page, testInfo, buildURL(testInfo, urlPatterns[key], { cachebust: true }), testId);
  // The header menu is drawn by the site's script once the page has loaded.
  await expect(jg.nav(page)).toBeAttached();
  return result;
}

// The phone menu slides in from off-screen, where its links still count as
// visible, so "open" means its first link is on screen. A tap before the
// site's script has wired the button up does nothing, so tap until it opens.
async function openPhoneMenu(page) {
  const firstLink = jg.navLink(page, testData.navLinks[0][0]);
  await expect(async () => {
    await jg.menuButton(page).tap();
    await expect(firstLink).toBeInViewport({ timeout: 2000 });
  }).toPass({ timeout: testData.timeouts.medium });
}

async function openMenuOnPhone(page, testInfo) {
  if (onPhone(testInfo)) {
    await openPhoneMenu(page);
  }
}

test.describe('Smoke Tests', () => {

  test('TC_SMOKE_001 Home page loads with its title, logo, header menu, and main heading', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_001' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_001';

    const { loadTime } = await open(page, testInfo, 'homepage', testId);
    expect(loadTime / 1000).toBeLessThanOrEqual(15);

    await expect(page).toHaveTitle(testData.pageTitles.homepage);
    await expect(jg.logo(page)).toBeVisible();
    await expect(onPhone(testInfo) ? jg.menuButton(page) : jg.servicesButton(page)).toBeVisible();
    await expect(jg.mainHeading(page)).toHaveText(/Where AI becomes reality/i);
  });

  test('TC_SMOKE_002 Header menu reaches Case Studies, Team, Culture, Careers, and Contact', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_002' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_002';

    for (const [name, key] of testData.navLinks) {
      await test.step(name, async () => {
        await open(page, testInfo, 'homepage', testId);
        await openMenuOnPhone(page, testInfo);
        await jg.navLink(page, name).click();
        await expect(page).toHaveURL(expectedUrlPatterns.page(urlPatterns[key]));
        await expect(page).toHaveTitle(testData.pageTitles[key]);
        fs.appendFileSync('test-results/smoke-logs.txt', `${testId} ${name} -> ${page.url()}\n`);
      });
    }
  });

  test('TC_SMOKE_003 Services menu opens and reaches each service page', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_003' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_003';

    for (const [name, key] of testData.serviceLinks) {
      await test.step(name, async () => {
        await open(page, testInfo, 'homepage', testId);
        await openMenuOnPhone(page, testInfo);
        await jg.servicesButton(page).click();
        await expect(jg.servicesButton(page)).toHaveAttribute('aria-expanded', 'true');
        await jg.serviceLink(page, name).click();
        await expect(page).toHaveURL(expectedUrlPatterns.page(urlPatterns[key]));
        await expect(page).toHaveTitle(testData.pageTitles[key]);
      });
    }
  });

  test('TC_SMOKE_004 Every page loads with its own title and a main heading', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_004' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_004';
    testInfo.setTimeout(5 * 60 * 1000);

    for (const key of Object.keys(urlPatterns)) {
      await test.step(key, async () => {
        // Soft, so one page's defect doesn't hide the rest.
        const loadError = await open(page, testInfo, key, testId).then(() => null, e => e.message);
        expect.soft(loadError, `${key} loads`).toBeNull();
        if (loadError) return;
        await expect.soft(page, `${key} title`).toHaveTitle(testData.pageTitles[key]);
        await expect.soft(jg.mainHeading(page), `${key} has one <h1>`).toHaveCount(1);
      });
    }
  });

  test('TC_SMOKE_005 Footer shows the contact details and links to the site\'s pages and social profiles', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_005' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_005';

    await open(page, testInfo, 'homepage', testId);
    const footer = jg.footer(page);
    for (const detail of Object.values(testData.contact)) {
      await expect.soft(footer).toContainText(detail);
    }
    for (const [name, key] of testData.footerLinks) {
      await expect.soft(jg.footerLink(page, name), `footer link ${name}`).toHaveAttribute('href', urlPatterns[key]);
    }
    for (const [name, href] of testData.socialLinks) {
      await expect.soft(jg.footerLink(page, name), `social link ${name}`).toHaveAttribute('href', href);
    }
    await expect.soft(jg.copyright(page)).toContainText(String(new Date().getFullYear()));

    // A footer link really reaches its page.
    await jg.footerLink(page, 'Privacy Notice').click();
    await expect(page).toHaveURL(expectedUrlPatterns.page(urlPatterns.privacyNotice));
    await expect(page).toHaveTitle(testData.pageTitles.privacyNotice);
  });

  test('TC_SMOKE_006 Contact form shows its fields, marks Email and the project required, and loads reCAPTCHA', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_006' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_006';

    // Looked at only. Nothing is typed, and Send Message is never pressed.
    await open(page, testInfo, 'contact', testId);
    await expect(jg.contactForm(page)).toBeVisible();
    for (const label of testData.contactFormFields) {
      const field = jg.contactField(page, label);
      await expect.soft(field, label).toBeVisible();
      await expect.soft(field, `${label} is empty`).toHaveValue('');
      if (testData.contactRequiredFields.includes(label)) {
        await expect.soft(field, `${label} is required`).toHaveAttribute('required', '');
      } else {
        await expect.soft(field, `${label} is optional`).not.toHaveAttribute('required');
      }
    }
    await expect.soft(jg.contactField(page, 'Email*')).toHaveAttribute('type', 'email');
    await expect.soft(jg.recaptcha(page)).toBeAttached();
    await expect(jg.contactSubmit(page)).toBeEnabled();
  });

  test('TC_SMOKE_007 Open Positions lists roles, its filters narrow the list, and a role\'s details open and close', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_007' }],
  }, async ({ page }, testInfo) => {
    const testId = 'TC_SMOKE_007';

    await open(page, testInfo, 'positions', testId);
    // The roles load from Greenhouse after the page does.
    await expect(jg.roleApplyButtons(page).first()).toBeVisible({ timeout: testData.timeouts.long });
    const allRoles = await jg.roleApplyButtons(page).count();
    fs.appendFileSync('test-results/smoke-logs.txt', `${testId} ${allRoles} roles listed\n`);

    // Each filter's name ends with its count, and shows that many roles.
    for (const name of testData.roleFilters) {
      await test.step(`${name} filter`, async () => {
        const filter = jg.roleFilter(page, name);
        await filter.click();
        await expect(filter).toHaveAttribute('aria-pressed', 'true');
        const count = Number((await filter.innerText()).match(/(\d+)\s*$/)[1]);
        await expect.soft(jg.roleApplyButtons(page), `${name} shows ${count} roles`).toHaveCount(count);
        if (name === 'All Roles') expect.soft(count, 'All Roles counts every role').toBe(allRoles);
      });
    }

    // About opens the role's details; closing puts the list back. Apply is
    // never pressed.
    await jg.roleFilter(page, 'All Roles').click();
    await jg.roleAboutButtons(page).first().click();
    await expect(jg.roleDialog(page)).toBeVisible();
    await expect(jg.roleDialog(page).getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
    await jg.roleDialogClose(page).click();
    await expect(jg.roleDialog(page)).toHaveCount(0);
  });

  test('TC_SMOKE_008 Phone layout fits the screen and its menu opens and closes', {
    tag: '@smoke',
    annotation: [{ type: 'test_case', description: 'TC_SMOKE_008' }],
  }, async ({ page }, testInfo) => {
    test.skip(!onPhone(testInfo), 'Phone layout only: runs in the *-mobile projects');
    const testId = 'TC_SMOKE_008';

    for (const key of ['homepage', 'contact', 'positions', 'office', 'videos']) {
      await test.step(`${key} fits`, async () => {
        await open(page, testInfo, key, testId);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect.soft(overflow, `${key} should not scroll sideways`).toBeLessThanOrEqual(0);
      });
    }

    await open(page, testInfo, 'homepage', testId);
    const firstLink = jg.navLink(page, testData.navLinks[0][0]);
    await expect(firstLink).not.toBeInViewport();
    await openPhoneMenu(page);
    for (const [name] of testData.navLinks) {
      await expect(jg.navLink(page, name)).toBeInViewport();
    }
    await jg.menuButton(page).tap();
    await expect(firstLink).not.toBeInViewport();
  });
});
