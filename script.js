/* ── State ── */
const state = {
  mode: 'words',
  wordCount: 25,
  weakCount: 25,
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
  soundStyle: 'click',
  chartStyle: 'multi',
  showLiveWpm: true,
  showProgress: true,
  focusMode: false,
  textOpacity: 100,
  panelRoundness: 16,
  testWidth: 900,
  caretThickness: 2,
  punctuation: false,
  numbers: false,
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
  wpmSamples: [],
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
const progressFill   = document.getElementById('progressFill');
const wpmChart        = document.getElementById('wpmChart');
const chartTooltip    = document.getElementById('chartTooltip');
const rankName        = document.getElementById('rankName');
const prestigeBadge   = document.getElementById('prestigeBadge');
const xpText          = document.getElementById('xpText');
const totalTests      = document.getElementById('totalTests');
const rankProgressFill = document.getElementById('rankProgressFill');
const prestigeBtn     = document.getElementById('prestigeBtn');
const leaderboardTitle = document.getElementById('leaderboardTitle');
const leaderboardList = document.getElementById('leaderboardList');
const speedBoardModes = document.getElementById('speedBoardModes');
const xpEarned        = document.getElementById('xpEarned');
const feedbackList    = document.getElementById('feedbackList');
const weakWordList    = document.getElementById('weakWordList');
const weakResult      = document.getElementById('weakResult');
const setupModeLabel  = document.getElementById('setupModeLabel');
const privacyOverlay  = document.getElementById('privacyOverlay');
const privacyBtn      = document.getElementById('privacyBtn');
const closePrivacy    = document.getElementById('closePrivacy');

let profile = loadProfile();
let chartState = null;

/* ── Audio ── */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function playClick(force = false) {
  if (!state.sound && !force) return;
  const ctx = ensureAudio();
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  const sounds = {
    click: { frequency: 900, type: 'sine', duration: 0.04, gain: 0.05 },
    clack: { frequency: 180, type: 'square', duration: 0.035, gain: 0.035 },
    pop: { frequency: 520, type: 'triangle', duration: 0.055, gain: 0.045 },
    beep: { frequency: 1200, type: 'sine', duration: 0.03, gain: 0.035 },
  };
  const sound = sounds[state.soundStyle] || sounds.click;
  o.type = sound.type;
  o.frequency.value = sound.frequency;
  g.gain.setValueAtTime(sound.gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + sound.duration);
  o.start(); o.stop(ctx.currentTime + sound.duration);
}

/* ── Word Generation ── */
const AI_GROUPS = {
  random: AI_PARAGRAPHS,
  story: AI_PARAGRAPHS.filter((_, i) => [0, 2, 4, 6].includes(i)),
  tech: AI_PARAGRAPHS.filter((_, i) => [1, 5, 8].includes(i)),
};
const PUNCTUATION_MARKS = ['.', ',', '?', '!', ';', ':'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatWord(word, index) {
  let next = word;
  if (state.numbers && index % 8 === 5) {
    next = String(Math.floor(Math.random() * 900) + 100);
  }
  if (state.punctuation && index % 5 === 3) {
    next += PUNCTUATION_MARKS[Math.floor(Math.random() * PUNCTUATION_MARKS.length)];
  }
  if (state.punctuation && index % 11 === 0) {
    next = next.charAt(0).toUpperCase() + next.slice(1);
  }
  return next;
}

function getWords() {
  if (state.mode === 'weak') {
    const weak = getWeakWords(20).map(item => item.word);
    const fallback = shuffle(WORD_LIST).slice(0, state.weakCount);
    const source = weak.length ? weak : fallback;
    const words = [];
    while (words.length < state.weakCount) {
      const weakPick = weak.length && Math.random() < 0.7;
      const pool = weakPick ? weak : WORD_LIST;
      words.push(pool[Math.floor(Math.random() * pool.length)]);
    }
    if (!weak.length) return fallback.map(formatWord);
    return words.map(formatWord);
  }
  if (state.mode === 'ai') {
    const pool = AI_GROUPS[state.aiType] || AI_GROUPS.random;
    const para = pool[Math.floor(Math.random() * pool.length)];
    return para.trim().split(/\s+/).map(formatWord);
  }
  const count = state.mode === 'time' ? 200 : state.wordCount;
  const pool = shuffle(WORD_LIST);
  const words = [];
  while (words.length < count) words.push(...pool);
  return words.slice(0, count).map(formatWord);
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
  clearUnderlineTarget();

  const wi = state.currentWord;
  const li = state.currentLetter;
  const wordEl = state.wordEls[wi];
  if (!wordEl) return;

  const letters = state.letterEls[wi];
  const ref = li < letters.length ? letters[li] : letters[letters.length - 1];
  if (!ref) return;

  const containerRect = wordsDisplay.getBoundingClientRect();
  const refRect = ref.getBoundingClientRect();

  const isUnderline = state.cursor === 'underline';
  if (isUnderline) {
    ref.classList.add('underline-target');
    return;
  }

  const top = isUnderline
    ? refRect.bottom - containerRect.top + wordsDisplay.scrollTop - 2
    : refRect.top - containerRect.top + wordsDisplay.scrollTop;
  const left = li < letters.length
    ? refRect.left - containerRect.left + wordsDisplay.scrollLeft
    : refRect.right - containerRect.left + wordsDisplay.scrollLeft;

  caret.style.top = top + 'px';
  caret.style.left = left + 'px';
  caret.style.removeProperty('width');
}

function clearUnderlineTarget() {
  wordsDisplay.querySelectorAll('.underline-target').forEach(el => {
    el.classList.remove('underline-target');
  });
}

/* ── Reset ── */
function reset() {
  clearInterval(state.timerInterval);
  Object.assign(state, {
    words: getWords(),
    letterEls: [], wordEls: [], wordLineNums: [], measuredLineHeight: 0,
    currentWord: 0, currentLetter: 0, typedHistory: [],
    started: false, finished: false, startTime: null, timerInterval: null,
    wpmSamples: [],
    correctChars: 0, wrongChars: 0, correctWords: 0, wrongWords: 0,
  });

  wordsDisplay.scrollTop = 0;
  liveWpm.textContent = '0';
  timerDisplay.textContent = state.timeLimit;
  progressFill.style.width = '0%';
  applyDisplaySettings();
  typingInput.value = '';
  results.classList.add('hidden');
  typingContainer.style.display = '';

  buildDisplay();

  const caret = document.getElementById('typingCaret');
  if (caret) {
    caret.className = 'caret blinking' + (state.smooth ? ' smooth' : '');
  }
  positionCaret();

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
  const elapsed = (Date.now() - state.startTime) / 1000;
  const mins = elapsed / 60;
  if (mins <= 0) return;
  const metrics = getCurrentMetrics(elapsed);
  liveWpm.textContent = metrics.wpm;
  if (elapsed >= 1) {
    const second = Math.floor(elapsed);
    const last = state.wpmSamples[state.wpmSamples.length - 1];
    if (!last || last.second !== second) {
      state.wpmSamples.push({ second, ...metrics });
    } else {
      Object.assign(last, metrics);
    }
  }
  updateProgress();
}

function getCurrentMetrics(elapsedSeconds) {
  const mins = elapsedSeconds / 60;
  const total = state.correctChars + state.wrongChars;
  const wpm = mins > 0 ? Math.round((state.correctChars / 5) / mins) : 0;
  const raw = mins > 0 ? Math.round((total / 5) / mins) : 0;
  const acc = total > 0 ? Math.round((state.correctChars / total) * 100) : 100;
  const errorRate = mins > 0 ? Math.round(state.wrongChars / mins) : 0;
  return {
    wpm,
    raw,
    acc,
    errors: state.wrongChars,
    errorRate,
    consistency: calculateConsistency([...state.wpmSamples.map(s => s.wpm), wpm]),
  };
}

function updateProgress() {
  let percent = 0;
  if (state.mode === 'time' && state.startTime) {
    const elapsed = (Date.now() - state.startTime) / 1000;
    percent = Math.min(100, (elapsed / state.timeLimit) * 100);
  } else if (state.words.length) {
    const word = state.words[state.currentWord] || '';
    const letterProgress = word ? Math.min(1, state.currentLetter / word.length) : 0;
    percent = Math.min(100, ((state.currentWord + letterProgress) / state.words.length) * 100);
  }
  progressFill.style.width = percent + '%';
}

/* ── Input ── */
typingInput.addEventListener('keydown', handleKeydown);
typingInput.addEventListener('input', () => { typingInput.value = ''; });

function handleKeydown(e) {
  if (state.finished) return;
  if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); return; }
  if (e.key === ' ')         { e.preventDefault(); handleSpace();     return; }
  if (!isTypableKey(e)) return;
  e.preventDefault();
  playClick();
  if (!state.started) startTest();
  typeLetter(e.key);
}

function isTypableKey(e) {
  return e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
}

function startTest() {
  state.started = true;
  document.body.classList.toggle('focus-mode-active', state.focusMode);
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

  if (state.mode !== 'time' && wi === state.words.length - 1 && state.currentLetter >= word.length) {
    completeWord(wi);
    state.currentWord++;
    updateProgress();
    finish();
    return;
  }

  positionCaret();
  updateProgress();
}

function isWordCorrect(wordIndex) {
  const word = state.words[wordIndex];
  const letters = state.letterEls[wordIndex];
  if (!word || !letters || letters.length !== word.length) return false;
  return letters.every(letter => letter.classList.contains('correct'));
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

  completeWord(wi);

  state.typedHistory.push(state.currentLetter);
  state.currentWord++;
  state.currentLetter = 0;

  if (state.mode !== 'time' && state.currentWord >= state.words.length) {
    updateProgress();
    finish(); return;
  }

  // Scroll first, then position caret so getBoundingClientRect reflects new scroll
  scrollToCurrentLine();
  positionCaret();
  updateProgress();
}

function completeWord(wordIndex) {
  const correct = isWordCorrect(wordIndex);
  if (correct) state.correctWords++; else state.wrongWords++;
  recordWordResult(state.words[wordIndex], correct);
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
    updateProgress();
  } else if (wi > 0) {
    state.currentWord--;
    const prevLetters = state.letterEls[state.currentWord];
    const wasCorrect = isWordCorrect(state.currentWord);
    if (wasCorrect && state.correctWords > 0) state.correctWords--;
    else if (!wasCorrect && state.wrongWords > 0) state.wrongWords--;

    const previousLength = state.typedHistory.pop();
    state.currentLetter = previousLength ?? prevLetters.length;

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
    updateProgress();
  }
}

/* ── Finish ── */
function finish() {
  if (state.finished) return;
  clearInterval(state.timerInterval);
  state.finished = true;
  document.body.classList.remove('focus-mode-active');

  const elapsed = state.startTime ? (Date.now() - state.startTime) / 1000 : 0;
  const mins = elapsed / 60;
  const wpm = mins > 0 ? Math.round((state.correctChars / 5) / mins) : 0;
  const total = state.correctChars + state.wrongChars;
  const acc = total > 0 ? Math.round((state.correctChars / total) * 100) : 100;
  const raw = mins > 0 ? Math.round((total / 5) / mins) : 0;
  const consistency = calculateConsistency();
  const finalMetrics = getCurrentMetrics(elapsed || 0.001);
  if (!state.wpmSamples.length || state.wpmSamples[state.wpmSamples.length - 1].second !== Math.floor(elapsed)) {
    state.wpmSamples.push({ second: Math.floor(elapsed), ...finalMetrics });
  }

  document.getElementById('resWpm').textContent     = wpm;
  document.getElementById('resAcc').textContent     = acc + '%';
  document.getElementById('resRaw').textContent     = raw;
  document.getElementById('resConsistency').textContent = consistency + '%';
  document.getElementById('resCorrect').textContent = state.correctWords;
  document.getElementById('resWrong').textContent   = state.wrongWords;
  document.getElementById('resTime').textContent    = Math.round(elapsed) + 's';

  applyProgressionResults(wpm, acc, consistency, elapsed);
  updateProgress();
  typingContainer.style.display = 'none';
  results.classList.remove('hidden');
  requestAnimationFrame(drawWpmChart);
}

function applyProgressionResults(wpm, accuracy, consistency, elapsed) {
  profile = loadProfile();
  const xp = calcXpEarned(wpm, accuracy, elapsed);
  profile.xp += xp;
  profile.totalXpEarned += xp;
  profile.totalTests++;
  saveProfile(profile);

  xpEarned.textContent = '+' + xp + ' xp';
  renderFeedback(wpm, accuracy, consistency);
  renderWeakWords();
  updateProfileUi();
}

function renderFeedback(wpm, accuracy, consistency) {
  const tips = generateFeedback(wpm, accuracy, consistency, state.mode);
  feedbackList.innerHTML = '';
  tips.forEach(tip => {
    const item = document.createElement('div');
    item.className = 'feedback-item';
    item.textContent = tip;
    feedbackList.appendChild(item);
  });
}

function updateProfileUi() {
  profile = loadProfile();
  const progress = getRankProgress(profile.xp);
  const prestigeText = PRESTIGE_STARS[profile.prestige] || ('P' + profile.prestige);
  rankName.textContent = progress.current.name;
  rankName.style.color = progress.current.color;
  prestigeBadge.textContent = prestigeText || 'P0';
  totalTests.textContent = profile.totalTests + ' tests';
  rankProgressFill.style.width = progress.pct + '%';

  if (progress.next) {
    xpText.textContent = profile.xp + ' / ' + progress.next.xp + ' xp';
    prestigeBtn.classList.add('hidden');
  } else {
    xpText.textContent = profile.xp + ' xp';
    prestigeBtn.classList.toggle('hidden', profile.xp < PRESTIGE_XP_RESET);
  }
  renderWeakWords();
}

function renderWeakWords() {
  const weak = getWeakWords(8);
  weakWordList.innerHTML = '';
  weakResult.innerHTML = '';

  if (!weak.length) {
    weakWordList.textContent = 'No weak words yet';
    weakResult.textContent = 'Missed words will appear here after a few tests.';
    return;
  }

  weak.forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'weak-word-chip';
    chip.textContent = item.word + ' (' + item.misses + ')';
    weakWordList.appendChild(chip);
  });

  weak.slice(0, 5).forEach(item => {
    const chip = document.createElement('span');
    chip.className = 'weak-word-chip';
    chip.textContent = item.word;
    weakResult.appendChild(chip);
  });
}

function renderLeaderboard() {
  if (!leaderboardList || !speedBoardModes || !leaderboardTitle) return;
  const lb = loadLeaderboard();
  const entries = activeBoard === 'rank'
    ? (lb._ranks || [])
    : (lb[activeSpeedMode] || []);

  speedBoardModes.classList.toggle('hidden', activeBoard !== 'speed');
  leaderboardTitle.textContent = activeBoard === 'rank'
    ? 'highest rank'
    : getModeLabel(activeSpeedMode) + ' speed';

  leaderboardList.innerHTML = '';
  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'No scores yet';
    leaderboardList.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const item = document.createElement('li');
    const main = document.createElement('span');
    const meta = document.createElement('span');
    main.textContent = entry.name;
    if (activeBoard === 'rank') {
      meta.textContent = 'P' + entry.prestige + ' · ' + entry.rankName + ' · ' + entry.xp + ' xp';
    } else {
      meta.textContent = entry.wpm + ' wpm · ' + entry.accuracy + '%';
    }
    item.append(main, meta);
    leaderboardList.appendChild(item);
  });
}

function setActiveSpeedMode(modeKey) {
  activeSpeedMode = modeKey;
  document.querySelectorAll('[data-mode-key]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.modeKey === modeKey);
  });
}

function calculateConsistency(values) {
  const samples = (values || state.wpmSamples.map(s => s.wpm)).filter(wpm => wpm > 0);
  if (samples.length < 2) return samples.length ? 100 : 0;
  const avg = samples.reduce((sum, n) => sum + n, 0) / samples.length;
  if (avg <= 0) return 0;
  const variance = samples.reduce((sum, n) => sum + Math.pow(n - avg, 2), 0) / samples.length;
  const deviation = Math.sqrt(variance);
  return Math.max(0, Math.min(100, Math.round(100 - (deviation / avg) * 100)));
}

function drawWpmChart() {
  if (!wpmChart) return;
  const ctx = wpmChart.getContext('2d');
  const rect = wpmChart.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  wpmChart.width = Math.max(1, Math.floor(rect.width * dpr));
  wpmChart.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim();
  const correct = style.getPropertyValue('--correct').trim();
  const wrong = style.getPropertyValue('--wrong').trim();
  const dim = style.getPropertyValue('--text-dim').trim();
  const border = style.getPropertyValue('--border').trim();
  const samples = state.wpmSamples.length
    ? state.wpmSamples
    : [{ second: 0, wpm: 0, raw: 0, acc: 100, errors: 0, consistency: 0 }];
  const maxSpeed = Math.max(20, ...samples.map(s => Math.max(s.wpm || 0, s.raw || 0)));
  const maxErrors = Math.max(1, ...samples.map(s => s.errors || 0));
  const pad = 24;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = pad + ((height - pad * 2) / 3) * i;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(width - pad, y);
    ctx.stroke();
  }

  const xFor = (i) => samples.length === 1 ? pad : pad + (plotW * i) / (samples.length - 1);
  const ySpeed = (value) => height - pad - (plotH * value) / maxSpeed;
  const yPercent = (value) => height - pad - (plotH * value) / 100;
  const yErrors = (value) => height - pad - (plotH * value) / maxErrors;
  chartState = { samples, pad, plotW, width, height, xFor, ySpeed, yPercent };

  function drawLine(key, color, yScale, widthPx = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = widthPx;
    ctx.beginPath();
    samples.forEach((sample, i) => {
      const x = xFor(i);
      const y = yScale(sample[key] || 0);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  function drawBars(key, color, yScale) {
    const barW = Math.max(2, Math.min(10, plotW / Math.max(1, samples.length) - 2));
    ctx.fillStyle = color;
    samples.forEach((sample, i) => {
      const x = xFor(i) - barW / 2;
      const y = yScale(sample[key] || 0);
      ctx.fillRect(x, y, barW, height - pad - y);
    });
  }

  if (state.chartStyle === 'bars') {
    drawBars('raw', 'rgba(255,255,255,0.18)', ySpeed);
    drawBars('errors', wrong, yErrors);
    drawLine('wpm', accent, ySpeed, 2.4);
    drawLine('consistency', correct, yPercent, 1.6);
  } else {
    drawLine('raw', dim, ySpeed, 1.6);
    drawLine('wpm', accent, ySpeed, 2.5);
    drawLine('consistency', correct, yPercent, 1.8);
    drawLine('errors', wrong, yErrors, 1.8);
  }

  ctx.font = '11px ' + state.fontFamily + ', monospace';
  const legend = [
    ['wpm', accent],
    ['raw', dim],
    ['consistency', correct],
    ['errors', wrong],
  ];
  let lx = pad;
  legend.forEach(([label, color]) => {
    ctx.fillStyle = color;
    ctx.fillRect(lx, height - 10, 8, 2);
    ctx.fillText(label, lx + 12, height - 5);
    lx += ctx.measureText(label).width + 42;
  });

  const activeIndex = Number(wpmChart.dataset.activeIndex);
  if (!Number.isNaN(activeIndex) && samples[activeIndex]) {
    drawChartMarker(activeIndex);
  }
}

function drawChartMarker(index) {
  if (!chartState) return;
  const ctx = wpmChart.getContext('2d');
  const style = getComputedStyle(document.documentElement);
  const accent = style.getPropertyValue('--accent').trim();
  const sample = chartState.samples[index];
  const x = chartState.xFor(index);
  const y = chartState.yPercent(sample.consistency || 0);

  ctx.save();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.65;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, chartState.pad);
  ctx.lineTo(x, chartState.height - chartState.pad);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function showChartPoint(clientX) {
  if (!chartState || !chartState.samples.length) return;
  const rect = wpmChart.getBoundingClientRect();
  const x = Math.min(Math.max(clientX - rect.left, chartState.pad), chartState.width - chartState.pad);
  const rawIndex = chartState.samples.length === 1
    ? 0
    : Math.round(((x - chartState.pad) / chartState.plotW) * (chartState.samples.length - 1));
  const index = Math.max(0, Math.min(chartState.samples.length - 1, rawIndex));
  const sample = chartState.samples[index];
  wpmChart.dataset.activeIndex = String(index);
  drawWpmChart();

  chartTooltip.classList.remove('hidden');
  chartTooltip.innerHTML = `
    <span>${sample.second || 0}s</span>
    <span>${sample.consistency || 0}% consistency</span>
    <span>${sample.wpm || 0} wpm</span>
    <span>${sample.raw || 0} raw</span>
    <span>${sample.acc || 100}% acc</span>
    <span>${sample.errors || 0} errors</span>
  `;
}

/* ── Focus / Shortcuts ── */
typingContainer.addEventListener('click', () => typingInput.focus());
wpmChart.addEventListener('click', (e) => showChartPoint(e.clientX));
wpmChart.addEventListener('touchstart', (e) => {
  if (!e.touches.length) return;
  showChartPoint(e.touches[0].clientX);
}, { passive: true });

let tabDown = false;
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { tabDown = true; e.preventDefault(); }
  if (e.key === 'Enter' && tabDown) reset();
  if (e.key === 'Escape') {
    settingsOverlay.classList.add('hidden');
    privacyOverlay.classList.add('hidden');
  }
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
	    setupModeLabel.textContent = btn.textContent;
	    document.getElementById('wordCountOptions').classList.toggle('hidden', state.mode !== 'words');
	    document.getElementById('timeOptions').classList.toggle('hidden', state.mode !== 'time');
	    document.getElementById('aiOptions').classList.toggle('hidden', state.mode !== 'ai');
	    document.getElementById('weakOptions').classList.toggle('hidden', state.mode !== 'weak');
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
document.querySelectorAll('#weakOptions .sub-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#weakOptions .sub-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.weakCount = parseInt(btn.dataset.weakCount);
    reset();
  });
});

/* ── Restart ── */
document.getElementById('logoReset').addEventListener('click', reset);
document.getElementById('restartBtn').addEventListener('click', reset);
document.getElementById('resultsRestartBtn').addEventListener('click', reset);

document.getElementById('punctBtn').addEventListener('click', () => {
  state.punctuation = !state.punctuation;
  document.getElementById('punctBtn').classList.toggle('active', state.punctuation);
  reset();
  saveSettings();
});
document.getElementById('numbersBtn').addEventListener('click', () => {
  state.numbers = !state.numbers;
  document.getElementById('numbersBtn').classList.toggle('active', state.numbers);
  reset();
  saveSettings();
});

privacyBtn.addEventListener('click', () => privacyOverlay.classList.remove('hidden'));
closePrivacy.addEventListener('click', () => privacyOverlay.classList.add('hidden'));
privacyOverlay.addEventListener('click', (e) => {
  if (e.target === privacyOverlay) privacyOverlay.classList.add('hidden');
});

prestigeBtn.addEventListener('click', () => {
  if (profile.xp < PRESTIGE_XP_RESET) return;
  profile.prestige++;
  profile.xp = 0;
  saveProfile(profile);
  updateProfileUi();
});

document.querySelectorAll('[data-board]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-board]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeBoard = btn.dataset.board;
    renderLeaderboard();
  });
});

document.querySelectorAll('[data-mode-key]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-mode-key]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeSpeedMode = btn.dataset.modeKey;
    renderLeaderboard();
  });
});

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
    document.documentElement.style.setProperty('--font-family', getFontStack(state.fontFamily));
    remeasureAndReposition();
    saveSettings();
  });
});

function getFontStack(fontFamily) {
  if (fontFamily === 'Minecraftia') {
    return "'Minecraftia', 'Pixelify Sans', monospace";
  }
  return `'${fontFamily}', monospace`;
}

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

const textOpacitySlider = document.getElementById('textOpacitySlider');
const textOpacityVal = document.getElementById('textOpacityVal');
textOpacitySlider.addEventListener('input', () => {
  state.textOpacity = parseInt(textOpacitySlider.value);
  textOpacityVal.textContent = state.textOpacity + '%';
  applyDisplaySettings();
  saveSettings();
});

const testWidthSlider = document.getElementById('testWidthSlider');
const testWidthVal = document.getElementById('testWidthVal');
testWidthSlider.addEventListener('input', () => {
  state.testWidth = parseInt(testWidthSlider.value);
  testWidthVal.textContent = state.testWidth + 'px';
  applyDisplaySettings();
  remeasureAndReposition();
  saveSettings();
});

const panelRoundnessSlider = document.getElementById('panelRoundnessSlider');
const panelRoundnessVal = document.getElementById('panelRoundnessVal');
panelRoundnessSlider.addEventListener('input', () => {
  state.panelRoundness = parseInt(panelRoundnessSlider.value);
  panelRoundnessVal.textContent = state.panelRoundness + 'px';
  applyDisplaySettings();
  saveSettings();
});

const caretThicknessSlider = document.getElementById('caretThicknessSlider');
const caretThicknessVal = document.getElementById('caretThicknessVal');
caretThicknessSlider.addEventListener('input', () => {
  state.caretThickness = parseInt(caretThicknessSlider.value);
  caretThicknessVal.textContent = state.caretThickness + 'px';
  applyDisplaySettings();
  positionCaret();
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

function applyDisplaySettings() {
  document.documentElement.style.setProperty('--text-opacity', state.textOpacity / 100);
  document.documentElement.style.setProperty('--panel-radius', state.panelRoundness + 'px');
  document.documentElement.style.setProperty('--test-width', state.testWidth + 'px');
  document.documentElement.style.setProperty('--caret-thickness', state.caretThickness + 'px');
  liveWpm.parentElement.classList.toggle('hidden', !state.showLiveWpm);
  progressFill.parentElement.classList.toggle('hidden', !state.showProgress);
}

/* Cursor */
document.querySelectorAll('[data-cursor]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cursor]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.cursor = btn.dataset.cursor;
    document.body.setAttribute('data-cursor', state.cursor);
    positionCaret();
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
    if (state.sound) {
      ensureAudio();
      playClick(true);
    }
    saveSettings();
  });
});

document.querySelectorAll('[data-sound-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-sound-style]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.soundStyle = btn.dataset.soundStyle;
    playClick(true);
    saveSettings();
  });
});

document.querySelectorAll('[data-live-wpm]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-live-wpm]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.showLiveWpm = btn.dataset.liveWpm === 'on';
    applyDisplaySettings();
    saveSettings();
  });
});

document.querySelectorAll('[data-progress-vis]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-progress-vis]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.showProgress = btn.dataset.progressVis === 'on';
    applyDisplaySettings();
    saveSettings();
  });
});

document.querySelectorAll('[data-focus-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-focus-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.focusMode = btn.dataset.focusMode === 'on';
    saveSettings();
  });
});

document.querySelectorAll('[data-chart-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-chart-style]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.chartStyle = btn.dataset.chartStyle;
    if (state.finished) drawWpmChart();
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
    applyCustomColor(prop, e.target.value);
  });
});

document.getElementById('applyColors').addEventListener('click', () => {
  colorMap.forEach(({ id, prop }) => {
    applyCustomColor(prop, document.getElementById(id).value, false);
  });
  saveSettings();
});

function applyCustomColor(prop, value, shouldSave = true) {
  document.documentElement.style.setProperty(prop, value);
  if (prop === '--accent') document.documentElement.style.setProperty('--caret', value);
  state.customColors[prop] = value;
  if (shouldSave) saveSettings();
}

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
    const hex = toHexColor(val);
    if (hex) el.value = hex;
  });
}

function toHexColor(value) {
  if (value.startsWith('#') && value.length === 7) return value;
  const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  return '#' + [match[1], match[2], match[3]]
    .map(n => Math.max(0, Math.min(255, parseInt(n))).toString(16).padStart(2, '0'))
    .join('');
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
      soundStyle: state.soundStyle,
      chartStyle: state.chartStyle,
      showLiveWpm: state.showLiveWpm,
      showProgress: state.showProgress,
      focusMode: state.focusMode,
      textOpacity: state.textOpacity,
      panelRoundness: state.panelRoundness,
      testWidth: state.testWidth,
      caretThickness: state.caretThickness,
      punctuation: state.punctuation,
      numbers: state.numbers,
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
      document.documentElement.style.setProperty('--font-family', getFontStack(s.fontFamily));
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

    if (s.soundStyle) {
      state.soundStyle = s.soundStyle;
      document.querySelectorAll('[data-sound-style]').forEach(b =>
        b.classList.toggle('active', b.dataset.soundStyle === s.soundStyle));
    }

    if (s.chartStyle) {
      state.chartStyle = s.chartStyle;
      document.querySelectorAll('[data-chart-style]').forEach(b =>
        b.classList.toggle('active', b.dataset.chartStyle === s.chartStyle));
    }

    if (s.showLiveWpm !== undefined) {
      state.showLiveWpm = s.showLiveWpm;
      document.querySelectorAll('[data-live-wpm]').forEach(b =>
        b.classList.toggle('active', (b.dataset.liveWpm === 'on') === s.showLiveWpm));
    }

    if (s.showProgress !== undefined) {
      state.showProgress = s.showProgress;
      document.querySelectorAll('[data-progress-vis]').forEach(b =>
        b.classList.toggle('active', (b.dataset.progressVis === 'on') === s.showProgress));
    }

    if (s.focusMode !== undefined) {
      state.focusMode = s.focusMode;
      document.querySelectorAll('[data-focus-mode]').forEach(b =>
        b.classList.toggle('active', (b.dataset.focusMode === 'on') === s.focusMode));
    }

    if (s.textOpacity !== undefined) {
      state.textOpacity = s.textOpacity;
      textOpacitySlider.value = s.textOpacity;
      textOpacityVal.textContent = s.textOpacity + '%';
    }

    if (s.panelRoundness !== undefined) {
      state.panelRoundness = s.panelRoundness;
      panelRoundnessSlider.value = s.panelRoundness;
      panelRoundnessVal.textContent = s.panelRoundness + 'px';
    }

    if (s.testWidth !== undefined) {
      state.testWidth = s.testWidth;
      testWidthSlider.value = s.testWidth;
      testWidthVal.textContent = s.testWidth + 'px';
    }

    if (s.caretThickness !== undefined) {
      state.caretThickness = s.caretThickness;
      caretThicknessSlider.value = s.caretThickness;
      caretThicknessVal.textContent = s.caretThickness + 'px';
    }

    if (s.punctuation !== undefined) {
      state.punctuation = s.punctuation;
      document.getElementById('punctBtn').classList.toggle('active', state.punctuation);
    }

    if (s.numbers !== undefined) {
      state.numbers = s.numbers;
      document.getElementById('numbersBtn').classList.toggle('active', state.numbers);
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
    applyDisplaySettings();
  } catch {}
}

/* ── Init ── */
loadSettings();
reset();
updateProfileUi();
renderLeaderboard();
