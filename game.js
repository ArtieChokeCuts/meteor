(function() {
  'use strict';

  console.log("Game script loaded.");

  // ---- Configuration ----
  const config = {
    player: { size: 50, shootCooldown: 10, laserDuration: 300 },
    bullets: { width: 5, height: 15, speed: 10, color: 'red', transformedColor: 'orange', bounceLife: 20 },
    enemies: { spawnRateInitial: 1200, spawnRateScoreFactor: 50, minSpawnRate: 400, size: 50, speed: 3, points: 10, rotationSpeedMin: 0.01, rotationSpeedMax: 0.05 },
    largeMeteor: { sizeMultiplier: 2.5, health: 10, pointsPerHit: 10, spawnScoreInterval: 1500, bounceForce: 2, explosionParticles: 50 },
    particles: { count: 25, speed: 4, life: 60, radiusMin: 1, radiusMax: 3 },
    ambientParticles: { spawnChance: 0.3, speed: 1, life: 100, radiusMin: 0.5, radiusMax: 2.0 },
    enemyShipChance: 0.2, enemyShipHealth: 2, enemyShipSpeed: 2, enemyShipShootTimerMin: 60, enemyShipShootTimerMax: 120,
    powerUps: { shieldSpawnChance: 0.003, laserSpawnChance: 0.0015, droneSpawnChance: 0.001, shieldDuration: 300, droneDuration: 600, powerUpSize: 30, powerUpSpeed: 2, droneShootCooldown: 45 },
    starfield: { foregroundStars: 70, backgroundStars: 70, fgSpeedMin: 0.5, fgSpeedMax: 1.2, bgSpeedMin: 0.1, bgSpeedMax: 0.4 },
    nebula: { spawnChance: 0.0005, fadeInSpeed: 0.005, fadeOutSpeed: 0.005, maxOpacity: 0.5, duration: 300 },
    combo: { resetFrames: 180 },
    initialLives: 3,
    levelRequirements: { 1: { ship2: 1, ship3: 0 }, 2: { ship2: 0, ship3: 1 }, 3: { ship2: 1, ship3: 1 }, 4: { ship2: 2, ship3: 1 }, 5: { ship2: 2, ship3: 2 }, 6: { ship2: 3, ship3: 2 } },
    levelDuration: 3600,
  };

  // ---- Asset Definitions ----
  const assets = {
    spritesheet: { src: 'final_corrected_game_sprite_sheet.png', image: null },
    shipsDrone: { src: 'ships_drone.png', image: null },
    shootSound: { src: 'shoot.mp3', audio: null },
    explosionSound: { src: 'explosion.mp3', audio: null },
    laserSound: { src: 'laser.mp3', audio: null },
    droneSound: { src: 'drone.mp3', audio: null },
    backgroundMusic: { src: 'background.mp3', audio: null, loop: true, volume: 0.6 },
  };

  // ---- Sprite Data ----
  const sprites = {
    spaceship: { x: 10, y: 10, width: 200, height: 200 },
    asteroidIntact: { x: 230, y: 10, width: 200, height: 200 },
    asteroidExploding: [{ x: 450, y: 10, width: 200, height: 200 }, { x: 670, y: 10, width: 200, height: 200 }]
  };
  const shipsDroneSprites = {
    spaceship2: { x: 10, y: 10, width: 200, height: 200 },
    spaceship3: { x: 230, y: 10, width: 200, height: 200 },
    drone: { x: 450, y: 10, width: 200, height: 200 }
  };

  // ---- Game State Variables ----
  let canvas, ctx, scoreElement, highScoreElement, livesElement, comboElement, startScreen, pauseScreen, startMessage;
  let score = 0, highScore = 0, lives = config.initialLives, comboCount = 1, comboTimer = 0, shieldTime = 0;
  let enemyShipsDestroyed2 = 0, enemyShipsDestroyed3 = 0, nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval;
  let currentEnemySpawnRate = config.enemies.spawnRateInitial, enemySpawnTimerId = null, lastShotFrame = 0, frameCount = 0;
  let level = 1, levelTimer = 0, gameActive = false, gameStarted = false, paused = false;
  const player = { x: 0, y: 0, size: config.player.size, hasLaser: false, laserTimer: 0 };
  const bullets = [], enemies = [], particles = [], powerUps = [], extraShips = [], ambientParticles = [], activeLaserEffects = [], shipProjectiles = [];
  const starLayers = { foreground: [], background: [] };
  let nebulaActive = false, nebulaOpacity = 0, nebulaTimer = 0, shieldHue = 0, shieldRotation = 0;
  let droneActive = false, droneTimer = 0, droneShootTimer = 0, droneOrbitRadius = player.size * 0.8 + 15, droneSize = player.size * 0.6;
  let dronePos = { x: 0, y: 0 }, droneOrbitAngle = 0, audioContext;

  // ---- Utility Functions ----
  function getRandom(min, max) { return Math.random() * (max - min) + min; }
  function getRandomColor() { return '#' + Math.floor(Math.random() * 16777215).toString(16); }
  function checkCollision(rect1, rect2) {
    const r1 = rect1.size / 2, r2 = rect2.size / 2;
    return (rect1.x - r1 < rect2.x + r2 && rect1.x + r1 > rect2.x - r2 && rect1.y - r1 < rect2.y + r2 && rect1.y + r1 > rect2.y - r2);
  }

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
          if (asset.loop) asset.audio.loop = true;
          if (asset.volume !== undefined) asset.audio.volume = asset.volume;
          asset.audio.load();
        }
      }
    },
    assetLoaded(key, callback) {
      this.assetsLoaded++;
      console.log(`Loaded: ${key} (${this.assetsLoaded}/${this.totalAssets})`);
      startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets}</strong>`;
      if (this.assetsLoaded === this.totalAssets) callback();
    },
    assetError(key, callback) {
      console.error(`Failed to load asset: ${key}`);
      this.assetsLoaded++;
      startMessage.innerHTML = `<strong>Loading Assets... ${this.assetsLoaded}/${this.totalAssets} (Error with ${key})</strong>`;
      if (this.assetsLoaded === this.totalAssets) callback();
    },
    getSpriteSheet() { return assets.spritesheet.image || new Image(); },
    getShipsDroneSheet() { return assets.shipsDrone.image || new Image(); },
    playSound(key) {
      const audio = assets[key]?.audio;
      if (audio) {
        if (audioContext?.state === 'suspended') audioContext.resume().then(() => audio.play().catch(e => console.warn(e)));
        else audio.play().catch(e => console.warn(e));
      }
    },
    playMusic() {
      const music = assets.backgroundMusic?.audio;
      if (music && music.paused) {
        if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') audioContext.resume().then(() => music.play().catch(e => console.warn(e)));
        else music.play().catch(e => console.warn(e));
      }
    },
    stopMusic() {
      const music = assets.backgroundMusic?.audio;
      if (music) music.pause();
    }
  };

  // ---- Canvas & UI Setup ----
  function setupCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
  }
  function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!gameActive && !gameStarted) { player.x = canvas.width / 2; player.y = canvas.height - 100; }
  }
  function setupUI() {
    scoreElement = document.getElementById('score');
    highScoreElement = document.getElementById('highScore');
    livesElement = document.getElementById('lives');
    comboElement = document.getElementById('combo');
    startScreen = document.getElementById('startScreen');
    startMessage = document.getElementById('startMessage');
    pauseScreen = document.getElementById('pauseScreen');
    highScore = localStorage.getItem('highScore') || 0;
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
    scoreElement.textContent = score;
    highScoreElement.textContent = highScore;
    livesElement.textContent = lives;
    comboElement.textContent = comboCount;
  }

  // ---- Input Handlers ----
  function handleStartClick() {
    if (assetManager.assetsLoaded === assetManager.totalAssets) {
      startScreen.style.display = 'none';
      startGame();
    }
  }
  function handleMouseMove(e) { if (gameActive && !paused) { player.x = e.clientX; player.y = e.clientY; } }
  function handleMouseClick() { if (gameStarted && !paused) { handleShooting(); assetManager.playMusic(); } }
  function handleTouchStart(e) {
    if (!gameStarted) return;
    e.preventDefault();
    assetManager.playMusic();
    if (paused) return;
    if (e.touches.length > 0) { player.x = e.touches[0].clientX; player.y = e.touches[0].clientY; }
  }
  function handleTouchMove(e) {
    if (!gameActive || paused) return;
    e.preventDefault();
    if (e.touches.length > 0) { player.x = e.touches[0].clientX; player.y = e.touches[0].clientY; }
  }
  function handleTouchEnd(e) { if (gameStarted && !paused) handleShooting(); }
  function handleKeyDown(e) { if (e.key.toLowerCase() === 'p' && gameStarted) togglePause(); }
  function togglePause() {
    paused = !paused;
    pauseScreen.style.display = paused ? "flex" : "none";
    if (paused) assetManager.stopMusic();
    else { assetManager.playMusic(); if (gameActive) scheduleEnemySpawn(100); }
  }

  // ---- Background Effects ----
  function initStarLayers() {
    starLayers.foreground = [];
    starLayers.background = [];
    for (let i = 0; i < config.starfield.foregroundStars; i++) {
      starLayers.foreground.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: getRandom(0.5, 1.5), speed: getRandom(config.starfield.fgSpeedMin, config.starfield.fgSpeedMax) });
    }
    for (let i = 0; i < config.starfield.backgroundStars; i++) {
      starLayers.background.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: getRandom(1, 2.5), speed: getRandom(config.starfield.bgSpeedMin, config.starfield.bgSpeedMax) });
    }
  }
  function updateStarLayers() {
    for (const layer in starLayers) {
      for (const star of starLayers[layer]) {
        star.y += star.speed;
        if (star.y > canvas.height + star.radius * 2) { star.y = -star.radius * 2; star.x = Math.random() * canvas.width; }
      }
    }
  }
  function drawStarLayers() {
    ctx.fillStyle = "#fff";
    for (const layer in starLayers) {
      for (const star of starLayers[layer]) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  function updateNebula() {
    if (!nebulaActive && Math.random() < config.nebula.spawnChance) { nebulaActive = true; nebulaOpacity = 0; nebulaTimer = config.nebula.duration; }
    if (nebulaActive) {
      if (nebulaTimer > 0) { nebulaOpacity = Math.min(nebulaOpacity + config.nebula.fadeInSpeed, config.nebula.maxOpacity); nebulaTimer--; }
      else { nebulaOpacity -= config.nebula.fadeOutSpeed; if (nebulaOpacity <= 0) { nebulaOpacity = 0; nebulaActive = false; } }
    }
  }
  function drawNebula() { if (nebulaOpacity > 0) { ctx.fillStyle = `rgba(100, 0, 128, ${nebulaOpacity})`; ctx.fillRect(0, 0, canvas.width, canvas.height); } }

  // ---- Player & Bullets ----
  function handleShooting() {
    if (frameCount < lastShotFrame + config.player.shootCooldown) return;
    lastShotFrame = frameCount;
    if (player.hasLaser) fireLaser();
    else shootBullet();
  }
  function shootBullet() {
    assetManager.playSound('shootSound');
    bullets.push({ x: player.x, y: player.y - player.size / 2, width: config.bullets.width, height: config.bullets.height, speed: config.bullets.speed, transformed: false, transformationTimer: 0, hasBounced: false });
  }
  function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      bullet.y -= bullet.speed;
      if (bullet.transformed) { bullet.transformationTimer--; if (bullet.transformationTimer <= 0) { bullets.splice(i, 1); continue; } }
      if (bullet.y < -bullet.height || bullet.y > canvas.height + bullet.height) bullets.splice(i, 1);
    }
  }
  function drawBullets() {
    bullets.forEach(b => {
      ctx.fillStyle = b.transformed ? config.bullets.transformedColor : config.bullets.color;
      if (b.transformed) { ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
    });
  }

  // ---- Laser Weapon ----
  function fireLaser() {
    assetManager.playSound('laserSound');
    const startX = player.x, startY = player.y - player.size / 2, endY = 0, segments = [];
    for (let i = 0; i <= 10; i++) segments.push({ x: startX + (Math.random() - 0.5) * 15, y: startY + (endY - startY) * (i / 10) });
    activeLaserEffects.push({ pathPoints: segments, lifetime: 5, initialAlpha: 1.0, initialWidth: 5 });
    checkLaserCollisions(segments);
  }
  function fireDroneLaser() {
    assetManager.playSound('droneSound');
    const startX = dronePos.x, startY = dronePos.y, endY = 0, segments = [];
    for (let i = 0; i <= 10; i++) segments.push({ x: startX + (Math.random() - 0.5) * 15, y: startY + (endY - startY) * (i / 10) });
    activeLaserEffects.push({ pathPoints: segments, lifetime: 5, initialAlpha: 1.0, initialWidth: 5 });
    checkLaserCollisions(segments);
  }
  function checkLaserCollisions(pathPoints) {
    pathPoints.forEach(point => {
      enemies.forEach(enemy => {
        if (Math.sqrt((enemy.x - point.x) ** 2 + (enemy.y - point.y) ** 2) < enemy.size / 2) {
          enemy.exploded = true;
          enemy.frame = 0;
          createExplosion(enemy.x, enemy.y);
          score += config.enemies.points;
          if (enemy.type === "ship") { if (enemy.spriteType === 2) enemyShipsDestroyed2++; else if (enemy.spriteType === 3) enemyShipsDestroyed3++; }
        }
      });
    });
    updateScoreboard();
  }
  function drawLaserEffects() {
    for (let i = activeLaserEffects.length - 1; i >= 0; i--) {
      const effect = activeLaserEffects[i];
      const alpha = effect.initialAlpha * (effect.lifetime / 5), width = effect.initialWidth * (effect.lifetime / 5);
      if (alpha <= 0 || effect.lifetime <= 0) { activeLaserEffects.splice(i, 1); continue; }
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(effect.pathPoints[0].x, effect.pathPoints[0].y);
      for (let j = 1; j < effect.pathPoints.length; j++) ctx.lineTo(effect.pathPoints[j].x, effect.pathPoints[j].y);
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.restore();
      effect.lifetime--;
    }
  }

  // ---- Enemy Ship Projectiles ----
  function fireShipProjectile(enemy) {
    shipProjectiles.push({ x: enemy.x, y: enemy.y + enemy.size / 2, vx: getRandom(-1, 1), vy: 4, size: 6, type: "shipProjectile" });
  }
  function updateShipProjectiles() {
    for (let i = shipProjectiles.length - 1; i >= 0; i--) {
      const proj = shipProjectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;
      if (proj.y > canvas.height + proj.size) { shipProjectiles.splice(i, 1); continue; }
      if (checkCollision({ x: proj.x, y: proj.y, size: proj.size }, { x: player.x, y: player.y, size: player.size * 0.8 })) {
        createExplosion(player.x, player.y, 20, 6);
        lives--;
        assetManager.playSound('explosionSound');
        updateScoreboard();
        if (lives <= 0) { gameOver(); return; }
        shipProjectiles.splice(i, 1);
      }
    }
  }
  function drawShipProjectiles() {
    shipProjectiles.forEach(proj => {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ---- Particles ----
  function createExplosion(x, y, count = config.particles.count, pSpeed = config.particles.speed, pLife = config.particles.life) {
    for (let i = 0; i < count; i++) {
      particles.push({ x, y, vx: (Math.random() - 0.5) * pSpeed * getRandom(0.5, 1.5), vy: (Math.random() - 0.5) * pSpeed * getRandom(0.5, 1.5), radius: getRandom(config.particles.radiusMin, config.particles.radiusMax), life: pLife * getRandom(0.8, 1.2), color: getRandomColor() });
    }
  }
  function updateParticles(arr) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) arr.splice(i, 1);
    }
  }
  function drawParticles(arr) {
    for (const p of arr) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / config.particles.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }
  function createAmbientParticle() {
    if (Math.random() > config.ambientParticles.spawnChance) return;
    const spawnX = player.x + getRandom(-player.size / 2, player.size / 2), spawnY = player.y + player.size / 3;
    ambientParticles.push({ x: spawnX, y: spawnY, vx: (Math.random() - 0.5) * (config.ambientParticles.speed / 2), vy: Math.random() * config.ambientParticles.speed + 0.5, radius: getRandom(config.ambientParticles.radiusMin, config.ambientParticles.radiusMax), life: config.ambientParticles.life, color: getRandomColor() });
  }

  // ---- Enemies ----
  function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      if (enemy.exploded) { enemy.frame++; if (enemy.frame >= sprites.asteroidExploding.length * 10) { enemies.splice(i, 1); } continue; }
      enemy.y += enemy.speed;
      if (enemy.type === "regular" || enemy.type === "large") enemy.rotation += enemy.rotationSpeed;
      else if (enemy.type === "ship") {
        enemy.x += enemy.vx;
        if (enemy.x - enemy.size / 2 < 0 || enemy.x + enemy.size / 2 > canvas.width) { enemy.vx *= -1; enemy.x = Math.max(enemy.size / 2, Math.min(canvas.width - enemy.size / 2, enemy.x)); }
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          if (enemy.spriteType === 2) {
            for (let j = -1; j <= 1; j++) shipProjectiles.push({ x: enemy.x, y: enemy.y + enemy.size / 2, vx: j * 1.5, vy: 4, size: 6, type: "shipProjectile" });
            assetManager.playSound('droneSound');
          } else {
            shipProjectiles.push({ x: enemy.x, y: enemy.y + enemy.size / 2, vx: 0, vy: 6, size: 6, type: "shipProjectile" });
            assetManager.playSound('laserSound');
          }
          enemy.shootTimer = Math.floor(getRandom(config.enemyShipShootTimerMin, config.enemyShipShootTimerMax));
        }
      }
      if (enemy.y > canvas.height + enemy.size) { enemies.splice(i, 1); continue; }
      for (let j = bullets.length - 1; j >= 0; j--) {
        const bullet = bullets[j];
        if (checkCollision({ x: bullet.x, y: bullet.y, size: Math.max(bullet.width, bullet.height) * 1.5 }, enemy)) {
          handleBulletEnemyCollision(bullet, enemy, i, j);
          if (enemy.exploded) break;
        }
      }
      if (!enemy.exploded && checkCollision({ x: player.x, y: player.y, size: player.size }, enemy)) handlePlayerEnemyCollision(enemy, i);
    }
  }
  function handleBulletEnemyCollision(bullet, enemy, enemyIndex, bulletIndex) {
    if (enemy.type === "regular" || enemy.type === "large") {
      assetManager.playSound('explosionSound');
      enemy.exploded = true;
      enemy.frame = 0;
      createExplosion(enemy.x, enemy.y);
      bullets.splice(bulletIndex, 1);
      score += config.enemies.points * comboCount;
      triggerCombo();
    } else if (enemy.type === "ship") {
      enemy.health--;
      bullets.splice(bulletIndex, 1);
      score += config.enemies.points;
      triggerCombo();
      if (enemy.health <= 0) {
        assetManager.playSound('explosionSound');
        enemy.exploded = true;
        enemy.frame = 0;
        createExplosion(enemy.x, enemy.y);
        score += 50;
        if (enemy.spriteType === 2) enemyShipsDestroyed2++; else if (enemy.spriteType === 3) enemyShipsDestroyed3++;
      }
    }
    updateScoreboard();
    checkHighScore();
  }
  function handlePlayerEnemyCollision(enemy, enemyIndex) {
    if (shieldTime > 0) {
      assetManager.playSound('explosionSound');
      enemy.exploded = true;
      enemy.frame = 0;
      createExplosion(enemy.x, enemy.y, config.particles.count / 2, config.particles.speed * 0.5, config.particles.life / 2);
      score += Math.floor(config.enemies.points / 2);
    } else {
      createExplosion(player.x, player.y, 40, 6);
      lives--;
      assetManager.playSound('explosionSound');
      updateScoreboard();
      if (lives <= 0) { gameOver(); return; }
      comboCount = 1;
      comboTimer = 0;
      enemies.splice(enemyIndex, 1);
    }
    updateScoreboard();
    checkHighScore();
  }
  function drawEnemies() {
    enemies.forEach(enemy => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      if (enemy.type === 'regular' || enemy.type === 'large') {
        if (enemy.exploded) {
          const frameIndex = Math.min(Math.floor(enemy.frame / 10), sprites.asteroidExploding.length - 1);
          const spriteData = sprites.asteroidExploding[frameIndex];
          ctx.drawImage(assetManager.getSpriteSheet(), spriteData.x, spriteData.y, spriteData.width, spriteData.height, -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
        } else {
          ctx.rotate(enemy.rotation);
          ctx.drawImage(assetManager.getSpriteSheet(), sprites.asteroidIntact.x, sprites.asteroidIntact.y, sprites.asteroidIntact.width, sprites.asteroidIntact.height, -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
        }
      } else if (enemy.type === 'ship') {
        const spriteData = enemy.spriteType === 2 ? shipsDroneSprites.spaceship2 : shipsDroneSprites.spaceship3;
        ctx.drawImage(assetManager.getShipsDroneSheet(), spriteData.x, spriteData.y, spriteData.width, spriteData.height, -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
      }
      ctx.restore();
    });
  }

  // ---- Power-Ups ----
  function spawnPowerUp() {
    if (!gameActive || paused) return;
    const roll = Math.random();
    let type = null;
    if (roll < config.powerUps.droneSpawnChance) type = 'drone';
    else if (roll < config.powerUps.droneSpawnChance + config.powerUps.laserSpawnChance) type = 'laser';
    else if (roll < config.powerUps.droneSpawnChance + config.powerUps.laserSpawnChance + config.powerUps.shieldSpawnChance) type = 'shield';
    if (type) powerUps.push({ type, x: Math.random() * canvas.width, y: -config.powerUps.powerUpSize, size: config.powerUps.powerUpSize, speed: config.powerUps.powerUpSpeed });
    if (score >= nextLargeMeteorScore) spawnLargeMeteor();
  }
  function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const pu = powerUps[i];
      pu.y += pu.speed;
      if (checkCollision({ x: player.x, y: player.y, size: player.size }, pu)) {
        switch (pu.type) {
          case 'shield': shieldTime = config.powerUps.shieldDuration; console.log("Shield acquired!"); break;
          case 'laser': player.hasLaser = true; player.laserTimer = config.player.laserDuration; console.log("Laser acquired!"); break;
          case 'drone': if (!droneActive) { droneActive = true; droneTimer = config.powerUps.droneDuration; droneShootTimer = 0; droneOrbitAngle = Math.random() * Math.PI * 2; console.log("Drone acquired!"); } break;
        }
        powerUps.splice(i, 1);
      } else if (pu.y > canvas.height + pu.size) powerUps.splice(i, 1);
    }
  }
  function drawPowerUps() {
    powerUps.forEach(pu => {
      let color, text;
      switch (pu.type) {
        case 'shield': color = "rgba(0, 150, 255, 0.9)"; text = "S"; break;
        case 'laser': color = "rgba(0, 255, 0, 0.9)"; text = "L"; break;
        case 'drone': color = "rgba(255, 255, 0, 0.9)"; text = "D"; break;
        default: color = "grey"; text = "?"; break;
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, pu.size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = `bold ${pu.size * 0.6}px Orbitron`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, pu.x, pu.y);
    });
  }

  // ---- Drone ----
  function updateDrone() {
    if (!droneActive) return;
    droneOrbitAngle += 0.05;
    dronePos.x = player.x + Math.cos(droneOrbitAngle) * droneOrbitRadius;
    dronePos.y = player.y + Math.sin(droneOrbitAngle) * droneOrbitRadius;
    droneShootTimer--;
    if (droneShootTimer <= 0) { fireDroneLaser(); droneShootTimer = config.powerUps.droneShootCooldown; }
    droneTimer--;
    if (droneTimer <= 0) droneActive = false;
  }
  function drawDrone() {
    if (!droneActive) return;
    const droneSprite = shipsDroneSprites.drone;
    ctx.save();
    ctx.translate(dronePos.x, dronePos.y);
    ctx.rotate(droneOrbitAngle + Math.PI / 2);
    ctx.drawImage(assetManager.getShipsDroneSheet(), droneSprite.x, droneSprite.y, droneSprite.width, droneSprite.height, -droneSize / 2, -droneSize / 2, droneSize, droneSize);
    ctx.restore();
  }

  // ---- Player & Effects ----
  function drawPlayer() {
    ctx.drawImage(assetManager.getSpriteSheet(), sprites.spaceship.x, sprites.spaceship.y, sprites.spaceship.width, sprites.spaceship.height, player.x - player.size / 2, player.y - player.size / 2, player.size, player.size);
  }
  function drawShield() {
    if (shieldTime <= 0) return;
    shieldHue = (shieldHue + 5) % 360;
    shieldRotation += 0.05;
    const shieldColor = `hsl(${shieldHue}, 100%, 60%)`;
    ctx.strokeStyle = shieldColor;
    ctx.lineWidth = 4;
    ctx.shadowColor = shieldColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.size * 0.7, shieldRotation + Math.PI / 6, shieldRotation + Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    const barMaxWidth = 150, barHeight = 15, barX = 20, barY = canvas.height - barHeight - 15;
    const shieldPercent = shieldTime / config.powerUps.shieldDuration;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(barX, barY, barMaxWidth, barHeight);
    ctx.fillStyle = shieldColor;
    ctx.fillRect(barX, barY, barMaxWidth * shieldPercent, barHeight);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barMaxWidth, barHeight);
    ctx.fillStyle = "#fff";
    ctx.font = "14px Orbitron";
    ctx.textAlign = "left";
    ctx.fillText(Math.ceil(shieldTime / 60) + "s", barX + barMaxWidth + 10, barY + barHeight / 2);
  }

  // ---- Scoring & Combo ----
  function triggerCombo() { comboCount++; comboTimer = config.combo.resetFrames; updateScoreboard(); }
  function updateCombo() { if (comboCount > 1) { comboTimer--; if (comboTimer <= 0) { comboCount = 1; updateScoreboard(); } } }
  function checkHighScore() { if (score > highScore) { highScore = score; localStorage.setItem('highScore', highScore); updateScoreboard(); } }

  // ---- Level & Spawning ----
  function updateLevel() {
    levelTimer++;
    const req = config.levelRequirements[level] || { ship2: 3, ship3: 2 }; // Default to max difficulty after level 6
    if (enemyShipsDestroyed2 >= req.ship2 && enemyShipsDestroyed3 pessimistic req.ship3) {
      level++;
      enemyShipsDestroyed2 = 0;
      enemyShipsDestroyed3 = 0;
      enemies = enemies.filter(e => e.type !== "ship");
      levelTimer = 0;
      console.log(`Level ${level} started!`);
    }
  }
  function scheduleEnemySpawn(delay) {
    if (!gameActive) return;
    if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId);
    const currentDelay = delay !== undefined ? delay : currentEnemySpawnRate;
    enemySpawnTimerId = setTimeout(() => {
      if (gameActive && !paused) {
        spawnEnemy();
        spawnPowerUp(); // Add power-up spawning here
        const scoreFactorReduction = Math.floor(score / config.enemies.spawnRateScoreFactor);
        currentEnemySpawnRate = Math.max(config.enemies.minSpawnRate, config.enemies.spawnRateInitial - scoreFactorReduction);
        scheduleEnemySpawn();
      }
    }, currentDelay);
  }
  function spawnEnemy() {
    const rand = Math.random();
    if (rand < config.enemyShipChance) {
      const spriteType = Math.random() < 0.5 ? 2 : 3;
      enemies.push({ x: Math.random() * (canvas.width - config.player.size) + config.player.size / 2, y: -config.player.size / 2, size: config.player.size, speed: config.enemyShipSpeed, type: 'ship', health: config.enemyShipHealth, rotation: 0, shootTimer: Math.floor(getRandom(config.enemyShipShootTimerMin, config.enemyShipShootTimerMax)), spriteType, vx: (Math.random() < 0.5 ? 1 : -1) * config.enemyShipSpeed });
    } else {
      const size = config.enemies.size;
      enemies.push({ x: Math.random() * (canvas.width - size) + size / 2, y: -size / 2, size, speed: config.enemies.speed * getRandom(0.9, 1.2), frame: 0, exploded: false, type: 'regular', health: 1, rotation: 0, rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.enemies.rotationSpeedMin, config.enemies.rotationSpeedMax), vx: 0 });
    }
  }
  function spawnLargeMeteor() {
    const size = config.enemies.size * config.largeMeteor.sizeMultiplier;
    enemies.push({ x: Math.random() * (canvas.width - size) + size / 2, y: -size / 2, size, speed: config.enemies.speed * 0.7, frame: 0, exploded: false, type: 'large', health: config.largeMeteor.health, rotation: 0, rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.enemies.rotationSpeedMin * 0.5, config.enemies.rotationSpeedMax * 0.5), vx: 0 });
    nextLargeMeteorScore += config.largeMeteor.spawnScoreInterval;
    console.log("Large Meteor Spawned!");
  }

  // ---- Game Loop ----
  function updateGame() {
    if (!gameActive || paused) return;
    frameCount++;
    updateLevel();
    updateStarLayers();
    updateNebula();
    createAmbientParticle();
    if (shieldTime > 0) shieldTime--;
    if (player.hasLaser) { player.laserTimer--; if (player.laserTimer <= 0) player.hasLaser = false; }
    updateCombo();
    updateBullets();
    updateEnemies();
    updateShipProjectiles();
    updatePowerUps();
    updateParticles(particles);
    updateParticles(ambientParticles);
    updateDrone();
  }
  function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawStarLayers();
    drawNebula();
    drawPowerUps();
    drawEnemies();
    drawShipProjectiles();
    drawBullets();
    drawPlayer();
    drawParticles(particles);
    drawParticles(ambientParticles);
    drawShield();
    drawLaserEffects();
    drawDrone();
    ctx.fillStyle = "#fff";
    ctx.font = "16px Orbitron";
    ctx.textAlign = "right";
    ctx.fillText(`Level: ${level}`, canvas.width - 20, canvas.height - 20);
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
    comboCount = 1;
    comboTimer = 0;
    enemyShipsDestroyed2 = 0;
    enemyShipsDestroyed3 = 0;
    nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval;
    currentEnemySpawnRate = config.enemies.spawnRateInitial;
    frameCount = 0;
    lastShotFrame = -config.player.shootCooldown;
    enemies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    ambientParticles.length = 0;
    powerUps.length = 0;
    extraShips.length = 0;
    activeLaserEffects.length = 0;
    shipProjectiles.length = 0;
    level = 1;
    levelTimer = 0;
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    updateScoreboard();
    gameActive = true;
    paused = false;
    pauseScreen.style.display = "none";
    initStarLayers();
    assetManager.playMusic();
    scheduleEnemySpawn();
    if (!gameStarted) { gameStarted = true; requestAnimationFrame(gameLoop); }
  }
  function gameOver() {
    console.log("Game Over!");
    gameActive = false;
    gameStarted = false;
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
    setTimeout(() => {
      startScreen.style.display = "flex";
      startMessage.innerHTML = "<strong>Click anywhere to RESTART</strong>";
      startScreen.classList.add('ready');
    }, 3000);
  }

  // ---- Initialization ----
  function drawInitialFrame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!starLayers.foreground.length) initStarLayers();
    drawStarLayers();
    const sheet = assetManager.getSpriteSheet();
    if (sheet) ctx.drawImage(sheet, sprites.spaceship.x, sprites.spaceship.y, sprites.spaceship.width, sprites.spaceship.height, canvas.width / 2 - config.player.size / 2, canvas.height - 100 - config.player.size / 2, config.player.size, config.player.size);
  }
  function init() {
    console.log("Initializing game...");
    setupCanvas();
    setupUI();
    assetManager.loadAssets(() => {
      startMessage.innerHTML = "<strong>Click anywhere to START</strong>";
      startScreen.classList.add('ready');
      drawInitialFrame();
    });
  }
  window.addEventListener('DOMContentLoaded', init);
})();