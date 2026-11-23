// Optional real-browser regression: set KRILLION_PLAYWRIGHT to an installed
// Playwright module and KRILLION_CHROME to Chromium if using a system browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { tiers } from '../public/tiers.js';

const origin = 'https://krillion-fixture.test';
const assets = new URL('../public/', import.meta.url);
const epoch = Date.UTC(2030, 0, 1, 12);
let chromium;
try {
  ({ chromium } = await import(process.env.KRILLION_PLAYWRIGHT || 'playwright'));
} catch (error) {
  if (process.env.KRILLION_PLAYWRIGHT || error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
const executablePath = process.env.KRILLION_CHROME || chromium?.executablePath();
const unavailable = !chromium || !existsSync(executablePath);
const types = { js: 'text/javascript', css: 'text/css', html: 'text/html', woff2: 'font/woff2', svg: 'image/svg+xml' };

// Fake only server state. The real DOM, camera, animations and navigation run.
function fixture() {
  const results = [];
  let round = 1;
  let phase = 'round';
  let opened = epoch + 3000;
  const state = (serverTime = opened - 3000) => ({
    id: 'fixture', mode: 'daily', day: '2030-01-01', source: 'guide', phase, round,
    points: results.reduce((total, r) => total + r.points, 0),
    results, completed: results.length === 7 ? epoch : null,
    question: phase === 'round' ? { category: 'Fixture', prompt: 'Fixture prompt ' + round } : null,
    opened, deadline: opened + 25000, paused: false, serverTime
  });
  return function handle(path, body) {
    if (path === '/api/status') return { day: '2030-01-01', configured: false, daily: null, free: null, unfinished: [], log: [] };
    if (path === '/api/dives') return state();
    assert.equal(path, '/api/dives/fixture');
    if (!body) return state();
    assert.equal(body.round, round);
    if (body.action === 'next') {
      assert.equal(phase, 'result');
      if (round === 7) phase = 'finished';
      else { round++; phase = 'round'; opened += 30000; }
    } else {
      assert.equal(phase, 'round');
      assert.ok(['pass', 'answer'].includes(body.action));
      if (body.answer === 'try again') return { ...state(opened + 1000), feedback: 'Choose another answer.' };
      const tier = body.action === 'pass' ? null : (round - 1) % tiers.length;
      results.push({ prompt: 'Fixture prompt ' + round, category: 'Fixture', answer: body.answer ?? '',
        tier, points: tiers[tier]?.points ?? 0, outcome: tier == null ? 'passed' : 'scored', gem: 'Gem ' + round });
      phase = 'result';
    }
    return state();
  };
}

// Node's wall clock keeps waits for fetch settlement independent of the
// browser's paused clock. All game clocks advance explicitly in the test.
async function until(page, predicate, label) {
  for (let i = 0; i < 150; i++) {
    if (await page.evaluate(predicate)) return;
    await delay(20);
  }
  assert.fail('Browser never reached ' + label);
}

test('the real client plays seven animated rounds with isolated server fixtures', {
  skip: unavailable && 'Install Playwright/Chromium or set KRILLION_PLAYWRIGHT and KRILLION_CHROME',
  timeout: 90000
}, async t => {
  const browser = await chromium.launch({ executablePath, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext({ viewport: { width: 960, height: 720 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let statusReady = Promise.withResolvers();
  let handle = fixture();
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    assert.equal(url.origin, origin, 'The browser must not contact any external service.');
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/status') await statusReady.promise;
      const body = route.request().postDataJSON();
      return route.fulfill({ json: handle(url.pathname, body) });
    }
    const name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    return route.fulfill({ body: await readFile(new URL(name, assets)), contentType: types[name.split('.').at(-1)] });
  });
  await page.addInitScript(() => {
    const titles = new Set();
    window.animationQA = { titles, scoreDrops: [], orphanPills: [] };
    let score = 0;
    new MutationObserver(() => {
      const title = document.querySelector('.wordmark');
      if (title) titles.add(title);
      const stage = document.body?.dataset.stage;
      const next = Number(document.getElementById('score')?.textContent.replaceAll(',', ''));
      if (Number.isFinite(next)) {
        if (['drop', 'result', 'round'].includes(stage) && next < score) {
          animationQA.scoreDrops.push({ stage, from: score, to: next, round: document.getElementById('round-count').textContent });
        }
        score = next;
      }
      if (stage && !['round', 'drop'].includes(stage) && document.querySelector('.wcdrop-pill')) {
        animationQA.orphanPills.push(stage);
      }
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-stage'] });
  });
  await page.clock.install({ time: new Date(epoch) });
  await page.clock.pauseAt(new Date(epoch + 1000));
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await delay(80);
  statusReady.resolve();
  await until(page, () => document.querySelector('[data-start]')?.disabled === false, 'ready surface');

  await t.test('reading status preserves the surface wordmark and its entrance animation', async () => {
    assert.equal(await page.evaluate(() => animationQA.titles.size), 1, 'A status response redrew the wordmark.');
  });

  await page.locator('[data-start]').dispatchEvent('click');
  await until(page, () => document.body.dataset.stage === 'round', 'round one');
  for (let round = 1; round <= 7; round++) {
    assert.equal(await page.locator('#prompt').textContent(), 'Fixture prompt ' + round);
    assert.equal(await page.locator('#answer-area').isVisible(), false);
    await page.clock.fastForward(3100);
    assert.equal(await page.locator('#answer-area').isVisible(), true);
    if (round === 1) {
      const originalInput = await page.locator('#answer').elementHandle();
      const originalPrompt = await page.locator('#prompt').elementHandle();
      await page.locator('#answer').fill('try again');
      await page.locator('#answer-form').dispatchEvent('submit');
      await until(page, () => document.querySelector('#answer-note')?.textContent === 'Choose another answer.', 'a rejected answer');
      assert.ok(await originalInput.evaluate(node => document.getElementById('answer') === node), 'Rejecting an answer replaced the focused input.');
      assert.ok(await originalPrompt.evaluate(node => document.getElementById('prompt') === node), 'Rejecting an answer replaced the prompt.');
      assert.equal(await page.locator('#prompt').textContent(), 'Fixture prompt 1');
    }
    await page.locator('#answer').fill('Answer ' + round);
    await page.locator('#answer-form').dispatchEvent('submit');
    await until(page, () => document.body.dataset.stage === 'drop', 'answer drop');
    const tier = tiers[(round - 1) % tiers.length];
    await page.clock.fastForward(Math.round(tier.travel / 2));
    assert.ok(await page.locator('.wcdrop-pill').isVisible());
    const pill = await page.locator('.wcdrop-pill').boundingBox();
    assert.ok(pill.x + pill.width / 2 > 380 && pill.x + pill.width / 2 < 580, 'Falling answer stays near the camera center.');
    await page.clock.fastForward(tier.travel - Math.round(tier.travel / 2) + 570);
    await until(page, () => document.body.dataset.stage === 'result', 'settled catch');
    assert.equal(await page.locator('.wcdrop-pill').count(), 0);
    // Advance as soon as the result appears, before its score tween finishes.
    await page.locator('[data-next]').dispatchEvent('click');
    if (round < 7) {
      await until(page, () => document.body.dataset.stage === 'round', 'next prompt');
      await page.clock.runFor(48);
    }
  }
  await until(page, () => document.body.dataset.stage === 'ascent', 'final ascent');
  await page.clock.fastForward(8000);
  await until(page, () => document.body.dataset.stage === 'report', 'final report');
  assert.equal(await page.locator('.recap-catches details').count(), 7);
  assert.equal(await page.locator('.recap-score strong').textContent(), '310 points');
  assert.deepEqual(errors, []);
  assert.deepEqual(await page.evaluate(() => animationQA.orphanPills), []);
  await t.test('advancing immediately after a catch never rolls back the visible score', async () => {
    const drops = await page.evaluate(() => animationQA.scoreDrops);
    assert.deepEqual(drops, [], 'Score rewound after pressing Descend: ' + JSON.stringify(drops));
  });

  await t.test('starting during a status request and passing an arriving prompt preserve visual state', async () => {
    statusReady = Promise.withResolvers();
    handle = fixture();
    await page.locator('[data-home]').dispatchEvent('click');
    await page.locator('[data-new-game]').dispatchEvent('click');
    await until(page, () => document.body.dataset.stage === 'round', 'new dive before old status');
    statusReady.resolve();
    await delay(50);
    assert.equal(await page.locator('body').getAttribute('data-stage'), 'round');
    assert.equal(await page.locator('.wordmark').count(), 0);

    const before = await page.locator('.question').evaluate(card => {
      const arriving = card.getAnimations().find(animation => animation.animationName === 'placard-rise');
      arriving.pause();
      arriving.currentTime = 400;
      return { top: card.getBoundingClientRect().top, opacity: Number(getComputedStyle(card).opacity) };
    });
    await page.locator('#menu').dispatchEvent('click');
    await page.locator('[data-pass]').dispatchEvent('click');
    await until(page, () => document.body.dataset.stage === 'drop', 'pass while arriving');
    const after = await page.locator('.question').evaluate(card => {
      const leaving = card.getAnimations().find(animation => animation.animationName === 'placard-leave');
      leaving.pause();
      leaving.currentTime = 0;
      return { top: card.getBoundingClientRect().top, opacity: Number(getComputedStyle(card).opacity) };
    });
    assert.ok(Math.abs(before.top - after.top) <= 2, 'Prompt jumped in pixels: ' + (after.top - before.top));
    assert.ok(Math.abs(before.opacity - after.opacity) < 0.03, 'Prompt flashed on early pass.');
    await page.clock.fastForward(700);
    await until(page, () => document.body.dataset.stage === 'result', 'passed result');
    assert.deepEqual(errors, []);
  });
});
