import { test, expect } from '@playwright/test';
import { buildURL, siteConfig, requireEntries } from '../config-helper.js';

// The skeleton's performance budgets, from siteConfig.perf: each page's
// Web Vitals measured in the browser during a normal load, against the
// budgets the brief sets. Read-only: it only loads pages.
//
// - LCP (largest contentful paint): when the main content showed.
// - CLS (cumulative layout shift): how much the page jumped while loading.
// - TTFB (time to first byte) and load: from the Navigation Timing API.
//
// LCP and CLS are Chromium's metrics, so this runs on the Chromium projects
// (desktop and the Pixel 5) and skips on the opt-in Firefox, WebKit, and
// iPhone ones. No CPU or network throttling: a CI machine's numbers vary, so
// set budgets with headroom, and treat a failure as a reason to look, not a
// verdict. INP needs real interactions, so it isn't measured here.

const perf = siteConfig.perf ?? null;
const BUDGETS = [
  ['lcpMs', 'lcp', 'LCP', v => `${Math.round(v)} ms`],
  ['cls', 'cls', 'CLS', v => v.toFixed(3)],
  ['ttfbMs', 'ttfb', 'TTFB', v => `${Math.round(v)} ms`],
  ['loadMs', 'load', 'load', v => `${Math.round(v)} ms`],
];

/** The page's Web Vitals so far, after letting late shifts and paints land. */
async function measure(page, settleMs) {
  return page.evaluate(settle => new Promise(resolve => {
    let lcp = 0;
    let cls = 0;
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) lcp = e.renderTime || e.loadTime || e.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    // Every shift counts. CLS usually leaves out shifts after user input, but
    // this test never touches the page, and Chromium's phone emulation marks
    // a load-time shift as "after recent input" when there was none, which
    // would hide every shift on the phone projects.
    new PerformanceObserver(list => {
      for (const e of list.getEntries()) cls += e.value;
    }).observe({ type: 'layout-shift', buffered: true });
    const nav = performance.getEntriesByType('navigation')[0];
    setTimeout(() => resolve({ lcp, cls, ttfb: nav.responseStart, load: nav.loadEventEnd }), settle);
  }), settleMs);
}

test.describe('Performance Tests', { tag: ['@regression', '@perf'] }, () => {
  test.skip(perf === null, 'no performance budgets configured (siteConfig.perf is not set)');

  test('TC_PERF_001 The key pages load within their performance budgets', {
    annotation: [{ type: 'test_case', description: 'TC_PERF_001' }, { type: 'issue', description: 'https://github.com/karimarie67/QA-jahnelgroup/issues/47' }],
  }, async ({ page, browserName }, testInfo) => {
    test.skip(browserName !== 'chromium', 'LCP and CLS are Chromium metrics');
    const budgets = perf.budgets || {};
    const paths = perf.pages || requireEntries('pages', siteConfig.pages).map(p => p.path);
    const results = [];
    for (const path of paths) {
      await page.goto(buildURL(testInfo, path), { waitUntil: 'load' });
      const m = await measure(page, perf.settleMs ?? 1000);
      results.push({ path, ...m });
      // A metric that was never reported reads 0, which is within any budget:
      // it must fail, not pass.
      for (const metric of ['lcp', 'ttfb', 'load']) {
        expect.soft(m[metric], `${path}: ${metric.toUpperCase()} was measured`).toBeGreaterThan(0);
      }
      for (const [budgetKey, metric, label, show] of BUDGETS) {
        if (budgets[budgetKey] === undefined) continue;
        expect.soft(m[metric], `${path}: ${label} ${show(m[metric])}, budget ${show(budgets[budgetKey])}`).toBeLessThanOrEqual(budgets[budgetKey]);
      }
    }
    // The measurements, for the report and the evidence.
    await testInfo.attach('web-vitals.json', { body: JSON.stringify(results, null, 2), contentType: 'application/json' });
    console.log(results.map(r => `${r.path}: LCP ${Math.round(r.lcp)} ms, CLS ${r.cls.toFixed(3)}, TTFB ${Math.round(r.ttfb)} ms, load ${Math.round(r.load)} ms`).join('\n'));
  });
});
