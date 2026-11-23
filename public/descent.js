import { specimen } from "./specimens.js";

import { tiers } from "./tiers.js";

function node(tag, className, parent) {
  const element = document.createElement(tag);
  element.className = className;
  parent.append(element);
  return element;
}

function addGuideLines(track, scale) {
  return tiers.map((tier, index) => {
    const depth = tier.points * 10;
    const line = node("div", "wcdrop-line", track);
    line.style.top = depth * scale + "px";
    line.style.setProperty("--line-ink", tier.ink);
    line.style.setProperty("--fade-delay", index * 90 + "ms");
    const tag = node("span", "wcdrop-line-tag", line);
    node("span", "wcdrop-line-icon", tag).innerHTML = specimen(index);
    tag.append(document.createTextNode(tier.name + " · " + tier.points));
    return { line, depth, crossed: false };
  });
}

function addWater(scene, tier) {
  for (let i = 0; i < 15; i++) {
    const bubble = node("i", "wcdrop-bubble", scene);
    bubble.style.left = Math.random() * 100 + "%";
    bubble.style.top = 16 + Math.random() * 83 + "%";
    bubble.style.setProperty(
      "--size",
      2 + Math.floor(Math.random() * 4) + "px",
    );
    bubble.style.setProperty("--lift", -(65 + Math.random() * 130) + "px");
    bubble.style.setProperty("--drift", (Math.random() - 0.5) * 45 + "px");
    bubble.style.setProperty("--speed", 1 + Math.random() * 1.2 + "s");
    bubble.style.animationDelay = -Math.random() * 1.8 + "s";
  }
  if (tier !== 1) return;
  for (let i = 0; i < 8; i++) {
    const fish = node("i", "wcdrop-school", scene);
    fish.classList.toggle("from-right", i % 2 === 1);
    fish.style.top = 26 + ((i * 13) % 44) + "%";
    fish.style.animationDelay = 100 + i * 105 + "ms";
  }
}

function addGemLights(pill) {
  for (let i = 0; i < 10; i++) {
    const light = node("i", "wcdrop-orbit", pill);
    light.style.setProperty("--angle", i * 36 + "deg");
    light.style.setProperty("--rx", 36 + (i % 4) * 9 + "px");
    light.style.animationDelay = -(i * 0.14) + "s";
  }
}

function impact(scene, x, y, tier) {
  const center = node("div", "wcdrop-impact", scene);
  center.style.transform = "translate(" + x + "px," + y + "px)";
  const count = [6, 13, 12, 18, 15, 29][tier];
  const reach = [42, 58, 66, 86, 80, 122][tier];
  for (let i = 0; i < count; i++) {
    const spark = node("i", "wcdrop-spark", center);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.14;
    const radius = reach * (0.46 + Math.random() * 0.54);
    spark.style.setProperty("--dx", Math.cos(angle) * radius + "px");
    spark.style.setProperty("--dy", Math.sin(angle) * radius * 0.76 + "px");
    spark.style.setProperty("--size", 2 + (i % 3) + "px");
  }
}

// The caller owns the camera, HUD and settled result. This layer owns only
// transient scenery and can be aborted safely when a different view opens.
export function animateDrop({
  layer,
  result,
  onTravel,
  reducedMotion = false,
  signal,
}) {
  if (signal?.aborted) return Promise.resolve();
  if (reducedMotion) {
    onTravel(0);
    return Promise.resolve();
  }
  const validCatch =
    result.outcome === "scored" &&
    Number.isInteger(result.tier) &&
    tiers[result.tier];
  const tier = validCatch ? tiers[result.tier] : null;
  // Measure the host before inserting effects. Resize notifications supply later
  // changes without asking the browser for layout in an animation frame.
  let width = tier ? layer.clientWidth : 0;
  let height = tier ? layer.clientHeight : 0;
  let targetWidth = width;
  let targetHeight = height;
  const pixelScale = Math.min(2, Math.max(1.25, height / 400));
  const scene = node(
    "div",
    "wcdrop " + (tier ? "wcdrop-t" + result.tier : "wcdrop-miss"),
    layer,
  );
  scene.setAttribute("aria-hidden", "true");
  const travel = tier?.travel ?? 0;
  const tail = tier ? (result.tier === 5 ? 540 : 350) : 520;
  const track = tier ? node("div", "wcdrop-guides", scene) : null;
  const lines = track ? addGuideLines(track, pixelScale) : [];
  const shade = tier && result.tier === 4 ? node("div", "wcdrop-shade", scene) : null;
  let pill;
  if (tier) {
    scene.style.setProperty("--catch-ink", tier.ink);
    addWater(scene, result.tier);
    pill = node("div", "wcdrop-pill", scene);
    node("span", "wcdrop-answer", pill).textContent = "“" + result.answer + "”";
    if (result.tier === 5) addGemLights(pill);
  }
  return new Promise((resolve) => {
    let raf;
    let timer;
    let observer;
    const finish = () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      observer?.disconnect();
      signal?.removeEventListener("abort", finish);
      scene.remove();
      resolve();
    };
    signal?.addEventListener("abort", finish, { once: true });
    onTravel(travel);
    if (signal?.aborted) return;
    if (!tier) {
      timer = setTimeout(finish, tail);
      return;
    }
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(([entry]) => {
        targetWidth = entry.contentRect.width;
        targetHeight = entry.contentRect.height;
      });
      observer.observe(layer);
    }
    const start = performance.now();
    let lastFrame = start;
    function frame(time) {
      const elapsed = time - start;
      if (elapsed >= travel + tail) return finish();
      // A collapsing keyboard or browser toolbar should gently reframe the
      // catch. The time-based response has the same feel at 60 and 120 Hz.
      const blend = 1 - Math.exp(-Math.max(0, time - lastFrame) / 180);
      width += (targetWidth - width) * blend;
      height += (targetHeight - height) * blend;
      lastFrame = time;
      const progress = Math.min(1, Math.max(0, elapsed / travel));
      const eased = (1 - Math.cos(progress * Math.PI)) / 2;
      const goal = tier.points * 10;
      const startDepth = Math.min(60, goal * 0.4);
      const depth = startDepth + (goal - startDepth) * eased;
      const y = height * (0.38 + eased * 0.13);
      const sway = result.tier === 0 ? 22 : result.tier === 1 ? 8 : 12;
      const wave =
        Math.sin(progress * (result.tier === 1 ? 32 : 13)) *
        Math.sin(progress * Math.PI);
      const x = width / 2 + wave * sway;
      pill.style.transform =
        "translate(" +
        x +
        "px," +
        y +
        "px) translate(-50%,-50%) rotate(" +
        wave * 4 +
        "deg)";
      track.style.transform = "translateY(" + (y - depth * pixelScale) + "px)";
      if (shade) shade.style.transform = "translateY(" + (y - targetHeight / 2) + "px)";
      for (const guide of lines) {
        if (!guide.crossed && depth >= guide.depth - 0.6) {
          guide.crossed = true;
          guide.line.classList.add("crossed");
        }
      }
      if (progress === 1) {
        const remaining = travel + tail - elapsed;
        scene.style.setProperty("--settle-time", remaining + "ms");
        scene.classList.add("landed");
        impact(scene, x, y, result.tier);
        timer = setTimeout(finish, remaining);
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    frame(start);
  });
}
