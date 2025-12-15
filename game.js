<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>FPS Target Shooter with Explosions</title>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      overflow: hidden;
      font-family: 'Orbitron', sans-serif;
      background: linear-gradient(to bottom, #0a0a2a, #1a1a4a);
      color: white;
      touch-action: none;
      height: 100vh;
    }
    canvas { position: absolute; top: 0; left: 0; display: block; }
    canvas.webgl { z-index: 0; }
    canvas#hud { z-index: 1; pointer-events: none; }

    /* Original LOADING & START/OVER SCREENS Styles (some will be overridden or complemented by new CSS) */
    #loading, #start-screen, #game-over {
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; display: none;
      flex-direction: column; justify-content: center; align-items: center;
      z-index: 10;
      text-align: center;
      background: rgba(0, 0, 20, 0.95);
    }
    #loading { display: flex; } /* This will be styled further by new CSS */
    
    #start-screen { display: none; } /* Initially hidden, shown after loading */
    h1, h2 { text-shadow: 0 0 15px currentColor; }
    #start-screen h1 { 
      font-size: 4rem; 
      color: #00ffcc; 
      margin-bottom:2rem;
      text-transform: uppercase;
      letter-spacing: 3px;
      background: linear-gradient(to right, #00ffcc, #0066ff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    #start-button, #restart-button {
      background: #0066ff; color: #fff; border:none;
      padding:15px 40px; font-size:1.5rem; border-radius:30px;
      cursor:pointer; letter-spacing:2px; text-transform:uppercase;
      box-shadow:0 0 15px #0066ff; transition:all .3s;
      font-family: 'Orbitron', sans-serif;
      margin: 20px 0;
      position: relative;
      overflow: hidden;
    }
    #start-button:hover, #restart-button:hover {
      transform: scale(1.1); box-shadow:0 0 25px #00ffcc;
      background: #00aaff;
    }
    #start-button:before, #restart-button:before {
      content: '';
      position: absolute;
      top: -10px; left: -10px;
      right: -10px; bottom: -10px;
      background: linear-gradient(45deg, #00ffcc, #0066ff, #00ffcc);
      z-index: -1;
      filter: blur(10px);
      opacity: 0.7;
      animation: border-pulse 3s infinite linear;
    }
    @keyframes border-pulse {
      0% { transform: scale(1); opacity: 0.7; }
      50% { transform: scale(1.05); opacity: 0.9; }
      100% { transform: scale(1); opacity: 0.7; }
    }

    #game-over { display:none; }
    #game-over h2 { 
      font-size:5rem; 
      color:#ff0066; 
      margin-bottom:2rem;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    #final-score { 
      font-size:2.5rem; 
      color:#00ffcc; 
      margin-bottom:3rem;
      text-shadow: 0 0 10px #00ffcc;
    }
    #instructions { 
      position:absolute; 
      bottom:20px; 
      color:#aaa; 
      font-size:1rem; 
      text-align:center; 
      width:100%; 
      max-width:500px; 
      padding:0 20px;
      line-height: 1.6;
    }
    #instructions p { 
      margin-top: 0.5em; 
      background: rgba(0, 102, 255, 0.2);
      padding: 8px 15px;
      border-radius: 15px;
      border: 1px solid #00aaff;
    }
    
    #mobile-controls {
      position: fixed; bottom: 20px; width: 100%; display: none; 
      justify-content: space-between; padding: 0 20px; z-index: 2;
    }
    .mobile-btn {
      width: 80px; height: 80px; border-radius: 50%;
      background: rgba(0, 102, 255, 0.3); border: 2px solid #00ccff;
      color: white; display: flex; justify-content: center; align-items: center;
      font-size: 1.2rem; user-select: none; -webkit-user-select: none;
      touch-action: manipulation; box-shadow: 0 0 15px rgba(0, 204, 255, 0.5);
      transition: all 0.2s;
    }
    .mobile-btn:active { transform: scale(0.9); background: rgba(0, 204, 255, 0.5); }
    
    #level-up {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(1); 
      font-size: 3rem; color: #ff00ff; text-shadow: 0 0 20px #ff00ff;
      z-index: 20; opacity: 0; transition: opacity 0.5s, transform 0.5s;
      pointer-events: none; font-weight: bold; text-transform: uppercase;
    }
    
    #combo-display {
      position: fixed; top: 30%; left: 50%;
      transform: translate(-50%, -50%);
      font-size: 2.5rem; color: #ff00ff; text-shadow: 0 0 15px #ff00ff;
      z-index: 20; opacity: 0; transition: opacity 0.3s, transform 0.3s;
      pointer-events: none; font-weight: bold;
    }

    /* CSS from deepseek_css_20250621_21b96f.css (Loading Screen Enhancements) */
    #loading h1 { /* Overrides existing #loading h1 for new loading screen */
      color: #00ffcc; 
      text-shadow: 0 0 10px #00ffcc; 
      margin-bottom: 2rem;
      font-size: 2.5rem;
      animation: pulse 1.5s infinite alternate;
    }
    @keyframes pulse { /* Already defined, kept for clarity */
      from { transform: scale(1); }
      to { transform: scale(1.05); text-shadow: 0 0 20px #00ffcc; }
    }
    .loading-content {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; height: 100%; padding: 20px; text-align: center;
    }
    .progress-container { width: 80%; max-width: 400px; margin: 30px 0; }
    .progress-bar { /* Overrides/complements original .progress-bar if any */
      height: 20px; background: rgba(0, 40, 80, 0.5);
      border-radius: 10px; overflow: hidden; position: relative;
      box-shadow: 0 0 10px rgba(0, 150, 255, 0.3);
    }
    .progress { /* Complements original .progress */
      height: 100%; background: linear-gradient(90deg, #0066ff, #00ffcc);
      width: 0%; transition: width 0.3s ease-out; position: relative; z-index: 1;
    }
    .progress-glow {
      position: absolute; top: 0; left: 0; height: 100%; width: 100%;
      background: linear-gradient(90deg, 
        rgba(0, 200, 255, 0.4) 0%, 
        rgba(0, 255, 200, 0.7) 50%, 
        rgba(0, 200, 255, 0.4) 100%);
      background-size: 200% 100%; animation: progress-glow 2s linear infinite;
      opacity: 0.7;
    }
    @keyframes progress-glow {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .loading-text {
      margin-top: 10px; color: #00aaff; font-size: 14px;
      text-shadow: 0 0 5px rgba(0, 170, 255, 0.5);
    }
    .hint {
      position: absolute; bottom: 30px; color: rgba(255, 255, 255, 0.6);
      font-size: 12px; animation: pulse 2s infinite; /* Uses existing pulse animation */
    }

    /* CSS for Orientation Warning (from deepseek_javascript_20250621_d7b310.js) */
    #orientation-warning {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.95); z-index: 1000; /* High z-index */
      display: none; justify-content: center; align-items: center;
      font-size: 1.8rem; color: #ff5555; text-align: center; padding: 20px;
    }
        
    @media (max-width: 768px) {
      #mobile-controls { display: flex; }
      #instructions { bottom: 120px; }
      #start-screen h1 { font-size: 2.5rem; }
      #game-over h2 { font-size: 3rem; }
      #final-score { font-size: 2rem; }
      #start-button, #restart-button { padding: 12px 30px; font-size: 1.2rem; }
      #level-up { font-size: 2rem; }
      #combo-display { font-size: 1.8rem; }
      #orientation-warning { font-size: 1.5rem; } /* Responsive font for warning */
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
</head>
<body>
  <!-- Replaced loading div (from deepseek_html_20250621_a3137d.html) -->
  <div id="loading">
    <div class="loading-content">
      <h1>EXPLOSIVE TARGET SHOOTER</h1>
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress" id="progress"></div>
          <div class="progress-glow"></div>
        </div>
        <div class="loading-text" id="loading-text">LOADING ASSETS...</div>
      </div>
      <div class="hint">TAP START MISSION TO ENTER FULLSCREEN</div>
    </div>
  </div>

  <div id="start-screen">
    <h1>EXPLOSIVE TARGET SHOOTER</h1>
    <button id="start-button">START MISSION</button>
    <div id="instructions">
      <p>CLICK & DRAG or A/D KEYS to Strafe</p>
      <p>TAP CENTER to Shoot | DOUBLE-CLICK to Reload</p>
      <p>SHOOT RED ENEMIES • AVOID GREEN POWER-UPS</p>
      <p>WATCH TARGETS EXPLODE ON HIT!</p>
    </div>
  </div>

  <div id="game-over">
    <h2>MISSION FAILED</h2>
    <div id="final-score">SCORE: 0</div>
    <button id="restart-button">TRY AGAIN</button>
  </div>

  <div id="level-up">LEVEL UP!</div>
  <div id="combo-display">COMBO x0</div>
  
  <div id="mobile-controls">
    <div class="mobile-btn" id="left-btn">←</div>
    <div class="mobile-btn" id="shoot-btn">FIRE</div>
    <div class="mobile-btn" id="right-btn">→</div>
  </div>

  <!-- Added Orientation Warning div -->
  <div id="orientation-warning">
    <div>Please rotate your device to landscape mode to play.</div>
  </div>

  <canvas id="hud"></canvas>

  <script>
  let targets = [];
  let projectiles = [];
  let explosions = [];
  let gameRunningGlobal = false; // Global flag for orientation handling
  let animateLights = () => {}; // Placeholder for tunnel light animation

  // New generateEnemySpriteSheet (from deepseek_javascript_20250621_a4ba2f.js)
  function generateEnemySpriteSheet() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cols = 8; // More frames
    const frameWidth = 256; // Higher resolution
    const frameHeight = 256;
    
    canvas.width = frameWidth * cols;
    canvas.height = frameHeight;
    
    const gradient = ctx.createRadialGradient(
      frameWidth/2, frameHeight/2, frameWidth/4,
      frameWidth/2, frameHeight/2, frameWidth/2.5
    );
    gradient.addColorStop(0, 'rgba(255,50,50,0.8)');
    gradient.addColorStop(0.7, 'rgba(200,0,0,0.5)');
    gradient.addColorStop(1, 'rgba(100,0,0,0)');

    for (let i = 0; i < cols; i++) {
      const x = i * frameWidth;
      const pulse = Math.sin(i/cols * Math.PI * 2) * 0.3 + 0.7; // Sine pulse for size
      
      ctx.fillStyle = gradient; // Outer glow
      ctx.beginPath();
      ctx.arc(x + frameWidth/2, frameHeight/2, frameWidth/2.5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = `rgba(255,${50*pulse},${50*pulse},0.9)`; // Main body with color pulse
      ctx.beginPath();
      ctx.arc(x + frameWidth/2, frameHeight/2, frameWidth/3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      
      const coreGrad = ctx.createRadialGradient(
        x + frameWidth/2, frameHeight/2, 0,
        x + frameWidth/2, frameHeight/2, frameWidth/6
      );
      coreGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
      coreGrad.addColorStop(1, 'rgba(200,200,255,0.5)');
      
      ctx.fillStyle = coreGrad; // Core
      ctx.beginPath();
      ctx.arc(x + frameWidth/2, frameHeight/2, frameWidth/6, 0, Math.PI * 2);
      ctx.fill();
    }
    return canvas.toDataURL('image/png');
  }
  
  function createExplosion(x, y, z) { /* Remains as in base index.html */
    const explosion = {
      particles: [], position: new THREE.Vector3(x, y, z), timer: 30, active: true
    };
    const colors = [0xff0000, 0xff6600, 0xffff00, 0xffffff];
    for (let i = 0; i < 20; i++) {
      const particleGeom = new THREE.SphereGeometry(0.15, 6, 6);
      const particleMat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)], transparent: true, opacity: 1.0
      });
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.position.set(x, y, z);
      particle.userData = {
        velocity: new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5))
                  .normalize().multiplyScalar(Math.random() * 0.15 + 0.05),
      };
      explosion.particles.push(particle);
    }
    return explosion;
  }

  // Orientation Handling (from deepseek_javascript_20250621_d7b310.js)
  function handleOrientation() {
    const orientationWarningEl = document.getElementById('orientation-warning');
    if (!orientationWarningEl) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    
    if (isPortrait) {
      orientationWarningEl.style.display = 'flex';
      gameRunningGlobal = false; // Use the global flag to pause the game logic
    } else {
      orientationWarningEl.style.display = 'none';
      // If the game was paused by orientation and now it's landscape,
      // and the start screen is hidden (meaning game was active or intended to be)
      // we can set gameRunningGlobal to true. The animation loop will pick it up.
      // This doesn't re-call initGame, just allows the loop to resume game logic.
      if (!gameRunningGlobal && window.renderer && !document.getElementById('start-screen').style.display.includes('flex')) {
         // Check if a game was actually initialized (renderer exists)
         // and start screen is not visible (meaning game was in progress or past start screen)
         gameRunningGlobal = true;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const loading   = document.getElementById('loading');
    const progress  = document.getElementById('progress');
    const loadingText = document.getElementById('loading-text'); // For new loading screen
    const startScr  = document.getElementById('start-screen');
    const gameOver  = document.getElementById('game-over');
    const startBtn  = document.getElementById('start-button');
    const restartBtn= document.getElementById('restart-button');

    // Fullscreen on Start (from deepseek_javascript_20250621_bdcfb1.js)
    const startFullscreen = () => {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(e => console.warn("Fullscreen request failed:", e));
      } else if (elem.webkitRequestFullscreen) { /* Safari */
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) { /* IE11 */
        elem.msRequestFullscreen();
      }
    };

    let p=0, iv = setInterval(()=>{
      p += Math.random()*12;
      if (loadingText) loadingText.textContent = `LOADING ASSETS... ${Math.min(100, Math.round(p))}%`;
      if(p>=100){ p=100; clearInterval(iv);
        setTimeout(()=>{
          loading.style.opacity='0';
          setTimeout(()=>{
            loading.style.display='none';
            if (startScr) startScr.style.display='flex'; // Check if startScr exists
          },600); 
        },300);
      }
      if (progress) progress.style.width = Math.min(100,p)+'%'; // Ensure progress doesn't exceed 100% visually
    },150); 

    if (startBtn) {
        startBtn.onclick = () => {
          if (startScr) startScr.style.display = 'none';
          startFullscreen();
          setTimeout(initGame, 100); // Small delay
        };
    }
    if (restartBtn) {
        restartBtn.onclick = ()=>{ if (gameOver) gameOver.style.display='none'; initGame(); }
    }
    
    window.showGameOver = () => {
        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) finalScoreEl.textContent = `SCORE: ${window.finalScore || 0}`;
        if (gameOver) gameOver.style.display='flex';
    };

    // Initial orientation check and listeners
    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);
  });

  // New Tunnel Effect (from deepseek_javascript_20250621_d15e36.js)
  // Needs access to 'scene' and 'THREE' from initGame scope. So, define it inside initGame or pass scene.
  // For simplicity, it will be defined inside initGame.

  function initGame(){
    let scene = new THREE.Scene(); // scene is local to initGame

    // Function createTunnel (defined inside initGame to access its 'scene')
    function createTunnel() {
      const tunnelGeometry = new THREE.CylinderGeometry(50, 50, 300, 64, 1, true);
      const tunnelTextureLoader = new THREE.TextureLoader(); // Use the game's main textureLoader if preferred
      const tunnelTexture = tunnelTextureLoader.load('tunnel_texture.jpg', 
        undefined, // onLoad
        undefined, // onProgress
        (err) => { console.warn("Tunnel texture not found or failed to load.", err)} // onError
      );
      tunnelTexture.wrapS = THREE.RepeatWrapping;
      tunnelTexture.wrapT = THREE.RepeatWrapping;
      tunnelTexture.repeat.set(8, 1);
      
      const tunnelMaterial = new THREE.MeshPhongMaterial({
        map: tunnelTexture, transparent: true, opacity: 0.8, side: THREE.BackSide,
        specular: 0x222222, shininess: 30
      });
      
      const tunnelMesh = new THREE.Mesh(tunnelGeometry, tunnelMaterial);
      tunnelMesh.position.z = -150;
      scene.add(tunnelMesh);

      const light1 = new THREE.PointLight(0x0066ff, 2, 100);
      light1.position.set(15, 5, -50); scene.add(light1);
      const light2 = new THREE.PointLight(0xff6600, 2, 100);
      light2.position.set(-15, 5, -80); scene.add(light2);

      return function animateTunnelLights(time) { // Return the animation function
        light1.intensity = 1.5 + Math.sin(time * 0.002) * 0.5;
        light2.intensity = 1.5 + Math.cos(time * 0.003) * 0.5;
        light1.position.z = -50 + Math.sin(time * 0.001) * 20;
        light2.position.z = -80 + Math.cos(time * 0.0015) * 20;
      };
    }


    if(window.renderer){ /* Cleanup logic remains largely the same */
      cancelAnimationFrame(window.animId);
      if (window.renderer.domElement.parentNode) document.body.removeChild(window.renderer.domElement);
      targets.forEach(t => { 
          if (t.userData && t.userData.animInterval) { clearInterval(t.userData.animInterval); t.userData.animInterval = null; }
          if (t.geometry) t.geometry.dispose();
          if (t.material) { if (t.material.map) t.material.map.dispose(); t.material.dispose(); }
      });
      projectiles.forEach(p => {
          if (p.geometry) p.geometry.dispose(); if (p.material) p.material.dispose();
      });
      explosions.forEach(e => e.particles.forEach(particleMesh => {
          if (particleMesh.parent) particleMesh.parent.remove(particleMesh);
          if (particleMesh.geometry) particleMesh.geometry.dispose();
          if (particleMesh.material) particleMesh.material.dispose();
      }));
      window.renderer.dispose();
    }

    targets = []; projectiles = []; explosions = [];
    gameRunningGlobal = true; // Set game to running state

    scene.background = new THREE.Color(0x111133);
    scene.fog = new THREE.FogExp2(0x111133, 0.02);

    const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
    camera.position.set(0,2,5);
    window.camera = camera; // Make camera globally accessible for resize

    const renderer = new THREE.WebGLRenderer({ antialias:true, alpha: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.domElement.classList.add('webgl');
    document.body.appendChild(renderer.domElement);
    window.renderer = renderer; // Make renderer globally accessible for resize & cleanup

    const hudCanvas = document.getElementById('hud');
    hudCanvas.width  = innerWidth;
    hudCanvas.height = innerHeight;
    const ctx = hudCanvas.getContext('2d');
    
    let health = 100, score = 0, penalties = 0;
    let ammo = 15, maxAmmo = 15;
    let lane = 0; // Game logic controls lane based on camera.position.x
    let lastSpawnTime = 0, spawnInterval = 2000;
    let difficulty = 1;
    let combo = 0, lastHitTime = 0;
    let level = 1, scoreToNextLevel = 100;
    let levelUpDisplayTime = 0;
    let comboDisplayTime = 0;

    const textureLoader = new THREE.TextureLoader();
    const enemySpriteSheetDataUrl = generateEnemySpriteSheet();

    scene.add(new THREE.AmbientLight(0x404040, 1.2));
    const d1 = new THREE.DirectionalLight(0xffffff, 1);
    d1.position.set(5,10,5); scene.add(d1);
    // Tunnel lights are added by createTunnel()
    
    const muzzleFlash = new THREE.PointLight(0xffff00, 0, 10);
    muzzleFlash.position.set(0,0,-0.5); // Position relative to camera front
    camera.add(muzzleFlash);
    if (!camera.parent) scene.add(camera); // Ensure camera is in scene if lights are parented to it

    const grid = new THREE.GridHelper(300,60,0x00ff88,0x224444);
    scene.add(grid);
    
    animateLights = createTunnel(); // Initialize new tunnel and get its animation function
    
    function createTarget(isEnemy) { /* Base logic with updated COLS for enemy */
      const laneX = (Math.floor(Math.random() * 3) - 1) * 6;
      const zPos = -(Math.random() * 40 + 60);
    
      if (!isEnemy) { /* Power-up remains same */
        const geometry = new THREE.CylinderGeometry(1, 1, 2, 24);
        const material = new THREE.MeshPhongMaterial({
          color: 0x00ff00, emissive: 0x003300, shininess: 80, transparent: true, opacity: 0.7
        });
        const powerUpMesh = new THREE.Mesh(geometry, material);
        powerUpMesh.position.set(laneX, 1, zPos);
        powerUpMesh.userData = { type: 'powerup', hit: false, timer: 0 };
        scene.add(powerUpMesh); targets.push(powerUpMesh);
        return powerUpMesh;
      } else { // Enemy
        const geometry = new THREE.CylinderGeometry(1, 1, 3, 32, 1, true); 
        const enemyMaterial = new THREE.MeshBasicMaterial({
          transparent: true, opacity: 1.0, side: THREE.DoubleSide, depthWrite: true 
        });
        const enemyMesh = new THREE.Mesh(geometry, enemyMaterial);
        enemyMesh.position.set(laneX, 1.5, zPos);
        enemyMesh.userData = { type: 'enemy', hit: false, timer: 0, animInterval: null }; 
        
        textureLoader.load( enemySpriteSheetDataUrl,
            function ( loadedRootTexture ) {
                const textureForThisEnemy = loadedRootTexture.clone();
                textureForThisEnemy.needsUpdate = true;
                const COLS = 8; // MODIFIED: Use 8 columns for the new sprite sheet
                const uW = 1 / COLS;
                let currentFrame = Math.floor(Math.random() * COLS);
                textureForThisEnemy.repeat.set(uW, 1);
                textureForThisEnemy.offset.set(currentFrame * uW, 0);
                textureForThisEnemy.wrapS = THREE.ClampToEdgeWrapping;
                textureForThisEnemy.wrapT = THREE.ClampToEdgeWrapping;
        
                if (enemyMesh.material) {
                    enemyMesh.material.map = textureForThisEnemy;
                    enemyMesh.material.needsUpdate = true;
                    const animSpeed = 120; // Adjusted animation speed
                    const iv = setInterval(() => {
                        if (!enemyMesh || !enemyMesh.material || !enemyMesh.material.map || enemyMesh.userData.hit) {
                            clearInterval(iv);
                            if (enemyMesh.userData) enemyMesh.userData.animInterval = null;
                            return;
                        }
                        currentFrame = (currentFrame + 1) % COLS;
                        textureForThisEnemy.offset.x = currentFrame * uW;
                    }, animSpeed);
                    enemyMesh.userData.animInterval = iv;
                } else { textureForThisEnemy.dispose(); }
            },
            undefined,
            function ( err ) {
                console.error( 'ERROR LOADING ENEMY TEXTURE:', err );
                if (enemyMesh.material) {
                    enemyMesh.material.map = null; enemyMesh.material.color.set(0xcc0000);
                    enemyMesh.material.needsUpdate = true;
                }
            }
        );
        scene.add(enemyMesh); targets.push(enemyMesh);
        return enemyMesh;
      }
    }

    function createProjectile() { /* Remains as in base index.html */
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 });
        const projectile = new THREE.Mesh(geometry, material);
        const projectileOffset = new THREE.Vector3(0, -0.2, -1);
        projectileOffset.applyQuaternion(camera.quaternion);
        projectile.position.copy(camera.position).add(projectileOffset);
        scene.add(projectile); projectiles.push(projectile);
        return projectile;
    }

    function trySpawnTarget(now){ /* Remains as in base index.html */
        if(now - lastSpawnTime > spawnInterval){
            createTarget(Math.random() < 0.7); lastSpawnTime = now;
            spawnInterval = Math.max(700, spawnInterval * 0.985);
        }
    }
    
    // Input handling remains as in base index.html
    let isDragging=false, dragStartX=0, cameraStartX=0;
    renderer.domElement.addEventListener('pointerdown', e => {
      if(e.button !== 0 || !gameRunningGlobal) return; 
      isDragging = true; dragStartX = e.clientX; cameraStartX = camera.position.x;
    }, { passive: false });
    renderer.domElement.addEventListener('pointermove', e => {
      if(!isDragging || !gameRunningGlobal) return;
      const dx = e.clientX - dragStartX; const targetX = cameraStartX - dx * 0.035;
      camera.position.x = THREE.MathUtils.clamp(targetX, -10, 10);
      lane = Math.max(-1, Math.min(1, Math.round(camera.position.x / 6)));
    }, { passive: false });
    renderer.domElement.addEventListener('pointerup', e => {
      if(e.button !== 0 || !gameRunningGlobal) return;
      if(!isDragging && e.target === renderer.domElement) handleShoot();
      isDragging = false;
    });
    const leftBtn = document.getElementById('left-btn');
    const rightBtn = document.getElementById('right-btn');
    const shootBtn = document.getElementById('shoot-btn');
    if(leftBtn) leftBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(gameRunningGlobal) lane = Math.max(-1, lane - 1); });
    if(rightBtn) rightBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); if(gameRunningGlobal) lane = Math.min(1, lane + 1); });
    if(shootBtn) shootBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); handleShoot(); });
    window.addEventListener('keydown', e => {
        if (!gameRunningGlobal) return;
        if(e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') lane = Math.max(-1, lane - 1);
        if(e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') lane = Math.min(1, lane + 1);
        if(e.code === 'Space' || e.key.toLowerCase() === 'w' || e.key === 'Enter') { e.preventDefault(); handleShoot(); }
        if(e.key.toLowerCase() === 'r') handleReload();
    });
    renderer.domElement.addEventListener('dblclick', (e) => {
        if (e.target === renderer.domElement && gameRunningGlobal) handleReload();
    });


    function showLevelUp() { /* Remains as in base index.html */
      const levelUpEl = document.getElementById('level-up');
      levelUpEl.textContent = `LEVEL ${level}!`;
      levelUpEl.style.transform = 'translate(-50%, -50%) scale(0.5)';
      levelUpEl.style.opacity = '1';
      setTimeout(() => { levelUpEl.style.transform = 'translate(-50%, -50%) scale(1.2)'; }, 50);
      setTimeout(() => { levelUpEl.style.transform = 'translate(-50%, -50%) scale(1)'; }, 400);
      levelUpDisplayTime = performance.now();
    }
    function showCombo(comboValue) { /* Remains as in base index.html */
      const comboEl = document.getElementById('combo-display');
      comboEl.textContent = `COMBO x${comboValue}!`;
      comboEl.style.transform = 'translate(-50%, -50%) scale(1.5)';
      comboEl.style.opacity = '1';
      setTimeout(() => { comboEl.style.transform = 'translate(-50%, -50%) scale(1)'; }, 50);
      comboDisplayTime = performance.now();
    }

    function handleShoot() { /* Base logic with gameRunningGlobal */
      if(!gameRunningGlobal || ammo <= 0) {
        if (ammo <=0 && gameRunningGlobal) { 
            const originalZ = camera.position.z;
            // muzzleFlash.parent.localToWorld(muzzleFlash.position); // MuzzleFlash is child of camera
            camera.position.z += 0.1; 
            setTimeout(() => camera.position.z = originalZ, 80);
        } 
        return;
      }
      ammo--;
      muzzleFlash.intensity = 15; setTimeout(() => { muzzleFlash.intensity = 0; }, 60);
      const projectile = createProjectile();
      const direction = new THREE.Vector3(0,0,-1); direction.applyQuaternion(camera.quaternion);
      projectile.userData = { velocity: direction.multiplyScalar(1.8), timer: 100 };
    }
    function handleReload() { /* Base logic with gameRunningGlobal */
      if(ammo < maxAmmo && gameRunningGlobal) {
        ammo = maxAmmo; const originalZ = camera.position.z; camera.position.z += 0.2; 
        setTimeout(() => { camera.position.z = originalZ; }, 120);
        const reloadFlash = new THREE.PointLight(0x0066ff, 8, 15);
        reloadFlash.position.copy(camera.position); scene.add(reloadFlash);
        setTimeout(() => { scene.remove(reloadFlash); reloadFlash.dispose(); }, 250);
      }
    }
    
    // New drawHUD function (from deepseek_javascript_20250621_6c64a6.js)
    function drawHUD() {
      ctx.clearRect(0,0,innerWidth,innerHeight);
      if (!gameRunningGlobal && window.finalScore === undefined && !document.getElementById('game-over').style.display.includes('flex')) return;
      
      ctx.strokeStyle = 'rgba(0,255,255,0.8)'; ctx.lineWidth = 3;
      const reticleSize = 20 + Math.sin(performance.now()/200)*3; const gap = 8;
      ctx.beginPath(); ctx.arc(innerWidth/2, innerHeight/2, reticleSize*1.5, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(innerWidth/2 - reticleSize - gap, innerHeight/2 - reticleSize - gap);
      ctx.lineTo(innerWidth/2 - gap, innerHeight/2 - gap);
      ctx.moveTo(innerWidth/2 + reticleSize + gap, innerHeight/2 - reticleSize - gap);
      ctx.lineTo(innerWidth/2 + gap, innerHeight/2 - gap);
      ctx.moveTo(innerWidth/2 - reticleSize - gap, innerHeight/2 + reticleSize + gap);
      ctx.lineTo(innerWidth/2 - gap, innerHeight/2 + gap);
      ctx.moveTo(innerWidth/2 + reticleSize + gap, innerHeight/2 + reticleSize + gap);
      ctx.lineTo(innerWidth/2 + gap, innerHeight/2 + gap);
      ctx.stroke();
      
      const panelWidth = 260; ctx.save();
      ctx.fillStyle = 'rgba(0,20,40,0.6)'; ctx.strokeStyle = 'rgba(0,255,255,0.4)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(20, 20, panelWidth, 150, [0, 15, 15, 0]); ctx.fill(); ctx.stroke();
      
      ctx.fillStyle = 'rgba(0,50,100,0.4)'; ctx.beginPath();
      ctx.roundRect(30, 30, panelWidth-20, 25, 12); ctx.fill();
      
      const healthWidth = (panelWidth-20) * (health/100);
      const healthGrad = ctx.createLinearGradient(30, 30, 30+healthWidth, 30);
      healthGrad.addColorStop(0, '#00ff88'); healthGrad.addColorStop(1, '#0066ff');
      ctx.fillStyle = healthGrad; ctx.beginPath();
      ctx.roundRect(30, 30, Math.max(0, healthWidth), 25, 12); ctx.fill(); // Ensure healthWidth isn't negative
      
      ctx.font = 'bold 16px Orbitron'; ctx.fillStyle = '#ffffff';
      ctx.fillText(`HEALTH: ${Math.floor(health)}%`, 40, 50);
      ctx.font = 'bold 18px Orbitron'; ctx.fillStyle = '#00ffff';
      ctx.fillText(`SCORE: ${score}`, 40, 80);
      ctx.fillText(`LEVEL: ${level}`, 40, 110);
      
      ctx.fillStyle = ammo > maxAmmo/3 ? 'rgba(0,255,255,0.7)' : 'rgba(255,50,50,0.7)';
      ctx.font = 'bold 20px Orbitron'; ctx.fillText(`AMMO: ${ammo}/${maxAmmo}`, 40, 140);
      ctx.restore();
    }


    function doGameOver(){ /* Base logic with gameRunningGlobal */
      gameRunningGlobal = false; window.finalScore = score;
      setTimeout(() => window.showGameOver(), 500);
    }
    
    let startTime = 0;
    function animate(time){
      window.animId = requestAnimationFrame(animate);
      if (!startTime) startTime = time;
      const now = performance.now();
      
      // Animate tunnel lights
      if (typeof animateLights === 'function') animateLights(now);


      if(levelUpDisplayTime > 0 && now - levelUpDisplayTime > 2000) {
        const el = document.getElementById('level-up'); if(el) el.style.opacity = '0'; 
        levelUpDisplayTime = 0;
      }
      if(comboDisplayTime > 0 && now - comboDisplayTime > 1500) {
        const el = document.getElementById('combo-display'); if(el) el.style.opacity = '0';
        comboDisplayTime = 0;
      }

      if(gameRunningGlobal){ // Use global flag
        difficulty = 1 + (now - startTime) / 60000;
        const targetCameraX = lane * 6;
        camera.position.x += (targetCameraX - camera.position.x) * 0.12;

        trySpawnTarget(now);

        explosions = explosions.filter(explosion => { /* Base logic */
          explosion.timer--;
          explosion.particles.forEach(p_mesh => {
            p_mesh.position.add(p_mesh.userData.velocity);
            p_mesh.userData.velocity.multiplyScalar(0.93);
            if (p_mesh.material.opacity !== undefined) p_mesh.material.opacity = Math.max(0, explosion.timer / 30);
          });
          if (explosion.timer <= 0) {
              explosion.particles.forEach(p_mesh => {
                  if (p_mesh.parent) p_mesh.parent.remove(p_mesh);
                  if (p_mesh.geometry) p_mesh.geometry.dispose();
                  if (p_mesh.material) p_mesh.material.dispose();
              }); return false;
          } return true;
        });

        projectiles = projectiles.filter(p => { /* Base logic */
          p.position.add(p.userData.velocity); p.userData.timer--;
          const pBox = new THREE.Box3().setFromObject(p); let hitSomething = false;
          for (let i = targets.length - 1; i >= 0; i--) {
            const t = targets[i]; if (t.userData.hit) continue;
            const tBox = new THREE.Box3().setFromObject(t);
            if (pBox.intersectsBox(tBox)) {
              t.userData.hit = true; t.userData.timer = 20;
              const nowPerf = performance.now();
              combo = (nowPerf - lastHitTime < 2000) ? combo + 1 : 1; lastHitTime = nowPerf;
              if(t.userData.type === 'enemy') {
                const explosionObj = createExplosion(t.position.x, t.position.y, t.position.z);
                explosionObj.particles.forEach(particle => scene.add(particle)); explosions.push(explosionObj);
                score += 10 + Math.floor(combo/3); if(combo > 2) showCombo(combo);
                if(score >= scoreToNextLevel) {
                  level++; scoreToNextLevel += level * 100; maxAmmo += 5; ammo = maxAmmo;
                  health = Math.min(100, health + 30); showLevelUp();
                }
              } else if (t.userData.type === 'powerup') {
                penalties++; health -= 10; combo = 0;
                if (t.material && t.material.emissive) {
                  t.material.color.setHex(0xffff00); t.material.emissive.setHex(0x888800);
                }
              }
              hitSomething = true; break;
            }
          }
          if (hitSomething || p.userData.timer <= 0 || p.position.z < -100) {
            scene.remove(p); p.geometry.dispose(); p.material.dispose(); return false;
          } return true;
        });

        targets = targets.filter(t => { /* Base logic */
          t.position.z += 0.1 * difficulty;
          if (t.position.z > camera.position.z + 1) {
            if(!t.userData.hit){
              if(t.userData.type === 'enemy') { health -= 15; combo = 0; }
              else if (t.userData.type === 'powerup') { score += 5; }
            }
            scene.remove(t); t.geometry.dispose(); 
            if(t.material) { if(t.material.map) t.material.map.dispose(); t.material.dispose(); }
            if (t.userData.animInterval) clearInterval(t.userData.animInterval);
            return false;
          }
          if(t.userData.hit){
            if (t.material && t.material.opacity !== undefined) t.material.opacity = Math.max(0, (t.userData.timer / 20));
            t.userData.timer--;
            if(t.userData.timer <= 0) {
              scene.remove(t); t.geometry.dispose(); 
              if(t.material) { if(t.material.map) t.material.map.dispose(); t.material.dispose(); }
              if (t.userData.animInterval) clearInterval(t.userData.animInterval); // Ensure cleared on final removal too
              return false;
            }
          } return true;
        });
        if(health <= 0) { health = 0; doGameOver(); }
      }
      renderer.render(scene,camera); drawHUD();
    }

    startTime = performance.now();
    for(let i=0;i<3;i++) createTarget(true);
    for(let i=0;i<1;i++) createTarget(false);
    lastSpawnTime = performance.now();
    animate(performance.now());
  }
  
  window.addEventListener('resize', () => {
    if (!window.renderer || !window.camera) return;
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
    const hud = document.getElementById('hud');
    if (hud) {
      hud.width = window.innerWidth;
      hud.height = window.innerHeight;
    }
    handleOrientation(); // Re-check orientation on resize
  });
  </script>
</body>
</html>
