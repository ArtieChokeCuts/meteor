// === Space Shooter Game (Full, Fixed JS) ===
// -- Configurations --
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
    explosionParticles: 20,
  },
  particles: {
    count: 12,
    size: 3,
    speed: 4,
    lifetime: 30,
  },
  bosses: {
    health: 40,
    burstFireInterval: 40,
    laserInterval: 60,
    moveSpeed: 5,
  },
  levelDuration: 30 * 60, // 30 seconds at 60 FPS
};

// -- Canvas Setup --
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// -- Assets --
const shipImg = new Image();
shipImg.src = 'ships_drone.png'; // Add the correct path if needed

const laserSound = new Audio('laser.mp3');
const droneSound = new Audio('drone.mp3');

// -- Game State --
let keys = {};
let bullets = [];
let meteors = [];
let particles = [];
let enemyShips = [];
let bosses = [];
let score = 0;
let level = 1;
let bossPhase = false;
let levelTimer = 0;
let bossHealthBars = [];
let gameOver = false;

// -- Player --
const player = {
  x: canvas.width / 2,
  y: canvas.height - 100,
  size: config.player.size,
  cooldown: 0,
  lives: 3,
  invincible: 0,
  sprite: 0, // Ship 1
};

function drawPlayer() {
  // Draw the player ship (cropped sprite)
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.drawImage(
    shipImg,
    0, 0, 64, 64, // Source
    -player.size / 2, -player.size / 2, player.size, player.size // Dest
  );
  ctx.restore();
}

// -- Bullet Logic --
function shootBullet() {
  if (player.cooldown === 0) {
    bullets.push({
      x: player.x,
      y: player.y - player.size / 2,
      width: config.bullets.width,
      height: config.bullets.height,
      speed: config.bullets.speed,
    });
    laserSound.currentTime = 0;
    laserSound.play();
    player.cooldown = config.player.shootCooldown;
  }
}

function updateBullets() {
  for (let b = bullets.length - 1; b >= 0; b--) {
    let bullet = bullets[b];
    bullet.y -= bullet.speed;
    if (bullet.y < -bullet.height) bullets.splice(b, 1);
  }
}

function drawBullets() {
  ctx.save();
  ctx.fillStyle = config.bullets.color;
  bullets.forEach(b => {
    ctx.fillRect(b.x - b.width / 2, b.y, b.width, b.height);
  });
  ctx.restore();
}

// -- Meteor Logic --
function spawnMeteor() {
  const size = config.enemies.size;
  const x = Math.random() * (canvas.width - size) + size / 2;
  meteors.push({
    x,
    y: -size,
    size,
    speed: config.enemies.speed + Math.random() * 2,
    rotation: Math.random() * 2 * Math.PI,
    rotationSpeed:
      config.enemies.rotationSpeedMin +
      Math.random() * (config.enemies.rotationSpeedMax - config.enemies.rotationSpeedMin),
    health: 1,
    large: false,
  });
}

// Large meteors every X score
function spawnLargeMeteor() {
  const size = config.enemies.size * config.largeMeteor.sizeMultiplier;
  const x = Math.random() * (canvas.width - size) + size / 2;
  meteors.push({
    x,
    y: -size,
    size,
    speed: config.enemies.speed + 0.5,
    rotation: Math.random() * 2 * Math.PI,
    rotationSpeed:
      config.enemies.rotationSpeedMin +
      Math.random() * (config.enemies.rotationSpeedMax - config.enemies.rotationSpeedMin),
    health: config.largeMeteor.health,
    large: true,
  });
}

function updateMeteors() {
  for (let i = meteors.length - 1; i >= 0; i--) {
    let m = meteors[i];
    m.y += m.speed;
    m.rotation += m.rotationSpeed;
    // Remove off-screen
    if (m.y > canvas.height + m.size) {
      meteors.splice(i, 1);
      continue;
    }
    // Collisions with bullets
    for (let b = bullets.length - 1; b >= 0; b--) {
      let bullet = bullets[b];
      if (
        bullet.x > m.x - m.size / 2 &&
        bullet.x < m.x + m.size / 2 &&
        bullet.y > m.y - m.size / 2 &&
        bullet.y < m.y + m.size / 2
      ) {
        bullets.splice(b, 1);
        m.health -= 1;
        if (m.large) score += config.largeMeteor.pointsPerHit;
        if (m.health <= 0) {
          createExplosion(m.x, m.y, m.size);
          score += m.large ? config.largeMeteor.pointsPerHit * 2 : config.enemies.points;
          meteors.splice(i, 1);
        }
        break;
      }
    }
    // Collisions with player
    if (
      Math.abs(m.x - player.x) < (m.size + player.size) / 2 &&
      Math.abs(m.y - player.y) < (m.size + player.size) / 2
    ) {
      if (!player.invincible) {
        player.lives--;
        player.invincible = 90;
        if (player.lives <= 0) gameOver = true;
      }
      meteors.splice(i, 1);
      continue;
    }
  }
}

function drawMeteors() {
  meteors.forEach(m => {
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(m.rotation);
    ctx.fillStyle = m.large ? "#555" : "#888";
    ctx.beginPath();
    ctx.arc(0, 0, m.size / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  });
}

// -- Particle Effects --
function createExplosion(x, y, size) {
  for (let i = 0; i < config.particles.count; i++) {
    let angle = (2 * Math.PI * i) / config.particles.count;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * config.particles.speed * (Math.random() + 0.5),
      vy: Math.sin(angle) * config.particles.speed * (Math.random() + 0.5),
      lifetime: config.particles.lifetime,
      size: config.particles.size + Math.random() * 2,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.lifetime--;
    if (p.lifetime <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  ctx.save();
  ctx.fillStyle = "#ff0";
  particles.forEach(p => {
    ctx.globalAlpha = p.lifetime / config.particles.lifetime;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();
}

// -- Enemy Boss Ships --
function spawnBossShips() {
  bossPhase = true;
  let bossSetup = getBossSetup(level);
  bosses = [];
  bossHealthBars = [];
  for (let i = 0; i < bossSetup.length; i++) {
    let { type } = bossSetup[i];
    let sx = canvas.width / 2;
    let sy =
      60 + i * config.player.shipFormationOffsetY + 40 * (i > 0 ? 1 : 0);
    bosses.push({
      x: sx,
      y: sy,
      type, // 2: burst, 3: laser
      width: config.enemies.size,
      height: config.enemies.size,
      direction: i % 2 === 0 ? 1 : -1,
      speed: config.bosses.moveSpeed + i * 1.5,
      health: config.bosses.health + 10 * level,
      cooldown: 0,
      laserTimer: 0,
      burstTimer: 0,
    });
    bossHealthBars.push(config.bosses.health + 10 * level);
  }
}

function getBossSetup(level) {
  // Example: Level 1: 1 ship2, Level 2: 1 ship3, Level 3: 1 ship2 + 1 ship3, etc.
  let setup = [];
  if (level === 1) setup.push({ type: 2 });
  else if (level === 2) setup.push({ type: 3 });
  else {
    let twos = Math.floor((level + 1) / 2);
    let threes = Math.floor(level / 2);
    for (let i = 0; i < twos; i++) setup.push({ type: 2 });
    for (let i = 0; i < threes; i++) setup.push({ type: 3 });
  }
  return setup;
}

function updateBossShips() {
  for (let i = bosses.length - 1; i >= 0; i--) {
    let boss = bosses[i];
    boss.x += boss.direction * boss.speed;
    // Bounce off screen
    if (boss.x < boss.width / 2 || boss.x > canvas.width - boss.width / 2) {
      boss.direction *= -1;
      boss.x = Math.max(
        boss.width / 2,
        Math.min(boss.x, canvas.width - boss.width / 2)
      );
    }
    // Shoot pattern
    if (boss.type === 2) {
      // Burst fire
      boss.burstTimer++;
      if (boss.burstTimer >= config.bosses.burstFireInterval) {
        enemyShips.push({
          x: boss.x,
          y: boss.y + boss.height / 2,
          width: 8,
          height: 20,
          speed: 8 + Math.random() * 2,
          color: 'orange',
          direction: 1,
        });
        droneSound.currentTime = 0;
        droneSound.play();
        boss.burstTimer = 0;
      }
    } else if (boss.type === 3) {
      // Laser fire
      boss.laserTimer++;
      if (boss.laserTimer >= config.bosses.laserInterval) {
        enemyShips.push({
          x: boss.x,
          y: boss.y + boss.height / 2,
          width: 5,
          height: 30,
          speed: 13,
          color: 'red',
          direction: 1,
        });
        laserSound.currentTime = 0;
        laserSound.play();
        boss.laserTimer = 0;
      }
    }
    // Collisions with player
    if (
      Math.abs(boss.x - player.x) < (boss.width + player.size) / 2 &&
      Math.abs(boss.y - player.y) < (boss.height + player.size) / 2
    ) {
      if (!player.invincible) {
        player.lives--;
        player.invincible = 90;
        if (player.lives <= 0) gameOver = true;
      }
    }
    // Collisions with bullets
    for (let b = bullets.length - 1; b >= 0; b--) {
      let bullet = bullets[b];
      if (
        bullet.x > boss.x - boss.width / 2 &&
        bullet.x < boss.x + boss.width / 2 &&
        bullet.y > boss.y - boss.height / 2 &&
        bullet.y < boss.y + boss.height / 2
      ) {
        bullets.splice(b, 1);
        boss.health -= 2;
        if (boss.health <= 0) {
          createExplosion(boss.x, boss.y, boss.width);
          score += 100 * level;
          bosses.splice(i, 1);
        }
        break;
      }
    }
  }
  // Boss phase over?
  if (bosses.length === 0) {
    bossPhase = false;
    level++;
    levelTimer = 0;
    // Next level: heal player a bit, increase difficulty
    player.lives = Math.min(player.lives + 1, 5);
  }
}

function drawBossShips() {
  bosses.forEach((boss, i) => {
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.PI); // Face downwards
    let sx = boss.type === 2 ? 64 : 128;
    ctx.drawImage(shipImg, sx, 0, 64, 64, -boss.width / 2, -boss.height / 2, boss.width, boss.height);
    ctx.restore();
    // Draw health bar
    ctx.fillStyle = "#f00";
    ctx.fillRect(boss.x - 30, boss.y - boss.height / 2 - 14, 60, 8);
    ctx.fillStyle = "#0f0";
    ctx.fillRect(boss.x - 30, boss.y - boss.height / 2 - 14, (boss.health / (config.bosses.health + 10 * level)) * 60, 8);
    ctx.strokeStyle = "#222";
    ctx.strokeRect(boss.x - 30, boss.y - boss.height / 2 - 14, 60, 8);
  });
}

// -- Enemy Bullets --
function updateEnemyShips() {
  for (let i = enemyShips.length - 1; i >= 0; i--) {
    let e = enemyShips[i];
    e.y += e.speed;
    // Hit player?
    if (
      e.x > player.x - player.size / 2 &&
      e.x < player.x + player.size / 2 &&
      e.y > player.y - player.size / 2 &&
      e.y < player.y + player.size / 2
    ) {
      if (!player.invincible) {
        player.lives--;
        player.invincible = 90;
        if (player.lives <= 0) gameOver = true;
      }
      enemyShips.splice(i, 1);
      continue;
    }
    // Offscreen
    if (e.y > canvas.height + e.height) {
      enemyShips.splice(i, 1);
      continue;
    }
  }
}

function drawEnemyShips() {
  enemyShips.forEach(e => {
    ctx.save();
    ctx.fillStyle = e.color || 'orange';
    ctx.fillRect(e.x - e.width / 2, e.y, e.width, e.height);
    ctx.restore();
  });
}

// -- Main Loop --
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameOver) {
    // Background
    ctx.save();
    ctx.fillStyle = "#000";
    ctx.globalAlpha = 0.5;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Update entities
    if (!bossPhase) {
      // Regular level
      levelTimer++;
      if (levelTimer % Math.max(config.enemies.spawnRateInitial - level * config.enemies.spawnRateScoreFactor, config.enemies.minSpawnRate) === 0) {
        spawnMeteor();
      }
      if (score > 0 && score % config.largeMeteor.spawnScoreInterval === 0) {
        spawnLargeMeteor();
      }
    } else {
      // Boss phase, no regular meteors
      updateBossShips();
      drawBossShips();
    }
    updateBullets();
    updateMeteors();
    updateParticles();
    updateEnemyShips();

    // Draw entities
    drawMeteors();
    drawParticles();
    drawBullets();
    drawEnemyShips();
    drawPlayer();

    // Player invincibility
    if (player.invincible) player.invincible--;

    // UI
    ctx.fillStyle = "#fff";
    ctx.font = "24px Arial";
    ctx.fillText(`Score: ${score}`, 30, 40);
    ctx.fillText(`Lives: ${player.lives}`, 30, 70);
    ctx.fillText(`Level: ${level}`, 30, 100);

    // Level/boss transition
    if (!bossPhase && levelTimer > config.levelDuration) {
      spawnBossShips();
    }
  } else {
    // Game Over
    ctx.fillStyle = "#f00";
    ctx.font = "bold 64px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 200, canvas.height / 2);
    ctx.font = "32px Arial";
    ctx.fillStyle = "#fff";
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 100, canvas.height / 2 + 50);
  }

  // Player cooldown
  if (player.cooldown > 0) player.cooldown--;

  requestAnimationFrame(gameLoop);
}

// -- Controls --
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') shootBullet();
});
window.addEventListener('keyup', e => (keys[e.code] = false));

function handlePlayerMovement() {
  if (keys['ArrowLeft'] || keys['KeyA']) player.x -= 9;
  if (keys['ArrowRight'] || keys['KeyD']) player.x += 9;
  if (keys['ArrowUp'] || keys['KeyW']) player.y -= 7;
  if (keys['ArrowDown'] || keys['KeyS']) player.y += 7;
  // Boundaries
  player.x = Math.max(player.size / 2, Math.min(canvas.width - player.size / 2, player.x));
  player.y = Math.max(player.size / 2, Math.min(canvas.height - player.size / 2, player.y));
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  player.x = canvas.width / 2;
  player.y = canvas.height - 100;
}
window.addEventListener('resize', resizeCanvas);

// -- Main Init --
function main() {
  resizeCanvas();
  setInterval(handlePlayerMovement, 16);
  requestAnimationFrame(gameLoop);
}

shipImg.onload = main;
