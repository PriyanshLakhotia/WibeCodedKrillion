import { randomUUID, createHash } from "node:crypto";
import { bank, offlineGrade } from "./bank.mjs";
import { generateQuestions, gradeAnswer } from "./openai.mjs";

export const points = [10, 15, 30, 60, 85, 100];
const previewMs = 3000;
const answerMs = 25000;
const dayOf = (time) => {
  const date = new Date(time);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export class GameError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const requestUuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function starterDeck(seed, history = []) {
  const lastSeen = new Map();
  history.forEach((deck, index) => {
    for (const question of deck.questions) lastSeen.set(question.id, index);
  });
  const available = bank.map((question) => ({
    question,
    lastSeen: lastSeen.get(question.id) ?? -1,
    shuffle: createHash("sha256")
      .update(seed + "/" + question.id)
      .digest("hex"),
  }));
  const picked = [];
  const categories = new Set();
  while (picked.length < 7) {
    // Exhaust unseen prompts first, then choose the oldest. Vary topics within each group.
    available.sort(
      (a, b) =>
        a.lastSeen - b.lastSeen ||
        Number(categories.has(a.question.category)) -
          Number(categories.has(b.question.category)) ||
        a.shuffle.localeCompare(b.shuffle),
    );
    const { question } = available.shift();
    picked.push(question);
    categories.add(question.category);
  }
  return picked;
}

function generationFailure(error) {
  if (error.status === 401 || error.status === 403)
    return "OpenAI could not authorize generation. Check the server key and model access.";
  if (error.status === 429)
    return "OpenAI reached a rate or usage limit. Check your project limits or try again later.";
  return "The new AI game couldn’t be generated. Retry or play a field-guide game.";
}

export function createGame({
  db,
  key,
  model,
  generate = generateQuestions,
  grade = gradeAnswer,
  now = Date.now,
}) {
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY, data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS dives (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS player_dives ON dives(owner);
    CREATE TABLE IF NOT EXISTS grades (id TEXT PRIMARY KEY, data TEXT NOT NULL);
  `);
  const pending = new Map();
  const creating = new Map();
  const starting = new Map();
  const playerStarts = new Map();
  const judging = new Map();
  const readDeck = (id) =>
    JSON.parse(db.prepare("SELECT data FROM decks WHERE id=?").get(id).data);
  const getDives = (owner) =>
    db
      .prepare("SELECT data FROM dives WHERE owner=? ORDER BY rowid DESC")
      .all(owner)
      .map((row) => JSON.parse(row.data));
  const save = (run) =>
    db
      .prepare(
        "INSERT INTO dives VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(run.id, run.owner, JSON.stringify(run));

  function getRun(owner, id) {
    const row = db
      .prepare("SELECT data FROM dives WHERE owner=? AND id=?")
      .get(owner, id);
    if (!row) throw new GameError(404, "This dive could not be found.");
    return JSON.parse(row.data);
  }

  function once(map, id, action) {
    if (!map.has(id))
      map.set(
        id,
        Promise.resolve()
          .then(action)
          .finally(() => map.delete(id)),
      );
    return map.get(id);
  }

  // Sequence different starts by the same player so a new authoring request sees
  // the preceding deck, even if the player opened two games in separate tabs.
  function inStartOrder(owner, operation) {
    const prior = playerStarts.get(owner) ?? Promise.resolve();
    const current = prior.then(operation, operation);
    playerStarts.set(owner, current);
    return current.finally(() => {
      if (playerStarts.get(owner) === current) playerStarts.delete(owner);
    });
  }

  function recentDecks(owner) {
    const rows = owner
      ? db
          .prepare(
            `SELECT d.data FROM dives r
          JOIN decks d ON d.id = json_extract(r.data, '$.deckId')
          WHERE r.owner = ? ORDER BY r.rowid DESC LIMIT 12`,
          )
          .all(owner)
      : db.prepare("SELECT data FROM decks ORDER BY rowid DESC LIMIT 5").all();
    return rows.reverse().map((row) => JSON.parse(row.data));
  }

  async function getDeck(id, owner, explicit, fieldGuide) {
    return once(creating, id, async () => {
      const existing = db.prepare("SELECT data FROM decks WHERE id=?").get(id);
      if (existing) return JSON.parse(existing.data);
      const history = recentDecks(owner);
      let questions,
        source = "guide",
        notice = "";
      if (key && !fieldGuide) {
        const avoid = [
          ...new Set(
            history.flatMap((deck) => deck.questions.map((q) => q.prompt)),
          ),
        ];
        try {
          questions = await generate({ key, model, avoid });
          source = "ai";
        } catch (error) {
          if (explicit) throw new GameError(503, generationFailure(error));
          notice =
            "Live question generation is unavailable. This dive uses the field guide.";
        }
      }
      const deck = {
        questions: questions ?? starterDeck(id, owner ? history : []),
        source,
        notice,
      };
      db.prepare("INSERT INTO decks VALUES (?, ?)").run(
        id,
        JSON.stringify(deck),
      );
      return deck;
    });
  }

  function judge(deckId, question, answer) {
    // Preserve accents and punctuation: changing them can change the answer itself.
    const spelling = answer
      .normalize("NFC")
      .toLowerCase()
      .replace(/\s+/gu, " ");
    const cacheId = JSON.stringify([deckId, question.id, spelling]);
    return once(judging, cacheId, async () => {
      const cached = db
        .prepare("SELECT data FROM grades WHERE id=?")
        .get(cacheId);
      if (cached) return JSON.parse(cached.data);
      let result;
      try {
        result = await grade({ key, question, answer });
      } catch {
        throw new GameError(
          503,
          "The judge is unavailable. Your clock is paused. Retry your answer or pass.",
        );
      }
      db.prepare("INSERT INTO grades VALUES (?, ?)").run(
        cacheId,
        JSON.stringify(result),
      );
      return result;
    });
  }

  function record(run, question, outcome, tier, answer) {
    run.results.push({
      prompt: question.prompt,
      category: question.category,
      gem: question.gem,
      outcome,
      tier,
      answer,
      points: points[tier] ?? 0,
    });
    run.phase = "result";
    run.pausedMs = null;
    if (run.results.length === 7) run.completed = now();
    save(run);
  }

  function summary(run) {
    return {
      id: run.id,
      mode: run.mode,
      day: run.day,
      number: run.number ?? null,
      completed: run.completed,
      round: Math.min(7, run.results.length + (run.phase === "result" ? 0 : 1)),
      points: run.results.reduce((sum, r) => sum + r.points, 0),
    };
  }

  function view(run) {
    const deck = readDeck(run.deckId);
    const time = now();
    const question = deck.questions[run.results.length];
    if (
      run.phase === "round" &&
      run.pausedMs == null &&
      time >= run.deadline &&
      !pending.has(run.id)
    ) {
      record(run, question, "timeout", null, "");
    }
    return {
      ...summary(run),
      phase: run.phase,
      source: deck.source,
      notice: deck.notice,
      results: run.results,
      question:
        run.phase === "round"
          ? { category: question.category, prompt: question.prompt }
          : null,
      opened: run.opened,
      deadline: run.deadline,
      paused: run.pausedMs != null,
      remainingMs: run.pausedMs,
      serverTime: time,
    };
  }

  function beginRound(run) {
    run.phase = "round";
    run.opened = now() + previewMs;
    run.deadline = run.opened + answerMs;
    run.pausedMs = null;
    save(run);
    return view(run);
  }

  return {
    status(owner) {
      const day = dayOf(now());
      const dives = getDives(owner);
      const daily = dives.find(
        (run) => run.mode === "daily" && run.day === day,
      );
      const free = dives.find((run) => run.mode === "free" && !run.completed);
      return {
        day,
        configured: Boolean(key),
        daily: daily ? summary(daily) : null,
        free: free ? summary(free) : null,
        unfinished: dives.filter((run) => !run.completed).map(summary),
        log: dives
          .filter((run) => run.completed)
          .sort((a, b) => b.completed - a.completed)
          .map(summary),
      };
    },
    start(owner, mode, requestId, fieldGuide = false) {
      if (!["daily", "free"].includes(mode))
        throw new GameError(400, "Choose a dive mode.");
      const fresh = requestId !== undefined;
      if (
        fresh &&
        (mode !== "free" ||
          typeof requestId !== "string" ||
          !requestUuid.test(requestId))
      )
        throw new GameError(
          400,
          "A new game needs a valid free-game request ID.",
        );
      if (typeof fieldGuide !== "boolean" || (fieldGuide && !fresh))
        throw new GameError(
          400,
          "Choose the field guide when starting a new game.",
        );

      const day = dayOf(now());
      const token = fresh ? requestId.toLowerCase() : null;
      const intent = JSON.stringify([
        owner,
        mode,
        token ?? (mode === "daily" ? day : "resume"),
        fieldGuide,
      ]);
      return once(starting, intent, () =>
        inStartOrder(owner, async () => {
          const dives = getDives(owner);
          const existing = fresh
            ? dives.find((run) => run.requestId === token)
            : dives.find(
                (run) =>
                  run.mode === mode &&
                  (mode === "daily" ? run.day === day : !run.completed),
              );
          if (existing) return view(existing);
          const id = randomUUID();
          const deckId =
            mode === "daily"
              ? "daily/" + day
              : fresh
                ? "free/" + owner + "/" + token
                : id;
          await getDeck(
            deckId,
            mode === "free" ? owner : null,
            fresh,
            fieldGuide,
          );
          return beginRound({
            id,
            owner,
            mode,
            day,
            deckId,
            requestId: token,
            number:
              mode === "free"
                ? 1 + dives.filter((run) => run.mode === "free").length
                : null,
            results: [],
            completed: null,
          });
        }),
      );
    },
    read(owner, id) {
      return view(getRun(owner, id));
    },
    async act(owner, id, { action, answer, round }) {
      const run = getRun(owner, id);
      if (pending.has(id))
        throw new GameError(409, "An answer is being checked.");
      if (!["answer", "pass", "timeout", "next"].includes(action))
        throw new GameError(400, "Unknown dive action.");
      const state = view(run);
      if (round !== state.round || run.phase === "finished") return state;
      if (run.phase === "result") {
        if (action !== "next") return state;
        if (run.completed) {
          run.phase = "finished";
          save(run);
          return view(run);
        }
        return beginRound(run);
      }
      if (action === "next" || action === "timeout") return state;
      const question = readDeck(run.deckId).questions[run.results.length];
      if (action === "pass") {
        record(run, question, "passed", null, "");
        return view(run);
      }
      if (now() < run.opened)
        throw new GameError(409, "The answer window opens in a moment.");
      if (
        typeof answer !== "string" ||
        !answer.trim() ||
        answer.length > 100 ||
        /[\u0000-\u001f]/u.test(answer)
      )
        throw new GameError(400, "Enter one answer of up to 100 characters.");
      const submitted = answer.trim();
      const remaining = run.pausedMs ?? Math.max(0, run.deadline - now());
      run.pausedMs = remaining;
      save(run);
      const deck = readDeck(run.deckId);
      return once(pending, id, async () => {
        const result =
          deck.source === "guide"
            ? offlineGrade(question.id, submitted)
            : await judge(run.deckId, question, submitted);
        if (result?.tier == null) {
          run.pausedMs = null;
          run.deadline = now() + remaining;
          save(run);
          return {
            ...view(run),
            feedback:
              deck.source === "guide"
                ? "No match in the field guide. Try another answer."
                : "That answer didn’t fit the prompt. Try another.",
          };
        }
        record(
          run,
          question,
          "scored",
          result.tier,
          result.canonical || submitted,
        );
        return view(run);
      });
    },
  };
}
