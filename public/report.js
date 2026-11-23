import { specimen } from "./specimens.js";

import { tiers } from "./tiers.js";

const noCatch = { name: "No catch", ink: "#9aaac0" };
const bands = [
  { min: 0, label: "0–150", tier: 0 },
  { min: 151, label: "151–250", tier: 2 },
  { min: 251, label: "251–350", tier: 3 },
  { min: 351, label: "351–449", tier: 4 },
  { min: 450, label: "450–700", tier: 5 },
];
const entities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
const esc = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => entities[char]);
const fmt = (value) => value.toLocaleString("en-US");

function sprite(tier) {
  return Number.isInteger(tier) && tiers[tier]
    ? specimen(tier)
    : '<span class="recap-cross" aria-hidden="true">×</span>';
}

function answerFor(result) {
  if (result.answer) return result.answer;
  return result.outcome === "passed" ? "Passed" : "Time expired";
}

function depthChart(results) {
  const ticks = [0, 250, 500, 750, 1000]
    .map(
      (depth, i) => `
    <span class="recap-tick" style="--tick:${i * 25}%" aria-hidden="true">
      <span>${depth ? "−" + fmt(depth) : "0"}m</span>
    </span>`,
    )
    .join("");
  const columns = results
    .map((result, i) => {
      const tier = tiers[result.tier] ?? noCatch;
      const score = Math.min(100, Math.max(0, Number(result.points) || 0));
      const description = `Round ${i + 1}, ${answerFor(result)}, ${tier.name}, ${score * 10} metres`;
      return `<li style="--level:${score}%;--ink:${tier.ink};--stagger:${i * 80}ms" title="${esc(description)}">
      <span class="recap-sr">${esc(description)}</span>
      <span class="recap-thread" aria-hidden="true"></span>
      <span class="recap-marker" aria-hidden="true">${sprite(result.tier)}</span>
      <span class="recap-ordinal" aria-hidden="true">${i + 1}</span>
    </li>`;
    })
    .join("");
  return `<figure class="recap-chart">
    <figcaption class="recap-rule">Dive log <span>Depth per answer</span></figcaption>
    <div class="recap-plot">${ticks}<ol aria-label="Depth earned on each round">${columns}</ol></div>
  </figure>`;
}

function bearing(score) {
  const active = bands.findLast((band) => score >= band.min);
  const list = bands
    .map((band) => {
      const tier = tiers[band.tier];
      return `<li class="${active === band ? "is-current" : ""}" style="--ink:${tier.ink}">
      <span class="recap-glyph" aria-hidden="true">${sprite(band.tier)}</span>
      <span class="recap-range">${band.label}</span>
      <span class="recap-rating">${tier.name}</span>
      ${active === band ? '<span class="recap-you">Your dive</span>' : ""}
    </li>`;
    })
    .join("");
  return `<section aria-labelledby="recap-bearing">
    <h2 class="recap-rule" id="recap-bearing">The bearing <span>Total points</span></h2>
    <ul class="recap-bands">${list}</ul>
  </section>`;
}

function catches(results) {
  const rows = results
    .map((result, i) => {
      const tier = tiers[result.tier] ?? noCatch;
      const points = Number(result.points) || 0;
      return `<li><details class="recap-catch" style="--ink:${tier.ink}">
      <summary>
        <span class="recap-num">${i + 1}</span>
        <span class="recap-glyph" aria-hidden="true">${sprite(result.tier)}</span>
        <span class="recap-answer">${esc(answerFor(result))}</span>
        <span class="recap-points">+${fmt(points)} pts</span>
        <span class="recap-toggle" aria-hidden="true"></span>
      </summary>
      <div class="recap-catch-body"><p>${esc(result.prompt)}</p>
        <dl><div><dt>Your answer</dt><dd>${esc(answerFor(result))}</dd></div>
        <div><dt>Rarity</dt><dd class="recap-rarity">${tier.name}</dd></div>
        <div><dt>Descent</dt><dd>${fmt(points * 10)} m</dd></div>
        <div><dt>Hidden gem</dt><dd>${esc(result.gem)}</dd></div></dl>
      </div></details></li>`;
    })
    .join("");
  return `<section aria-labelledby="recap-catches">
    <h2 class="recap-rule" id="recap-catches">The catch <span>Open a round</span></h2>
    <ol class="recap-catches">${rows}</ol>
  </section>`;
}

export function diveReport(run) {
  const score = Number(run.points) || 0;
  const date = new Date(run.day + "T12:00:00Z");
  const validDate = Number.isFinite(date.getTime());
  const ordinal = validDate
    ? Math.floor(
        (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / 86400000,
      ) + 1
    : null;
  const day = validDate
    ? date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "";
  const dive =
    run.mode === "daily"
      ? "Daily dive" + (ordinal ? " #" + ordinal : "")
      : "Unlimited dive" + (run.number ? " #" + Number(run.number) : "");
  const depth = Math.max(0, score * 10);
  return `<article class="dive-recap" aria-labelledby="recap-title">
    <header class="recap-heading">
      <div class="recap-headline"><h1 id="recap-title">Wibe Coded Krillion</h1>
      <p>${dive} complete</p></div>
      <div class="recap-score"><strong>${fmt(score)}<span class="recap-sr"> points</span></strong>
      <span>${depth ? "−" : ""}${fmt(depth)} m</span></div>
      <p class="recap-date">${esc(day)}</p>
    </header>
    <div class="recap-actions"><button type="button" data-new-game>New game</button>
      <button type="button" data-copy>Copy result</button></div>
    ${depthChart(run.results)}
    ${bearing(score)}
    ${catches(run.results)}
    <button class="recap-back" type="button" data-home>↑ Back to surface</button>
  </article>`;
}
