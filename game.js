(function() {
  'use strict';

  // ---- Configuration ----
  const config = {
    player: {
      size: 50,
      shootCooldown: 10,
      laserDuration: 300,
      shipFormationOffsetX: 55,
      shipFormationOffsetY: 35,
    },
    laser: {
      widthBonus: 8,
    },
    bullets: {
      width: 5,
      height: 15,
      speed: 10,
      color: 'red',
      transformedColor: 'orange',
      bounceLife: 20,
    },
    enemies: {
      spawnRateInitial: 1200,
      spawnRateScoreFactor: 50,
      minSpawnRate: 350,
      size: 50,
      speed: 3,
      points: 10,
      rotationSpeedMin: 0.01,
      rotationSpeedMax: 0.05,
    },
    largeMeteor: {
      sizeMultiplier: 2.5,
      health: 10,
      pointsPerHit: 10,
      spawnScoreInterval: 1500,
      bounceForce: 1.5,
      explosionParticles: 50,
    },
    enemyShipChance: 0.25,
    enemyShipHealth: 3,
    enemyShipSpeed: 2,
    enemyShipPoints: 50,
    enemyShipShootTimerMin: 80,
    enemyShipShootTimerMax: 160,
    shipProjectileSpeed: 4,
    shipProjectileSize: 6,
    particles: {
      count: 25,
      speed: 4,
      life: 60,
      radiusMin: 1,
      radiusMax: 3,
    },
    ambientParticles: {
      spawnChance: 0.3,
      speed: 1,
      life: 100,
      radiusMin: 0.5,
      radiusMax: 2.0,
    },
    powerUps: {
      shieldSpawnChance: 0.003,
      laserSpawnChance: 0.002,
      droneSpawnChance: 0.0015,
      shieldDuration: 300,
      droneDuration: 600,
      powerUpSize: 30,
      powerUpSpeed: 2,
      droneShootCooldown: 45,
      extraShipScoreInterval: 10000,
      extraShipPowerUpSize: 40,
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
      duration: 300,
    },
    combo: {
      resetFrames: 180,
    },
    initialLives: 3,
    levelRequirements: {
      1: { ship2: 1, ship3: 0 }, 2: { ship2: 0, ship3: 1 }, 3: { ship2: 1, ship3: 1 },
      4: { ship2: 2, ship3: 1 }, 5: { ship2: 1, ship3: 2 }, 6: { ship2: 2, ship3: 2 },
      7: { ship2: 3, ship3: 2 }, 8: { ship2: 2, ship3: 3 }, 9: { ship2: 3, ship3: 3 },
      10: { ship2: 4, ship3: 3}, 11: { ship2: 3, ship3: 4}, 12: { ship2: 4, ship3: 4},
      13: { ship2: 5, ship3: 4}, 14: { ship2: 4, ship3: 5}, 15: { ship2: 5, ship3: 5},
      16: { ship2: 6, ship3: 5}, 17: { ship2: 6, ship3: 6},
    },
    levelTransitionDuration: 180,
    sfxVolume: 0.5,
  };

  // ---- Asset Definitions ----
  const assets = {
    spritesheet: { src: 'final_corrected_game_sprite_sheet.png', image: null },
    shipsDrone: { src: 'ships_drone.png', image: null },
    shootSound: { src: 'shoot.mp3', audio: null, volume: config.sfxVolume },
    explosionSound: { src: 'explosion.mp3', audio: null, volume: config.sfxVolume },
    laserSound: { src: 'laser.mp3', audio: null, volume: config.sfxVolume },
    droneSound: { src: 'drone.mp3', audio: null, volume: config.sfxVolume },
    powerUpGetSound: { src: 'explosion.mp3', audio: null, volume: config.sfxVolume * 1.2 },
    backgroundMusic: { src: 'background.mp3', audio: null, loop: true, volume: 0.4 },
  };

  // ---- Sprite Data ----
  const sprites = {
    spaceship: { x: 10, y: 10, width: 200, height: 200 },
    asteroidIntact: { x: 230, y: 10, width: 200, height: 200 },
    asteroidExploding: [
      { x: 450, y: 10, width: 200, height: 200 },
      { x: 670, y: 10, width: 200, height: 200 }
    ]
  };
  const shipsDroneSprites = {
    spaceship2: { x: 10, y: 10, width: 200, height: 200 },
    spaceship3: { x: 230, y: 10, width: 200, height: 200 },
    drone: { x: 450, y: 10, width: 200, height: 200 }
  };

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
  let rewardGiven = false; // FREE haircut reward variable!

  // ---- Utility Functions ----
  function getRandom(min, max) { return Math.random() * (max - min) + min; }
  function getRandomColor() { const letters = '0123456789ABCDEF'; let color = '#'; for (let i = 0; i < 6; i++) { color += letters[Math.floor(Math.random() * 16)]; } return color; }
  function checkCollision(obj1, obj2) { const dx = obj1.x - obj2.x; const dy = obj1.y - obj2.y; const distance = Math.sqrt(dx * dx + dy * dy); const radiiSum = obj1.size / 2 + obj2.size / 2; return distance < radiiSum; }

  // ---- Asset Manager ----
  const assetManager = {
    assetsLoaded: 0,
    totalAssets: Object.keys(assets).length,
    loadAssets(callback) {
      console.log("Loading assets...");
      startMessage.innerHTML = `<strong>Loading Assets... 0/${this.totalAssets}</strong>`;
      for (const key in assets) {
        const asset = assets[key];
        if (asset.src.endsWith('.png')) {
          asset.image = new Image();
          asset.image.onload = () => this.assetLoaded(key, callback);
          asset.image.onerror = () => this.assetError(key, callback);
          asset.image.src = asset.src;
        } else if (asset.src.endsWith('.mp3')) {
          asset.audio = new Audio();
          asset.audio.addEventListener('canplaythrough', () => this.assetLoaded(key, callback), { once: true });
          asset.audio.onerror = () => this.assetError(key, callback);
          asset.audio.src = asset.src;
          if (asset.volume !== undefined) { asset.audio.volume = asset.volume; }
          if (asset.loop) asset.audio.loop = true;
          asset.audio.load();
        }
      }
    },
    assetLoaded(key, callback) {
      this.assetsLoaded++;
      console.log(`Loaded: ${key} (${this.assetsLoaded}/${this.totalAssets})`);
      startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets}</strong>`;
      if (this.assetsLoaded === this.totalAssets) {
        console.log("All assets loaded.");
        callback();
      }
    },
    assetError(key, callback) {
      console.error(`Failed to load asset: ${key}`);
      this.assetsLoaded++;
      startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets} (Error loading ${key})</strong>`;
      if (this.assetsLoaded === this.totalAssets) {
        console.warn("Finished loading assets, but some failed.");
        callback();
      }
    },
    getSpriteSheet() { return assets.spritesheet.image; },
    getShipsDroneSheet() { return assets.shipsDrone.image; },
    playSound(key) {
      const audio = assets[key]?.audio;
      if (audio) {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            audio.currentTime = 0;
            audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`));
          });
        } else {
          audio.currentTime = 0;
          audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`));
        }
      } else {
        console.warn(`Sound asset not found or loaded: ${key}`);
      }
    },
    playMusic() {
      const music = assets.backgroundMusic?.audio;
      if (music && music.paused) {
        if (!audioContext) { audioContext = new (window.AudioContext || window.webkitAudioContext)(); }
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => { music.play().catch(e => console.warn(`Background music play failed: ${e.message}`)); });
        } else {
          music.play().catch(e => console.warn(`Background music play failed: ${e.message}`));
        }
      }
    },
    stopMusic() {
      const music = assets.backgroundMusic?.audio;
      if (music) {
        music.pause();
        music.currentTime = 0;
      }
    }
  };

  // ---- Canvas & UI Setup ----
  function setupCanvas() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.error("Canvas element not found!"); return; }
    ctx = canvas.getContext('2d');
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
  }
  function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!gameActive && !gameStarted) {
      player.x = canvas.width / 2;
      player.y = canvas.height - 100;
    }
  }
  function setupUI() {
    scoreElement = document.getElementById('score');
    highScoreElement = document.getElementById('highScore');
    livesElement = document.getElementById('lives');
    comboElement = document.getElementById('combo');
    startScreen = document.getElementById('startScreen');
    startMessage = document.getElementById('startMessage');
    pauseScreen = document.getElementById('pauseScreen');
    if (!scoreElement || !highScoreElement || !livesElement || !comboElement || !startScreen || !startMessage || !pauseScreen) { console.error("One or more UI elements are missing from the HTML!"); }
    highScore = parseInt(localStorage.getItem('highScore'), 10) || 0;
    if (isNaN(highScore)) {
      highScore = 0;
    }
    updateScoreboard();
    startMessage.addEventListener('click', handleStartClick);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);
    document.addEventListener('keydown', handleKeyDown);
  }
  function updateScoreboard() {
    if(scoreElement) scoreElement.textContent = score;
    if(highScoreElement) highScoreElement.textContent = highScore;
    if(livesElement) livesElement.textContent = lives;
    if(comboElement) comboElement.textContent = comboCount > 0 ? comboCount : 0;
  }

  // ---- Input Handlers (functions here are unchanged; omitted for brevity for token limit) ----
  // ... [keep all your handlers from your working JS file]

  // ---- Scoring, Combo, High Score ----
  function triggerCombo() { if (comboCount === 0) comboCount = 1; comboCount++; comboTimer = config.combo.resetFrames; updateScoreboard(); }
  function resetCombo() { if (comboCount > 0) { comboCount = 0; comboTimer = 0; updateScoreboard(); } }
  function updateCombo() { if (comboCount > 0) { comboTimer--; if (comboTimer <= 0) { resetCombo(); } } }
  function checkHighScore() { if (score > highScore) { highScore = score; localStorage.setItem('highScore', highScore); updateScoreboard(); } }

  // ---- Level & Advancement ----
  function checkLevelCompletion() {
    const req = config.levelRequirements[level];
    if (!req && level <= 17) { return; }
    if (!req) return;
    if (enemyShipsDestroyedThisLevel.ship2 >= req.ship2 && enemyShipsDestroyedThisLevel.ship3 >= req.ship3) {
      if (!showingLevelTransition) { triggerLevelTransition(); }
    }
  }
  function triggerLevelTransition() {
    showingLevelTransition = true;
    levelTransitionTimer = config.levelTransitionDuration;
    if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId);
    clearEnemiesOfType('ship');
    score += level * 100;
    updateScoreboard();
    checkHighScore();
  }
  function finishLevelTransition() {
    showingLevelTransition = false;
    level++;
    enemyShipsDestroyedThisLevel.ship2 = 0;
    enemyShipsDestroyedThisLevel.ship3 = 0;
    currentEnemySpawnRate = Math.max(config.enemies.minSpawnRate, currentEnemySpawnRate - 50);
    scheduleEnemySpawn(500);
    console.log(`Starting Level ${level}`);

    // ---- FREE HAIRCUT REWARD IF PLAYER REACHES LEVEL 30 ----
    if (level === 31 && !rewardGiven) {
      alert("CONGRATS! You beat the game and earned a FREE haircut at Art’s Barbershop!\nShow this screen or mention CODE: ARTCUTS30 at the shop to claim your prize!");
      if ('speechSynthesis' in window) {
        const message = "Congratulations! You beat the game and earned a free haircut at Art's Barbershop. Show this message or mention code Art Cuts Thirty to claim your prize!";
        const utterance = new SpeechSynthesisUtterance(message);
        speechSynthesis.speak(utterance);
      }
      rewardGiven = true;
      gameActive = false;
      setTimeout(() => { gameOver(); }, 100);
    }
  }
  function clearEnemiesOfType(typeToClear) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].type === typeToClear && !enemies[i].exploded) {
        createExplosion(enemies[i].x, enemies[i].y, 10, 2, 30);
        enemies.splice(i, 1);
      }
    }
  }
  function drawLevelTransitionScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 60px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#00ff00";
    ctx.shadowBlur = 15;
    ctx.fillText(`Level ${level + 1}`, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Orbitron";
    ctx.fillText("Get Ready!", canvas.width / 2, canvas.height / 2 + 60);
  }

  // ---- Main Game Loop ----
  function updateGame() {
    if (showingLevelTransition) {
      levelTransitionTimer--;
      if (levelTransitionTimer <= 0) { finishLevelTransition(); }
      // updateStarLayers(); updateNebula(); updateParticles(particles); updateParticles(ambientParticles); (include your background updates)
      return;
    }
    if (!gameActive || paused) return;
    frameCount++;
    // updateStarLayers(); updateNebula(); createAmbientParticle(); ... [continue with your update logic]
    if (shieldTime > 0) shieldTime--;
    if (player.hasLaser) {
      player.laserTimer--;
      if (player.laserTimer <= 0) player.hasLaser = false;
    }
    updateCombo();
    // updateBullets(); updateEnemies(); updatePowerUps(); updateParticles(particles); updateParticles(ambientParticles); (etc)
  }
  function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // drawStarLayers(); drawNebula(); drawPowerUps(); drawEnemies(); drawShipProjectiles(); drawBullets(); drawPlayer(); drawDrone(); drawParticles(particles, config.particles.life); drawParticles(ambientParticles, config.ambientParticles.life); drawShield(); drawLaserEffects(); ctx.fillStyle = "#fff"; ctx.font = "16px Orbitron"; ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(`Level: ${level}`, canvas.width - 20, canvas.height - 20);
    if (showingLevelTransition) {
      drawLevelTransitionScreen();
    }
  }
  function gameLoop() {
    if (!gameStarted) return;
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
  }

  // ---- Game State Management ----
  function startGame() {
    console.log("Starting game...");
    score = 0;
    lives = config.initialLives;
    shieldTime = 0;
    comboCount = 0;
    comboTimer = 0;
    level = 1;
    enemyShipsDestroyedThisLevel = { ship2: 0, ship3: 0 };
    nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval;
    currentEnemySpawnRate = config.enemies.spawnRateInitial;
    frameCount = 0;
    lastShotFrame = -config.player.shootCooldown;
    playerShipCount = 1;
    nextExtraShipScore = config.powerUps.extraShipScoreInterval;
    extraShipPowerUps.length = 0;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    ambientParticles.length = 0;
    powerUps.length = 0;
    shipProjectiles.length = 0;
    activeLaserEffects.length = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    player.hasLaser = false;
    player.laserTimer = 0;
    droneActive = false;
    droneTimer = 0;
    updateScoreboard();
    gameActive = true;
    paused = false;
    showingLevelTransition = false;
    levelTransitionTimer = 0;
    pauseScreen.style.display = "none";
    // initStarLayers(); assetManager.playMusic(); scheduleEnemySpawn(); (your init logic here)
    if (!gameStarted) {
      gameStarted = true;
      requestAnimationFrame(gameLoop);
    }
  }
  function gameOver() {
    console.log("Game Over!");
    gameActive = false;
    gameStarted = false;
    showingLevelTransition = false;
    assetManager.stopMusic();
    if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "red";
    ctx.font = "bold 48px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = "24px Orbitron";
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillText(`Level Reached: ${level}`, canvas.width/2, canvas.height/2 + 70);
    setTimeout(() => {
      startScreen.style.display = "flex";
      startMessage.innerHTML = "<strong>Click anywhere to RESTART</strong>";
      startScreen.classList.add('ready');
    }, 3000);
  }

  // ---- Initialization ----
  function init() {
    console.log("Initializing game...");
    setupCanvas();
    if (!ctx) return;
    setupUI();
    assetManager.loadAssets(() => {
      startMessage.innerHTML = "<strong>Click anywhere to START</strong>";
      startScreen.classList.add('ready');
      drawInitialFrame();
    });
  }
  function drawInitialFrame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!starLayers.foreground.length) {/* initStarLayers(); */ }
    // drawStarLayers(); (add initial drawing if needed)
    const shipSprite = sprites.spaceship;
    const sheet = assetManager.getSpriteSheet();
    if (sheet && shipSprite) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(sheet, shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height, player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
      ctx.globalAlpha = 1.0;
    }
  }

  window.addEventListener('DOMContentLoaded', init);

})();
