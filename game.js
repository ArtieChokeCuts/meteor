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
      shieldDuration: 300, // Frames (5 seconds)
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
    powerUpGetSound: { src: 'explosion.mp3', audio: null, volume: config.sfxVolume * 1.2 }, // Reuses explosion
    backgroundMusic: { src: 'background.mp3', audio: null, loop: true, volume: 0.4 },
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
          const dx = enemy.x - point.x; const dy = enemy.y - point.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < enemy.size / 2 + config.laser.widthBonus) { // Use widthBonus
              handleLaserEnemyCollision(enemy, i);
          }
      }
    });
    updateScoreboard();
  }
  function handleLaserEnemyCollision(enemy, enemyIndex) { const damage = 0.8; if (enemy.type === "large") { enemy.health -= damage / 2; score += config.largeMeteor.pointsPerHit * 0.5; triggerCombo(); if (enemy.health <= 0 && !enemy.exploded) { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y, config.largeMeteor.explosionParticles); score += 50; } else if (!enemy.exploded) { createExplosion(enemy.x + getRandom(-5, 5), enemy.y + getRandom(-5, 5), 1, 1, 10); } } else if (enemy.type === "ship") { enemy.health -= damage; score += config.enemies.points * 0.5; triggerCombo(); if (enemy.health <= 0 && !enemy.exploded) { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y); score += config.enemyShipPoints; if (enemy.spriteType === 2) enemyShipsDestroyedThisLevel.ship2++; else if (enemy.spriteType === 3) enemyShipsDestroyedThisLevel.ship3++; checkLevelCompletion(); } else if (!enemy.exploded) { createExplosion(enemy.x + getRandom(-5, 5), enemy.y + getRandom(-5, 5), 1, 1, 10); } } else if (enemy.type === "regular" && !enemy.exploded) { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y); score += config.enemies.points * comboCount; triggerCombo(); } }
  function drawLaserEffects() { for (let i = activeLaserEffects.length - 1; i >= 0; i--) { let effect = activeLaserEffects[i]; const currentAlpha = effect.initialAlpha * (effect.lifetime / 5); const currentWidth = effect.initialWidth * (effect.lifetime / 5); if (currentAlpha <= 0 || effect.lifetime <= 0) { activeLaserEffects.splice(i, 1); continue; } ctx.save(); ctx.beginPath(); ctx.moveTo(effect.pathPoints[0].x, effect.pathPoints[0].y); for (let j = 1; j < effect.pathPoints.length; j++) { ctx.lineTo(effect.pathPoints[j].x, effect.pathPoints[j].y); } ctx.strokeStyle = 'lime'; ctx.lineWidth = currentWidth; ctx.globalAlpha = currentAlpha; ctx.shadowColor = 'white'; ctx.shadowBlur = 10; ctx.stroke(); ctx.restore(); effect.lifetime--; } }

  // ---- Enemy Ship Projectiles ----
  function fireShipProjectile(enemy) { if (enemy.spriteType === 2) { assetManager.playSound('droneSound'); for (let j = -1; j <= 1; j++) { shipProjectiles.push({ x: enemy.x, y: enemy.y + enemy.size / 2, vx: j * 1.5, vy: config.shipProjectileSpeed, size: config.shipProjectileSize, type: "shipProjectile" }); } } else if (enemy.spriteType === 3) { assetManager.playSound('laserSound'); shipProjectiles.push({ x: enemy.x, y: enemy.y + enemy.size / 2, vx: 0, vy: config.shipProjectileSpeed * 1.5, size: config.shipProjectileSize * 1.2, type: "shipProjectile" }); } enemy.shootTimer = Math.floor(getRandom(config.enemyShipShootTimerMin, config.enemyShipShootTimerMax)); }
  function updateShipProjectiles() { for (let i = shipProjectiles.length - 1; i >= 0; i--) { let proj = shipProjectiles[i]; proj.x += proj.vx; proj.y += proj.vy; if (proj.y > canvas.height + proj.size || proj.y < -proj.size || proj.x < -proj.size || proj.x > canvas.width + proj.size) { shipProjectiles.splice(i, 1); continue; } const playerHitbox = { x: player.x, y: player.y, size: player.size * 0.8 }; if (checkCollision(proj, playerHitbox)) { handlePlayerHitByProjectile(i); if (!gameActive) return; } } }
  function handlePlayerHitByProjectile(projectileIndex) { shipProjectiles.splice(projectileIndex, 1); if (shieldTime > 0) { shieldTime -= 60; if (shieldTime < 0) shieldTime = 0; assetManager.playSound('explosionSound'); createExplosion(player.x, player.y, 10, 2, 30); } else if (playerShipCount > 1) { playerShipCount--; assetManager.playSound('explosionSound'); createExplosion(player.x, player.y, 25, 4); console.log("Lost a wingman! Ships left:", playerShipCount); resetCombo(); updateScoreboard(); } else { lives--; assetManager.playSound('explosionSound'); createExplosion(player.x, player.y, 40, 6); resetCombo(); updateScoreboard(); if (lives <= 0) { gameOver(); } } }
  function drawShipProjectiles() { ctx.fillStyle = "orange"; shipProjectiles.forEach(proj => { ctx.beginPath(); ctx.arc(proj.x, proj.y, proj.size / 2, 0, Math.PI * 2); ctx.fill(); }); }

  // ---- Particles ----
  function createExplosion(x, y, count = config.particles.count, pSpeed = config.particles.speed, pLife = config.particles.life) { for (let i = 0; i < count; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * pSpeed * getRandom(0.5, 1.5), vy: (Math.random() - 0.5) * pSpeed * getRandom(0.5, 1.5), radius: getRandom(config.particles.radiusMin, config.particles.radiusMax), life: pLife * getRandom(0.8, 1.2), color: getRandomColor() }); } }
  function createBulletParticles(x, y, count = 5) { for (let i = 0; i < count; i++) { particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, radius: 1.5, life: config.bullets.bounceLife, color: config.bullets.transformedColor }); } }
  function createAmbientParticle() { if (Math.random() > config.ambientParticles.spawnChance) return; const spawnX = player.x + getRandom(-player.size / 4, player.size / 4); const spawnY = player.y + player.size / 3; ambientParticles.push({ x: spawnX, y: spawnY, vx: (Math.random() - 0.5) * (config.ambientParticles.speed / 2), vy: Math.random() * config.ambientParticles.speed + 0.5, radius: getRandom(config.ambientParticles.radiusMin, config.ambientParticles.radiusMax), life: config.ambientParticles.life, color: `hsl(${getRandom(180, 240)}, 100%, 70%)` }); }
  function updateParticles(particleArray) { for (let i = particleArray.length - 1; i >= 0; i--) { let p = particleArray[i]; p.x += p.vx; p.y += p.vy; p.life--; if (p.life <= 0) particleArray.splice(i, 1); } }
  function drawParticles(particleArray, baseLife) { for (const p of particleArray) { ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life / baseLife); ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); } ctx.globalAlpha = 1.0; }

  // ---- Enemies (All Types) ----
  function scheduleEnemySpawn(delay) { if (!gameActive || showingLevelTransition) return; if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); const currentDelay = delay !== undefined ? delay : currentEnemySpawnRate; enemySpawnTimerId = setTimeout(() => { if (gameActive && !paused && !showingLevelTransition) { spawnEnemy(); const scoreFactorReduction = Math.floor(score / config.enemies.spawnRateScoreFactor); currentEnemySpawnRate = Math.max(config.enemies.minSpawnRate, config.enemies.spawnRateInitial - scoreFactorReduction * 10); scheduleEnemySpawn(); } }, currentDelay); }
  // THIS FUNCTION NOW LIMITS CONCURRENT SHIPS BASED ON LEVEL
  function spawnEnemy() { const roll = Math.random(); const isShipAttempt = roll < config.enemyShipChance; if (isShipAttempt) { const maxShipsAllowed = Math.min(level, 17); let currentActiveShips = 0; for (const enemy of enemies) { if (enemy.type === 'ship' && !enemy.exploded) { currentActiveShips++; } } if (currentActiveShips < maxShipsAllowed) { spawnEnemyShip(); } else { spawnRegularMeteor(); } } else { spawnRegularMeteor(); } }
  function spawnRegularMeteor() { const size = config.enemies.size; enemies.push({ x: Math.random() * (canvas.width - size) + size / 2, y: -size / 2, size: size, speed: config.enemies.speed * getRandom(0.9, 1.2), frame: 0, exploded: false, type: 'regular', health: 1, rotation: 0, rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.enemies.rotationSpeedMin, config.enemies.rotationSpeedMax), vx: 0, }); }
  function spawnLargeMeteor() { const size = config.enemies.size * config.largeMeteor.sizeMultiplier; enemies.push({ x: Math.random() * (canvas.width - size) + size / 2, y: -size / 2, size: size, speed: config.enemies.speed * 0.7, frame: 0, exploded: false, type: 'large', health: config.largeMeteor.health, rotation: 0, rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.enemies.rotationSpeedMin * 0.5, config.enemies.rotationSpeedMax * 0.5), vx: 0, }); nextLargeMeteorScore += config.largeMeteor.spawnScoreInterval; console.log("Large Meteor Spawned!"); }
  function spawnEnemyShip() { const size = config.player.size; const spriteType = Math.random() < 0.5 ? 2 : 3; enemies.push({ x: Math.random() * (canvas.width - size) + size / 2, y: -size / 2, size: size, speed: config.enemyShipSpeed, frame: 0, exploded: false, type: 'ship', health: config.enemyShipHealth, rotation: 0, rotationSpeed: 0, vx: (Math.random() < 0.5 ? 1 : -1) * config.enemyShipSpeed * 0.5, spriteType: spriteType, shootTimer: Math.floor(getRandom(config.enemyShipShootTimerMin, config.enemyShipShootTimerMax)), }); }
  function updateEnemies() { for (let i = enemies.length - 1; i >= 0; i--) { const enemy = enemies[i]; if (enemy.exploded) { enemy.frame++; if (enemy.frame >= sprites.asteroidExploding.length * 10) { enemies.splice(i, 1); } continue; } enemy.y += enemy.speed; enemy.rotation += enemy.rotationSpeed; if (enemy.type === "large" || enemy.type === "ship") { enemy.x += enemy.vx; const halfSize = enemy.size / 2; if (enemy.x - halfSize < 0 || enemy.x + halfSize > canvas.width) { enemy.vx *= -1; enemy.x = Math.max(halfSize, Math.min(canvas.width - halfSize, enemy.x)); } if (enemy.type === "large") { enemy.vx *= 0.99; } } if (enemy.type === "ship") { enemy.shootTimer--; if (enemy.shootTimer <= 0) { fireShipProjectile(enemy); } } if (enemy.y > canvas.height + enemy.size) { enemies.splice(i, 1); continue; } for (let j = bullets.length - 1; j >= 0; j--) { const bullet = bullets[j]; const bulletHitbox = { x: bullet.x, y: bullet.y, size: Math.max(bullet.width, bullet.height) * 1.5 }; if (checkCollision(bulletHitbox, enemy)) { handleBulletEnemyCollision(bullet, enemy, i, j); if (enemy.exploded) break; } } if (!enemy.exploded && checkCollision(player, enemy)) { handlePlayerEnemyCollision(enemy, i); } } updateShipProjectiles(); }
  function handleBulletEnemyCollision(bullet, enemy, enemyIndex, bulletIndex) { if (enemy.type === "large") { if (!bullet.hasBounced) { bullet.hasBounced = true; bullet.speed = -bullet.speed * 0.6; bullet.transformed = true; bullet.transformationTimer = config.bullets.bounceLife; createBulletParticles(bullet.x, bullet.y); const impactDir = (bullet.x < enemy.x) ? 1 : -1; enemy.vx += impactDir * config.largeMeteor.bounceForce * getRandom(0.8, 1.2); enemy.health--; score += config.largeMeteor.pointsPerHit; triggerCombo(); if (enemy.health <= 0) { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y, config.largeMeteor.explosionParticles); score += 50; } } else { bullets.splice(bulletIndex, 1); } } else if (enemy.type === "ship") { enemy.health--; bullets.splice(bulletIndex, 1); score += config.enemies.points; triggerCombo(); if (enemy.health <= 0) { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y); score += config.enemyShipPoints; if (enemy.spriteType === 2) enemyShipsDestroyedThisLevel.ship2++; else if (enemy.spriteType === 3) enemyShipsDestroyedThisLevel.ship3++; checkLevelCompletion(); } else { createExplosion(enemy.x, enemy.y, 3, 1, 15); } } else { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y); bullets.splice(bulletIndex, 1); score += config.enemies.points * comboCount; triggerCombo(); } updateScoreboard(); checkHighScore(); }
  function handlePlayerEnemyCollision(enemy, enemyIndex) { if (shieldTime > 0) { assetManager.playSound('explosionSound'); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y, config.particles.count / 2, config.particles.speed * 0.5, config.particles.life / 2); score += Math.floor(config.enemies.points / 2) + (enemy.type === 'ship' ? config.enemyShipPoints / 2 : 0); updateScoreboard(); checkHighScore(); } else if (playerShipCount > 1) { playerShipCount--; assetManager.playSound('explosionSound'); createExplosion(player.x, player.y, 25, 4); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y); console.log("Lost a wingman! Ships left:", playerShipCount); resetCombo(); updateScoreboard(); } else { lives--; assetManager.playSound('explosionSound'); createExplosion(player.x, player.y, 40, 6); enemy.exploded = true; enemy.frame = 0; createExplosion(enemy.x, enemy.y); resetCombo(); updateScoreboard(); if (lives <= 0) { gameOver(); } } }
  function drawEnemies() {
    const sheet1 = assetManager.getSpriteSheet();
    const sheet2 = assetManager.getShipsDroneSheet();
    if (!sheet1 || !sheet2) { console.warn("Spritesheets not loaded, cannot draw enemies."); return; }
    enemies.forEach(enemy => {
      ctx.save(); ctx.translate(enemy.x, enemy.y);
      let currentSheet = sheet1; let spriteData;
      if (enemy.type === 'regular' || enemy.type === 'large') { ctx.rotate(enemy.rotation); if (enemy.exploded) { const frameIndex = Math.min(Math.floor(enemy.frame / 10), sprites.asteroidExploding.length - 1); spriteData = sprites.asteroidExploding[frameIndex]; } else { spriteData = sprites.asteroidIntact; } }
      else if (enemy.type === 'ship') { currentSheet = sheet2; if (enemy.exploded) { currentSheet = sheet1; const frameIndex = Math.min(Math.floor(enemy.frame / 10), sprites.asteroidExploding.length - 1); spriteData = sprites.asteroidExploding[frameIndex]; } else { spriteData = (enemy.spriteType === 2) ? shipsDroneSprites.spaceship2 : shipsDroneSprites.spaceship3; } }
      if (spriteData) { ctx.drawImage( currentSheet, spriteData.x, spriteData.y, spriteData.width, spriteData.height, -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size ); }
      ctx.restore(); // Restore before drawing health bar
      if (enemy.type === 'large' && !enemy.exploded && enemy.health < config.largeMeteor.health) { const barWidth = enemy.size * 0.8; const barHeight = 5; const barX = enemy.x - barWidth / 2; const barY = enemy.y + enemy.size / 2 + 5; const healthPercent = Math.max(0, enemy.health / config.largeMeteor.health); ctx.fillStyle = '#555'; ctx.fillRect(barX, barY, barWidth, barHeight); ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.2 ? '#ff0' : '#f00'); ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barWidth, barHeight); }
      else if (enemy.type === 'ship' && !enemy.exploded && enemy.health < config.enemyShipHealth) { const barWidth = enemy.size * 0.7; const barHeight = 4; const barX = enemy.x - barWidth / 2; const barY = enemy.y + enemy.size / 2 + 4; const healthPercent = Math.max(0, enemy.health / config.enemyShipHealth); ctx.fillStyle = '#555'; ctx.fillRect(barX, barY, barWidth, barHeight); ctx.fillStyle = healthPercent > 0.66 ? '#0f0' : (healthPercent > 0.33 ? '#ff0' : '#f00'); ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barWidth, barHeight); }
    });
  }

  // ---- Power-Ups & Multi-Ship ----
  function spawnPowerUpMaybe() { if (!gameActive || paused || showingLevelTransition) return; const roll = Math.random(); let type = null; let spawnChanceTotal = 0; spawnChanceTotal += config.powerUps.droneSpawnChance; if (roll < spawnChanceTotal) { type = 'drone'; } else { spawnChanceTotal += config.powerUps.laserSpawnChance; if (roll < spawnChanceTotal) { type = 'laser'; } else { spawnChanceTotal += config.powerUps.shieldSpawnChance; if (roll < spawnChanceTotal) { type = 'shield'; } } } if (type) { powerUps.push({ type: type, x: Math.random() * canvas.width, y: -config.powerUps.powerUpSize, size: config.powerUps.powerUpSize, speed: config.powerUps.powerUpSpeed }); console.log(`Spawned PowerUp: ${type}`); } }
  function spawnExtraShipPowerUp() { if (playerShipCount >= 3) return; console.log("Spawning Extra Ship Powerup!"); extraShipPowerUps.push({ x: Math.random() * (canvas.width - config.powerUps.extraShipPowerUpSize) + config.powerUps.extraShipPowerUpSize / 2, y: -config.powerUps.extraShipPowerUpSize, size: config.powerUps.extraShipPowerUpSize, speed: config.powerUps.extraShipPowerUpSpeed, rotation: 0, rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.powerUps.extraShipPowerUpRotationSpeedMin, config.powerUps.extraShipPowerUpRotationSpeedMax), type: 'extraShip' }); nextExtraShipScore += config.powerUps.extraShipScoreInterval; }
  function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) { const pu = powerUps[i]; pu.y += pu.speed; if (checkCollision(player, pu)) { switch (pu.type) { case 'shield': shieldTime = config.powerUps.shieldDuration; break; case 'laser': player.hasLaser = true; player.laserTimer = config.player.laserDuration; break; case 'drone': if (!droneActive) { droneActive = true; droneTimer = config.powerUps.droneDuration; droneShootTimer = 0; droneOrbitAngle = Math.random() * Math.PI * 2; } else { droneTimer = config.powerUps.droneDuration; } break; } console.log(`${pu.type} acquired!`); powerUps.splice(i, 1); } else if (pu.y > canvas.height + pu.size) { powerUps.splice(i, 1); } }
    for (let i = extraShipPowerUps.length - 1; i >= 0; i--) { const espu = extraShipPowerUps[i]; espu.y += espu.speed; espu.rotation += espu.rotationSpeed; if (checkCollision(player, espu)) { if (playerShipCount < 3) { playerShipCount++; assetManager.playSound('powerUpGetSound'); console.log("Extra ship acquired! Total ships:", playerShipCount); } else { score += 500; console.log("Already at max ships, score bonus!"); } extraShipPowerUps.splice(i, 1); updateScoreboard(); } else if (espu.y > canvas.height + espu.size) { extraShipPowerUps.splice(i, 1); } }
    updateDrone(); spawnPowerUpMaybe();
    if (gameActive && !paused && !showingLevelTransition && playerShipCount < 3 && score >= nextExtraShipScore) { spawnExtraShipPowerUp(); }
    if (gameActive && !paused && !showingLevelTransition && score >= nextLargeMeteorScore) { spawnLargeMeteor(); }
  }
  function drawPowerUps() {
    powerUps.forEach(pu => { let color, text; switch (pu.type) { case 'shield': color = "rgba(0, 150, 255, 0.9)"; text = "S"; break; case 'laser': color = "rgba(0, 255, 0, 0.9)"; text = "L"; break; case 'drone': color = "rgba(255, 255, 0, 0.9)"; text = "D"; break; default: color = "grey"; text = "?"; break; } ctx.fillStyle = color; ctx.beginPath(); ctx.arc(pu.x, pu.y, pu.size / 2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = "#000"; ctx.font = `bold ${pu.size * 0.6}px Orbitron`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, pu.x, pu.y); });
    const shipSprite = sprites.spaceship; const sheet = assetManager.getSpriteSheet(); if (!sheet || !shipSprite) { console.warn("Spritesheet or ship sprite not ready, cannot draw extra ship powerups."); return; }
    extraShipPowerUps.forEach(espu => { ctx.save(); ctx.translate(espu.x, espu.y); ctx.rotate(espu.rotation); ctx.drawImage( sheet, shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height, -espu.size / 2, -espu.size / 2, espu.size, espu.size ); ctx.fillStyle = "rgba(255, 255, 100, 0.25)"; ctx.beginPath(); ctx.arc(0, 0, espu.size * 0.65, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
  }

  // ---- Drone Behavior ----
  function updateDrone() { if (!droneActive) return; droneOrbitAngle += 0.05; dronePos.x = player.x + Math.cos(droneOrbitAngle) * droneOrbitRadius; dronePos.y = player.y + Math.sin(droneOrbitAngle) * droneOrbitRadius; droneShootTimer--; if (droneShootTimer <= 0) { fireDroneLaser(); droneShootTimer = config.powerUps.droneShootCooldown; } droneTimer--; if (droneTimer <= 0) { droneActive = false; console.log("Drone deactivated."); } }
  function drawDrone() { if (!droneActive) return; const droneSprite = shipsDroneSprites.drone; const sheet = assetManager.getShipsDroneSheet(); if (!sheet || !droneSprite) return; ctx.save(); ctx.translate(dronePos.x, dronePos.y); ctx.rotate(droneOrbitAngle + Math.PI / 2); ctx.drawImage(sheet, droneSprite.x, droneSprite.y, droneSprite.width, droneSprite.height, -droneSize / 2, -droneSize / 2, droneSize, droneSize); ctx.restore(); }

  // ---- Player Drawing & Effects ----
  function drawPlayer() { const shipSprite = sprites.spaceship; const sheet = assetManager.getSpriteSheet(); if (!shipSprite || !sheet) return; const drawShip = (x, y) => { ctx.drawImage(sheet, shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height, x - player.size / 2, y - player.size / 2, player.size, player.size); }; drawShip(player.x, player.y); const offsetX = config.player.shipFormationOffsetX; const offsetY = config.player.shipFormationOffsetY; if (playerShipCount >= 2) { drawShip(player.x - offsetX, player.y + offsetY); } if (playerShipCount >= 3) { drawShip(player.x + offsetX, player.y + offsetY); } }
  function drawShield() {
    if (shieldTime <= 0) return;
    shieldHue = (shieldHue + 5) % 360; shieldRotation += 0.05;
    const shieldLineWidth = 4; const shieldColor = `hsl(${shieldHue}, 100%, 60%)`;
    const radius = player.size * 0.7; const gapAngle = Math.PI / 6;
    const startAngle = shieldRotation + gapAngle; const endAngle = shieldRotation + Math.PI * 2;
    const drawArc = (centerX, centerY) => { ctx.beginPath(); ctx.arc(centerX, centerY, radius, startAngle, endAngle); ctx.stroke(); };
    ctx.strokeStyle = shieldColor; ctx.lineWidth = shieldLineWidth; ctx.shadowColor = shieldColor; ctx.shadowBlur = 10;
    drawArc(player.x, player.y); // Center
    const offsetX = config.player.shipFormationOffsetX; const offsetY = config.player.shipFormationOffsetY;
    if (playerShipCount >= 2) { drawArc(player.x - offsetX, player.y + offsetY); } // Left
    if (playerShipCount >= 3) { drawArc(player.x + offsetX, player.y + offsetY); } // Right
    ctx.shadowBlur = 0;
    const barMaxWidth = 150, barHeight = 15; const barX = 20, barY = canvas.height - barHeight - 15; const shieldPercent = shieldTime / config.powerUps.shieldDuration; const currentBarWidth = barMaxWidth * shieldPercent; ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; ctx.fillRect(barX, barY, barMaxWidth, barHeight); ctx.fillStyle = shieldColor; ctx.fillRect(barX, barY, currentBarWidth, barHeight); ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"; ctx.lineWidth = 1; ctx.strokeRect(barX, barY, barMaxWidth, barHeight); ctx.fillStyle = "#fff"; ctx.font = "14px Orbitron"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(Math.ceil(shieldTime / 60) + "s", barX + barMaxWidth + 10, barY + barHeight / 2);
  }

  // ---- Scoring, Combo, High Score ----
  function triggerCombo() { if (comboCount === 0) comboCount = 1; comboCount++; comboTimer = config.combo.resetFrames; updateScoreboard(); }
  function resetCombo() { if (comboCount > 0) { comboCount = 0; comboTimer = 0; updateScoreboard(); } }
  function updateCombo() { if (comboCount > 0) { comboTimer--; if (comboTimer <= 0) { resetCombo(); } } }
  function checkHighScore() { if (score > highScore) { highScore = score; localStorage.setItem('highScore', highScore); updateScoreboard(); } }

  // ---- Level & Advancement ----
   function checkLevelCompletion() { const req = config.levelRequirements[level]; if (!req && level <= 17) { return; } if (!req) return; if (enemyShipsDestroyedThisLevel.ship2 >= req.ship2 && enemyShipsDestroyedThisLevel.ship3 >= req.ship3) { if (!showingLevelTransition) { triggerLevelTransition(); } } }
   function triggerLevelTransition() { console.log(`Level ${level} complete! Starting transition...`); showingLevelTransition = true; levelTransitionTimer = config.levelTransitionDuration; if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); clearEnemiesOfType('ship'); score += level * 100; updateScoreboard(); checkHighScore(); }
   function finishLevelTransition() { showingLevelTransition = false; level++; enemyShipsDestroyedThisLevel.ship2 = 0; enemyShipsDestroyedThisLevel.ship3 = 0; currentEnemySpawnRate = Math.max(config.enemies.minSpawnRate, currentEnemySpawnRate - 50); scheduleEnemySpawn(500); console.log(`Starting Level ${level}`); }
   function clearEnemiesOfType(typeToClear) { for (let i = enemies.length - 1; i >= 0; i--) { if (enemies[i].type === typeToClear && !enemies[i].exploded) { createExplosion(enemies[i].x, enemies[i].y, 10, 2, 30); enemies.splice(i, 1); } } }
   function drawLevelTransitionScreen() { ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#00ff00"; ctx.font = "bold 60px Orbitron"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = "#00ff00"; ctx.shadowBlur = 15; ctx.fillText(`Level ${level + 1}`, canvas.width / 2, canvas.height / 2); ctx.shadowBlur = 0; ctx.fillStyle = "#ffffff"; ctx.font = "24px Orbitron"; ctx.fillText("Get Ready!", canvas.width / 2, canvas.height / 2 + 60); }

  // ---- Main Game Loop ----
  function updateGame() { if (showingLevelTransition) { levelTransitionTimer--; if (levelTransitionTimer <= 0) { finishLevelTransition(); } updateStarLayers(); updateNebula(); updateParticles(particles); updateParticles(ambientParticles); return; } if (!gameActive || paused) return; frameCount++; updateStarLayers(); updateNebula(); createAmbientParticle(); if (shieldTime > 0) shieldTime--; if (player.hasLaser) { player.laserTimer--; if (player.laserTimer <= 0) player.hasLaser = false; } updateCombo(); updateBullets(); updateEnemies(); updatePowerUps(); updateParticles(particles); updateParticles(ambientParticles); }
  function drawGame() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); drawStarLayers(); drawNebula(); drawPowerUps(); drawEnemies(); drawShipProjectiles(); drawBullets(); drawPlayer(); drawDrone(); drawParticles(particles, config.particles.life); drawParticles(ambientParticles, config.ambientParticles.life); drawShield(); drawLaserEffects(); ctx.fillStyle = "#fff"; ctx.font = "16px Orbitron"; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(`Level: ${level}`, canvas.width - 20, canvas.height - 20); if (showingLevelTransition) { drawLevelTransitionScreen(); } }
  function gameLoop() { if (!gameStarted) return; updateGame(); drawGame(); requestAnimationFrame(gameLoop); }

  // ---- Game State Management ----
  function startGame() { console.log("Starting game..."); score = 0; lives = config.initialLives; shieldTime = 0; comboCount = 0; comboTimer = 0; level = 1; enemyShipsDestroyedThisLevel = { ship2: 0, ship3: 0 }; nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval; currentEnemySpawnRate = config.enemies.spawnRateInitial; frameCount = 0; lastShotFrame = -config.player.shootCooldown; playerShipCount = 1; nextExtraShipScore = config.powerUps.extraShipScoreInterval; extraShipPowerUps.length = 0; enemies.length = 0; bullets.length = 0; particles.length = 0; ambientParticles.length = 0; powerUps.length = 0; shipProjectiles.length = 0; activeLaserEffects.length = 0; player.x = canvas.width / 2; player.y = canvas.height - 100; player.hasLaser = false; player.laserTimer = 0; droneActive = false; droneTimer = 0; updateScoreboard(); gameActive = true; paused = false; showingLevelTransition = false; levelTransitionTimer = 0; pauseScreen.style.display = "none"; initStarLayers(); assetManager.playMusic(); scheduleEnemySpawn(); if (!gameStarted) { gameStarted = true; requestAnimationFrame(gameLoop); } }
  function gameOver() { console.log("Game Over!"); gameActive = false; gameStarted = false; showingLevelTransition = false; assetManager.stopMusic(); if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); ctx.fillStyle = "rgba(0, 0, 0, 0.7)"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "red"; ctx.font = "bold 48px Orbitron"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30); ctx.font = "24px Orbitron"; ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30); ctx.fillText(`Level Reached: ${level}`, canvas.width/2, canvas.height/2 + 70); setTimeout(() => { startScreen.style.display = "flex"; startMessage.innerHTML = "<strong>Click anywhere to RESTART</strong>"; startScreen.classList.add('ready'); }, 3000); }

  // ---- Initialization ----
  function init() { console.log("Initializing game..."); setupCanvas(); if (!ctx) return; setupUI(); assetManager.loadAssets(() => { startMessage.innerHTML = "<strong>Click anywhere to START</strong>"; startScreen.classList.add('ready'); drawInitialFrame(); }); }
  function drawInitialFrame() { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); if (!starLayers.foreground.length) initStarLayers(); drawStarLayers(); const shipSprite = sprites.spaceship; const sheet = assetManager.getSpriteSheet(); if (sheet && shipSprite) { ctx.globalAlpha = 0.5; ctx.drawImage(sheet, shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height, player.x - player.size / 2, player.y - player.size / 2, player.size, player.size); ctx.globalAlpha = 1.0; } }

  window.addEventListener('DOMContentLoaded', init);

})();
