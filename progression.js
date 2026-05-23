/* ── Rank Table ── */
const RANKS = [
  { name: 'Novice I',       xp: 0,       color: '#9ca3af', tier: 0 },
  { name: 'Novice II',      xp: 1200,    color: '#9ca3af', tier: 0 },
  { name: 'Novice III',     xp: 3200,    color: '#9ca3af', tier: 0 },
  { name: 'Apprentice I',   xp: 7000,    color: '#60a5fa', tier: 1 },
  { name: 'Apprentice II',  xp: 12500,   color: '#60a5fa', tier: 1 },
  { name: 'Apprentice III', xp: 20000,   color: '#60a5fa', tier: 1 },
  { name: 'Skilled I',      xp: 32000,   color: '#34d399', tier: 2 },
  { name: 'Skilled II',     xp: 48000,   color: '#34d399', tier: 2 },
  { name: 'Skilled III',    xp: 70000,   color: '#34d399', tier: 2 },
  { name: 'Expert I',       xp: 100000,  color: '#fbbf24', tier: 3 },
  { name: 'Expert II',      xp: 140000,  color: '#fbbf24', tier: 3 },
  { name: 'Expert III',     xp: 195000,  color: '#fbbf24', tier: 3 },
  { name: 'Master I',       xp: 270000,  color: '#f87171', tier: 4 },
  { name: 'Master II',      xp: 370000,  color: '#f87171', tier: 4 },
  { name: 'Master III',     xp: 505000,  color: '#f87171', tier: 4 },
  { name: 'Legend I',       xp: 685000,  color: '#c084fc', tier: 5 },
  { name: 'Legend II',      xp: 925000,  color: '#c084fc', tier: 5 },
  { name: 'Legend III',     xp: 1240000, color: '#c084fc', tier: 5 },
  { name: 'Mythic',         xp: 1650000, color: '#f9a825', tier: 6 },
];

const PRESTIGE_STARS = ['', '✦', '✦✦', '✦✦✦', '✦✦✦✦', '✦✦✦✦✦'];
const PRESTIGE_XP_RESET = 1650000; // xp threshold to enable prestige

function defaultProfile(name) {
  return {
    name,
    xp: 0,
    prestige: 0,
    totalTests: 0,
    totalXpEarned: 0,
  };
}

/* ── Profile Storage ── */
function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem('typeflow_profile') || 'null') || defaultProfile('Player');
  } catch { return defaultProfile('Guest'); }
}

function saveProfile(profile) {
  try { localStorage.setItem('typeflow_profile', JSON.stringify(profile)); } catch {}
}

function normalizePracticeWord(word) {
  return word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

function recordWordResult(word, wasCorrect) {
  const clean = normalizePracticeWord(word);
  if (!clean) return;
  const profile = loadProfile();
  if (!profile.wordStats) profile.wordStats = {};
  if (!profile.wordStats[clean]) profile.wordStats[clean] = { attempts: 0, misses: 0 };
  profile.wordStats[clean].attempts++;
  if (!wasCorrect) profile.wordStats[clean].misses++;
  saveProfile(profile);
}

function getWeakWords(limit = 12) {
  const profile = loadProfile();
  const stats = profile.wordStats || {};
  return Object.entries(stats)
    .filter(([, data]) => data.misses > 0)
    .map(([word, data]) => ({
      word,
      attempts: data.attempts,
      misses: data.misses,
      score: data.misses * 2 + (data.misses / Math.max(1, data.attempts)),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/* ── Rank Calculation ── */
function getRankForXp(xp) {
  let rank = RANKS[0];
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].xp) { rank = RANKS[i]; break; }
  }
  return rank;
}

function getNextRank(xp) {
  for (let i = 0; i < RANKS.length; i++) {
    if (RANKS[i].xp > xp) return RANKS[i];
  }
  return null; // at Mythic
}

function getRankProgress(xp) {
  const current = getRankForXp(xp);
  const next = getNextRank(xp);
  if (!next) return { pct: 100, current, next: null, xpIntoRank: 0, xpNeeded: 0 };
  const xpIntoRank = xp - current.xp;
  const xpNeeded = next.xp - current.xp;
  return { pct: (xpIntoRank / xpNeeded) * 100, current, next, xpIntoRank, xpNeeded };
}

/* ── XP Calculation ── */
function calcXpEarned(wpm, accuracy, elapsedSeconds) {
  const accFactor = accuracy / 100;
  const base = wpm * accFactor * 0.7;
  const timeBonus = Math.min(elapsedSeconds, 120) / 35;
  const accBonus = accuracy >= 100 ? 8 : accuracy >= 98 ? 4 : accuracy >= 95 ? 1 : 0;
  const penalty = accuracy < 90 ? 0.55 : accuracy < 95 ? 0.8 : 1;
  return Math.max(1, Math.round((base + timeBonus + accBonus) * penalty));
}

/* ── Leaderboard ── */
function loadLeaderboard() {
  try { return JSON.parse(localStorage.getItem('typeflow_leaderboard') || '{}'); } catch { return {}; }
}

function saveLeaderboard(lb) {
  try { localStorage.setItem('typeflow_leaderboard', JSON.stringify(lb)); } catch {}
}

function submitScore(name, wpm, accuracy, modeKey) {
  const lb = loadLeaderboard();
  if (!lb[modeKey]) lb[modeKey] = [];
  lb[modeKey].push({ name, wpm, accuracy, date: new Date().toLocaleDateString() });
  lb[modeKey].sort((a, b) => b.wpm - a.wpm);
  lb[modeKey] = lb[modeKey].slice(0, 10);
  saveLeaderboard(lb);
}

function submitRankScore(name, xp, prestige, rankName) {
  const lb = loadLeaderboard();
  if (!lb['_ranks']) lb['_ranks'] = [];
  // remove old entry for this name
  lb['_ranks'] = lb['_ranks'].filter(e => e.name !== name);
  lb['_ranks'].push({ name, xp, prestige, rankName, date: new Date().toLocaleDateString() });
  lb['_ranks'].sort((a, b) => (b.prestige * 1e9 + b.xp) - (a.prestige * 1e9 + a.xp));
  lb['_ranks'] = lb['_ranks'].slice(0, 10);
  saveLeaderboard(lb);
}

function getModeKey(mode, wordCount, timeLimit) {
  if (mode === 'words') return `words_${wordCount}`;
  if (mode === 'time')  return `time_${timeLimit}`;
  return 'ai';
}

function getModeLabel(modeKey) {
  const map = {
    words_25: '25 words', words_50: '50 words', words_100: '100 words',
    time_15: '15 sec', time_30: '30 sec', time_60: '60 sec',
    ai: 'AI paragraph',
    weak: 'Weak words',
  };
  return map[modeKey] || modeKey;
}

/* ── Feedback Engine ── */
function generateFeedback(wpm, accuracy, consistency, mode) {
  const tips = [];

  // Speed feedback
  if (wpm < 25) {
    tips.push('Focus on accuracy over speed right now — your fingers are still learning the keyboard layout.');
  } else if (wpm < 45) {
    tips.push('Try to keep your eyes on the screen, not your hands. Touch typing builds muscle memory faster.');
  } else if (wpm < 65) {
    tips.push('You\'re in a great growth zone. Practice words with double letters and common suffixes like "-ing" and "-tion".');
  } else if (wpm < 90) {
    tips.push('At this level, focus on eliminating hesitation on less common letters like Q, Z, X. Targeted drills help.');
  } else if (wpm < 120) {
    tips.push('You\'re an advanced typist. Gains now come from reducing micro-pauses between words, not individual keys.');
  } else {
    tips.push('Elite speed! Work on burst typing — sprinting through short common words as single units.');
  }

  // Accuracy feedback
  if (accuracy < 88) {
    tips.push('Accuracy below 88% means you\'re building bad habits. Slow down by 20% until you can hit 95%+ consistently.');
  } else if (accuracy < 94) {
    tips.push('Good accuracy. Identify your most frequent mistyped keys and do focused drills on those letter pairs.');
  } else if (accuracy >= 99) {
    tips.push('Near-perfect accuracy! You can safely push your speed — the muscle memory is there.');
  }

  // Consistency feedback
  if (consistency < 65) {
    tips.push('High variance in your WPM suggests you\'re rushing some words and hesitating on others. Try typing to a metronome beat.');
  } else if (consistency < 80) {
    tips.push('Work on maintaining a steady rhythm. Common words should flow at your max speed; unfamiliar words slow you down.');
  }

  // Mode-specific tip
  if (mode === 'time' && wpm > 60) {
    tips.push('In timed mode, don\'t sacrifice accuracy for speed — each error costs more than the time saved.');
  }
  if (mode === 'ai' && accuracy < 95) {
    tips.push('Paragraph typing includes punctuation and capitalization. Practice those specifically to reduce errors.');
  }

  return tips.slice(0, 3);
}
