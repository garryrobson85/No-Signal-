# No Signal

Survivor-style reality sim, single-player browser game. Runs entirely client-side on GitHub Pages — no build step, no server.

Live: `garryrobson85.github.io/No-Signal-`

---

## Architecture

Plain JS, classic scripts. 14 JS files loaded in dependency order by `index.html`:

```
data.js          // constants, dialogue banks, archetypes
state.js         // G (game state), utilities, escapeHtml, notify, rng
portraits.js     // SVG portrait generation, custom image upload
memory.js        // persistent memory events (betrayals, alliances, idol plays)
evolution.js     // archetype evolution rules
engine.js        // episode engine — voting, challenges, idols, finale
ui.js            // all DOM rendering — stages, vote reveal, sidebar
features.js      // relationship web, history, profiles, exports
save.js          // save / load / migrate, with full episodeLog round-trip
producer.js      // producer mode powers
script_gen.js    // episode scripts and season recap
story.js         // season story analysis (villain / hero / underdog detection)
ai.js            // Gemini integration, prompt builder, post-processor
main.js          // event delegation (data-action) and keyboard shortcuts
```

All files share global script scope. Functions and `var` declarations in any file are usable from any other file. `const` and `let` at the top level are also globally accessible (the multi-script lexical environment).

---

## State shape

```
G = {
  cast:[],              // Contestant[]
  teams:[],             // {id,name,color}[]
  settings:{},          // seed, name, theme, mergeEpisode, finaleSize, etc.
  twists:Set,           // active twist ids
  episode, merged, jury:[], dramaLevel,
  episodeLog:[],        // PERSISTED — every completed ep with confessionals, votes, AI text
  allianceLog:[],       // PERSISTED — alliance lifecycle events (formed/broken/forced)
  alliances:[],         // {id, members[], name, strength?}
  idolHolders:[], extraVoteHolders:[], stealVoteHolders:[],
  relationships:{},     // {`${idA}__${idB}`: 0-100}
  perceivedRelationships:{},  // for play mode — how players THINK others feel
  memories:[],          // capped at MEMORY_HARD_CAP (250)
  placementHistory:[],
  challengeWinStreaks:{}, producerPowers:{},
  currentEpData:{}, stageIndex,
  rngState,             // seeded RNG state — makes seasons reproducible
  fanSaveUsed, fanSavePlayer,
  playerContestantId:null,  // reserved for play mode
};
```

Contestant: `{id, name, archetype, personality, color, physical, mental, social, endurance, team, eliminated, elimEp, juryMember, winner, allianceIds[], challengeWins, customImage, immunity, archetypeHistory[]}`.

---

## Hard rules — do not break

- Unescaped `</div>` in JS template literals breaks the HTML parser → always write `<\/div>`.
- `responseMimeType:'application/json'` causes Gemini 400s → never set it.
- Deprecated Gemini models: `gemini-2.0-flash`, all `gemini-1.5-*`. Use `gemini-2.5-flash-lite` → `gemini-2.5-flash` → `gemini-2.5-flash-preview-04-17`.
- `thinkingBudget:0` required on every Gemini call to prevent cost blowout.
- Parchment vote tiles never change colour on flip.
- Tally only highlights the current leader — never pre-reveals the eliminated player.
- Sit-outs: `members[]` is reduced for challenge only. `allMembers[]` is always the vote pool.
- Idol expires at final 6: `getActive().length<=6`.
- Loyalty formula: `loyaltyRoll < allianceStr * 0.7 + 0.25`.
- Confessionals are filled AFTER the vote resolves, never before.
- Vote order is stored as `ep._renderedVoteOrder`.
- Rejoin episodes short-circuit `renderStage` — no challenge, no tribal.
- Team swap is blocked post-merge.
- `teamScores` is hoisted to outer scope in `runChallengeWithChoice`.
- All static buttons should use `data-action` in `index.html`, delegated in `main.js`'s switch. (Some legacy inline `onclick=` remain; convert as you touch them.)
- `SAVE_KEY = 'nosignal_save_v19'`. Gemini key is stored in `localStorage['nosignal_gemini_key']`.
- Use `seededRandom()` inside the engine — never raw `Math.random()` — to keep seasons reproducible.
- All free-text user input passes through `escapeHtml()` / `esc()` before flowing into innerHTML, OR is sanitized at the input boundary (see `updateContestant`, `updateTeamName`).

---

## Code style

- Code first, no preamble.
- Diffs for small changes; full file only when the rewrite is >40%.
- One full rewrite is preferred over many sequential edits.
- Ask at most one clarifying question. State assumptions inline and proceed.
- When given a snippet, work on the snippet — don't request the whole file unless context is genuinely needed.
- After any non-trivial bug fix or feature: add a one-line "lab notes" comment — what could have been faster, what to avoid next time.

---

## Cost-first AI architecture

- Always calculate and verify API costs before recommending any architecture.
- Two-stage filtering (cheap model, no web search first), prompt caching, minimal token counts.
- Never skip cost analysis.
- Pricing: Claude Sonnet $3/$15 per MTok, Haiku $1/$5 per MTok, web search adds $0.01/search + token costs.

---

## Preferred free tool stack

LLM → DeepSeek · Image gen → Nano Banana (Gemini) · Grammar → LanguageTool · TTS → VoiceBox · Video gen → Kling AI · Music → Lyria 3 · Design → Microsoft Designer · Video edit → CapCut · API → OpenRouter · Research → NotebookLM · App building → Google AI Studio · AI news → Sifu Yik

Only suggest paid alternatives (ChatGPT, Midjourney, ElevenLabs, Runway, Suno, Canva, Descript, Lovable, Notion AI, Grammarly, Grok) if the free stack genuinely can't handle the job.

---

## Local development

Open `index.html` directly in a browser, or serve the folder with any static server (`python3 -m http.server`). No build, no install. Edit any file, refresh.

To run a sanity check after edits:

```bash
for f in js/*.js; do node --check "$f"; done
```

This catches syntax errors before deploy. A fuller smoke test that loads all files into a shared `vm` context is in `tests/smoke.js` (if present).

---

## Recent fixes (post-audit)

Applied from the v4 architecture audit:

1. Module model switched from ES modules to classic scripts (removed all exports/imports, replaced single `<script type="module">` with 14 ordered tags). All cross-file refs now resolve.
2. `episodeLog`, `allianceLog`, `fanSaveUsed`, `fanSavePlayer` added to save payload and load restore. Season recap and story survive save/load.
3. `escapeHtml()` / `esc()` helpers added. Name fields sanitized on input in `updateContestant`, `updateTeamName`, and defensively on save import.
4. `try/catch` wrappers on `computeAndStartEpisode`, `runChallengeWithChoice`, `renderStage`. Render failures show a recovery panel (Save Now / Home) instead of a frozen screen.
5. All 9 `Math.random()` calls in engine.js replaced with `seededRandom()` — seasons are now reproducible from a seed.
6. Real `SAVE_MIGRATIONS` map in save.js (was a no-op stub). Defensive defaults for fields missing from legacy saves.
7. `MEMORY_HARD_CAP = 250` enforced in `recordMemory`, pruning by recency + intensity.
8. `AbortController` with 15s per-model timeout on Gemini calls. Last-working model cached in `localStorage` to skip dead 404s on next call.
9. Centralized `PROJECT_VERSION = 'no-signal-v4'` constant replaces hardcoded version strings.
10. `notify()` deduplicates identical adjacent messages so progress flows don't stack.
11. `allianceLog` actually populated now via `logAlliance(action, alliance, ep)` helper, called from `buildAlliances` (formed), the `new_alliance` twist (forced), and `confirmFractureAlliance` (broken).
