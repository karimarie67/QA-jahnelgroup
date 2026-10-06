import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BLOCKED_STATUSES,
  MAX_FULL_PAGE_SCREENSHOT_PX,
  captureEvidence,
  classifyLinkResult,
  evidencePath,
  wantsFullPage,
} from '../../utils.js';

test('classifyLinkResult', async t => {
  await t.test('sorts HTTP statuses', () => {
    assert.equal(classifyLinkResult({ status: 200 }), 'ok');
    assert.equal(classifyLinkResult({ status: 301 }), 'redirect');
    assert.equal(classifyLinkResult({ status: 404 }), 'broken');
    assert.equal(classifyLinkResult({ status: 410 }), 'broken');
    assert.equal(classifyLinkResult({ status: 500 }), 'broken');
  });

  await t.test('rate limits and bot checks are blocked, not broken', () => {
    assert.deepEqual(BLOCKED_STATUSES, [403, 429, 999]);
    for (const status of BLOCKED_STATUSES) {
      assert.equal(classifyLinkResult({ status }), 'blocked');
    }
  });

  await t.test('no status at all is broken (the old `response?.status` read gave a function, never a number)', () => {
    assert.equal(classifyLinkResult({ status: 0 }), 'broken');
    assert.equal(classifyLinkResult({ status: () => 404 }), 'broken');
    assert.equal(classifyLinkResult({}), 'broken');
  });

  await t.test('a file download is a working link', () => {
    assert.equal(classifyLinkResult({ error: 'page.goto: Download is starting' }), 'download');
  });

  await t.test('a timeout or network error gets one retry, then is broken', () => {
    for (const error of ['page.goto: Timeout 45000ms exceeded.', 'net::ERR_CONNECTION_RESET', 'net::ERR_TIMED_OUT']) {
      assert.equal(classifyLinkResult({ error }), 'retry', error);
      assert.equal(classifyLinkResult({ error }, { retried: true }), 'broken', error);
    }
  });

  await t.test('any other navigation error is broken at once', () => {
    assert.equal(classifyLinkResult({ error: 'net::ERR_NAME_NOT_RESOLVED' }), 'broken');
  });
});

test('wantsFullPage', async t => {
  await t.test('full page up to the cap, screen-sized above it', () => {
    assert.equal(MAX_FULL_PAGE_SCREENSHOT_PX, 20000);
    assert.equal(wantsFullPage(1200), true);
    assert.equal(wantsFullPage(20000), true);
    assert.equal(wantsFullPage(20001), false);
    assert.equal(wantsFullPage(163129), false);
  });

  await t.test('an unknown height still takes a full-page shot', () => {
    assert.equal(wantsFullPage(0), true);
    assert.equal(wantsFullPage(undefined), true);
  });
});

test('evidencePath', async t => {
  const info = (annotations, title = 'Some test', project = 'production') => ({ annotations, title, project: { name: project } });

  await t.test('uses the test case ID and the project', () => {
    assert.equal(evidencePath(info([{ type: 'test_case', description: 'TC_SMOKE_002' }])), 'test-results/TC_SMOKE_002/production.png');
    assert.equal(evidencePath(info([{ type: 'test_case', description: 'TC_SMOKE_002' }], 'x', 'production-mobile')), 'test-results/TC_SMOKE_002/production_mobile.png');
  });

  await t.test('falls back to the title without a test case ID', () => {
    assert.equal(evidencePath(info([], 'Login page loads')), 'test-results/login_page_loads/production.png');
  });

  await t.test('takes another root', () => {
    assert.equal(evidencePath(info([{ type: 'test_case', description: 'TC_X_001' }]), 'out'), 'out/TC_X_001/production.png');
  });
});

test('captureEvidence', async t => {
  const info = { annotations: [{ type: 'test_case', description: 'TC_X_001' }], title: 'x', project: { name: 'production' } };

  await t.test('QA_EVIDENCE=off saves nothing and never touches the page', async () => {
    const page = { evaluate: () => assert.fail('no page call'), screenshot: () => assert.fail('no screenshot') };
    assert.equal(await captureEvidence(page, info, 'out', { QA_EVIDENCE: 'off' }), null);
  });

  await t.test('otherwise it takes the screenshot at evidencePath', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-'));
    let taken;
    const page = { evaluate: async () => 500, screenshot: async opts => { taken = opts.path; } };
    const saved = await captureEvidence(page, info, root, {});
    assert.equal(saved, evidencePath(info, root));
    assert.equal(taken, saved);
  });
});
