import assert from "node:assert/strict";
import test from "node:test";
import { animateDrop } from "../public/descent.js";
import { tiers } from "../public/tiers.js";

function clockwork(t) {
  let time = 0, nextId = 0, reads = 0;
  let size = { width: 390, height: 620 };
  const frames = new Map(), timers = new Map(), observers = new Set();
  class Element {
    children = [];
    classList = { add() {}, toggle() {} };
    style = { setProperty(name, value) { this[name] = value; } };
    get clientWidth() { reads++; return size.width; }
    get clientHeight() { reads++; return size.height; }
    append(child) { this.children.push(child); }
    setAttribute() {}
    remove() { this.removed = true; }
    find(name) {
      if (this.className === name) return this;
      for (const child of this.children) {
        const match = child.find?.(name);
        if (match) return match;
      }
    }
  }
  const globals = {
    document: { createElement: () => new Element(), createTextNode: String },
    performance: { now: () => time },
    requestAnimationFrame: fn => { frames.set(++nextId, fn); return nextId; },
    cancelAnimationFrame: id => frames.delete(id),
    setTimeout: (fn, ms) => { timers.set(++nextId, { at: time + ms, fn }); return nextId; },
    clearTimeout: id => timers.delete(id),
    ResizeObserver: class {
      constructor(fn) { this.fn = fn; }
      observe() { observers.add(this); }
      disconnect() { observers.delete(this); }
    }
  };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value, writable: true });
    t.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else delete globalThis[key]; });
  }
  return {
    layer: new Element(), frames, timers, observers, get reads() { return reads; },
    resize(width, height) {
      size = { width, height };
      observers.forEach(observer => observer.fn([{ contentRect: size }]));
    },
    frame(timestamp) {
      time = timestamp;
      for (const [id, task] of [...timers]) {
        if (task.at <= time) { timers.delete(id); task.fn(); }
      }
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach(fn => fn(time));
    }
  };
}

function pose(el) {
  const match = /translate(?:3d)?\(([-+0-9.e]+)px,\s*([-+0-9.e]+)px/.exec(el.style.transform);
  assert.ok(match, "the first paint must already position the answer pill");
  return { x: Number(match[1]), y: Number(match[2]) };
}

for (const tier of [0, 3, 4, 5]) {
  test("tier " + tier + " starts in place, crosses a viewport resize smoothly and settles without a frame loop", async t => {
    const clock = clockwork(t);
    const travel = tiers[tier].travel;
    const done = animateDrop({
      layer: clock.layer, result: { outcome: "scored", tier, answer: "example" },
      onTravel(duration) { assert.equal(duration, travel); }
    });
    const pill = clock.layer.find("wcdrop-pill");
    assert.equal(pose(pill).x, 195);
    clock.frame(1000);
    const before = pose(pill);
    const reads = clock.reads;
    clock.resize(390, 820);
    clock.frame(1016);
    const after = pose(pill);
    assert.ok(Math.abs(after.y - before.y) < 12, "height change teleported the answer pill");
    clock.frame(1032);
    assert.equal(clock.reads, reads, "moving frames should not synchronously measure layout");
    clock.frame(1500);
    assert.ok(pose(pill).y > before.y + 40, "the pill should settle into the new viewport");
    clock.frame(travel);
    assert.equal(clock.frames.size, 0, "landing should yield to CSS particles and fade");
    clock.frame(travel + 540);
    await done;
    assert.ok(clock.layer.children[0].removed);
    assert.equal(clock.observers.size, 0);
  });
}

test("the CSS-only miss finishes at the end of its fade and abort clears pending work", async t => {
  const clock = clockwork(t);
  const controller = new AbortController();
  const miss = { layer: clock.layer, result: { outcome: "passed", tier: null }, onTravel: d => assert.equal(d, 0) };
  const first = animateDrop(miss);
  assert.equal(clock.frames.size, 0);
  clock.frame(519);
  assert.ok(!clock.layer.children[0].removed);
  clock.frame(520);
  await first;
  assert.ok(clock.layer.children[0].removed);
  const second = animateDrop({ ...miss, signal: controller.signal });
  controller.abort();
  await second;
  assert.equal(clock.timers.size, 0);
  assert.equal(clock.frames.size, 0);
});
