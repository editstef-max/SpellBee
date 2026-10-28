// SpellBee game logic. PUZZLES, WORDS and BONUS_WORDS come from words.js.

const RANKS = [
  ["Beginner", 0],
  ["Warming Up", 2],
  ["Buzzing", 5],
  ["Busy Bee", 8],
  ["Solid", 15],
  ["Sharp", 25],
  ["Brilliant", 40],
  ["Wordsmith", 50],
  ["Genius", 70],
];
const TOP_RANK = "Hive Master"; // shown only when every word is found
const DAY_ZERO = new Date(2026, 0, 1);
const STORE = "spellbee:v1";

// Outer cells in clockwise order from the top: [column, half-row].
const OUTER_POS = [[0, -2], [1, -1], [1, 1], [0, 2], [-1, 1], [-1, -1]];

const $ = (id) => document.getElementById(id);

let save = loadSave();
let game = null; // { key, label, centre, outer, answers, bonus, maxScore, thresholds, found, solved }
let typed = "";
let toastTimer = 0;

// ---------- Persistence ----------

function loadSave() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || {};
  } catch {
    return {};
  }
}

function writeSave() {
  try {
    localStorage.setItem(STORE, JSON.stringify(save));
  } catch {}
}

// ---------- Puzzles ----------

function todayIndex() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today - DAY_ZERO) / 86400000);
}

function dateLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function score(word) {
  if (word.length === 4) return 1;
  return word.length + (isPangram(word) ? 7 : 0);
}

function isPangram(word) {
  return new Set(word).size === 7;
}

// Answers are the words the player is expected to find. Bonus words are rarer
// words that are accepted and score points but don't count towards the total.
function buildGame(puzzle, key, label, state) {
  const centre = puzzle[0];
  const letters = new Set(puzzle);
  const fits = (w) => w.includes(centre) && [...w].every((c) => letters.has(c));
  const answers = new Set(WORDS.filter(fits));
  const bonus = new Set(BONUS_WORDS.filter(fits));
  const maxScore = [...answers].reduce((sum, w) => sum + score(w), 0);
  return {
    key,
    label,
    centre,
    outer: puzzle.slice(1).split(""),
    answers,
    bonus,
    maxScore,
    thresholds: RANKS.map(([name, pct]) => [name, Math.round((pct / 100) * maxScore)]),
    found: state.found.filter((w) => answers.has(w) || bonus.has(w)),
    solved: !!state.solved,
  };
}

function gameState() {
  return game.key === "random" ? save.random : save[game.key];
}

function foundAnswers() {
  return game.found.filter((w) => game.answers.has(w)).length;
}

function allFound() {
  return foundAnswers() === game.answers.size;
}

function startDaily() {
  const day = todayIndex();
  const key = "daily-" + day;
  // Clear out old daily progress so storage doesn't grow forever.
  for (const k of Object.keys(save)) if (k.startsWith("daily-") && k !== key) delete save[k];
  const puzzle = PUZZLES[((day % PUZZLES.length) + PUZZLES.length) % PUZZLES.length];
  save[key] = save[key] || { found: [] };
  game = buildGame(puzzle, key, dateLabel(), save[key]);
}

function startRandom(fresh) {
  if (fresh || !save.random) {
    let i;
    do i = Math.floor(Math.random() * PUZZLES.length);
    while (save.random && PUZZLES[i] === save.random.puzzle);
    save.random = { puzzle: PUZZLES[i], found: [], n: (save.randomCount || 0) + 1 };
    save.randomCount = save.random.n;
  }
  game = buildGame(save.random.puzzle, "random", "Random puzzle #" + save.random.n, save.random);
}

function setMode(mode) {
  save.mode = mode;
  typed = "";
  if (mode === "random") startRandom(false);
  else startDaily();
  writeSave();
  document.querySelectorAll(".mode button").forEach((b) => b.setAttribute("aria-selected", b.dataset.mode === mode));
  $("puzzle-label").textContent = game.label;
  closeWords();
  renderHive();
  renderAll();
}

// ---------- Rendering ----------

function renderHive() {
  const hive = $("hive");
  hive.innerHTML = "";
  const cells = [[game.centre, [0, 0], true], ...game.outer.map((l, i) => [l, OUTER_POS[i], false])];
  for (const [letter, [x, y], isCentre] of cells) {
    const b = document.createElement("button");
    b.className = "cell" + (isCentre ? " centre" : "");
    b.style.setProperty("--x", x);
    b.style.setProperty("--y", y);
    b.textContent = letter;
    b.setAttribute("aria-label", letter);
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      press(b);
      addLetter(b.textContent);
    });
    hive.appendChild(b);
  }
}

function press(el) {
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 110);
}

function renderEntry() {
  const entry = $("entry");
  const letters = new Set([game.centre, ...game.outer]);
  entry.innerHTML = "";
  for (const ch of typed) {
    const span = document.createElement("span");
    span.textContent = ch;
    if (ch === game.centre) span.className = "c";
    else if (!letters.has(ch)) span.className = "x";
    entry.appendChild(span);
  }
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  entry.appendChild(cursor);
  // Shrink long words so they fit on a phone screen.
  entry.style.fontSize = typed.length > 11 ? `${Math.max(1.1, 22 / typed.length)}rem` : "";
}

function currentScore() {
  return game.found.reduce((sum, w) => sum + score(w), 0);
}

function rankIndex(points) {
  let idx = 0;
  game.thresholds.forEach(([, min], i) => {
    if (points >= min) idx = i;
  });
  return idx;
}

function renderRank() {
  const points = currentScore();
  const idx = rankIndex(points);
  $("rank-name").textContent = allFound() ? TOP_RANK : game.thresholds[idx][0];
  const track = $("track");
  track.innerHTML = "";
  game.thresholds.forEach((_, i) => {
    const node = document.createElement("span");
    node.className = "node";
    if (i < idx) node.classList.add("done");
    if (i === game.thresholds.length - 1) node.classList.add("last");
    if (i === idx) {
      node.classList.add("current");
      node.textContent = points;
    }
    track.appendChild(node);
  });
}

function renderWords() {
  const preview = $("words-preview");
  const list = $("words-list");
  const n = game.found.length;
  if (game.solved) {
    preview.className = "words-preview";
    preview.textContent = `Solved: you found ${foundAnswers()} of ${game.answers.size} words`;
  } else if ($("words").classList.contains("open")) {
    preview.className = "words-preview";
    preview.textContent = `You have found ${n} word${n === 1 ? "" : "s"}`;
  } else if (n === 0) {
    preview.className = "words-preview empty";
    preview.textContent = "Your words …";
  } else {
    preview.className = "words-preview";
    preview.innerHTML = "";
    [...game.found].reverse().forEach((w, i) => {
      const el = document.createElement(isPangram(w) ? "b" : "span");
      el.textContent = cap(w);
      preview.appendChild(el);
    });
  }
  list.innerHTML = "";
  const shown = game.solved ? new Set([...game.answers, ...game.found]) : game.found;
  for (const w of [...shown].sort()) {
    const li = document.createElement("li");
    li.textContent = w;
    if (isPangram(w)) li.classList.add("pangram");
    if (game.bonus.has(w)) li.classList.add("bonus");
    if (!game.found.includes(w)) li.classList.add("missed");
    list.appendChild(li);
  }
  $("words-legend").hidden = !game.solved;
}

function renderRanksSheet() {
  const points = currentScore();
  const idx = rankIndex(points);
  const next = game.thresholds[idx + 1];
  const genius = game.thresholds[game.thresholds.length - 1][1];
  let sub = `You have ${points} point${points === 1 ? "" : "s"}.`;
  if (next) sub += ` ${next[1] - points} to ${next[0]}`;
  if (next && points < genius) sub += next[0] === "Genius" ? "." : `, ${genius - points} to Genius.`;
  else if (!next) sub += ` Find all ${game.answers.size} words (${game.maxScore} points) to become ${TOP_RANK}.`;
  $("ranks-sub").textContent = sub;
  const list = $("ranks-list");
  list.innerHTML = "";
  for (let i = game.thresholds.length - 1; i >= 0; i--) {
    const [name, min] = game.thresholds[i];
    const li = document.createElement("li");
    li.innerHTML = `<span></span><span></span>`;
    li.children[0].textContent = name;
    li.children[1].textContent = min;
    if (i <= idx) li.classList.add("reached");
    if (i === idx) li.classList.add("current");
    list.appendChild(li);
  }
}

function renderAll() {
  renderEntry();
  renderRank();
  renderWords();
  const finished = game.solved || allFound();
  $("solve").hidden = finished;
  $("new-puzzle").hidden = save.mode !== "random";
  $("app").classList.toggle("solved", game.solved);
}

const cap = (w) => w[0].toUpperCase() + w.slice(1);

// ---------- Input ----------

function addLetter(ch) {
  if (game.solved || typed.length >= 19) return;
  typed += ch.toLowerCase();
  renderEntry();
}

function deleteLetter() {
  typed = typed.slice(0, -1);
  renderEntry();
}

function shuffle() {
  const hive = $("hive");
  hive.classList.add("shuffling");
  setTimeout(() => {
    const o = game.outer;
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    hive.querySelectorAll(".cell:not(.centre)").forEach((cell, i) => {
      cell.textContent = o[i];
      cell.setAttribute("aria-label", o[i]);
    });
    hive.classList.remove("shuffling");
  }, 150);
}

function reject(message) {
  toast(message, false);
  const entry = $("entry");
  entry.classList.remove("shake");
  void entry.offsetWidth;
  entry.classList.add("shake");
  setTimeout(() => {
    typed = "";
    entry.classList.remove("shake");
    renderEntry();
  }, 400);
}

function submit() {
  const word = typed;
  if (!word || game.solved) return;
  const letters = new Set([game.centre, ...game.outer]);
  if (word.length < 4) return reject("Too short");
  if (![...word].every((c) => letters.has(c))) return reject("Bad letters");
  if (!word.includes(game.centre)) return reject("Missing centre letter");
  if (game.found.includes(word)) return reject("Already found");
  const isBonus = game.bonus.has(word);
  if (!game.answers.has(word) && !isBonus) return reject("Not in word list");

  const before = rankIndex(currentScore());
  game.found.push(word);
  gameState().found = game.found;
  writeSave();

  const pts = score(word);
  const praise = isBonus
    ? "Bonus word!"
    : isPangram(word) ? "Pangram!" : word.length === 4 ? "Good!" : word.length < 7 ? "Nice!" : "Awesome!";
  toast(praise, true, pts);
  typed = "";
  renderAll();

  const after = rankIndex(currentScore());
  if (!isBonus && allFound()) setTimeout(showDone, 900);
  else if (after > before) setTimeout(() => toast(`New rank: ${game.thresholds[after][0]}`, true), 1300);
}

function toast(text, good, pts) {
  const el = $("toast");
  el.innerHTML = "";
  const span = document.createElement("span");
  span.textContent = text;
  if (good) span.className = "good";
  if (pts) {
    const p = document.createElement("b");
    p.className = "pts";
    p.textContent = "+" + pts;
    span.appendChild(p);
  }
  el.appendChild(span);
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1300);
}

// ---------- Panels ----------

function toggleWords() {
  const box = $("words");
  const open = !box.classList.contains("open");
  box.classList.toggle("open", open);
  $("words-panel").hidden = !open;
  $("words-toggle").setAttribute("aria-expanded", open);
  renderWords();
}

function closeWords() {
  if ($("words").classList.contains("open")) toggleWords();
}

function openSheet(id) {
  $(id).hidden = false;
}

function solve() {
  $("solve-sheet").hidden = true;
  game.solved = true;
  gameState().solved = true;
  writeSave();
  typed = "";
  renderAll();
  if (!$("words").classList.contains("open")) toggleWords();
}

function showDone() {
  $("done-sub").textContent = `You found all ${game.answers.size} words for ${game.maxScore} points.`;
  $("done-new").hidden = false;
  $("done-new").textContent = game.key === "random" ? "Play another random puzzle" : "Play a random puzzle";
  openSheet("done-sheet");
}

// ---------- Wiring ----------

$("delete").addEventListener("click", deleteLetter);
$("enter").addEventListener("click", submit);
$("shuffle").addEventListener("click", shuffle);
$("words-toggle").addEventListener("click", toggleWords);
$("solve").addEventListener("click", () => openSheet("solve-sheet"));
$("solve-confirm").addEventListener("click", solve);
$("rank").addEventListener("click", () => {
  renderRanksSheet();
  openSheet("ranks-sheet");
});
$("new-puzzle").addEventListener("click", () => {
  startRandom(true);
  writeSave();
  setMode("random");
});
$("done-new").addEventListener("click", () => {
  $("done-sheet").hidden = true;
  startRandom(true);
  setMode("random");
});
document.querySelectorAll(".mode button").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
document.querySelectorAll(".sheet").forEach((sheet) =>
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet || e.target.closest("[data-close]")) sheet.hidden = true;
  })
);

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const open = document.querySelector(".sheet:not([hidden])");
  if (e.key === "Escape") {
    if (open) open.hidden = true;
    else closeWords();
    return;
  }
  if (open || game.solved) return;
  if (/^[a-z]$/i.test(e.key)) {
    addLetter(e.key);
    const cell = [...$("hive").children].find((c) => c.textContent === e.key.toLowerCase());
    if (cell) press(cell);
  } else if (e.key === "Backspace") deleteLetter();
  else if (e.key === "Enter") {
    e.preventDefault();
    submit();
  } else if (e.key === " ") {
    e.preventDefault();
    shuffle();
  }
});

// A new day may start while the app is open in the background.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && save.mode !== "random" && game.key !== "daily-" + todayIndex()) setMode("daily");
});

setMode(save.mode === "random" ? "random" : "daily");

// When an updated version is installed, reload once so it shows straight away.
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloaded) {
      reloaded = true;
      location.reload();
    }
  });
  navigator.serviceWorker.register("sw.js").then((reg) => reg.update()).catch(() => {});
}
