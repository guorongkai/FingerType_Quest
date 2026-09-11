# FingerType Quest — Alpha

A child-friendly English typing game for learners beginning to build QWERTY keyboard skills. FingerType Quest makes the next key and the matching finger easy to see, with gentle feedback that lets learners keep trying instead of restarting a word.

> **Alpha status:** This is an early, self-contained front-end release. The game is usable, but its features and visual design may change as it is tested with learners.

## What it includes

- **K–8 word banks** stored as editable Markdown files
- **Word Practice**, **Dictation**, and **Sentence Practice** modes
- An animated on-screen QWERTY keyboard with finger-position coaching
- A responsive practice layout that keeps targets, stats, and the keyboard accessible at every window height
- Friendly error handling: mistakes are counted but never inserted into the word
- Optional sound and browser voice playback
- A Bank Library for viewing and editing word and sentence banks
- Qwen-assisted file recognition with an editable review step and automatic browser fallback
- Browser-based saving, plus optional connection to a local folder that dynamically loads each user's personal Markdown banks in supported browsers
- No account or build step; cloud voice and LLM recognition use a small Cloudflare Worker

## Run it

The Alpha experience is in `index.html`. Because it loads the Markdown bank files beside it, serve this folder with any simple local static server instead of opening the file directly.

```bash
cd "Typing Game"
python3 -m http.server 8000
```

Then visit [http://localhost:8000/index.html](http://localhost:8000/index.html).

### Test Qwen voice and file recognition locally

The simple server above is enough for browser voice, but it cannot run the
Cloudflare `/api/tts` and `/api/recognize-bank` Worker routes. To test Qwen
features locally, copy the template, add your key, and run the Worker
development server instead:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars and replace the placeholder with your Qwen key.
npx wrangler dev --local --port 8788
```

Then open [http://localhost:8788](http://localhost:8788). The `.dev.vars` file
is intentionally ignored by Git, while the template is safe to share.

The Worker configuration routes `/api/tts` to the cloud voice handler,
`/api/recognize-bank` to the word/sentence recognition handler, and serves all
other requests from the static game assets. Cloud voice uses Qwen's
single public Breeze profile with a fixed seed and a formal adult-female delivery
instruction. Word and Dictation requests accept exactly one English headword.
Before returning PCM to the page, the Worker verifies that Qwen completed a
short, isolated-word response; overlong, empty, or timed-out audio is cancelled
at the source and retried once with a second fixed seed, then never cached if
still unsafe. The page retains a matching playback cap as a second safeguard.
Qwen streams PCM audio for faster playback; browser voice remains the automatic
fallback for that one reading if cloud voice is temporarily unavailable or both
safe Qwen attempts fail.

For Current Word List and Current Sentence List imports, the page sends plain
text or prepared page images to the same-origin Worker. Qwen returns structured
word categories or sentences, then a review dialog lets the user edit or cancel
before anything is saved. If Qwen is unavailable, the existing in-browser text
parser and OCR flow runs automatically and uses the same review dialog.

## How to play

1. Choose a bank, mode, and round length.
2. Select **Start**.
3. Follow the highlighted key and finger in Word Practice, or listen and type in Dictation.
4. Use **Banks** to manage word lists, sentence lists, and imported practice material.

In Sentence Practice, capitalization, spaces, and common punctuation are part of the exercise.

## Project layout

```text
.
├── AGENTS.md             # Repository-wide documentation requirements
├── index.html            # Alpha app: bank library and all practice modes
├── banks/                # K–8, custom, and sentence-bank Markdown files
├── functions/api/        # Cloudflare Pages API entrypoints
├── qwen-bank-handler.js  # Server-only Qwen document recognition
├── tts-handler.js        # Server-only Qwen voice handling
├── worker/               # Cloudflare Worker entrypoint
├── DESIGN.md             # Alpha design and data-model notes
└── Demo/                 # Static demonstration copy
```

## Personal banks and privacy

The built-in K–8 banks ship with the app. Edits to personal banks are saved in browser storage by default. In browsers that support the File System Access API, **Banks** can connect to a folder you choose; every `.md` file in that folder becomes a personal word or sentence bank based on its `id:`, `type:`, and `label:` metadata (or its title and filename). Files that are absent are not shown, and no missing lists are created automatically. Practice history and bank contents remain local. Only a file the user explicitly uploads for recognition is sent through the same-origin Cloudflare Worker to Qwen when the service is available; the API key never reaches the browser.

## Browser notes

For the full Alpha experience, use a current desktop Chromium browser (such as Chrome or Edge), especially if you want to connect a local folder. The game itself is a static website and requires no installation.

The practice screen uses the live viewport height to tighten spacing, key sizes, and target text where possible. On larger desktop displays, the center practice and Stats panels are capped directly at `min(320px, 35dvh)` for words and `min(360px, 40dvh)` for sentences, so high-resolution displays do not stretch them excessively. On a very short desktop window, the page becomes vertically scrollable before any target text, Stats cards, controls, or keyboard rows are clipped.

## Maintenance rule

Every repository change must update both `README.md` and `DESIGN.md` in the
same change. Keep this README accurate for user-facing behavior, setup,
operation, privacy, dependencies, and project layout. Keep `DESIGN.md` accurate
for architecture, UI behavior, data flow, integrations, security boundaries,
key functions, and verification results. This requirement is also recorded in
`AGENTS.md` so future Codex work applies it automatically.

## Documentation

- [Alpha design notes](DESIGN.md)

## License

No license has been selected yet. All rights reserved until one is added.
