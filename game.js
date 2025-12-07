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
  // *** FIXED: Added 'assets/' path prefix to all file sources ***
  const assets = {
    spritesheet: { src: 'assets/final_corrected_game_sprite_sheet.png', image: null },
    shipsDrone: { src: 'assets/ships_drone.png', image: null },
    shootSound: { src: 'assets/shoot.mp3', audio: null, volume: config.sfxVolume },
    explosionSound: { src: 'assets/explosion.mp3', audio: null, volume: config.sfxVolume },
    laserSound: { src: 'assets/laser.mp3', audio: null, volume: config.sfxVolume },
    droneSound: { src: 'assets/drone.mp3', audio: null, volume: config.sfxVolume },
    powerUpGetSound: { src: 'assets/explosion.mp3', audio: null, volume: config.sfxVolume * 0.8 }, // Reuses explosion
    backgroundMusic: { src: 'assets/background.mp3', audio: null, loop: true, volume: 0.9 },
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
  let audioContext = null; // Initialize as null

  // ---- Utility Functions ----
  function getRandom(min, max) { return Math.random() * (max - min) + min; }
  function getRandomColor() { const letters = '0123456789ABCDEF'; let color = '#'; for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; } return color; }
  function checkCollision(obj1, obj2) { const dx = obj1.x - obj2.x; const dy = obj1.y - obj2.y; const distance = Math.sqrt(dx * dx + dy * dy); const radiiSum = obj1.size / 2 + obj2.size / 2; return distance < radiiSum; }
  function addScore(points) { score += points * (comboCount > 0 ? comboCount : 1); comboCount++; comboTimer = config.combo.resetFrames; if (score > highScore) { highScore = score; localStorage.setItem('highScore', highScore.toString()); } updateScoreboard(); if (score >= nextLargeMeteorScore) { nextLargeMeteorScore += config.largeMeteor.spawnScoreInterval; spawnLargeMeteor(); } if (score >= nextExtraShipScore && playerShipCount < 3) { nextExtraShipScore += config.powerUps.extraShipScoreInterval; spawnExtraShipPowerUp(); } }

  // ---- Asset Manager ----
  const assetManager = {
    assetsLoaded: 0,
    totalAssets: Object.keys(assets).length,
    loadAssets(callback) { console.log("Loading assets..."); startMessage.innerHTML = `<strong>Loading Assets... 0/${this.totalAssets}</strong>`; for (const key in assets) { const asset = assets[key]; if (asset.src.endsWith('.png')) { asset.image = new Image(); asset.image.onload = () => this.assetLoaded(key, callback); asset.image.onerror = () => this.assetError(key, callback); asset.image.src = asset.src; } else if (asset.src.endsWith('.mp3')) { asset.audio = new Audio(); asset.audio.addEventListener('canplaythrough', () => this.assetLoaded(key, callback), { once: true }); asset.audio.onerror = () => this.assetError(key, callback); asset.audio.src = asset.src; if (asset.volume !== undefined) { asset.audio.volume = asset.volume; } if (asset.loop) asset.audio.loop = true; asset.audio.load(); } } },
    assetLoaded(key, callback) { this.assetsLoaded++; console.log(`Loaded: ${key} (${this.assetsLoaded}/${this.totalAssets})`); startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets}</strong>`; if (this.assetsLoaded === this.totalAssets) { console.log("All assets loaded."); callback(); } },
    assetError(key, callback) { console.error(`Failed to load asset: ${key}`); this.assetsLoaded++; startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets} (Error loading ${key})</strong>`; if (this.assetsLoaded === this.totalAssets) { console.warn("Finished loading assets, but some failed."); callback(); } },
    getSpriteSheet() { return assets.spritesheet.image; },
    getShipsDroneSheet() { return assets.shipsDrone.image; },
    // *** FIX: Improved sound playback handling ***
    playSound(key) { 
        const audio = assets[key]?.audio; 
        if (audio) { 
            // Check if AudioContext needs to be initialized/resumed on user action
            if (audioContext && audioContext.state === 'suspended') {
                 audioContext.resume().then(() => {
                    audio.currentTime = 0; 
                    audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`)); 
                });
            } else {
                audio.currentTime = 0; 
                audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`)); 
            }
        } else { console.warn(`Sound asset not found or loaded: ${key}`); } 
    },
    playMusic() { 
        const music = assets.backgroundMusic?.audio; 
        if (music && music.paused) { 
            // Ensure AudioContext is initialized on first user interaction
            if (!audioContext) { 
                audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
            }
            if (audioContext.state === 'suspended') { 
                audioContext.resume().then(() => { 
                    music.play().catch(e => console.warn(`Background music play failed: ${e.message}`)); 
                }); 
            } else { 
                music.play().catch(e => console.warn(`Background music play failed: ${e.message}`)); 
            } 
        } 
    },
    stopMusic() { const music = assets.backgroundMusic?.audio; if (music) { music.pause(); music.currentTime = 0; } }
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
  let audioContext = null; // Initialize as null

  // ---- Utility Functions ----
  function getRandom(min, max) { return Math.random() * (max - min) + min; }
  function getRandomColor() { const letters = '0123456789ABCDEF'; let color = '#'; for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; } return color; }
  function checkCollision(obj1, obj2) { const dx = obj1.x - obj2.x; const dy = obj1.y - obj2.y; const distance = Math.sqrt(dx * dx + dy * dy); const radiiSum = obj1.size / 2 + obj2.size / 2; return distance < radiiSum; }
  function addScore(points) { score += points * (comboCount > 0 ? comboCount : 1); comboCount++; comboTimer = config.combo.resetFrames; if (score > highScore) { highScore = score; localStorage.setItem('highScore', highScore.toString()); } updateScoreboard(); if (score >= nextLargeMeteorScore) { nextLargeMeteorScore += config.largeMeteor.spawnScoreInterval; spawnLargeMeteor(); } if (score >= nextExtraShipScore && playerShipCount < 3) { nextExtraShipScore += config.powerUps.extraShipScoreInterval; spawnExtraShipPowerUp(); } }

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
  
  // Placeholder functions for game flow (must be defined later)
  function startGame() { gameStarted = true; gameActive = true; resetGame(); assetManager.playMusic(); initStarLayers(); scheduleEnemySpawn(); requestAnimationFrame(gameLoop); }
  function resetGame() { score = 0; lives = config.initialLives; level = 1; comboCount = 0; enemyShipsDestroyedThisLevel = { ship2: 0, ship3: 0 }; bullets.length = 0; enemies.length = 0; particles.length = 0; powerUps.length = 0; shipProjectiles.length = 0; activeLaserEffects.length = 0; extraShipPowerUps.length = 0; playerShipCount = 1; nextExtraShipScore = config.powerUps.extraShipScoreInterval; nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval; player.hasLaser = false; player.laserTimer = 0; shieldTime = 0; droneActive = false; droneTimer = 0; updateScoreboard(); setCanvasSize(); }
  function scheduleEnemySpawn(delay = currentEnemySpawnRate) { if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); enemySpawnTimerId = setTimeout(() => { spawnEnemy(); currentEnemySpawnRate = Math.max(config.enemies.minSpawnRate, config.enemies.spawnRateInitial - (score / config.enemies.spawnRateScoreFactor)); scheduleEnemySpawn(); }, delay); }
  function spawnEnemy() {
      // Placeholder: Implement actual enemy spawning logic (asteroid, large meteor, enemy ships)
  }
  function spawnLargeMeteor() {
      // Placeholder: Implement large meteor spawn
  }
  function spawnExtraShipPowerUp() {
      // Placeholder: Implement extra ship power up spawn
  }
  function destroyEnemy(enemy, index) {
      // Placeholder: Implement enemy destruction, particles, score, and combo update
      assetManager.playSound('explosionSound');
      enemies.splice(index, 1); // Remove enemy
      addScore(enemy.points || config.enemies.points); // Update score
  }


  // ---- Input Handlers ----
  // *** FIX: Ensure AudioContext is initialized/resumed on the first click ***
  function handleStartClick() { 
    if (assetManager.assetsLoaded === assetManager.totalAssets) { 
        if (!audioContext) { 
            audioContext = new (window.AudioContext || window.webkitAudioContext)(); 
        }
        if (audioContext.state === 'suspended') { 
            audioContext.resume().then(() => {
                 startScreen.style.display = 'none'; 
                 startGame(); 
            });
        } else {
            startScreen.style.display = 'none'; 
            startGame(); 
        }
    } else { 
        console.warn("Assets not fully loaded yet."); 
        startMessage.innerHTML = "<strong>Loading... Please Wait</strong>"; 
    } 
  }
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
  
  // *** UPGRADED: Bullet Drawing with Glow ***
  function drawBullets() {
      bullets.forEach(b => {
          ctx.save();
          ctx.translate(b.x, b.y);

          if (b.transformed) {
              ctx.fillStyle = config.bullets.transformedColor;
              ctx.shadowColor = 'rgba(255, 165, 0, 1)'; // Orange glow
              ctx.shadowBlur = 15;
              ctx.beginPath();
              ctx.arc(0, 0, 3, 0, Math.PI * 2);
              ctx.fill();
          } else {
              ctx.fillStyle = config.bullets.color;
              ctx.shadowColor = 'rgba(255, 0, 0, 1)'; // Red glow
              ctx.shadowBlur = 10;
              ctx.fillRect(-b.width / 2, -b.height / 2, b.width, b.height);
          }

          ctx.restore();
      });
      // Reset shadow after loop
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
  }

  // *** NEW: Player Ship Drawing with Glow and Wingmen ***
  function drawPlayerShip(x, y, size, angle = 0, opacity = 1.0) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = opacity;
      const sprite = sprites.spaceship;

      // 🌟 Neon Glow Effect 🌟
      ctx.shadowColor = 'rgba(0, 150, 255, 1)';
      ctx.shadowBlur = 10;

      // Draw the ship sprite
      ctx.drawImage(
          assetManager.getSpriteSheet(),
          sprite.x, sprite.y, sprite.width, sprite.height,
          -size / 2, -size / 2, size, size
      );

      // Reset shadow for subsequent drawings
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      ctx.globalAlpha = 1.0;
      ctx.restore();
  }

  function drawPlayer() {
      // 1. Draw the main player ship
      drawPlayerShip(player.x, player.y, player.size);

      // 2. Draw wingmen (Ship 2 & 3)
      if (playerShipCount >= 2) {
          const wingmanX = player.x - config.player.shipFormationOffsetX;
          const wingmanY = player.y + config.player.shipFormationOffsetY;
          drawPlayerShip(wingmanX, wingmanY, player.size * 0.8);
      }
      if (playerShipCount >= 3) {
          const wingmanX = player.x + config.player.shipFormationOffsetX;
          const wingmanY = player.y + config.player.shipFormationOffsetY;
          drawPlayerShip(wingmanX, wingmanY, player.size * 0.8);
      }
      
      // 3. Draw Shield/Drone effects (placeholders needed)
      // if (shieldTime > 0) { drawShieldEffect(player.x, player.y, player.size); }
      // if (droneActive) { drawDrone(); } 
  }

  // ---- Laser Weapon ----
  function fireLaserFromPosition(startX, startY) {
    const endY = 0; const segments = []; const segmentCount = 10;
    for (let i = 0; i <= segmentCount; i++) { let t = i / segmentCount; segments.push({ x: startX + (Math.random() - 0.5) * 15, y: startY + (endY - startY) * t }); }
    activeLaserEffects.push({ pathPoints: segments, lifetime: 5, initialAlpha: 1.0, initialWidth: 5 });
    checkLaserCollisions(segments);
  }
  function fireDroneLaser() { assetManager.playSound('droneSound'); const startX = dronePos.x; const startY = dronePos.y; const endY = 0; const segments = []; const segmentCount = 8; for (let i = 0; i <= segmentCount; i++) { let t = i / segmentCount; segments.push({ x: startX + (Math.random() - 0.5) * 10, y: startY + (endY - startY) * t }); } activeLaserEffects.push({ pathPoints: segments, lifetime: 5, initialAlpha: 0.8, initialWidth: 4 }); checkLaserCollisions(segments); }
  
  // *** UPGRADED: Advanced Laser Drawing ***
  function drawLaserEffects() {
      for (let i = activeLaserEffects.length - 1; i >= 0; i--) {
          const laser = activeLaserEffects[i];
          
          // 🌟 Energy Trail & Glow 🌟
          const alpha = laser.initialAlpha * (laser.lifetime / 5);
          const width = laser.initialWidth * (laser.lifetime / 5);
          
          ctx.globalAlpha = alpha;
          ctx.lineCap = 'round';
          ctx.lineWidth = width;
          
          // **Inner Core (White/Cyan)**
          ctx.strokeStyle = `rgba(180, 255, 255, ${alpha})`;
          ctx.shadowColor = `rgba(0, 255, 255, ${alpha})`;
          ctx.shadowBlur = 10;
          
          ctx.beginPath();
          laser.pathPoints.forEach((p, index) => {
              if (index === 0) ctx.moveTo(p.x, p.y);
              else ctx.lineTo(p.x, p.y);
          });
          ctx.stroke();

          // **Outer Plasma (Blue/Purple)**
          ctx.lineWidth = width * 2.5; // Wider for the blur
          ctx.strokeStyle = `rgba(100, 100, 255, ${alpha * 0.5})`;
          ctx.shadowBlur = 0; // Don't re-blur the outer edge
          ctx.stroke();

          laser.lifetime--;
          if (laser.lifetime <= 0) {
              activeLaserEffects.splice(i, 1);
          }
      }
      
      // Final cleanup
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
  }

  // *** COMPLETED: Laser Collision Logic (to hit health-based enemies) ***
  function checkLaserCollisions(pathPoints) {
    pathPoints.forEach(point => {
      for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];
          if (enemy.exploded) continue;
          const dx = point.x - enemy.x;
          const dy = point.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          // Collision radius check (enemy size / 2) + laser bonus width
          const collisionRadius = enemy.size / 2 + config.laser.widthBonus;

          if (distance < collisionRadius) {
              // Laser hit!
              if (enemy.isShip) {
                  // Ships have health, so decrement and check
                  enemy.health--;
                  if (enemy.health <= 0) {
                      destroyEnemy(enemy, i);
                  }
                  // Ship took damage, move to the next enemy to prevent multi-hit on one ship per laser segment check
                  return;
              } else if (enemy.isLargeMeteor) {
                  // Large meteor has specific hit logic (health, score per hit)
                  if (!enemy.isHitByLaserThisFrame) { // Prevent multiple laser segments hitting the same meteor in one frame
                      enemy.health--;
                      enemy.isHitByLaserThisFrame = true; // Flag to prevent further hits this frame
                      addScore(config.largeMeteor.pointsPerHit);
                      if (enemy.health <= 0) {
                          destroyEnemy(enemy, i);
                      }
                  }
              } else {
                  // Standard asteroid/small enemy: instant destruction
                  destroyEnemy(enemy, i);
              }
              // Once a point hits an enemy, we can stop checking against this specific enemy
              break;
          }
      }
    });

    // Post-collision cleanup (especially for large meteors)
    enemies.forEach(enemy => {
        if (enemy.isLargeMeteor) {
            enemy.isHitByLaserThisFrame = false; // Reset hit flag for the next frame
        }
    });
  }

  // ---- Enemy Projectile Drawing (Glow Applied) ----
  function drawShipProjectiles() {
    shipProjectiles.forEach(p => {
        ctx.fillStyle = 'yellow';
        ctx.shadowColor = 'rgba(255, 255, 0, 1)'; // Yellow glow
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
    });
    // Reset shadow after loop
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  // *** NEW: Health Bar Drawing ***
  function drawEnemyHealthBar(enemy) {
      const barWidth = enemy.size * 0.8;
      const barHeight = 6;
      const barX = enemy.x - barWidth / 2;
      // Place the bar slightly above the enemy
      const barY = enemy.y - enemy.size / 2 - 10; 
      
      let maxHealth = 1;
      if (enemy.isLargeMeteor) maxHealth = config.largeMeteor.health;
      else if (enemy.isShip) maxHealth = config.enemyShipHealth;
      else return; // Only draw for things with health

      const currentHealthRatio = enemy.health / maxHealth;

      // Background (empty health)
      ctx.fillStyle = '#444';
      ctx.fillRect(barX, barY, barWidth, barHeight);

      // Foreground (current health) - Green fading to Red
      const green = Math.floor(255 * currentHealthRatio);
      const red = Math.floor(255 * (1 - currentHealthRatio));
      ctx.fillStyle = `rgb(${red}, ${green}, 0)`; 
      ctx.fillRect(barX, barY, barWidth * currentHealthRatio, barHeight);

      // Outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
  }
  
  // ---- Placeholder Draw Function for Enemies (Call Health Bar here) ----
  function drawEnemies() {
      enemies.forEach(enemy => {
          // Placeholder for drawing the actual enemy sprite/shape
          ctx.fillStyle = enemy.isShip ? 'purple' : 'gray';
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.size / 2, 0, Math.PI * 2);
          ctx.fill();

          // Draw health bar if the enemy has health
          if (enemy.health > 0 && (enemy.isShip || enemy.isLargeMeteor)) {
              drawEnemyHealthBar(enemy);
          }
      });
  }
  
  // Placeholder functions (need to be defined elsewhere in the full script)
  function drawExtraShipPowerUps() {}
  function drawPowerUps() {}
  function drawParticles() {}
  function drawAmbientParticles() {}

  // ---- Main Drawing Function (Modified to use new functions) ----
  function draw() {
    if (paused) return;

    // Background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawNebula();
    drawStarLayers();
    
    // Draw order matters for z-index
    drawShipProjectiles();
    drawEnemies(); // Enemy drawing (now includes health bars)
    drawExtraShipPowerUps();
    drawPowerUps();
    drawPlayer();
    drawBullets();
    drawLaserEffects(); // New advanced drawing
    drawParticles();
    drawAmbientParticles();
    
    // Level transition screen (placeholder needed)
    // drawLevelTransition();
  }

  // ---- Main Game Loop ----
  function gameLoop() {
    if (!gameActive || paused) {
      // If paused, still request the next frame to check for unpause
      requestAnimationFrame(gameLoop);
      return;
    }

    frameCount++;

    // Update Logic
    updateStarLayers();
    updateNebula();
    // updatePlayer(); // Assuming player position is handled by input
    updateBullets();
    // updateEnemies(); // Placeholder
    // updateShipProjectiles(); // Placeholder
    // updateCollisions(); // Placeholder
    // updateParticles(); // Placeholder
    // updatePowerUps(); // Placeholder
    // updateDrone(); // Placeholder

    // Combo Timer
    if (comboTimer > 0) comboTimer--;
    if (comboTimer === 0) comboCount = 0;

    // Laser Timer
    if (player.hasLaser) {
        player.laserTimer--;
        if (player.laserTimer <= 0) {
            player.hasLaser = false;
        }
    }
    
    // Shield Timer (Placeholder)
    // if (shieldTime > 0) { shieldTime--; shieldHue = (shieldHue + 2) % 360; shieldRotation += 0.05; }
    
    // Drone Timer (Placeholder)
    // if (droneActive) { droneTimer--; updateDronePosition(); if (droneTimer <= 0) { droneActive = false; } }
    
    // Level Transition (Placeholder)
    // if (showingLevelTransition) { levelTransitionTimer--; if (levelTransitionTimer <= 0) showingLevelTransition = false; }

    draw();

    requestAnimationFrame(gameLoop);
  }
  
  // ---- Initialization ----
  function init() {
    setupCanvas();
    setupUI();
    assetManager.loadAssets(() => {
        startMessage.innerHTML = "<strong>CLICK TO START</strong>";
    });
  }

  // ---- Execute Initialization ----
  window.onload = init;
})();
