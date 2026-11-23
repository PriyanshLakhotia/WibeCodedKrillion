import assert from "node:assert/strict";
import { after, test } from "node:test";

// Model the browser's bitmap clears on resize and collect final canvas coordinates.
// All app drawing and transitions still run, with a deterministic display clock.
let now = 100,
  nextFrame,
  resized;
const noop = () => {};
const gradient = () => ({
  first: undefined,
  addColorStop(fraction, color) {
    if (fraction === 0) this.first = color;
  },
});
function canvas() {
  let width = 300,
    height = 150;
  const output = {
    blank: true,
    paints: 0,
    labels: new Map(),
    style: {},
    setAttribute: noop,
  };
  const reset = () => {
    output.blank = true;
    output.labels.clear();
  };
  Object.defineProperties(output, {
    width: {
      get: () => width,
      set: (value) => {
        width = value;
        reset();
      },
    },
    height: {
      get: () => height,
      set: (value) => {
        height = value;
        reset();
      },
    },
  });
  const brush = new Proxy(
    {
      createLinearGradient: gradient,
      createRadialGradient: gradient,
      fillRect() {
        if (this.fillStyle?.first === "#315980")
          output.worldAlpha = this.globalAlpha;
      },
      drawImage(source) {
        output.blank = false;
        output.paints++;
        output.labels.clear();
        if (source.worldAlpha != null) output.worldAlpha = source.worldAlpha;
      },
      fillText(text, x, y) {
        output.labels.set(text, y);
      },
    },
    { get: (object, key) => object[key] ?? noop },
  );
  output.getContext = () => brush;
  return output;
}
const globals = Object.getOwnPropertyDescriptors(globalThis);
for (const [name, value] of Object.entries({
  document: {
    hidden: false,
    createElement: canvas,
    addEventListener: noop,
    removeEventListener: noop,
  },
  window: {
    matchMedia: () => ({
      matches: false,
      addEventListener: noop,
      removeEventListener: noop,
    }),
  },
  requestAnimationFrame: (cb) => {
    nextFrame = cb;
    return 1;
  },
  cancelAnimationFrame: () => {
    nextFrame = null;
  },
  performance: { now: () => now },
  ResizeObserver: class {
    constructor(cb) {
      resized = cb;
    }
    observe() {}
    disconnect() {}
  },
}))
  Object.defineProperty(globalThis, name, { configurable: true, value });
after(() => {
  for (const name of [
    "document",
    "window",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "performance",
    "ResizeObserver",
  ]) {
    if (globals[name]) Object.defineProperty(globalThis, name, globals[name]);
    else delete globalThis[name];
  }
});
const { createOcean } = await import("../public/ocean.js");

function screen() {
  now = 100;
  const image = canvas(),
    rect = { width: 1280, height: 720 };
  image.getBoundingClientRect = () => rect;
  const ocean = createOcean(image);
  function advance(ms) {
    now += ms;
    const cb = nextFrame;
    nextFrame = null;
    cb?.(now);
  }
  advance(50);
  return { image, rect, ocean, advance };
}

test("deep ascent keeps the player marker aligned with the voyage through the water column", () => {
  const { image, ocean, advance } = screen();
  ocean.update({ scene: "descent", depth: 7000, duration: 0 });
  advance(50);
  ocean.update({ scene: "surface", depth: 0, duration: 5000 });
  advance(2500);
  const y = image.labels.get("YOU");
  assert.ok(
    y > 0 && y < image.height,
    "3,500 m marker should remain in view, actual y = " + y,
  );
  assert.ok(
    image.labels.has("3,500m"),
    "the 3,500 m world landmark should pass the camera at half time",
  );
  ocean.destroy();
});

test("canvas resize always leaves a painted frame visible", () => {
  const { image, rect, ocean, advance } = screen();
  assert.equal(image.blank, false);
  rect.height = 540;
  resized();
  assert.equal(
    image.blank,
    false,
    "display bitmap was cleared and left blank during resize",
  );
  advance(16.7);
  assert.equal(image.blank, false);
  ocean.destroy();
});

test("a moving camera presents smooth frames on a 60 Hz display", () => {
  const { image, ocean, advance } = screen();
  ocean.update({ scene: "descent", depth: 1000, duration: 2000 });
  const before = image.paints;
  for (let i = 0; i < 60; i++) advance(1000 / 60);
  const paints = image.paints - before;
  assert.ok(
    paints >= 55,
    "moving camera painted only " + paints + " of 60 display frames",
  );
  ocean.destroy();
});

test("deep-water colors persist until the camera actually approaches the surface", () => {
  const { image, ocean, advance } = screen();
  ocean.update({ scene: "descent", depth: 7000, duration: 0 });
  advance(50);
  ocean.update({ scene: "surface", depth: 0, duration: 5000 });
  advance(2500);
  assert.equal(
    image.worldAlpha,
    1,
    "title-screen scrim blended into the open ocean at 3,500 m",
  );
  ocean.destroy();
});

test("interrupting a between-round dip carries the current camera position into ascent", () => {
  const { image, ocean, advance } = screen();
  ocean.update({ scene: "descent", depth: 100, duration: 0 });
  advance(50);
  ocean.update({ scene: "playing", depth: 100, duration: 2000 });
  advance(1000);
  const y = image.labels.get("100m");
  ocean.update({ scene: "surface", depth: 0, duration: 1000 });
  advance(16.7);
  const jump = Math.abs(y - image.labels.get("100m"));
  assert.ok(
    jump < 5,
    "camera jumped " + jump + "px on the first frame of the new transition",
  );
  ocean.destroy();
});

test("an explicit instant surface reset finishes an in-flight ascent to the same destination", () => {
  const { image, ocean, advance } = screen();
  ocean.update({ scene: "descent", depth: 7000, duration: 0 });
  advance(50);
  ocean.update({ scene: "surface", depth: 0, duration: 5000 });
  advance(300);
  ocean.update({ scene: "surface", depth: 0, duration: 0 });
  advance(16.7);
  assert.ok(
    Math.abs(image.labels.get("0m") - 438) < 5,
    "surface reset did not reach the horizon",
  );
  ocean.destroy();
});
