# SpellBee

Make as many words as you can from seven letters. Every word must use the yellow centre letter.

- **Daily**: everyone gets the same puzzle each day.
- **Random**: unlimited puzzles; tap "New puzzle" for another.
- British English word list: about 16,500 answer words plus 4,300 rarer bonus words, 1,509 puzzles.
- **Solve** reveals the words you missed (this ends the puzzle).
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

After changing any file, bump `VERSION` in `sw.js` (for example `spellbee-3`) so phones fetch the new version. The app reloads itself once when it notices an update.

## Regenerating the word list

Needs Python packages `wordfreq` and the npm package `wordlist-english@1.2.1`:

```bash
python3 tools/build_words.py node_modules/wordlist-english words.js
```

Word list sources: SCOWL (via `wordlist-english`, MIT-style licence) filtered by `wordfreq` frequency. Answers are common words; bonus words are rarer words that score points but don't count towards the total. Tune the thresholds at the top of `tools/build_words.py`, and add unwanted words to `BLOCKLIST`. Existing daily puzzles keep their dates when you rebuild.
