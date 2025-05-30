(function() {
  'use strict';

  // --- Config, Assets, Sprites, State, and Asset Manager (unchanged from your setup) ---

  const config = {
    player: { size: 50, shootCooldown: 10, laserDuration: 300, shipFormationOffsetX: 55, shipFormationOffsetY: 35 },
    laser: { widthBonus: 8 },
    bullets: { width: 5, height: 15, speed: 10, color: 'red', transformedColor: 'orange', bounceLife: 20 },
    enemies: { spawnRateInitial: 1200, spawnRateScoreFactor: 50, minSpawnRate: 350, size: 50, speed: 3, points: 10, rotationSpeedMin: 0.01, rotationSpeedMax: 0.05 },
    largeMeteor: { sizeMultiplier: 2.5, health: 10, pointsPerHit: 10, spawnScoreInterval: 1500, bounceForce: 1.5, explosionParticles: 50 },
    enemyShipChance: 0.25, enemyShipHealth: 3, enemyShipSpeed: 2, enemyShipPoints: 50, enemyShipShootTimerMin: 80, enemyShipShootTimerMax: 160,
    shipProjectileSpeed: 4, shipProjectileSize: 6,
    particles: { count: 25, speed: 4, life: 60, radiusMin: 1, radiusMax: 3 },
    ambientParticles: { spawnChance: 0.3, speed: 1, life: 100, radiusMin: 0.5, radiusMax: 2.0 },
    powerUps: { shieldSpawnChance: 0.003, laserSpawnChance: 0.002, droneSpawnChance: 0.0015, shieldDuration: 300, droneDuration: 600, powerUpSize: 30, powerUpSpeed: 2, droneShootCooldown: 45, extraShipScoreInterval: 10000, extraShipPowerUpSize: 40, extraShipPowerUpSpeed: 2.5, extraShipPowerUpRotationSpeedMin: 0.03, extraShipPowerUpRotationSpeedMax: 0.08 },
    starfield: { foregroundStars: 70, backgroundStars: 70, fgSpeedMin: 0.5, fgSpeedMax: 1.2, bgSpeedMin: 0.1, bgSpeedMax: 0.4 },
    nebula: { spawnChance: 0.0005, fadeInSpeed: 0.005, fadeOutSpeed: 0.005, maxOpacity: 0.5, duration: 300 },
    combo: { resetFrames: 180 },
    initialLives: 3,
    levelRequirements: { 1: { ship2: 1, ship3: 0 }, 2: { ship2: 0, ship3: 1 }, 3: { ship2: 1, ship3: 1 }, 4: { ship2: 2, ship3: 1 }, 5: { ship2: 1, ship3: 2 }, 6: { ship2: 2, ship3: 2 }, 7: { ship2: 3, ship3: 2 }, 8: { ship2: 2, ship3: 3 }, 9: { ship2: 3, ship3: 3 }, 10: { ship2: 4, ship3: 3 }, 11: { ship2: 3, ship3: 4 }, 12: { ship2: 4, ship3: 4 }, 13: { ship2: 5, ship3: 4 }, 14: { ship2: 4, ship3: 5 }, 15: { ship2: 5, ship3: 5 }, 16: { ship2: 6, ship3: 5 }, 17: { ship2: 6, ship3: 6 } },
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
  let rewardGiven = false;
  let youWin = false;

  // --- Asset Manager etc. (same as previous code, unchanged) ---
  // ... [all your utility, asset manager, UI, controls, effects, main game, etc.]

  // [Paste in all functions from your working main file... skipping here for brevity.]

  // --- Level transition with Free Haircut at Level 30 ---
  function drawLevelTransitionScreen() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00ff00";
    ctx.font = "bold 60px Orbitron";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#00ff00";
    ctx.shadowBlur = 15;

    // If game ends, draw WIN screen instead of new level
    if (level >= 30 || youWin) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 52px Orbitron";
      ctx.fillText("YOU WON A FREE HAIRCUT!", canvas.width / 2, canvas.height / 2 - 30);
      ctx.font = "30px Orbitron";
      ctx.fillStyle = "#fff";
      ctx.fillText("Take a screenshot of this page", canvas.width / 2, canvas.height / 2 + 40);
      ctx.fillText("and show it to your barber to claim.", canvas.width / 2, canvas.height / 2 + 90);
      ctx.font = "22px Orbitron";
      ctx.fillText("(Game ends at Level 30. Congratulations!)", canvas.width / 2, canvas.height / 2 + 160);

      // Optionally: Screenshot instructions overlay
      ctx.font = "22px Orbitron";
      ctx.fillStyle = "#00ff00";
      ctx.fillText("On Windows: Press Windows + Shift + S", canvas.width / 2, canvas.height / 2 + 210);
      ctx.fillText("On Mac: Press Command + Shift + 4", canvas.width / 2, canvas.height / 2 + 250);
      return;
    }

    ctx.fillText(`Level ${level + 1}`, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffffff";
    ctx.font = "24px Orbitron";
    ctx.fillText("Get Ready!", canvas.width / 2, canvas.height / 2 + 60);

    // Extra: Show reward in transition to Level 30
    if (level + 1 === 30) {
      ctx.fillStyle = "#FFD700";
      ctx.font = "bold 48px Orbitron";
      ctx.fillText("FREE HAIRCUT NEXT LEVEL!", canvas.width / 2, canvas.height / 2 + 140);

      ctx.font = "22px Orbitron";
      ctx.fillStyle = "#fff";
      ctx.fillText("Finish Level 30 and screenshot the win screen.", canvas.width / 2, canvas.height / 2 + 190);
    }
  }

  // --- Modified finishLevelTransition to end at Level 30 ---
  function finishLevelTransition() {
    if (level >= 30) {
      // Trigger the WIN state
      gameActive = false;
      youWin = true;
      showingLevelTransition = true;
      levelTransitionTimer = 99999; // Never clears
      assetManager.stopMusic();

      // Say it out loud, just for fun
      if ('speechSynthesis' in window && !rewardGiven) {
        let msg = new SpeechSynthesisUtterance("Congratulations! You won a free haircut. Screenshot this page and show it to your barber.");
        window.speechSynthesis.speak(msg);
      }
      rewardGiven = true;
      return;
    }
    showingLevelTransition = false;
    level++;
    enemyShipsDestroyedThisLevel.ship2 = 0;
    enemyShipsDestroyedThisLevel.ship3 = 0;
    currentEnemySpawnRate = Math.max(config.enemies.minSpawnRate, currentEnemySpawnRate - 50);
    scheduleEnemySpawn(500);
  }

  // --- Game Loop additions ---
  function gameLoop() {
    if (!gameStarted) return;
    updateGame();
    drawGame();
    if (showingLevelTransition && (level >= 30 || youWin)) {
      // Stays on win screen
      return;
    }
    requestAnimationFrame(gameLoop);
  }

  // --- startGame ensures win state is reset ---
  function startGame() {
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
    youWin = false; // <<--- Reset WIN state
    updateScoreboard();
    gameActive = true;
    paused = false;
    showingLevelTransition = false;
    levelTransitionTimer = 0;
    pauseScreen.style.display = "none";
    initStarLayers();
    assetManager.playMusic();
    scheduleEnemySpawn();
    if (!gameStarted) {
      gameStarted = true;
      requestAnimationFrame(gameLoop);
    }
  }

  // --- Initialization ---
  function init() {
    // ... rest of your init/setup code as before ...
    setupCanvas();
    if (!ctx) return;
    setupUI();
    assetManager.loadAssets(() => {
      startMessage.innerHTML = "<strong>Click anywhere to START</strong>";
      startScreen.classList.add('ready');
      drawInitialFrame();
    });
  }

  window.addEventListener('DOMContentLoaded', init);

})();
