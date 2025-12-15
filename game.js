(function() { // IIFE to encapsulate game logic
  'use strict';

  // ---- Configuration ----
  const config = {
    player: {
      size: 50, // Keep consistent width/height for simplicity
      speed: 7, // Base speed (not used with direct mouse follow)
      shootCooldown: 10, // Frames between shots
    },
    bullets: {
      width: 5,
      height: 15,
      speed: 10,
      color: 'red',
      transformedColor: 'orange',
      bounceLife: 20, // Frames a bounced bullet lives
    },
    enemies: {
      spawnRateInitial: 1200, // ms
      spawnRateScoreFactor: 50, // Lower spawn rate by 1ms every N points
      minSpawnRate: 400, // ms
      size: 50,
      speed: 3,
      points: 10, // Base points per kill
      rotationSpeedMin: 0.01,
      rotationSpeedMax: 0.05,
    },
    largeMeteor: {
        sizeMultiplier: 2.5,
        health: 10,
        pointsPerHit: 10,
        spawnScoreInterval: 1500,
        bounceForce: 2,
        explosionParticles: 50, // More particles for big boom
    },
    particles: {
      count: 25, // Default explosion particles
      speed: 4,
      life: 60, // Frames
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
      shieldSpawnChance: 0.003, // Chance per frame
      shieldDuration: 300, // Frames (~5 seconds at 60fps)
      shieldSize: 30,
      shieldSpeed: 2,
      extraShipScoreInterval: 1000,
      extraShipSize: 50, // Match player size
      extraShipSpeed: 2,
      extraShipRotationSpeedMin: 0.05,
      extraShipRotationSpeedMax: 0.1,
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
      spawnChance: 0.0005, // Chance per frame
      fadeInSpeed: 0.005,
      fadeOutSpeed: 0.005,
      maxOpacity: 0.5,
      duration: 300, // Frames
    },
    combo: {
      resetFrames: 180, // ~3 seconds at 60fps
    },
    initialLives: 3,
  };

  // ---- Asset Definitions ----
  const assets = {
    spritesheet: { src: 'final_corrected_game_sprite_sheet.png', image: null },
    shootSound: { src: 'shoot.mp3', audio: null },
    explosionSound: { src: 'explosion.mp3', audio: null },
    backgroundMusic: { src: 'background.mp3', audio: null, loop: true, volume: 0.3 },
  };

  const sprites = {
    spaceship: { x: 10, y: 10, width: 200, height: 200 },
    asteroidIntact: { x: 230, y: 10, width: 200, height: 200 },
    asteroidExploding: [
      { x: 450, y: 10, width: 200, height: 200 },
      { x: 670, y: 10, width: 200, height: 200 }
    ]
  };

  // ---- Game State Variables ----
  let canvas, ctx;
  let scoreElement, highScoreElement, livesElement, comboElement;
  let startScreen, startMessage, pauseScreen;

  let score = 0;
  let highScore = 0;
  let lives = config.initialLives;
  let comboCount = 0;
  let comboTimer = 0;
  let shieldTime = 0;
  let shipCount = 1; // 1 or 2
  let nextExtraShipScore = config.powerUps.extraShipScoreInterval;
  let nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval;
  let currentEnemySpawnRate = config.enemies.spawnRateInitial;
  let enemySpawnTimerId = null;
  let lastShotFrame = 0;
  let frameCount = 0; // Keep track of frames for time-based logic

  let gameActive = false; // Is the game simulation running (not paused, not on start/game over)
  let gameStarted = false; // Has the game loop been initiated?
  let paused = false;

  // Game Objects
  const player = { x: 0, y: 0, size: config.player.size }; // Initial position set later
  const bullets = [];
  const enemies = [];
  const particles = [];
  const powerUps = [];
  const extraShips = [];
  const ambientParticles = [];

  // Background Elements
  const starLayers = { foreground: [], background: [] };
  let nebulaActive = false;
  let nebulaOpacity = 0;
  let nebulaTimer = 0;
  let shieldHue = 0;
  let shieldRotation = 0;

  // Audio Context
  let audioContext;
  let musicSourceNode; // To control background music gain

  // ---- Utility Functions ----
  function getRandom(min, max) {
    return Math.random() * (max - min) + min;
  }

  function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  // Simple AABB Collision Check
  function checkCollision(rect1, rect2) {
      // Adjust rect coords to be top-left based for consistency if needed
      // Assuming rect objects have x, y (center) and size (diameter/width)
      const r1Half = rect1.size / 2;
      const r2Half = rect2.size / 2;
      return (
          rect1.x - r1Half < rect2.x + r2Half &&
          rect1.x + r1Half > rect2.x - r2Half &&
          rect1.y - r1Half < rect2.y + r2Half &&
          rect1.y + r1Half > rect2.y - r2Half
      );
  }

   // ---- Asset Manager ----
   const assetManager = {
    assetsLoaded: 0,
    totalAssets: Object.keys(assets).length,

    loadAssets(callback) {
        console.log("Loading assets...");
        for (const key in assets) {
            const asset = assets[key];
            if (asset.src.endsWith('.png')) {
                asset.image = new Image();
                asset.image.onload = () => this.assetLoaded(key, callback);
                asset.image.onerror = () => this.assetError(key);
                asset.image.src = asset.src;
            } else if (asset.src.endsWith('.mp3')) {
                asset.audio = new Audio();
                asset.audio.addEventListener('canplaythrough', () => this.assetLoaded(key, callback), { once: true });
                asset.audio.onerror = () => this.assetError(key);
                asset.audio.src = asset.src;
                if (asset.loop) asset.audio.loop = true;
                if (asset.volume !== undefined) asset.audio.volume = asset.volume;
                asset.audio.load(); // Important for preloading
            }
        }
    },

    assetLoaded(key, callback) {
        this.assetsLoaded++;
        console.log(`Loaded: ${key} (${this.assetsLoaded}/${this.totalAssets})`);
        if (this.assetsLoaded === this.totalAssets) {
            console.log("All assets loaded.");
            callback();
        }
    },

    assetError(key) {
        console.error(`Failed to load asset: ${key}`);
        // Optionally handle loading errors, e.g., show an error message
        // For simplicity, we'll increment loaded count anyway to not block forever
        this.assetsLoaded++;
         if (this.assetsLoaded === this.totalAssets) {
             console.warn("Finished loading assets with errors.");
             // callback(); // Decide if game can start with missing assets
         }
    },

    getSpriteSheet() {
        return assets.spritesheet.image;
    },

    playSound(key) {
        const audio = assets[key]?.audio;
        if (audio) {
            audio.currentTime = 0; // Rewind to start
            audio.play().catch(e => console.warn(`Audio play failed for ${key}: ${e.message}`));
        }
    },

    playMusic() {
        const music = assets.backgroundMusic?.audio;
        if (music && music.paused) {
             // Ensure AudioContext is resumed (required by some browsers)
            if (!audioContext) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
             if (audioContext.state === 'suspended') {
                audioContext.resume();
            }

            music.play().catch(e => console.warn(`Background music play failed: ${e.message}`));
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
    ctx = canvas.getContext('2d');
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
  }

  function setCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Recalculate player start position if needed
    if (!gameActive && !gameStarted) { // Only set initial if not playing
         player.x = canvas.width / 2;
         player.y = canvas.height - 100; // Adjust fixed distance from bottom
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

    highScore = localStorage.getItem('highScore') || 0;
    updateScoreboard();

    startMessage.addEventListener('click', handleStartClick);

    // Add touch controls
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd); // Could potentially trigger shot on tap end

     // Mouse controls
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleMouseClick);

    // Pause key
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

  function handleMouseMove(e) {
      if (!gameActive || paused) return;
      player.x = e.clientX;
      player.y = e.clientY; // Direct follow
  }

  function handleMouseClick() {
      if (!gameStarted || paused) return; // Don't shoot if not started or paused
       // Allow shooting via click even if start screen was just hidden
       if (startScreen.style.display === 'none') {
            shootBullet();
       }
       // Ensure music starts on first interaction
       assetManager.playMusic();
  }

  function handleTouchStart(e) {
      if (!gameStarted) return; // Don't respond before game starts
      e.preventDefault(); // Prevent scrolling/zooming
      assetManager.playMusic(); // Ensure music starts on first interaction
      if (paused) return;

      // Treat first touch point like mouse cursor
      if (e.touches.length > 0) {
          const touch = e.touches[0];
          player.x = touch.clientX;
          player.y = touch.clientY;
          // Consider shooting on initial tap? Or require a separate tap?
          // shootBullet(); // Example: shoot on tap start
      }
  }

  function handleTouchMove(e) {
      if (!gameActive || paused) return;
      e.preventDefault(); // Prevent scrolling/zooming
      if (e.touches.length > 0) {
          const touch = e.touches[0];
          player.x = touch.clientX;
          player.y = touch.clientY;
      }
  }

   function handleTouchEnd(e) {
       if (!gameStarted || paused) return;
       // If no touches remain, could potentially stop shooting or other actions
       // Shoot on tap release (if it wasn't a drag) - more complex logic needed
       // For simplicity, we'll rely on explicit tap/click for shooting for now
       // Simple tap-to-shoot: check if duration was short and no movement
       // Alternative: Add an on-screen shoot button
       shootBullet(); // Shoot on lifting finger (simple tap detection)
   }


  function handleKeyDown(e) {
    if (e.key.toLowerCase() === 'p' && gameStarted) {
      togglePause();
    }
  }

  function togglePause() {
      paused = !paused;
      pauseScreen.style.display = paused ? "flex" : "none";
      if (paused) {
          // Optionally pause music or reduce volume
          assets.backgroundMusic?.audio?.pause();
          if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); // Stop new spawns
      } else {
          // Resume music
          assetManager.playMusic();
          // Reschedule enemy spawn immediately if game is active
          if(gameActive) scheduleEnemySpawn(100); // Respawn quickly after unpause
          // Resume game loop implicitly via requestAnimationFrame
      }
  }

  // ---- Background Effects ----
  function initStarLayers() {
    starLayers.foreground = [];
    starLayers.background = [];
    for (let i = 0; i < config.starfield.foregroundStars; i++) {
      starLayers.foreground.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: getRandom(0.5, 1.5),
        speed: getRandom(config.starfield.fgSpeedMin, config.starfield.fgSpeedMax)
      });
    }
    for (let i = 0; i < config.starfield.backgroundStars; i++) {
      starLayers.background.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: getRandom(1, 2.5),
        speed: getRandom(config.starfield.bgSpeedMin, config.starfield.bgSpeedMax)
      });
    }
  }

  function updateStarLayers() {
    for (const layerName in starLayers) {
      for (const star of starLayers[layerName]) {
        star.y += star.speed;
        if (star.y > canvas.height + star.radius * 2) { // Reset slightly below screen
          star.y = -star.radius * 2;
          star.x = Math.random() * canvas.width;
        }
      }
    }
  }

  function drawStarLayers() {
    ctx.fillStyle = "#fff";
    for (const layerName in starLayers) {
      for (const star of starLayers[layerName]) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function updateNebula() {
    if (!nebulaActive && Math.random() < config.nebula.spawnChance) {
      nebulaActive = true;
      nebulaOpacity = 0;
      nebulaTimer = config.nebula.duration;
    }
    if (nebulaActive) {
      if (nebulaTimer > 0) {
        nebulaOpacity = Math.min(nebulaOpacity + config.nebula.fadeInSpeed, config.nebula.maxOpacity);
        nebulaTimer--;
      } else {
        nebulaOpacity -= config.nebula.fadeOutSpeed;
        if (nebulaOpacity <= 0) {
          nebulaOpacity = 0;
          nebulaActive = false;
        }
      }
    }
  }

  function drawNebula() {
    if (nebulaOpacity > 0) {
      // Simple purple nebula, could be enhanced with noise/gradients
      ctx.fillStyle = `rgba(100, 0, 128, ${nebulaOpacity})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ---- Player & Bullets ----
  function shootBullet() {
      // Cooldown check
      if (frameCount < lastShotFrame + config.player.shootCooldown) {
          return;
      }
      lastShotFrame = frameCount;

      assetManager.playSound('shootSound');
      const bulletCommon = {
          width: config.bullets.width,
          height: config.bullets.height,
          speed: config.bullets.speed,
          transformed: false,
          transformationTimer: 0,
          hasBounced: false // For large meteor interaction
      };

      if (shipCount === 1) {
          bullets.push({ ...bulletCommon, x: player.x, y: player.y - player.size / 2 });
      } else if (shipCount === 2) {
          const offset = player.size * 0.7; // Adjust spacing
          bullets.push({ ...bulletCommon, x: player.x - offset, y: player.y });
          bullets.push({ ...bulletCommon, x: player.x + offset, y: player.y });
      }
  }

  function updateBullets() {
      for (let i = bullets.length - 1; i >= 0; i--) {
          const bullet = bullets[i];
          bullet.y -= bullet.speed; // Speed can be negative if bounced

          if (bullet.transformed) {
              bullet.transformationTimer--;
              if (bullet.transformationTimer <= 0) {
                  bullets.splice(i, 1);
                  continue;
              }
          }

          // Remove bullets going off screen
          if (bullet.y < -bullet.height || bullet.y > canvas.height + bullet.height) {
              bullets.splice(i, 1);
          }
      }
  }

  function drawBullets() {
      bullets.forEach(b => {
          if (b.transformed) {
              // Draw transformed (bounced) bullet - simple orange circles
              ctx.fillStyle = config.bullets.transformedColor;
              ctx.beginPath();
              ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
              ctx.fill();
              // Add some trail effect maybe?
              ctx.beginPath();
              ctx.arc(b.x + getRandom(-2, 2), b.y + getRandom(1, 4), 1.5, 0, Math.PI * 2);
              ctx.fill();
          } else {
              // Draw regular bullet
              ctx.fillStyle = config.bullets.color;
              ctx.fillRect(b.x - b.width / 2, b.y - b.height / 2, b.width, b.height);
          }
      });
  }


  // ---- Particles ----
  function createExplosion(x, y, count = config.particles.count, pSpeed = config.particles.speed, pLife = config.particles.life) {
      for (let i = 0; i < count; i++) {
          particles.push({
              x: x,
              y: y,
              vx: (Math.random() - 0.5) * pSpeed * getRandom(0.5, 1.5),
              vy: (Math.random() - 0.5) * pSpeed * getRandom(0.5, 1.5),
              radius: getRandom(config.particles.radiusMin, config.particles.radiusMax),
              life: pLife * getRandom(0.8, 1.2), // Vary life slightly
              color: getRandomColor()
          });
      }
  }

   function createBulletParticles(x, y, count = 5) {
      for (let i = 0; i < count; i++) {
          particles.push({
              x: x,
              y: y,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              radius: 1.5,
              life: config.bullets.bounceLife, // Match bounce life
              color: config.bullets.transformedColor
          });
      }
  }

  function createAmbientParticle() {
      if (Math.random() > config.ambientParticles.spawnChance) return;
      // Spawn near the player, slightly behind
      const spawnX = player.x + getRandom(-player.size / 2, player.size / 2);
      const spawnY = player.y + player.size / 3;
      ambientParticles.push({
        x: spawnX,
        y: spawnY,
        vx: (Math.random() - 0.5) * (config.ambientParticles.speed / 2), // Less horizontal drift
        vy: Math.random() * config.ambientParticles.speed + 0.5, // Move downwards
        radius: getRandom(config.ambientParticles.radiusMin, config.ambientParticles.radiusMax),
        life: config.ambientParticles.life,
        color: getRandomColor()
      });
  }

  function updateParticles(particleArray) {
       for (let i = particleArray.length - 1; i >= 0; i--) {
           const p = particleArray[i];
           p.x += p.vx;
           p.y += p.vy;
           p.life--;
           if (p.life <= 0) {
               particleArray.splice(i, 1);
           }
       }
   }

   function drawParticles(particleArray) {
       for (const p of particleArray) {
           ctx.fillStyle = p.color;
           ctx.globalAlpha = Math.max(0, p.life / 60); // Fade out
           ctx.beginPath();
           ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
           ctx.fill();
           ctx.globalAlpha = 1.0; // Reset alpha
       }
   }

  // ---- Enemies ----
  function scheduleEnemySpawn(delay) {
      if (!gameActive) return; // Don't spawn if game stopped
       if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); // Clear existing timer

       const currentDelay = delay !== undefined ? delay : currentEnemySpawnRate;

      enemySpawnTimerId = setTimeout(() => {
          if (gameActive && !paused) { // Check again in case state changed
              spawnEnemy();
              // Adjust spawn rate based on score for difficulty scaling
              const scoreFactorReduction = Math.floor(score / config.enemies.spawnRateScoreFactor);
              currentEnemySpawnRate = Math.max(
                  config.enemies.minSpawnRate,
                  config.enemies.spawnRateInitial - scoreFactorReduction
              );
               scheduleEnemySpawn(); // Schedule next one
          }
      }, currentDelay);
  }

  function spawnEnemy() {
    const size = config.enemies.size;
    enemies.push({
      x: Math.random() * (canvas.width - size) + size / 2, // Ensure within bounds
      y: -size / 2, // Start off-screen top
      size: size,
      speed: config.enemies.speed * getRandom(0.9, 1.2), // Vary speed slightly
      frame: 0,
      exploded: false,
      type: 'regular',
      health: 1,
      rotation: 0,
      rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.enemies.rotationSpeedMin, config.enemies.rotationSpeedMax),
      vx: 0, // Horizontal velocity for large meteors
    });
  }

  function spawnLargeMeteor() {
      const size = config.enemies.size * config.largeMeteor.sizeMultiplier;
      enemies.push({
          x: Math.random() * (canvas.width - size) + size / 2,
          y: -size / 2,
          size: size,
          speed: config.enemies.speed * 0.7, // Slower vertical speed
          frame: 0,
          exploded: false,
          type: 'large',
          health: config.largeMeteor.health,
          rotation: 0,
          rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.enemies.rotationSpeedMin * 0.5, config.enemies.rotationSpeedMax * 0.5), // Slower rotation
          vx: 0,
      });
      nextLargeMeteorScore += config.largeMeteor.spawnScoreInterval;
      console.log("Large Meteor Spawned!");
  }


  function updateEnemies() {
      for (let i = enemies.length - 1; i >= 0; i--) {
          const enemy = enemies[i];

          if (enemy.exploded) {
              // Handle explosion animation
              enemy.frame++;
              // Adjust explosion duration based on type? Currently uses fixed sprite frames.
              if (enemy.frame >= sprites.asteroidExploding.length * 10) { // 10 frames per sprite
                  enemies.splice(i, 1);
              }
              continue; // Skip movement and collision if exploding
          }

          // --- Movement ---
          enemy.y += enemy.speed;
          enemy.rotation += enemy.rotationSpeed;

          if (enemy.type === "large") {
              enemy.x += enemy.vx;
              // Dampen horizontal velocity
              enemy.vx *= 0.98;
               // Wall bouncing for large meteor
               const halfSize = enemy.size / 2;
               if (enemy.x - halfSize < 0 || enemy.x + halfSize > canvas.width) {
                   enemy.vx *= -0.8; // Reverse and dampen
                   enemy.x = Math.max(halfSize, Math.min(canvas.width - halfSize, enemy.x)); // Clamp position
               }
          }

          // Remove if off-screen bottom
          if (enemy.y > canvas.height + enemy.size) {
              enemies.splice(i, 1);
              continue;
          }

          // --- Collision Detection ---

          // Bullet-Enemy Collision
          for (let j = bullets.length - 1; j >= 0; j--) {
              const bullet = bullets[j];
              if (checkCollision({ x: bullet.x, y: bullet.y, size: Math.max(bullet.width, bullet.height) }, enemy)) {
                  handleBulletEnemyCollision(bullet, enemy, i, j);
                  // If enemy was destroyed, break inner loop for this enemy
                  if (enemy.exploded) break;
              }
          }

          // Player-Enemy Collision (only if enemy not already exploding)
          if (!enemy.exploded && checkPlayerEnemyCollision(enemy)) {
              handlePlayerEnemyCollision(enemy, i);
          }
      }
  }

  function handleBulletEnemyCollision(bullet, enemy, enemyIndex, bulletIndex) {
      if (enemy.type === "large") {
          if (!bullet.hasBounced) {
              bullet.hasBounced = true;
              bullet.speed = -bullet.speed * 0.8; // Bounce back, slower
              bullet.transformed = true;
              bullet.transformationTimer = config.bullets.bounceLife;
              createBulletParticles(bullet.x, bullet.y, 5);

              // Apply horizontal impulse based on impact side
              const impactDir = (bullet.x < enemy.x) ? 1 : -1;
              enemy.vx += impactDir * config.largeMeteor.bounceForce * getRandom(0.8, 1.2);

              // Apply damage
              enemy.health--;
              score += config.largeMeteor.pointsPerHit; // Points per hit
              triggerCombo();

              if (enemy.health <= 0) {
                  assetManager.playSound('explosionSound');
                  enemy.exploded = true;
                  enemy.frame = 0; // Start explosion animation
                   createExplosion(enemy.x, enemy.y, config.largeMeteor.explosionParticles); // More particles
                   // Don't remove bullet, it bounced
                   // Score already added per hit, maybe add bonus for destruction?
                   score += 50; // Bonus points
              }
          } else {
              // Bounced bullet hitting large meteor again - destroy bullet
               bullets.splice(bulletIndex, 1);
          }
      } else { // Regular enemy
          assetManager.playSound('explosionSound');
          enemy.exploded = true;
          enemy.frame = 0;
          createExplosion(enemy.x, enemy.y);
          bullets.splice(bulletIndex, 1); // Remove bullet

          score += config.enemies.points * comboCount; // Apply combo multiplier
          triggerCombo();
      }

      updateScoreboard();
      checkHighScore();
  }

  function checkPlayerEnemyCollision(enemy) {
       const playerHitbox = { x: player.x, y: player.y, size: player.size };
       if (shipCount === 1) {
           return checkCollision(playerHitbox, enemy);
       } else { // Check both ships when shipCount is 2
           const offset = player.size * 0.7;
           const leftShipHitbox = { x: player.x - offset, y: player.y, size: player.size };
           const rightShipHitbox = { x: player.x + offset, y: player.y, size: player.size };
           return checkCollision(leftShipHitbox, enemy) || checkCollision(rightShipHitbox, enemy);
       }
   }

  function handlePlayerEnemyCollision(enemy, enemyIndex) {
      if (shieldTime > 0) {
          // Shield active: Destroy enemy, get points, maybe visual feedback
          assetManager.playSound('explosionSound'); // Or a different shield hit sound?
          enemy.exploded = true;
          enemy.frame = 0;
          createExplosion(enemy.x, enemy.y, config.particles.count / 2, config.particles.speed * 0.5, config.particles.life / 2); // Smaller shield explosion
          score += Math.floor(config.enemies.points / 2); // Fewer points for shield hit
          updateScoreboard();
          checkHighScore();
          // Don't reset combo on shield hit
      } else {
          // No shield: Lose life or extra ship
          createExplosion(player.x, player.y, 40, 6); // Player hit explosion

          if (shipCount === 2) {
              shipCount = 1;
              // Add visual/audio feedback for losing ship
               assetManager.playSound('explosionSound'); // Placeholder
          } else {
              lives--;
               assetManager.playSound('explosionSound'); // Placeholder - player death sound?
              updateScoreboard();
              if (lives <= 0) {
                  gameOver();
                  return; // Stop further processing if game over
              }
          }
          // Reset combo on hit
          comboCount = 0;
          comboTimer = 0;
          updateScoreboard();

          // Remove the enemy that hit the player
          enemies.splice(enemyIndex, 1);
           // Add brief invulnerability? (Optional)
      }
  }


  function drawEnemies() {
      enemies.forEach(enemy => {
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
          ctx.rotate(enemy.rotation);

          let spriteData;
          if (enemy.exploded) {
              const frameIndex = Math.min(Math.floor(enemy.frame / 10), sprites.asteroidExploding.length - 1);
              spriteData = sprites.asteroidExploding[frameIndex];
          } else {
              spriteData = sprites.asteroidIntact;
          }

          if (spriteData) {
              ctx.drawImage(
                  assetManager.getSpriteSheet(),
                  spriteData.x, spriteData.y, spriteData.width, spriteData.height,
                  -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size
              );
          }

          ctx.restore();

          // Optional: Draw health bar for large meteor
          if (enemy.type === 'large' && !enemy.exploded && enemy.health < config.largeMeteor.health) {
               const barWidth = enemy.size * 0.8;
               const barHeight = 5;
               const barX = enemy.x - barWidth / 2;
               const barY = enemy.y + enemy.size / 2 + 5; // Below meteor
               const healthPercent = enemy.health / config.largeMeteor.health;

               ctx.fillStyle = '#555'; // Background
               ctx.fillRect(barX, barY, barWidth, barHeight);
               ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : (healthPercent > 0.2 ? '#ff0' : '#f00'); // Color changes with health
               ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
               ctx.strokeStyle = '#fff';
               ctx.strokeRect(barX, barY, barWidth, barHeight);
          }
      });
  }


  // ---- Power-Ups & Special Items ----
  function spawnPowerUp() {
      if (gameActive && !paused && Math.random() < config.powerUps.shieldSpawnChance) {
          powerUps.push({
              type: 'shield',
              x: Math.random() * canvas.width,
              y: -config.powerUps.shieldSize, // Start off-screen top
              size: config.powerUps.shieldSize,
              speed: config.powerUps.shieldSpeed
          });
      }
  }

  function spawnExtraShipPowerup() {
      extraShips.push({
          x: Math.random() * canvas.width,
          y: -config.powerUps.extraShipSize,
          size: config.powerUps.extraShipSize,
          speed: config.powerUps.extraShipSpeed,
          rotation: 0,
          rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * getRandom(config.powerUps.extraShipRotationSpeedMin, config.powerUps.extraShipRotationSpeedMax)
      });
      nextExtraShipScore += config.powerUps.extraShipScoreInterval;
       console.log("Extra Ship Powerup Spawned!");
  }

  function updatePowerUps() {
      // Update Shield Powerups
      for (let i = powerUps.length - 1; i >= 0; i--) {
          const pu = powerUps[i];
          pu.y += pu.speed;

          const playerHitbox = { x: player.x, y: player.y, size: player.size };
          if (checkCollision(playerHitbox, pu)) {
              if (pu.type === 'shield') {
                  shieldTime = config.powerUps.shieldDuration;
                  // Add sound/visual effect for pickup
                   console.log("Shield acquired!");
                   powerUps.splice(i, 1);
              }
          } else if (pu.y > canvas.height + pu.size) {
              powerUps.splice(i, 1); // Remove if off-screen
          }
      }

      // Update Extra Ship Powerups
      for (let i = extraShips.length - 1; i >= 0; i--) {
          const es = extraShips[i];
          es.y += es.speed;
          es.rotation += es.rotationSpeed;

          const playerHitbox = { x: player.x, y: player.y, size: player.size };
          if (checkCollision(playerHitbox, es)) {
              if (shipCount < 2) {
                   shipCount = 2;
                   // Add sound/visual effect
                   console.log("Extra ship acquired!");
              }
              extraShips.splice(i, 1);
          } else if (es.y > canvas.height + es.size) {
              extraShips.splice(i, 1);
          }
      }

      // Check conditions to spawn powerups
      spawnPowerUp(); // Shield has random chance per frame
      if (gameActive && !paused && score >= nextExtraShipScore && shipCount < 2) {
          spawnExtraShipPowerup();
      }
       if (gameActive && !paused && score >= nextLargeMeteorScore) {
          spawnLargeMeteor();
       }
  }

  function drawPowerUps() {
      // Draw Shield Powerups
      powerUps.forEach(pu => {
          if (pu.type === 'shield') {
              ctx.fillStyle = "rgba(0, 150, 255, 0.8)"; // Translucent blue
              ctx.strokeStyle = "#fff";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(pu.x, pu.y, pu.size / 2, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
              // Add pulsating effect?
               ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
               ctx.font = "bold 12px Orbitron";
               ctx.textAlign = "center";
               ctx.textBaseline = "middle";
               ctx.fillText("S", pu.x, pu.y);

          }
      });

      // Draw Extra Ship Powerups
      const shipSprite = sprites.spaceship;
      extraShips.forEach(es => {
          ctx.save();
          ctx.translate(es.x, es.y);
          ctx.rotate(es.rotation);
          ctx.drawImage(
              assetManager.getSpriteSheet(),
              shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height,
              -es.size / 2, -es.size / 2, es.size, es.size
          );
          ctx.restore();
      });
  }


  // ---- Player Drawing & Effects ----
   function drawPlayer() {
        const shipSprite = sprites.spaceship;
        if (!shipSprite || !assetManager.getSpriteSheet()) return; // Guard against missing assets

        if (shipCount === 1) {
            ctx.drawImage(
                assetManager.getSpriteSheet(),
                shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height,
                player.x - player.size / 2, player.y - player.size / 2, player.size, player.size
            );
        } else if (shipCount === 2) {
            const offset = player.size * 0.7; // Same offset as shooting
            ctx.drawImage(
                assetManager.getSpriteSheet(),
                shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height,
                player.x - offset - player.size / 2, player.y - player.size / 2, player.size, player.size
            );
            ctx.drawImage(
                assetManager.getSpriteSheet(),
                shipSprite.x, shipSprite.y, shipSprite.width, shipSprite.height,
                player.x + offset - player.size / 2, player.y - player.size / 2, player.size, player.size
            );
        }
    }

   function drawShield() {
        if (shieldTime <= 0) return;

        shieldHue = (shieldHue + 5) % 360; // Slower cycle
        shieldRotation += 0.05; // Slower rotation
        const shieldLineWidth = 4;
        const shieldColor = `hsl(${shieldHue}, 100%, 60%)`;

        ctx.strokeStyle = shieldColor;
        ctx.lineWidth = shieldLineWidth;
        ctx.shadowColor = shieldColor;
        ctx.shadowBlur = 10;

        let radius;
        if (shipCount === 1) {
            radius = player.size * 0.7; // Slightly larger than ship
        } else {
            // Encompass both ships
            const span = (player.size * 0.7) * 2 + player.size; // Total width occupied by ships
            radius = span * 0.6; // Adjust for visual fit
        }

        const gapAngle = Math.PI / 6; // Smaller gap
        const startAngle = shieldRotation + gapAngle;
        const endAngle = shieldRotation + Math.PI * 2;

        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, startAngle, endAngle);
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;

        // Draw Shield Timer Bar
        const barMaxWidth = 150;
        const barHeight = 15;
        const barX = 20;
        const barY = canvas.height - barHeight - 15;
        const shieldPercent = shieldTime / config.powerUps.shieldDuration;
        const currentBarWidth = barMaxWidth * shieldPercent;

        ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Bar background
        ctx.fillRect(barX, barY, barMaxWidth, barHeight);
        ctx.fillStyle = shieldColor; // Use shield color for fill
        ctx.fillRect(barX, barY, currentBarWidth, barHeight);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barMaxWidth, barHeight);

        // Draw timer text
        ctx.fillStyle = "#fff";
        ctx.font = "14px Orbitron";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(Math.ceil(shieldTime / 60) + "s", barX + barMaxWidth + 10, barY + barHeight / 2);
    }

  // ---- Scoring and Combo ----
  function triggerCombo() {
      comboCount++;
      comboTimer = config.combo.resetFrames;
      updateScoreboard();
  }

  function updateCombo() {
      if (comboCount > 0) {
          comboTimer--;
          if (comboTimer <= 0) {
              comboCount = 0;
              updateScoreboard();
          }
      }
  }

  function checkHighScore() {
      if (score > highScore) {
          highScore = score;
          localStorage.setItem('highScore', highScore);
          updateScoreboard();
      }
  }


  // ---- Game Loop ----
  function updateGame() {
      if (!gameActive || paused) return;
      frameCount++; // Increment frame counter

      // Backgrounds
      updateStarLayers();
      updateNebula();

      // Player related
      createAmbientParticle(); // Spawn based on chance
      if (shieldTime > 0) shieldTime--;
      updateCombo();

      // Game objects
      updateBullets();
      updateEnemies();
      updatePowerUps(); // Includes spawning checks
      updateParticles(particles);
      updateParticles(ambientParticles);
  }

  function drawGame() {
      // Clear canvas
      ctx.fillStyle = '#000'; // Ensure background is black
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background elements
      drawStarLayers();
      drawNebula();

      // Game objects
      drawPowerUps();
      drawEnemies(); // Draw before player/bullets
      drawBullets();
      drawPlayer(); // Draw player on top of most things

      // Effects
      drawParticles(particles); // Explosions etc.
      drawParticles(ambientParticles); // Player trail
      drawShield(); // Draw shield last over player

      // UI is handled by HTML/CSS overlays + scoreboard updates
  }

  function gameLoop(timestamp) {
      if (!gameStarted) return; // Stop loop if game ended abruptly

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
      shipCount = 1;
      nextExtraShipScore = config.powerUps.extraShipScoreInterval;
      nextLargeMeteorScore = config.largeMeteor.spawnScoreInterval;
      currentEnemySpawnRate = config.enemies.spawnRateInitial;
      frameCount = 0;
      lastShotFrame = -config.player.shootCooldown; // Allow immediate first shot


      // Clear game object arrays
      enemies.length = 0;
      bullets.length = 0;
      particles.length = 0;
      ambientParticles.length = 0;
      powerUps.length = 0;
      extraShips.length = 0;

      // Reset player position
      player.x = canvas.width / 2;
      player.y = canvas.height - 100; // Consistent starting position

      updateScoreboard();

      gameActive = true;
      paused = false;
      pauseScreen.style.display = "none"; // Ensure pause screen is hidden

      initStarLayers(); // Reinitialize stars for fresh look

      assetManager.playMusic(); // Start/resume music

      // Start enemy spawning
      scheduleEnemySpawn();

      if (!gameStarted) {
          gameStarted = true;
          requestAnimationFrame(gameLoop); // Start the main loop
      }
  }

  function gameOver() {
      console.log("Game Over!");
      gameActive = false;
       assetManager.stopMusic(); // Stop music
       if (enemySpawnTimerId) clearTimeout(enemySpawnTimerId); // Stop spawning

      // Maybe show a "Game Over" message briefly on canvas?
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "red";
      ctx.font = "bold 48px Orbitron";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
       ctx.font = "24px Orbitron";
       ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);


      // Show start screen again after a delay
      setTimeout(() => {
          startScreen.style.display = "flex";
          startMessage.innerHTML = "<strong>Click anywhere to RESTART</strong>";
          startMessage.classList.add('ready'); // Ensure clickable
          gameStarted = false; // Allow gameLoop to fully stop
      }, 3000); // 3 second delay
  }

  // ---- Initialization ----
  function init() {
      setupCanvas();
      setupUI();

      // Start loading assets and provide callback
      assetManager.loadAssets(() => {
          // This runs when all assets are loaded
          startMessage.innerHTML = "<strong>Click anywhere to START</strong>";
          startMessage.classList.add('ready'); // Make it obvious it's clickable
          // Optionally, draw a static frame or logo while waiting for click
          drawInitialFrame(); // Draw stars etc. once loaded
      });
  }

    // Draw a static background frame while waiting for the user to start
    function drawInitialFrame() {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (!starLayers.foreground.length) initStarLayers(); // Init if needed
        drawStarLayers();
        // Maybe draw player ship dimmed?
    }

  // Start the setup process when the DOM is ready
  window.addEventListener('DOMContentLoaded', init);

})(); // End of IIFE
