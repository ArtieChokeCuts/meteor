(function() {
  'use strict';

  console.log("Combined Game script loaded - Safer HighScore, Ship Limits, Multi-Ship, Health Bars.");

  // ---- Configuration ----
  const config = {
    player: {
      size: 50,
      shootCooldown: 10, // Frames between shots
      laserDuration: 300, // Frames laser power-up lasts
      shipFormationOffsetX: 55, // Horizontal distance for wingmen
      shipFormationOffsetY: 35, // Vertical distance (behind player) for wingmen
    },
    laser: {
        widthBonus: 8, // Added pixels to laser collision check radius
    },
    bullets: {
      width: 5,
      height: 15,
      speed: 10,
      color: 'red',
      transformedColor: 'orange', // Color after bouncing off large meteor
      bounceLife: 20, // Frames bounced bullet lasts
    },
    enemies: {
      spawnRateInitial: 1200, // Milliseconds
      spawnRateScoreFactor: 50, // Spawn rate decreases every X points
      minSpawnRate: 350, // Fastest spawn rate
      size: 50,
      speed: 3,
      points: 10,
      rotationSpeedMin: 0.01,
      rotationSpeedMax: 0.05,
    },
    largeMeteor: {
      sizeMultiplier: 2.5,
      health: 10,
      pointsPerHit: 10, // Points for hitting, not destroying
      spawnScoreInterval: 1500, // Spawn one every X score points
      bounceForce: 1.5, // How much bullets push it horizontally
      explosionParticles: 50,
    },
    enemyShipChance: 0.25, // Base chance a spawn attempts to be a ship
    enemyShipHealth: 3, // Max health for enemy ships
    enemyShipSpeed: 2,
    enemyShipPoints: 50,
    enemyShipShootTimerMin: 80,
    enemyShipShootTimerMax: 160,
    shipProjectileSpeed: 4,
    shipProjectileSize: 6,
    particles: {
      count: 25,
      speed: 4,
      life: 60, // Frames
      radiusMin: 1,
      radiusMax: 3,
    },
    ambientParticles: {
      spawnChance: 0.3,
      speed: 1,
      life: 100, // Frames
      radiusMin: 0.5,
      radiusMax: 2.0,
    },
    powerUps: {
      shieldSpawnChance: 0.003,
      laserSpawnChance: 0.002,
      droneSpawnChance: 0.0015,
      shieldDuration: 600, // Frames (10 seconds)
      droneDuration: 600, // Frames (10 seconds)
      powerUpSize: 30, // General size for S, L, D
      powerUpSpeed: 2,
      droneShootCooldown: 45, // Frames between drone shots
      extraShipScoreInterval: 10000, // Score needed for powerup to appear
      extraShipPowerUpSize: 40,      // Visual size of the falling ship powerup
      extraShipPowerUpSpeed: 2.5,
      extraShipPowerUpRotationSpeedMin: 0.03,
      extraShipPowerUpRotationSpeedMax: 0.08,
    },
    starfield: {
      foregroundStars: 70,
      backgroundStars: 70,
      fgSpeedMin: 0.5,
      fgSpeedMax: 1.2,
      bgSpeedMin: 0.1,
      bgSpeedMax: 0.4,
    },
    nebula: {
      spawnChance: 0.0005,
      fadeInSpeed: 0.005,
      fadeOutSpeed: 0.005,
      maxOpacity: 0.5,
      duration: 300, // Frames
    },
    combo: {
      resetFrames: 180, // Frames (3 seconds) without hit to reset combo
    },
    initialLives: 3,
    // Level Advancement: Kill required ships to increase the *limit* of concurrent ships allowed by spawnEnemy
    levelRequirements: {
       1: { ship2: 1, ship3: 0 }, 2: { ship2: 0, ship3: 1 }, 3: { ship2: 1, ship3: 1 },
       4: { ship2: 2, ship3: 1 }, 5: { ship2: 1, ship3: 2 }, 6: { ship2: 2, ship3: 2 },
       7: { ship2: 3, ship3: 2 }, 8: { ship2: 2, ship3: 3 }, 9: { ship2: 3, ship3: 3 },
       10: { ship2: 4, ship3: 3}, 11: { ship2: 3, ship3: 4}, 12: { ship2: 4, ship3: 4},
       13: { ship2: 5, ship3: 4}, 14: { ship2: 4, ship3: 5}, 15: { ship2: 5, ship3: 5},
       16: { ship2: 6, ship3: 5}, 17: { ship2: 6, ship3: 6},
       // After level 17, the ship limit stays at 17, but you could add more kill reqs here if desired.
    },
    levelTransitionDuration: 180, // Frames (3 seconds) for level title screen
    sfxVolume: 0.5, // General volume for sound effects (0.0 to 1.0)
  };

  // ---- Asset Definitions ----
  const assets = {
    spritesheet: { src: 'final_corrected_game_sprite_sheet.png', image: null },
    shipsDrone: { src: 'ships_drone.png', image: null },
    shootSound: { src: 'shoot.mp3', audio: null, volume: config.sfxVolume },
    explosionSound: { src: 'explosion.mp3', audio: null, volume: config.sfxVolume },
    laserSound: { src: 'laser.mp3', audio: null, volume: config.sfxVolume },
    droneSound: { src: 'drone.mp3', audio: null, volume: config.sfxVolume },
    powerUpGetSound: { src: 'explosion.mp3', audio: null, volume: config.sfxVolume * 0.8 }, // Reuses explosion
    backgroundMusic: { src: 'background.mp3', audio: null, loop: true, volume: 0.9 },
  };

  // ---- Sprite Data ----
  const sprites = { spaceship: { x: 10, y: 10, width: 200, height: 200 }, asteroidIntact: { x: 230, y: 10, width: 200, height: 200 }, asteroidExploding: [ { x: 450, y: 10, width: 200, height: 200 }, { x: 670, y: 10, width: 200, height: 200 } ] };
  const shipsDroneSprites = { spaceship2: { x: 10, y: 10, width: 200, height: 200 }, spaceship3: { x: 230, y: 10, width: 200, height: 200 }, drone: { x: 450, y: 10, width: 200, height: 200 } };

  // ---- Game State Variables ----
  let canvas, ctx;
  let scoreElement, highScoreElement, livesElement, comboElement;
  let startScreen, pauseScreen, startMessage;
  let score = 0, highScore = 0, lives = config.initialLives;
  let comboCount = 0, comboTimer = 0;
  let shieldTime = 0;
  let frameCount = 0, lastShotFrame = 0;
  let level = 1;
  let enemyShipsDestroyedThisLevel = { ship2: 0, ship3: 0 };
  let currentEnemySpawnRate = config.enemies.spawnRateInitial;
  let enemySpawnTimerId = null;
  let nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval;
  let gameActive = false, gameStarted = false, paused = false;
  let showingLevelTransition = false;
  let levelTransitionTimer = 0;
  const player = { x: 0, y: 0, size: config.player.size, hasLaser: false, laserTimer: 0 };
  let playerShipCount = 1;
  let nextExtraShipScore = config.powerUps.extraShipScoreInterval;
  const bullets = [], enemies = [], particles = [], powerUps = [];
  const shipProjectiles = [];
  const ambientParticles = [], activeLaserEffects = [];
  const extraShipPowerUps = [];
  const starLayers = { foreground: [], background: [] };
  let nebulaActive = false, nebulaOpacity = 0, nebulaTimer = 0;
  let shieldHue = 0, shieldRotation = 0;
  let droneActive = false, droneTimer = 0, droneShootTimer = 0;
  const droneOrbitRadius = player.size * 0.8 + 15;
  const droneSize = player.size * 0.6;
  let droneOrbitAngle = 0;
  let dronePos = { x: 0, y: 0 };
  let audioContext;

  // ---- Utility Functions ----
  function getRandom(min, max) { return Math.random() * (max - min) + min; }
  function getRandomColor() { const letters = '0123456789ABCDEF'; let color = '#'; for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; } return color; }
  function checkCollision(obj1, obj2) { const dx = obj1.x - obj2.x; const dy = obj1.y - obj2.y; const distance = Math.sqrt(dx * dx + dy * dy); const radiiSum = obj1.size / 2 + obj2.size / 2; return distance < radiiSum; }

  // ---- Asset Manager ----
  const assetManager = {
    assetsLoaded: 0,
    totalAssets: Object.keys(assets).length,
    loadAssets(callback) { console.log("Loading assets..."); startMessage.innerHTML = `<strong>Loading Assets... 0/${this.totalAssets}</strong>`; for (const key in assets) { const asset = assets[key]; if (asset.src.endsWith('.png')) { asset.image = new Image(); asset.image.onload = () => this.assetLoaded(key, callback); asset.image.onerror = () => this.assetError(key, callback); asset.image.src = asset.src; } else if (asset.src.endsWith('.mp3')) { asset.audio = new Audio(); asset.audio.addEventListener('canplaythrough', () => this.assetLoaded(key, callback), { once: true }); asset.audio.onerror = () => this.assetError(key, callback); asset.audio.src = asset.src; if (asset.volume !== undefined) { asset.audio.volume = asset.volume; } if (asset.loop) asset.audio.loop = true; asset.audio.load(); } } },
    assetLoaded(key, callback) { this.assetsLoaded++; console.log(`Loaded: ${key} (${this.assetsLoaded}/${this.totalAssets})`); startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets}</strong>`; if (this.assetsLoaded === this.totalAssets) { console.log("All assets loaded."); callback(); } },
    assetError(key, callback) { console.error(`Failed to load asset: ${key}`); this.assetsLoaded++; startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets} (Error loading ${key})</strong>`; if (this.assetsLoaded === this.totalAssets) { console.warn("Finished loading assets, but some failed."); callback(); } },
    getSpriteSheet() { return assets.spritesheet.image; },
    getShipsDroneSheet() { return assets.shipsDrone.image; },
    playSound(key) { const audio = assets[key]?.audio; if (audio) { if (audioContext && audioContext.state === 'suspended') { audioContext.resume().then(() => { audio.currentTime = 0; audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`)); }); } else { audio.currentTime = 0; audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`)); } } else { console.warn(`Sound asset not found or loaded: ${key}`); } },
    playMusic() { const music = assets.backgroundMusic?.audio; if (music && music.paused) { if (!audioContext) { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } if (audioContext.state === 'suspended') { audioContext.resume().then(() => { music.play().catch(e => console.warn(`Background music play failed: ${e.message}`)); }); } else { music.play().catch(e => console.warn(`Background music play failed: ${e.message}`)); } } },
    stopMusic() { const music = assets.backgroundMusic?.audio; if (music) { music.pause(); music.currentTime = 0; } }
  };

  // ---- Canvas & UI Setup ----
  function setupCanvas() { canvas = document.getElementById('gameCanvas'); if (!canvas) { console.error("Canvas element not found!"); return; } ctx = canvas.getContext('2d'); setCanvasSize(); window.addEventListener('resize', setCanvasSize); }
  function setCanvasSize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; if (!gameActive && !gameStarted) { player.x = canvas.width / 2; player.y = canvas.height - 100; } }
  function setupUI() {
      scoreElement = document.getElementById('score');
      highScoreElement = document.getElementById('highScore');
      livesElement = document.getElementById('lives');
      comboElement = document.getElementById('combo');
      startScreen = document.getElementById('startScreen');
      startMessage = document.getElementById('startMessage');
      pauseScreen = document.getElementById('pauseScreen');
      if (!scoreElement || !highScoreElement || !livesElement || !comboElement || !startScreen || !startMessage || !pauseScreen) { console.error("One or more UI elements are missing from the HTML!"); }

      // *** UPDATED: Explicitly parse high score from localStorage ***
      highScore = parseInt(localStorage.getItem('highScore'), 10) || 0;
      // Ensure highScore is a valid number, default to 0 if not
      if (isNaN(highScore)) {
          highScore = 0;
      }

      updateScoreboard(); // Initial update
      startMessage.addEventListener('click', handleStartClick);
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('click', handleMouseClick);
      document.addEventListener('keydown', handleKeyDown);
    }
  function updateScoreboard() { if(scoreElement) scoreElement.textContent = score; if(highScoreElement) highScoreElement.textContent = highScore; if(livesElement) livesElement.textContent = lives; if(comboElement) comboElement.textContent = comboCount > 0 ? comboCount : 0; }

  // ---- Input Handlers ----
  function handleStartClick() { if (assetManager.assetsLoaded === assetManager.totalAssets) { if (!audioContext) { audioContext = new (window.AudioContext || window.webkitAudioContext)(); } if (audioContext.state === 'suspended') { audioContext.resume(); } startScreen.style.display = 'none'; startGame(); } else { console.warn("Assets not fully loaded yet."); startMessage.innerHTML = "<strong>Loading... Please Wait</strong>"; } }
  function handleMouseMove(e) { if (!gameActive || paused || showingLevelTransition) return; player.x = e.clientX; player.y = e.clientY; player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x)); player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y)); }
  function handleMouseClick() { if (!gameStarted || paused || showingLevelTransition) return; if (audioContext && audioContext.state === 'suspended') { audioContext.resume(); } assetManager.playMusic(); handleShooting(); }
  function handleTouchStart(e) { if (!gameStarted || paused || showingLevelTransition) return; e.preventDefault(); if (audioContext && audioContext.state === 'suspended') { audioContext.resume(); } assetManager.playMusic(); if (e.touches.length > 0) { const touch = e.touches[0]; player.x = touch.clientX; player.y = touch.clientY; player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x)); player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y)); } }
  function handleTouchMove(e) { if (!gameActive || paused || showingLevelTransition) return; e.preventDefault(); if (e.touches.length > 0) { const touch = e.touches[0]; player.x = touch.clientX; player.y = touch.clientY; player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x)); player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y)); } }
  function handleTouchEnd(e) { if (!gameStarted || paused || showingLevelTransition) return; handleShooting(); }
  function handleKeyDown(e) { if (e.key.toLowerCase() === 'p' && gameStarted && !showingLevelTransition) { togglePause(); } }
  function togglePause() { paused = !paused; pauseScreen.style.display = paused ? "flex" : "none"; if (paused) { assets.backgroundMusic?.audio?.pause(); if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); } else { assetManager.playMusic(); if (gameActive) scheduleEnemySpawn(100); } }

  // ---- Background Effects ----
  function initStarLayers() { starLayers.foreground = []; starLayers.background = []; for (let i = 0; i < config.starfield.foregroundStars; i++) { starLayers.foreground.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: getRandom(0.5, 1.5), speed: getRandom(config.starfield.fgSpeedMin, config.starfield.fgSpeedMax) }); } for (let i = 0; i < config.starfield.backgroundStars; i++) { starLayers.background.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: getRandom(1, 2.5), speed: getRandom(config.starfield.bgSpeedMin, config.starfield.bgSpeedMax) }); } }
  function updateStarLayers() { for (const layer in starLayers) { for (const star of starLayers[layer]) { star.y += star.speed; if (star.y > canvas.height + star.radius * 2) { star.y = -star.radius * 2; star.x = Math.random() * canvas.width; } } } }
  function drawStarLayers() { ctx.fillStyle = "#fff"; for (const star of starLayers.background) { ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill(); } for (const star of starLayers.foreground) { ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill(); } }
  function updateNebula() { if (!nebulaActive && Math.random() < config.nebula.spawnChance) { nebulaActive = true; nebulaOpacity = 0; nebulaTimer = config.nebula.duration; } if (nebulaActive) { if (nebulaTimer > 0) { nebulaOpacity = Math.min(nebulaOpacity + config.nebula.fadeInSpeed, config.nebula.maxOpacity); nebulaTimer--; } else { nebulaOpacity -= config.nebula.fadeOutSpeed; if (nebulaOpacity <= 0) { nebulaOpacity = 0; nebulaActive = false; } } } }
  function drawNebula() { if (nebulaOpacity > 0) { ctx.fillStyle = `rgba(100, 0, 128, ${nebulaOpacity})`; ctx.fillRect(0, 0, canvas.width, canvas.height); } }

  // ---- Player & Bullets ----
  function handleShooting() {
    if (frameCount < lastShotFrame + config.player.shootCooldown) return;
    lastShotFrame = frameCount;
    if (player.hasLaser) {
        assetManager.playSound('laserSound'); // Play sound once per trigger
        const offsetY = player.size / 2;
        fireLaserFromPosition(player.x, player.y - offsetY); // Center
        if (playerShipCount >= 2) { const wingmanX = player.x - config.player.shipFormationOffsetX; const wingmanY = player.y + config.player.shipFormationOffsetY; fireLaserFromPosition(wingmanX, wingmanY - offsetY); } // Left
        if (playerShipCount >= 3) { const wingmanX = player.x + config.player.shipFormationOffsetX; const wingmanY = player.y + config.player.shipFormationOffsetY; fireLaserFromPosition(wingmanX, wingmanY - offsetY); } // Right
    } else {
      shootBullet(); // Fires bullets from all ships
    }
  }
  function shootBullet() {
    assetManager.playSound('shootSound');
    const bulletCommon = { width: config.bullets.width, height: config.bullets.height, speed: config.bullets.speed, transformed: false, transformationTimer: 0, hasBounced: false };
    const offsetY = player.size / 2;
    bullets.push({ ...bulletCommon, x: player.x, y: player.y - offsetY }); // Center
    if (playerShipCount >= 2) { const wingmanX = player.x - config.player.shipFormationOffsetX; const wingmanY = player.y + config.player.shipFormationOffsetY; bullets.push({ ...bulletCommon, x: wingmanX, y: wingmanY - offsetY }); } // Left
    if (playerShipCount >= 3) { const wingmanX = player.x + config.player.shipFormationOffsetX; const wingmanY = player.y + config.player.shipFormationOffsetY; bullets.push({ ...bulletCommon, x: wingmanX, y: wingmanY - offsetY }); } // Right
  }
  function updateBullets() { for (let i = bullets.length - 1; i >= 0; i--) { const bullet = bullets[i]; bullet.y -= bullet.speed; if (bullet.transformed) { bullet.transformationTimer--; if (bullet.transformationTimer <= 0) { bullets.splice(i, 1); continue; } } if (bullet.y < -bullet.height || bullet.y > canvas.height + bullet.height || bullet.x < -bullet.width || bullet.x > canvas.width + bullet.width) { bullets.splice(i, 1); } } }
  function drawBullets() { bullets.forEach(b => { if (b.transformed) { ctx.fillStyle = config.bullets.transformedColor; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); } else { ctx.fillStyle = config.bullets.color; ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height); } }); }

  // ---- Laser Weapon ----
  function fireLaserFromPosition(startX, startY) {
    const endY = 0; const segments = []; const segmentCount = 10;
    for (let i = 0; i <= segmentCount; i++) { let t = i / segmentCount; segments.push({ x: startX + (Math.random() - 0.5) * 15, y: startY + (endY - startY) * t }); }
    activeLaserEffects.push({ pathPoints: segments, lifetime: 5, initialAlpha: 1.0, initialWidth: 5 });
    checkLaserCollisions(segments);
  }
  function fireDroneLaser() { assetManager.playSound('droneSound'); const startX = dronePos.x; const startY = dronePos.y; const endY = 0; const segments = []; const segmentCount = 8; for (let i = 0; i <= segmentCount; i++) { let t = i / segmentCount; segments.push({ x: startX + (Math.random() - 0.5) * 10, y: startY + (endY - startY) * t }); } activeLaserEffects.push({ pathPoints: segments, lifetime: 5, initialAlpha: 0.8, initialWidth: 4 }); checkLaserCollisions(segments); }
  function checkLaserCollisions(pathPoints) {
    pathPoints.forEach(point => {
      for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (enemy.exploded) continue;
          const dx =
