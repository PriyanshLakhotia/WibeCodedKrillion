import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { bank, normalizeAnswer, offlineGrade } from '../game/bank.mjs';
import { createGame } from '../game/engine.mjs';

function setup(t, options = {}) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  let time = Date.UTC(2026, 6, 16, 12);
  const config = { db, now: () => time, ...options };
  return {
    game: createGame(config),
    restart: () => createGame(config),
    setTime: value => { time = value; }
  };
}

const questions = Array.from({ length: 7 }, (_, index) => ({
  id: 'mock-' + index, category: 'Topic ' + index, prompt: 'Name an example in group ' + index + '.',
  gem: 'Gem ' + index, rubric: 'Accept one example in this group.'
}));

test('field guide recognizes aliases and distinguishes different concepts', () => {
  assert.ok(bank.length >= 21);
  assert.equal(new Set(bank.map(q => q.id)).size, bank.length);
  for (const question of bank) {
    assert.deepEqual(offlineGrade(question.id, question.gem), { canonical: question.gem, tier: 5 });
    assert.equal(offlineGrade(question.id, 'A nonexistent answer name'), null);
  }
  assert.deepEqual(offlineGrade('si-units', 'A'), { canonical: 'Ampere', tier: 3 });
  assert.deepEqual(offlineGrade('mother-sauces', '   sauce VELOUTÉ  '), { canonical: 'Velouté', tier: 5 });
  assert.deepEqual(offlineGrade('olympic-decathlon', '1,500m'), { canonical: '1500 metres', tier: 5 });
  assert.deepEqual(offlineGrade('clue-rooms', 'THE billiards room!'), { canonical: 'Billiard room', tier: 5 });
  assert.equal(offlineGrade('us-states', 'Washington DC'), null);
  assert.equal(offlineGrade('planets', 'Pluto'), null);
  assert.notEqual(normalizeAnswer('C'), normalizeAnswer('C++'));
  assert.notEqual(normalizeAnswer('C#'), normalizeAnswer('C++'));
});

test('the field guide accepts one unambiguous letter edit in a longer answer', () => {
  for (const answer of ['Neptuen', 'NepptunE', 'Neptne', 'Neptine']) {
    assert.deepEqual(offlineGrade('planets', answer), { canonical: 'Neptune', tier: 5 });
  }
  assert.deepEqual(offlineGrade('clue-rooms', 'the biliards room'), { canonical: 'Billiard room', tier: 5 });
  assert.equal(offlineGrade('moon-phases', 'waving crescent'), null); // Waxing or waning.
  assert.equal(offlineGrade('chess-pieces', 'Rock'), null); // A short word near "rook".
  assert.equal(offlineGrade('n64-karts', 'Xario'), null); // Mario or Wario.
  assert.equal(offlineGrade('pixar-first-ten', 'Toy Story 3'), null);
  assert.equal(offlineGrade('olympic-decathlon', '120 metres hurdles'), null);
  assert.equal(offlineGrade('planets', 'Neptun3'), null);
  assert.equal(offlineGrade('planets', 'Neptun#'), null);
  assert.equal(offlineGrade('planets', 'Nepptunn'), null);
  assert.equal(offlineGrade('planets', 'some Neptune'), null);
});

test('a keyless seven-round dive scores, survives a restart, and records one daily result', async t => {
  let calls = 0;
  const { game, restart, setTime } = setup(t, {
    generate: () => { calls++; }, grade: () => { calls++; }
  });
  const [first, duplicate] = await Promise.all([game.start('diver', 'daily'), game.start('diver', 'daily')]);
  assert.equal(first.id, duplicate.id);
  assert.equal(first.source, 'guide');
  assert.equal(game.status('diver').configured, false);
  assert.deepEqual(Object.keys(first.question).sort(), ['category', 'prompt']);
  const peer = await game.start('another', 'daily');
  assert.deepEqual(peer.question, first.question);
  assert.notEqual(peer.id, first.id);
  assert.throws(() => game.read('another', first.id), { status: 404 });

  const engine = restart();
  let state = engine.read('diver', first.id);
  const prompts = new Set();
  for (let round = 1; round <= 7; round++) {
    assert.equal(state.round, round);
    prompts.add(state.question.prompt);
    const question = bank.find(q => q.prompt === state.question.prompt);
    setTime(state.opened);
    const result = await engine.act('diver', first.id, { round, action: 'answer', answer: question.gem });
    assert.equal(result.results.length, round);
    assert.deepEqual([result.results.at(-1).answer, result.results.at(-1).tier], [question.gem, 5]);
    assert.equal(result.points, round * 100);
    const replay = await engine.act('diver', first.id, { round, action: 'pass' });
    assert.equal(replay.results.length, round);
    state = await engine.act('diver', first.id, { round, action: 'next' });
    const repeatedNext = await engine.act('diver', first.id, { round, action: 'next' });
    assert.deepEqual(repeatedNext, state);
  }
  assert.equal(prompts.size, 7);
  assert.equal(state.phase, 'finished');
  assert.equal(state.points, 700);
  assert.equal(calls, 0);
  assert.equal(engine.status('diver').log.length, 1);
  assert.equal((await engine.start('diver', 'daily')).id, first.id);
  setTime(state.serverTime + 86_400_000);
  assert.notEqual((await engine.start('diver', 'daily')).id, first.id);
});

test('free dives resume while open and can be repeated after round seven', async t => {
  const { game } = setup(t);
  const first = await game.start('diver', 'free');
  const daily = await game.start('diver', 'daily');
  assert.notEqual(first.id, daily.id);
  assert.equal((await game.start('diver', 'free')).id, first.id);
  for (let round = 1; round <= 7; round++) {
    const result = await game.act('diver', first.id, { action: 'pass', round });
    assert.equal(result.results.at(-1).outcome, 'passed');
    await game.act('diver', first.id, { action: 'next', round });
  }
  assert.equal(game.status('diver').free, null);
  const next = await game.start('diver', 'free');
  assert.notEqual(first.id, next.id);
  assert.equal(game.status('diver').free.id, next.id);
  assert.equal(game.status('diver').log[0].points, 0);
});

test('the server owns the three-second preview, 25-second deadline, and retries', async t => {
  const { game, setTime } = setup(t);
  const first = await game.start('diver', 'free');
  const act = (action, answer) => game.act('diver', first.id, { action, answer, round: 1 });
  assert.equal(first.opened - first.serverTime, 3000);
  assert.equal(first.deadline - first.opened, 25000);
  setTime(first.opened - 1);
  await assert.rejects(act('answer', 'Outside the window'), { status: 409 });
  assert.equal((await act('timeout')).phase, 'round');
  setTime(first.deadline - 1);
  await assert.rejects(act('answer', '  '), { status: 400 });
  const rejected = await act('answer', 'Clearly not in the answer set');
  assert.ok(rejected.feedback);
  assert.equal(rejected.results.length, 0);
  assert.equal(rejected.deadline, first.deadline);
  setTime(first.deadline);
  const question = bank.find(q => q.prompt === first.question.prompt);
  const late = await act('answer', question.gem);
  assert.deepEqual([late.points, late.results.length, late.results[0].outcome], [0, 1, 'timeout']);
  assert.equal((await act('timeout')).results.length, 1);
});

test('shared AI decks and normalized repeated answers are persisted and reused', async t => {
  const generated = [], graded = [];
  const { game, restart, setTime } = setup(t, {
    key: 'test-key', model: 'test-model',
    generate: async args => { generated.push(args); return questions; },
    grade: async args => { graded.push(args); return { tier: 3, canonical: 'Résumé' }; }
  });
  const [a, b] = await Promise.all([game.start('a', 'daily'), game.start('b', 'daily')]);
  assert.equal(generated.length, 1);
  assert.equal(generated[0].model, 'test-model');
  assert.equal(a.source, 'ai');
  assert.deepEqual(a.question, b.question);
  assert.equal(JSON.stringify(a).includes(questions[0].gem), false);
  assert.equal(JSON.stringify(a).includes(questions[0].rubric), false);
  setTime(a.opened);
  const one = await game.act('a', a.id, { action: 'answer', round: 1, answer: 'Résumé' });
  assert.equal(one.results[0].points, 60);
  assert.equal(one.results[0].gem, questions[0].gem);
  const two = await restart().act('b', b.id, { action: 'answer', round: 1, answer: ' RÉSUMÉ ' });
  assert.equal(two.results[0].answer, 'Résumé');
  assert.equal(graded.length, 1);
  assert.deepEqual(graded[0], { key: 'test-key', question: questions[0], answer: 'Résumé' });
  await game.start('a', 'free');
  assert.equal(generated.length, 2);
  assert.deepEqual(generated[1].avoid, questions.map(q => q.prompt));
});

test('distinct spellings with different meanings get separate Decisions judgments', async t => {
  const graded = [];
  const { game, setTime } = setup(t, {
    key: 'test-key', generate: async () => questions,
    grade: async ({ answer }) => {
      graded.push(answer);
      return { tier: answer === 'résumé' ? 3 : null, canonical: answer };
    }
  });
  const noun = await game.start('one', 'daily');
  const verb = await game.start('two', 'daily');
  setTime(noun.opened);
  const accepted = await game.act('one', noun.id, { action: 'answer', round: 1, answer: 'résumé' });
  assert.equal(accepted.results[0].tier, 3);
  const rejected = await game.act('two', verb.id, { action: 'answer', round: 1, answer: 'resume' });
  assert.equal(rejected.phase, 'round');
  assert.ok(rejected.feedback);
  assert.deepEqual(graded, ['résumé', 'resume']);
});

test('slow or unavailable grading preserves the remaining answer window', async t => {
  let attempts = 0;
  const firstRequest = Promise.withResolvers();
  const beganGrading = Promise.withResolvers();
  const { game, setTime } = setup(t, {
    key: 'test-key', generate: async () => questions,
    grade: async () => {
      attempts++;
      if (attempts === 1) {
        beganGrading.resolve();
        return firstRequest.promise;
      }
      if (attempts === 2) throw new Error('service unavailable');
      return { tier: 5, canonical: questions[0].gem };
    }
  });
  const run = await game.start('diver', 'daily');
  const act = answer => game.act('diver', run.id, { action: 'answer', round: 1, answer });
  setTime(run.deadline - 317);
  const pending = act('bad example');
  await beganGrading.promise;
  setTime(run.deadline + 5000);
  assert.equal(game.read('diver', run.id).paused, true);
  await assert.rejects(act('second submission'), { status: 409 });
  firstRequest.resolve({ tier: null, canonical: '' });
  const rejected = await pending;
  assert.equal(rejected.deadline - rejected.serverTime, 317);
  await assert.rejects(act('retry later'), { status: 503 });
  setTime(rejected.deadline + 300_000);
  assert.equal(game.read('diver', run.id).remainingMs, 317);
  const success = await act(questions[0].gem);
  assert.equal(success.results.length, 1);
  assert.equal(success.results[0].points, 100);
  assert.equal(attempts, 3);
});

test('generation failure leaves a full playable field-guide deck', async t => {
  const { game, setTime } = setup(t, {
    key: 'test-key', generate: async () => { throw new Error('Network failure'); },
    grade: async () => { assert.fail('guide answers must be graded locally'); }
  });
  const a = await game.start('diver', 'daily');
  assert.equal(a.source, 'guide');
  assert.ok(a.notice);
  setTime(a.opened);
  const question = bank.find(q => q.prompt === a.question.prompt);
  const result = await game.act('diver', a.id, { action: 'answer', round: 1, answer: question.gem });
  assert.equal(result.points, 100);
});

async function finishWithPasses(game, owner, start) {
  let state = start;
  const prompts = [];
  while (state.phase === 'round') {
    prompts.push(state.question.prompt);
    const round = state.round;
    await game.act(owner, start.id, { round, action: 'pass' });
    state = await game.act(owner, start.id, { round, action: 'next' });
  }
  assert.equal(state.phase, 'finished');
  return prompts;
}

test('new Unlimited starts are owner-scoped and idempotent while older dives remain playable', async t => {
  const { game, restart } = setup(t);
  const daily = await game.start('alice', 'daily');
  const legacy = await game.start('alice', 'free');
  const requestId = randomUUID();
  const [fresh, retry, other] = await Promise.all([
    game.start('alice', 'free', requestId),
    game.start('alice', 'free', requestId),
    game.start('alice', 'free', randomUUID())
  ]);
  assert.equal(retry.id, fresh.id);
  const expected = new Set([daily.id, legacy.id, fresh.id, other.id]);
  assert.equal(expected.size, 4);
  assert.deepEqual(new Set(game.status('alice').unfinished.map(dive => dive.id)), expected);

  const engine = restart();
  assert.equal((await engine.start('alice', 'free', requestId)).id, fresh.id);
  const peer = await engine.start('bob', 'free', requestId);
  assert.notEqual(peer.id, fresh.id);
  assert.deepEqual(engine.status('bob').unfinished.map(dive => dive.id), [peer.id]);
  assert.throws(() => engine.read('bob', fresh.id), { status: 404 });
  assert.equal((await engine.start('alice', 'daily')).id, daily.id);

  assert.equal((await finishWithPasses(engine, 'alice', fresh)).length, 7);
  const replay = await engine.start('alice', 'free', requestId);
  assert.equal(replay.id, fresh.id);
  assert.equal(replay.phase, 'finished');
  expected.delete(fresh.id);
  assert.deepEqual(new Set(engine.status('alice').unfinished.map(dive => dive.id)), expected);
  assert.equal(engine.status('alice').log[0].id, fresh.id);
  assert.ok([legacy.id, other.id].includes((await engine.start('alice', 'free')).id));
  const old = await engine.act('alice', legacy.id, { action: 'pass', round: 1 });
  assert.deepEqual([old.round, old.results.length, old.results[0].outcome], [1, 1, 'passed']);
});

test('the fresh-start token must be a UUID v4 and may only be used with Unlimited', async t => {
  const { game } = setup(t);
  for (const token of ['', 'not-a-uuid', 'a8901234-5678-1234-9234-123456789012', 'a8901234-5678-4234-1234-123456789012']) {
    await assert.rejects(async () => game.start('diver', 'free', token), { status: 400 });
  }
  await assert.rejects(async () => game.start('diver', 'daily', randomUUID()), { status: 400 });
  assert.deepEqual(game.status('diver').unfinished, []);
});

test('fresh field-guide dives exhaust unseen prompts and avoid the previous dive even across a cycle boundary', async t => {
  const { game } = setup(t);
  const daily = await game.start('diver', 'daily');
  // Starting a daily claims its full question set before a single answer has been played.
  const firstFree = await game.start('diver', 'free', randomUUID());
  const decks = [await finishWithPasses(game, 'diver', daily), await finishWithPasses(game, 'diver', firstFree)];
  while (decks.length < Math.ceil(bank.length / 7) + 1) {
    const next = await game.start('diver', 'free', randomUUID());
    decks.push(await finishWithPasses(game, 'diver', next));
  }
  for (const [index, deck] of decks.entries()) {
    assert.equal(deck.length, 7);
    assert.equal(new Set(deck).size, 7);
    if (index) assert.deepEqual(deck.filter(prompt => decks[index - 1].includes(prompt)), []);
  }
  assert.deepEqual(new Set(decks.flat().slice(0, bank.length)), new Set(bank.map(q => q.prompt)));
});

test('one AI pack is authored per new request, and later packs remember the player’s earlier prompts', async t => {
  const authored = [];
  const { game, restart } = setup(t, {
    key: 'test-key', model: 'stub-terra',
    generate: async ({ avoid }) => {
      const pack = questions.map(q => ({ ...q, id: randomUUID(), prompt: q.prompt + ' Pack ' + authored.length }));
      authored.push({ pack, avoid });
      return pack;
    },
    grade: () => assert.fail('opening a dive must not judge answers')
  });
  await game.start('alice', 'daily');
  const firstId = randomUUID();
  const [first, duplicate] = await Promise.all([
    game.start('alice', 'free', firstId), game.start('alice', 'free', firstId)
  ]);
  assert.equal(first.id, duplicate.id);
  assert.equal(first.source, 'ai');
  assert.equal(authored.length, 2);
  const engine = restart();
  assert.equal((await engine.start('alice', 'free', firstId)).id, first.id);
  assert.equal(authored.length, 2);

  // Other players can generate many dives between this player's visits.
  for (let i = 0; i < 6; i++) await engine.start('bob', 'free', randomUUID());
  const next = await engine.start('alice', 'free', randomUUID());
  assert.equal(authored.length, 9);
  assert.notEqual(next.id, first.id);
  assert.notEqual(next.question.prompt, first.question.prompt);
  const avoid = new Set(authored.at(-1).avoid);
  for (const previous of authored.slice(0, 2)) {
    for (const q of previous.pack) assert.ok(avoid.has(q.prompt), q.prompt);
  }
});

test('a failed explicit AI start preserves games and supports retry or an explicit field-guide start', async t => {
  let offline = false;
  let calls = 0;
  const { game, restart } = setup(t, {
    key: 'test-key',
    generate: async () => {
      calls++;
      if (offline) throw new Error('Stub generator offline');
      return questions;
    }
  });
  const active = await game.start('diver', 'free', randomUUID());
  offline = true;
  const retryId = randomUUID();
  await assert.rejects(async () => game.start('diver', 'free', retryId), { status: 503 });
  assert.deepEqual(game.status('diver').unfinished.map(d => d.id), [active.id]);
  assert.equal(game.read('diver', active.id).phase, 'round');
  offline = false;
  const engine = restart();
  const retried = await engine.start('diver', 'free', retryId);
  assert.equal(retried.source, 'ai');
  assert.equal((await engine.start('diver', 'free', retryId, true)).id, retried.id);
  assert.equal(calls, 3);

  offline = true;
  const fallbackId = randomUUID();
  await assert.rejects(async () => engine.start('diver', 'free', fallbackId), { status: 503 });
  const fallback = await engine.start('diver', 'free', fallbackId, true);
  assert.equal(fallback.source, 'guide');
  assert.equal((await engine.start('diver', 'free', fallbackId)).id, fallback.id);
  assert.equal(calls, 4);
  assert.equal(engine.status('diver').unfinished.length, 3);
});
