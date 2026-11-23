# Wibe Coded Krillion

A local rare-answer game inspired by [Krillion](https://krillion.io/). Give an unexpected, valid example for each of seven prompts. Each point carries your answer another ten metres below the boat. A perfect dive reaches 7,000 m.

## Play locally

Use Node.js 22.13 or newer. From this folder, run `npm start` and open [the game](http://127.0.0.1:4317). It runs with Node’s built-in modules.

Choose **New game** on the title screen, in the menu, or after a dive to start a fresh seven-prompt game. Open **Dive log** to resume an earlier dive or revisit a completed one. Choose **Begin descent** on the daily title screen to play the day’s shared set.

After a three-second preview, you have 25 seconds to type an answer and press Enter. An unrecognized answer lets you try again while time remains. Open the menu and choose **Pass this prompt** to move on.

The local server saves progress in `.data/dives.sqlite`. Your browser’s local owner cookie identifies your log. Reopen the same address and browser profile to resume. The daily set changes at midnight in the server’s time zone.

## Add OpenAI later

The built-in field guide works immediately. Each prompt in the guide has a curated set of accepted answers, aliases and rarity tiers.

To enable AI, set `OPENAI_API_KEY` in this folder’s `.env` and restart the server. If the file is missing, copy `.env.example` to `.env` first. You can also supply the key through the server process’s environment. The project ignores `.env` and `.data/`.

- **Questions.** With a key configured, **New game** asks `gpt-6.1-terra` for seven prompts, each with a private grading rubric and a preselected gem. The generator receives recent prompts from your dives to help it avoid repeats. If generation fails, choose **Retry** or **Play field guide**. Without a key, new games rotate through the built-in prompts. You can set `OPENAI_QUESTION_MODEL` to another compatible model. [Responses API](https://developers.openai.com/api/docs/guides/structured-outputs/)
- **Answer judging.** The [Decisions API](https://developers.openai.com/api/docs/guides/decisions) calls `gpt-6-luna` once per uncached submission for a validity check, a gem-equivalence check, a predictable trick-answer check, and an ordered rarity estimate. An exact gem match earns 100 points locally. Decisions can also recognize an alias for the same gem. The model estimates what casual English-speaking players would think of. The resulting tier is an estimate, independent of actual submission counts.
- **Consistent scoring.** The server caches judgments per question, ignoring case and extra whitespace, and combines simultaneous requests for the same answer. The clock pauses during judging. If the API is unavailable, you can retry or pass. AI rounds send the prompt, rubric, gem and submitted answer to OpenAI. The API key stays on the server.

### How a new AI answer is scored

One Decisions request asks four questions about the same submission. The server applies the results in this order.

| Decision | Game rule |
| --- | --- |
| Valid example | A probability below 0.70 invites another guess with the remaining time. |
| Same example as the hidden gem | A probability of 0.95 or greater earns 100 points. |
| Predictable trick answer | A probability of 0.80 or greater earns the Too Clever tier and 15 points. |
| Ordinary rarity | The model ranks the concept on four ordered levels. The server rounds its probability-weighted score to the nearest level, awarding 10, 30, 60, or 85 points. |

These thresholds are game-design choices. The rarity estimate describes how readily a casual English-speaking player might volunteer that concept. Misspellings and extra adjectives should preserve the underlying answer’s rarity. Changing the rubric later will affect newly judged answers. Existing grades and completed dives are stored locally.

Run `npm test` for the automated checks. Set `PORT` to change the local port or `KRILLION_DATA_DIR` to choose a separate data directory.
