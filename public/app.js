import { createOcean } from "./ocean.js";
import { createAudio } from "./audio.js";
import { animateDrop } from "./descent.js";
import { specimen } from "./specimens.js";
import { icon } from "./icons.js";
import { diveReport } from "./report.js";
import { tiers } from "./tiers.js";

const $ = (id) => document.getElementById(id);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const ocean = createOcean($("ocean"));
const audio = createAudio();
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const screen = $("screen"),
  dock = $("dock");
let status,
  run,
  mode = "daily",
  stage = "surface",
  generation = 0,
  busy = false;
let timer,
  movement,
  previewOpen = false,
  endAt,
  openAt,
  lastSecond,
  draft = "";
let counterFrame,
  displayedDepth = 0,
  displayedScore = 0,
  toastTimer,
  modalOrigin;
let sound = pref("krillion-sound", "off") === "on";
let scanlines = pref("krillion-crt", "on") === "on";

function pref(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function savePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
function setStage(value) {
  stage = value;
  document.body.dataset.stage = value;
  $("hud").hidden = !["round", "drop", "result", "ascent"].includes(value);
}
function stopMotion() {
  clearInterval(timer);
  movement?.abort();
  movement = null;
  cancelAnimationFrame(counterFrame);
  $("fx").replaceChildren();
}
function resetView() {
  generation++;
  stopMotion();
  clearTimeout(toastTimer);
  $("toast").classList.remove("visible");
  $("toast").textContent = "";
  busy = false;
  if ($("dialog").open) $("dialog").close();
  return generation;
}
function announce(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.add("visible");
  toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 4500);
}
async function api(path, data) {
  const response = await fetch(
    "/api/" + path,
    data === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
  );
  if (!response.ok) {
    const failure = await response.json().catch(() => ({}));
    const error = new Error(failure.error || "Lost contact with the dive.");
    error.status = response.status;
    throw error;
  }
  return response.json();
}
function dateLabel(day) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(day + "T12:00:00"));
}
function diveNo(day) {
  const start = Date.UTC(Number(day.slice(0, 4)), 0, 1);
  return Math.round((Date.parse(day + "T00:00:00Z") - start) / 86400000) + 1;
}
function syncPrefs() {
  audio.setEnabled(sound);
  $("sound").innerHTML = icon(sound ? "sound" : "mute", 19);
  $("sound").setAttribute("aria-pressed", String(sound));
  $("sound").setAttribute(
    "aria-label",
    sound ? "Turn sound off" : "Turn sound on",
  );
  $("sound").title = sound ? "Turn sound off" : "Turn sound on";
  document.body.classList.toggle("no-crt", !scanlines);
}
function toggleSound() {
  sound = !sound;
  savePref("krillion-sound", sound ? "on" : "off");
  syncPrefs();
  audio.unlock();
  audio.play("echo");
}
function readout(depth, score) {
  const metres = Math.round(depth);
  const points = Math.round(score);
  if (displayedDepth !== metres) $("depth").textContent = `${fmt(metres)}m`;
  if (displayedScore !== points) $("score").textContent = fmt(points);
  displayedDepth = metres;
  displayedScore = points;
}
function moveReadout(depth, score, duration = 0) {
  cancelAnimationFrame(counterFrame);
  const from = displayedDepth,
    fromScore = displayedScore,
    start = performance.now();
  if (!duration || motion.matches || (from === depth && fromScore === score))
    return readout(depth, score);
  function frame(time) {
    const t = Math.max(0, Math.min(1, (time - start) / duration));
    const eased = t * t * (3 - 2 * t);
    readout(
      from + (depth - from) * eased,
      fromScore + (score - fromScore) * eased,
    );
    if (t < 1) counterFrame = requestAnimationFrame(frame);
  }
  counterFrame = requestAnimationFrame(frame);
}
function lights(completed, active) {
  $("lights").innerHTML = Array.from({ length: 7 }, (_, i) => {
    const result = completed[i];
    const kind = result
      ? result.tier == null
        ? "miss"
        : "t" + result.tier
      : i === active
        ? "on"
        : "";
    return `<i class="${kind}"></i>`;
  }).join("");
  $("round-count").textContent =
    completed.length === 7
      ? "Dive complete"
      : `Prompt ${Math.min(7, active + 1)} of 7`;
}
function wordmark() {
  return `<h1 class="wordmark" aria-label="Wibe Coded Krillion"><span class="maker" aria-hidden="true">Wibe Coded</span><span class="title-letters" aria-hidden="true">${Array.from("KRILLION", (c, i) => `<span style="--letter:${i}">${c}</span>`).join("")}</span></h1>`;
}
function paintSurface() {
  setStage("surface");
  if (!screen.querySelector(".title-group"))
    screen.innerHTML = `<div class="title-group">${wordmark()}<h2></h2><p>7 prompts · 25 seconds each · rarer answers sink deeper</p></div>`;
  screen.querySelector(".title-group h2").textContent =
    mode === "daily" ? "The daily dive" : "The endless dive";
  dock.innerHTML = `<div class="launch-dock">
    <button class="manual-link" data-dialog="help">▸ How to play</button>
    <div class="launch-actions">
      <button class="arcade-button launch-button" data-start><span aria-hidden="true">▼</span> <span data-start-label></span></button>
      <button class="arcade-button launch-button new-game-button" data-new-game>New game</button>
    </div>
    <div class="launch-links"><span data-dive-label></span>
    <button class="tab-button" data-dialog="log">Dive log ⟲</button>
    <button class="tab-button bright" data-mode="${mode === "daily" ? "free" : "daily"}">${mode === "daily" ? "Unlimited ∞" : "Daily dive"}</button></div>
    </div>`;
  updateLaunchControls();
}
function updateLaunchControls() {
  const saved = status?.[mode];
  const start = dock.querySelector("[data-start]");
  start.hidden = mode === "free" && !saved;
  start.disabled = !status;
  start.querySelector("[data-start-label]").textContent = saved?.completed
    ? "Dive results"
    : saved
      ? "Resume descent"
      : "Begin descent";
  dock.querySelector("[data-dive-label]").textContent =
    mode === "free"
      ? "Endless dive"
      : status
        ? "Dive #" + diveNo(status.day)
        : "Daily dive";
}
async function surface(selected = mode) {
  const ticket = resetView();
  mode = selected;
  run = null;
  ocean.update({
    scene: "surface",
    depth: 0,
    duration: motion.matches ? 0 : 1100,
  });
  moveReadout(0, 0);
  paintSurface();
  try {
    const fresh = await api("status");
    if (ticket !== generation) return;
    status = fresh;
    updateLaunchControls();
  } catch {
    if (ticket === generation)
      dock.innerHTML =
        '<div class="launch-dock"><p class="notice">Couldn’t reach the local server.</p><button class="arcade-button" data-home>Reconnect</button></div>';
  }
}
async function openDive(request) {
  if (stage === "loading" && !request.id) return;
  const ticket = resetView();
  busy = true;
  audio.unlock();
  setStage("loading");
  screen.replaceChildren();
  const fresh = Boolean(request.requestId);
  if (fresh) ocean.update({ scene: "surface", depth: 0, duration: 0 });
  let message = "Opening your dive…";
  if (fresh && (status || request.fieldGuide)) {
    message =
      status?.configured && !request.fieldGuide
        ? "Generating seven prompts…"
        : "Preparing a field-guide game…";
  }
  dock.innerHTML = `<div class="preparing"><span class="small-swimmer">${specimen(6)}</span><span role="status">${message}</span></div>`;
  try {
    const data = request.id
      ? await api("dives/" + encodeURIComponent(request.id))
      : await api("dives", request);
    if (ticket !== generation) return;
    run = data;
    mode = run.mode;
    draft = "";
    busy = false;
    if (run.phase === "finished" || (run.completed && !request.resume))
      return report();
    if (run.notice) announce(run.notice);
    else if (fresh)
      announce(run.source === "ai" ? "New AI game" : "New field-guide game");
    if (run.phase === "result") return showResult(true);
    audio.play("launch");
    round(!request.id && data.opened > data.serverTime);
  } catch (e) {
    if (ticket !== generation) return;
    busy = false;
    setStage("launch-error");
    const allowGuide = fresh && !request.fieldGuide && e.status === 503;
    dock.innerHTML = `<div class="launch-dock launch-error">
      <p class="notice" role="alert">${escape(e.status ? e.message : "Couldn’t reach the game. Check your connection and retry.")}</p>
      <div class="launch-actions"><button class="arcade-button" data-retry>Retry</button>
      ${allowGuide ? '<button class="arcade-button" data-field-guide>Play field guide</button>' : ""}</div>
      <button class="manual-link" data-home>Back to surface</button></div>`;
    const retry = dock.querySelector("[data-retry]");
    retry.addEventListener("click", () => openDive(request), { once: true });
    dock
      .querySelector("[data-field-guide]")
      ?.addEventListener(
        "click",
        () => openDive({ ...request, fieldGuide: true }),
        { once: true },
      );
    retry.focus({ preventScroll: true });
  }
}
function setClock() {
  const time = performance.now();
  endAt = time + run.deadline - run.serverTime;
  openAt = time + run.opened - run.serverTime;
}
function clock() {
  if (busy || stage !== "round") return;
  const now = performance.now(),
    remaining = run.paused ? run.remainingMs : endAt - now;
  const countdown = Math.ceil((openAt - now) / 1000);
  if (countdown > 0 && !run.paused) {
    $("countdown").textContent = String(countdown);
    return;
  }
  if (!previewOpen) {
    previewOpen = true;
    $("count-in").hidden = true;
    $("answer-area").hidden = false;
    if (!$("dialog").open && matchMedia("(pointer:fine)").matches)
      $("answer").focus({ preventScroll: true });
  }
  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  $("seconds").textContent = run.paused ? "Ⅱ" : String(seconds);
  $("dial").classList.toggle("warning", seconds <= 5 && !run.paused);
  $("answer-area").style.setProperty(
    "--time",
    String(Math.max(0, Math.min(1, remaining / 25000))),
  );
  $("submit").disabled = !draft.trim();
  if (seconds > 0 && seconds <= 5 && seconds !== lastSecond && !run.paused)
    audio.play("tick");
  lastSecond = seconds;
  if (!run.paused && seconds === 0) act("timeout");
}
function round(entering, feedback = "") {
  clearInterval(timer);
  setStage("round");
  setClock();
  previewOpen = false;
  lastSecond = undefined;
  ocean.update({
    scene: "playing",
    depth: run.points * 10,
    duration: entering && !motion.matches ? 2100 : 0,
  });
  moveReadout(run.points * 10, run.points);
  lights(run.results, run.results.length);
  screen.innerHTML = `<article class="question ${entering ? "arrive" : ""}" aria-labelledby="prompt">
    <div class="prompt-label">Prompt ${run.round} of 7</div>
    <h2 id="prompt">${escape(run.question.prompt)}</h2><div class="question-hint">▼ rarer answers sink deeper ▼</div>
    </article>`;
  dock.innerHTML = `<div class="count-in" id="count-in" role="status">descending · the clock starts in <b id="countdown">3</b></div>
    <div id="answer-area" class="answer-area" hidden>
    <p role="status" class="answer-note" id="answer-note">${escape(feedback || (run.paused ? "Clock paused. Retry your answer or pass from the menu." : ""))}</p>
    <form id="answer-form" class="answer-form"><div id="dial" class="dial" aria-label="Seconds remaining"><span id="seconds">25</span></div>
    <div class="answer-track"><input id="answer" aria-label="Your answer" aria-describedby="answer-note" placeholder="type one answer…" value="${escape(draft)}" maxlength="100" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <button id="submit" class="dive-key" type="submit" disabled>${run.paused ? "Retry" : "Dive"}</button></form></div>`;
  $("answer").addEventListener("input", (e) => {
    draft = e.target.value;
    $("submit").disabled = !draft.trim() || busy;
  });
  $("answer-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (draft.trim()) act("answer");
  });
  if (feedback) $("answer-area").classList.add("no-echo");
  clock();
  timer = setInterval(clock, 80);
}
function refreshRound(previous, feedback = "") {
  if (stage !== "round" || previous.round !== run.round || !$("answer"))
    return round(false, feedback);
  setClock();
  $("answer-note").textContent = feedback;
  $("answer").readOnly = false;
  $("submit").textContent = run.paused ? "Retry" : "Dive";
  $("answer-area").classList.toggle("no-echo", Boolean(feedback));
  clock();
}
async function drop(previous) {
  clearInterval(timer);
  setStage("drop");
  const ticket = generation,
    result = run.results.at(-1);
  dock.replaceChildren();
  const card = screen.querySelector(".question");
  if (card) {
    // A pass can interrupt the entrance. Leave from the currently painted pose.
    const pose = getComputedStyle(card);
    card.style.setProperty("--exit-from", pose.transform);
    card.style.setProperty("--exit-opacity", pose.opacity);
    card.classList.add("sinking");
  }
  lights(previous.results, previous.results.length);
  movement = new AbortController();
  const signal = movement.signal;
  audio.play(result.tier == null ? "miss" : "echo", result.tier);
  await animateDrop({
    layer: $("fx"),
    result,
    signal,
    reducedMotion: motion.matches,
    onTravel(duration) {
      if (signal.aborted) return;
      ocean.update({ scene: "descent", depth: run.points * 10, duration });
      moveReadout(run.points * 10, previous.points, duration);
    },
  });
  if (signal.aborted || ticket !== generation) return;
  busy = false;
  audio.play("score", result.tier);
  showResult(false);
}
function showResult(instant) {
  clearInterval(timer);
  setStage("result");
  const r = run.results.at(-1),
    scored = r.tier != null;
  ocean.update({ scene: "descent", depth: run.points * 10, duration: 0 });
  moveReadout(run.points * 10, run.points, instant ? 0 : 650);
  lights(run.results, run.round - 1);
  const name = scored
    ? tiers[r.tier].name
    : r.outcome === "timeout"
      ? "Time’s up"
      : "No catch";
  screen.innerHTML = `<article class="catch-reveal ${scored ? "t" + r.tier : "miss"}" aria-label="Round result">
    <div class="catch-icon">${scored ? specimen(r.tier) : '<span aria-hidden="true">· · ·</span>'}</div>
    <h2>${escape(name)}</h2>${scored ? `<p class="catch-answer">“${escape(r.answer)}”</p>` : ""}
    <p class="catch-gain"><b>+${r.points} pts</b> · sink ${fmt(r.points * 10)}m</p>
    <p class="catch-note">${scored ? tiers[r.tier].note : r.outcome === "timeout" ? "The clock ran out." : "You let this one drift by."}</p>
    </article>`;
  dock.innerHTML = `<button class="arcade-button descend-button" data-next>${run.round === 7 ? "Surface ▲" : "Descend ▼"}</button>`;
  dock.querySelector("button").focus({ preventScroll: true });
}
function waitForAscent(duration, signal) {
  return new Promise((resolve) => {
    const timer = setTimeout(finish, duration);
    function finish() {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    }
    signal.addEventListener("abort", finish, { once: true });
  });
}
async function ascend() {
  const ticket = generation;
  setStage("ascent");
  const duration = motion.matches ? 0 : Math.min(6500, 2150 + run.points * 5);
  movement = new AbortController();
  screen.innerHTML = '<div class="ascent-title" role="status">Surfacing…</div>';
  dock.replaceChildren();
  audio.play("surface");
  ocean.update({ scene: "surface", depth: 0, duration });
  moveReadout(0, run.points, duration);
  await waitForAscent(duration, movement.signal);
  if (ticket === generation) {
    busy = false;
    report();
  }
}
async function act(action) {
  if (busy || !run) return;
  busy = true;
  audio.unlock();
  const ticket = generation,
    previous = run;
  if (action === "answer") {
    $("answer-area").classList.remove("no-echo");
    $("answer").readOnly = true;
    $("submit").disabled = true;
    $("answer-note").textContent = "Listening for an echo…";
    $("seconds").textContent = "··";
  }
  if (action === "next") {
    const b = dock.querySelector("button");
    if (b) b.disabled = true;
  }
  try {
    const data = await api("dives/" + run.id, {
      action,
      round: run.round,
      ...(action === "answer" ? { answer: draft.trim() } : {}),
    });
    if (ticket !== generation) return;
    run = data;
    if (run.phase === "finished") return await ascend();
    if (run.phase === "result" && previous.phase === "round") {
      draft = "";
      return await drop(previous);
    }
    busy = false;
    if (run.phase === "result") return showResult(true);
    if (action === "next") {
      draft = "";
      audio.play("launch");
      return round(true);
    }
    if (run.feedback) audio.play("miss");
    refreshRound(previous, run.feedback);
    if (run.feedback && !$("dialog").open) {
      $("answer").focus({ preventScroll: true });
      $("answer").select();
    }
  } catch (e) {
    if (ticket !== generation) return;
    try {
      const data = await api("dives/" + previous.id);
      if (ticket !== generation) return;
      run = data;
      busy = false;
      if (run.phase === "round") refreshRound(previous, e.message);
      else if (run.phase === "finished") report();
      else showResult(true);
      announce(e.message);
    } catch {
      if (ticket !== generation) return;
      clearInterval(timer);
      busy = false;
      dock.innerHTML = `<p class="notice">Contact lost. Your dive is saved.</p><button class="arcade-button" data-run="${escape(previous.id)}" data-resume>Reconnect</button>`;
    }
  }
}
function report() {
  stopMotion();
  setStage("report");
  ocean.update({ scene: "surface", depth: 0, duration: 0 });
  screen.innerHTML = diveReport(run);
  screen.scrollTop = 0;
  dock.replaceChildren();
}
async function copyScore() {
  const tiles = ["🫧", "🪝", "🐟", "🦑", "🐠", "🦐"];
  const msg = `Wibe Coded Krillion · ${run.mode === "daily" ? "Daily dive" : "Endless dive"} · ${dateLabel(run.day)}\n${run.results.map((r) => (r.tier == null ? "⬛" : tiles[r.tier])).join("")}\n${fmt(run.points * 10)} m / 7,000 m`;
  try {
    await navigator.clipboard.writeText(msg);
    announce("Dive result copied.");
  } catch {
    openDialog(
      "Copy result",
      `<textarea class="share-text" readonly>${escape(msg)}</textarea>`,
    );
    $("dialog-content").querySelector("textarea").select();
  }
}
function openDialog(title, html) {
  if (!$("dialog").open) modalOrigin = document.activeElement;
  $("dialog-title").textContent = title;
  $("dialog-content").innerHTML = html;
  if (!$("dialog").open) $("dialog").showModal();
}
async function dialog(name) {
  if (name === "menu") {
    openDialog(
      "Menu",
      `<div class="menu-list"><button class="menu-new" data-new-game ${stage === "loading" ? "disabled" : ""}>New game</button><button data-mode="daily">Daily dive</button><button data-mode="free">Unlimited ∞</button><button data-dialog="log">Dive log ⟲</button><button data-dialog="help">How to play</button><button data-dialog="settings">Settings</button>
      ${stage === "round" && !busy ? "<button data-pass>Pass this prompt</button>" : ""}</div>`,
    );
  } else if (name === "settings") {
    openDialog(
      "Settings",
      `<div class="settings-row"><span>Sound</span><button class="tab-button" data-sound aria-pressed="${sound}">${sound ? "On" : "Off"}</button></div>
      <div class="settings-row"><span>CRT scanlines</span><button class="tab-button" data-crt aria-pressed="${scanlines}">${scanlines ? "On" : "Off"}</button></div>`,
    );
  } else if (name === "help") {
    openDialog(
      "How to play",
      `<p>Each dive has seven prompts. You get three seconds to read, then 25 seconds to name one example. Enter or <b>Dive</b> sends your answer.</p>
      <p>Unusual answers sink farther. Each point takes you ten metres deeper. One hidden gem per prompt is worth 100 points.</p>
      <ul class="rarity-list">${tiers.map(({ name, points }, i) => `<li><span>${specimen(i)}</span><strong class="t${i}">${name}</strong><small>${points} pts</small></li>`).join("")}</ul>
      <details class="scoring-help"><summary>How does the judge work?</summary><p>Field-guide questions use curated answers and aliases. For AI dives, Terra picks each prompt and gem in advance. Decisions estimates rarity and checks whether a guess fits. The clock pauses while it checks; a miss leaves you time to try again.</p></details>`,
    );
  } else if (name === "log") {
    openDialog("Dive log", "<p>Opening the log…</p>");
    try {
      const fresh = await api("status");
      if (!$("dialog").open || $("dialog-title").textContent !== "Dive log")
        return;
      status = fresh;
      const history = (rows, heading, canResume) => {
        if (!rows.length) return "";
        return `<h3 class="history-heading">${heading}</h3><ul class="history">${rows
          .map(
            (r) => `
          <li><button data-run="${escape(r.id)}" ${canResume ? "data-resume" : ""}>
          <span>${r.mode === "daily" ? "Daily dive" : "Unlimited dive" + (r.number ? " #" + Number(r.number) : "")}<small>${escape(dateLabel(r.day))}${canResume ? " · Prompt " + r.round + " of 7" : ""}</small></span>
          <b>${fmt(r.points * 10)}m${canResume ? "<small>Resume</small>" : ""}</b></button></li>`,
          )
          .join("")}</ul>`;
      };
      const logs =
        history(fresh.unfinished ?? [], "In progress", true) +
        history(fresh.log, "Completed", false);
      openDialog(
        "Dive log",
        logs || "<p>Your first dive will appear here.</p>",
      );
    } catch (e) {
      if ($("dialog").open && $("dialog-title").textContent === "Dive log")
        openDialog(
          "Dive log",
          `<p>Couldn’t open the log.</p><button class="tab-button" data-dialog="log">Retry</button>`,
        );
    }
  }
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b || b.disabled) return;
  audio.unlock();
  if (b.id === "close") return $("dialog").close();
  if (b.id === "menu") return dialog("menu");
  if (b.id === "settings") return dialog("settings");
  if (b.id === "sound" || b.hasAttribute("data-sound")) {
    toggleSound();
    if ($("dialog").open) dialog("settings");
    return;
  }
  if (b.hasAttribute("data-crt")) {
    scanlines = !scanlines;
    savePref("krillion-crt", scanlines ? "on" : "off");
    syncPrefs();
    return dialog("settings");
  }
  if (b.dataset.dialog) return dialog(b.dataset.dialog);
  if (b.dataset.mode) return surface(b.dataset.mode);
  if (b.dataset.run)
    return openDive({
      id: b.dataset.run,
      resume: b.hasAttribute("data-resume"),
    });
  if (b.hasAttribute("data-home")) return surface();
  if (b.hasAttribute("data-start")) return openDive({ mode });
  if (b.hasAttribute("data-new-game") && stage !== "loading")
    return openDive({ mode: "free", requestId: crypto.randomUUID() });
  if (b.hasAttribute("data-next")) return act("next");
  if (b.hasAttribute("data-pass")) {
    $("dialog").close();
    return act("pass");
  }
  if (b.hasAttribute("data-copy")) return copyScore();
});
$("dialog").addEventListener("close", () => {
  if (modalOrigin?.isConnected) modalOrigin.focus({ preventScroll: true });
});
$("dialog").addEventListener("click", (e) => {
  if (e.target !== $("dialog")) return;
  const r = $("dialog").getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    $("dialog").close();
});
function keyboardInset() {
  const v = window.visualViewport;
  if (v)
    document.documentElement.style.setProperty(
      "--keyboard",
      Math.max(0, window.innerHeight - v.height - v.offsetTop) + "px",
    );
}
window.visualViewport?.addEventListener("resize", keyboardInset);
window.visualViewport?.addEventListener("scroll", keyboardInset);
window.addEventListener("pagehide", () => {
  stopMotion();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) surface();
});
syncPrefs();
surface();
