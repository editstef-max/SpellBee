# SpellBee

Make as many words as you can from seven letters. Every word must use the yellow centre letter.

- **Daily**: everyone gets the same puzzle each day.
- **Random**: unlimited puzzles; tap "New puzzle" for another.
- British English word list (about 16,500 words, 1,465 puzzles).
- Works offline and can be added to the iPhone home screen.

## Files

| File | What it is |
|---|---|
| `index.html`, `styles.css`, `app.js` | The game |
| `words.js` | Word list and puzzles (generated, don't edit by hand) |
| `manifest.webmanifest`, `sw.js`, `icons/` | Home-screen app and offline support |
| `tools/build_words.py` | Regenerates `words.js` |
| `tools/make_icons.py` | Regenerates the icons |

## Play locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Put it on your iPhone

1. Host the folder on any free static host (for example GitHub Pages or Netlify).
2. Open the address in **Safari** on your iPhone.
3. Tap **Share → Add to Home Screen**.

## Updating the game

After changing any file, bump `VERSION` in `sw.js` (for example `spellbee-2`) so phones fetch the new version. Phones pick up the update the next time the app is opened twice.

## Regenerating the word list

Needs Python packages `wordfreq` and the npm package `wordlist-english@1.2.1`:

```bash
python3 tools/build_words.py node_modules/wordlist-english words.js
```

Word list sources: SCOWL (via `wordlist-english`, MIT-style licence) filtered by `wordfreq` frequency. Add unwanted words to `BLOCKLIST` in `tools/build_words.py`.
