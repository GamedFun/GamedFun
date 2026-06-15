const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");
const scoreEl = document.querySelector("#score");
const lengthEl = document.querySelector("#length");
const predatorEl = document.querySelector("#predator");
const biomeEl = document.querySelector("#biome");
const leftButton = document.querySelector("#leftButton");
const rightButton = document.querySelector("#rightButton");
const boostButton = document.querySelector("#boostButton");
const touchBoostButton = document.querySelector("#touchBoostButton");
const overlayStats = document.querySelector("#overlayStats");
const boardEl = document.querySelector("#board");
const muteButton = document.querySelector("#muteButton");
const shareButton = document.querySelector("#shareButton");
const nameInput = document.querySelector("#nameInput");

const world = { width: 2800, height: 1780 };
const biomes = [
  {
    name: "Meadow",
    threshold: 0,
    colors: ["#071715", "#102b22", "#1d2a16"],
    glow: ["rgba(80,255,154,0.13)", "rgba(217,255,69,0.1)"],
    rivals: ["Field Fox", "Pond Heron", "Grass Viper", "Moth Swarm"],
    difficulty: 0
  },
  {
    name: "Wetlands",
    threshold: 350,
    colors: ["#071a1b", "#0b3140", "#163328"],
    glow: ["rgba(56,197,255,0.14)", "rgba(80,255,154,0.1)"],
    rivals: ["Marsh Gator", "River Otter", "Reed Hawk", "Bullfrog Pack"],
    difficulty: 1
  },
  {
    name: "Rainforest",
    threshold: 800,
    colors: ["#081812", "#163b25", "#281f36"],
    glow: ["rgba(80,255,154,0.15)", "rgba(176,113,255,0.12)"],
    rivals: ["Jaguar", "Harpy Eagle", "Tree Python", "Poison Dart"],
    difficulty: 2
  },
  {
    name: "Savanna",
    threshold: 1400,
    colors: ["#171305", "#423018", "#301621"],
    glow: ["rgba(255,213,78,0.14)", "rgba(255,79,109,0.1)"],
    rivals: ["Lion Pride", "Hyena Clan", "Cheetah", "Horned Rhino"],
    difficulty: 3
  },
  {
    name: "Apex Rift",
    threshold: 2200,
    colors: ["#090912", "#211427", "#10253a"],
    glow: ["rgba(255,79,109,0.16)", "rgba(56,197,255,0.13)", "rgba(255,255,255,0.08)"],
    rivals: ["Mega Shark", "Storm Eagle", "Titan Bear", "Apex Dragon"],
    difficulty: 4
  }
];
const predatorTiers = [
  { name: "Mouse", color: "#50ff9a", accent: "#a8ffd0", radius: 15, speed: 210, animal: "mouse" },
  { name: "Fox", color: "#d9ff45", accent: "#eeffa6", radius: 16, speed: 218, animal: "fox" },
  { name: "Wolf", color: "#38c5ff", accent: "#a6ecff", radius: 17, speed: 226, animal: "wolf" },
  { name: "Panther", color: "#b071ff", accent: "#ead7ff", radius: 18, speed: 234, animal: "cat" },
  { name: "Eagle", color: "#ff4f6d", accent: "#ff9bab", radius: 20, speed: 242, animal: "bird" },
  { name: "Shark", color: "#ffd54e", accent: "#fff59a", radius: 22, speed: 250, animal: "shark" },
  { name: "Dragon", color: "#ffffff", accent: "#ffd54e", radius: 24, speed: 258, animal: "dragon" }
];
const foods = [
  { name: "grass", color: "#d9ff45", accent: "#77f05f", value: 8, radius: 8, shape: "leaf" },
  { name: "berry", color: "#ff4f6d", accent: "#ff9bab", value: 12, radius: 9, shape: "berry" },
  { name: "fish", color: "#38c5ff", accent: "#a6ecff", value: 16, radius: 10, shape: "fish" },
  { name: "mushroom", color: "#b071ff", accent: "#ead7ff", value: 22, radius: 12, shape: "cap" },
  { name: "golden seed", color: "#ffd54e", accent: "#fff59a", value: 34, radius: 14, shape: "star" }
];
const powerUpTypes = [
  { type: "magnet", name: "Magnet", color: "#38c5ff", accent: "#a6ecff", duration: 7 },
  { type: "shield", name: "Shield", color: "#50ff9a", accent: "#ddff45", duration: 10 },
  { type: "surge", name: "Surge", color: "#ffd54e", accent: "#ffb340", duration: 5 }
];

const rivalNames = [
  "xX_Hunter_Xx", "Kai", "noobslayer", "dino4ever", "Milo", "sneaky_snek",
  "BIG_BEAR", "Zara", "toothy", "grasseater9", "Finn", "apexx", "wormy",
  "Luna", "chomper_22", "Rex_King", "quickfox", "Ivy", "MAX_POWER",
  "silentpaw", "Juno", "bitey", "Ozzy", "ShadowFang"
];

let runKills = 0;
let runStartedAt = 0;
let shareText = "";
let lastBoardUpdate = 0;
let soundMuted = (() => {
  try { return localStorage.getItem("food-chain-muted") === "1"; } catch { return false; }
})();
let audioCtx = null;

function sfxTone(freq, dur, type = "sine", vol = 0.12, slide) {
  if (soundMuted) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  } catch {}
}
function sfxEat(value = 8) { sfxTone(380 + value * 8, 0.09, "sine", 0.07, 640 + value * 8); }
function sfxBite() { sfxTone(220, 0.16, "triangle", 0.13, 420); sfxTone(330, 0.2, "sine", 0.07, 560); }
function sfxPower() { sfxTone(523, 0.12, "sine", 0.1, 660); }
function sfxEvolve() { sfxTone(392, 0.14, "sine", 0.11, 523); setTimeout(() => sfxTone(523, 0.22, "sine", 0.11, 784), 110); }
function sfxDeath() { sfxTone(180, 0.5, "triangle", 0.14, 55); }

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
}

function playerName() {
  let stored = "";
  try { stored = localStorage.getItem("food-chain-name") || ""; } catch {}
  const value = (nameInput && nameInput.value ? nameInput.value : stored).trim().slice(0, 14);
  return value || "You";
}

const keys = new Set();
const pointer = { active: false, x: 0, y: 0 };

let game;
let lastTime = 0;
let animationFrame = 0;

function newGame() {
  runKills = 0;
  runStartedAt = performance.now();
  try { localStorage.setItem("food-chain-name", playerName()); } catch {}
  game = {
    running: true,
    paused: false,
    over: false,
    score: 0,
    bestScore: readBestScore(),
    distance: 0,
    biomeIndex: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    player: makeSnake(playerName(), world.width * 0.5, world.height * 0.5, "#4ee38a", true),
    rivals: [],
    food: [],
    foodSparkles: [],
    powerUps: [],
    effects: { magnet: 0, shield: 0, surge: 0 },
    terrain: makeTerrain(0),
    particles: [],
    shockwaves: [],
    playerPath: [],
    pathTimer: 0,
    motes: makeMotes(0),
    weather: makeWeather(0),
    flash: { color: "#ffffff", time: 0, duration: 1 },
    shake: 0,
    scorePulse: 0,
    biomeRipple: { time: 0, duration: 1, color: "#ffffff" },
    biomeReveal: { time: 0, duration: 1, name: "Meadow", color: "#50ff9a" },
    formReveal: { time: 0, duration: 1, name: "Mouse", color: "#50ff9a" },
    evolutionBurst: { time: 0, duration: 1, name: "Mouse", color: "#50ff9a" },
    readyPulse: { time: 1.25, duration: 1.25 },
    bannerText: "",
    bannerTime: 0,
    combo: 0,
    comboTime: 0,
    nearMissCooldown: 0,
    message: "Eat smaller links. Dodge larger chains."
  };

  overlay.querySelector(".kicker").textContent = "Eat. Grow. Clash.";
  overlay.querySelector("h1").textContent = "Become the top predator";
  overlay.querySelector("p").textContent = "Collect food, grab power-ups, eat smaller chains, and avoid bigger predators until you evolve.";
  setOverlayStats();
  startButton.textContent = "Play";
  for (let index = 0; index < 4; index += 1) game.rivals.push(makeRival(index));
  for (let index = 0; index < 130; index += 1) spawnFood();
  for (let index = 0; index < 5; index += 1) spawnPowerUp();
  document.body.classList.add("game-active");
  document.body.classList.remove("game-paused");
  document.body.classList.remove("game-over");
  document.body.classList.remove("new-best");
  overlay.classList.add("hidden");
  lastTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(loop);
}

function resumeGame() {
  if (!game.paused) return;
  game.paused = false;
  game.running = true;
  document.body.classList.add("game-active");
  document.body.classList.remove("game-paused");
  document.body.classList.remove("game-over");
  document.body.classList.remove("new-best");
  overlay.classList.add("hidden");
  lastTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(loop);
}

function pauseGame() {
  if (!game.running || game.over) return;
  game.running = false;
  game.paused = true;
  document.body.classList.remove("game-active");
  document.body.classList.add("game-paused");
  document.body.classList.remove("game-over");
  document.body.classList.remove("new-best");
  overlay.classList.remove("hidden");
  overlay.querySelector(".kicker").textContent = "Paused";
  overlay.querySelector("h1").textContent = "Food web held";
  overlay.querySelector("p").textContent = `Score ${Math.round(game.score)}. Form ${getPredatorTier().name}. Biome ${getBiome().name}.`;
  setOverlayStats();
  startButton.textContent = "Resume";
}

function makeSnake(name, x, y, color, player = false) {
  const tier = predatorTiers[0];
  const angle = Math.random() * Math.PI * 2;
  const snake = {
    name,
    x,
    y,
    angle,
    targetAngle: angle,
    color: player ? tier.color : color,
    animal: player ? tier.animal : randomAnimal(),
    player,
    speed: player ? tier.speed : 150 + Math.random() * 42,
    radius: player ? tier.radius : 13,
    length: player ? 22 : 18 + Math.floor(Math.random() * 20),
    tierIndex: player ? 0 : -1,
    health: 100,
    boost: 100,
    turn: 0,
    aiTimer: 0,
    segments: []
  };
  for (let index = 0; index < snake.length; index += 1) {
    snake.segments.push({ x: x - Math.cos(angle) * index * 10, y: y - Math.sin(angle) * index * 10 });
  }
  return snake;
}

function makeRival(index = 0) {
  const biome = biomes[game?.biomeIndex || 0];
  const colors = ["#38c5ff", "#ff4f6d", "#b071ff", "#ffd54e", "#50ff9a"];
  const playerLength = game?.player?.length || 22;
  const sizeRoles = [
    { name: "", scale: 0.72, bonus: 0 },
    { name: "", scale: 0.95, bonus: biome.difficulty * 4 },
    { name: "Greater ", scale: 1.22, bonus: 8 + biome.difficulty * 7 },
    { name: "Alpha ", scale: 1.55, bonus: 16 + biome.difficulty * 10 },
    { name: "Elder ", scale: 1.9, bonus: 26 + biome.difficulty * 14 }
  ];
  const role = sizeRoles[index % sizeRoles.length];
  const baseLength = Math.max(
    12,
    Math.round(playerLength * role.scale + role.bonus + random(-5, 8))
  );
  const rival = makeSnake(
    rivalNames[Math.floor(Math.random() * rivalNames.length)],
    0,
    0,
    colors[(index + biome.difficulty) % colors.length]
  );
  const spawn = getSafeSpawnPoint();
  rival.x = spawn.x;
  rival.y = spawn.y;
  rival.length = baseLength;
  rival.speed = 152 + biome.difficulty * 18 + Math.random() * 34 + (role.scale > 1 ? 8 : 0);
  rival.radius = 13 + biome.difficulty * 1.4 + Math.max(0, role.scale - 1) * 3;
  rival.animal = randomAnimal(biome.difficulty);
  rival.roleScale = role.scale;
  rival.rank = role.name ? role.name.trim() : role.scale > 1 ? "Greater" : "Scout";
  rival.segments = [];
  for (let segment = 0; segment < rival.length; segment += 1) {
    rival.segments.push({
      x: rival.x - Math.cos(rival.angle) * segment * 10,
      y: rival.y - Math.sin(rival.angle) * segment * 10
    });
  }
  rival.spawnTime = 1.15;
  rival.spawnDuration = 1.15;
  return rival;
}

function loop(time) {
  const dt = Math.min((time - lastTime) / 1000, 0.035);
  lastTime = time;
  update(dt);
  draw();
  if (game.running) animationFrame = requestAnimationFrame(loop);
}

function update(dt) {
  updatePredatorTier();
  updateBiome();
  updatePowerUps(dt);
  updateFoodSparkles(dt);
  updatePlayerInput(dt);
  updateSnake(game.player, dt);
  updatePlayerPath(dt);
  for (const rival of game.rivals) {
    if (rival.spawnTime > 0) rival.spawnTime = Math.max(0, rival.spawnTime - dt);
    updateRival(rival, dt);
    updateSnake(rival, dt);
  }
  eatFood(game.player);
  for (const rival of game.rivals) eatFood(rival);
  collectPowerUps();
  checkClashes();
  updateParticles(dt);
  updateShockwaves(dt);
  updateMotes(dt);
  updateWeather(dt);
  updateBanner(dt);
  updateCombo(dt);
  updateBiomeReveal(dt);
  updateFormReveal(dt);
  updateEvolutionBurst(dt);
  updateReadyPulse(dt);
  updateScreenEffects(dt);
  if (game.nearMissCooldown > 0) game.nearMissCooldown = Math.max(0, game.nearMissCooldown - dt);
  updateHud();
}

function updatePlayerInput(dt) {
  const player = game.player;
  let turn = 0;
  if (keys.has("arrowleft") || keys.has("a")) turn -= 1;
  if (keys.has("arrowright") || keys.has("d")) turn += 1;
  if (leftButton.classList.contains("active")) turn -= 1;
  if (rightButton.classList.contains("active")) turn += 1;
  player.angle += turn * dt * 3.9;

  if (pointer.active) {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    player.targetAngle = Math.atan2(pointer.y - cy, pointer.x - cx);
    player.angle = turnToward(player.angle, player.targetAngle, dt * 5.2);
  }
}

function updateRival(snake, dt) {
  snake.aiTimer -= dt;
  const player = game.player;
  const dx = player.x - snake.x;
  const dy = player.y - snake.y;
  const distance = Math.hypot(dx, dy);

  if (distance < 360 && player.length < snake.length - 6) {
    snake.targetAngle = Math.atan2(dy, dx);
  } else if (distance < 280 && player.length > snake.length) {
    snake.targetAngle = Math.atan2(-dy, -dx);
  } else if (snake.aiTimer <= 0) {
    const nearest = nearestFood(snake);
    snake.targetAngle = nearest
      ? Math.atan2(nearest.y - snake.y, nearest.x - snake.x)
      : Math.random() * Math.PI * 2;
    snake.aiTimer = 0.7 + Math.random() * 1.2;
  }

  snake.angle = turnToward(snake.angle, snake.targetAngle, dt * 2.4);
}

function updateSnake(snake, dt) {
  const boosting = snake.player && isBoostHeld() && snake.boost > 1 && snake.length > 8;
  const surge = snake.player && game.effects.surge > 0;
  const pace = snake.speed * (boosting ? 1.72 : 1) * (surge ? 1.28 : 1);
  if (boosting) {
    snake.boost = Math.max(0, snake.boost - dt * 34);
    snake.length = Math.max(8, snake.length - dt * 2.8);
    if (Math.random() < 0.45) {
      game.particles.push({
        x: snake.x - Math.cos(snake.angle) * snake.radius,
        y: snake.y - Math.sin(snake.angle) * snake.radius,
        vx: -Math.cos(snake.angle) * random(25, 90) + random(-20, 20),
        vy: -Math.sin(snake.angle) * random(25, 90) + random(-20, 20),
        color: "#ffd54e",
        radius: random(2, 5),
        life: 0.55
      });
    }
  } else if (snake.player && isBoostHeld() && snake.boost <= 1 && Math.random() < 0.18) {
    game.particles.push({
      x: snake.x + random(-snake.radius, snake.radius),
      y: snake.y + random(-snake.radius, snake.radius),
      vx: random(-18, 18),
      vy: random(-18, 18),
      color: "#ffb340",
      radius: random(1.4, 3.2),
      life: 0.42
    });
  } else {
    snake.boost = Math.min(100, snake.boost + dt * 12);
  }

  if (Math.random() < dt * (snake.player ? 3.8 : 1.35)) {
    game.particles.push({
      x: snake.x - Math.cos(snake.angle) * snake.radius * 1.4 + random(-6, 6),
      y: snake.y - Math.sin(snake.angle) * snake.radius * 1.4 + random(-6, 6),
      vx: -Math.cos(snake.angle) * random(6, 22) + random(-8, 8),
      vy: -Math.sin(snake.angle) * random(6, 22) + random(-8, 8),
      color: snake.player ? getPredatorTier().color : snake.color,
      radius: random(1.1, snake.player ? 2.8 : 2.1),
      life: random(0.35, 0.7),
      soft: true
    });
  }

  const oldX = snake.x;
  const oldY = snake.y;
  snake.x = clamp(snake.x + Math.cos(snake.angle) * pace * dt, 30, world.width - 30);
  snake.y = clamp(snake.y + Math.sin(snake.angle) * pace * dt, 30, world.height - 30);
  if (snake.player) game.distance += Math.hypot(snake.x - oldX, snake.y - oldY);

  snake.segments.unshift({ x: snake.x, y: snake.y });
  const maxSegments = Math.round(snake.length);
  while (snake.segments.length > maxSegments) snake.segments.pop();
}

function updatePlayerPath(dt) {
  if (!game.playerPath) game.playerPath = [];
  const player = game.player;
  game.pathTimer = (game.pathTimer || 0) - dt;
  const movingFast = isBoostHeld() || game.effects.surge > 0;
  if (game.pathTimer <= 0) {
    const tier = getPredatorTier();
    game.playerPath.unshift({
      x: player.x,
      y: player.y,
      angle: player.angle,
      color: movingFast ? "#ffd54e" : tier.color,
      radius: player.radius,
      life: movingFast ? 1.35 : 1.05,
      duration: movingFast ? 1.35 : 1.05,
      boosted: movingFast
    });
    game.pathTimer = movingFast ? 0.035 : 0.075;
  }
  for (let index = game.playerPath.length - 1; index >= 0; index -= 1) {
    const mark = game.playerPath[index];
    mark.life -= dt;
    if (mark.life <= 0 || index > 70) game.playerPath.splice(index, 1);
  }
}

function isBoostHeld() {
  return keys.has(" ") || boostButton.classList.contains("active") || touchBoostButton?.classList.contains("active");
}

function eatFood(snake) {
  if (snake.player && game.effects.magnet > 0) pullFoodTowardPlayer();
  for (let index = game.food.length - 1; index >= 0; index -= 1) {
    const food = game.food[index];
    if (distance(snake, food) < snake.radius + food.radius) {
      game.food.splice(index, 1);
      snake.length += food.value / 9;
      if (snake.player) {
        const points = game.effects.surge > 0 ? Math.round(food.value * 1.5) : food.value;
        addCombo(points, food.color);
        game.score += points;
        game.scorePulse = 0.35;
        game.message = `${food.name} joined your chain`;
        popText(food.x, food.y, `+${points}`, food.color, game.combo > 1 ? 1.25 : 1);
        collectRipple(food.x, food.y, food.color, food.accent, food.shape, food.value >= 22 ? 1.35 : 1);
        if (food.value >= 22) scoreSpark(food.x, food.y, food.accent, 7);
        sfxEat(food.value);
      }
      burst(food.x, food.y, food.color, 8);
      spawnFood();
    }
  }
}

function pullFoodTowardPlayer() {
  const player = game.player;
  for (const food of game.food) {
    const dx = player.x - food.x;
    const dy = player.y - food.y;
    const d = Math.hypot(dx, dy);
    if (d > 1 && d < 240) {
      const pull = (240 - d) / 240;
      food.x += (dx / d) * pull * 8;
      food.y += (dy / d) * pull * 8;
    }
  }
}

function updatePowerUps(dt) {
  for (const key of Object.keys(game.effects)) {
    game.effects[key] = Math.max(0, game.effects[key] - dt);
  }
  if (game.powerUps.length < 5 && Math.random() < dt * 0.28) spawnPowerUp();
}

function collectPowerUps() {
  const player = game.player;
  for (let index = game.powerUps.length - 1; index >= 0; index -= 1) {
    const powerUp = game.powerUps[index];
    if (distance(player, powerUp) < player.radius + powerUp.radius) {
      game.powerUps.splice(index, 1);
      game.effects[powerUp.type] = Math.max(game.effects[powerUp.type], powerUp.duration);
      addCombo(25, powerUp.color);
      game.score += 25;
      game.scorePulse = 0.5;
      game.message = `${powerUp.name} power-up`;
      popText(powerUp.x, powerUp.y, powerUp.name, powerUp.color, 1.2);
      collectRipple(powerUp.x, powerUp.y, powerUp.color, powerUp.accent, powerUp.type, 1.65);
      scoreSpark(powerUp.x, powerUp.y, powerUp.accent, 10);
      showBanner(powerUp.name);
      sfxPower();
      triggerImpact(powerUp.color, 0.5, 3);
      addShockwave(powerUp.x, powerUp.y, powerUp.color, 1.15);
      burst(powerUp.x, powerUp.y, powerUp.color, 28);
      spawnPowerUp();
    }
  }
}

function checkClashes() {
  const player = game.player;
  for (const rival of game.rivals) {
    checkNearMiss(rival);
    const headHit = distance(player, rival) < player.radius + rival.radius;
    if (headHit) {
      if (canEatChain(player, rival)) {
        consumeRival(rival);
      } else if (useShield(rival)) {
        return;
      } else {
        endGame("That chain was too big to eat.");
      }
      return;
    }

    for (let index = 8; index < rival.segments.length; index += 3) {
      if (distance(player, rival.segments[index]) < player.radius + 4) {
        if (canEatChain(player, rival)) {
          consumeRival(rival);
        } else if (useShield(rival)) {
          return;
        } else {
          endGame("Only smaller chains can be eaten.");
        }
        return;
      }
    }

    for (let index = 8; index < player.segments.length; index += 3) {
      if (distance(rival, player.segments[index]) < rival.radius + 4) {
        if (canEatChain(player, rival)) {
          consumeRival(rival);
        } else if (useShield(rival)) {
          return;
        } else {
          endGame("A bigger chain hit your body.");
        }
        return;
      }
    }
  }
}

function checkNearMiss(rival) {
  const player = game.player;
  if (game.nearMissCooldown > 0 || canEatChain(player, rival)) return;
  const dangerRange = player.radius + rival.radius + 24;
  let closePoint = null;
  let closeDistance = distance(player, rival);
  if (closeDistance < dangerRange) {
    closePoint = { x: rival.x, y: rival.y };
  }

  if (!closePoint) {
    for (let index = 8; index < rival.segments.length; index += 4) {
      const point = rival.segments[index];
      const d = distance(player, point);
      if (d < dangerRange && d < closeDistance) {
        closeDistance = d;
        closePoint = point;
      }
    }
  }

  if (!closePoint) return;
  const angle = Math.atan2(player.y - closePoint.y, player.x - closePoint.x);
  game.nearMissCooldown = 0.75;
  game.message = "Close scrape";
  popText(player.x, player.y - player.radius * 2, "CLOSE", "#ffd54e", 0.9);
  scrapeSparks(
    player.x - Math.cos(angle) * player.radius * 0.4,
    player.y - Math.sin(angle) * player.radius * 0.4,
    angle,
    "#ffd54e"
  );
}

function canEatChain(hunter, prey) {
  return hunter.length > prey.length;
}

function useShield(rival) {
  if (game.effects.shield <= 0) return false;
  game.effects.shield = 0;
  game.message = "Shield blocked a bigger chain";
  showBanner("Shield break");
  triggerImpact("#50ff9a", 0.42, 8);
  addShockwave(game.player.x, game.player.y, "#50ff9a", 1.45, "shield");
  shieldShardBurst(game.player.x, game.player.y, "#50ff9a");
  burst(game.player.x, game.player.y, "#50ff9a", 34);
  const away = Math.atan2(rival.y - game.player.y, rival.x - game.player.x);
  rival.x = clamp(rival.x + Math.cos(away) * 130, 60, world.width - 60);
  rival.y = clamp(rival.y + Math.sin(away) * 130, 60, world.height - 60);
  return true;
}

function consumeRival(rival) {
  const player = game.player;
  const eatenName = rival.name;
  const points = Math.round(rival.length * 6);
  addCombo(points, rival.color, 1.8);
  game.score += points;
  game.scorePulse = 0.6;
  player.length += rival.length * 0.28;
  popText(rival.x, rival.y, `+${points}`, rival.color, 1.55);
  if (points >= 180) popText(rival.x, rival.y - 30, "FEAST", "#ffd54e", 1.15);
  collectRipple(rival.x, rival.y, rival.color, "#ffffff", "bite", 1.9);
  biteBurst(rival.x, rival.y, rival.color, player.color);
  scoreSpark(rival.x, rival.y, rival.color, 14);
  triggerImpact(rival.color, 0.38, 7);
  addShockwave(rival.x, rival.y, rival.color, 1.35, "bite");
  burst(rival.x, rival.y, rival.color, 26);
  Object.assign(rival, makeRival(Math.floor(Math.random() * 4)));
  runKills += 1;
  sfxBite();
  game.message = `${eatenName} was smaller, so you ate it`;
}

function draw() {
  resizeCanvas();
  const scaleX = canvas.width / canvas.clientWidth;
  const scaleY = canvas.height / canvas.clientHeight;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const targetZoom = getCameraZoom();
  game.camera.zoom += (targetZoom - game.camera.zoom) * 0.06;
  const viewWidth = canvas.clientWidth / game.camera.zoom;
  const viewHeight = canvas.clientHeight / game.camera.zoom;
  const lookAhead = Math.min(150, 55 + game.player.length * 0.55);
  const cameraTargetX = game.player.x + Math.cos(game.player.angle) * lookAhead;
  const cameraTargetY = game.player.y + Math.sin(game.player.angle) * lookAhead;
  game.camera.x = clamp(cameraTargetX - viewWidth / 2, 0, world.width - viewWidth);
  game.camera.y = clamp(cameraTargetY - viewHeight / 2, 0, world.height - viewHeight);
  ctx.save();
  ctx.scale(game.camera.zoom, game.camera.zoom);
  const shakeX = game.shake ? random(-game.shake, game.shake) : 0;
  const shakeY = game.shake ? random(-game.shake, game.shake) : 0;
  ctx.translate(-game.camera.x + shakeX, -game.camera.y + shakeY);

  drawWorld();
  drawBiomeRipple();
  drawFoodSparkles();
  drawMagnetThreads();
  drawDangerTethers();
  drawEncounterZones();
  drawPowerUpTethers();
  drawFoodChainWeb();
  drawScentTrails();
  drawAimGuide();
  drawPlayerPathEcho();
  drawPickupHotspots();
  for (const food of game.food) drawFood(food);
  for (const powerUp of game.powerUps) drawPowerUp(powerUp);
  drawHuntMarker();
  for (const rival of game.rivals) drawRivalSpawnPortal(rival);
  for (const rival of game.rivals) drawSnake(rival);
  drawPlayerEffectAura();
  drawSnake(game.player);
  for (const shockwave of game.shockwaves) drawShockwave(shockwave);
  for (const particle of game.particles) drawParticle(particle);
  ctx.restore();

  drawScreenVignette();
  drawBiomeCameraWash();
  drawScreenTexture();
  drawCameraGlass();
  drawBiomeForegroundWeather();
  drawBoostPressure();
  drawComboSurge();
  drawStreakWakeOverlay();
  drawScorePulseBurst();
  drawSpeedLines();
  drawMotionGlints();
  drawEdgeWarning();
  drawPredatorPressureOverlay();
  drawEvolutionBurstScreen();
  drawCockpitFrame();
  drawMiniHud();
  drawBiomeReveal();
  drawFormReveal();
  drawReadyPulse();
  drawScreenFlash();
}

function drawScreenVignette() {
  const radius = Math.max(canvas.clientWidth, canvas.clientHeight) * 0.72;
  const gradient = ctx.createRadialGradient(
    canvas.clientWidth / 2,
    canvas.clientHeight / 2,
    radius * 0.28,
    canvas.clientWidth / 2,
    canvas.clientHeight / 2,
    radius
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.72, "rgba(0,0,0,0.12)");
  gradient.addColorStop(1, "rgba(0,0,0,0.46)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  if (game.effects.magnet > 0 || game.effects.shield > 0 || game.effects.surge > 0) {
    const color = game.effects.shield > 0 ? "80,255,154" : game.effects.magnet > 0 ? "56,197,255" : "255,213,78";
    ctx.fillStyle = `rgba(${color},0.045)`;
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  const threat = getThreatLevel();
  if (threat > 0) {
    ctx.fillStyle = `rgba(255,79,109,${0.04 + threat * 0.08})`;
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }
}

function drawBiomeCameraWash() {
  const biome = getBiome();
  const difficulty = biome.difficulty || 0;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const time = performance.now();
  const primary = biome.glow[0] || "#50ff9a";
  const secondary = biome.glow[1] || primary;
  ctx.save();

  const wash = ctx.createLinearGradient(0, 0, width, height);
  wash.addColorStop(0, normalizeColor(primary, 0.035 + difficulty * 0.008));
  wash.addColorStop(0.52, "rgba(255,255,255,0)");
  wash.addColorStop(1, normalizeColor(secondary, 0.028 + difficulty * 0.007));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.16 + difficulty * 0.025;
  ctx.strokeStyle = normalizeColor(primary, 0.2);
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  const horizonY = height * (0.3 + difficulty * 0.035) + Math.sin(time / 2400) * 10;
  for (let row = 0; row < 3; row += 1) {
    const y = horizonY + row * (22 + difficulty * 4);
    ctx.beginPath();
    ctx.moveTo(-30, y);
    for (let x = -30; x <= width + 60; x += 90) {
      const wave = Math.sin(time / 900 + x * 0.015 + row) * (5 + difficulty * 2.2);
      ctx.quadraticCurveTo(x + 45, y + wave, x + 90, y - wave * 0.4);
    }
    ctx.stroke();
  }

  if (difficulty >= 2) {
    ctx.globalAlpha = 0.08 + difficulty * 0.015;
    ctx.strokeStyle = difficulty >= 4 ? "rgba(255,255,255,0.34)" : normalizeColor(secondary, 0.24);
    ctx.lineWidth = difficulty >= 4 ? 2 : 1.4;
    for (let index = 0; index < 6 + difficulty; index += 1) {
      const x = ((index * 137 + time * (0.018 + difficulty * 0.006)) % (width + 120)) - 60;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 34, height * 0.28, x - 46, height * 0.68, x + 18, height);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawScreenTexture() {
  ctx.save();
  ctx.globalAlpha = 0.055;
  ctx.fillStyle = "#ffffff";
  for (let y = 0; y < canvas.clientHeight; y += 4) {
    ctx.fillRect(0, y, canvas.clientWidth, 1);
  }
  ctx.globalAlpha = 0.035;
  const drift = (performance.now() * 0.018) % 18;
  for (let x = -18; x < canvas.clientWidth; x += 36) {
    ctx.fillRect(x + drift, 0, 1, canvas.clientHeight);
  }
  ctx.restore();
}

function drawCameraGlass() {
  const biome = getBiome();
  const threat = getThreatLevel();
  const time = performance.now();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  ctx.save();

  const sweep = (time * 0.026) % (width + 320) - 160;
  const gradient = ctx.createLinearGradient(sweep - 130, 0, sweep + 130, height);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, normalizeColor(biome.glow[0] || "#50ff9a", 0.055 + threat * 0.035));
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const corner = Math.min(66, Math.max(34, width * 0.055));
  const pad = 15;
  ctx.strokeStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.18 + threat * 0.18);
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const sx of [pad, width - pad]) {
    for (const sy of [pad, height - pad]) {
      const xDir = sx < width / 2 ? 1 : -1;
      const yDir = sy < height / 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(sx, sy + yDir * corner);
      ctx.lineTo(sx, sy);
      ctx.lineTo(sx + xDir * corner, sy);
      ctx.stroke();
    }
  }

  if (threat > 0.08) {
    ctx.strokeStyle = `rgba(255,79,109,${0.13 + threat * 0.22})`;
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 12]);
    ctx.lineDashOffset = -time * 0.05;
    roundRect(18, 18, width - 36, height - 36, 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawBiomeForegroundWeather() {
  const biome = getBiome();
  const time = performance.now();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const difficulty = biome.difficulty || 0;
  ctx.save();
  ctx.lineCap = "round";

  if (biome.name === "Wetlands") {
    ctx.strokeStyle = "rgba(166,236,255,0.16)";
    ctx.lineWidth = 1.4;
    for (let index = 0; index < 42; index += 1) {
      const x = (index * 71 + time * 0.12) % (width + 90) - 45;
      const y = (index * 113 + time * 0.42) % (height + 110) - 55;
      const length = 24 + (index % 5) * 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - length * 0.28, y + length);
      ctx.stroke();
    }
  } else if (biome.name === "Rainforest") {
    for (let index = 0; index < 18; index += 1) {
      const drift = time * (0.018 + index * 0.0008);
      const x = (index * 131 + drift * 9) % (width + 120) - 60;
      const y = (index * 79 + Math.sin(time / 700 + index) * 32) % (height + 80) - 40;
      const size = 6 + (index % 4) * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time / 500 + index) * 0.8);
      ctx.fillStyle = index % 3 === 0 ? "rgba(176,113,255,0.14)" : "rgba(80,255,154,0.13)";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.58, size * 1.35, -0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (biome.name === "Savanna") {
    ctx.strokeStyle = "rgba(255,213,78,0.12)";
    ctx.lineWidth = 2;
    for (let index = 0; index < 10; index += 1) {
      const y = (index * 73 + time * 0.035) % (height + 120) - 60;
      const x = (Math.sin(time / 1000 + index) * 0.5 + 0.5) * width;
      ctx.globalAlpha = 0.45 + (index % 3) * 0.15;
      ctx.beginPath();
      ctx.moveTo(x - 170, y + Math.sin(index) * 24);
      ctx.bezierCurveTo(x - 60, y - 24, x + 68, y + 28, x + 180, y - 8);
      ctx.stroke();
    }
  } else if (biome.name === "Apex Rift") {
    for (let index = 0; index < 30; index += 1) {
      const x = (index * 97 + time * 0.055) % (width + 100) - 50;
      const y = (index * 61 + time * 0.028) % (height + 90) - 45;
      const spin = time / 360 + index;
      const size = 3 + (index % 4);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(spin);
      ctx.fillStyle = index % 2 ? "rgba(255,79,109,0.18)" : "rgba(56,197,255,0.14)";
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.8);
      ctx.lineTo(size, 0);
      ctx.lineTo(0, size * 1.8);
      ctx.lineTo(-size, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    ctx.fillStyle = "rgba(221,255,69,0.12)";
    for (let index = 0; index < 26 + difficulty * 4; index += 1) {
      const x = (index * 83 + Math.sin(time / 900 + index) * 34) % (width + 70) - 35;
      const y = (index * 47 + time * 0.018) % (height + 70) - 35;
      ctx.beginPath();
      ctx.arc(x, y, 1.4 + (index % 3) * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawEdgeWarning() {
  const player = game.player;
  const margin = 170;
  const left = Math.max(0, (margin - player.x) / margin);
  const right = Math.max(0, (margin - (world.width - player.x)) / margin);
  const top = Math.max(0, (margin - player.y) / margin);
  const bottom = Math.max(0, (margin - (world.height - player.y)) / margin);
  const danger = Math.max(left, right, top, bottom);
  if (danger <= 0) return;

  ctx.save();
  ctx.globalAlpha = 0.18 + danger * 0.34;
  const edge = 34 + danger * 22;
  const gradientLeft = ctx.createLinearGradient(0, 0, edge, 0);
  gradientLeft.addColorStop(0, "#ffd54e");
  gradientLeft.addColorStop(1, "rgba(255,213,78,0)");
  const gradientRight = ctx.createLinearGradient(canvas.clientWidth, 0, canvas.clientWidth - edge, 0);
  gradientRight.addColorStop(0, "#ffd54e");
  gradientRight.addColorStop(1, "rgba(255,213,78,0)");
  const gradientTop = ctx.createLinearGradient(0, 0, 0, edge);
  gradientTop.addColorStop(0, "#ffd54e");
  gradientTop.addColorStop(1, "rgba(255,213,78,0)");
  const gradientBottom = ctx.createLinearGradient(0, canvas.clientHeight, 0, canvas.clientHeight - edge);
  gradientBottom.addColorStop(0, "#ffd54e");
  gradientBottom.addColorStop(1, "rgba(255,213,78,0)");

  if (left > 0) {
    ctx.fillStyle = gradientLeft;
    ctx.fillRect(0, 0, edge, canvas.clientHeight);
  }
  if (right > 0) {
    ctx.fillStyle = gradientRight;
    ctx.fillRect(canvas.clientWidth - edge, 0, edge, canvas.clientHeight);
  }
  if (top > 0) {
    ctx.fillStyle = gradientTop;
    ctx.fillRect(0, 0, canvas.clientWidth, edge);
  }
  if (bottom > 0) {
    ctx.fillStyle = gradientBottom;
    ctx.fillRect(0, canvas.clientHeight - edge, canvas.clientWidth, edge);
  }
  drawEdgeWarningTicks({ left, right, top, bottom, danger });
  ctx.restore();
}

function drawEdgeWarningTicks(edges) {
  const time = performance.now();
  const color = "#ffd54e";
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = withAlpha(color, 0.22 + edges.danger * 0.52);
  ctx.fillStyle = withAlpha(color, 0.16 + edges.danger * 0.28);
  ctx.lineWidth = 1.6 + edges.danger * 2;

  const drawTicks = (side, amount) => {
    if (amount <= 0) return;
    const count = 5;
    for (let index = 0; index < count; index += 1) {
      const t = (index + 1) / (count + 1);
      const pulse = 0.7 + Math.sin(time / 120 + index) * 0.3;
      const size = 10 + amount * 18 + pulse * 3;
      let x;
      let y;
      let angle;
      if (side === "left") {
        x = 14 + amount * 18;
        y = canvas.clientHeight * t;
        angle = 0;
      } else if (side === "right") {
        x = canvas.clientWidth - 14 - amount * 18;
        y = canvas.clientHeight * t;
        angle = Math.PI;
      } else if (side === "top") {
        x = canvas.clientWidth * t;
        y = 14 + amount * 18;
        angle = Math.PI / 2;
      } else {
        x = canvas.clientWidth * t;
        y = canvas.clientHeight - 14 - amount * 18;
        angle = -Math.PI / 2;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.42);
      ctx.lineTo(size * 0.36, 0);
      ctx.lineTo(-size * 0.42, size * 0.42);
      ctx.stroke();
      if (amount > 0.5 && index % 2 === 0) {
        ctx.beginPath();
        ctx.arc(-size * 0.75, 0, 2.2 + amount * 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  drawTicks("left", edges.left);
  drawTicks("right", edges.right);
  drawTicks("top", edges.top);
  drawTicks("bottom", edges.bottom);
  ctx.restore();
}

function drawPredatorPressureOverlay() {
  const player = game.player;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const rival of game.rivals || []) {
    if (rival.length < player.length) continue;
    const d = distance(player, rival);
    if (d < nearestDistance) {
      nearest = rival;
      nearestDistance = d;
    }
  }
  if (!nearest || nearestDistance > 620) return;

  const threat = clamp((620 - nearestDistance) / 620, 0, 1);
  const time = performance.now();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const centerX = width / 2;
  const centerY = height / 2;
  const sx = (nearest.x - game.camera.x) * game.camera.zoom;
  const sy = (nearest.y - game.camera.y) * game.camera.zoom;
  const angle = Math.atan2(sy - centerY, sx - centerX);
  const edgeX = clamp(centerX + Math.cos(angle) * width * 0.46, 42, width - 42);
  const edgeY = clamp(centerY + Math.sin(angle) * height * 0.43, 52, height - 52);
  const pulse = 0.7 + Math.sin(time / 105) * 0.3;

  ctx.save();
  ctx.globalAlpha = 0.26 + threat * 0.42;
  const wash = ctx.createRadialGradient(edgeX, edgeY, 0, edgeX, edgeY, Math.max(width, height) * 0.72);
  wash.addColorStop(0, `rgba(255,79,109,${0.12 + threat * 0.12})`);
  wash.addColorStop(0.36, `rgba(255,79,109,${0.04 + threat * 0.08})`);
  wash.addColorStop(1, "rgba(255,79,109,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.translate(edgeX, edgeY);
  ctx.rotate(angle);
  ctx.fillStyle = `rgba(255,79,109,${0.28 + threat * 0.32})`;
  ctx.strokeStyle = `rgba(255,213,78,${0.2 + threat * 0.28})`;
  ctx.lineWidth = 2 + threat * 2;
  for (let index = 0; index < 3; index += 1) {
    const offset = index * (18 + threat * 8) + pulse * 8;
    const size = 24 + index * 8 + threat * 10;
    ctx.beginPath();
    ctx.moveTo(size + offset, 0);
    ctx.lineTo(offset - size * 0.36, -size * 0.52);
    ctx.lineTo(offset - size * 0.12, 0);
    ctx.lineTo(offset - size * 0.36, size * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `rgba(255,79,109,${0.1 + threat * 0.22})`;
  ctx.lineWidth = 2 + threat * 2;
  ctx.setLineDash([18, 14]);
  ctx.lineDashOffset = -time * (0.04 + threat * 0.04);
  const inset = 28 + pulse * 6;
  roundRect(inset, inset, width - inset * 2, height - inset * 2, 8);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.18 + threat * 0.28;
  ctx.strokeStyle = "#ff4f6d";
  ctx.lineWidth = 1.5;
  for (let index = 0; index < 7; index += 1) {
    const y = height - 88 - index * 7;
    const beat = Math.sin(time / 85 + index) * (5 + threat * 10);
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(54, y);
    ctx.lineTo(66, y - beat);
    ctx.lineTo(82, y + beat * 0.7);
    ctx.lineTo(96, y);
    ctx.lineTo(Math.min(156, width * 0.38), y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpeedLines() {
  const boosting = isBoostHeld() && game.player.boost > 1;
  const surge = game.effects.surge > 0;
  if (!boosting && !surge) return;

  const intensity = surge ? 1 : 0.72;
  const angle = game.player.angle + Math.PI;
  const centerX = canvas.clientWidth / 2;
  const centerY = canvas.clientHeight / 2;
  const count = surge ? 34 : 24;
  ctx.save();
  ctx.lineCap = "round";
  for (let index = 0; index < count; index += 1) {
    const spread = (index / count - 0.5) * Math.PI * 1.35;
    const lane = 80 + (index % 9) * 48 + ((performance.now() * (0.18 + index * 0.006)) % 220);
    const lineAngle = angle + spread * 0.28;
    const side = index % 2 === 0 ? 1 : -1;
    const offset = side * (42 + (index % 7) * 38);
    const x = centerX + Math.cos(lineAngle + Math.PI / 2) * offset + Math.cos(lineAngle) * lane;
    const y = centerY + Math.sin(lineAngle + Math.PI / 2) * offset + Math.sin(lineAngle) * lane;
    const length = 34 + (index % 5) * 14 + (surge ? 18 : 0);
    ctx.globalAlpha = (0.08 + (index % 4) * 0.025) * intensity;
    ctx.strokeStyle = surge ? "#ffd54e" : "#ffffff";
    ctx.lineWidth = surge ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(lineAngle) * length, y + Math.sin(lineAngle) * length);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMotionGlints() {
  if (!game.running || game.paused || game.over) return;
  const player = game.player;
  const boosting = isBoostHeld() && player.boost > 1;
  const surge = game.effects.surge > 0;
  const tier = getPredatorTier();
  const biome = getBiome();
  const time = performance.now();
  const power = clamp((player.length - 10) / 90 + (player.tierIndex || 0) * 0.08 + (boosting ? 0.28 : 0) + (surge ? 0.4 : 0), 0.18, 1);
  const count = Math.round(10 + power * 16);
  const angle = player.angle + Math.PI;
  const centerX = canvas.clientWidth / 2;
  const centerY = canvas.clientHeight / 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < count; index += 1) {
    const lane = ((time * (0.02 + power * 0.035) + index * 73) % (canvas.clientWidth + 220)) - 110;
    const side = (index / count - 0.5) * canvas.clientHeight * 1.25;
    const wobble = Math.sin(time / 620 + index * 1.9) * 28;
    const x = centerX + Math.cos(angle) * lane + Math.cos(angle + Math.PI / 2) * (side + wobble);
    const y = centerY + Math.sin(angle) * lane + Math.sin(angle + Math.PI / 2) * (side + wobble);
    const length = 12 + (index % 5) * 7 + power * 22;
    const color = index % 3 === 0 ? biome.glow[0] || tier.color : tier.color;
    ctx.globalAlpha = 0.025 + power * 0.075;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 + power * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    ctx.stroke();

    if (index % 6 === 0) {
      ctx.fillStyle = withAlpha("#ffffff", 0.06 + power * 0.08);
      drawStar(x, y, 1.2, 3.6 + power * 2.8, 4);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawBoostPressure() {
  const boost = game.player.boost || 0;
  if (boost > 24 || game.effects.surge > 0) return;
  const pressure = (24 - boost) / 24;
  const pulse = 0.65 + Math.sin(performance.now() / 95) * 0.35;
  ctx.save();
  ctx.globalAlpha = 0.08 + pressure * 0.18 * pulse;
  ctx.fillStyle = "#ffb340";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.globalAlpha = 0.16 + pressure * 0.22;
  ctx.strokeStyle = "#ffd54e";
  ctx.lineWidth = 3 + pressure * 4;
  roundRect(10, 10, canvas.clientWidth - 20, canvas.clientHeight - 20, 8);
  ctx.stroke();
  ctx.restore();
}

function drawBiomeReveal() {
  if (!game.biomeReveal?.time) return;
  const progress = 1 - game.biomeReveal.time / game.biomeReveal.duration;
  const alpha = Math.min(1, game.biomeReveal.time / 0.35, (game.biomeReveal.duration - game.biomeReveal.time) / 0.35);
  const y = canvas.clientHeight * 0.22 + Math.sin(progress * Math.PI) * 8;
  const width = Math.min(460, canvas.clientWidth - 44);
  const x = canvas.clientWidth / 2 - width / 2;
  const biome = biomes.find((item) => item.name === game.biomeReveal.name) || getBiome();
  ctx.save();
  drawBiomeTransitionWash(biome, progress, alpha);
  drawProgressionConfetti(canvas.clientWidth / 2, y + 34, game.biomeReveal.color, progress, alpha, "biome");
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = "rgba(3,8,9,0.62)";
  roundRect(x, y, width, 66, 8);
  ctx.fill();
  ctx.strokeStyle = normalizeColor(game.biomeReveal.color, 0.56);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = normalizeColor(game.biomeReveal.color, 0.92);
  ctx.font = "900 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("ENTERING BIOME", canvas.clientWidth / 2, y + 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 28px Inter, system-ui, sans-serif";
  ctx.fillText(game.biomeReveal.name, canvas.clientWidth / 2, y + 52);
  ctx.fillStyle = normalizeColor(game.biomeReveal.color, 0.8);
  roundRect(x + 18, y + 58, (width - 36) * progress, 4, 2);
  ctx.fill();
  drawBiomeRevealGlyph(x + 34, y + 34, biome, progress, alpha);
  drawBiomeRevealGlyph(x + width - 34, y + 34, biome, progress + 0.5, alpha);
  ctx.restore();
}

function drawBiomeTransitionWash(biome, progress, alpha) {
  const color = biome.glow[0] || "#50ff9a";
  const accent = biome.glow[1] || color;
  const difficulty = biome.difficulty || 0;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const time = performance.now();
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);

  const wash = ctx.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height * 0.42, Math.max(width, height) * 0.72);
  wash.addColorStop(0, normalizeColor(color, 0.16 + difficulty * 0.018));
  wash.addColorStop(0.52, normalizeColor(accent, 0.055 + difficulty * 0.012));
  wash.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = normalizeColor(color, 0.3 + difficulty * 0.035);
  ctx.lineWidth = 2 + difficulty * 0.3;
  ctx.setLineDash([18, 16]);
  ctx.lineDashOffset = -time * 0.08;
  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 80 + progress * (180 + ring * 90) + ring * 34;
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.42, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = normalizeColor(accent, 0.62);
  ctx.strokeStyle = "rgba(3,8,9,0.36)";
  ctx.lineWidth = 1.4;
  for (let index = 0; index < 14 + difficulty * 3; index += 1) {
    const angle = (index / (14 + difficulty * 3)) * Math.PI * 2 + time / 1500;
    const radius = 94 + ((index * 29 + progress * 280) % 260);
    const gx = width / 2 + Math.cos(angle) * radius;
    const gy = height * 0.42 + Math.sin(angle) * radius * 0.58;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(angle + progress * Math.PI);
    drawBiomeRevealGlyph(0, 0, biome, progress + index * 0.07, alpha);
    ctx.restore();
  }

  ctx.restore();
}

function drawFormReveal() {
  if (!game.formReveal?.time) return;
  const progress = 1 - game.formReveal.time / game.formReveal.duration;
  const alpha = Math.min(1, game.formReveal.time / 0.28, (game.formReveal.duration - game.formReveal.time) / 0.28);
  const width = Math.min(340, canvas.clientWidth - 40);
  const x = canvas.clientWidth / 2 - width / 2;
  const y = canvas.clientHeight * 0.37 - Math.sin(progress * Math.PI) * 10;
  const tier = predatorTiers.find((item) => item.name === game.formReveal.name) || getPredatorTier();
  ctx.save();
  drawProgressionConfetti(canvas.clientWidth / 2, y + 31, game.formReveal.color, progress, alpha, "form");
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.fillStyle = "rgba(3,8,9,0.66)";
  roundRect(x, y, width, 58, 8);
  ctx.fill();
  ctx.strokeStyle = normalizeColor(game.formReveal.color, 0.62);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = normalizeColor(game.formReveal.color, 0.95);
  ctx.font = "900 11px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("NEW PREDATOR FORM", canvas.clientWidth / 2, y + 19);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 26px Inter, system-ui, sans-serif";
  ctx.fillText(game.formReveal.name, canvas.clientWidth / 2, y + 46);
  ctx.fillStyle = normalizeColor(game.formReveal.color, 0.86);
  roundRect(x + 20, y + 53, (width - 40) * Math.sin(progress * Math.PI), 4, 2);
  ctx.fill();
  drawRevealCreature(x + 38, y + 31, tier, progress, alpha);
  drawRevealCreature(x + width - 38, y + 31, tier, progress + 0.5, alpha);
  ctx.restore();
}

function drawEvolutionBurstScreen() {
  if (!game.evolutionBurst?.time) return;
  const progress = 1 - game.evolutionBurst.time / game.evolutionBurst.duration;
  const alpha = Math.min(1, game.evolutionBurst.time / 0.24, (game.evolutionBurst.duration - game.evolutionBurst.time) / 0.42);
  const color = game.evolutionBurst.color || getPredatorTier().color;
  const sx = (game.player.x - game.camera.x) * game.camera.zoom;
  const sy = (game.player.y - game.camera.y) * game.camera.zoom;
  const x = clamp(sx, 70, canvas.clientWidth - 70);
  const y = clamp(sy, 96, canvas.clientHeight - 96);
  const time = performance.now();

  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.translate(x, y);
  drawEvolutionConstellation(color, progress, alpha);

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 210 + progress * 120);
  glow.addColorStop(0, normalizeColor(color, 0.18));
  glow.addColorStop(0.4, normalizeColor(color, 0.07));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 250 + progress * 110, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = "round";
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2 + time / 900;
    const inner = 48 + progress * 38;
    const outer = 104 + progress * 180 + (index % 3) * 16;
    ctx.strokeStyle = index % 2 === 0 ? normalizeColor(color, 0.18 + alpha * 0.18) : "rgba(255,255,255,0.18)";
    ctx.lineWidth = index % 3 === 0 ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }

  for (let ring = 0; ring < 3; ring += 1) {
    const radius = 58 + progress * (90 + ring * 46) + ring * 18;
    ctx.strokeStyle = ring === 0 ? normalizeColor(color, 0.72) : normalizeColor(color, 0.34 - ring * 0.06);
    ctx.lineWidth = Math.max(1.5, 5 - ring);
    ctx.setLineDash(ring === 1 ? [16, 12] : []);
    ctx.lineDashOffset = -time * 0.06;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = normalizeColor(color, 0.8);
  ctx.lineWidth = 2;
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 - time / 700;
    const radius = 82 + Math.sin(time / 130 + index) * 10 + progress * 76;
    ctx.save();
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.rotate(angle + progress * Math.PI);
    drawStar(0, 0, 3.2, 8 + (index % 3), 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawProgressionConfetti(centerX, centerY, color, progress, alpha, mode) {
  const time = performance.now();
  const count = mode === "biome" ? 22 : 16;
  const spreadX = mode === "biome" ? Math.min(360, canvas.clientWidth * 0.42) : Math.min(260, canvas.clientWidth * 0.32);
  const spreadY = mode === "biome" ? 92 : 72;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = normalizeColor(color, 0.58);
  ctx.fillStyle = normalizeColor(color, 0.5);
  for (let index = 0; index < count; index += 1) {
    const lane = index / count;
    const angle = lane * Math.PI * 2 + time / (mode === "biome" ? 1100 : 820);
    const burst = Math.sin(progress * Math.PI);
    const distance = (0.28 + lane * 0.88) * (mode === "biome" ? 115 : 88) * (0.4 + progress);
    const x = centerX + Math.cos(angle) * spreadX * 0.18 + Math.cos(angle * 1.7) * distance;
    const y = centerY + Math.sin(angle) * spreadY * 0.42 + Math.sin(angle * 1.2) * distance * 0.5 - burst * 18;
    const size = 3 + (index % 4) * 1.3 + burst * 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + progress * Math.PI);
    if (mode === "biome" && index % 3 === 0) {
      drawStar(0, 0, size * 0.42, size, 4);
      ctx.fill();
      ctx.stroke();
    } else if (index % 2 === 0) {
      ctx.beginPath();
      ctx.rect(-size * 0.6, -size * 0.22, size * 1.2, size * 0.44);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.72, size * 0.52);
      ctx.lineTo(-size * 0.72, size * 0.52);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawEvolutionConstellation(color, progress, alpha) {
  const time = performance.now();
  const points = 10;
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = normalizeColor(color, 0.26);
  ctx.fillStyle = normalizeColor(color, 0.68);
  ctx.beginPath();
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2 + time / 1300;
    const radius = 118 + Math.sin(time / 180 + index) * 10 + progress * 72;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.72;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2 + time / 1300;
    const radius = 118 + Math.sin(time / 180 + index) * 10 + progress * 72;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.72;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle - time / 900);
    drawStar(0, 0, 2.2, 5.8 + (index % 3), index % 2 ? 4 : 5);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBiomeRevealGlyph(x, y, biome, progress, alpha) {
  const difficulty = biome.difficulty || 0;
  const size = 12 + difficulty * 1.6 + Math.sin(progress * Math.PI * 2) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(progress * Math.PI * 0.35);
  ctx.fillStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.42 * alpha);
  ctx.strokeStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.72 * alpha);
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (difficulty === 0) {
    ctx.ellipse(0, 0, size * 0.58, size * 1.08, -0.55, 0, Math.PI * 2);
  } else if (difficulty === 1) {
    ctx.ellipse(0, 0, size * 1.08, size * 0.42, progress, 0, Math.PI * 2);
  } else if (difficulty === 2) {
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.45, size * 0.9);
    ctx.lineTo(0, size * 0.5);
    ctx.lineTo(-size * 0.45, size * 0.9);
    ctx.closePath();
  } else if (difficulty === 3) {
    ctx.moveTo(-size, size * 0.52);
    ctx.lineTo(0, -size);
    ctx.lineTo(size, size * 0.52);
    ctx.lineTo(0, size * 0.18);
    ctx.closePath();
  } else {
    drawStar(0, 0, size * 0.38, size, 5);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawRevealCreature(x, y, tier, progress, alpha) {
  const scale = 0.68 + Math.sin(progress * Math.PI) * 0.22;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(progress * Math.PI * 2) * 0.16);
  ctx.scale(scale, scale);
  ctx.fillStyle = normalizeColor(tier.color, 0.62 * alpha);
  ctx.strokeStyle = "rgba(255,255,255,0.44)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (tier.animal === "bird") {
    ctx.moveTo(15, 0);
    ctx.lineTo(-11, -12);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-11, 12);
    ctx.closePath();
  } else if (tier.animal === "shark") {
    ctx.ellipse(0, 0, 17, 9, 0, 0, Math.PI * 2);
    ctx.moveTo(-13, 0);
    ctx.lineTo(-23, -8);
    ctx.lineTo(-23, 8);
    ctx.closePath();
  } else if (tier.animal === "dragon") {
    drawStar(0, 0, 8, 18, 6);
  } else {
    ctx.ellipse(0, 0, 17, 11, 0, 0, Math.PI * 2);
    ctx.moveTo(7, -8);
    ctx.lineTo(16, -18);
    ctx.lineTo(14, -5);
    ctx.moveTo(7, 8);
    ctx.lineTo(16, 18);
    ctx.lineTo(14, 5);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawComboSurge() {
  if (!game.combo || game.combo < 4 || game.comboTime <= 0) return;
  const alpha = Math.min(1, game.comboTime / 0.45) * Math.min(0.22, game.combo * 0.025);
  const color = game.comboColor || "#ddff45";
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  const inset = 16 + Math.sin(performance.now() / 120) * 4;
  roundRect(inset, inset, canvas.clientWidth - inset * 2, canvas.clientHeight - inset * 2, 8);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = color;
  for (let index = 0; index < Math.min(18, game.combo * 3); index += 1) {
    const x = ((index * 173 + performance.now() * 0.08) % canvas.clientWidth);
    const y = index % 2 === 0 ? 22 + (index % 5) * 17 : canvas.clientHeight - 22 - (index % 5) * 17;
    drawStar(x, y, 2, 5, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawStreakWakeOverlay() {
  if (!game.combo || game.combo < 2 || game.comboTime <= 0 || !game.playerPath?.length) return;
  const alpha = Math.min(1, game.comboTime / 0.5) * clamp(game.combo / 9, 0.18, 1);
  const color = game.comboColor || getPredatorTier().color;
  const time = performance.now();
  const maxMarks = Math.min(game.playerPath.length, 28);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = maxMarks - 1; index >= 0; index -= 1) {
    const mark = game.playerPath[index];
    const screenX = (mark.x - game.camera.x) * game.camera.zoom;
    const screenY = (mark.y - game.camera.y) * game.camera.zoom;
    if (screenX < -40 || screenY < -40 || screenX > canvas.clientWidth + 40 || screenY > canvas.clientHeight + 40) continue;
    const fade = (1 - index / Math.max(1, maxMarks)) * alpha;
    const pulse = 0.7 + Math.sin(time / 150 + index) * 0.22;
    const radius = (mark.radius || game.player.radius) * game.camera.zoom * (0.5 + fade * 0.55);

    ctx.globalAlpha = fade * 0.24;
    ctx.fillStyle = withAlpha(color, 0.58);
    ctx.beginPath();
    ctx.ellipse(screenX, screenY, radius * (1.6 + pulse * 0.2), radius * 0.52, mark.angle || 0, 0, Math.PI * 2);
    ctx.fill();

    if (index % 4 === 0) {
      ctx.globalAlpha = fade * 0.55;
      ctx.fillStyle = withAlpha("#ffffff", 0.34);
      ctx.save();
      ctx.translate(screenX, screenY);
      ctx.rotate((mark.angle || 0) + time / 500);
      drawStar(0, 0, 1.2 + fade * 1.5, 3.4 + game.combo * 0.35, 4);
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawScorePulseBurst() {
  if (!game.scorePulse || game.scorePulse <= 0) return;
  const pulse = clamp(game.scorePulse / 0.6, 0, 1);
  const progress = 1 - pulse;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const sx = (game.player.x - game.camera.x) * game.camera.zoom;
  const sy = (game.player.y - game.camera.y) * game.camera.zoom;
  const x = clamp(sx, 80, width - 80);
  const y = clamp(sy, 90, height - 90);
  const color = game.comboColor || getPredatorTier().color;
  const count = 10 + Math.min(10, game.combo || 0);
  const time = performance.now();

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.lineCap = "round";

  const glow = ctx.createRadialGradient(x, y, 0, x, y, 120 + progress * 100);
  glow.addColorStop(0, normalizeColor(color, 0.08 + pulse * 0.06));
  glow.addColorStop(0.46, normalizeColor(color, 0.035));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = normalizeColor(color, 0.18 + pulse * 0.24);
  ctx.lineWidth = 2;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + time / 900;
    const inner = 28 + progress * 24;
    const outer = 74 + progress * 86 + (index % 3) * 9;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * inner, y + Math.sin(angle) * inner);
    ctx.lineTo(x + Math.cos(angle) * outer, y + Math.sin(angle) * outer);
    ctx.stroke();
  }

  ctx.fillStyle = normalizeColor(color, 0.7);
  for (let index = 0; index < Math.min(8, count); index += 1) {
    const angle = -time / 700 + (index / Math.min(8, count)) * Math.PI * 2;
    const radius = 48 + progress * 88 + (index % 2) * 10;
    ctx.save();
    ctx.translate(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.78);
    ctx.rotate(angle + progress * Math.PI);
    drawStar(0, 0, 2, 5.5 + pulse * 3, 4);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawReadyPulse() {
  if (!game.readyPulse?.time) return;
  const progress = 1 - game.readyPulse.time / game.readyPulse.duration;
  const alpha = Math.min(1, game.readyPulse.time / 0.25, (game.readyPulse.duration - game.readyPulse.time) / 0.25);
  const radius = 52 + progress * 120;
  const time = performance.now();
  ctx.save();
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.textAlign = "center";
  ctx.strokeStyle = "rgba(80,255,154,0.42)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(canvas.clientWidth / 2, canvas.clientHeight / 2, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(221,255,69,0.24)";
  ctx.lineWidth = 1.6;
  ctx.setLineDash([10, 14]);
  ctx.lineDashOffset = -time * 0.055;
  ctx.beginPath();
  ctx.arc(canvas.clientWidth / 2, canvas.clientHeight / 2, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(80,255,154,0.38)";
  for (let index = 0; index < 8; index += 1) {
    const angle = time / 420 + (index / 8) * Math.PI * 2;
    const tickRadius = radius * (0.86 + Math.sin(time / 240 + index) * 0.02);
    ctx.save();
    ctx.translate(
      canvas.clientWidth / 2 + Math.cos(angle) * tickRadius,
      canvas.clientHeight / 2 + Math.sin(angle) * tickRadius
    );
    ctx.rotate(angle);
    drawStar(0, 0, 1.4, 4.2, 4);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = "rgba(3,8,9,0.54)";
  roundRect(canvas.clientWidth / 2 - 92, canvas.clientHeight / 2 - 22, 184, 44, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(80,255,154,0.34)";
  ctx.stroke();
  ctx.strokeStyle = "rgba(221,255,69,0.28)";
  ctx.lineWidth = 1.2;
  for (const side of [-1, 1]) {
    const x = canvas.clientWidth / 2 + side * 106;
    const y = canvas.clientHeight / 2;
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x - side * 14, y);
    ctx.lineTo(x, y + 16);
    ctx.stroke();
  }
  ctx.fillStyle = "#ddff45";
  ctx.font = "900 13px Inter, system-ui, sans-serif";
  ctx.fillText("CHAIN LIVE", canvas.clientWidth / 2, canvas.clientHeight / 2 - 2);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 11px Inter, system-ui, sans-serif";
  ctx.fillText("EAT SMALLER", canvas.clientWidth / 2, canvas.clientHeight / 2 + 16);
  ctx.restore();
}

function drawBiomeRipple() {
  if (!game.biomeRipple?.time) return;
  const progress = 1 - game.biomeRipple.time / game.biomeRipple.duration;
  const radius = 120 + progress * 620;
  const alpha = (1 - progress) * 0.45;
  ctx.save();
  ctx.strokeStyle = normalizeColor(game.biomeRipple.color, 0.8);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 14 * (1 - progress) + 2;
  ctx.beginPath();
  ctx.arc(game.player.x, game.player.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.globalAlpha = alpha * 0.8;
  ctx.beginPath();
  ctx.arc(game.player.x, game.player.y, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getThreatLevel() {
  let level = 0;
  for (const rival of game.rivals || []) {
    if (rival.length < game.player.length) continue;
    const d = distance(rival, game.player);
    if (d < 520) level = Math.max(level, (520 - d) / 520);
  }
  return level;
}

function drawWorld() {
  const biome = getBiome();
  const gradient = ctx.createLinearGradient(0, 0, world.width, world.height);
  gradient.addColorStop(0, biome.colors[0]);
  gradient.addColorStop(0.48, biome.colors[1]);
  gradient.addColorStop(1, biome.colors[2]);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, world.width, world.height);

  drawDepthBands(biome);
  drawBiomeAtmosphericFloor(biome);
  drawBiomeSectorFields(biome);
  drawMigrationLanes(biome);
  drawBiomeGateways(biome);
  drawBiomeTexture(biome);
  drawBiomeLandmarks(biome);
  drawBiomeLifeSignals(biome);
  drawBiomeTrailGlyphs(biome);

  for (const blob of game.terrain || []) {
    const phase = blob.phase || 0;
    const breathe = 1 + Math.sin(performance.now() / 1600 + phase) * 0.035;
    const driftX = Math.cos(performance.now() / 2600 + phase) * 10;
    const driftY = Math.sin(performance.now() / 3000 + phase) * 8;
    const x = blob.x + driftX;
    const y = blob.y + driftY;
    const radius = blob.radius * breathe;
    const blobGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    blobGradient.addColorStop(0, blob.color);
    blobGradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = blobGradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBiomeDetails(biome);
  drawBiomeWatermark(biome);
  drawDistantBiomeSilhouettes(biome);
  drawBiomePredatorMurals(biome);
  drawMotes();
  drawWeather();

  ctx.strokeStyle = "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= world.width; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, world.height);
    ctx.stroke();
  }
  for (let y = 0; y <= world.height; y += 72) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(world.width, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(80,255,154,0.18)";
  ctx.lineWidth = 6 + biome.difficulty;
  ctx.strokeRect(10, 10, world.width - 20, world.height - 20);
  if (biome.difficulty > 1) {
    ctx.strokeStyle = `rgba(255,79,109,${0.08 + biome.difficulty * 0.025})`;
    ctx.lineWidth = 14 + biome.difficulty * 2;
    ctx.strokeRect(18, 18, world.width - 36, world.height - 36);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.strokeRect(18, 18, world.width - 36, world.height - 36);
  drawBoundaryRails(biome);
  drawBoundaryBeacons(biome);
}

function drawDepthBands(biome) {
  const drift = game.distance || 0;
  ctx.save();
  ctx.globalAlpha = 0.1 + biome.difficulty * 0.012;
  for (let index = 0; index < 9; index += 1) {
    const y = index * 236 + ((drift * (0.04 + index * 0.006)) % 236) - 236;
    const gradient = ctx.createLinearGradient(0, y, world.width, y + 160);
    gradient.addColorStop(0, "rgba(255,255,255,0)");
    gradient.addColorStop(0.5, biome.glow[index % biome.glow.length]);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= world.width + 160; x += 160) {
      ctx.quadraticCurveTo(x + 80, y + 42 + Math.sin(index + x * 0.01) * 28, x + 160, y + 16);
    }
    ctx.lineTo(world.width, y + 168);
    ctx.lineTo(0, y + 168);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawBiomeAtmosphericFloor(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const drift = game.distance || 0;
  const color = biome.glow[0] || "#50ff9a";
  const accent = biome.glow[1] || color;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (difficulty === 0) {
    ctx.strokeStyle = withAlpha(color, 0.085);
    ctx.fillStyle = withAlpha(accent, 0.035);
    for (let index = 0; index < 34; index += 1) {
      const x = (index * 197 + Math.sin(time / 3200 + index) * 42) % world.width;
      const y = (index * 293 + drift * 0.05 + Math.cos(time / 3600 + index) * 34) % world.height;
      const size = 34 + (index % 5) * 13;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time / 4100 + index) * 0.22 + index);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.68);
      ctx.bezierCurveTo(size * 0.5, -size * 0.3, size * 0.56, size * 0.34, 0, size * 0.72);
      ctx.bezierCurveTo(-size * 0.5, size * 0.3, -size * 0.56, -size * 0.34, 0, -size * 0.68);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (difficulty === 1) {
    for (let index = 0; index < 18; index += 1) {
      const y = (index * 156 + drift * 0.16 + Math.sin(time / 2100 + index) * 26) % world.height;
      const wave = ctx.createLinearGradient(0, y - 42, world.width, y + 42);
      wave.addColorStop(0, "rgba(255,255,255,0)");
      wave.addColorStop(0.48, withAlpha(color, 0.065));
      wave.addColorStop(0.52, withAlpha(accent, 0.05));
      wave.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = wave;
      ctx.lineWidth = 2.2 + (index % 3);
      ctx.beginPath();
      for (let x = -80; x <= world.width + 80; x += 80) {
        const py = y + Math.sin(x * 0.012 + time / 700 + index) * 18;
        if (x === -80) ctx.moveTo(x, py);
        else ctx.quadraticCurveTo(x - 40, py - 18, x, py);
      }
      ctx.stroke();
    }
  } else if (difficulty === 2) {
    ctx.strokeStyle = withAlpha(color, 0.075);
    for (let index = 0; index < 30; index += 1) {
      const x = (index * 181 + Math.sin(time / 4200 + index) * 68) % world.width;
      const y = (index * 251 + drift * 0.07) % world.height;
      const height = 120 + (index % 5) * 34;
      ctx.lineWidth = 3 + (index % 4);
      ctx.beginPath();
      ctx.moveTo(x, y - height * 0.5);
      ctx.bezierCurveTo(x + 34, y - height * 0.1, x - 42, y + height * 0.18, x + 12, y + height * 0.5);
      ctx.stroke();
      ctx.fillStyle = withAlpha(accent, 0.04);
      ctx.beginPath();
      ctx.ellipse(x + 18, y - height * 0.25, 18 + (index % 3) * 8, 7 + (index % 2) * 3, index, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (difficulty === 3) {
    ctx.strokeStyle = withAlpha("#ffd54e", 0.07);
    ctx.fillStyle = withAlpha("#ffb340", 0.035);
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 257 + drift * 0.12) % world.width;
      const y = (index * 163 + Math.sin(time / 1900 + index) * 22) % world.height;
      const width = 150 + (index % 4) * 50;
      ctx.lineWidth = 1.4 + (index % 3) * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - width * 0.5, y);
      ctx.lineTo(x + width * 0.5, y + Math.sin(time / 900 + index) * 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(x, y + 18, width * 0.34, 10 + (index % 3) * 4, 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = withAlpha("#ffffff", 0.13);
    ctx.fillStyle = withAlpha(color, 0.045);
    for (let index = 0; index < 26; index += 1) {
      const x = (index * 223 + Math.sin(time / 1300 + index) * 90 + drift * 0.09) % world.width;
      const y = (index * 307 + Math.cos(time / 1500 + index) * 70) % world.height;
      const size = 42 + (index % 5) * 18;
      ctx.lineWidth = 1.2 + (index % 3);
      ctx.beginPath();
      ctx.moveTo(x - size, y);
      ctx.lineTo(x - size * 0.24, y - size * 0.18);
      ctx.lineTo(x + size * 0.2, y + size * 0.12);
      ctx.lineTo(x + size, y - size * 0.08);
      ctx.stroke();
      drawStar(x, y, size * 0.08, size * 0.3, 4);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawBiomeSectorFields(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const drift = game.distance || 0;
  const color = biome.glow[0] || "#50ff9a";
  const accent = biome.glow[1] || color;
  const count = 5 + difficulty;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "screen";

  for (let index = 0; index < count; index += 1) {
    const baseX = (index * 503 + difficulty * 197 + drift * (0.08 + index * 0.006)) % world.width;
    const baseY = (index * 331 + difficulty * 241 + Math.sin(time / 2800 + index) * 80 + world.height) % world.height;
    const radiusX = 260 + difficulty * 44 + (index % 3) * 46;
    const radiusY = 116 + difficulty * 24 + (index % 2) * 38;
    const angle = Math.sin(time / 4200 + index) * 0.28 + index * 0.22;
    const alpha = 0.028 + difficulty * 0.006;

    const glow = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, radiusX);
    glow.addColorStop(0, withAlpha(index % 2 ? accent : color, alpha * 2.5));
    glow.addColorStop(0.58, withAlpha(index % 2 ? color : accent, alpha));
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, radiusX, radiusY, angle, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = withAlpha(index % 2 ? accent : color, 0.035 + difficulty * 0.008);
    ctx.lineWidth = 2 + difficulty * 0.35;
    ctx.setLineDash([22 + difficulty * 4, 26]);
    ctx.lineDashOffset = -time * (0.018 + difficulty * 0.003) - index * 10;
    ctx.beginPath();
    ctx.ellipse(baseX, baseY, radiusX * 0.82, radiusY * 0.72, angle, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (difficulty >= 2) {
      ctx.fillStyle = withAlpha("#ffffff", 0.035 + difficulty * 0.004);
      for (let dot = 0; dot < 4; dot += 1) {
        const dotAngle = angle + (dot / 4) * Math.PI * 2 + time / 2400;
        ctx.beginPath();
        ctx.arc(
          baseX + Math.cos(dotAngle) * radiusX * 0.42,
          baseY + Math.sin(dotAngle) * radiusY * 0.42,
          3 + difficulty * 0.7,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawMigrationLanes(biome) {
  const time = performance.now();
  ctx.save();
  ctx.lineCap = "round";
  for (let lane = 0; lane < 7; lane += 1) {
    const y = 180 + lane * 245 + Math.sin(time / 3200 + lane) * 24;
    const color = biome.glow[lane % biome.glow.length] || "rgba(255,255,255,0.12)";
    ctx.strokeStyle = normalizeColor(color, 0.08 + biome.difficulty * 0.012);
    ctx.lineWidth = 8 + biome.difficulty * 1.2;
    ctx.setLineDash([44 + lane * 3, 52]);
    ctx.lineDashOffset = -(time * (0.018 + lane * 0.002));
    ctx.beginPath();
    ctx.moveTo(-120, y);
    for (let x = -120; x <= world.width + 160; x += 220) {
      const wave = Math.sin(x * 0.004 + lane) * (34 + biome.difficulty * 7);
      ctx.quadraticCurveTo(x + 110, y + wave, x + 220, y - wave * 0.45);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const stepCount = 28 + biome.difficulty * 8;
  ctx.fillStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.12);
  for (let index = 0; index < stepCount; index += 1) {
    const x = (index * 173 + time * (0.014 + biome.difficulty * 0.003)) % world.width;
    const y = (index * 97 + biome.difficulty * 143 + Math.sin(time / 1800 + index) * 18) % world.height;
    const angle = index * 0.7 + biome.difficulty * 0.35;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    if (biome.difficulty <= 1) {
      ctx.ellipse(-5, 0, 4, 9, -0.3, 0, Math.PI * 2);
      ctx.ellipse(5, 0, 4, 9, 0.3, 0, Math.PI * 2);
    } else if (biome.difficulty <= 3) {
      ctx.moveTo(-9, 5);
      ctx.lineTo(0, -8);
      ctx.lineTo(9, 5);
      ctx.lineTo(0, 1);
      ctx.closePath();
    } else {
      drawStar(0, 0, 3, 10, 4);
    }
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawBiomeGateways(biome) {
  const state = getBiomeProgress();
  const time = performance.now();
  const color = state.next?.glow?.[0] || biome.glow[0] || "#50ff9a";
  const accent = state.next?.glow?.[1] || biome.glow[1] || color;
  const progress = state.next ? state.progress : 1;
  const pulse = 0.5 + Math.sin(time / 360) * 0.5;
  const gates = [
    { x: world.width * 0.5, y: 42, rotation: 0 },
    { x: world.width - 42, y: world.height * 0.5, rotation: Math.PI / 2 },
    { x: world.width * 0.5, y: world.height - 42, rotation: Math.PI },
    { x: 42, y: world.height * 0.5, rotation: -Math.PI / 2 }
  ];

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const gate of gates) {
    ctx.save();
    ctx.translate(gate.x, gate.y);
    ctx.rotate(gate.rotation);

    const width = 170 + biome.difficulty * 18;
    const height = 54 + biome.difficulty * 7;
    const glowAlpha = 0.08 + progress * 0.18 + pulse * 0.04;
    const sweep = -width / 2 + width * progress;

    ctx.strokeStyle = withAlpha(color, glowAlpha);
    ctx.lineWidth = 7 + progress * 5;
    ctx.setLineDash([26, 16]);
    ctx.lineDashOffset = -time * 0.04;
    ctx.beginPath();
    ctx.moveTo(-width / 2, 0);
    ctx.quadraticCurveTo(-width * 0.22, -height, 0, -height * 0.58);
    ctx.quadraticCurveTo(width * 0.22, -height, width / 2, 0);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.strokeStyle = withAlpha(accent, 0.1 + progress * 0.16);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-width / 2, 10);
    ctx.lineTo(width / 2, 10);
    ctx.stroke();

    ctx.fillStyle = withAlpha(color, 0.12 + progress * 0.26);
    ctx.beginPath();
    ctx.arc(sweep, 10, 4 + progress * 4 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();

    for (let tick = 0; tick <= 4; tick += 1) {
      const x = -width / 2 + (width / 4) * tick;
      ctx.strokeStyle = withAlpha(tick / 4 <= progress ? color : "#ffffff", tick / 4 <= progress ? 0.26 : 0.08);
      ctx.lineWidth = tick / 4 <= progress ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 22);
      ctx.stroke();
    }

    ctx.restore();
  }

  if (state.next) {
    const centerX = world.width * 0.5;
    const centerY = world.height * 0.5;
    const radius = 128 + biome.difficulty * 16 + pulse * 8;
    ctx.strokeStyle = withAlpha(color, 0.06 + progress * 0.13);
    ctx.lineWidth = 3;
    ctx.setLineDash([18, 18]);
    ctx.lineDashOffset = -time * 0.025;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawBiomeTexture(biome) {
  const time = performance.now();
  const difficulty = biome.difficulty || 0;
  ctx.save();
  ctx.globalAlpha = 0.08 + difficulty * 0.012;
  ctx.strokeStyle = biome.glow[0] || "rgba(255,255,255,0.12)";
  ctx.fillStyle = biome.glow[1] || biome.glow[0] || "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1.4;
  for (let index = 0; index < 46 + difficulty * 8; index += 1) {
    const x = (index * 149 + difficulty * 173 + time * (0.01 + difficulty * 0.002)) % world.width;
    const y = (index * 263 + difficulty * 97 + Math.sin(time / 2400 + index) * 28 + world.height) % world.height;
    const size = 8 + (index % 7) * 4 + difficulty * 1.5;
    ctx.beginPath();
    if (difficulty === 0) {
      ctx.moveTo(x, y + size * 0.5);
      ctx.quadraticCurveTo(x + size * 0.28, y - size * 0.55, x + size * 0.92, y - size * 0.8);
    } else if (difficulty === 1) {
      ctx.ellipse(x, y, size * 1.4, size * 0.34, index * 0.43, 0, Math.PI * 2);
    } else if (difficulty === 2) {
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.45, y + size);
      ctx.moveTo(x + size * 0.15, y - size * 0.72);
      ctx.lineTo(x - size * 0.45, y + size * 0.5);
    } else if (difficulty === 3) {
      ctx.moveTo(x - size, y + size * 0.5);
      ctx.lineTo(x, y - size * 0.9);
      ctx.lineTo(x + size, y + size * 0.5);
    } else {
      drawStar(x, y, size * 0.18, size * 0.48, 4);
    }
    if (difficulty >= 4) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
}

function drawBiomeLandmarks(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  ctx.save();
  ctx.globalAlpha = 0.1 + difficulty * 0.018;
  ctx.fillStyle = biome.glow[0] || "rgba(255,255,255,0.12)";
  ctx.strokeStyle = biome.glow[1] || biome.glow[0] || "rgba(255,255,255,0.12)";
  ctx.lineWidth = 3;

  for (let index = 0; index < 10; index += 1) {
    const x = (index * 421 + difficulty * 233) % world.width;
    const y = (index * 281 + difficulty * 151) % world.height;
    const size = 54 + (index % 5) * 18 + difficulty * 11;
    const sway = Math.sin(time / 1800 + index) * 8;
    ctx.save();
    ctx.translate(x + sway, y);
    ctx.rotate(Math.sin(time / 2600 + index) * 0.08);
    ctx.beginPath();

    if (difficulty === 0) {
      ctx.ellipse(0, 0, size * 0.45, size * 0.18, -0.45, 0, Math.PI * 2);
      ctx.ellipse(size * 0.24, -size * 0.18, size * 0.32, size * 0.14, -0.25, 0, Math.PI * 2);
      ctx.fill();
    } else if (difficulty === 1) {
      ctx.ellipse(0, 0, size * 0.72, size * 0.18, 0, 0, Math.PI * 2);
      ctx.moveTo(-size * 0.48, -size * 0.18);
      ctx.lineTo(-size * 0.18, -size * 0.85);
      ctx.moveTo(size * 0.05, -size * 0.15);
      ctx.lineTo(size * 0.34, -size * 0.72);
      ctx.stroke();
    } else if (difficulty === 2) {
      ctx.moveTo(0, size * 0.72);
      ctx.lineTo(0, -size * 0.82);
      ctx.moveTo(0, -size * 0.34);
      ctx.quadraticCurveTo(-size * 0.7, -size * 0.62, -size * 0.42, -size * 0.06);
      ctx.moveTo(0, -size * 0.46);
      ctx.quadraticCurveTo(size * 0.76, -size * 0.74, size * 0.5, -size * 0.1);
      ctx.stroke();
    } else if (difficulty === 3) {
      ctx.moveTo(-size * 0.86, size * 0.46);
      ctx.lineTo(-size * 0.2, -size * 0.56);
      ctx.lineTo(size * 0.12, size * 0.46);
      ctx.lineTo(size * 0.5, -size * 0.18);
      ctx.lineTo(size * 0.86, size * 0.46);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.setLineDash([14, 12]);
      ctx.lineDashOffset = -time * 0.025;
      ctx.arc(0, 0, size * 0.58, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawStar(0, 0, size * 0.12, size * 0.34, 5);
      ctx.fill();
    }

    ctx.restore();
  }
  ctx.restore();
}

function drawBiomeLifeSignals(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const color = biome.glow[0] || "#50ff9a";
  const accent = biome.glow[1] || color;
  const count = 12 + difficulty * 3;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = 0; index < count; index += 1) {
    const baseX = (index * 359 + difficulty * 211) % world.width;
    const baseY = (index * 227 + difficulty * 317) % world.height;
    const drift = Math.sin(time / 2400 + index) * (18 + difficulty * 3);
    const x = baseX + drift;
    const y = baseY + Math.cos(time / 2600 + index) * 14;
    const size = 18 + (index % 5) * 5 + difficulty * 2.5;
    const pulse = 0.55 + Math.sin(time / 360 + index) * 0.22;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 3.6);
    glow.addColorStop(0, normalizeColor(index % 2 ? accent : color, 0.07 + pulse * 0.04));
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time / 1800 + index) * 0.18 + index * 0.24);
    ctx.globalAlpha = 0.14 + difficulty * 0.018 + pulse * 0.05;
    ctx.strokeStyle = index % 2 ? accent : color;
    ctx.fillStyle = index % 2 ? color : accent;
    ctx.lineWidth = 1.6 + difficulty * 0.22;
    ctx.beginPath();
    if (difficulty === 0) {
      ctx.ellipse(0, 0, size * 0.72, size * 0.24, 0, 0, Math.PI * 2);
      ctx.moveTo(-size * 0.36, 0);
      ctx.quadraticCurveTo(0, -size * 0.36, size * 0.44, -size * 0.08);
      ctx.stroke();
    } else if (difficulty === 1) {
      ctx.arc(0, 0, size * 0.58, Math.PI * 0.1, Math.PI * 1.85);
      ctx.moveTo(-size * 0.24, -size * 0.18);
      ctx.lineTo(size * 0.32, size * 0.24);
      ctx.stroke();
    } else if (difficulty === 2) {
      ctx.moveTo(0, -size * 0.74);
      ctx.bezierCurveTo(-size * 0.78, -size * 0.1, -size * 0.3, size * 0.72, 0, size * 0.8);
      ctx.bezierCurveTo(size * 0.3, size * 0.72, size * 0.78, -size * 0.1, 0, -size * 0.74);
      ctx.stroke();
    } else if (difficulty === 3) {
      ctx.moveTo(-size * 0.78, size * 0.44);
      ctx.lineTo(-size * 0.22, -size * 0.52);
      ctx.lineTo(size * 0.18, size * 0.42);
      ctx.lineTo(size * 0.72, -size * 0.16);
      ctx.stroke();
    } else {
      ctx.setLineDash([size * 0.26, size * 0.22]);
      ctx.lineDashOffset = -time * 0.04;
      ctx.arc(0, 0, size * 0.66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawStar(0, 0, size * 0.12, size * 0.34, 5);
      ctx.globalAlpha *= 0.74;
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawBiomeTrailGlyphs(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const colorA = biome.glow[0] || "rgba(80,255,154,0.16)";
  const colorB = biome.glow[1] || colorA;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = 0; index < 18 + difficulty * 5; index += 1) {
    const drift = time * (0.012 + difficulty * 0.003);
    const x = (index * 307 + difficulty * 181 + drift) % world.width;
    const y = (index * 191 + difficulty * 257 + Math.sin(time / 2100 + index) * 34 + world.height) % world.height;
    const size = 24 + (index % 5) * 7 + difficulty * 4;
    const pulse = 0.7 + Math.sin(time / 420 + index) * 0.18;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, size * 2.4);
    glow.addColorStop(0, normalizeColor(index % 2 ? colorB : colorA, 0.11 + difficulty * 0.012));
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time / 1800 + index) * 0.35 + index * 0.28);
    ctx.globalAlpha = 0.14 + difficulty * 0.018 + pulse * 0.04;
    ctx.strokeStyle = index % 2 ? colorB : colorA;
    ctx.fillStyle = index % 2 ? colorA : colorB;
    ctx.lineWidth = 2.2 + difficulty * 0.25;
    ctx.beginPath();

    if (difficulty === 0) {
      ctx.ellipse(0, 0, size * 0.7, size * 0.32, -0.25, 0, Math.PI * 2);
      ctx.moveTo(-size * 0.48, 0);
      ctx.quadraticCurveTo(0, -size * 0.34, size * 0.55, -size * 0.08);
      ctx.stroke();
    } else if (difficulty === 1) {
      ctx.arc(0, 0, size * 0.58, 0.15, Math.PI * 1.7);
      ctx.moveTo(-size * 0.25, -size * 0.36);
      ctx.lineTo(size * 0.12, size * 0.42);
      ctx.stroke();
    } else if (difficulty === 2) {
      ctx.moveTo(0, -size * 0.8);
      ctx.bezierCurveTo(-size * 0.72, -size * 0.2, -size * 0.48, size * 0.58, 0, size * 0.82);
      ctx.bezierCurveTo(size * 0.48, size * 0.58, size * 0.72, -size * 0.2, 0, -size * 0.8);
      ctx.stroke();
    } else if (difficulty === 3) {
      ctx.moveTo(-size * 0.72, size * 0.48);
      ctx.lineTo(-size * 0.2, -size * 0.62);
      ctx.lineTo(size * 0.26, size * 0.48);
      ctx.lineTo(size * 0.7, -size * 0.18);
      ctx.stroke();
    } else {
      ctx.setLineDash([size * 0.32, size * 0.18]);
      ctx.lineDashOffset = -time * 0.04;
      ctx.arc(0, 0, size * 0.72, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      drawStar(0, 0, size * 0.14, size * 0.38, 4);
      ctx.globalAlpha *= 0.72;
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawBoundaryBeacons(biome) {
  const corners = [
    [34, 34],
    [world.width - 34, 34],
    [world.width - 34, world.height - 34],
    [34, world.height - 34]
  ];
  const pulse = 1 + Math.sin(performance.now() / 260) * 0.08;
  const dangerPulse = 0.5 + Math.sin(performance.now() / 120) * 0.5;
  const difficulty = biome.difficulty || 0;
  ctx.save();
  ctx.shadowBlur = 18;
  ctx.shadowColor = biome.glow[0] || "#50ff9a";
  for (const [x, y] of corners) {
    ctx.fillStyle = "rgba(3,8,9,0.72)";
    ctx.strokeStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.72);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 14 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.86);
    ctx.beginPath();
    ctx.arc(x, y, 4.5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    if (difficulty >= 2) {
      ctx.strokeStyle = `rgba(255,79,109,${0.16 + dangerPulse * 0.18})`;
      ctx.lineWidth = 1.4 + difficulty * 0.25;
      ctx.setLineDash([5, 8]);
      ctx.lineDashOffset = -performance.now() * 0.035;
      ctx.beginPath();
      ctx.arc(x, y, 24 + difficulty * 4 + dangerPulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.shadowBlur = 0;
  ctx.strokeStyle = normalizeColor(biome.glow[0] || "#50ff9a", 0.16);
  ctx.lineWidth = 2;
  for (let x = 160; x < world.width; x += 240) {
    ctx.beginPath();
    ctx.moveTo(x - 24, 16);
    ctx.lineTo(x + 24, 16);
    ctx.moveTo(x - 24, world.height - 16);
    ctx.lineTo(x + 24, world.height - 16);
    ctx.stroke();
  }
  for (let y = 160; y < world.height; y += 240) {
    ctx.beginPath();
    ctx.moveTo(16, y - 24);
    ctx.lineTo(16, y + 24);
    ctx.moveTo(world.width - 16, y - 24);
    ctx.lineTo(world.width - 16, y + 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoundaryRails(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const color = biome.glow[0] || "#50ff9a";
  const accent = biome.glow[1] || color;
  const inset = 26;
  const width = world.width - inset * 2;
  const height = world.height - inset * 2;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const railGlow = ctx.createLinearGradient(inset, inset, world.width - inset, world.height - inset);
  railGlow.addColorStop(0, normalizeColor(color, 0.22 + difficulty * 0.03));
  railGlow.addColorStop(0.5, normalizeColor(accent, 0.12 + difficulty * 0.02));
  railGlow.addColorStop(1, normalizeColor(color, 0.22 + difficulty * 0.03));
  ctx.strokeStyle = railGlow;
  ctx.lineWidth = 5 + difficulty * 1.2;
  ctx.setLineDash([48, 34]);
  ctx.lineDashOffset = -time * (0.025 + difficulty * 0.008);
  roundRect(inset, inset, width, height, 10);
  ctx.stroke();

  ctx.strokeStyle = normalizeColor("#ffffff", 0.08 + difficulty * 0.012);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 18]);
  ctx.lineDashOffset = time * 0.035;
  roundRect(inset + 14, inset + 14, width - 28, height - 28, 8);
  ctx.stroke();
  ctx.setLineDash([]);

  const tickCount = 18 + difficulty * 6;
  ctx.strokeStyle = normalizeColor(accent, 0.22 + difficulty * 0.035);
  ctx.lineWidth = 2 + difficulty * 0.25;
  for (let index = 0; index < tickCount; index += 1) {
    const t = (index / tickCount + time * 0.000018 * (1 + difficulty * 0.3)) % 1;
    const perimeter = (world.width + world.height) * 2 - inset * 8;
    const d = t * perimeter;
    let x;
    let y;
    let angle;
    if (d < width) {
      x = inset + d;
      y = inset;
      angle = 0;
    } else if (d < width + height) {
      x = world.width - inset;
      y = inset + (d - width);
      angle = Math.PI / 2;
    } else if (d < width * 2 + height) {
      x = world.width - inset - (d - width - height);
      y = world.height - inset;
      angle = Math.PI;
    } else {
      x = inset;
      y = world.height - inset - (d - width * 2 - height);
      angle = Math.PI * 1.5;
    }
    const tick = 12 + (index % 3) * 4 + difficulty * 1.5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-tick * 0.5, 0);
    ctx.lineTo(tick * 0.5, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, difficulty >= 3 ? 14 : 9);
    ctx.stroke();
    ctx.restore();
  }

  if (difficulty >= 3) {
    ctx.fillStyle = normalizeColor("#ff4f6d", 0.075 + difficulty * 0.012);
    const dangerBand = 78 + difficulty * 6;
    ctx.fillRect(0, 0, world.width, dangerBand);
    ctx.fillRect(0, world.height - dangerBand, world.width, dangerBand);
    ctx.fillRect(0, 0, dangerBand, world.height);
    ctx.fillRect(world.width - dangerBand, 0, dangerBand, world.height);
  }

  ctx.restore();
}

function drawMagnetThreads() {
  if (game.effects?.magnet <= 0) return;
  const player = game.player;
  ctx.save();
  ctx.lineWidth = 1.4;
  for (const food of game.food || []) {
    const d = distance(player, food);
    if (d > 240) continue;
    const alpha = (240 - d) / 240;
    ctx.strokeStyle = `rgba(56,197,255,${0.05 + alpha * 0.22})`;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    const midX = (player.x + food.x) / 2 + Math.sin(performance.now() / 180 + food.x) * 12;
    const midY = (player.y + food.y) / 2 + Math.cos(performance.now() / 180 + food.y) * 12;
    ctx.quadraticCurveTo(midX, midY, food.x, food.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDangerTethers() {
  const player = game.player;
  ctx.save();
  for (const rival of game.rivals || []) {
    if (rival.length < player.length) continue;
    const d = distance(player, rival);
    if (d > 420) continue;
    const alpha = (420 - d) / 420;
    ctx.strokeStyle = `rgba(255,79,109,${0.05 + alpha * 0.18})`;
    ctx.lineWidth = 1 + alpha * 3;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(rival.x, rival.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawEncounterZones() {
  const player = game.player;
  const time = performance.now();
  ctx.save();
  ctx.lineCap = "round";
  for (const rival of game.rivals || []) {
    const d = distance(player, rival);
    if (d > 520) continue;
    const edible = rival.length < player.length;
    const alpha = edible ? (520 - d) / 520 : (520 - d) / 410;
    const color = edible ? "#50ff9a" : "#ff4f6d";
    const radius = rival.radius + (edible ? 34 : 46) + Math.sin(time / 170 + rival.length) * 4;

    ctx.strokeStyle = withAlpha(color, edible ? 0.08 + alpha * 0.18 : 0.1 + alpha * 0.24);
    ctx.lineWidth = edible ? 3 : 4;
    ctx.setLineDash(edible ? [12, 12] : [18, 9]);
    ctx.lineDashOffset = edible ? -time * 0.035 : time * 0.05;
    ctx.beginPath();
    ctx.arc(rival.x, rival.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    drawRivalIntentMarker(rival, radius, color, edible, alpha);

    if (d < 390) {
      drawEncounterChevron(player, rival, color, edible, alpha);
    }
  }
  ctx.restore();
}

function drawRivalIntentMarker(rival, radius, color, edible, alpha) {
  const time = performance.now();
  const pulse = 1 + Math.sin(time / 150 + rival.length) * 0.08;
  ctx.save();
  ctx.translate(rival.x, rival.y);
  ctx.rotate(time * (edible ? 0.0018 : -0.0024) + rival.length * 0.03);
  ctx.fillStyle = withAlpha(color, edible ? 0.16 + alpha * 0.28 : 0.2 + alpha * 0.34);
  ctx.strokeStyle = withAlpha(color, edible ? 0.22 + alpha * 0.36 : 0.32 + alpha * 0.44);
  ctx.lineWidth = edible ? 2 : 2.6;

  if (edible) {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const x = Math.cos(angle) * radius * pulse;
      const y = Math.sin(angle) * radius * pulse;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.quadraticCurveTo(7, -1, 0, 7);
      ctx.quadraticCurveTo(-7, -1, 0, -6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    for (let index = 0; index < 8; index += 1) {
      const angle = (index / 8) * Math.PI * 2;
      const inner = radius * 0.92;
      const outer = radius * (1.12 + Math.sin(time / 120 + index) * 0.04);
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle - 0.08) * inner, Math.sin(angle - 0.08) * inner);
      ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
      ctx.lineTo(Math.cos(angle + 0.08) * inner, Math.sin(angle + 0.08) * inner);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawEncounterChevron(player, rival, color, edible, alpha) {
  const angle = Math.atan2(rival.y - player.y, rival.x - player.x);
  const d = distance(player, rival);
  const time = performance.now();
  const count = edible ? 3 : 4;
  ctx.save();
  ctx.strokeStyle = withAlpha(color, edible ? 0.18 + alpha * 0.32 : 0.24 + alpha * 0.42);
  ctx.fillStyle = withAlpha(color, edible ? 0.12 + alpha * 0.26 : 0.16 + alpha * 0.34);
  ctx.lineWidth = edible ? 2 : 3;
  for (let index = 0; index < count; index += 1) {
    const offset = ((time * (edible ? 0.045 : -0.052) + index * 54) % Math.max(90, d - 60)) + 34;
    const x = player.x + Math.cos(angle) * offset;
    const y = player.y + Math.sin(angle) * offset;
    const size = edible ? 9 + index * 0.7 : 12 + index;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + (edible ? 0 : Math.PI));
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.45, -size * 0.62);
    ctx.lineTo(-size * 0.1, 0);
    ctx.lineTo(-size * 0.45, size * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawRivalSpawnPortal(rival) {
  if (!rival.spawnTime || rival.spawnTime <= 0) return;
  const duration = rival.spawnDuration || 1.15;
  const progress = clamp(1 - rival.spawnTime / duration, 0, 1);
  const alpha = Math.sin(progress * Math.PI);
  const time = performance.now();
  const color = rival.length > game.player.length ? "#ff4f6d" : rival.color;
  const radius = rival.radius + 30 + progress * 56;
  const squash = 0.46 + progress * 0.16;

  ctx.save();
  ctx.translate(rival.x, rival.y);
  ctx.rotate(rival.angle + Math.sin(time / 180 + rival.length) * 0.12);
  ctx.globalAlpha = alpha;

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, radius * 1.28);
  glow.addColorStop(0, withAlpha(color, 0.12));
  glow.addColorStop(0.42, withAlpha(color, 0.18));
  glow.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.22, radius * squash, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineCap = "round";
  for (let ring = 0; ring < 3; ring += 1) {
    const ringRadius = radius * (0.66 + ring * 0.22) + Math.sin(time / 130 + ring) * 4;
    ctx.strokeStyle = withAlpha(ring === 0 ? "#ffffff" : color, (0.24 - ring * 0.045) * alpha);
    ctx.lineWidth = Math.max(1.2, 4 - ring * 0.75);
    ctx.setLineDash([12 + ring * 6, 11 + ring * 4]);
    ctx.lineDashOffset = (ring % 2 ? -1 : 1) * time * (0.04 + ring * 0.012);
    ctx.beginPath();
    ctx.ellipse(0, 0, ringRadius, ringRadius * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = withAlpha(color, 0.22 * alpha);
  ctx.strokeStyle = withAlpha("#ffffff", 0.18 * alpha);
  ctx.lineWidth = 1.5;
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2 + time / 420;
    const x = Math.cos(angle) * radius * 0.72;
    const y = Math.sin(angle) * radius * squash * 0.72;
    ctx.beginPath();
    drawStar(x, y, 2.4 + index % 2, 5.4 + index % 3, 4);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawPowerUpTethers() {
  const player = game.player;
  if (!game.powerUps?.length) return;
  ctx.save();
  ctx.lineWidth = 2;
  for (const powerUp of game.powerUps) {
    const d = distance(player, powerUp);
    if (d > 520) continue;
    const alpha = (520 - d) / 520;
    const wobble = Math.sin(performance.now() / 180 + powerUp.x) * 18;
    const midX = (player.x + powerUp.x) / 2 + Math.cos(player.angle + Math.PI / 2) * wobble;
    const midY = (player.y + powerUp.y) / 2 + Math.sin(player.angle + Math.PI / 2) * wobble;
    ctx.strokeStyle = normalizeColor(powerUp.color, 0.06 + alpha * 0.18);
    ctx.setLineDash([5, 10]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.quadraticCurveTo(midX, midY, powerUp.x, powerUp.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawFoodChainWeb() {
  const player = game.player;
  const time = performance.now();
  const tier = getPredatorTier();
  const nodes = [
    ...(game.powerUps || []).map((item) => ({
      x: item.x,
      y: item.y,
      radius: item.radius,
      color: item.accent || item.color,
      weight: 1,
      pulse: 0.9
    })),
    ...(game.food || [])
      .filter((food) => food.value >= 16 || distance(player, food) < 280)
      .slice(0, 34)
      .map((food) => ({
        x: food.x,
        y: food.y,
        radius: food.radius,
        color: food.accent || food.color,
        weight: clamp(food.value / 34, 0.25, 0.85),
        pulse: food.value >= 22 ? 0.7 : 0.35
      })),
    ...(game.rivals || [])
      .filter((rival) => rival.length < player.length && distance(player, rival) < 560)
      .slice(0, 5)
      .map((rival) => ({
        x: rival.x,
        y: rival.y,
        radius: rival.radius,
        color: tier.color,
        weight: clamp((player.length - rival.length) / Math.max(1, player.length), 0.35, 1),
        pulse: 1
      }))
  ];
  if (!nodes.length) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index];
    const d = distance(player, node);
    if (d > 620) continue;
    const alpha = (1 - d / 620) * node.weight;
    const wave = Math.sin(time / 260 + index * 1.7 + node.x * 0.01) * 0.5 + 0.5;
    const midX = (player.x + node.x) / 2 + Math.sin(time / 520 + node.y * 0.01) * 18;
    const midY = (player.y + node.y) / 2 + Math.cos(time / 540 + node.x * 0.01) * 18;

    ctx.strokeStyle = withAlpha(node.color, 0.035 + alpha * 0.12);
    ctx.lineWidth = 1 + alpha * 2.2;
    ctx.setLineDash([4 + node.weight * 10, 16 - node.weight * 6]);
    ctx.lineDashOffset = -time * (0.025 + node.weight * 0.025);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.quadraticCurveTo(midX, midY, node.x, node.y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = withAlpha(node.color, 0.08 + alpha * 0.18);
    ctx.beginPath();
    ctx.arc(
      node.x,
      node.y,
      node.radius * (1.7 + node.pulse * 0.8 + wave * 0.28),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawScentTrails() {
  const player = game.player;
  const nearbyFood = (game.food || [])
    .map((food) => ({ item: food, d: distance(player, food), type: "food" }))
    .filter((entry) => entry.d < 380 && entry.d > 42)
    .sort((a, b) => b.item.value - a.item.value || a.d - b.d)
    .slice(0, 14);
  const nearbyPowerUps = (game.powerUps || [])
    .map((powerUp) => ({ item: powerUp, d: distance(player, powerUp), type: "power" }))
    .filter((entry) => entry.d < 560 && entry.d > 52)
    .sort((a, b) => a.d - b.d)
    .slice(0, 4);
  const trails = nearbyPowerUps.concat(nearbyFood);
  if (!trails.length) return;

  const time = performance.now();
  ctx.save();
  ctx.lineCap = "round";
  for (const trail of trails) {
    const item = trail.item;
    const alpha = trail.type === "power"
      ? 0.1 + (560 - trail.d) / 560 * 0.26
      : 0.045 + (380 - trail.d) / 380 * 0.12;
    const color = trail.type === "power" ? item.color : item.accent || item.color;
    const bend = Math.sin(time / 420 + item.x * 0.01) * (trail.type === "power" ? 36 : 22);
    const dx = item.x - player.x;
    const dy = item.y - player.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / len;
    const normalY = dx / len;
    const startGap = game.player.radius + 22;
    const endGap = item.radius + 15;
    const startX = player.x + dx / len * startGap;
    const startY = player.y + dy / len * startGap;
    const endX = item.x - dx / len * endGap;
    const endY = item.y - dy / len * endGap;
    const midX = (startX + endX) / 2 + normalX * bend;
    const midY = (startY + endY) / 2 + normalY * bend;

    ctx.strokeStyle = normalizeColor(color, alpha);
    ctx.lineWidth = trail.type === "power" ? 2.4 : 1.4;
    ctx.setLineDash(trail.type === "power" ? [8, 12] : [4, 14]);
    ctx.lineDashOffset = -(time * (trail.type === "power" ? 0.035 : 0.024));
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    if (trail.type === "power") {
      ctx.fillStyle = normalizeColor(color, alpha + 0.08);
      for (let dot = 0; dot < 3; dot += 1) {
        const t = (dot + 1) / 4;
        const curveX = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
        const curveY = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
        ctx.beginPath();
        ctx.arc(curveX, curveY, 2.4 + dot * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function drawPickupHotspots() {
  const player = game.player;
  const time = performance.now();
  const targets = [
    ...(game.powerUps || []).map((item) => ({ item, power: true, strength: 1 })),
    ...(game.food || [])
      .filter((food) => food.value >= 16 || (game.effects?.magnet > 0 && distance(player, food) < 240))
      .slice(0, 28)
      .map((item) => ({ item, power: false, strength: clamp(item.value / 34, 0.35, 1) }))
  ];
  if (!targets.length) return;

  ctx.save();
  ctx.lineCap = "round";
  for (const target of targets) {
    const item = target.item;
    const d = distance(player, item);
    if (!target.power && d > 520) continue;
    const strength = target.power ? 1 : target.strength;
    const color = target.power ? item.color : item.accent || item.color;
    const alpha = target.power ? 0.12 : 0.035 + strength * 0.05;
    const radius = target.power
      ? item.radius * (3.6 + Math.sin(time / 220 + item.x) * 0.25)
      : item.radius * (2.2 + strength * 1.1 + Math.sin(time / 300 + item.y) * 0.16);

    ctx.fillStyle = withAlpha(color, alpha);
    ctx.beginPath();
    ctx.ellipse(item.x, item.y + item.radius * 0.9, radius, radius * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    if (target.power) {
      ctx.strokeStyle = withAlpha(item.accent, 0.18);
      ctx.lineWidth = 1.4;
      ctx.setLineDash([7, 12]);
      ctx.lineDashOffset = -time * 0.045;
      ctx.beginPath();
      ctx.ellipse(item.x, item.y + item.radius * 0.88, radius * 1.18, radius * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (target.power || item.value >= 22) {
      drawPickupFieldLabel(item, target.power, color, d, strength);
    }
  }
  ctx.restore();
}

function drawPickupFieldLabel(item, power, color, distanceToPlayer, strength) {
  if (!power && distanceToPlayer > 420) return;
  const time = performance.now();
  const label = power ? item.name.toUpperCase() : item.name.toUpperCase();
  const font = power ? "900 10px Inter, system-ui, sans-serif" : "900 9px Inter, system-ui, sans-serif";
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const labelWidth = Math.min(92, ctx.measureText(label).width + 18);
  const labelHeight = power ? 20 : 17;
  const alpha = power ? 0.48 + Math.sin(time / 180 + item.x) * 0.08 : 0.28 + strength * 0.22;
  const x = item.x;
  const y = item.y - item.radius * (power ? 3.8 : 3.1) - Math.sin(time / 240 + item.y) * 2;

  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(3,8,9,0.66)";
  roundRect(x - labelWidth / 2, y - labelHeight / 2, labelWidth, labelHeight, 7);
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, power ? 0.62 : 0.42);
  ctx.lineWidth = power ? 1.6 : 1;
  ctx.stroke();

  ctx.fillStyle = withAlpha(color, power ? 0.82 : 0.68);
  ctx.beginPath();
  ctx.arc(x - labelWidth / 2 + 7, y, 2.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = power ? "#ffffff" : "rgba(255,255,255,0.82)";
  ctx.fillText(label, x + 4, y + 0.5);
  ctx.restore();
}

function drawPlayerPathEcho() {
  if (!game.playerPath?.length) return;
  const time = performance.now();
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = game.playerPath.length - 1; index >= 0; index -= 1) {
    const mark = game.playerPath[index];
    const progress = 1 - mark.life / mark.duration;
    const alpha = Math.max(0, mark.life / mark.duration);
    const radius = mark.radius * (0.58 + alpha * 0.34);
    ctx.save();
    ctx.translate(mark.x, mark.y);
    ctx.rotate(mark.angle);
    ctx.globalAlpha = alpha * (mark.boosted ? 0.24 : 0.14);
    ctx.fillStyle = withAlpha(mark.color, mark.boosted ? 0.5 : 0.32);
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * (1.25 + progress * 0.4), radius * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = alpha * (mark.boosted ? 0.34 : 0.2);
    ctx.strokeStyle = withAlpha("#ffffff", mark.boosted ? 0.22 : 0.12);
    ctx.lineWidth = Math.max(1, radius * 0.08);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.9, 0);
    ctx.lineTo(radius * 0.9, 0);
    ctx.stroke();

    if (mark.boosted && index % 3 === 0) {
      ctx.fillStyle = withAlpha(mark.color, 0.62 * alpha);
      for (const side of [-1, 1]) {
        const spark = 1 + Math.sin(time / 120 + index) * 0.22;
        drawStar(-radius * 0.25, side * radius * 0.7, 1.4, 3.8 * spark, 4);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawHuntMarker() {
  const target = getNearestEdibleRival(620);
  if (!target) return;

  const time = performance.now();
  const pulse = 1 + Math.sin(time / 160) * 0.08;
  const radius = target.radius + 24 * pulse;
  const bracketSize = 12 + Math.min(10, Math.max(0, game.player.length - target.length) * 0.18);
  const advantage = clamp((game.player.length - target.length) / Math.max(1, game.player.length), 0, 1);

  ctx.save();
  ctx.lineCap = "round";
  drawHuntRoute(target, advantage);
  ctx.shadowBlur = 14;
  ctx.shadowColor = "rgba(80,255,154,0.55)";
  ctx.strokeStyle = "rgba(80,255,154,0.66)";
  ctx.lineWidth = 3;

  for (const corner of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const x = target.x + Math.cos(corner) * radius;
    const y = target.y + Math.sin(corner) * radius;
    const tangent = corner + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(tangent) * bracketSize, y + Math.sin(tangent) * bracketSize);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(80,255,154,0.22)";
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 9]);
  ctx.beginPath();
  ctx.arc(target.x, target.y, radius + 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(time / 520);
  ctx.strokeStyle = `rgba(221,255,69,${0.18 + advantage * 0.24})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 10]);
  ctx.lineDashOffset = -time * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = `rgba(80,255,154,${0.14 + advantage * 0.18})`;
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(radius + 13, 0);
    ctx.lineTo(radius + 28, -6);
    ctx.lineTo(radius + 23, 0);
    ctx.lineTo(radius + 28, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(80,255,154,0.92)";
  ctx.font = "900 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HUNT", target.x, target.y - radius - 14);
  ctx.restore();
}

function drawHuntRoute(target, advantage) {
  const player = game.player;
  const d = distance(player, target);
  if (d < 70) return;
  const time = performance.now();
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const startGap = player.radius + 34;
  const endGap = target.radius + 42;
  const startX = player.x + (dx / len) * startGap;
  const startY = player.y + (dy / len) * startGap;
  const endX = target.x - (dx / len) * endGap;
  const endY = target.y - (dy / len) * endGap;
  const wobble = Math.sin(time / 260 + target.length) * 28;
  const midX = (startX + endX) / 2 + nx * wobble;
  const midY = (startY + endY) / 2 + ny * wobble;

  ctx.save();
  ctx.strokeStyle = `rgba(80,255,154,${0.08 + advantage * 0.18})`;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 18]);
  ctx.lineDashOffset = -time * 0.06;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();

  ctx.strokeStyle = `rgba(221,255,69,${0.08 + advantage * 0.16})`;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 12]);
  ctx.lineDashOffset = -time * 0.09;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(midX, midY, endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = `rgba(80,255,154,${0.28 + advantage * 0.24})`;
  for (let index = 0; index < 4; index += 1) {
    const t = ((time * 0.00035 + index / 4) % 1);
    const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * endX;
    const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * endY;
    ctx.beginPath();
    ctx.arc(x, y, 2.4 + advantage * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function getNearestEdibleRival(maxDistance = 620) {
  let target = null;
  let bestDistance = maxDistance;
  for (const rival of game.rivals || []) {
    if (rival.length >= game.player.length) continue;
    const d = distance(game.player, rival);
    if (d < bestDistance) {
      bestDistance = d;
      target = rival;
    }
  }
  return target;
}

function drawAimGuide() {
  if (!pointer.active || !game.running) return;
  const rect = canvas.getBoundingClientRect();
  const target = {
    x: game.camera.x + (pointer.x - rect.left) / game.camera.zoom,
    y: game.camera.y + (pointer.y - rect.top) / game.camera.zoom
  };
  const player = game.player;
  const angle = Math.atan2(target.y - player.y, target.x - player.x);
  const length = Math.min(190, distance(player, target));
  const endX = player.x + Math.cos(angle) * length;
  const endY = player.y + Math.sin(angle) * length;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 9]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(221,255,69,0.86)";
  ctx.strokeStyle = "rgba(3,8,9,0.64)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(endX, endY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBiomeDetails(biome) {
  const difficulty = biome.difficulty;
  ctx.save();
  ctx.globalAlpha = 0.22 + difficulty * 0.03;
  for (let index = 0; index < 18 + difficulty * 5; index += 1) {
    const x = ((index * 331 + difficulty * 211) % world.width);
    const y = ((index * 197 + difficulty * 307) % world.height);
    const size = 22 + ((index * 13) % 54) + difficulty * 8;
    ctx.strokeStyle = biome.glow[index % biome.glow.length];
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (difficulty === 0) {
      ctx.moveTo(x, y + size * 0.45);
      ctx.quadraticCurveTo(x + size * 0.15, y - size * 0.3, x + size * 0.48, y - size * 0.56);
      ctx.quadraticCurveTo(x - size * 0.08, y - size * 0.34, x, y + size * 0.45);
    } else if (difficulty === 1) {
      ctx.ellipse(x, y, size * 0.8, size * 0.25, (index % 3) * 0.4, 0, Math.PI * 2);
    } else if (difficulty === 2) {
      ctx.moveTo(x, y - size * 0.6);
      ctx.lineTo(x + size * 0.2, y + size * 0.6);
      ctx.moveTo(x + size * 0.2, y - size * 0.48);
      ctx.lineTo(x - size * 0.24, y + size * 0.38);
    } else if (difficulty === 3) {
      ctx.moveTo(x - size, y + size * 0.35);
      ctx.lineTo(x - size * 0.2, y - size * 0.45);
      ctx.lineTo(x + size * 0.45, y + size * 0.34);
    } else {
      drawStar(x, y, size * 0.16, size * 0.4, 5);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawBiomeWatermark(biome) {
  const drift = (game.distance || 0) * 0.04;
  const x = world.width * 0.5 + Math.sin(performance.now() / 4200) * 120;
  const y = ((world.height * 0.5 + drift) % world.height);
  ctx.save();
  ctx.globalAlpha = 0.045 + (biome.difficulty || 0) * 0.008;
  ctx.translate(x, y);
  ctx.rotate(-0.08 + Math.sin(performance.now() / 5200) * 0.025);
  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.fillStyle = biome.glow[0] || "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.font = "900 104px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeText(biome.name.toUpperCase(), 0, 0);
  ctx.fillText(biome.name.toUpperCase(), 0, 0);
  ctx.restore();
}

function drawDistantBiomeSilhouettes(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const color = biome.glow[0] || "#50ff9a";
  ctx.save();
  ctx.globalAlpha = 0.055 + difficulty * 0.014;
  ctx.fillStyle = normalizeColor(color, 0.9);
  ctx.strokeStyle = normalizeColor("#ffffff", 0.18);
  ctx.lineWidth = 2;
  for (let index = 0; index < 9 + difficulty * 2; index += 1) {
    const edge = index % 4;
    const base = (index * 271 + difficulty * 173) % (edge < 2 ? world.width : world.height);
    const drift = Math.sin(time / 3200 + index) * 28;
    const x = edge === 2 ? 64 + drift : edge === 3 ? world.width - 64 + drift : base;
    const y = edge === 0 ? 78 + drift : edge === 1 ? world.height - 78 + drift : base;
    const size = 30 + (index % 4) * 11 + difficulty * 5;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time / 3600 + index) * 0.08 + (edge === 1 ? Math.PI : 0));
    ctx.beginPath();
    if (difficulty === 0) {
      ctx.ellipse(0, 0, size * 0.62, size * 0.25, 0, 0, Math.PI * 2);
      ctx.moveTo(size * 0.38, -size * 0.12);
      ctx.lineTo(size * 0.58, -size * 0.42);
      ctx.lineTo(size * 0.54, -size * 0.08);
    } else if (difficulty === 1) {
      ctx.ellipse(0, 0, size * 0.78, size * 0.2, 0, 0, Math.PI * 2);
      ctx.moveTo(-size * 0.46, 0);
      ctx.lineTo(-size * 0.74, -size * 0.28);
      ctx.lineTo(-size * 0.74, size * 0.28);
      ctx.closePath();
    } else if (difficulty === 2) {
      ctx.moveTo(0, -size * 0.8);
      ctx.lineTo(size * 0.3, size * 0.72);
      ctx.lineTo(0, size * 0.34);
      ctx.lineTo(-size * 0.3, size * 0.72);
      ctx.closePath();
    } else if (difficulty === 3) {
      ctx.moveTo(-size * 0.9, size * 0.32);
      ctx.lineTo(-size * 0.24, -size * 0.58);
      ctx.lineTo(size * 0.18, size * 0.32);
      ctx.lineTo(size * 0.58, -size * 0.08);
      ctx.lineTo(size * 0.9, size * 0.32);
      ctx.closePath();
    } else {
      drawStar(0, 0, size * 0.24, size * 0.68, 5);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawBiomePredatorMurals(biome) {
  const difficulty = biome.difficulty || 0;
  const time = performance.now();
  const muralTiers = [
    predatorTiers[Math.min(predatorTiers.length - 1, difficulty + 1)],
    predatorTiers[Math.min(predatorTiers.length - 1, difficulty + 2)]
  ];
  ctx.save();
  ctx.globalAlpha = 0.035 + difficulty * 0.009;
  for (let index = 0; index < muralTiers.length; index += 1) {
    const tier = muralTiers[index];
    const x = world.width * (index ? 0.78 : 0.24) + Math.sin(time / 5200 + index) * 54;
    const y = world.height * (index ? 0.3 : 0.72) + Math.cos(time / 6100 + index) * 42;
    const scale = 5.4 + difficulty * 0.7 + index * 0.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time / 7200 + index) * 0.08 + (index ? -0.18 : 0.16));
    ctx.scale(scale, scale);
    ctx.shadowBlur = 26;
    ctx.shadowColor = tier.color;
    drawRevealCreature(0, 0, tier, 0.75 + Math.sin(time / 1800 + index) * 0.08, 0.72);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = withAlpha(biome.glow[index % biome.glow.length] || tier.color, 0.42);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([8, 12]);
    ctx.lineDashOffset = -time * 0.018;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawMotes() {
  if (!game.motes) return;
  ctx.save();
  for (const mote of game.motes) {
    const parallaxX = (game.camera.x * mote.depth * 0.08) % world.width;
    const parallaxY = (game.camera.y * mote.depth * 0.08) % world.height;
    const x = (mote.x + parallaxX) % world.width;
    const y = (mote.y + parallaxY) % world.height;
    ctx.globalAlpha = mote.alpha;
    ctx.fillStyle = mote.color;
    ctx.beginPath();
    ctx.arc(x, y, mote.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawWeather() {
  if (!game.weather) return;
  const biome = getBiome();
  ctx.save();
  for (const item of game.weather) {
    const x = (item.x + world.width) % world.width;
    const y = (item.y + world.height) % world.height;
    ctx.globalAlpha = item.alpha;
    ctx.strokeStyle = item.color;
    ctx.fillStyle = item.color;
    ctx.lineWidth = item.width;
    ctx.beginPath();
    if (item.type === "rain") {
      ctx.moveTo(x, y);
      ctx.lineTo(x - item.size * 0.35, y + item.size * 2.1);
      ctx.stroke();
    } else if (item.type === "leaf") {
      ctx.ellipse(x, y, item.size * 0.45, item.size, item.spin, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === "ember") {
      drawStar(x, y, item.size * 0.45, item.size, 4);
      ctx.fill();
    } else if (item.type === "rift") {
      ctx.moveTo(x - item.size, y);
      ctx.lineTo(x + item.size, y);
      ctx.moveTo(x, y - item.size);
      ctx.lineTo(x, y + item.size);
      ctx.stroke();
    } else {
      ctx.arc(x, y, item.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (biome.difficulty >= 4) {
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    for (let index = 0; index < 5; index += 1) {
      const x = ((index * 571 + performance.now() * 0.025) % world.width);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 80, world.height * 0.25, x - 120, world.height * 0.68, x + 30, world.height);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFood(food) {
  ctx.save();
  ctx.translate(food.x, food.y);
  const phase = food.phase || 0;
  ctx.rotate((food.x + food.y + performance.now() * 0.06) * 0.01 + Math.sin(performance.now() / 900 + phase) * 0.08);
  const pulse = 1 + Math.sin(performance.now() / 260 + food.x + phase) * 0.06;
  ctx.scale(pulse, pulse);
  const magnetized = game.effects?.magnet > 0 && distance(game.player, food) < 240;
  drawCollectibleGlow(food, magnetized);
  drawRareFoodBeacon(food, magnetized);
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(4, 7, food.radius * 1.05, food.radius * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  if (magnetized) {
    const magnetPulse = 1 + Math.sin(performance.now() / 120 + food.x) * 0.16;
    ctx.strokeStyle = "rgba(56,197,255,0.5)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, food.radius * 1.85 * magnetPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawFoodAura(food, magnetized);
  drawFoodRarityCrown(food, magnetized);
  ctx.shadowBlur = 18;
  ctx.shadowColor = food.color;
  ctx.fillStyle = food.color;
  ctx.strokeStyle = food.accent;
  ctx.lineWidth = 2;

  if (food.shape === "leaf") {
    ctx.beginPath();
    ctx.ellipse(0, 0, food.radius * 0.72, food.radius * 1.25, -0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(7,17,15,0.34)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-food.radius * 0.32, food.radius * 0.52);
    ctx.lineTo(food.radius * 0.36, -food.radius * 0.62);
    ctx.stroke();
  } else if (food.shape === "fish") {
    ctx.beginPath();
    ctx.ellipse(-2, 0, food.radius * 1.05, food.radius * 0.68, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.moveTo(food.radius * 0.72, 0);
    ctx.lineTo(food.radius * 1.45, -food.radius * 0.62);
    ctx.lineTo(food.radius * 1.45, food.radius * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(7,17,20,0.58)";
    ctx.beginPath();
    ctx.arc(-food.radius * 0.42, -food.radius * 0.14, Math.max(1.4, food.radius * 0.13), 0, Math.PI * 2);
    ctx.fill();
  } else if (food.shape === "cap") {
    ctx.beginPath();
    ctx.arc(0, -2, food.radius, Math.PI, 0);
    ctx.lineTo(food.radius * 0.64, food.radius * 0.4);
    ctx.lineTo(-food.radius * 0.64, food.radius * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.42)";
    for (const spot of [-0.42, 0.1, 0.48]) {
      ctx.beginPath();
      ctx.arc(food.radius * spot, -food.radius * 0.28, food.radius * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (food.shape === "star") {
    drawStar(0, 0, food.radius * 0.5, food.radius * 1.05, 5);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(7,17,15,0.28)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, food.radius * 0.38, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, food.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(7,17,15,0.24)";
    ctx.beginPath();
    ctx.arc(food.radius * 0.28, food.radius * 0.2, food.radius * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.beginPath();
  ctx.arc(-food.radius * 0.3, -food.radius * 0.36, food.radius * 0.22, 0, Math.PI * 2);
  ctx.fill();
  if (food.value >= 22) {
    ctx.strokeStyle = withAlpha(food.accent, 0.5);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, food.radius + 7 + Math.sin(performance.now() / 220) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  drawFoodGlint(food);
  ctx.restore();
}

function drawRareFoodBeacon(food, magnetized) {
  if (food.value < 22 && !magnetized) return;
  const time = performance.now();
  const valuePower = clamp(food.value / 34, 0.25, 1);
  const height = food.radius * (5.5 + valuePower * 2.2);
  const width = food.radius * (0.42 + valuePower * 0.32);
  const alpha = magnetized ? 0.16 : 0.08 + valuePower * 0.08;
  ctx.save();
  ctx.globalAlpha = alpha;
  const beam = ctx.createLinearGradient(0, -height, 0, food.radius);
  beam.addColorStop(0, "rgba(255,255,255,0)");
  beam.addColorStop(0.42, withAlpha(food.accent, 0.8));
  beam.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.ellipse(0, -height * 0.34, width, height * 0.55, Math.sin(time / 900 + food.phase) * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.18 + valuePower * 0.16;
  ctx.strokeStyle = withAlpha(food.accent, 0.8);
  ctx.lineWidth = 1.3;
  ctx.setLineDash([3, 9]);
  ctx.lineDashOffset = -time * 0.035;
  ctx.beginPath();
  ctx.arc(0, 0, food.radius * (2.15 + valuePower * 0.8), 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCollectibleGlow(food, magnetized) {
  const valuePower = clamp(food.value / 34, 0.25, 1);
  const radius = food.radius * (2.4 + valuePower * 1.4 + (magnetized ? 0.8 : 0));
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, withAlpha(food.color, 0.16 + valuePower * 0.08));
  glow.addColorStop(0.5, withAlpha(food.accent, 0.08 + valuePower * 0.06));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFoodGlint(food) {
  const valuePower = clamp(food.value / 34, 0.25, 1);
  const sweep = (performance.now() / 520 + food.phase) % (Math.PI * 2);
  ctx.save();
  ctx.rotate(sweep);
  ctx.globalAlpha = 0.34 + valuePower * 0.34;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.2 + valuePower * 0.8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(0, 0, food.radius * (1.18 + valuePower * 0.18), -0.55, 0.12);
  ctx.stroke();
  if (food.value >= 22) {
    ctx.fillStyle = withAlpha(food.accent, 0.7);
    drawStar(food.radius * 1.18, -food.radius * 0.58, 1.4, 3.8, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawFoodAura(food, magnetized) {
  const rare = food.value >= 22;
  if (!rare && !magnetized) return;
  const spin = performance.now() / (rare ? 520 : 700) + food.x * 0.01;
  const radius = food.radius + (rare ? 12 : 8) + Math.sin(performance.now() / 180 + food.y) * 2;
  ctx.save();
  ctx.strokeStyle = withAlpha(rare ? food.accent : "#38c5ff", rare ? 0.32 : 0.2);
  ctx.lineWidth = rare ? 2 : 1.4;
  ctx.setLineDash(rare ? [7, 8] : [4, 8]);
  ctx.lineDashOffset = -performance.now() * 0.035;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = withAlpha(rare ? food.accent : "#38c5ff", rare ? 0.62 : 0.38);
  const glints = rare ? 4 : 2;
  for (let index = 0; index < glints; index += 1) {
    const angle = spin + (index / glints) * Math.PI * 2;
    drawStar(Math.cos(angle) * radius, Math.sin(angle) * radius, 1.5, rare ? 4.2 : 3, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawFoodRarityCrown(food, magnetized) {
  const valuePower = clamp(food.value / 34, 0.25, 1);
  if (valuePower < 0.42 && !magnetized) return;
  const time = performance.now();
  const radius = food.radius * (1.6 + valuePower * 0.7 + (magnetized ? 0.35 : 0));
  const count = food.value >= 22 ? 6 : magnetized ? 4 : 3;
  ctx.save();
  ctx.rotate(time / (food.value >= 22 ? 680 : 900) + food.phase);
  ctx.strokeStyle = withAlpha(magnetized ? "#38c5ff" : food.accent, 0.18 + valuePower * 0.22);
  ctx.fillStyle = withAlpha(food.accent, 0.24 + valuePower * 0.28);
  ctx.lineWidth = 1.2 + valuePower;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    const bob = Math.sin(time / 180 + index + food.x) * food.radius * 0.12;
    const x = Math.cos(angle) * (radius + bob);
    const y = Math.sin(angle) * (radius + bob);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    if (food.shape === "fish") {
      ctx.beginPath();
      ctx.moveTo(food.radius * 0.22, 0);
      ctx.lineTo(-food.radius * 0.28, -food.radius * 0.22);
      ctx.lineTo(-food.radius * 0.1, 0);
      ctx.lineTo(-food.radius * 0.28, food.radius * 0.22);
      ctx.closePath();
    } else if (food.shape === "leaf") {
      ctx.beginPath();
      ctx.ellipse(0, 0, food.radius * 0.16, food.radius * 0.38, 0, 0, Math.PI * 2);
    } else {
      drawStar(0, 0, food.radius * 0.12, food.radius * 0.32, 4);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawPowerUp(powerUp) {
  const pulse = 1 + Math.sin(performance.now() / 180 + powerUp.x) * 0.08;
  const ring = 1 + Math.sin(performance.now() / 230 + powerUp.y) * 0.12;
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y);
  drawPowerUpBeacon(powerUp, ring);
  const beam = ctx.createLinearGradient(0, -150, 0, 24);
  beam.addColorStop(0, "rgba(255,255,255,0)");
  beam.addColorStop(0.45, withAlpha(powerUp.color, 0.18));
  beam.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.ellipse(0, -55, powerUp.radius * 0.6, 118, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.beginPath();
  ctx.ellipse(5, 8, powerUp.radius * 1.45, powerUp.radius * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  drawPowerUpGroundRune(powerUp, pulse, ring);
  drawPowerUpLens(powerUp, pulse, ring);
  drawPowerUpField(powerUp, pulse, ring);
  ctx.strokeStyle = withAlpha(powerUp.color, 0.34);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, powerUp.radius * 2.05 * ring, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(powerUp.accent, 0.22);
  ctx.beginPath();
  ctx.arc(0, 0, powerUp.radius * 2.9 * (2 - ring), 0, Math.PI * 2);
  ctx.stroke();
  drawPowerUpOrbit(powerUp, ring);
  ctx.rotate(performance.now() / 900);
  ctx.shadowBlur = 24;
  ctx.shadowColor = powerUp.color;
  ctx.fillStyle = "rgba(3, 8, 9, 0.72)";
  ctx.strokeStyle = powerUp.color;
  ctx.lineWidth = 3;
  drawStar(0, 0, powerUp.radius * 0.7 * pulse, powerUp.radius * 1.45 * pulse, 6);
  ctx.fill();
  ctx.stroke();
  ctx.rotate(-performance.now() / 900);
  ctx.fillStyle = powerUp.color;
  ctx.beginPath();
  ctx.arc(0, 0, powerUp.radius * 0.72 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#07110f";
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 2;
  drawPowerUpIcon(powerUp.type, powerUp.radius * 0.52);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.textBaseline = "alphabetic";
  ctx.font = "900 11px Inter, system-ui, sans-serif";
  ctx.fillStyle = "rgba(3,8,9,0.72)";
  const labelWidth = ctx.measureText(powerUp.name).width + 16;
  roundRect(-labelWidth / 2, powerUp.radius + 16, labelWidth, 20, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(powerUp.name, 0, powerUp.radius + 30);
  ctx.restore();
}

function drawPowerUpGroundRune(powerUp, pulse, ring) {
  const time = performance.now();
  const radius = powerUp.radius * (2.15 + ring * 0.25);
  ctx.save();
  ctx.translate(0, powerUp.radius * 0.95);
  ctx.scale(1, 0.42);
  ctx.rotate(time / (powerUp.type === "surge" ? 420 : 700));
  ctx.strokeStyle = withAlpha(powerUp.color, 0.22);
  ctx.fillStyle = withAlpha(powerUp.accent, 0.055);
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = -time * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = withAlpha(powerUp.accent, 0.3);
  ctx.lineWidth = 1.2;
  if (powerUp.type === "magnet") {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * radius * 0.2, 0, radius * 0.46, Math.PI * 0.18, Math.PI * 1.82);
      ctx.stroke();
    }
  } else if (powerUp.type === "shield") {
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const x = Math.cos(angle) * radius * 0.62;
      const y = Math.sin(angle) * radius * 0.62;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    for (let index = 0; index < 5; index += 1) {
      const angle = (index / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * radius * 0.18, Math.sin(angle) * radius * 0.18);
      ctx.lineTo(Math.cos(angle) * radius * 0.78, Math.sin(angle) * radius * 0.78);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawPowerUpBeacon(powerUp, ring) {
  const time = performance.now();
  const sweep = time / 520 + powerUp.x * 0.01;
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = withAlpha(powerUp.accent, 0.72);
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 12]);
  ctx.lineDashOffset = -time * 0.05;
  ctx.beginPath();
  ctx.ellipse(0, 0, powerUp.radius * 3.9 * ring, powerUp.radius * 1.9, sweep * 0.08, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = withAlpha(powerUp.color, 0.68);
  for (let index = 0; index < 4; index += 1) {
    const angle = sweep + (index / 4) * Math.PI * 2;
    const x = Math.cos(angle) * powerUp.radius * 3.4 * ring;
    const y = Math.sin(angle) * powerUp.radius * 1.55;
    drawStar(x, y, 1.8, 4.8, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerUpLens(powerUp, pulse, ring) {
  const time = performance.now();
  const radius = powerUp.radius * (3.4 + ring * 0.5);
  ctx.save();
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  glow.addColorStop(0, withAlpha(powerUp.color, 0.2));
  glow.addColorStop(0.44, withAlpha(powerUp.accent, 0.08));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha(powerUp.accent, 0.38);
  ctx.lineWidth = 1.6;
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = -time * 0.05;
  for (let index = 0; index < 2; index += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, powerUp.radius * (2.35 + index * 0.54) * pulse, powerUp.radius * (1.0 + index * 0.28), time / 900 + index * 0.9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.fillStyle = withAlpha(powerUp.color, 0.52);
  for (let index = 0; index < 5; index += 1) {
    const angle = time / 310 + (index / 5) * Math.PI * 2;
    const x = Math.cos(angle) * powerUp.radius * 3.05;
    const y = Math.sin(angle) * powerUp.radius * 1.42;
    drawStar(x, y, 1.4, 3.4, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawPowerUpField(powerUp, pulse, ring) {
  const time = performance.now();
  const spin = time / 640 + powerUp.x * 0.01;
  const radius = powerUp.radius * (2.3 + ring * 0.28);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = withAlpha(powerUp.color, 0.26);
  ctx.lineWidth = 2;
  for (let index = 0; index < 4; index += 1) {
    const angle = spin + (index / 4) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-8 * pulse, -4);
    ctx.lineTo(0, -11 * pulse);
    ctx.lineTo(8 * pulse, -4);
    ctx.stroke();
    ctx.restore();
  }

  const beamCount = powerUp.type === "surge" ? 8 : 6;
  ctx.strokeStyle = withAlpha(powerUp.accent, powerUp.type === "shield" ? 0.24 : 0.18);
  ctx.lineWidth = powerUp.type === "surge" ? 1.8 : 1.2;
  for (let index = 0; index < beamCount; index += 1) {
    const angle = -spin * 0.55 + (index / beamCount) * Math.PI * 2;
    const inner = powerUp.radius * 0.92;
    const outer = radius * (1.18 + Math.sin(time / 180 + index) * 0.06);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.stroke();
  }

  if (powerUp.type === "shield") {
    ctx.strokeStyle = withAlpha(powerUp.color, 0.28);
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = spin + (index / 6) * Math.PI * 2;
      const x = Math.cos(angle) * radius * 0.78;
      const y = Math.sin(angle) * radius * 0.78;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (powerUp.type === "magnet") {
    ctx.strokeStyle = withAlpha(powerUp.accent, 0.26);
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * powerUp.radius * 0.45, 0, radius * 0.52, -Math.PI * 0.68, Math.PI * 0.68);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = withAlpha("#ffffff", 0.22);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -time * 0.08;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}

function drawPowerUpOrbit(powerUp, ring) {
  const spin = performance.now() / 520 + powerUp.y * 0.01;
  const radius = powerUp.radius * 2.45 * ring;
  ctx.save();
  ctx.fillStyle = withAlpha(powerUp.accent, 0.72);
  ctx.strokeStyle = "rgba(3,8,9,0.36)";
  ctx.lineWidth = 1.2;
  for (let index = 0; index < 3; index += 1) {
    const angle = spin + (index / 3) * Math.PI * 2;
    ctx.save();
    ctx.translate(Math.cos(angle) * radius, Math.sin(angle) * radius);
    ctx.rotate(angle);
    drawPowerUpIcon(powerUp.type, 4.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawPowerUpIcon(type, size) {
  ctx.beginPath();
  if (type === "magnet") {
    ctx.arc(0, 0, size, Math.PI * 0.18, Math.PI * 1.82);
    ctx.lineTo(-size * 0.42, size * 0.64);
    ctx.moveTo(size * 0.95, size * 0.18);
    ctx.lineTo(size * 0.42, size * 0.64);
  } else if (type === "shield") {
    ctx.moveTo(0, -size * 1.1);
    ctx.lineTo(size * 0.9, -size * 0.45);
    ctx.lineTo(size * 0.62, size * 0.72);
    ctx.lineTo(0, size * 1.08);
    ctx.lineTo(-size * 0.62, size * 0.72);
    ctx.lineTo(-size * 0.9, -size * 0.45);
    ctx.closePath();
  } else {
    ctx.moveTo(size * 0.16, -size * 1.1);
    ctx.lineTo(-size * 0.78, size * 0.12);
    ctx.lineTo(-size * 0.14, size * 0.12);
    ctx.lineTo(-size * 0.32, size * 1.08);
    ctx.lineTo(size * 0.82, -size * 0.22);
    ctx.lineTo(size * 0.16, -size * 0.22);
    ctx.closePath();
  }
}

function drawPlayerEffectAura() {
  const player = game.player;
  const time = performance.now();
  const boosting = isBoostHeld() && player.boost > 1;
  const surge = game.effects.surge > 0;
  const shield = game.effects.shield > 0;
  const magnet = game.effects.magnet > 0;
  if (!boosting && !surge && !shield && !magnet) return;

  ctx.save();
  ctx.lineCap = "round";

  if (boosting || surge) {
    const exhaustColor = surge ? "#ffd54e" : "#ffb340";
    const count = surge ? 10 : 7;
    for (let index = 0; index < count; index += 1) {
      const spread = (index / Math.max(1, count - 1) - 0.5) * 1.2;
      const angle = player.angle + Math.PI + spread;
      const length = (surge ? 92 : 66) + (index % 3) * 12 + Math.sin(time / 90 + index) * 8;
      const start = player.radius * (0.78 + (index % 2) * 0.18);
      const x = player.x + Math.cos(angle) * start;
      const y = player.y + Math.sin(angle) * start;
      const gradient = ctx.createLinearGradient(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      gradient.addColorStop(0, normalizeColor(exhaustColor, surge ? 0.42 : 0.32));
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = surge ? 7 : 5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
      ctx.stroke();
    }
  }

  if (magnet) {
    const radius = 132 + Math.sin(time / 150) * 10;
    ctx.strokeStyle = "rgba(56,197,255,0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 14]);
    ctx.lineDashOffset = -time * 0.05;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let index = 0; index < 4; index += 1) {
      const angle = time / 420 + (index / 4) * Math.PI * 2;
      ctx.fillStyle = "rgba(56,197,255,0.36)";
      ctx.beginPath();
      ctx.arc(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (shield) {
    const radius = player.radius + 34 + Math.sin(time / 130) * 3;
    ctx.strokeStyle = "rgba(80,255,154,0.28)";
    ctx.fillStyle = "rgba(80,255,154,0.045)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(221,255,69,0.2)";
    for (let index = 0; index < 6; index += 1) {
      const angle = time / 560 + (index / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  if (surge) {
    ctx.strokeStyle = "rgba(255,213,78,0.28)";
    ctx.lineWidth = 2;
    for (let index = 0; index < 8; index += 1) {
      const angle = time / 110 + (index / 8) * Math.PI * 2;
      const inner = player.radius + 18;
      const outer = player.radius + 34 + Math.sin(time / 80 + index) * 5;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(angle) * inner, player.y + Math.sin(angle) * inner);
      ctx.lineTo(player.x + Math.cos(angle + 0.12) * outer, player.y + Math.sin(angle + 0.12) * outer);
      ctx.stroke();
    }
  }

  drawActiveEffectFields(player, time);
  drawActiveEffectLinks(player, time);
  drawActiveEffectSigils(player, time);
  ctx.restore();
}

function drawActiveEffectFields(player, time) {
  const magnet = game.effects.magnet > 0;
  const shield = game.effects.shield > 0;
  const surge = game.effects.surge > 0;
  if (!magnet && !shield && !surge) return;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (magnet) {
    ctx.strokeStyle = "rgba(56,197,255,0.16)";
    ctx.lineWidth = 1.5;
    for (let lane = 0; lane < 5; lane += 1) {
      const radius = 82 + lane * 18 + Math.sin(time / 260 + lane) * 5;
      ctx.setLineDash([8 + lane * 2, 14]);
      ctx.lineDashOffset = -time * (0.035 + lane * 0.004);
      ctx.beginPath();
      ctx.ellipse(player.x, player.y, radius, radius * 0.44, player.angle + lane * 0.34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  if (shield) {
    const sides = 8;
    const radius = player.radius + 44 + Math.sin(time / 180) * 3;
    ctx.fillStyle = "rgba(80,255,154,0.055)";
    ctx.strokeStyle = "rgba(221,255,69,0.26)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let index = 0; index < sides; index += 1) {
      const angle = time / 900 + (index / sides) * Math.PI * 2;
      const x = player.x + Math.cos(angle) * radius;
      const y = player.y + Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    for (let index = 0; index < sides; index += 2) {
      const angle = time / 900 + (index / sides) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius);
      ctx.stroke();
    }
  }

  if (surge) {
    ctx.strokeStyle = "rgba(255,213,78,0.34)";
    ctx.lineWidth = 2.4;
    for (let lane = 0; lane < 7; lane += 1) {
      const angle = player.angle + Math.PI + (lane - 3) * 0.2;
      const length = 82 + lane * 7 + Math.sin(time / 80 + lane) * 10;
      const side = lane % 2 === 0 ? 1 : -1;
      const startX = player.x - Math.cos(player.angle) * player.radius + Math.cos(player.angle + Math.PI / 2) * side * lane * 2.4;
      const startY = player.y - Math.sin(player.angle) * player.radius + Math.sin(player.angle + Math.PI / 2) * side * lane * 2.4;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(
        startX + Math.cos(angle) * length * 0.44 + Math.cos(angle + 1.3) * 8,
        startY + Math.sin(angle) * length * 0.44 + Math.sin(angle + 1.3) * 8
      );
      ctx.lineTo(startX + Math.cos(angle + 0.12) * length, startY + Math.sin(angle + 0.12) * length);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawActiveEffectLinks(player, time) {
  const active = Object.entries(game.effects || {}).filter(([, value]) => value > 0);
  if (!active.length) return;
  const radius = player.radius + 56;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalCompositeOperation = "screen";
  for (let index = 0; index < active.length; index += 1) {
    const [type, value] = active[index];
    const color = effectColor(type);
    const angle = time / (520 + index * 80) + (index / active.length) * Math.PI * 2;
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    const midAngle = angle - 0.58 + Math.sin(time / 500 + index) * 0.18;
    const midRadius = radius * (0.54 + Math.sin(time / 360 + index) * 0.05);
    const midX = player.x + Math.cos(midAngle) * midRadius;
    const midY = player.y + Math.sin(midAngle) * midRadius;
    const strength = clamp(value / 10, 0.25, 1);

    ctx.strokeStyle = withAlpha(color, 0.08 + strength * 0.14);
    ctx.lineWidth = 2 + strength * 1.8;
    ctx.setLineDash([7 + strength * 8, 12]);
    ctx.lineDashOffset = -time * (0.04 + strength * 0.02);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.quadraticCurveTo(midX, midY, x, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = withAlpha(color, 0.24 + strength * 0.24);
    for (let dot = 0; dot < 3; dot += 1) {
      const t = ((time * (0.00045 + strength * 0.0002) + dot / 3 + index * 0.12) % 1);
      const curveX = (1 - t) * (1 - t) * player.x + 2 * (1 - t) * t * midX + t * t * x;
      const curveY = (1 - t) * (1 - t) * player.y + 2 * (1 - t) * t * midY + t * t * y;
      ctx.beginPath();
      ctx.arc(curveX, curveY, 2.2 + strength * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawActiveEffectSigils(player, time) {
  const active = Object.entries(game.effects || {}).filter(([, value]) => value > 0);
  if (!active.length) return;
  const radius = player.radius + 56;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let index = 0; index < active.length; index += 1) {
    const [type, value] = active[index];
    const angle = time / (520 + index * 80) + (index / active.length) * Math.PI * 2;
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    const color = effectColor(type);
    const pulse = 1 + Math.sin(time / 140 + index) * 0.08;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "rgba(3,8,9,0.64)";
    ctx.strokeStyle = withAlpha(color, 0.64);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.fillStyle = withAlpha(color, 0.18);
    drawPowerUpIcon(type, 6.5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 8px Inter, system-ui, sans-serif";
    ctx.fillText(Math.ceil(value), 0, 24);
    ctx.restore();
  }
  ctx.restore();
}

function drawSnake(snake) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  drawCreatureShadow(snake);
  drawChainAura(snake);
  if (!snake.player && game.player) drawRivalLockOn(snake);

  if (!snake.player && game.player && snake.length >= game.player.length) {
    drawPredatorThreatCrown(snake);
    const threatPulse = 1 + Math.sin(performance.now() / 150 + snake.length) * 0.08;
    ctx.strokeStyle = "rgba(255,79,109,0.34)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, (snake.radius + 13) * threatPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,213,78,0.16)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, (snake.radius + 22) * threatPulse, 0, Math.PI * 2);
    ctx.stroke();
  } else if (!snake.player && game.player && snake.length < game.player.length) {
    const ediblePulse = 1 + Math.sin(performance.now() / 190 + snake.length) * 0.06;
    ctx.strokeStyle = "rgba(80,255,154,0.22)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, (snake.radius + 11) * ediblePulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (snake.player && game.effects.shield > 0) {
    ctx.strokeStyle = "rgba(80,255,154,0.42)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, snake.radius + 22 + Math.sin(performance.now() / 120) * 3, 0, Math.PI * 2);
    ctx.stroke();
    drawShieldFacets(snake);
  }

  if (snake.player && game.effects.magnet > 0) {
    ctx.strokeStyle = "rgba(56,197,255,0.22)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, 120 + Math.sin(performance.now() / 180) * 12, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (snake.player && game.effects.surge > 0) {
    ctx.strokeStyle = "rgba(255,213,78,0.34)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, snake.radius + 15 + Math.sin(performance.now() / 90) * 3, 0, Math.PI * 2);
    ctx.stroke();
    drawSurgeBolts(snake);
  }

  if (snake.player) {
    drawDominanceField(snake);
    drawEvolutionHalo(snake);
    drawNextPredatorPreview(snake);
  }
  if (snake.player && snake.tierIndex >= predatorTiers.length - 1) drawApexAura(snake);
  if (snake.player) drawPredatorMantle(snake);

  if (snake.player && isBoostHeld()) {
    ctx.strokeStyle = "rgba(255,213,78,0.28)";
    ctx.lineWidth = snake.radius * 2.8;
    ctx.beginPath();
    for (let index = 0; index < Math.min(snake.segments.length, 14); index += 1) {
      const point = snake.segments[index];
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  drawAnimalSilhouette(snake);
  drawTrailRibbon(snake);

  for (let index = snake.segments.length - 1; index > 0; index -= 1) {
    const point = snake.segments[index];
    const fade = 1 - index / snake.segments.length;
    const radius = Math.max(5, snake.radius * (0.55 + fade * 0.45));
    const segmentGradient = ctx.createRadialGradient(
      point.x - radius * 0.35,
      point.y - radius * 0.35,
      1,
      point.x,
      point.y,
      radius
    );
    segmentGradient.addColorStop(0, "#ffffff");
    segmentGradient.addColorStop(0.22, shade(snake.color, fade + 0.2));
    segmentGradient.addColorStop(1, shade(snake.color, fade * 0.4));
    ctx.fillStyle = segmentGradient;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (index % 4 === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.arc(point.x - radius * 0.25, point.y - radius * 0.28, Math.max(2, radius * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawChainLinkDetails(snake);
  drawBodyMarkings(snake);
  drawCreatureMotionAccents(snake);
  drawTailAccent(snake);
  if (!snake.player) drawRivalRankInsignia(snake);

  ctx.shadowBlur = snake.player ? 28 : 18;
  ctx.shadowColor = snake.color;
  const headGradient = ctx.createRadialGradient(
    snake.x - snake.radius * 0.4,
    snake.y - snake.radius * 0.45,
    2,
    snake.x,
    snake.y,
    snake.radius + 6
  );
  headGradient.addColorStop(0, "#ffffff");
  headGradient.addColorStop(0.18, shade(snake.color, 1));
  headGradient.addColorStop(1, shade(snake.color, 0.22));
  ctx.fillStyle = headGradient;
  ctx.beginPath();
  ctx.ellipse(snake.x, snake.y, snake.radius + 6, snake.radius + 3, snake.angle, 0, Math.PI * 2);
  ctx.fill();
  drawHeadShine(snake);
  ctx.shadowBlur = 0;

  const eyeA = snake.angle - 0.48;
  const eyeB = snake.angle + 0.48;
  drawAnimalFeatures(snake);
  drawEye(snake, eyeA);
  drawEye(snake, eyeB);

  drawNameplate(snake);
  ctx.restore();
}

function drawEvolutionHalo(snake) {
  const tierIndex = Math.floor(game.score / 100);
  if (tierIndex >= predatorTiers.length - 1) return;
  const progress = (game.score % 100) / 100;
  const radius = snake.radius + 31;
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * progress;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(snake.x, snake.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = predatorTiers[tierIndex + 1].color;
  ctx.shadowBlur = 12;
  ctx.shadowColor = predatorTiers[tierIndex + 1].color;
  ctx.beginPath();
  ctx.arc(snake.x, snake.y, radius, start, end);
  ctx.stroke();
  ctx.restore();
}

function drawRivalLockOn(rival) {
  const player = game.player;
  const d = distance(player, rival);
  if (d > 520) return;
  const dangerous = rival.length >= player.length;
  const advantage = dangerous
    ? clamp((rival.length - player.length) / Math.max(1, player.length), 0.1, 1.3)
    : clamp((player.length - rival.length) / Math.max(1, player.length), 0.1, 1.3);
  const alpha = clamp((520 - d) / 520, 0, 1) * (dangerous ? 0.9 : 0.68);
  const color = dangerous ? "#ff4f6d" : "#50ff9a";
  const accent = dangerous ? "#ffd54e" : rival.color;
  const time = performance.now();
  const radius = rival.radius + 24 + advantage * 18 + Math.sin(time / (dangerous ? 120 : 190) + rival.length) * 3;

  ctx.save();
  ctx.translate(rival.x, rival.y);
  ctx.rotate(time / (dangerous ? -420 : 560) + rival.length * 0.01);
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.strokeStyle = withAlpha(color, dangerous ? 0.42 : 0.28);
  ctx.lineWidth = dangerous ? 2.6 : 1.8;
  ctx.setLineDash(dangerous ? [16, 7] : [7, 12]);
  ctx.lineDashOffset = dangerous ? time * 0.06 : -time * 0.035;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const bracketSize = 10 + advantage * 8;
  ctx.strokeStyle = withAlpha(accent, dangerous ? 0.52 : 0.34);
  ctx.lineWidth = dangerous ? 2.2 : 1.6;
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(-bracketSize * 0.6, -bracketSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(-bracketSize * 0.6, bracketSize);
    ctx.stroke();
    ctx.restore();
  }

  if (!dangerous) {
    ctx.fillStyle = withAlpha(color, 0.14 + alpha * 0.16);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = withAlpha("#ffffff", 0.12 + alpha * 0.1);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDominanceField(snake) {
  const tier = getPredatorTier();
  const tierIndex = snake.tierIndex || 0;
  const biome = getBiome();
  const time = performance.now();
  const growth = clamp((snake.length - 12) / 70, 0, 1);
  const levelPower = clamp(tierIndex / Math.max(1, predatorTiers.length - 1), 0, 1);
  const intensity = clamp(0.22 + growth * 0.38 + levelPower * 0.3 + biome.difficulty * 0.045, 0.22, 0.92);
  const baseRadius = snake.radius + 42 + growth * 38 + biome.difficulty * 6;
  const accent = biome.glow[0] || tier.color;
  const outer = baseRadius + Math.sin(time / 240) * (4 + levelPower * 5);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = intensity;

  const glow = ctx.createRadialGradient(snake.x, snake.y, snake.radius, snake.x, snake.y, outer * 1.45);
  glow.addColorStop(0, withAlpha(tier.color, 0.08));
  glow.addColorStop(0.54, withAlpha(accent, 0.035 + levelPower * 0.035));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(snake.x, snake.y, outer * 1.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = withAlpha(tier.color, 0.18 + levelPower * 0.16);
  ctx.lineWidth = 2 + levelPower * 2.2;
  ctx.setLineDash([14 + tierIndex * 2, 18]);
  ctx.lineDashOffset = -time * (0.026 + levelPower * 0.018);
  ctx.beginPath();
  ctx.ellipse(snake.x, snake.y, outer, outer * 0.72, snake.angle * 0.16, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = withAlpha("#ffffff", 0.055 + growth * 0.06);
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 16]);
  ctx.lineDashOffset = time * 0.032;
  ctx.beginPath();
  ctx.ellipse(snake.x, snake.y, outer * 0.72, outer * 0.46, snake.angle * -0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const markCount = 5 + Math.min(7, tierIndex + biome.difficulty);
  ctx.fillStyle = withAlpha(tier.color, 0.18 + levelPower * 0.22);
  ctx.strokeStyle = withAlpha("#ffffff", 0.12 + levelPower * 0.16);
  ctx.lineWidth = 1.2;
  for (let index = 0; index < markCount; index += 1) {
    const angle = time / (760 - tierIndex * 38) + (index / markCount) * Math.PI * 2;
    const r = outer * (0.86 + Math.sin(time / 310 + index) * 0.04);
    const x = snake.x + Math.cos(angle) * r;
    const y = snake.y + Math.sin(angle) * r * 0.72;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.beginPath();
    if (tier.animal === "bird" || tier.animal === "dragon") {
      drawStar(0, 0, 2.4 + levelPower * 1.5, 6.8 + levelPower * 4, 4);
    } else if (tier.animal === "shark") {
      ctx.moveTo(0, -7 - levelPower * 4);
      ctx.lineTo(7 + levelPower * 4, 5);
      ctx.lineTo(0, 2);
      ctx.lineTo(-7 - levelPower * 4, 5);
      ctx.closePath();
    } else {
      ctx.moveTo(0, -8 - levelPower * 4);
      ctx.lineTo(4 + levelPower * 3, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-4 - levelPower * 3, 6);
      ctx.closePath();
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawNextPredatorPreview(snake) {
  const tierIndex = Math.floor(game.score / 100);
  if (tierIndex >= predatorTiers.length - 1) return;
  const progress = (game.score % 100) / 100;
  if (progress < 0.72) return;

  const nextTier = predatorTiers[tierIndex + 1];
  const reveal = clamp((progress - 0.72) / 0.28, 0, 1);
  const time = performance.now();
  const orbitRadius = snake.radius + 52 + reveal * 18;
  const angle = time / 620;
  const x = snake.x + Math.cos(angle) * orbitRadius;
  const y = snake.y + Math.sin(angle) * orbitRadius * 0.58;

  ctx.save();
  ctx.globalAlpha = 0.22 + reveal * 0.48;
  ctx.strokeStyle = withAlpha(nextTier.color, 0.28 + reveal * 0.2);
  ctx.lineWidth = 1.6 + reveal * 1.4;
  ctx.setLineDash([7, 12]);
  ctx.lineDashOffset = -time * 0.045;
  ctx.beginPath();
  ctx.ellipse(snake.x, snake.y, orbitRadius, orbitRadius * 0.58, snake.angle * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.shadowBlur = 20 * reveal;
  ctx.shadowColor = nextTier.color;
  drawRevealCreature(x, y, nextTier, reveal, 0.65 + reveal * 0.35);

  ctx.shadowBlur = 0;
  ctx.fillStyle = withAlpha(nextTier.color, 0.28 + reveal * 0.24);
  ctx.beginPath();
  ctx.arc(x, y, 25 + reveal * 8, 0, Math.PI * 2);
  ctx.strokeStyle = withAlpha("#ffffff", 0.16 + reveal * 0.18);
  ctx.stroke();

  if (reveal > 0.45) {
    ctx.font = "900 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = withAlpha("#ffffff", 0.72);
    ctx.fillText(nextTier.name.toUpperCase(), x, y + 36);
  }
  ctx.restore();
}

function drawApexAura(snake) {
  const radius = snake.radius + 38;
  const spin = performance.now() / 520;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.arc(snake.x, snake.y, radius + Math.sin(performance.now() / 140) * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "rgba(255,213,78,0.82)";
  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  ctx.lineWidth = 1.5;
  for (let index = 0; index < 7; index += 1) {
    const angle = spin + (index / 7) * Math.PI * 2;
    const x = snake.x + Math.cos(angle) * radius;
    const y = snake.y + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * 8, y + Math.sin(angle) * 8);
    ctx.lineTo(x + Math.cos(angle + 2.35) * 6, y + Math.sin(angle + 2.35) * 6);
    ctx.lineTo(x + Math.cos(angle - 2.35) * 6, y + Math.sin(angle - 2.35) * 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPredatorMantle(snake) {
  const tier = snake.tierIndex || 0;
  if (tier < 2 || !snake.segments?.length) return;
  const time = performance.now();
  const color = getPredatorTier().color;
  const maxPoints = Math.min(snake.segments.length, 26 + tier * 2);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = withAlpha(color, 0.16 + tier * 0.018);
  ctx.lineWidth = Math.max(3, snake.radius * 0.32);
  ctx.setLineDash([8 + tier, 16]);
  ctx.lineDashOffset = -time * 0.05;
  ctx.beginPath();
  for (let index = 1; index < maxPoints; index += 1) {
    const point = snake.segments[index];
    const previous = snake.segments[index - 1] || point;
    const angle = Math.atan2(point.y - previous.y, point.x - previous.x) + Math.PI / 2;
    const wave = Math.sin(time / 170 + index * 0.9) * snake.radius * 0.12;
    const side = index % 2 === 0 ? 1 : -1;
    const x = point.x + Math.cos(angle) * (snake.radius * 0.72 + wave) * side;
    const y = point.y + Math.sin(angle) * (snake.radius * 0.72 + wave) * side;
    if (index === 1) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = withAlpha(color, 0.34);
  for (let index = 6; index < maxPoints; index += 8) {
    const point = snake.segments[index];
    const previous = snake.segments[index - 1] || point;
    const angle = Math.atan2(point.y - previous.y, point.x - previous.x) + Math.PI / 2;
    for (const side of [-1, 1]) {
      const x = point.x + Math.cos(angle) * snake.radius * 1.04 * side;
      const y = point.y + Math.sin(angle) * snake.radius * 1.04 * side;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + side * 0.4);
      drawStar(0, 0, snake.radius * 0.12, snake.radius * 0.32, tier >= 5 ? 5 : 4);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
}

function drawChainAura(snake) {
  const important = snake.player || Math.abs(snake.length - game.player.length) < 18 || snake.length > game.player.length;
  if (!important) return;
  const alpha = snake.player ? 0.16 : snake.length > game.player.length ? 0.12 : 0.07;
  const glow = snake.player ? snake.color : snake.length > game.player.length ? "#ff4f6d" : "#50ff9a";
  ctx.save();
  ctx.strokeStyle = withAlpha(glow, alpha);
  ctx.lineWidth = Math.max(10, snake.radius * 1.15);
  ctx.beginPath();
  for (let index = 0; index < Math.min(snake.segments.length, 34); index += 1) {
    const point = snake.segments[index];
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawPredatorThreatCrown(snake) {
  const player = game.player;
  const advantage = clamp((snake.length - player.length) / Math.max(1, player.length), 0, 1.4);
  const time = performance.now();
  const radius = snake.radius + 28 + advantage * 16;
  const alpha = 0.38 + advantage * 0.18;
  ctx.save();
  ctx.translate(snake.x, snake.y);
  ctx.rotate(time / -620 + snake.length * 0.017);
  ctx.shadowBlur = 14 + advantage * 8;
  ctx.shadowColor = "rgba(255,79,109,0.55)";
  ctx.fillStyle = `rgba(255,79,109,${alpha})`;
  ctx.strokeStyle = `rgba(255,213,78,${0.22 + advantage * 0.14})`;
  ctx.lineWidth = 1.5 + advantage;

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const inner = radius * (0.82 + Math.sin(time / 160 + index) * 0.025);
    const outer = radius * (1.02 + advantage * 0.1);
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle - 0.07) * inner, Math.sin(angle - 0.07) * inner);
    ctx.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
    ctx.lineTo(Math.cos(angle + 0.07) * inner, Math.sin(angle + 0.07) * inner);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(255,255,255,${0.1 + advantage * 0.08})`;
  ctx.setLineDash([5, 8]);
  ctx.lineDashOffset = time * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawAnimalSilhouette(creature) {
  if (!creature.segments?.length) return;
  const time = performance.now();
  const strong = creature.player || creature.length >= game.player.length;
  const alpha = creature.player ? 0.38 : strong ? 0.28 : 0.2;
  const color = creature.player ? creature.color : strong ? "#ff4f6d" : creature.color;
  const sidePoints = [
    creature.segments[Math.min(4, creature.segments.length - 1)],
    creature.segments[Math.min(10, creature.segments.length - 1)],
    creature.segments[Math.min(16, creature.segments.length - 1)]
  ].filter(Boolean);

  ctx.save();
  ctx.fillStyle = withAlpha(color, alpha);
  ctx.strokeStyle = withAlpha("#ffffff", creature.player ? 0.22 : 0.14);
  ctx.lineWidth = Math.max(1.4, creature.radius * 0.1);

  if (creature.animal === "bird" || creature.animal === "dragon") {
    sidePoints.forEach((point, index) => {
      const next = creature.segments[Math.min(creature.segments.length - 1, index * 6 + 8)] || point;
      const angle = Math.atan2(point.y - next.y, point.x - next.x);
      const flap = Math.sin(time / 170 + index) * 0.18;
      const span = creature.radius * (creature.animal === "dragon" ? 2.45 : 2.05) * (1 - index * 0.12);
      const length = creature.radius * (creature.animal === "dragon" ? 2.1 : 1.55) * (1 - index * 0.08);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle + side * (Math.PI / 2 + flap));
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(span * 0.45, side * length * 0.12, span, side * length * 0.58);
        ctx.quadraticCurveTo(span * 0.38, side * length * 0.34, -creature.radius * 0.2, side * length * 0.12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    });
  } else if (creature.animal === "shark") {
    sidePoints.forEach((point, index) => {
      const previous = creature.segments[Math.max(0, index * 5 + 1)] || point;
      const next = creature.segments[Math.min(creature.segments.length - 1, index * 5 + 8)] || point;
      const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
      const size = creature.radius * (1.45 - index * 0.14);
      ctx.save();
      ctx.translate(point.x, point.y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, -size * 0.3);
      ctx.lineTo(size * 0.68, -size * 1.28);
      ctx.lineTo(size * 0.42, -size * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, size * 0.28);
      ctx.lineTo(size * 0.6, size * 1.02);
      ctx.lineTo(size * 0.34, size * 0.04);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  } else if (creature.animal === "wolf" || creature.animal === "fox" || creature.animal === "cat") {
    const maneCount = creature.animal === "cat" ? 7 : 9;
    for (let index = 0; index < maneCount; index += 1) {
      const point = creature.segments[Math.min(creature.segments.length - 1, 2 + index * 2)];
      if (!point) continue;
      const previous = creature.segments[Math.min(creature.segments.length - 1, Math.max(0, index * 2))] || point;
      const next = creature.segments[Math.min(creature.segments.length - 1, 4 + index * 2)] || point;
      const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
      const size = creature.radius * (0.72 + (index % 3) * 0.1);
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(angle + side * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(-size * 0.22, 0);
        ctx.lineTo(size * 0.32, side * size * 0.86);
        ctx.lineTo(size * 0.46, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  } else if (creature.animal === "mouse") {
    const tail = creature.segments[creature.segments.length - 1];
    const beforeTail = creature.segments[Math.max(0, creature.segments.length - 8)];
    const angle = Math.atan2(tail.y - beforeTail.y, tail.x - beforeTail.x);
    ctx.strokeStyle = withAlpha(color, 0.32);
    ctx.lineWidth = creature.radius * 0.34;
    ctx.beginPath();
    ctx.moveTo(tail.x, tail.y);
    ctx.quadraticCurveTo(
      tail.x + Math.cos(angle + 0.8) * creature.radius * 2.2,
      tail.y + Math.sin(angle + 0.8) * creature.radius * 2.2,
      tail.x + Math.cos(angle + 1.3) * creature.radius * 3.4,
      tail.y + Math.sin(angle + 1.3) * creature.radius * 3.4
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawTrailRibbon(creature) {
  if (creature.segments.length < 3) return;
  const maxPoints = Math.min(creature.segments.length, 42);
  const boosted = creature.player && (isBoostHeld() || game.effects.surge > 0);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  drawMovementWake(creature, maxPoints, boosted);

  ctx.globalAlpha = creature.player ? 0.34 : 0.22;
  ctx.strokeStyle = shade(creature.color, 0.25);
  ctx.lineWidth = creature.radius * 1.25;
  ctx.beginPath();
  for (let index = 0; index < maxPoints; index += 1) {
    const point = creature.segments[index];
    if (index === 0) ctx.moveTo(point.x, point.y);
    else {
      const previous = creature.segments[index - 1];
      const midX = (previous.x + point.x) / 2;
      const midY = (previous.y + point.y) / 2;
      ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);
    }
  }
  ctx.stroke();

  ctx.globalAlpha = creature.player ? 0.46 : 0.3;
  ctx.strokeStyle = creature.color;
  ctx.lineWidth = creature.radius * 0.52;
  ctx.stroke();
  ctx.restore();
}

function drawMovementWake(creature, maxPoints, boosted) {
  const time = performance.now();
  const color = boosted ? "#ffd54e" : creature.color;
  const wakeAlpha = creature.player ? 0.18 : 0.1;
  const outerWidth = creature.radius * (boosted ? 2.25 : 1.65);
  const innerWidth = creature.radius * (boosted ? 0.82 : 0.58);

  ctx.save();
  ctx.globalAlpha = wakeAlpha;
  ctx.strokeStyle = withAlpha(color, boosted ? 0.52 : 0.34);
  ctx.lineWidth = outerWidth;
  ctx.setLineDash(boosted ? [18, 16] : [12, 18]);
  ctx.lineDashOffset = -time * (boosted ? 0.09 : 0.035);
  ctx.beginPath();
  for (let index = 2; index < maxPoints; index += 1) {
    const point = creature.segments[index];
    const previous = creature.segments[index - 1];
    if (!point || !previous) continue;
    const midX = (previous.x + point.x) / 2;
    const midY = (previous.y + point.y) / 2;
    if (index === 2) ctx.moveTo(previous.x, previous.y);
    ctx.quadraticCurveTo(previous.x, previous.y, midX, midY);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = creature.player ? 0.24 : 0.14;
  ctx.strokeStyle = withAlpha("#ffffff", boosted ? 0.34 : 0.18);
  ctx.lineWidth = innerWidth;
  ctx.beginPath();
  for (let index = 0; index < Math.min(maxPoints, 22); index += 2) {
    const point = creature.segments[index];
    const next = creature.segments[Math.min(creature.segments.length - 1, index + 1)];
    if (!point || !next) continue;
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
  }
  ctx.stroke();

  if (creature.player) {
    ctx.globalAlpha = boosted ? 0.38 : 0.22;
    ctx.fillStyle = withAlpha(color, boosted ? 0.62 : 0.42);
    for (let index = 5; index < Math.min(maxPoints, 34); index += 7) {
      const point = creature.segments[index];
      const previous = creature.segments[index - 1] || point;
      const angle = Math.atan2(point.y - previous.y, point.x - previous.x) + Math.PI / 2;
      const spread = creature.radius * (boosted ? 1.25 : 0.9);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(
          point.x + Math.cos(angle) * spread * side,
          point.y + Math.sin(angle) * spread * side,
          Math.max(1.5, creature.radius * 0.12),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
  }

  ctx.restore();
}

function drawBodyMarkings(creature) {
  if (!creature.segments?.length) return;
  const step = creature.player ? 4 : 5;
  const limit = Math.min(creature.segments.length - 1, 40);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = step; index < limit; index += step) {
    const point = creature.segments[index];
    const previous = creature.segments[Math.max(0, index - 1)];
    const next = creature.segments[Math.min(creature.segments.length - 1, index + 1)];
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    const fade = 1 - index / Math.max(1, creature.segments.length);
    const size = Math.max(3, creature.radius * (0.26 + fade * 0.18));
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.globalAlpha = creature.player ? 0.44 : 0.34;
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.fillStyle = "rgba(3,8,9,0.28)";
    ctx.lineWidth = Math.max(1.2, creature.radius * 0.12);

    if (creature.animal === "fox" || creature.animal === "wolf") {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-size * 0.9, side * size * 0.85);
        ctx.lineTo(size * 0.7, side * size * 0.2);
        ctx.stroke();
      }
    } else if (creature.animal === "cat") {
      ctx.beginPath();
      ctx.arc(-size * 0.55, -size * 0.42, size * 0.42, 0, Math.PI * 2);
      ctx.arc(size * 0.42, size * 0.32, size * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else if (creature.animal === "bird") {
      ctx.beginPath();
      ctx.moveTo(-size, -size * 0.62);
      ctx.lineTo(size, -size * 0.2);
      ctx.moveTo(-size, size * 0.62);
      ctx.lineTo(size, size * 0.2);
      ctx.stroke();
    } else if (creature.animal === "shark") {
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size);
      ctx.lineTo(size * 0.9, 0);
      ctx.lineTo(-size * 0.25, size);
      ctx.closePath();
      ctx.fill();
    } else if (creature.animal === "dragon") {
      ctx.fillStyle = withAlpha(creature.color, 0.32);
      drawStar(0, 0, size * 0.28, size * 0.78, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,213,78,0.34)";
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.62, size * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawCreatureMotionAccents(creature) {
  if (creature.segments.length < 8) return;
  const time = performance.now();
  const color = creature.player ? getPredatorTier().color : creature.color;
  const accent = creature.player ? getPredatorTier().accent : shade(creature.color, 0.65);
  const dangerous = !creature.player && game.player && creature.length >= game.player.length;
  const maxPoints = Math.min(creature.segments.length - 2, creature.player ? 34 : 26);
  const step = creature.player ? 4 : 5;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = 3; index < maxPoints; index += step) {
    const point = creature.segments[index];
    const previous = creature.segments[index - 2] || point;
    const next = creature.segments[Math.min(creature.segments.length - 1, index + 2)] || point;
    if (!point || !previous || !next) continue;
    const fade = 1 - index / Math.max(1, maxPoints);
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    const pulse = 1 + Math.sin(time / 180 + index + creature.length) * 0.08;
    const size = creature.radius * (0.55 + fade * 0.45) * pulse;
    const alpha = (creature.player ? 0.34 : dangerous ? 0.3 : 0.2) * fade;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.strokeStyle = withAlpha(dangerous ? "#ff4f6d" : color, alpha);
    ctx.fillStyle = withAlpha(accent, alpha * 0.58);
    ctx.lineWidth = Math.max(1, size * 0.12);

    if (creature.animal === "bird") {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-size * 0.2, side * size * 0.44);
        ctx.quadraticCurveTo(size * 0.5, side * size * 1.2, size * 1.25, side * size * 0.78);
        ctx.quadraticCurveTo(size * 0.48, side * size * 0.76, -size * 0.2, side * size * 0.44);
        ctx.fill();
        ctx.stroke();
      }
    } else if (creature.animal === "shark") {
      ctx.beginPath();
      ctx.moveTo(-size * 0.28, -size * 0.15);
      ctx.lineTo(size * 0.38, -size * 1.05);
      ctx.lineTo(size * 0.74, -size * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.1, size * 0.42);
      ctx.lineTo(size * 0.8, size * 0.92);
      ctx.stroke();
    } else if (creature.animal === "dragon") {
      ctx.fillStyle = withAlpha(dangerous ? "#ffd54e" : accent, alpha * 0.78);
      ctx.beginPath();
      ctx.moveTo(-size * 0.52, -size * 0.08);
      ctx.lineTo(size * 0.08, -size * 1.05);
      ctx.lineTo(size * 0.55, -size * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(size * 0.1, side * size * 0.58);
        ctx.lineTo(size * 0.94, side * size * 1.02);
        ctx.stroke();
      }
    } else {
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(0, side * size * 0.62, Math.max(2.2, size * 0.18), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawChainLinkDetails(creature) {
  if (!creature.segments?.length) return;
  const time = performance.now();
  const maxLinks = Math.min(creature.segments.length - 2, creature.player ? 46 : 34);
  const step = creature.player ? 3 : 5;
  const dangerous = !creature.player && creature.length >= game.player.length;
  const edible = !creature.player && creature.length < game.player.length;
  const accent = creature.player
    ? getPredatorTier().color
    : dangerous
      ? "#ff4f6d"
      : edible
        ? "#50ff9a"
        : creature.color;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let index = step; index < maxLinks; index += step) {
    const point = creature.segments[index];
    const previous = creature.segments[index - 1] || point;
    const next = creature.segments[index + 1] || point;
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    const fade = 1 - index / Math.max(1, creature.segments.length);
    const radius = Math.max(4, creature.radius * (0.48 + fade * 0.34));
    const pulse = 0.75 + Math.sin(time / 180 + index + creature.length) * 0.25;

    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);

    ctx.strokeStyle = withAlpha("#ffffff", (creature.player ? 0.18 : 0.12) * fade);
    ctx.lineWidth = Math.max(1, radius * 0.13);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.82, Math.PI * 0.18, Math.PI * 0.82);
    ctx.arc(0, 0, radius * 0.82, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    ctx.strokeStyle = withAlpha(accent, (creature.player ? 0.42 : dangerous ? 0.38 : 0.24) * fade);
    ctx.lineWidth = Math.max(1.3, radius * 0.16);
    ctx.beginPath();
    ctx.moveTo(-radius * 0.72, -radius * 0.54);
    ctx.lineTo(radius * 0.72, -radius * 0.16);
    ctx.moveTo(-radius * 0.72, radius * 0.54);
    ctx.lineTo(radius * 0.72, radius * 0.16);
    ctx.stroke();

    if (creature.player || dangerous || index % (step * 2) === 0) {
      ctx.fillStyle = withAlpha(accent, (0.22 + pulse * 0.18) * fade);
      const badgeSize = Math.max(2.8, radius * 0.22);
      if (creature.animal === "dragon" || creature.animal === "bird") {
        drawStar(0, 0, badgeSize * 0.45, badgeSize, 4);
      } else if (creature.animal === "shark") {
        ctx.beginPath();
        ctx.moveTo(badgeSize, 0);
        ctx.lineTo(-badgeSize * 0.6, -badgeSize * 0.54);
        ctx.lineTo(-badgeSize * 0.28, 0);
        ctx.lineTo(-badgeSize * 0.6, badgeSize * 0.54);
        ctx.closePath();
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 0, badgeSize * 1.1, badgeSize * 0.7, 0, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    ctx.restore();
  }
  ctx.restore();
}

function drawRivalRankInsignia(rival) {
  if (!rival.segments?.length || !game.player) return;
  const advantage = clamp((rival.length - game.player.length) / Math.max(1, game.player.length), -0.7, 1.6);
  const dangerous = advantage >= 0;
  const rankScale = rival.roleScale || (dangerous ? 1.2 : 0.8);
  const color = dangerous ? "#ff4f6d" : "#50ff9a";
  const accent = dangerous ? "#ffd54e" : rival.color;
  const time = performance.now();
  const count = dangerous ? Math.min(7, 3 + Math.ceil(Math.max(0, advantage) * 4)) : 3;
  const start = dangerous ? 2 : 5;
  const step = dangerous ? 4 : 7;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let mark = 0; mark < count; mark += 1) {
    const index = Math.min(rival.segments.length - 2, start + mark * step);
    const point = rival.segments[index];
    const previous = rival.segments[Math.max(0, index - 1)] || point;
    const next = rival.segments[Math.min(rival.segments.length - 1, index + 1)] || point;
    if (!point) continue;
    const angle = Math.atan2(next.y - previous.y, next.x - previous.x);
    const size = rival.radius * (0.42 + Math.max(0, rankScale - 0.7) * 0.18);
    const pulse = 0.8 + Math.sin(time / 150 + mark + rival.length) * 0.16;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.globalAlpha = dangerous ? 0.72 : 0.42;
    ctx.fillStyle = withAlpha(color, dangerous ? 0.42 : 0.24);
    ctx.strokeStyle = withAlpha(accent, dangerous ? 0.58 : 0.34);
    ctx.lineWidth = Math.max(1.2, size * 0.18);
    if (dangerous) {
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.15 * pulse);
      ctx.lineTo(size * 0.78, -size * 0.18);
      ctx.lineTo(size * 0.28, size * 0.18);
      ctx.lineTo(size * 0.7, size * 1.05 * pulse);
      ctx.lineTo(0, size * 0.48);
      ctx.lineTo(-size * 0.7, size * 1.05 * pulse);
      ctx.lineTo(-size * 0.28, size * 0.18);
      ctx.lineTo(-size * 0.78, -size * 0.18);
      ctx.closePath();
    } else {
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.82, size * 0.42, 0, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawCreatureShadow(creature) {
  const headShadow = creature.player ? 0.22 : 0.16;
  ctx.save();
  ctx.fillStyle = `rgba(0,0,0,${headShadow})`;
  ctx.beginPath();
  ctx.ellipse(creature.x + 8, creature.y + 10, creature.radius + 12, creature.radius * 0.72, creature.angle, 0, Math.PI * 2);
  ctx.fill();
  for (let index = 5; index < creature.segments.length; index += 7) {
    const point = creature.segments[index];
    const fade = 1 - index / creature.segments.length;
    ctx.globalAlpha = fade * 0.12;
    ctx.beginPath();
    ctx.ellipse(point.x + 7, point.y + 8, creature.radius * (0.6 + fade * 0.25), creature.radius * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawNameplate(snake) {
  const text = snake.player
    ? `${getPredatorTier().name} · ${Math.round(snake.length)}`
    : `${snake.name} · ${Math.round(snake.length)}`;
  const dangerous = !snake.player && snake.length >= game.player.length;
  const edible = !snake.player && snake.length < game.player.length;
  ctx.font = "800 13px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  const width = Math.max(92, ctx.measureText(text).width + 22);
  const x = snake.x - width / 2;
  const y = snake.y - snake.radius - 34;
  ctx.fillStyle = snake.player
    ? "rgba(8,24,16,0.74)"
    : dangerous
      ? "rgba(36,8,14,0.72)"
      : "rgba(8,12,18,0.6)";
  roundRect(x, y, width, 27, 8);
  ctx.fill();
  ctx.strokeStyle = snake.player
    ? "rgba(80,255,154,0.5)"
    : dangerous
      ? "rgba(255,79,109,0.72)"
      : edible
        ? "rgba(80,255,154,0.32)"
        : "rgba(255,255,255,0.22)";
  ctx.stroke();

  const barInset = 9;
  const barWidth = width - barInset * 2;
  const barY = y + 21;
  ctx.fillStyle = "rgba(255,255,255,0.11)";
  roundRect(x + barInset, barY, barWidth, 3, 2);
  ctx.fill();
  const fillColor = snake.player ? getPredatorTier().color : dangerous ? "#ff4f6d" : edible ? "#50ff9a" : snake.color;
  const fillAmount = snake.player
    ? clamp((game.score % 100) / 100, 0.08, 1)
    : clamp(Math.abs(snake.length - game.player.length) / 70, 0.12, 1);
  ctx.fillStyle = withAlpha(fillColor, snake.player ? 0.82 : 0.74);
  roundRect(x + barInset, barY, barWidth * fillAmount, 3, 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(text, snake.x, y + 15);
  if (snake.player) drawPlayerNameplateShimmer(snake, x, y, width);

  if (!snake.player) {
    const delta = Math.round(snake.length - game.player.length);
    const label = delta >= 0 ? `DANGER +${delta}` : `EAT +${Math.abs(delta)}`;
    const labelWidth = ctx.measureText(label).width + 14;
    const labelY = y - 22;
    const pulse = delta >= 0 ? 0.76 + Math.sin(performance.now() / 130 + snake.length) * 0.1 : 0.58;
    ctx.fillStyle = delta >= 0 ? `rgba(255,79,109,${pulse})` : "rgba(80,255,154,0.58)";
    roundRect(snake.x - labelWidth / 2, labelY, labelWidth, 18, 7);
    ctx.fill();
    if (delta >= 0) {
      ctx.strokeStyle = "rgba(255,213,78,0.34)";
      ctx.stroke();
    }
    ctx.fillStyle = delta >= 0 ? "rgba(255,213,78,0.82)" : "rgba(221,255,69,0.82)";
    for (const side of [-1, 1]) {
      const chevronX = snake.x + side * (labelWidth / 2 + 8);
      ctx.beginPath();
      ctx.moveTo(chevronX + side * 7, labelY + 3);
      ctx.lineTo(chevronX, labelY + 9);
      ctx.lineTo(chevronX + side * 7, labelY + 15);
      ctx.lineTo(chevronX + side * 3, labelY + 9);
      ctx.closePath();
      ctx.fill();
    }
    if (delta >= 0) {
      const blink = 0.5 + Math.sin(performance.now() / 90 + snake.x) * 0.5;
      ctx.fillStyle = `rgba(255,213,78,${0.38 + blink * 0.34})`;
      ctx.beginPath();
      ctx.arc(snake.x - labelWidth / 2 + 8, labelY + 9, 2.4 + blink * 1.8, 0, Math.PI * 2);
      ctx.arc(snake.x + labelWidth / 2 - 8, labelY + 9, 2.4 + blink * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = delta >= 0 ? "#ffffff" : "#07110f";
    ctx.font = "900 10px Inter, system-ui, sans-serif";
    ctx.fillText(label, snake.x, labelY + 13);
    drawRivalRankChip(snake, x + width + 8, y + 4, dangerous);
  }
}

function drawPlayerNameplateShimmer(snake, x, y, width) {
  const time = performance.now();
  const tier = getPredatorTier();
  const sweep = (time * 0.055) % (width + 44) - 22;
  const progress = (game.score % 100) / 100;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const scan = ctx.createLinearGradient(x + sweep - 12, y, x + sweep + 12, y + 27);
  scan.addColorStop(0, "rgba(255,255,255,0)");
  scan.addColorStop(0.5, withAlpha(tier.color, 0.22));
  scan.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = scan;
  roundRect(x + 3, y + 3, width - 6, 21, 7);
  ctx.fill();

  ctx.fillStyle = withAlpha(tier.color, 0.34);
  for (let index = 0; index < Math.min(4, 1 + Math.floor(progress * 5)); index += 1) {
    const px = x + 10 + (width - 20) * ((index + 1) / 5);
    const py = y - 2 + Math.sin(time / 190 + index) * 2;
    drawStar(px, py, 1.1, 3.2, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawRivalRankChip(snake, x, y, dangerous) {
  const rank = snake.rank || (dangerous ? "Threat" : "Prey");
  const text = rank.toUpperCase().slice(0, 5);
  const chipWidth = Math.max(42, ctx.measureText(text).width + 16);
  const color = dangerous ? "#ff4f6d" : "#50ff9a";
  ctx.save();
  ctx.fillStyle = dangerous ? "rgba(36,8,14,0.68)" : "rgba(7,25,16,0.62)";
  ctx.strokeStyle = withAlpha(color, dangerous ? 0.62 : 0.42);
  ctx.lineWidth = 1.5;
  roundRect(x, y, chipWidth, 18, 7);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = withAlpha(color, 0.9);
  ctx.font = "900 8px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(text, x + chipWidth / 2, y + 12);
  ctx.restore();
}

function drawHeadShine(snake) {
  const shineX = snake.x + Math.cos(snake.angle - 0.72) * snake.radius * 0.46;
  const shineY = snake.y + Math.sin(snake.angle - 0.72) * snake.radius * 0.46;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  ctx.beginPath();
  ctx.ellipse(shineX, shineY, snake.radius * 0.24, snake.radius * 0.12, snake.angle - 0.55, 0, Math.PI * 2);
  ctx.fill();
  if (snake.player || snake.length >= game.player.length) {
    ctx.strokeStyle = snake.player ? withAlpha(snake.color, 0.42) : "rgba(255,79,109,0.34)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(snake.x, snake.y, snake.radius + 8, snake.angle - 0.7, snake.angle + 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

function drawShieldFacets(snake) {
  const radius = snake.radius + 27;
  const spin = performance.now() / 620;
  ctx.save();
  ctx.strokeStyle = "rgba(80,255,154,0.28)";
  ctx.fillStyle = "rgba(80,255,154,0.08)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 8; index += 1) {
    const angle = spin + (index / 8) * Math.PI * 2;
    const x = snake.x + Math.cos(angle) * radius;
    const y = snake.y + Math.sin(angle) * radius;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(snake.x + Math.cos(angle + 0.22) * (radius + 9), snake.y + Math.sin(angle + 0.22) * (radius + 9));
    ctx.lineTo(snake.x + Math.cos(angle + 0.46) * radius, snake.y + Math.sin(angle + 0.46) * radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSurgeBolts(snake) {
  const radius = snake.radius + 25;
  const spin = performance.now() / 180;
  ctx.save();
  ctx.strokeStyle = "rgba(255,213,78,0.55)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (let index = 0; index < 6; index += 1) {
    const angle = spin + (index / 6) * Math.PI * 2;
    const innerX = snake.x + Math.cos(angle) * (radius - 8);
    const innerY = snake.y + Math.sin(angle) * (radius - 8);
    const outerX = snake.x + Math.cos(angle + 0.18) * (radius + 9);
    const outerY = snake.y + Math.sin(angle + 0.18) * (radius + 9);
    ctx.beginPath();
    ctx.moveTo(innerX, innerY);
    ctx.lineTo((innerX + outerX) / 2 + Math.cos(angle + 1.2) * 7, (innerY + outerY) / 2 + Math.sin(angle + 1.2) * 7);
    ctx.lineTo(outerX, outerY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAnimalFeatures(creature) {
  ctx.save();
  ctx.translate(creature.x, creature.y);
  ctx.rotate(creature.angle);
  ctx.fillStyle = shade(creature.color, 0.45);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 2;

  if (creature.animal === "mouse") {
    drawEar(-creature.radius * 0.35, -creature.radius * 0.86, creature.radius * 0.4);
    drawEar(-creature.radius * 0.35, creature.radius * 0.86, creature.radius * 0.4);
    drawWhiskers(creature.radius);
  } else if (creature.animal === "fox" || creature.animal === "wolf") {
    drawTriangleEar(-creature.radius * 0.25, -creature.radius * 0.9, creature.radius * 0.55);
    drawTriangleEar(-creature.radius * 0.25, creature.radius * 0.9, creature.radius * 0.55);
    drawSnout(creature.radius * 0.96, creature.animal === "wolf" ? 0.62 : 0.5);
  } else if (creature.animal === "cat") {
    drawTriangleEar(-creature.radius * 0.3, -creature.radius * 0.88, creature.radius * 0.48);
    drawTriangleEar(-creature.radius * 0.3, creature.radius * 0.88, creature.radius * 0.48);
    drawWhiskers(creature.radius * 0.9);
  } else if (creature.animal === "bird") {
    ctx.fillStyle = "#ffd54e";
    ctx.beginPath();
    ctx.moveTo(creature.radius + 4, 0);
    ctx.lineTo(creature.radius * 1.75, -creature.radius * 0.38);
    ctx.lineTo(creature.radius * 1.75, creature.radius * 0.38);
    ctx.closePath();
    ctx.fill();
    drawWing(-creature.radius * 0.25, -creature.radius * 1.05, creature.radius * 0.86);
    drawWing(-creature.radius * 0.25, creature.radius * 1.05, creature.radius * 0.86);
    drawBrowMarks(creature.radius);
  } else if (creature.animal === "shark") {
    ctx.fillStyle = shade(creature.color, 0.25);
    ctx.beginPath();
    ctx.moveTo(-creature.radius * 0.1, -creature.radius * 0.92);
    ctx.lineTo(creature.radius * 0.5, 0);
    ctx.lineTo(-creature.radius * 0.4, creature.radius * 0.2);
    ctx.closePath();
    ctx.fill();
    drawSnout(creature.radius * 1.1, 0.36);
    drawGillMarks(creature.radius);
  } else if (creature.animal === "dragon") {
    drawTriangleEar(-creature.radius * 0.25, -creature.radius, creature.radius * 0.55);
    drawTriangleEar(-creature.radius * 0.25, creature.radius, creature.radius * 0.55);
    drawDragonHorns(creature.radius);
    drawWing(-creature.radius * 0.45, -creature.radius * 1.15, creature.radius);
    drawWing(-creature.radius * 0.45, creature.radius * 1.15, creature.radius);
    drawSnout(creature.radius * 1.06, 0.46);
  }

  ctx.restore();
}

function drawTailAccent(creature) {
  if (creature.segments.length < 4) return;
  const tail = creature.segments[creature.segments.length - 1];
  const beforeTail = creature.segments[creature.segments.length - 4];
  const angle = Math.atan2(tail.y - beforeTail.y, tail.x - beforeTail.x);
  ctx.save();
  ctx.translate(tail.x, tail.y);
  ctx.rotate(angle);
  ctx.fillStyle = shade(creature.color, 0.28);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 2;
  const size = creature.radius * 0.9;

  if (creature.animal === "bird" || creature.animal === "dragon") {
    ctx.beginPath();
    ctx.moveTo(-size * 1.1, 0);
    ctx.lineTo(size * 0.4, -size * 0.8);
    ctx.lineTo(size * 0.2, 0);
    ctx.lineTo(size * 0.4, size * 0.8);
    ctx.closePath();
  } else if (creature.animal === "shark") {
    ctx.beginPath();
    ctx.moveTo(-size * 1.1, 0);
    ctx.lineTo(size * 0.2, -size * 0.9);
    ctx.lineTo(size * 0.1, 0);
    ctx.lineTo(size * 0.2, size * 0.9);
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.ellipse(-size * 0.28, 0, size * 0.95, size * 0.34, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawEar(x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawTriangleEar(x, y, size) {
  const side = y < 0 ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + size * 0.92, y - side * size * 0.35);
  ctx.lineTo(x + size * 0.45, y + side * size * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawSnout(length, width) {
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.beginPath();
  ctx.ellipse(length * 0.35, 0, length * 0.34, length * width * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#101817";
  ctx.beginPath();
  ctx.arc(length * 0.68, 0, Math.max(2.5, length * 0.08), 0, Math.PI * 2);
  ctx.fill();
}

function drawBrowMarks(radius) {
  ctx.strokeStyle = "rgba(3,8,9,0.45)";
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(radius * 0.18, side * radius * 0.42);
    ctx.lineTo(radius * 0.74, side * radius * 0.28);
    ctx.stroke();
  }
}

function drawGillMarks(radius) {
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 1.7;
  for (const side of [-1, 1]) {
    for (let index = 0; index < 3; index += 1) {
      const x = -radius * 0.15 + index * radius * 0.16;
      ctx.beginPath();
      ctx.moveTo(x, side * radius * 0.42);
      ctx.lineTo(x + radius * 0.16, side * radius * 0.68);
      ctx.stroke();
    }
  }
}

function drawDragonHorns(radius) {
  ctx.fillStyle = "#ffd54e";
  ctx.strokeStyle = "rgba(255,255,255,0.48)";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(radius * 0.12, side * radius * 0.78);
    ctx.lineTo(radius * 0.78, side * radius * 1.28);
    ctx.lineTo(radius * 0.48, side * radius * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawWhiskers(radius) {
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1.4;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(radius * 0.38, side * radius * 0.18);
    ctx.lineTo(radius * 1.14, side * radius * 0.42);
    ctx.moveTo(radius * 0.38, side * radius * 0.08);
    ctx.lineTo(radius * 1.18, side * radius * 0.08);
    ctx.stroke();
  }
}

function drawWing(x, y, size) {
  const side = y < 0 ? -1 : 1;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x - size * 0.7, y + side * size * 0.25, x - size * 0.1, y + side * size * 0.8);
  ctx.quadraticCurveTo(x + size * 0.35, y + side * size * 0.45, x, y);
  ctx.fill();
  ctx.stroke();
}

function drawEye(snake, angle) {
  const ex = snake.x + Math.cos(angle) * snake.radius * 0.62;
  const ey = snake.y + Math.sin(angle) * snake.radius * 0.62;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ex, ey, 4.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#102012";
  ctx.beginPath();
  ctx.arc(ex + Math.cos(snake.angle) * 1.7, ey + Math.sin(snake.angle) * 1.7, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticle(particle) {
  ctx.save();
  ctx.globalAlpha = particle.life;
  if (particle.streak) {
    drawStreakParticle(particle);
  } else if (particle.collect) {
    drawCollectParticle(particle);
  } else if (particle.nutrient) {
    drawNutrientParticle(particle);
  } else if (particle.text) {
    drawFloatingTextParticle(particle);
  } else if (particle.scrape) {
    drawScrapeParticle(particle);
  } else if (particle.biteShard) {
    drawBiteShardParticle(particle);
  } else if (particle.shieldShard) {
    drawShieldShardParticle(particle);
  } else {
    ctx.globalAlpha = particle.soft ? particle.life * 0.55 : particle.life;
    ctx.shadowBlur = particle.soft ? 5 : 10;
    ctx.shadowColor = particle.color;
    ctx.fillStyle = particle.color;
    if (particle.spark) {
      drawStar(particle.x, particle.y, particle.radius * 0.45, particle.radius, 4);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawShieldShardParticle(particle) {
  const alpha = Math.max(0, particle.life);
  const size = particle.radius * (0.7 + alpha * 0.5);
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate((particle.angle || 0) + performance.now() * (particle.spin || 0.04));
  ctx.shadowBlur = 12;
  ctx.shadowColor = particle.color;
  ctx.fillStyle = normalizeColor(particle.color, 0.34 * alpha);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.78, -size * 0.32);
  ctx.lineTo(size * 0.46, size * 0.72);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.46, size * 0.72);
  ctx.lineTo(-size * 0.78, -size * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawScrapeParticle(particle) {
  const alpha = Math.max(0, particle.life);
  const length = particle.radius * (1.8 + alpha);
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(particle.angle || 0);
  ctx.shadowBlur = 12;
  ctx.shadowColor = particle.color;
  ctx.strokeStyle = normalizeColor(particle.color, 0.55 * alpha);
  ctx.lineWidth = particle.width || 2;
  ctx.beginPath();
  ctx.moveTo(-length * 0.42, 0);
  ctx.lineTo(length * 0.58, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(length * 0.08, -2);
  ctx.lineTo(length * 0.64, 0);
  ctx.stroke();
  ctx.restore();
}

function drawBiteShardParticle(particle) {
  const alpha = Math.max(0, particle.life);
  const size = particle.radius * (0.6 + alpha * 0.6);
  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate((particle.angle || 0) + performance.now() * (particle.spin || 0.05));
  ctx.shadowBlur = 14;
  ctx.shadowColor = particle.color;
  ctx.fillStyle = normalizeColor(particle.color, 0.48 * alpha);
  ctx.strokeStyle = "rgba(255,255,255,0.26)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(size * 0.12, -size * 0.42);
  ctx.lineTo(-size * 0.74, -size * 0.12);
  ctx.lineTo(-size * 0.25, size * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFloatingTextParticle(particle) {
  const scale = particle.scale || 1;
  const alpha = Math.max(0, particle.life);
  const text = String(particle.text);
  const width = ctx.measureText(text).width + 18 * scale;
  const height = 24 * scale;
  const badge = /STREAK|FEAST|\+|Magnet|Shield|Surge/i.test(text);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `900 ${Math.round(18 * scale)}px Inter, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  if (badge) {
    ctx.fillStyle = "rgba(3,8,9,0.58)";
    roundRect(particle.x - width / 2, particle.y - height + 5 * scale, width, height, 8 * scale);
    ctx.fill();
    ctx.strokeStyle = normalizeColor(particle.color, 0.36 * alpha);
    ctx.lineWidth = 1.5 * scale;
    ctx.stroke();
    ctx.fillStyle = normalizeColor(particle.color, 0.22 * alpha);
    roundRect(particle.x - width / 2 + 8 * scale, particle.y + 3 * scale, width - 16 * scale, 3 * scale, 2 * scale);
    ctx.fill();
  }

  ctx.shadowBlur = 14 * scale;
  ctx.shadowColor = particle.color;
  ctx.fillStyle = particle.color;
  ctx.strokeStyle = "rgba(3,8,9,0.76)";
  ctx.lineWidth = 5 * scale;
  ctx.strokeText(text, particle.x, particle.y);
  ctx.fillText(text, particle.x, particle.y);
  ctx.fillStyle = "rgba(255,255,255,0.74)";
  ctx.beginPath();
  ctx.arc(particle.x - width / 2 + 8 * scale, particle.y - 9 * scale, 2.4 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStreakParticle(particle) {
  const alpha = Math.max(0, particle.life);
  const spin = performance.now() / 180 + particle.seed;
  ctx.globalAlpha = alpha;
  ctx.translate(particle.x, particle.y);
  ctx.rotate(spin);
  ctx.shadowBlur = 12;
  ctx.shadowColor = particle.color;
  ctx.strokeStyle = normalizeColor(particle.color, 0.48 * alpha);
  ctx.fillStyle = normalizeColor(particle.color, 0.62 * alpha);
  ctx.lineWidth = 2;
  if (particle.kind === "slash") {
    ctx.beginPath();
    ctx.moveTo(-particle.radius * 1.4, 0);
    ctx.lineTo(particle.radius * 1.4, 0);
    ctx.stroke();
  } else {
    drawStar(0, 0, particle.radius * 0.38, particle.radius, 4);
    ctx.fill();
    ctx.stroke();
  }
}

function drawCollectParticle(particle) {
  const progress = 1 - particle.life / particle.duration;
  const radius = particle.radius + particle.growth * progress;
  const alpha = Math.max(0, particle.life / particle.duration);
  const spin = performance.now() / 260 + particle.x * 0.01;
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 18;
  ctx.shadowColor = particle.color;
  ctx.strokeStyle = normalizeColor(particle.color, 0.42 * alpha);
  ctx.lineWidth = 3.5 * particle.scale * alpha;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = normalizeColor(particle.accent, 0.34 * alpha);
  ctx.lineWidth = 1.6 * particle.scale;
  ctx.setLineDash([5, 8]);
  ctx.lineDashOffset = -performance.now() * 0.04;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, radius * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (particle.scale >= 1.25) {
    ctx.strokeStyle = normalizeColor(particle.color, 0.18 * alpha);
    ctx.lineWidth = 2.4 * particle.scale;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = performance.now() * 0.05;
    ctx.beginPath();
    ctx.ellipse(particle.x, particle.y, radius * 0.88, radius * 0.48, progress * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.fillStyle = normalizeColor(particle.accent, 0.75 * alpha);
  for (let index = 0; index < 5; index += 1) {
    const angle = spin + (index / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(
      particle.x + Math.cos(angle) * radius * 0.82,
      particle.y + Math.sin(angle) * radius * 0.82,
      Math.max(1.8, 3.2 * particle.scale * alpha),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.save();
  ctx.translate(particle.x, particle.y);
  ctx.rotate(spin * 0.35);
  ctx.fillStyle = normalizeColor(particle.color, 0.86 * alpha);
  ctx.strokeStyle = "rgba(3,8,9,0.48)";
  ctx.lineWidth = 2;
  drawCollectGlyph(particle.kind, 8 * particle.scale * (0.7 + progress * 0.5));
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawNutrientParticle(particle) {
  const progress = 1 - particle.life / particle.duration;
  const alpha = Math.max(0, particle.life / particle.duration);
  const target = game.player || particle.target;
  const targetX = target?.x ?? particle.targetX ?? particle.x;
  const targetY = target?.y ?? particle.targetY ?? particle.y;
  const cx = particle.originX + (particle.controlX - particle.originX) * progress;
  const cy = particle.originY + (particle.controlY - particle.originY) * progress;
  const x = (1 - progress) * cx + progress * targetX;
  const y = (1 - progress) * cy + progress * targetY;
  const pulse = 0.8 + Math.sin(performance.now() / 120 + particle.seed) * 0.2;

  particle.x = x;
  particle.y = y;
  ctx.save();
  ctx.globalAlpha = alpha * 0.86;
  ctx.shadowBlur = 14;
  ctx.shadowColor = particle.color;
  ctx.strokeStyle = withAlpha(particle.color, 0.24 * alpha);
  ctx.lineWidth = 1.4 * particle.scale;
  ctx.beginPath();
  ctx.moveTo(particle.originX, particle.originY);
  ctx.quadraticCurveTo(particle.controlX, particle.controlY, x, y);
  ctx.stroke();
  ctx.fillStyle = withAlpha(particle.accent || particle.color, 0.78 * alpha);
  ctx.beginPath();
  ctx.arc(x, y, particle.radius * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = withAlpha("#ffffff", 0.52 * alpha);
  drawStar(x, y, Math.max(0.8, particle.radius * 0.32), particle.radius * 0.9, 4);
  ctx.fill();
  ctx.restore();
}

function drawCollectGlyph(kind, size) {
  ctx.beginPath();
  if (kind === "leaf") {
    ctx.ellipse(0, 0, size * 0.62, size * 1.15, -0.65, 0, Math.PI * 2);
  } else if (kind === "fish") {
    ctx.ellipse(-size * 0.15, 0, size * 0.9, size * 0.55, 0, 0, Math.PI * 2);
    ctx.moveTo(size * 0.55, 0);
    ctx.lineTo(size * 1.05, -size * 0.48);
    ctx.lineTo(size * 1.05, size * 0.48);
    ctx.closePath();
  } else if (kind === "cap") {
    ctx.arc(0, -size * 0.1, size * 0.82, Math.PI, 0);
    ctx.lineTo(size * 0.5, size * 0.42);
    ctx.lineTo(-size * 0.5, size * 0.42);
    ctx.closePath();
  } else if (kind === "star" || kind === "surge") {
    drawStar(0, 0, size * 0.42, size, 5);
  } else if (kind === "shield") {
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, -size * 0.42);
    ctx.lineTo(size * 0.52, size * 0.7);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.52, size * 0.7);
    ctx.lineTo(-size * 0.8, -size * 0.42);
    ctx.closePath();
  } else if (kind === "magnet") {
    ctx.arc(0, 0, size, Math.PI * 0.18, Math.PI * 1.82);
    ctx.lineTo(-size * 0.45, size * 0.66);
    ctx.moveTo(size * 0.95, size * 0.2);
    ctx.lineTo(size * 0.45, size * 0.66);
  } else if (kind === "bite") {
    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2;
      const r = index % 2 === 0 ? size : size * 0.55;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  } else {
    ctx.arc(0, 0, size * 0.82, 0, Math.PI * 2);
  }
}

function drawShockwave(shockwave) {
  const progress = 1 - shockwave.life / shockwave.duration;
  const radius = shockwave.radius + shockwave.growth * progress;
  const alpha = Math.max(0, shockwave.life / shockwave.duration);
  ctx.save();
  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = shockwave.color;
  ctx.lineWidth = Math.max(2, shockwave.width * alpha);
  ctx.beginPath();
  ctx.arc(shockwave.x, shockwave.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = alpha * 0.24;
  ctx.lineWidth = Math.max(1, shockwave.width * 0.5 * alpha);
  ctx.beginPath();
  ctx.arc(shockwave.x, shockwave.y, radius * 0.68, 0, Math.PI * 2);
  ctx.stroke();
  if (shockwave.style === "shield") {
    drawShieldBreakShockwave(shockwave, radius, alpha, progress);
  } else if (shockwave.style === "bite") {
    drawBiteShockwave(shockwave, radius, alpha, progress);
  }
  ctx.restore();
}

function drawShieldBreakShockwave(shockwave, radius, alpha, progress) {
  const time = performance.now();
  ctx.save();
  ctx.translate(shockwave.x, shockwave.y);
  ctx.rotate(time / 560);
  ctx.globalAlpha = alpha * 0.72;
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.fillStyle = shockwave.color;
  ctx.lineWidth = Math.max(1, shockwave.width * 0.22 * alpha);
  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * Math.PI * 2;
    const inner = radius * (0.34 + progress * 0.18);
    const outer = radius * (0.74 + (index % 3) * 0.08);
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(inner, -5);
    ctx.lineTo(outer, -12 - (index % 2) * 5);
    ctx.lineTo(outer * 0.9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawBiteShockwave(shockwave, radius, alpha, progress) {
  const time = performance.now();
  ctx.save();
  ctx.translate(shockwave.x, shockwave.y);
  ctx.rotate(-time / 620);
  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = shockwave.color;
  ctx.strokeStyle = "rgba(255,255,255,0.26)";
  ctx.lineWidth = Math.max(1, shockwave.width * 0.18 * alpha);
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2;
    const inner = radius * (0.3 + progress * 0.12);
    const outer = radius * (0.82 + Math.sin(time / 180 + index) * 0.04);
    ctx.save();
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(inner, 0);
    ctx.lineTo(outer, -6 - (index % 3) * 2);
    ctx.lineTo(outer * 0.78, 0);
    ctx.lineTo(outer, 6 + (index % 2) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawMiniHud() {
  const compact = canvas.clientWidth < 620;
  const tiny = canvas.clientWidth < 480;
  const boostWidth = tiny ? Math.min(132, canvas.clientWidth - 150) : compact ? 150 : 170;
  const x = 18;
  const y = canvas.clientHeight - 28;
  drawHudAnchorRails(compact, tiny);
  drawGameStats();
  drawComboBadge();
  drawDangerMeter(compact);
  drawApexLadder();
  ctx.fillStyle = "rgba(3, 8, 9, 0.68)";
  roundRect(x, y, boostWidth, 10, 5);
  ctx.fill();
  const boostGradient = ctx.createLinearGradient(x, y, x + boostWidth, y);
  boostGradient.addColorStop(0, "#ffb340");
  boostGradient.addColorStop(1, "#fff86a");
  ctx.fillStyle = boostGradient;
  roundRect(x, y, boostWidth * (game.player.boost / 100), 10, 5);
  ctx.fill();
  if (isBoostHeld() || game.effects.surge > 0) {
    const activeColor = game.effects.surge > 0 ? "#ffd54e" : "#fff86a";
    ctx.shadowBlur = 12;
    ctx.shadowColor = activeColor;
    ctx.strokeStyle = normalizeColor(activeColor, 0.72);
    ctx.lineWidth = 2;
    roundRect(x - 3, y - 3, boostWidth + 6, 16, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  for (let tick = 0; tick <= 4; tick += 1) {
    const tx = x + (boostWidth / 4) * tick;
    ctx.strokeStyle = "rgba(3,8,9,0.34)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx, y + 10);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.font = "800 12px Inter, system-ui, sans-serif";
  ctx.fillText("BOOST", x + 26, y - 7);
  drawMessagePill(canvas.clientWidth - (tiny ? 14 : 18), tiny ? y - 33 : y - 22, { compact: tiny });

  const radarSize = tiny ? 54 : 66;
  drawRadar(canvas.clientWidth - radarSize - (tiny ? 14 : 20), tiny ? 18 : 26, radarSize);
  if (!tiny) drawBiomeProgressRail(canvas.clientWidth - 86, 102);
  drawPowerUpCompass();
  drawThreatArrows();
  drawBanner();
}

function drawHudAnchorRails(compact, tiny) {
  const biome = getBiome();
  const progressState = getBiomeProgress();
  const color = biome.glow[0] || "#50ff9a";
  const time = performance.now();
  const leftWidth = compact ? Math.min(292, canvas.clientWidth - 108) : 386;
  const rightWidth = tiny ? 74 : 96;
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = withAlpha(color, 0.18);
  ctx.lineWidth = 1.4;
  ctx.setLineDash([10, 12]);
  ctx.lineDashOffset = -time * 0.04;

  ctx.beginPath();
  ctx.moveTo(18, 108);
  ctx.lineTo(18 + leftWidth, 108);
  ctx.lineTo(18 + leftWidth + 20, 88);
  ctx.stroke();

  const pulseX = 18 + leftWidth * progressState.progress;
  const pulseGlow = progressState.next?.glow?.[0] || color;
  ctx.setLineDash([]);
  ctx.fillStyle = withAlpha(pulseGlow, 0.42);
  ctx.strokeStyle = withAlpha("#ffffff", 0.16);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(pulseX, 108, 4 + Math.sin(time / 160) * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = withAlpha(pulseGlow, 0.16);
  ctx.beginPath();
  ctx.arc(pulseX, 108, 12 + Math.sin(time / 220) * 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(canvas.clientWidth - 18 - rightWidth, tiny ? 88 : 106);
  ctx.lineTo(canvas.clientWidth - 18, tiny ? 88 : 106);
  ctx.lineTo(canvas.clientWidth - 18, tiny ? 18 : 26);
  ctx.stroke();

  if (!tiny) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(22, canvas.clientHeight - 48);
    ctx.lineTo(210, canvas.clientHeight - 48);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMessagePill(right, y, options = {}) {
  const compact = options.compact || canvas.clientWidth < 520;
  const maxWidth = Math.min(compact ? canvas.clientWidth - 28 : 360, canvas.clientWidth - (compact ? 28 : 220));
  if (maxWidth < 110) return;
  const font = compact ? "800 11px Inter, system-ui, sans-serif" : "800 12px Inter, system-ui, sans-serif";
  const style = getMessageStyle(game.message || "");
  const message = fitText(game.message || "", maxWidth - 34, font);
  const width = Math.min(maxWidth, ctx.measureText(message).width + 34);
  const x = right - width;
  const biomeColor = style.color || getBiome().glow[0] || "#50ff9a";
  const time = performance.now();
  ctx.save();
  const panel = ctx.createLinearGradient(x, y, x + width, y + 24);
  panel.addColorStop(0, "rgba(3,8,9,0.68)");
  panel.addColorStop(0.58, "rgba(3,8,9,0.52)");
  panel.addColorStop(1, withAlpha(biomeColor, style.hot ? 0.24 : 0.13));
  ctx.fillStyle = panel;
  roundRect(x, y, width, 24, 8);
  ctx.fill();
  ctx.strokeStyle = normalizeColor(biomeColor, style.hot ? 0.46 : 0.28);
  ctx.lineWidth = style.hot ? 1.6 : 1;
  ctx.stroke();

  if (style.hot) {
    const sweep = (time * 0.07) % (width + 30) - 15;
    const scan = ctx.createLinearGradient(x + sweep - 10, y, x + sweep + 10, y + 24);
    scan.addColorStop(0, "rgba(255,255,255,0)");
    scan.addColorStop(0.5, withAlpha("#ffffff", 0.1));
    scan.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = scan;
    roundRect(x + 3, y + 3, width - 6, 18, 6);
    ctx.fill();
  }

  ctx.fillStyle = normalizeColor(biomeColor, 0.82);
  ctx.beginPath();
  ctx.arc(x + 11, y + 12, 3, 0, Math.PI * 2);
  ctx.fill();
  drawMessageIcon(style, x + 11, y + 12, biomeColor, time);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.fillText(message, x + 20, y + 16);
  ctx.restore();
}

function getMessageStyle(message) {
  const lower = message.toLowerCase();
  if (/shield|blocked|close|bigger|hunting/.test(lower)) return { color: "#ff4f6d", hot: true, icon: "danger" };
  if (/power|magnet|surge/.test(lower)) return { color: "#ffd54e", hot: true, icon: "power" };
  if (/ate|smaller|joined|eat/.test(lower)) return { color: "#50ff9a", hot: false, icon: "eat" };
  if (/unlock|form|biome/.test(lower)) return { color: getBiome().glow[0] || "#38c5ff", hot: true, icon: "unlock" };
  return { color: getBiome().glow[0] || "#50ff9a", hot: false, icon: "dot" };
}

function drawMessageIcon(style, x, y, color, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = withAlpha(color, 0.46);
  ctx.strokeStyle = withAlpha("#ffffff", style.hot ? 0.3 : 0.18);
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (style.icon === "danger") {
    const pulse = 1 + Math.sin(time / 110) * 0.18;
    ctx.moveTo(0, -5 * pulse);
    ctx.lineTo(5 * pulse, 4 * pulse);
    ctx.lineTo(-5 * pulse, 4 * pulse);
    ctx.closePath();
  } else if (style.icon === "power") {
    ctx.moveTo(1, -5);
    ctx.lineTo(-4, 1);
    ctx.lineTo(0, 1);
    ctx.lineTo(-1, 5);
    ctx.lineTo(5, -2);
    ctx.lineTo(1, -2);
    ctx.closePath();
  } else if (style.icon === "unlock") {
    drawStar(0, 0, 2.2, 5, 4);
  } else if (style.icon === "eat") {
    ctx.ellipse(0, 0, 5, 3, 0, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function fitText(text, maxWidth, font) {
  ctx.save();
  ctx.font = font;
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.restore();
    return text;
  }
  let clipped = text;
  while (clipped.length > 4 && ctx.measureText(`${clipped}...`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  ctx.restore();
  return `${clipped.trim()}...`;
}

function drawComboBadge() {
  if (!game.combo || game.comboTime <= 0) return;
  const alpha = Math.min(1, game.comboTime / 0.6);
  const x = canvas.clientWidth / 2;
  const compact = canvas.clientWidth < 620;
  const y = compact ? 126 : 34;
  const width = Math.min(compact ? 156 + game.combo * 4 : 190 + game.combo * 4, canvas.clientWidth - 40);
  const color = game.comboColor || "#ddff45";
  const timer = clamp(game.comboTime / 2.4, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(3,8,9,0.62)";
  roundRect(x - width / 2, y, width, 42, 8);
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, 0.64);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = withAlpha(color, 0.22);
  roundRect(x - width / 2 + 10, y + 34, (width - 20) * timer, 4, 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.font = "900 12px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CHAIN STREAK", x, y + 16);
  ctx.fillStyle = "#ffffff";
  ctx.font = `900 ${Math.min(25, 17 + game.combo)}px Inter, system-ui, sans-serif`;
  ctx.fillText(`${game.combo}x`, x, y + 36);
  ctx.fillStyle = withAlpha(color, 0.82);
  for (let index = 0; index < Math.min(8, game.combo); index += 1) {
    const angle = performance.now() / 330 + (index / Math.max(1, game.combo)) * Math.PI * 2;
    const sx = x + Math.cos(angle) * (width / 2 + 8);
    const sy = y + 21 + Math.sin(angle) * 19;
    drawStar(sx, sy, 2, 4.8, 4);
    ctx.fill();
  }
  ctx.restore();
}

function drawDangerMeter(compact = false) {
  const threat = getThreatLevel();
  if (threat <= 0.02) return;
  const width = Math.min(compact ? 190 : 240, canvas.clientWidth - 36);
  const x = canvas.clientWidth / 2 - width / 2;
  const y = canvas.clientHeight - (compact ? 88 : 58);
  const time = performance.now();
  ctx.save();
  ctx.fillStyle = "rgba(3,8,9,0.62)";
  roundRect(x, y, width, 28, 8);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,79,109,${0.25 + threat * 0.55})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "900 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PREDATOR CLOSE", canvas.clientWidth / 2, y + 12);
  const barWidth = width - 28;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  roundRect(x + 14, y + 17, barWidth, 5, 3);
  ctx.fill();
  const gradient = ctx.createLinearGradient(x + 14, y, x + 14 + barWidth, y);
  gradient.addColorStop(0, "#ffd54e");
  gradient.addColorStop(1, "#ff4f6d");
  ctx.fillStyle = gradient;
  roundRect(x + 14, y + 17, barWidth * threat, 5, 3);
  ctx.fill();

  const markerX = x + 14 + barWidth * threat;
  ctx.strokeStyle = `rgba(255,213,78,${0.3 + threat * 0.38})`;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(markerX, y + 15);
  ctx.lineTo(markerX, y + 25);
  ctx.stroke();

  ctx.fillStyle = `rgba(255,79,109,${0.16 + threat * 0.28})`;
  for (let index = 0; index < 5; index += 1) {
    const px = x + 18 + ((barWidth - 8) * index) / 4;
    const pulse = 0.5 + Math.sin(time / 120 + index) * 0.5;
    ctx.beginPath();
    ctx.arc(px, y + 8, 1.4 + pulse * threat * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = `rgba(255,255,255,${0.06 + threat * 0.08})`;
  ctx.setLineDash([6, 8]);
  ctx.lineDashOffset = -time * 0.04;
  ctx.beginPath();
  ctx.moveTo(x + 12, y + 14);
  ctx.lineTo(x + width - 12, y + 14);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawApexLadder() {
  const compact = canvas.clientWidth < 720;
  if (canvas.clientWidth < 520) return;
  if (compact && canvas.clientHeight < 620) return;
  const tierIndex = Math.min(predatorTiers.length - 1, Math.floor(game.score / 100));
  const x = 18;
  const y = canvas.clientHeight < 680 ? 124 : 116;
  const width = compact ? Math.min(250, canvas.clientWidth - 112) : 300;
  const height = 42;
  const progress = predatorTiers.length <= 1 ? 1 : tierIndex / (predatorTiers.length - 1);
  ctx.save();
  ctx.fillStyle = "rgba(3,8,9,0.5)";
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "900 9px Inter, system-ui, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("PREDATOR LADDER", x + 12, y + 14);

  const railX = x + 14;
  const railY = y + 27;
  const railWidth = width - 28;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(railX, railY, railWidth, 5, 3);
  ctx.fill();
  const gradient = ctx.createLinearGradient(railX, railY, railX + railWidth, railY);
  for (let index = 0; index < predatorTiers.length; index += 1) {
    gradient.addColorStop(index / (predatorTiers.length - 1), predatorTiers[index].color);
  }
  ctx.fillStyle = gradient;
  roundRect(railX, railY, railWidth * progress, 5, 3);
  ctx.fill();

  for (let index = 0; index < predatorTiers.length; index += 1) {
    const tier = predatorTiers[index];
    const px = railX + (railWidth * index) / (predatorTiers.length - 1);
    const active = index <= tierIndex;
    const pulse = index === tierIndex ? 1 + Math.sin(performance.now() / 170) * 0.1 : 1;
    ctx.fillStyle = active ? tier.color : "rgba(255,255,255,0.24)";
    ctx.strokeStyle = active ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.16)";
    ctx.lineWidth = index === tierIndex ? 2 : 1;
    ctx.beginPath();
    ctx.arc(px, railY + 2.5, (active ? 5.5 : 3.6) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  const tier = predatorTiers[tierIndex];
  ctx.fillStyle = tier.color;
  ctx.font = "900 10px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(tier.name.toUpperCase(), x + width - 12, y + 14);
  ctx.restore();
}

function drawBiomeProgressRail(x, y) {
  const state = getBiomeProgress();
  const height = 132;
  const width = 66;
  ctx.save();
  ctx.fillStyle = "rgba(3,8,9,0.58)";
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.58)";
  ctx.font = "900 9px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BIOME", x + width / 2, y + 16);

  const railX = x + width / 2 - 4;
  const railY = y + 27;
  const railHeight = 70;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  roundRect(railX, railY, 8, railHeight, 4);
  ctx.fill();
  const gradient = ctx.createLinearGradient(railX, railY + railHeight, railX, railY);
  gradient.addColorStop(0, state.current.glow[0] || "#50ff9a");
  gradient.addColorStop(1, state.next?.glow[0] || state.current.glow[0] || "#ffffff");
  ctx.fillStyle = gradient;
  const fillHeight = railHeight * state.progress;
  roundRect(railX, railY + railHeight - fillHeight, 8, fillHeight, 4);
  ctx.fill();

  ctx.strokeStyle = normalizeColor(state.current.glow[0] || "#50ff9a", 0.5);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + width / 2, railY + railHeight - fillHeight, 8, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 10px Inter, system-ui, sans-serif";
  ctx.fillText(`${Math.round(state.progress * 100)}%`, x + width / 2, y + 112);
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "800 8px Inter, system-ui, sans-serif";
  ctx.fillText(state.next ? state.next.name.toUpperCase().slice(0, 9) : "APEX", x + width / 2, y + 126);
  ctx.restore();
}

function getBiomeProgress() {
  const progressScore = game.score + game.distance / 18;
  const current = getBiome();
  const next = biomes[game.biomeIndex + 1];
  if (!next) return { current, next: null, progress: 1 };
  const start = current.threshold;
  const span = Math.max(1, next.threshold - start);
  return {
    current,
    next,
    progress: clamp((progressScore - start) / span, 0, 1)
  };
}

function drawPowerUpCompass() {
  if (!game.powerUps?.length) return;
  const player = game.player;
  const time = performance.now();
  for (const powerUp of game.powerUps) {
    const sx = (powerUp.x - game.camera.x) * game.camera.zoom;
    const sy = (powerUp.y - game.camera.y) * game.camera.zoom;
    const onScreen = sx > 20 && sx < canvas.clientWidth - 20 && sy > 20 && sy < canvas.clientHeight - 20;
    if (onScreen) continue;

    const angle = Math.atan2(sy - canvas.clientHeight / 2, sx - canvas.clientWidth / 2);
    const x = canvas.clientWidth / 2 + Math.cos(angle) * Math.min(canvas.clientWidth * 0.42, 310);
    const y = canvas.clientHeight / 2 + Math.sin(angle) * Math.min(canvas.clientHeight * 0.38, 230);
    const pulse = 1 + Math.sin(time / 180 + powerUp.x) * 0.08;
    const d = distance(player, powerUp);
    ctx.save();
    ctx.translate(clamp(x, 44, canvas.clientWidth - 44), clamp(y, 72, canvas.clientHeight - 72));

    const sweep = (time / 760 + powerUp.x * 0.01) % (Math.PI * 2);
    ctx.strokeStyle = withAlpha(powerUp.color, 0.16);
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = -time * 0.035;
    for (let ring = 0; ring < 2; ring += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, 24 + ring * 8 + Math.sin(time / 220 + ring) * 2, sweep, sweep + Math.PI * 1.45);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.rotate(angle);
    ctx.fillStyle = withAlpha(powerUp.color, 0.24);
    ctx.beginPath();
    ctx.moveTo(22 * pulse, 0);
    ctx.lineTo(8, -7);
    ctx.lineTo(10, 0);
    ctx.lineTo(8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(powerUp.accent, 0.24);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(-24, 0);
    ctx.lineTo(-8, 14);
    ctx.stroke();
    ctx.rotate(-angle);
    ctx.fillStyle = "rgba(3,8,9,0.62)";
    ctx.strokeStyle = withAlpha(powerUp.color, 0.64);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = withAlpha(powerUp.color, 0.92);
    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 1.6;
    drawPowerUpIcon(powerUp.type, 7.4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "900 9px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`${Math.round(d / 100)}`, 0, 30);
    ctx.restore();
  }
}

function drawThreatArrows() {
  if (!game.rivals?.length) return;
  const margin = 34;
  const time = performance.now();
  for (const rival of game.rivals) {
    if (rival.length < game.player.length) continue;
    const sx = (rival.x - game.camera.x) * game.camera.zoom;
    const sy = (rival.y - game.camera.y) * game.camera.zoom;
    const onScreen = sx > 0 && sx < canvas.clientWidth && sy > 0 && sy < canvas.clientHeight;
    if (onScreen) continue;

    const x = clamp(sx, margin, canvas.clientWidth - margin);
    const y = clamp(sy, margin, canvas.clientHeight - margin);
    const angle = Math.atan2(sy - canvas.clientHeight / 2, sx - canvas.clientWidth / 2);
    const d = Math.hypot(rival.x - game.player.x, rival.y - game.player.y);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const sizeGap = Math.max(0, rival.length - game.player.length);
    const scale = clamp(0.92 + sizeGap / 80, 0.92, 1.38);
    ctx.scale(scale, scale);
    ctx.rotate(-angle);
    const pulse = 1 + Math.sin(time / 120 + rival.length) * 0.1;
    const sweep = (time / 420 + rival.length * 0.03) % (Math.PI * 2);

    ctx.strokeStyle = "rgba(255,79,109,0.22)";
    ctx.lineWidth = 2.4;
    ctx.setLineDash([7, 8]);
    ctx.lineDashOffset = -time * 0.075;
    ctx.beginPath();
    ctx.arc(0, 0, 31 * pulse, sweep, sweep + Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,213,78,0.16)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 39 * pulse, sweep + Math.PI, sweep + Math.PI * 2.25);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "rgba(36,8,14,0.72)";
    ctx.strokeStyle = "rgba(255,79,109,0.84)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 19 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "rgba(255,213,78,0.42)";
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255,79,109,0.88)";
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,213,78,0.36)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, -18);
    ctx.lineTo(-31, 0);
    ctx.lineTo(-18, 18);
    ctx.stroke();
    ctx.rotate(-angle);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(Math.round(rival.length), 0, 4);
    ctx.fillStyle = "rgba(255,255,255,0.68)";
    ctx.font = "900 8px Inter, system-ui, sans-serif";
    ctx.fillText(`${Math.round(d / 100)}`, 0, 36);
    ctx.restore();
  }
}

function drawGameStats() {
  const tier = getPredatorTier();
  const biome = getBiome();
  const x = 18;
  const y = 18;
  const compact = canvas.clientWidth < 620;
  const width = compact ? Math.min(270, canvas.clientWidth - 112) : Math.min(360, canvas.clientWidth - 124);
  const height = compact ? 96 : 82;
  const pulse = game.scorePulse ? game.scorePulse / 0.6 : 0;
  ctx.save();
  ctx.shadowBlur = pulse * 24;
  ctx.shadowColor = "#ddff45";
  ctx.fillStyle = `rgba(${Math.round(3 + pulse * 34)}, ${Math.round(8 + pulse * 28)}, ${Math.round(9 + pulse * 12)}, 0.58)`;
  roundRect(x, y, width, height, 8);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = normalizeColor(biome.glow[0] || "#ffffff", 0.22);
  ctx.stroke();
  const accent = ctx.createLinearGradient(x, y, x + width, y);
  accent.addColorStop(0, biome.glow[0] || "rgba(80,255,154,0.2)");
  accent.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = accent;
  roundRect(x + 8, y + 6, width - 16, 3, 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "800 11px Inter, system-ui, sans-serif";
  ctx.fillText("SCORE", x + 14, y + 20);
  ctx.fillText("FORM", x + (compact ? 118 : 132), y + 20);
  ctx.fillText("BIOME", x + (compact ? 14 : 238), y + (compact ? 68 : 20));

  ctx.fillStyle = "#ffffff";
  ctx.font = "900 24px Inter, system-ui, sans-serif";
  ctx.fillText(String(Math.round(game.score)), x + 14, y + 48);
  if (pulse > 0.05) drawHudScoreSparkles(x + 92, y + 38, pulse, tier.color);
  ctx.font = "900 17px Inter, system-ui, sans-serif";
  ctx.fillText(tier.name, x + (compact ? 118 : 132), y + 47);
  ctx.fillText(biome.name, x + (compact ? 14 : 238), y + (compact ? 91 : 47));

  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "800 11px Inter, system-ui, sans-serif";
  if (!compact) ctx.fillText(`LENGTH ${Math.round(game.player.length)}`, x + 14, y + 70);
  ctx.fillStyle = tier.color;
  roundRect(x + width - 58, y + height - 14, 44, 5, 3);
  ctx.fill();
  drawDominanceHudStrip(x + width - 66, y + height - 28, 52, tier, biome);
  drawNextFormMeter(x + (compact ? 118 : 132), y + (compact ? 58 : 57), compact ? 122 : 188);

  const active = Object.entries(game.effects).filter(([, value]) => value > 0);
  if (active.length) {
    ctx.font = "800 11px Inter, system-ui, sans-serif";
    let chipX = x + 14;
    const chipY = y + height + 10;
    for (const [key, value] of active) {
      const label = `${effectIcon(key)} ${key.toUpperCase()} ${Math.ceil(value)}`;
      const chipWidth = ctx.measureText(label).width + 18;
      const pulse = 1 + Math.sin(performance.now() / 140 + chipX) * 0.04;
      ctx.save();
      ctx.translate(chipX + chipWidth / 2, chipY + 11);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = effectColor(key);
      roundRect(-chipWidth / 2, -11, chipWidth, 22, 8);
      ctx.fill();
      ctx.fillStyle = "#07110f";
      ctx.fillText(label, -chipWidth / 2 + 9, 4);
      ctx.restore();
      chipX += chipWidth + 8;
    }
  }
  ctx.restore();
}

function drawDominanceHudStrip(x, y, width, tier, biome) {
  const tierIndex = game.player.tierIndex || 0;
  const levelPower = clamp(tierIndex / Math.max(1, predatorTiers.length - 1), 0, 1);
  const lengthPower = clamp((game.player.length - 12) / 80, 0, 1);
  const power = clamp(0.18 + levelPower * 0.5 + lengthPower * 0.32 + biome.difficulty * 0.04, 0.18, 1);
  const time = performance.now();
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.09)";
  roundRect(x, y, width, 8, 4);
  ctx.fill();
  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  gradient.addColorStop(0, tier.color);
  gradient.addColorStop(0.62, biome.glow[0] || tier.color);
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  roundRect(x, y, width * power, 8, 4);
  ctx.fill();
  ctx.strokeStyle = withAlpha(tier.color, 0.18 + power * 0.32);
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = withAlpha("#ffffff", 0.24 + power * 0.38);
  for (let index = 0; index < 3; index += 1) {
    const px = x + width * (0.18 + index * 0.24) + Math.sin(time / 220 + index) * 1.4;
    const py = y - 5 + Math.sin(time / 160 + index) * 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + 5, py + 9);
    ctx.lineTo(px + 1.5, py + 7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawNextFormMeter(x, y, width) {
  const tierIndex = Math.floor(game.score / 100);
  if (tierIndex >= predatorTiers.length - 1) {
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.font = "800 10px Inter, system-ui, sans-serif";
    ctx.fillText("APEX FORM", x, y + 13);
    return;
  }
  const nextTier = predatorTiers[tierIndex + 1];
  const progress = (game.score % 100) / 100;
  const meterWidth = Math.min(width, Math.max(94, canvas.clientWidth - x - 30));
  if (progress > 0.78) {
    const sweep = (performance.now() * 0.06) % (meterWidth + 46) - 23;
    const glow = ctx.createLinearGradient(x + sweep - 18, y - 8, x + sweep + 18, y + 20);
    glow.addColorStop(0, "rgba(255,255,255,0)");
    glow.addColorStop(0.5, normalizeColor(nextTier.color, 0.22));
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    roundRect(x, y - 8, meterWidth, 28, 8);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.11)";
  roundRect(x, y, meterWidth, 8, 4);
  ctx.fill();
  const gradient = ctx.createLinearGradient(x, y, x + meterWidth, y);
  gradient.addColorStop(0, getPredatorTier().color);
  gradient.addColorStop(1, nextTier.color);
  ctx.fillStyle = gradient;
  roundRect(x, y, meterWidth * progress, 8, 4);
  ctx.fill();
  if (progress > 0.62) drawNextFormSparkline(x, y, meterWidth, progress, nextTier.color);
  ctx.fillStyle = "rgba(255,255,255,0.62)";
  ctx.font = "800 10px Inter, system-ui, sans-serif";
  ctx.fillText(`NEXT ${nextTier.name}`, x, y + 22);
}

function drawHudScoreSparkles(x, y, pulse, color) {
  const time = performance.now();
  ctx.save();
  ctx.fillStyle = normalizeColor(color, 0.5 + pulse * 0.34);
  ctx.strokeStyle = "rgba(255,255,255,0.32)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 5; index += 1) {
    const angle = time / 240 + index * 1.32;
    const radius = 9 + index * 4 + pulse * 10;
    ctx.save();
    ctx.translate(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius * 0.72);
    ctx.rotate(angle);
    drawStar(0, 0, 1.2, 3.5 + pulse * 2, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawNextFormSparkline(x, y, width, progress, color) {
  const time = performance.now();
  const activeWidth = width * progress;
  const count = Math.min(7, Math.max(3, Math.floor(progress * 8)));
  ctx.save();
  ctx.fillStyle = normalizeColor(color, 0.78);
  ctx.strokeStyle = "rgba(255,255,255,0.38)";
  ctx.lineWidth = 1;
  for (let index = 0; index < count; index += 1) {
    const t = (index + 1) / (count + 1);
    const px = x + activeWidth * t;
    const py = y + 4 + Math.sin(time / 140 + index) * 7;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(time / 420 + index);
    drawStar(0, 0, 1.2, 3.4 + progress * 2, 4);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function effectIcon(type) {
  if (type === "magnet") return "M";
  if (type === "shield") return "S";
  return "Z";
}

function drawBanner() {
  if (!game.bannerTime) return;
  const alpha = Math.min(1, game.bannerTime / 0.35, (2.4 - game.bannerTime) / 0.35);
  if (alpha <= 0) return;
  const time = performance.now();
  const biome = getBiome();
  const tier = getPredatorTier();
  const color = game.bannerText?.toLowerCase().includes("biome") ? biome.glow[0] || tier.color : tier.color;
  const accent = game.bannerText?.toLowerCase().includes("biome") ? biome.glow[1] || color : biome.glow[0] || color;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  const width = Math.min(456, canvas.clientWidth - 40);
  const x = canvas.clientWidth / 2 - width / 2;
  const y = 88;
  const pulse = 0.5 + Math.sin(time / 140) * 0.5;

  const glow = ctx.createRadialGradient(canvas.clientWidth / 2, y + 30, 0, canvas.clientWidth / 2, y + 30, width * 0.62);
  glow.addColorStop(0, withAlpha(color, 0.18));
  glow.addColorStop(0.44, withAlpha(accent, 0.08));
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - 80, y - 38, width + 160, 132);

  const panel = ctx.createLinearGradient(x, y, x + width, y + 58);
  panel.addColorStop(0, "rgba(3, 8, 9, 0.76)");
  panel.addColorStop(0.5, "rgba(8, 24, 22, 0.68)");
  panel.addColorStop(1, withAlpha(color, 0.22));
  ctx.fillStyle = panel;
  roundRect(x, y, width, 58, 8);
  ctx.fill();
  ctx.strokeStyle = withAlpha(color, 0.36 + pulse * 0.16);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = withAlpha("#ffffff", 0.14);
  ctx.lineWidth = 1;
  ctx.setLineDash([8, 10]);
  ctx.lineDashOffset = -time * 0.04;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 50);
  ctx.lineTo(x + width - 14, y + 50);
  ctx.stroke();
  ctx.setLineDash([]);

  const sweep = (time * 0.08) % (width + 80) - 40;
  const scan = ctx.createLinearGradient(x + sweep - 18, y, x + sweep + 18, y + 58);
  scan.addColorStop(0, "rgba(255,255,255,0)");
  scan.addColorStop(0.5, withAlpha("#ffffff", 0.14));
  scan.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = scan;
  roundRect(x + 4, y + 4, width - 8, 50, 7);
  ctx.fill();

  drawBannerGlyph(x + 36, y + 29, color, accent, time, alpha);
  drawBannerGlyph(x + width - 36, y + 29, color, accent, -time, alpha);

  ctx.fillStyle = "#ddff45";
  ctx.font = "900 13px Inter, system-ui, sans-serif";
  ctx.fillText("UNLOCKED", canvas.clientWidth / 2, y + 21);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 25px Inter, system-ui, sans-serif";
  ctx.fillText(game.bannerText, canvas.clientWidth / 2, y + 47);
  ctx.restore();
}

function drawBannerGlyph(x, y, color, accent, time, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(time / 760);
  ctx.globalAlpha = alpha * 0.9;
  ctx.strokeStyle = withAlpha(color, 0.54);
  ctx.fillStyle = withAlpha(accent, 0.28);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawStar(0, 0, 8, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = withAlpha("#ffffff", 0.28);
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset = -time * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, 24 + Math.sin(time / 180) * 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function getCameraZoom() {
  const length = game.player.length;
  if (length < 35) return 1;
  if (length < 70) return 0.9;
  if (length < 120) return 0.78;
  if (length < 190) return 0.66;
  return 0.56;
}

function drawRadar(x, y, size = 66) {
  const radius = size * 0.36;
  const limit = radius + 1;
  const sweep = (performance.now() / 900) % (Math.PI * 2);
  const blipScale = size / 66;
  const biome = getBiome();
  const threat = getThreatLevel();
  ctx.save();
  const panel = ctx.createLinearGradient(x, y, x + size, y + size);
  panel.addColorStop(0, "rgba(3, 8, 9, 0.74)");
  panel.addColorStop(0.52, "rgba(7, 17, 18, 0.58)");
  panel.addColorStop(1, withAlpha(threat > 0.1 ? "#ff4f6d" : biome.glow[0] || "#50ff9a", 0.16));
  ctx.fillStyle = panel;
  roundRect(x, y, size, size, 8);
  ctx.fill();
  ctx.strokeStyle = withAlpha(threat > 0.1 ? "#ff4f6d" : biome.glow[0] || "#ffffff", 0.18 + threat * 0.38);
  ctx.stroke();
  ctx.translate(x + size / 2, y + size / 2);
  drawRadarBiomeTexture(radius, biome, threat, blipScale);
  ctx.strokeStyle = withAlpha(biome.glow[0] || "#50ff9a", 0.22);
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 2; ring += 1) {
    ctx.globalAlpha = ring === 1 ? 0.72 : 0.42;
    ctx.beginPath();
    ctx.arc(0, 0, (radius * ring) / 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.moveTo(-limit, 0);
  ctx.lineTo(limit, 0);
  ctx.moveTo(0, -limit);
  ctx.lineTo(0, limit);
  ctx.stroke();
  ctx.strokeStyle = "rgba(221,255,69,0.38)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(sweep) * (radius + 3), Math.sin(sweep) * (radius + 3));
  ctx.stroke();
  ctx.fillStyle = "rgba(221,255,69,0.06)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, radius + 3, sweep - 0.36, sweep);
  ctx.closePath();
  ctx.fill();
  if (threat > 0.08) drawRadarDangerSweep(radius, threat, blipScale);
  drawRadarSweepPings(radius, sweep, blipScale);

  const player = game.player;
  let nearestThreat = null;
  let nearestThreatDistance = Infinity;
  for (const rival of game.rivals) {
    const rx = clamp((rival.x - player.x) / 20, -limit, limit);
    const ry = clamp((rival.y - player.y) / 20, -limit, limit);
    const d = distance(player, rival);
    const dangerous = rival.length >= player.length;
    const blip = 1 + Math.sin(performance.now() / 180 + rival.length) * 0.16;
    const advantage = clamp(Math.abs(rival.length - player.length) / 55, 0, 1);
    const blipRadius = (dangerous ? 4.5 + advantage * 1.6 : 3.2 + advantage * 0.8) * blip * blipScale;
    if (dangerous && d < nearestThreatDistance) {
      nearestThreat = rival;
      nearestThreatDistance = d;
    }
    ctx.fillStyle = dangerous ? "#ff4f6d" : rival.color;
    ctx.beginPath();
    ctx.arc(rx, ry, blipRadius, 0, Math.PI * 2);
    ctx.fill();
    if (dangerous) {
      ctx.strokeStyle = "rgba(255,213,78,0.55)";
      ctx.lineWidth = Math.max(1, 1.4 * blipScale);
      ctx.beginPath();
      ctx.arc(rx, ry, blipRadius + 3.2 * blipScale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  for (const powerUp of game.powerUps || []) {
    const px = clamp((powerUp.x - player.x) / 24, -limit, limit);
    const py = clamp((powerUp.y - player.y) / 24, -limit, limit);
    const powerPulse = 1 + Math.sin(performance.now() / 150 + powerUp.x) * 0.2;
    ctx.strokeStyle = powerUp.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 4.4 * powerPulse * (size / 66), 0, Math.PI * 2);
    ctx.stroke();
  }
  if (nearestThreat) {
    const angle = Math.atan2(nearestThreat.y - player.y, nearestThreat.x - player.x);
    const threatPulse = 1 + Math.sin(performance.now() / 100) * 0.12;
    ctx.save();
    ctx.rotate(angle);
    ctx.fillStyle = "rgba(255,79,109,0.78)";
    ctx.strokeStyle = "rgba(255,213,78,0.42)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo((radius + 5) * threatPulse, 0);
    ctx.lineTo(radius - 5, -5 * blipScale);
    ctx.lineTo(radius - 3, 0);
    ctx.lineTo(radius - 5, 5 * blipScale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = "#50ff9a";
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(3.2, 4 * (size / 66)), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -Math.max(5, 7 * blipScale));
  ctx.lineTo(Math.max(4, 5.5 * blipScale), Math.max(4, 5.5 * blipScale));
  ctx.lineTo(0, Math.max(2, 2.8 * blipScale));
  ctx.lineTo(-Math.max(4, 5.5 * blipScale), Math.max(4, 5.5 * blipScale));
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawRadarBiomeTexture(radius, biome, threat, blipScale) {
  const time = performance.now();
  const difficulty = biome.difficulty || 0;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
  ctx.clip();

  ctx.globalAlpha = 0.18 + difficulty * 0.025;
  ctx.strokeStyle = withAlpha(biome.glow[0] || "#50ff9a", 0.42);
  ctx.lineWidth = Math.max(1, 1.1 * blipScale);
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = -time * 0.028;
  for (let lane = -2; lane <= 2; lane += 1) {
    const y = lane * radius * 0.38 + Math.sin(time / 1400 + lane) * 2;
    ctx.beginPath();
    ctx.moveTo(-radius - 6, y);
    ctx.quadraticCurveTo(0, y + Math.sin(lane + difficulty) * 8, radius + 6, y - Math.cos(lane) * 6);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (difficulty >= 3 || threat > 0.25) {
    ctx.globalAlpha = 0.12 + threat * 0.16;
    ctx.fillStyle = threat > 0.25 ? "#ff4f6d" : biome.glow[1] || biome.glow[0] || "#ffd54e";
    for (let index = 0; index < 5; index += 1) {
      const angle = time / 900 + index * 1.27;
      drawStar(Math.cos(angle) * radius * 0.56, Math.sin(angle * 0.9) * radius * 0.5, 1.4, 4.2, 4);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawRadarDangerSweep(radius, threat, blipScale) {
  const time = performance.now();
  const pulse = 0.5 + Math.sin(time / 120) * 0.5;
  ctx.save();
  ctx.strokeStyle = `rgba(255,79,109,${0.12 + threat * 0.32})`;
  ctx.fillStyle = `rgba(255,79,109,${0.025 + threat * 0.055})`;
  ctx.lineWidth = Math.max(1.4, 2.2 * blipScale);
  ctx.setLineDash([7, 7]);
  ctx.lineDashOffset = -time * 0.06;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 6 + pulse * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = `rgba(255,213,78,${0.12 + threat * 0.18})`;
  ctx.beginPath();
  ctx.arc(0, 0, radius * (0.58 + pulse * 0.08), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRadarSweepPings(radius, sweep, blipScale) {
  const player = game.player;
  const time = performance.now();
  const limit = radius + 1;
  ctx.save();
  ctx.lineWidth = Math.max(1, 1.1 * blipScale);

  for (const rival of game.rivals || []) {
    const dangerous = rival.length >= player.length;
    const d = distance(player, rival);
    if (!dangerous && d > 700) continue;
    const rx = clamp((rival.x - player.x) / 20, -limit, limit);
    const ry = clamp((rival.y - player.y) / 20, -limit, limit);
    const angle = Math.atan2(ry, rx);
    const delta = Math.abs(Math.atan2(Math.sin(sweep - angle), Math.cos(sweep - angle)));
    const hit = Math.max(0, 1 - delta / 0.55);
    if (hit <= 0.02) continue;
    const pingRadius = (dangerous ? 8.5 : 5.5) * blipScale + hit * 7 * blipScale;
    ctx.strokeStyle = dangerous ? `rgba(255,79,109,${0.1 + hit * 0.45})` : `rgba(80,255,154,${0.08 + hit * 0.28})`;
    ctx.beginPath();
    ctx.arc(rx, ry, pingRadius, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const powerUp of game.powerUps || []) {
    const px = clamp((powerUp.x - player.x) / 24, -limit, limit);
    const py = clamp((powerUp.y - player.y) / 24, -limit, limit);
    const angle = Math.atan2(py, px);
    const delta = Math.abs(Math.atan2(Math.sin(sweep - angle), Math.cos(sweep - angle)));
    const hit = Math.max(0, 1 - delta / 0.42);
    if (hit <= 0.02) continue;
    ctx.strokeStyle = withAlpha(powerUp.color, 0.14 + hit * 0.4);
    ctx.fillStyle = withAlpha(powerUp.color, 0.08 + hit * 0.2);
    ctx.beginPath();
    drawStar(px, py, (3 + hit * 1.5) * blipScale, (7 + hit * 4) * blipScale, 4);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.setLineDash([3, 7]);
  ctx.lineDashOffset = -time * 0.04;
  ctx.beginPath();
  ctx.arc(0, 0, radius + Math.sin(time / 240) * 1.4, sweep - 0.9, sweep - 0.16);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function makeTerrain(biomeIndex = game?.biomeIndex || 0) {
  const colors = (biomes[biomeIndex] || biomes[0]).glow;
  return Array.from({ length: 24 }, () => ({
    x: random(80, world.width - 80),
    y: random(80, world.height - 80),
    radius: random(120, 310),
    color: colors[Math.floor(Math.random() * colors.length)],
    phase: random(0, Math.PI * 2)
  }));
}

function makeMotes(biomeIndex = game?.biomeIndex || 0) {
  const colors = (biomes[biomeIndex] || biomes[0]).glow;
  return Array.from({ length: 70 }, (_, index) => ({
    x: random(0, world.width),
    y: random(0, world.height),
    radius: random(1.2, 4.4),
    alpha: random(0.08, 0.28),
    depth: random(0.3, 1.8),
    vx: random(-8, 8),
    vy: random(-6, 10),
    color: colors[index % colors.length]
  }));
}

function makeWeather(biomeIndex = game?.biomeIndex || 0) {
  const biome = biomes[biomeIndex] || biomes[0];
  const presets = [
    { type: "pollen", count: 34, color: "#ddff45", speedX: [-5, 9], speedY: [-10, 12], size: [1.5, 3.4], alpha: [0.08, 0.2], width: 1 },
    { type: "rain", count: 46, color: "#a6ecff", speedX: [-32, -12], speedY: [70, 145], size: [8, 18], alpha: [0.08, 0.22], width: 1.5 },
    { type: "leaf", count: 38, color: "#50ff9a", speedX: [-22, 24], speedY: [18, 48], size: [3, 7], alpha: [0.08, 0.22], width: 1 },
    { type: "dust", count: 42, color: "#ffd54e", speedX: [-34, 28], speedY: [-8, 18], size: [1.4, 4.8], alpha: [0.07, 0.18], width: 1 },
    { type: "rift", count: 44, color: "#ffffff", speedX: [-18, 18], speedY: [-30, 30], size: [2, 6], alpha: [0.08, 0.2], width: 1.2 }
  ];
  const preset = presets[biome.difficulty] || presets[0];
  return Array.from({ length: preset.count }, () => ({
    type: preset.type,
    x: random(0, world.width),
    y: random(0, world.height),
    vx: random(preset.speedX[0], preset.speedX[1]),
    vy: random(preset.speedY[0], preset.speedY[1]),
    size: random(preset.size[0], preset.size[1]),
    alpha: random(preset.alpha[0], preset.alpha[1]),
    color: preset.color,
    width: preset.width,
    spin: random(0, Math.PI)
  }));
}

function drawStar(x, y, innerRadius, outerRadius, points) {
  ctx.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const sx = x + Math.cos(angle) * radius;
    const sy = y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
}

function roundRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function spawnFood() {
  const type = foods[Math.floor(Math.random() * foods.length)];
  game.food.push({
    ...type,
    x: random(36, world.width - 36),
    y: random(36, world.height - 36),
    sparkle: random(0, 1),
    phase: random(0, Math.PI * 2)
  });
}

function spawnPowerUp() {
  const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
  const point = getSafeSpawnPoint();
  game.powerUps.push({
    ...type,
    x: point.x,
    y: point.y,
    radius: 17
  });
}

function effectColor(type) {
  if (type === "magnet") return "#38c5ff";
  if (type === "shield") return "#50ff9a";
  return "#ffd54e";
}

function nearestFood(snake) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const food of game.food) {
    const d = distance(snake, food);
    if (d < nearestDistance) {
      nearest = food;
      nearestDistance = d;
    }
  }
  return nearest;
}

function burst(x, y, color, amount) {
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = random(60, 220);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: random(2, 6),
      life: 1
    });
  }
}

function popText(x, y, text, color, scale = 1) {
  game.particles.push({
    x,
    y,
    vx: random(-8, 8),
    vy: -48 * scale,
    color,
    radius: 1,
    life: 1.25,
    text,
    scale
  });
}

function scoreSpark(x, y, color, amount) {
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = random(50, 150);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: random(2.2, 5.2),
      life: random(0.55, 0.9),
      spark: true
    });
  }
}

function scrapeSparks(x, y, angle, color) {
  for (let index = 0; index < 14; index += 1) {
    const spread = random(-0.9, 0.9);
    const speed = random(80, 230);
    const sparkAngle = angle + Math.PI + spread;
    game.particles.push({
      x: x + random(-5, 5),
      y: y + random(-5, 5),
      vx: Math.cos(sparkAngle) * speed,
      vy: Math.sin(sparkAngle) * speed,
      color,
      radius: random(5, 12),
      life: random(0.34, 0.58),
      scrape: true,
      angle: sparkAngle,
      width: random(1.5, 3.2)
    });
  }
  addShockwave(x, y, color, 0.48);
}

function biteBurst(x, y, color, accent) {
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2 + random(-0.12, 0.12);
    const speed = random(80, 230);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: index % 2 ? accent : color,
      radius: random(8, 20),
      life: random(0.42, 0.74),
      biteShard: true,
      angle,
      spin: random(-0.12, 0.12)
    });
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + random(-0.18, 0.18);
    const speed = random(120, 280);
    game.particles.push({
      x: x + Math.cos(angle) * 8,
      y: y + Math.sin(angle) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color: "#ffffff",
      radius: random(4, 8),
      life: random(0.24, 0.42),
      streak: true,
      seed: random(0, Math.PI * 2),
      kind: "slash"
    });
  }
}

function shieldShardBurst(x, y, color) {
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 + random(-0.08, 0.08);
    const speed = random(90, 210);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: random(8, 15),
      life: random(0.42, 0.72),
      shieldShard: true,
      angle,
      spin: random(-0.1, 0.1)
    });
  }
}

function collectRipple(x, y, color, accent, kind, scale = 1) {
  game.particles.push({
    x,
    y,
    vx: 0,
    vy: -8 * scale,
    color,
    accent: accent || color,
    radius: 11 * scale,
    growth: 42 * scale,
    life: 0.78,
    duration: 0.78,
    collect: true,
    kind,
    scale
  });
  for (let index = 0; index < 6; index += 1) {
    const angle = (index / 6) * Math.PI * 2 + Math.random() * 0.3;
    const speed = random(35, 95) * scale;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 10,
      color: accent || color,
      radius: random(1.8, 3.8) * scale,
      life: random(0.42, 0.7),
      spark: true
    });
  }
  if (game.player) {
    for (let index = 0; index < Math.min(7, 3 + Math.round(scale * 2)); index += 1) {
      const angle = (index / 7) * Math.PI * 2 + random(-0.35, 0.35);
      const controlDistance = random(36, 86) * scale;
      game.particles.push({
        x,
        y,
        vx: 0,
        vy: 0,
        originX: x,
        originY: y,
        controlX: x + Math.cos(angle) * controlDistance,
        controlY: y + Math.sin(angle) * controlDistance,
        targetX: game.player.x,
        targetY: game.player.y,
        color,
        accent: accent || color,
        radius: random(2.4, 4.6) * scale,
        life: random(0.46, 0.72),
        duration: 0.72,
        scale,
        nutrient: true,
        seed: random(0, Math.PI * 2)
      });
    }
  }
}

function comboBurst(x, y, color, combo) {
  const amount = Math.min(18, 5 + combo * 2);
  for (let index = 0; index < amount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = random(70, 180) + combo * 8;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      radius: random(4, 8) + combo * 0.25,
      life: random(0.52, 0.82),
      streak: true,
      kind: index % 3 === 0 ? "slash" : "star",
      seed: random(0, Math.PI * 2)
    });
  }
  if (combo >= 5) {
    addShockwave(x, y, color, 0.8 + combo * 0.08);
  }
}

function addShockwave(x, y, color, size = 1, style = "ring") {
  if (!game.shockwaves) game.shockwaves = [];
  game.shockwaves.push({
    x,
    y,
    color: normalizeColor(color, 0.92),
    style,
    radius: 18 * size,
    growth: 90 * size,
    width: 8 * size,
    life: 0.62,
    duration: 0.62
  });
}

function addCombo(points, color, bonus = 1) {
  const streakWindow = game.comboTime > 0 ? 2.4 : 1.7;
  game.combo = game.comboTime > 0 ? Math.min(9, game.combo + 1) : 1;
  game.comboTime = streakWindow;
  game.comboColor = color;
  if (game.combo >= 3) {
    const bonusPoints = Math.round(points * 0.08 * game.combo * bonus);
    game.score += bonusPoints;
    game.scorePulse = 0.6;
    popText(game.player.x, game.player.y - game.player.radius * 1.8, `STREAK +${bonusPoints}`, color, 1.2);
    comboBurst(game.player.x, game.player.y, color, game.combo);
  }
}

function updateParticles(dt) {
  for (let index = game.particles.length - 1; index >= 0; index -= 1) {
    const particle = game.particles[index];
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= 0.94;
    particle.vy *= 0.94;
    particle.life -= dt * 1.9;
    if (particle.life <= 0) game.particles.splice(index, 1);
  }
}

function updateShockwaves(dt) {
  if (!game.shockwaves) return;
  for (let index = game.shockwaves.length - 1; index >= 0; index -= 1) {
    const shockwave = game.shockwaves[index];
    shockwave.life -= dt;
    if (shockwave.life <= 0) game.shockwaves.splice(index, 1);
  }
}

function updateCombo(dt) {
  if (!game.comboTime) return;
  game.comboTime = Math.max(0, game.comboTime - dt);
  if (game.comboTime <= 0) {
    game.combo = 0;
    game.comboColor = "";
  }
}

function updateFoodSparkles(dt) {
  if (!game.foodSparkles) game.foodSparkles = [];
  if (!game.running) return;
  const richFood = game.food.filter((food) => food.value >= 16);
  const amount = Math.min(3, richFood.length);
  for (let index = 0; index < amount; index += 1) {
    if (Math.random() > dt * 2.4) continue;
    const food = richFood[Math.floor(Math.random() * richFood.length)];
    if (!food) continue;
    game.foodSparkles.push({
      x: food.x + random(-food.radius, food.radius),
      y: food.y + random(-food.radius, food.radius),
      radius: random(1.4, 3.6),
      color: food.accent,
      life: random(0.5, 0.95)
    });
  }
  for (let index = game.foodSparkles.length - 1; index >= 0; index -= 1) {
    const sparkle = game.foodSparkles[index];
    sparkle.y -= dt * 16;
    sparkle.life -= dt * 1.45;
    if (sparkle.life <= 0) game.foodSparkles.splice(index, 1);
  }
}

function drawFoodSparkles() {
  if (!game.foodSparkles?.length) return;
  ctx.save();
  for (const sparkle of game.foodSparkles) {
    ctx.globalAlpha = Math.max(0, sparkle.life);
    ctx.fillStyle = sparkle.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = sparkle.color;
    drawStar(sparkle.x, sparkle.y, sparkle.radius * 0.45, sparkle.radius, 4);
    ctx.fill();
  }
  ctx.restore();
}

function updateMotes(dt) {
  if (!game.motes) return;
  for (const mote of game.motes) {
    mote.x = (mote.x + mote.vx * dt + world.width) % world.width;
    mote.y = (mote.y + mote.vy * dt + world.height) % world.height;
  }
}

function updateWeather(dt) {
  if (!game.weather) return;
  for (const item of game.weather) {
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.spin += dt * 1.5;
    if (item.y > world.height + 80) item.y = -80;
    if (item.y < -90) item.y = world.height + 60;
    if (item.x > world.width + 90) item.x = -90;
    if (item.x < -90) item.x = world.width + 90;
  }
}

function updateBanner(dt) {
  if (game.bannerTime > 0) game.bannerTime = Math.max(0, game.bannerTime - dt);
}

function updateBiomeReveal(dt) {
  if (game.biomeReveal?.time > 0) game.biomeReveal.time = Math.max(0, game.biomeReveal.time - dt);
}

function updateFormReveal(dt) {
  if (game.formReveal?.time > 0) game.formReveal.time = Math.max(0, game.formReveal.time - dt);
}

function updateEvolutionBurst(dt) {
  if (game.evolutionBurst?.time > 0) game.evolutionBurst.time = Math.max(0, game.evolutionBurst.time - dt);
}

function updateReadyPulse(dt) {
  if (game.readyPulse?.time > 0) game.readyPulse.time = Math.max(0, game.readyPulse.time - dt);
}

function updateScreenEffects(dt) {
  if (game.flash.time > 0) game.flash.time = Math.max(0, game.flash.time - dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 24);
  if (game.scorePulse > 0) game.scorePulse = Math.max(0, game.scorePulse - dt);
  if (game.biomeRipple.time > 0) game.biomeRipple.time = Math.max(0, game.biomeRipple.time - dt);
}

function triggerImpact(color, duration = 0.35, shake = 4) {
  game.flash = { color, time: duration, duration };
  game.shake = Math.max(game.shake, shake);
}

function drawScreenFlash() {
  if (!game.flash?.time) return;
  const alpha = (game.flash.time / game.flash.duration) * 0.18;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = game.flash.color;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  ctx.restore();
}

function drawCockpitFrame() {
  if (!game.running && !game.paused && !game.over) return;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const biome = getBiome();
  const threat = getThreatLevel();
  const time = performance.now();
  const color = biome.glow[0] || "#50ff9a";
  ctx.save();
  ctx.lineCap = "round";

  const topGlow = ctx.createLinearGradient(0, 0, 0, 86);
  topGlow.addColorStop(0, withAlpha(color, 0.1 + threat * 0.08));
  topGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, 90);

  const bottomGlow = ctx.createLinearGradient(0, height, 0, height - 96);
  bottomGlow.addColorStop(0, "rgba(3,8,9,0.26)");
  bottomGlow.addColorStop(0.6, withAlpha(color, 0.045));
  bottomGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bottomGlow;
  ctx.fillRect(0, height - 100, width, 100);

  ctx.strokeStyle = withAlpha(threat > 0.35 ? "#ff4f6d" : color, 0.16 + threat * 0.18);
  ctx.lineWidth = 1.4;
  ctx.setLineDash([18, 18]);
  ctx.lineDashOffset = -time * 0.035;
  for (const y of [72, height - 74]) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(width - 24, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const corner = Math.min(96, Math.max(54, width * 0.07));
  const pad = 12;
  ctx.strokeStyle = withAlpha("#ffffff", 0.11);
  ctx.lineWidth = 2;
  for (const sx of [pad, width - pad]) {
    for (const sy of [pad, height - pad]) {
      const xDir = sx < width / 2 ? 1 : -1;
      const yDir = sy < height / 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(sx, sy + yDir * corner * 0.46);
      ctx.quadraticCurveTo(sx, sy, sx + xDir * corner * 0.46, sy);
      ctx.lineTo(sx + xDir * corner, sy);
      ctx.stroke();
    }
  }

  const sweep = (time * 0.035) % (width + 180) - 90;
  const scan = ctx.createLinearGradient(sweep - 28, 0, sweep + 28, height);
  scan.addColorStop(0, "rgba(255,255,255,0)");
  scan.addColorStop(0.5, withAlpha(color, 0.035));
  scan.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = scan;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

function updateHud() {
  const tier = getPredatorTier();
  scoreEl.textContent = String(Math.round(game.score));
  lengthEl.textContent = String(Math.round(game.player.length));
  predatorEl.textContent = tier.name;
  biomeEl.textContent = getBiome().name;
  if (boardEl && performance.now() - lastBoardUpdate > 400) {
    lastBoardUpdate = performance.now();
    const rows = [
      { name: game.player.name, length: game.player.length, me: true },
      ...game.rivals.map((rival) => ({ name: rival.name, length: rival.length, me: false }))
    ]
      .sort((a, b) => b.length - a.length)
      .slice(0, 8);
    boardEl.innerHTML =
      "<h2>Leaderboard</h2>" +
      rows
        .map((row) => `<div class="row${row.me ? " me" : ""}"><span>${escapeHtml(row.name)}</span><strong>${Math.round(row.length)}</strong></div>`)
        .join("");
  }
}

function setOverlayStats() {
  if (!overlayStats) return;
  if (!game || (!game.paused && !game.over)) {
    overlayStats.classList.remove("visible");
    overlayStats.innerHTML = "";
    return;
  }

  overlayStats.classList.add("visible");
  overlayStats.innerHTML = `
    <div class="score-card"><span>Score</span><strong>${Math.round(game.score || 0)}</strong></div>
    <div><span>Length</span><strong>${Math.round(game.player?.length || 0)}</strong></div>
    <div><span>Form</span><strong>${getPredatorTier(game.score || 0).name}</strong></div>
    <div class="best-card"><span>Best</span><strong>${Math.round(game.bestScore || readBestScore())}</strong></div>
    <div><span>Biome</span><strong>${getBiome().name}</strong></div>
    <div><span>Streak</span><strong>${game.combo || 0}x</strong></div>
    <div class="rank-card"><span>Rank</span><strong>${getRunRank(game.score || 0)}</strong></div>
  `;
}

function getRunRank(score) {
  if (score >= 2500) return "Apex";
  if (score >= 1600) return "S";
  if (score >= 900) return "A";
  if (score >= 450) return "B";
  if (score >= 180) return "C";
  return "D";
}

function readBestScore() {
  try {
    return Number(localStorage.getItem("food-chain-best") || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  const best = Math.max(readBestScore(), Math.round(score || 0));
  try {
    localStorage.setItem("food-chain-best", String(best));
  } catch {
    return best;
  }
  return best;
}

function updateBiome() {
  const progress = game.score + game.distance / 18;
  const nextIndex = getBiomeIndex(progress);
  if (nextIndex === game.biomeIndex) return;

  game.biomeIndex = nextIndex;
  const biome = getBiome();
  game.terrain = makeTerrain(game.biomeIndex);
  game.motes = makeMotes(game.biomeIndex);
  game.weather = makeWeather(game.biomeIndex);
  game.message = `${biome.name} unlocked. Stronger animals are hunting.`;
  showBanner(`${biome.name} biome`);
  game.biomeRipple = { time: 1.6, duration: 1.6, color: biome.glow[0] || "#ffffff" };
  game.biomeReveal = { time: 2.2, duration: 2.2, name: biome.name, color: biome.glow[0] || "#ffffff" };
  triggerImpact("#ffffff", 0.32, 5);
  addShockwave(game.player.x, game.player.y, biome.glow[0] || "#ffffff", 1.8);
  burst(game.player.x, game.player.y, "#ffffff", 46);
  while (game.rivals.length < 4 + biome.difficulty) {
    game.rivals.push(makeRival(game.rivals.length));
  }
  game.rivals = game.rivals.map((rival, index) => {
    if (index < Math.max(1, biome.difficulty)) return makeRival(index);
    rival.speed += biome.difficulty * 6;
    rival.length += biome.difficulty * 5;
    rival.radius += biome.difficulty * 0.5;
    return rival;
  });
}

function getBiomeIndex(progress = game.score + game.distance / 18) {
  let index = 0;
  for (let i = 0; i < biomes.length; i += 1) {
    if (progress >= biomes[i].threshold) index = i;
  }
  return index;
}

function getBiome() {
  return biomes[game?.biomeIndex || 0];
}

function updatePredatorTier() {
  const tierIndex = Math.min(predatorTiers.length - 1, Math.floor(game.score / 100));
  const player = game.player;
  if (player.tierIndex === tierIndex) return;

  player.tierIndex = tierIndex;
  const tier = predatorTiers[tierIndex];
  player.color = tier.color;
  player.radius = tier.radius;
  player.speed = tier.speed;
  player.animal = tier.animal;
  player.length += 4 + tierIndex * 1.2;
  game.message = `${tier.name} form unlocked`;
  showBanner(`${tier.name} form`);
  sfxEvolve();
  game.formReveal = { time: 1.8, duration: 1.8, name: tier.name, color: tier.color };
  game.evolutionBurst = { time: 1.25, duration: 1.25, name: tier.name, color: tier.color };
  triggerImpact(tier.color, 0.34, 4);
  addShockwave(player.x, player.y, tier.color, 1.25);
  burst(player.x, player.y, tier.color, 32);
}

function getPredatorTier(score = game.score) {
  return predatorTiers[Math.min(predatorTiers.length - 1, Math.floor(score / 100))];
}

function randomAnimal(difficulty = 0) {
  const sets = [
    ["mouse", "fox", "wolf"],
    ["fox", "wolf", "bird"],
    ["wolf", "cat", "bird", "shark"],
    ["cat", "bird", "shark", "dragon"],
    ["bird", "shark", "dragon"]
  ];
  const options = sets[Math.min(sets.length - 1, difficulty)];
  return options[Math.floor(Math.random() * options.length)];
}

function showBanner(text) {
  game.bannerText = text;
  game.bannerTime = 2.4;
}

function getSafeSpawnPoint() {
  const player = game?.player;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const point = {
      x: random(90, world.width - 90),
      y: random(90, world.height - 90)
    };
    if (!player || distance(point, player) > 520) return point;
  }
  return {
    x: clamp((player?.x || world.width / 2) + random(620, 900) * (Math.random() > 0.5 ? 1 : -1), 90, world.width - 90),
    y: clamp((player?.y || world.height / 2) + random(420, 760) * (Math.random() > 0.5 ? 1 : -1), 90, world.height - 90)
  };
}

function endGame(reason) {
  game.running = false;
  game.paused = false;
  game.over = true;
  const previousBest = readBestScore();
  game.newBest = Math.round(game.score) > previousBest;
  game.bestScore = saveBestScore(game.score);
  document.body.classList.remove("game-active");
  document.body.classList.remove("game-paused");
  document.body.classList.add("game-over");
  document.body.classList.toggle("new-best", game.newBest);
  overlay.classList.remove("hidden");
  overlay.querySelector(".kicker").textContent = game.newBest ? "New best chain" : "Chain broken";
  overlay.querySelector("h1").textContent = reason;
  const survivedSeconds = Math.max(0, Math.round((performance.now() - runStartedAt) / 1000));
  const survivedLabel = `${Math.floor(survivedSeconds / 60)}:${String(survivedSeconds % 60).padStart(2, "0")}`;
  overlay.querySelector("p").textContent = game.newBest
    ? `Rank ${getRunRank(game.score)}. New best ${Math.round(game.bestScore)}. Survived ${survivedLabel}, ate ${runKills} rivals.`
    : `Rank ${getRunRank(game.score)}. Final score ${Math.round(game.score)}. Survived ${survivedLabel}, ate ${runKills} rivals.`;
  shareText = `I survived ${survivedLabel} as a ${getPredatorTier().name} in Food Chain (score ${Math.round(game.score)}, ${runKills} rivals eaten). Play it: https://gamed.fun/food-chain/`;
  sfxDeath();
  setOverlayStats();
  startButton.textContent = "Play again";
}

function resizeCanvas() {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.floor(canvas.clientWidth * ratio);
  const height = Math.floor(canvas.clientHeight * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function turnToward(current, target, amount) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + clamp(diff, -amount, amount);
}

function shade(hex, fade) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) hex = "#ffffff";
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const mix = 36 + fade * 32;
  return `rgb(${Math.min(255, r + mix)}, ${Math.min(255, g + mix)}, ${Math.min(255, b + mix)})`;
}

function withAlpha(hex, alpha) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) hex = "#ffffff";
  const value = parseInt(hex.slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function normalizeColor(color, alpha = 1) {
  if (color.startsWith("#")) return withAlpha(color, alpha);
  return color;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return min + Math.random() * (max - min);
}

function bindHold(button) {
  if (!button) return;
  const on = (event) => {
    event.preventDefault();
    button.classList.add("active");
  };
  const off = () => button.classList.remove("active");
  button.addEventListener("pointerdown", on);
  button.addEventListener("pointerup", off);
  button.addEventListener("pointercancel", off);
  button.addEventListener("pointerleave", off);
}

startButton.addEventListener("click", () => {
  if (game.paused) resumeGame();
  else newGame();
});
bindHold(leftButton);
bindHold(rightButton);
bindHold(boostButton);
bindHold(touchBoostButton);

window.addEventListener("keydown", (event) => {
  if (nameInput && event.target === nameInput) {
    if (event.key === "Enter" && game && !game.running) {
      if (game.paused) resumeGame();
      else newGame();
    }
    return;
  }
  keys.add(event.key.toLowerCase());
  if (event.key === " " || event.key.startsWith("Arrow")) event.preventDefault();
  if ((event.key === "Escape" || event.key.toLowerCase() === "p") && game?.running) {
    event.preventDefault();
    pauseGame();
    return;
  }
  if (!game?.running && event.key === "Enter") {
    if (game.paused) resumeGame();
    else newGame();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});

window.addEventListener("pointerup", () => {
  pointer.active = false;
});

if (nameInput) {
  try { nameInput.value = localStorage.getItem("food-chain-name") || ""; } catch {}
}

if (muteButton) {
  muteButton.classList.toggle("muted", soundMuted);
  muteButton.addEventListener("click", () => {
    soundMuted = !soundMuted;
    muteButton.classList.toggle("muted", soundMuted);
    try { localStorage.setItem("food-chain-muted", soundMuted ? "1" : "0"); } catch {}
  });
}

if (shareButton) {
  shareButton.addEventListener("click", async () => {
    if (!shareText) return;
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
      await navigator.clipboard.writeText(shareText);
      const label = shareButton.querySelector("span") || shareButton;
      const previous = label.textContent;
      label.textContent = "Copied!";
      setTimeout(() => { label.textContent = previous; }, 1500);
    } catch {}
  });
}

game = {
  running: false,
  paused: false,
  player: makeSnake(playerName(), world.width * 0.5, world.height * 0.5, "#4ee38a", true),
  rivals: [],
  food: [],
  foodSparkles: [],
  powerUps: [],
  effects: { magnet: 0, shield: 0, surge: 0 },
  terrain: makeTerrain(0),
  particles: [],
  shockwaves: [],
  playerPath: [],
  pathTimer: 0,
  motes: makeMotes(0),
  weather: makeWeather(0),
  flash: { color: "#ffffff", time: 0, duration: 1 },
  shake: 0,
  scorePulse: 0,
  biomeRipple: { time: 0, duration: 1, color: "#ffffff" },
  biomeReveal: { time: 0, duration: 1, name: "Meadow", color: "#50ff9a" },
  formReveal: { time: 0, duration: 1, name: "Mouse", color: "#50ff9a" },
  evolutionBurst: { time: 0, duration: 1, name: "Mouse", color: "#50ff9a" },
  readyPulse: { time: 0, duration: 1 },
  bannerText: "",
  bannerTime: 0,
  combo: 0,
  comboTime: 0,
  nearMissCooldown: 0,
  camera: { x: 0, y: 0, zoom: 1 },
  score: 0,
  bestScore: readBestScore(),
  distance: 0,
  biomeIndex: 0,
  paused: false,
  over: false,
  message: "Press Play"
};
resizeCanvas();
drawWorld();
