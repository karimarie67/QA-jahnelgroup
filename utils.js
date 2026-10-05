import fs from 'fs';
import nodePath from 'path';

function sanitizeForPath(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

// A full-page screenshot of a very tall page outlasts its timeout and leaves
// the browser busy, so the next page load times out too (one Engagement's
// phone runs had a 163,129 px page). Above this height, take a screen-sized
// shot instead.
export const MAX_FULL_PAGE_SCREENSHOT_PX = 20000;

export function wantsFullPage(scrollHeight) {
  return !(scrollHeight > MAX_FULL_PAGE_SCREENSHOT_PX);
}

export async function logAndScreenshot(page, testInfo, message, path, logFile = 'playwright-output/test-logs.txt') {
  fs.mkdirSync(nodePath.dirname(logFile), { recursive: true });
  fs.appendFileSync(logFile, `TC_${testInfo.title}: ${message}\n`);
  if (!page.isClosed()) {
    try {
      fs.mkdirSync(nodePath.dirname(path), { recursive: true });
      const height = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
      await page.screenshot({ path, fullPage: wantsFullPage(height), timeout: 3000 });
      fs.appendFileSync(logFile, `Screenshot saved: ${path}\n`);
    } catch (err) {
      fs.appendFileSync(logFile, `Screenshot failed: ${err.message}\n`);
    }
  } else {
    fs.appendFileSync(logFile, `Screenshot skipped: Page is closed\n`);
  }
}

export async function logOnFailure(page, testInfo, message, screenshotPath, logFile = 'playwright-output/test-logs.txt') {
  await logAndScreenshot(page, testInfo, message, screenshotPath, logFile);
  throw new Error(message);
}

export async function safeGoto(page, testInfo, url, options = { waitUntil: 'networkidle' }) {
  const maxRetries = 3;
  let finalUrl = url;
  const screenshotDir = `playwright-output/screenshots/${sanitizeForPath(testInfo.title)}`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (page.isClosed()) {
      await logAndScreenshot(page, testInfo, `Page is closed before goto attempt ${attempt} for ${url}`, `${screenshotDir}/goto_attempt_${attempt}_closed.png`);
      return { success: false, finalUrl };
    }
    try {
      const response = await page.goto(finalUrl, { ...options, timeout: 20000 });
      const status = response ? response.status() : 'no response';
      const redirectUrl = response && status >= 300 && status < 400 ? response.headerValue('location') : null;
      await logAndScreenshot(page, testInfo, `Navigated to ${finalUrl} with status ${status}${redirectUrl ? `, Redirect: ${redirectUrl}` : ''} on attempt ${attempt}`, `${screenshotDir}/goto_attempt_${attempt}.png`);
      if (redirectUrl && redirectUrl !== finalUrl) {
        finalUrl = redirectUrl.startsWith('/') ? `${new URL(page.url()).origin}${redirectUrl}` : redirectUrl;
        await logAndScreenshot(page, testInfo, `Following redirect to ${finalUrl} on attempt ${attempt}`, `${screenshotDir}/goto_attempt_${attempt}_redirect.png`);
        continue;
      }
      return { success: true, finalUrl };
    } catch (err) {
      await logAndScreenshot(page, testInfo, `Goto attempt ${attempt} failed for ${finalUrl}: ${err.message}`, `${screenshotDir}/goto_attempt_${attempt}_error.png`);
      if (attempt === maxRetries) return { success: false, finalUrl };
      await page.waitForTimeout(1000);
    }
  }
  return { success: false, finalUrl };
}

// Link check results. A status a site sends to automated requests it wants to
// slow down or refuse (rate limits, bot checks) isn't a broken link: report it
// apart, and look at it by hand.
export const BLOCKED_STATUSES = [403, 429, 999];

/**
 * Classify one link check.
 * @param {{status?: number, error?: string}} result - the HTTP status, or the
 *   navigation error's message when there was no response
 * @returns {'ok'|'redirect'|'blocked'|'broken'|'download'|'retry'}
 *   'retry' means a timeout or network error worth one more try; ask again
 *   with `{ retried: true }` to get its final verdict ('broken').
 */
export function classifyLinkResult({ status, error } = {}, { retried = false } = {}) {
  if (error) {
    // Navigating to a file download throws, but the link works.
    if (/Download is starting/i.test(error)) return 'download';
    if (!retried && /timeout|ERR_TIMED_OUT|ERR_CONNECTION|ERR_NETWORK|ECONNRESET|socket hang up/i.test(error)) return 'retry';
    return 'broken';
  }
  if (typeof status !== 'number' || status === 0) return 'broken';
  if (BLOCKED_STATUSES.includes(status)) return 'blocked';
  if (status >= 400) return 'broken';
  if (status >= 300) return 'redirect';
  return 'ok';
}

/**
 * Where a test's committed evidence goes: `test-results/<test case ID>/<project>.png`,
 * so it's found by test case, not by Playwright's hashed output folder
 * (docs/agents/testing.md: one directory per test).
 * @param {{annotations?: {type: string, description?: string}[], title: string, project: {name: string}}} testInfo
 */
export function evidencePath(testInfo, root = 'test-results') {
  const tc = (testInfo.annotations || []).find(a => a.type === 'test_case')?.description;
  const dir = tc || sanitizeForPath(testInfo.title);
  return nodePath.join(root, dir, `${sanitizeForPath(testInfo.project.name) || 'default'}.png`);
}

/**
 * Save a screenshot of the page as the test's evidence (see evidencePath).
 * Call it after the last assertion, or from an afterEach hook. It never fails
 * the test: a missing screenshot is logged instead.
 *
 * QA_EVIDENCE=off skips it (returns null). `npm run test:skeleton` sets it:
 * a run against the fixture site isn't proof of work on the real one, and
 * would overwrite the committed screenshots.
 */
export async function captureEvidence(page, testInfo, root = 'test-results', env = process.env) {
  if (env.QA_EVIDENCE === 'off') return null;
  const path = evidencePath(testInfo, root);
  try {
    fs.mkdirSync(nodePath.dirname(path), { recursive: true });
    const height = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => 0);
    await page.screenshot({ path, fullPage: wantsFullPage(height), timeout: 5000 });
    return path;
  } catch (err) {
    console.log(`Evidence screenshot failed for ${path}: ${err.message}`);
    return null;
  }
}
