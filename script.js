/* ── State ── */
const state = {
  mode: 'words',
  wordCount: 25,
  timeLimit: 15,
  aiType: 'random',
  theme: 'dark',
  fontFamily: 'Roboto Mono',
  fontSize: 22,
  letterSpacing: 0,
  wordSpacing: 0,
  cursor: 'line',
  smooth: true,
  sound: false,
  customColors: {},

  words: [],
  letterEls: [],
  wordEls: [],
  wordLineNums: [],
  measuredLineHeight: 0,

  currentWord: 0,
  currentLetter: 0,
  typedHistory: [],

  started: false,
  finished: false,
  startTime: null,
  timerInterval: null,
  correctChars: 0,
  wrongChars: 0,
  correctWords: 0,
  wrongWords: 0,
};

/* ── DOM Refs ── */
const wordsDisplay    = document.getElementById('wordsDisplay');
const typingInput     = document.getElementById('typingInput');
const liveWpm         = document.getElementById('liveWpm');
const timerDisplay    = document.getElementById('timerDisplay');
const timerItem       = document.getElementById('timerItem');
const results         = document.getElementById('results');
const typingContainer = document.getElementById('typingContainer');
const settingsOverlay = document.getElementById('settingsOverlay');

/* ── Audio ── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function playClick() {
  if (!state.sound) return;
  if (!audioCtx) audioCtx = new AudioCtx();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  o.frequency.value = 900;
  g.gain.setValueAtTime(0.05, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
  o.start(); o.stop(audioCtx.currentTime + 0.04);
}

/* ── Word Generation ── */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getWords() {
  if (state.mode === 'ai') {
    const para = AI_PARAGRAPHS[Math.floor(Math.random() * AI_PARAGRAPHS.length)];
    return para.trim().split(/\s+/);
  }
  const count = state.mode === 'time' ? 200 : state.wordCount;
  const pool = shuffle(WORD_LIST);
  const words = [];
  while (words.length < count) words.push(...pool);
  return words.slice(0, count);
}

/* ── Build Display ── */
function buildDisplay() {
  wordsDisplay.innerHTML = '';
  state.letterEls = [];
  state.wordEls = [];
  state.wordLineNums = [];
  state.measuredLineHeight = 0;

  state.words.forEach((word) => {
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    const letters = [];
    word.split('').forEach(ch => {
      const span = document.createElement('span');
      span.className = 'letter untyped';
      span.textContent = ch;
      wordEl.appendChild(span);
      letters.push(span);
    });
    wordsDisplay.appendChild(wordEl);
    state.wordEls.push(wordEl);
    state.letterEls.push(letters);
  });

  // Create caret
  const caret = document.createElement('span');
  caret.id = 'typingCaret';
  caret.className = 'caret blinking';
  wordsDisplay.appendChild(caret);

  // Measure after DOM is laid out
  measureLines();
  positionCaret();
}

/* ── Line Measurement ── */
function measureLines() {
  state.wordLineNums = [];
  state.measuredLineHeight = 0;
  if (!state.wordEls.length) return;

  // Measure at scrollTop = 0
  wordsDisplay.scrollTop = 0;

  const firstTop = state.wordEls[0].getBoundingClientRect().top;
  let prevTop = firstTop;
  let lineNum = 0;

  for (let i = 0; i < state.wordEls.length; i++) {
    const top = state.wordEls[i].getBoundingClientRect().top;
    if (top > prevTop + 3) {
      if (!state.measuredLineHeight) state.measuredLineHeight = top - firstTop;
      lineNum++;
      prevTop = top;
    }
    state.wordLineNums[i] = lineNum;
  }

  // Fallback if all words fit on one line
  if (!state.measuredLineHeight) {
    state.measuredLineHeight = state.fontSize * 1.8;
  }
}

/* ── Scroll to Keep Current Word Visible ── */
function scrollToCurrentLine() {
  const wi = state.currentWord;
  const line = state.wordLineNums[wi] ?? 0;
  const lineH = state.measuredLineHeight;
  // Keep one line of context above when possible; current line always on screen
  const targetScroll = Math.max(0, line - 1) * lineH;
  wordsDisplay.scrollTop = targetScroll;
}

/* ── Caret Positioning ── */
function positionCaret() {
  const caret = document.getElementById('typingCaret');
  if (!caret) return;

  const wi = state.currentWord;
  const li = state.currentLetter;
  const wordEl = state.wordEls[wi];
  if (!wordEl) return;

  const letters = state.letterEls[wi];
  const ref = li < letters.length ? letters[li] : letters[letters.length - 1];
  if (!ref) return;

  const containerRect = wordsDisplay.getBoundingClientRect();
  const refRect = ref.getBoundingClientRect();

  const top = refRect.top - containerRect.top;
  const left = li < letters.length
    ? refRect.left - containerRect.left
    : refRect.right - containerRect.left;

  caret.style.top = top + 'px';
  caret.style.left = left + 'px';
}

/* ── Reset ── */
function reset() {
  clearInterval(state.timerInterval);
  Object.assign(state, {
    words: getWords(),
    letterEls: [], wordEls: [], wordLineNums: [], measuredLineHeight: 0,
    currentWord: 0, currentLetter: 0, typedHistory: [],
    started: false, finished: false, startTime: null, timerInterval: null,
    correctChars: 0, wrongChars: 0, correctWords: 0, wrongWords: 0,
  });

  wordsDisplay.scrollTop = 0;
  liveWpm.textContent = '0';
  timerDisplay.textContent = state.timeLimit;
  typingInput.value = '';
  results.classList.add('hidden');
  typingContainer.style.display = '';

  buildDisplay();

  const caret = document.getElementById('typingCaret');
  if (caret) {
    caret.className = 'caret blinking' + (state.smooth ? ' smooth' : '');
  }

  typingInput.focus();
}

/* ── Timer ── */
function startTimer() {
  state.startTime = Date.now();
  if (state.mode === 'time') {
    state.timerInterval = setInterval(() => {
      const elapsed = (Date.now() - state.startTime) / 1000;
      const left = Math.max(0, state.timeLimit - elapsed);
      timerDisplay.textContent = Math.ceil(left);
      updateLiveWpm();
      if (left <= 0) finish();
    }, 100);
  } else {
    state.timerInterval = setInterval(updateLiveWpm, 500);
  }
}

function updateLiveWpm() {
  if (!state.startTime) return;
  const mins = (Date.now() - state.startTime) / 60000;
  if (mins <= 0) return;
  liveWpm.textContent = Math.round((state.correctChars / 5) / mins);
}

/* ── Input ── */
typingInput.addEventListener('keydown', handleKeydown);
typingInput.addEventListener('input', () => { typingInput.value = ''; });
typingInput.addEventListener('keypress', (e) => {
  if (state.finished || e.key === ' ' || e.key === 'Enter') return;
  playClick();
  if (!state.started) startTest();
  typeLetter(e.key);
});

function handleKeydown(e) {
  if (state.finished) return;
  if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
  if (e.key === ' ')         { e.preventDefault(); handleSpace();     return; }
}

function startTest() {
  state.started = true;
  const caret = document.getElementById('typingCaret');
  if (caret) caret.classList.remove('blinking');
  startTimer();
}

function typeLetter(ch) {
  const wi = state.currentWord;
  const li = state.currentLetter;
  const word = state.words[wi];
  const letters = state.letterEls[wi];

  if (li < word.length) {
    const correct = ch === word[li];
    letters[li].className = 'letter ' + (correct ? 'correct' : 'wrong');
    if (correct) state.correctChars++; else state.wrongChars++;
    state.currentLetter++;
  } else {
    const extra = document.createElement('span');
    extra.className = 'letter extra';
    extra.textContent = ch;
    state.wordEls[wi].appendChild(extra);
    letters.push(extra);
    state.wrongChars++;
    state.currentLetter++;
  }
  positionCaret();
}

function handleSpace() {
  if (!state.started) { startTest(); return; }
  const wi = state.currentWord;
  const word = state.words[wi];
  const letters = state.letterEls[wi];

  // Mark untouched letters wrong
  for (let i = state.currentLetter; i < word.length; i++) {
    letters[i].className = 'letter wrong';
    state.wrongChars++;
  }

  // Check if the whole word was correct
  let allCorrect = state.currentLetter === word.length;
  if (allCorrect) {
    for (let i = 0; i < word.length; i++) {
      if (letters[i].classList.contains('wrong')) { allCorrect = false; break; }
    }
  }
  if (allCorrect) state.correctWords++; else state.wrongWords++;

  state.typedHistory.push(state.currentLetter);
  state.currentWord++;
  state.currentLetter = 0;

  if (state.mode !== 'time' && state.currentWord >= state.words.length) {
    finish(); return;
  }

  // Scroll first, then position caret so getBoundingClientRect reflects new scroll
  scrollToCurrentLine();
  positionCaret();
}

function handleBackspace() {
  if (!state.started) return;
  const wi = state.currentWord;
  const li = state.currentLetter;
  const letters = state.letterEls[wi];

  if (li > 0) {
    state.currentLetter--;
    const letter = letters[state.currentLetter];
    if (letter.classList.contains('extra')) {
      letter.remove();
      letters.splice(state.currentLetter, 1);
    } else {
      if (letter.classList.contains('correct')) state.correctChars--;
      else state.wrongChars--;
      letter.className = 'letter untyped';
    }
    positionCaret();
  } else if (wi > 0) {
    state.currentWord--;
    const prevLetters = state.letterEls[state.currentWord];
    state.currentLetter = state.typedHistory.pop() || prevLetters.length;

    // Remove extra letters from previous word
    const prevWord = state.words[state.currentWord];
    for (let i = prevLetters.length - 1; i >= prevWord.length; i--) {
      state.wrongChars--;
      prevLetters[i].remove();
      prevLetters.splice(i, 1);
    }
    // Unmark letters after cursor
    for (let i = state.currentLetter; i < prevWord.length; i++) {
      if (prevLetters[i].classList.contains('correct')) state.correctChars--;
      else if (prevLetters[i].classList.contains('wrong')) state.wrongChars--;
      prevLetters[i].className = 'letter untyped';
    }

    scrollToCurrentLine();
    positionCaret();
  }
}

/* ── Finish ── */
function finish() {
  clearInterval(state.timerInterval);
  state.finished = true;

  const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
  const mins = elapsed / 60;
  const wpm = mins > 0 ? Math.round((state.correctChars / 5) / mins) : 0;
  const total = state.correctChars + state.wrongChars;
  const acc = total > 0 ? Math.round((state.correctChars / total) * 100) : 100;

  document.getElementById('resWpm').textContent     = wpm;
  document.getElementById('resAcc').textContent     = acc + '%';
  document.getElementById('resCorrect').textContent = state.correctWords;
  document.getElementById('resWrong').textContent   = state.wrongWords;
  document.getElementById('resTime').textContent    = Math.round(elapsed) + 's';

  typingContainer.style.display = 'none';
  results.classList.remove('hidden');
}

/* ── Focus / Shortcuts ── */
typingContainer.addEventListener('click', () => typingInput.focus());

let tabDown = false;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { tabDown = true; e.preventDefault(); }
  if (e.key === 'Enter' && tabDown) reset();
  if (e.key === 'Escape') settingsOverlay.classList.add('hidden');
});
document.addEventListener('keyup', (e) => { if (e.key === 'Tab') tabDown = false; });

/* ── Resize: re-measure lines ── */
window.addEventListener('resize', () => {
  if (!state.finished && state.wordEls.length) {
    measureLines();
    scrollToCurrentLine();
    positionCaret();
  }
});

/* ── Mode Buttons ── */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.mode = btn.dataset.mode;
    document.getElementById('wordCountOptions').classList.toggle('hidden', state.mode !== 'words');
    document.getElementById('timeOptions').classList.toggle('hidden', state.mode !== 'time');
    document.getElementById('aiOptions').classList.toggle('hidden', state.mode !== 'ai');
    timerItem.classList.toggle('hidden', state.mode !== 'time');
    reset();
  });
});

document.querySelectorAll('#wordCountOptions .sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#wordCountOptions .sub-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.wordCount = parseInt(btn.dataset.count);
    reset();
  });
});
document.querySelectorAll('#timeOptions .sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#timeOptions .sub-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.timeLimit = parseInt(btn.dataset.time);
    timerDisplay.textContent = state.timeLimit;
    reset();
  });
});
document.querySelectorAll('#aiOptions .sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#aiOptions .sub-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.aiType = btn.dataset.ai;
    reset();
  });
});

/* ── Restart ── */
document.getElementById('restartBtn').addEventListener('click', reset);
document.getElementById('resultsRestartBtn').addEventListener('click', reset);

/* ── Settings Modal ── */
document.getElementById('settingsBtn').addEventListener('click', () => settingsOverlay.classList.remove('hidden'));
document.getElementById('closeSettings').addEventListener('click', () => settingsOverlay.classList.add('hidden'));
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) settingsOverlay.classList.add('hidden'); });

/* Tabs */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

/* Theme */
document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.theme = btn.dataset.theme;
    document.body.setAttribute('data-theme', state.theme);
    // Remove custom color overrides when switching preset theme
    ['--bg','--bg2','--surface','--text','--accent','--correct','--wrong','--caret'].forEach(v =>
      document.documentElement.style.removeProperty(v)
    );
    state.customColors = {};
    syncColorPickers();
    saveSettings();
  });
});

/* Font Family */
document.querySelectorAll('.font-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.fontFamily = btn.dataset.family;
    document.documentElement.style.setProperty('--font-family', `'${state.fontFamily}', monospace`);
    remeasureAndReposition();
    saveSettings();
  });
});

/* Font Size Slider */
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeVal    = document.getElementById('fontSizeVal');
fontSizeSlider.addEventListener('input', () => {
  state.fontSize = parseInt(fontSizeSlider.value);
  fontSizeVal.textContent = state.fontSize + 'px';
  document.documentElement.style.setProperty('--font-size', state.fontSize + 'px');
  remeasureAndReposition();
  saveSettings();
});

/* Letter Spacing Slider */
const letterSpacingSlider = document.getElementById('letterSpacingSlider');
const letterSpacingVal    = document.getElementById('letterSpacingVal');
letterSpacingSlider.addEventListener('input', () => {
  state.letterSpacing = parseFloat(letterSpacingSlider.value);
  letterSpacingVal.textContent = state.letterSpacing + 'px';
  document.documentElement.style.setProperty('--letter-spacing', state.letterSpacing + 'px');
  remeasureAndReposition();
  saveSettings();
});

/* Word Spacing Slider */
const wordSpacingSlider = document.getElementById('wordSpacingSlider');
const wordSpacingVal    = document.getElementById('wordSpacingVal');
wordSpacingSlider.addEventListener('input', () => {
  state.wordSpacing = parseInt(wordSpacingSlider.value);
  wordSpacingVal.textContent = state.wordSpacing + 'px';
  document.documentElement.style.setProperty('--word-spacing', state.wordSpacing + 'px');
  remeasureAndReposition();
  saveSettings();
});

function remeasureAndReposition() {
  // After font/size changes, re-measure line positions since words may have reflowed
  requestAnimationFrame(() => {
    measureLines();
    scrollToCurrentLine();
    positionCaret();
  });
}

/* Cursor */
document.querySelectorAll('[data-cursor]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cursor]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.cursor = btn.dataset.cursor;
    document.body.setAttribute('data-cursor', state.cursor);
    saveSettings();
  });
});

/* Smooth Caret */
document.querySelectorAll('[data-smooth]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-smooth]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.smooth = btn.dataset.smooth === 'on';
    const caret = document.getElementById('typingCaret');
    if (caret) caret.classList.toggle('smooth', state.smooth);
    saveSettings();
  });
});

/* Sound */
document.querySelectorAll('[data-sound]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-sound]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.sound = btn.dataset.sound === 'on';
    saveSettings();
  });
});

/* ── Custom Colors ── */
const colorMap = [
  { id: 'colorBg',      prop: '--bg'      },
  { id: 'colorSurface', prop: '--bg2'     },
  { id: 'colorText',    prop: '--text'    },
  { id: 'colorAccent',  prop: '--accent'  },
  { id: 'colorCorrect', prop: '--correct' },
  { id: 'colorWrong',   prop: '--wrong'   },
];

colorMap.forEach(({ id, prop }) => {
  document.getElementById(id).addEventListener('input', (e) => {
    document.documentElement.style.setProperty(prop, e.target.value);
    if (prop === '--accent') document.documentElement.style.setProperty('--caret', e.target.value);
    state.customColors[prop] = e.target.value;
    saveSettings();
  });
});

document.getElementById('resetColors').addEventListener('click', () => {
  colorMap.forEach(({ prop }) => document.documentElement.style.removeProperty(prop));
  document.documentElement.style.removeProperty('--caret');
  state.customColors = {};
  syncColorPickers();
  saveSettings();
});

function syncColorPickers() {
  // Read computed CSS values and push into the color picker inputs
  const style = getComputedStyle(document.documentElement);
  const pairs = [
    ['colorBg',      '--bg'],
    ['colorSurface', '--bg2'],
    ['colorText',    '--text'],
    ['colorAccent',  '--accent'],
    ['colorCorrect', '--correct'],
    ['colorWrong',   '--wrong'],
  ];
  pairs.forEach(([id, prop]) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = style.getPropertyValue(prop).trim();
    if (val.startsWith('#') && val.length === 7) el.value = val;
  });
}

/* ── Persist Settings ── */
function saveSettings() {
  try {
    localStorage.setItem('typeflow_settings', JSON.stringify({
      theme: state.theme,
      fontFamily: state.fontFamily,
      fontSize: state.fontSize,
      letterSpacing: state.letterSpacing,
      wordSpacing: state.wordSpacing,
      cursor: state.cursor,
      smooth: state.smooth,
      sound: state.sound,
      customColors: state.customColors,
    }));
  } catch {}
}

function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('typeflow_settings') || '{}');

    if (s.theme) {
      state.theme = s.theme;
      document.body.setAttribute('data-theme', s.theme);
      document.querySelectorAll('.theme-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.theme === s.theme));
    }

    if (s.fontFamily) {
      state.fontFamily = s.fontFamily;
      document.documentElement.style.setProperty('--font-family', `'${s.fontFamily}', monospace`);
      document.querySelectorAll('.font-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.family === s.fontFamily));
    }

    if (s.fontSize) {
      state.fontSize = s.fontSize;
      document.documentElement.style.setProperty('--font-size', s.fontSize + 'px');
      fontSizeSlider.value = s.fontSize;
      fontSizeVal.textContent = s.fontSize + 'px';
    }

    if (s.letterSpacing !== undefined) {
      state.letterSpacing = s.letterSpacing;
      document.documentElement.style.setProperty('--letter-spacing', s.letterSpacing + 'px');
      letterSpacingSlider.value = s.letterSpacing;
      letterSpacingVal.textContent = s.letterSpacing + 'px';
    }

    if (s.wordSpacing !== undefined) {
      state.wordSpacing = s.wordSpacing;
      document.documentElement.style.setProperty('--word-spacing', s.wordSpacing + 'px');
      wordSpacingSlider.value = s.wordSpacing;
      wordSpacingVal.textContent = s.wordSpacing + 'px';
    }

    if (s.cursor) {
      state.cursor = s.cursor;
      document.body.setAttribute('data-cursor', s.cursor);
      document.querySelectorAll('[data-cursor]').forEach(b =>
        b.classList.toggle('active', b.dataset.cursor === s.cursor));
    }

    if (s.smooth !== undefined) {
      state.smooth = s.smooth;
      document.querySelectorAll('[data-smooth]').forEach(b =>
        b.classList.toggle('active', (b.dataset.smooth === 'on') === s.smooth));
    }

    if (s.sound !== undefined) {
      state.sound = s.sound;
      document.querySelectorAll('[data-sound]').forEach(b =>
        b.classList.toggle('active', (b.dataset.sound === 'on') === s.sound));
    }

    if (s.customColors && Object.keys(s.customColors).length) {
      state.customColors = s.customColors;
      Object.entries(s.customColors).forEach(([prop, val]) =>
        document.documentElement.style.setProperty(prop, val));
      if (s.customColors['--accent'])
        document.documentElement.style.setProperty('--caret', s.customColors['--accent']);
    }

    // Sync color pickers after a tick so CSS variables have resolved
    setTimeout(syncColorPickers, 50);
  } catch {}
}

/* ── Init ── */
loadSettings();
reset();
