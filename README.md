# FingerType Quest — Alpha

A child-friendly English typing game for learners beginning to build QWERTY keyboard skills. FingerType Quest makes the next key and the matching finger easy to see, with gentle feedback that lets learners keep trying instead of restarting a word.

> **Alpha status:** This is an early, self-contained front-end release. The game is usable, but its features and visual design may change as it is tested with learners.

## What it includes

- **K–8 word banks** stored as editable Markdown files
- **Word Practice**, **Dictation**, and **Sentence Practice** modes
- An animated on-screen QWERTY keyboard with finger-position coaching
- Friendly error handling: mistakes are counted but never inserted into the word
- Optional sound and browser voice playback
- A Bank Library for viewing and editing word and sentence banks
- Browser-based saving, plus optional connection to a local folder for six personal banks in supported browsers
- No account, backend, build step, or external runtime dependency

## Run it

The Alpha experience is in `index.html`. Because it loads the Markdown bank files beside it, serve this folder with any simple local static server instead of opening the file directly.

```bash
cd "Typing Game"
python3 -m http.server 8000
```

Then visit [http://localhost:8000/index.html](http://localhost:8000/index.html).

### Test cloud voice locally

The simple server above is enough for browser voice, but it cannot run the
Cloudflare `/api/tts` Worker route. To test Qwen voice locally, copy the
template, add your key, and run the Worker development server instead:

```bash
cp .dev.vars.example .dev.vars
# Edit .dev.vars and replace the placeholder with your Qwen key.
npx wrangler dev --local --port 8788
```

Then open [http://localhost:8788](http://localhost:8788). The `.dev.vars` file
is intentionally ignored by Git, while the template is safe to share.

The Worker configuration routes `/api/tts` to the cloud voice handler and
serves all other requests from the static game assets. Cloud voice uses Qwen's
single public Breeze profile with a fixed seed and a formal adult-female delivery
instruction. Word and Dictation requests accept exactly one English headword.
Before returning PCM to the page, the Worker verifies that Qwen completed a
short, isolated-word response; overlong, empty, or timed-out audio is cancelled
at the source and retried once with a second fixed seed, then never cached if
still unsafe. The page retains a matching playback cap as a second safeguard.
Qwen streams PCM audio for faster playback; browser voice remains the automatic
fallback for that one reading if cloud voice is temporarily unavailable or both
safe Qwen attempts fail.

## How to play

1. Choose a bank, mode, and round length.
2. Select **Start**.
3. Follow the highlighted key and finger in Word Practice, or listen and type in Dictation.
4. Use **Banks** to manage word lists, sentence lists, and imported practice material.

In Sentence Practice, capitalization, spaces, and common punctuation are part of the exercise.

## Project layout

```text
.
├── index.html            # Alpha app: bank library and all practice modes
├── banks/                # K–8, custom, and sentence-bank Markdown files
├── DESIGN.md             # Alpha design and data-model notes
└── Demo/                 # Static demonstration copy
```

## Personal banks and privacy

The built-in K–8 banks ship with the app. Edits to personal banks are saved in browser storage by default. In browsers that support the File System Access API, **Banks** can connect to a folder you choose; the app then reads and writes only the six personal Markdown bank files in that folder. No learner data is sent to a server.

## Browser notes

For the full Alpha experience, use a current desktop Chromium browser (such as Chrome or Edge), especially if you want to connect a local folder. The game itself is a static website and requires no installation.

## Documentation

- [Alpha design notes](DESIGN.md)

## License

No license has been selected yet. All rights reserved until one is added.
