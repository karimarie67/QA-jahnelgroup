import fs from 'fs';
import { expect } from '@playwright/test';
import { logAndScreenshot, safeGoto } from './utils.js';
import { testData } from './config-helper.js';

fs.mkdirSync('playwright-output', { recursive: true });

/**
 * Find and return the first visible element from a locator
 * @param {import('@playwright/test').Locator} locator - Playwright locator
 * @param {string} elementName - Name for logging purposes
 * @param {string} testId - Test case ID for logging
 * @returns {Promise<import('@playwright/test').Locator|null>} First visible element or null
 */
export async function findVisibleElement(locator, elementName, testId) {
  const count = await locator.count();
  fs.appendFileSync('playwright-output/test-logs.txt', `${testId} ${elementName} locator matched ${count} elements\n`);
  
  for (let i = 0; i < count; i++) {
    const element = locator.nth(i);
    const isVisible = await element.isVisible().catch(() => false);
    fs.appendFileSync('playwright-output/test-logs.txt', `${testId} ${elementName} ${i} visible: ${isVisible}\n`);
    if (isVisible) {
      return element;
    }
  }
  return null;
}

/**
 * Test element visibility with fallback options
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {import('@playwright/test').TestInfo} testInfo - Test info
 * @param {import('@playwright/test').Locator} primaryLocator - Primary selector
 * @param {Array<import('@playwright/test').Locator>} fallbackLocators - Fallback selectors
 * @param {string} elementName - Name for error messages
 * @param {string} testId - Test case ID
 * @returns {Promise<import('@playwright/test').Locator>} Visible element
 */
export async function testElementVisibility(page, testInfo, primaryLocator, fallbackLocators = [], elementName, testId) {
  // Try primary locator
  const primaryElement = await findVisibleElement(primaryLocator, `${elementName} (primary)`, testId);
  if (primaryElement) {
    await expect(primaryElement).toBeVisible({ timeout: testData.timeouts.medium });
    return primaryElement;
  }

  // Try fallback locators
  for (let i = 0; i < fallbackLocators.length; i++) {
    const fallbackElement = await findVisibleElement(fallbackLocators[i], `${elementName} (fallback ${i})`, testId);
    if (fallbackElement) {
      fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Using ${elementName} fallback ${i}\n`);
      await expect(fallbackElement).toBeVisible({ timeout: testData.timeouts.medium });
      return fallbackElement;
    }
  }

  // Element not found
  await logAndScreenshot(page, testInfo, `${elementName} not visible`, `playwright-output/screenshots/${testId.toLowerCase()}/${elementName.toLowerCase().replace(/\s+/g, '_')}_not_visible.png`);
  throw new Error(`${elementName} not visible`);
}

/**
 * Handle mobile menu interaction if needed
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {Object} selectors - Selector object
 * @param {string} testId - Test case ID
 */
export async function handleMobileMenu(page, selectors, testId) {
  const toggle = selectors.mobileToggle(page).first();
  const isToggleVisible = await toggle.isVisible().catch(() => false);
  fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Mobile toggle visible: ${isToggleVisible}\n`);
  if (!isToggleVisible) {
    return false; // No menu button: the header menu is already showing.
  }

  // Open means on screen. A closed slide-in menu often sits off-screen, where
  // Playwright still counts it as visible, so check toBeInViewport. Site
  // builders wire the button up after `load`, so an early tap can do nothing:
  // tap again until the menu is open, but only while it's still closed, so a
  // retry can't close a menu that opened late. A menu that never opens fails
  // the test rather than being logged and skipped.
  const menu = selectors.mobileMenu(page).first();
  await expect(async () => {
    const open = await expect(menu).toBeInViewport({ timeout: 250 }).then(() => true, () => false);
    if (!open) await toggle.click();
    await expect(menu).toBeInViewport({ timeout: 1000 });
  }).toPass({ timeout: testData.timeouts.medium });
  fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Mobile menu opened\n`);
  return true;
}

/**
 * Test navigation link functionality
 * @param {import('@playwright/test').Page} page - Playwright page
 * @param {import('@playwright/test').TestInfo} testInfo - Test info
 * @param {import('@playwright/test').Locator} link - Link element
 * @param {number} index - Link index for logging
 * @param {string} testId - Test case ID
 * @param {string} homeUrl - URL to return to after testing
 */
export async function testNavigationLink(page, testInfo, link, index, testId, homeUrl) {
  const href = await link.getAttribute('href').catch(() => null);
  const text = await link.textContent().catch(() => 'unknown');
  
  // Skip invalid links
  if (!href || href === '#' || href.match(/^https?:\/\//)) {
    fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Skipping invalid nav link ${index}: text="${text}", href="${href}"\n`);
    return;
  }

  try {
    await expect(link).toBeVisible({ timeout: testData.timeouts.short });
    await link.click();
    
    // Create regex pattern for href matching
    const escapedHref = href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(page).toHaveURL(new RegExp(escapedHref), { timeout: testData.timeouts.short });
    
    fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Nav link ${index} successful: "${text}" -> ${href}\n`);
    
    // Return to homepage for next test
    await safeGoto(page, testInfo, homeUrl, { waitUntil: 'domcontentloaded' });
    
  } catch (error) {
    fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Nav link ${index} failed: text="${text}", href="${href}", error="${error.message}"\n`);
    await logAndScreenshot(page, testInfo, `Navigation failed for link ${index}`, `playwright-output/screenshots/${testId.toLowerCase()}/link_${index}_failed.png`);
  }
}

/**
 * Validate element attributes and log details
 * @param {import('@playwright/test').Locator} element - Element to validate
 * @param {string} elementName - Name for logging
 * @param {string} testId - Test case ID
 * @returns {Promise<Object>} Element details
 */
export async function validateElementDetails(element, elementName, testId) {
  const details = {
    text: await element.textContent().catch(() => 'unknown'),
    href: await element.getAttribute('href').catch(() => null),
    class: await element.getAttribute('class').catch(() => null),
    id: await element.getAttribute('id').catch(() => null),
    isVisible: await element.isVisible().catch(() => false),
  };
  
  fs.appendFileSync('playwright-output/test-logs.txt', `${testId} ${elementName} details: ${JSON.stringify(details)}\n`);
  return details;
}

/**
 * Common test patterns wrapped in reusable functions
 */
export const testPatterns = {
  /**
   * Standard page load and validation
   */
  async loadAndValidatePage(page, testInfo, url, testId) {
    const startTime = Date.now();
    const { success, finalUrl } = await safeGoto(page, testInfo, url, { waitUntil: 'domcontentloaded' });
    
    if (!success) {
      await logAndScreenshot(page, testInfo, `Page load failed: ${finalUrl}`, `playwright-output/screenshots/${testId.toLowerCase()}/load_failed.png`);
      throw new Error(`Page load failed: ${finalUrl}`);
    }

    const loadTime = Date.now() - startTime;
    await logAndScreenshot(page, testInfo, `Page loaded in ${loadTime}ms, URL: ${page.url()}`, `playwright-output/screenshots/${testId.toLowerCase()}/loaded.png`);
    
    return { loadTime, finalUrl };
  },

  /**
   * Viewport management
   */
  async setViewport(page, viewport, testId) {
    await page.setViewportSize(viewport);
    fs.appendFileSync('playwright-output/test-logs.txt', `${testId} Viewport set to ${viewport.width}x${viewport.height}\n`);
  }
};
let lastPoliteRequestAt = 0;

/**
 * GET a URL politely, for request-only checks (link status, downloads,
 * sitemaps) on a live site. Requests are spaced at least `gapMs` apart, and a
 * 429 (Too Many Requests) is retried after its `Retry-After`, up to
 * `maxRetries` times. A 429 that persists is returned as is: the caller must
 * treat it as "rate limited", never as the page's status (it would pass a
 * "below 500" check).
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {string} url
 * @param {{gapMs?: number, maxRetries?: number, maxWaitMs?: number, sleep?: (ms: number) => Promise<void>, now?: () => number}} [options]
 * @returns {Promise<import('@playwright/test').APIResponse>}
 */
export async function politeGet(request, url, options = {}) {
  const {
    gapMs = 300,
    maxRetries = 2,
    maxWaitMs = 30000,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
    now = () => Date.now(),
  } = options;
  for (let attempt = 0; ; attempt++) {
    const wait = lastPoliteRequestAt + gapMs - now();
    if (wait > 0) await sleep(wait);
    lastPoliteRequestAt = now();
    const response = await request.get(url);
    if (response.status() !== 429 || attempt >= maxRetries) return response;
    const retryAfter = Number(response.headers()['retry-after']);
    await sleep(Math.min(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000 * (attempt + 1), maxWaitMs));
  }
}

/**
 * Skip a request-only test everywhere but the desktop Chromium project: its
 * result can't differ by device or browser, and running it on each one
 * multiplies the load on the live site. (Phones, and the opt-in Firefox,
 * WebKit, and iPhone projects, skip it.)
 * @param {import('@playwright/test').TestInfo} testInfo
 */
export function skipOnPhone(testInfo) {
  const use = testInfo.project.use || {};
  // Playwright's device presets ('Desktop Firefox') name the browser in
  // defaultBrowserType, not browserName.
  const browser = use.browserName ?? use.defaultBrowserType ?? 'chromium';
  const desktopChromium = !use.isMobile && browser === 'chromium' && !testInfo.project.name.endsWith('-mobile');
  testInfo.skip(!desktopChromium, 'Request-only check: runs once, on the desktop Chromium project');
}
