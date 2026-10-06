import test from 'node:test';
import assert from 'node:assert/strict';
import { politeGet, skipOnPhone } from '../../test-helpers.js';

// A fake APIRequestContext that answers from a list of statuses, and a fake
// clock, so politeGet's spacing and retries run without waiting.
function fakes(statuses, retryAfter) {
  let clock = 1_000_000;
  const sleeps = [];
  const calls = [];
  const request = {
    get: async url => {
      calls.push({ url, at: clock });
      const status = statuses.shift();
      return { status: () => status, headers: () => (retryAfter === undefined ? {} : { 'retry-after': String(retryAfter) }) };
    },
  };
  const options = { sleep: async ms => { sleeps.push(ms); clock += ms; }, now: () => clock };
  return { request, options, sleeps, calls };
}

test('politeGet', async t => {
  await t.test('returns the response when it is not a 429', async () => {
    const f = fakes([200]);
    const res = await politeGet(f.request, 'https://x.test/a', f.options);
    assert.equal(res.status(), 200);
    assert.equal(f.calls.length, 1);
  });

  await t.test('spaces requests at least gapMs apart', async () => {
    const f = fakes([200, 200]);
    await politeGet(f.request, 'https://x.test/a', { ...f.options, gapMs: 300 });
    await politeGet(f.request, 'https://x.test/b', { ...f.options, gapMs: 300 });
    assert.ok(f.calls[1].at - f.calls[0].at >= 300);
  });

  await t.test("retries a 429 after its Retry-After, then returns what comes", async () => {
    const f = fakes([429, 200], 2);
    const res = await politeGet(f.request, 'https://x.test/a', f.options);
    assert.equal(res.status(), 200);
    assert.equal(f.calls.length, 2);
    assert.ok(f.sleeps.includes(2000));
  });

  await t.test('returns a 429 that persists, for the caller to treat as rate limited', async () => {
    const f = fakes([429, 429, 429], 1);
    const res = await politeGet(f.request, 'https://x.test/a', { ...f.options, maxRetries: 2 });
    assert.equal(res.status(), 429);
    assert.equal(f.calls.length, 3);
  });

  await t.test('caps the wait at maxWaitMs', async () => {
    const f = fakes([429, 200], 600);
    await politeGet(f.request, 'https://x.test/a', { ...f.options, maxWaitMs: 5000 });
    assert.ok(f.sleeps.includes(5000));
    assert.ok(!f.sleeps.includes(600000));
  });
});

test('skipOnPhone', async t => {
  const info = (name, use = {}) => {
    const calls = [];
    return { project: { name, use }, skip: (cond, reason) => calls.push([cond, reason]), calls };
  };

  await t.test('skips on another browser or a phone emulation, whatever the name', () => {
    for (const [name, use] of [['production-firefox', { browserName: 'firefox' }], ['production-webkit', { browserName: 'webkit' }], ['production-iphone', { browserName: 'webkit', isMobile: true }], ['x', { isMobile: true }]]) {
      const i = info(name, use);
      skipOnPhone(i);
      assert.equal(i.calls[0][0], true, name);
    }
  });

  await t.test("skips on a device preset's browser (defaultBrowserType), as the QA_BROWSERS projects use", () => {
    for (const [name, use] of [['production-firefox', { defaultBrowserType: 'firefox' }], ['production-webkit', { defaultBrowserType: 'webkit' }]]) {
      const i = info(name, use);
      skipOnPhone(i);
      assert.equal(i.calls[0][0], true, name);
    }
  });

  await t.test('runs on desktop Chromium, named or by default', () => {
    const i = info('production', { browserName: 'chromium' });
    skipOnPhone(i);
    assert.equal(i.calls[0][0], false);
  });

  await t.test('skips on a -mobile project', () => {
    const i = info('production-mobile');
    skipOnPhone(i);
    assert.equal(i.calls[0][0], true);
  });

  await t.test('runs on a desktop project', () => {
    const i = info('production');
    skipOnPhone(i);
    assert.equal(i.calls[0][0], false);
  });
});
