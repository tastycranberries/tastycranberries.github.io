/**
 * ===================================================================
 * "TIRE ROLL" HILL JUMP GAME & SOOTHING NATURE ENGINE
 * ===================================================================
 * Features:
 * - Gentle rolling green hills with swaying grass along slopes
 * - Rolling tire physics that hugs the hillside contours and spins
 * - Parabolic jump mechanics via Mouse Click, Screen Tap, or Spacebar
 * - Dynamic obstacles (boulders, logs) along the scrolling hill ridges
 * - Center Start / Replay button, HUD score, and High Score persistence
 */

(function initTireRollGame() {
  function start() {
    let container = document.getElementById("nature-game-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "nature-game-container";
      container.className = "nature-game-container";
      document.body.prepend(container);
    }

    container.innerHTML = `
      <canvas id="nature-canvas" class="nature-canvas" aria-label="Tire Roll Hill Jump Game"></canvas>
      
      <!-- Center Start / Controls Overlay -->
      <div id="game-ui-overlay" class="game-ui-overlay">
        <!-- Start Screen -->
        <div id="game-start-panel" class="game-modal-panel">
          <div class="game-badge"><i class="fa-solid fa-gamepad"></i> Minigame</div>
          <h3 class="game-title">Tire Roll</h3>
          <p class="game-desc">Roll down the endless rolling hills and jump over obstacles!</p>
          <button id="btn-start-game" class="btn-game-primary">
            <i class="fa-solid fa-play"></i> Start Game
          </button>
          <span class="game-control-hint"><i class="fa-solid fa-arrow-pointer"></i> Click / Tap Screen or press Space to Jump</span>
        </div>

        <!-- In-Game HUD -->
        <div id="game-hud" class="game-hud" style="display: none;">
          <div class="hud-score-box">
            <span class="hud-label">SCORE</span>
            <span id="hud-score" class="hud-value">0000</span>
          </div>
          <div class="hud-score-box">
            <span class="hud-label">HIGH</span>
            <span id="hud-high-score" class="hud-value">0000</span>
          </div>
          <button id="btn-quit-game" class="btn-hud-quit" title="Pause / Exit Game">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Game Over Screen -->
        <div id="game-over-panel" class="game-modal-panel" style="display: none;">
          <div class="game-over-tag"><i class="fa-solid fa-triangle-exclamation"></i> Crash!</div>
          <h3 class="game-title">Game Over</h3>
          <div class="game-score-summary">
            <div>Score: <strong id="game-final-score">0</strong></div>
            <div>Best: <strong id="game-best-score">0</strong></div>
          </div>
          <button id="btn-restart-game" class="btn-game-primary">
            <i class="fa-solid fa-rotate-right"></i> Play Again
          </button>
          <span class="game-control-hint">Tap screen, click, or press Space to jump again</span>
        </div>
      </div>
    `;

    const canvas = document.getElementById("nature-canvas");
    const ctx = canvas.getContext("2d");

    // UI Elements
    const startPanel = document.getElementById("game-start-panel");
    const hud = document.getElementById("game-hud");
    const hudScore = document.getElementById("hud-score");
    const hudHighScore = document.getElementById("hud-high-score");
    const gameOverPanel = document.getElementById("game-over-panel");
    const finalScoreEl = document.getElementById("game-final-score");
    const bestScoreEl = document.getElementById("game-best-score");
    const btnStart = document.getElementById("btn-start-game");
    const btnRestart = document.getElementById("btn-restart-game");
    const btnQuit = document.getElementById("btn-quit-game");

    // Dimensions
    let width, height;
    let animationFrameId;

    // High Score
    let highScore = parseInt(localStorage.getItem("academic-site-tire-hi") || "0", 10);
    hudHighScore.textContent = String(highScore).padStart(4, "0");

    // Game State: "IDLE" | "PLAYING" | "GAMEOVER"
    let gameState = "IDLE";
    let score = 0;
    let worldOffset = 0;
    let baseSpeed = 4.2;
    let currentSpeed = 0;

    // Physics parameters
    const GRAVITY = 0.65;
    const JUMP_FORCE = 12.8;

    // Tire Player Object
    const tire = {
      x: 130,
      y: 0,
      radius: 17,
      vy: 0,
      angle: 0,
      isGrounded: true,
      dustParticles: []
    };

    // Obstacles
    let obstacles = [];
    let nextObstacleDistance = 280;

    // Floating Breeze Spores
    let breezeSpores = [];

    // 3 Rolling Hill Ridges
    const HILLS = [
      {
        speedFactor: 0.35,
        baseYRatio: 0.30,
        freq1: 0.0022,
        amp1: 34,
        freq2: 0.0011,
        amp2: 20,
        phase: 0.5,
        grassStep: 13,
        grassHeight: 14
      },
      {
        speedFactor: 0.65,
        baseYRatio: 0.50,
        freq1: 0.0032,
        amp1: 38,
        freq2: 0.0016,
        amp2: 18,
        phase: 2.2,
        grassStep: 10,
        grassHeight: 18
      },
      {
        // Fore hill: The track where the tire rolls!
        speedFactor: 1.0,
        baseYRatio: 0.70,
        freq1: 0.0042,
        amp1: 26,
        freq2: 0.0018,
        amp2: 14,
        phase: 4.4,
        grassStep: 7,
        grassHeight: 22
      }
    ];

    function getHillY(worldX, h) {
      const baseY = height * h.baseYRatio;
      return baseY + Math.sin(worldX * h.freq1 + h.phase) * h.amp1 + Math.cos(worldX * h.freq2 + h.phase * 0.7) * h.amp2;
    }

    function resize() {
      width = window.innerWidth;
      height = Math.max(320, Math.min(480, Math.floor(window.innerHeight * 0.50)));

      // Tire horizontal position adapts to screen width
      tire.x = Math.max(80, Math.min(160, Math.floor(width * 0.16)));
      tire.radius = width < 600 ? 15 : 18;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      // Re-initialize particles
      breezeSpores = [];
      const sporeCount = Math.max(6, Math.floor(width / 140));
      for (let i = 0; i < sporeCount; i++) {
        breezeSpores.push({
          x: Math.random() * width,
          y: height * 0.15 + Math.random() * (height * 0.65),
          radius: 1.2 + Math.random() * 1.5,
          speedX: 0.4 + Math.random() * 0.6,
          wobbleSpeed: 0.002 + Math.random() * 0.002,
          wobbleAmp: 6 + Math.random() * 8,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function getPalette() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        return {
          hills: [
            "rgba(18, 38, 27, 0.75)",   // Back hill
            "rgba(25, 50, 36, 0.85)",   // Mid hill
            "rgba(32, 64, 46, 0.95)"    // Fore hill
          ],
          grass: [
            "rgba(55, 115, 80, 0.75)",
            "rgba(75, 145, 102, 0.85)",
            "rgba(82, 183, 136, 0.95)"
          ],
          spore: "rgba(165, 230, 195, 0.55)",
          tireRubber: "#152019",
          tireTread: "#0b120e",
          tireRim: "#bad1c1",
          tireHub: "#52b788",
          obstacleRock: "#405448",
          obstacleHighlight: "#6b8a76",
          dust: "rgba(140, 180, 155, 0.45)"
        };
      } else {
        return {
          hills: [
            "rgba(160, 192, 168, 0.60)", // Back hill
            "rgba(118, 164, 130, 0.78)", // Mid hill
            "rgba(70, 126, 86, 0.92)"    // Fore hill
          ],
          grass: [
            "rgba(40, 90, 56, 0.82)",
            "rgba(28, 76, 45, 0.92)",
            "rgba(20, 64, 36, 1.00)"
          ],
          spore: "rgba(95, 155, 115, 0.55)",
          tireRubber: "#1f2b23",
          tireTread: "#111814",
          tireRim: "#e2ede6",
          tireHub: "#1b4931",
          obstacleRock: "#6b7a70",
          obstacleHighlight: "#a4b5aa",
          dust: "rgba(110, 155, 125, 0.45)"
        };
      }
    }

    /* ---------------- Controls & Game Actions ---------------- */
    function jump() {
      if (gameState === "PLAYING") {
        if (tire.isGrounded) {
          tire.vy = -JUMP_FORCE;
          tire.isGrounded = false;
          createDustPuff(tire.x, tire.y + tire.radius, 7);
        }
      } else if (gameState === "GAMEOVER") {
        startGame();
      }
    }

    function createDustPuff(x, y, count) {
      for (let i = 0; i < count; i++) {
        tire.dustParticles.push({
          x: x + (Math.random() - 0.5) * 12,
          y: y + (Math.random() - 0.5) * 4,
          vx: -(1.5 + Math.random() * 2),
          vy: -(0.5 + Math.random() * 1.5),
          radius: 2 + Math.random() * 3,
          alpha: 0.7,
          decay: 0.035 + Math.random() * 0.02
        });
      }
    }

    function startGame() {
      gameState = "PLAYING";
      score = 0;
      currentSpeed = baseSpeed;
      obstacles = [];
      nextObstacleDistance = 350;
      tire.vy = 0;
      tire.isGrounded = true;
      tire.dustParticles = [];

      container.classList.add("is-playing");
      startPanel.style.display = "none";
      gameOverPanel.style.display = "none";
      hud.style.display = "flex";
      hudScore.textContent = "0000";

      // Focus canvas for keyboard controls
      canvas.focus();
    }

    function gameOver() {
      gameState = "GAMEOVER";
      currentSpeed = 0;
      container.classList.remove("is-playing");

      // Update High Score
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("academic-site-tire-hi", highScore);
        hudHighScore.textContent = String(highScore).padStart(4, "0");
      }

      finalScoreEl.textContent = Math.floor(score / 5);
      bestScoreEl.textContent = Math.floor(highScore / 5);

      gameOverPanel.style.display = "block";
      hud.style.display = "none";

      // Big dust puff upon crash
      createDustPuff(tire.x, tire.y, 18);
    }

    function quitGame() {
      gameState = "IDLE";
      currentSpeed = 0;
      container.classList.remove("is-playing");
      startPanel.style.display = "block";
      gameOverPanel.style.display = "none";
      hud.style.display = "none";
      obstacles = [];
    }

    // Event Listeners: Click / Tap / Keyboard
    container.addEventListener("pointerdown", (e) => {
      // Don't trigger jump if user clicked a button
      if (e.target.closest("button") || e.target.closest("a")) return;
      jump();
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        // Prevent default spacebar scroll when interacting with game
        if (gameState === "PLAYING" || document.activeElement === canvas) {
          e.preventDefault();
        }
        jump();
      }
    });

    btnStart.addEventListener("click", (e) => {
      e.stopPropagation();
      startGame();
    });

    btnRestart.addEventListener("click", (e) => {
      e.stopPropagation();
      startGame();
    });

    btnQuit.addEventListener("click", (e) => {
      e.stopPropagation();
      quitGame();
    });

    /* ---------------- Main Engine Render Loop ---------------- */
    function render(time) {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const palette = getPalette();

      // In playing mode, speed gradually increases
      if (gameState === "PLAYING") {
        currentSpeed = Math.min(8.5, baseSpeed + (score * 0.0035));
        worldOffset += currentSpeed;
        score += 1;
        hudScore.textContent = String(Math.floor(score / 5)).padStart(4, "0");

        // Spawn obstacles
        nextObstacleDistance -= currentSpeed;
        if (nextObstacleDistance <= 0) {
          const obsType = Math.random() > 0.4 ? "rock" : "log";
          obstacles.push({
            worldX: worldOffset + width + 40,
            type: obsType,
            width: obsType === "rock" ? 22 : 18,
            height: obsType === "rock" ? 18 : 24
          });
          nextObstacleDistance = 320 + Math.random() * 320;
        }
      } else {
        // In idle / peaceful mode, hill sways gently in place
        worldOffset += 0.25;
      }

      // Wind sway for grass
      const windWave = Math.sin(time * 0.0012) * 16;
      const windGust = Math.sin(time * 0.0004 + Math.cos(time * 0.00018)) * 24;
      const totalWind = windWave + windGust;

      // 1. Draw Hills and Grass (Layers 0, 1, 2)
      HILLS.forEach((hill, hillIdx) => {
        const isForeHill = hillIdx === 2;
        const hillOffset = worldOffset * hill.speedFactor;

        // Draw rolling hill contour
        ctx.fillStyle = palette.hills[hillIdx];
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, getHillY(hillOffset, hill));

        const step = 8;
        for (let x = 0; x <= width + step; x += step) {
          ctx.lineTo(x, getHillY(x + hillOffset, hill));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Draw grass blades swaying along slope
        ctx.fillStyle = palette.grass[hillIdx];
        ctx.beginPath();

        const count = Math.ceil(width / hill.grassStep) + 2;
        for (let i = 0; i < count; i++) {
          const screenX = i * hill.grassStep;
          const sampleWorldX = screenX + hillOffset;
          const rootY = getHillY(sampleWorldX, hill);

          // Slope angle
          const slope = (getHillY(sampleWorldX + 4, hill) - getHillY(sampleWorldX - 4, hill)) / 8;
          const normalTilt = -slope * 14;

          const grassWave = Math.sin(time * 0.002 + sampleWorldX * 0.006) * 10;
          const totalSway = normalTilt + (totalWind * hill.speedFactor + grassWave) * 0.7;

          const tipX = screenX + totalSway;
          const tipY = rootY - hill.grassHeight;
          const ctrlX = screenX + totalSway * 0.45;
          const ctrlY = rootY - hill.grassHeight * 0.6;
          const widthBase = hillIdx === 0 ? 1.5 : 2.2;

          ctx.moveTo(screenX - widthBase * 0.5, rootY);
          ctx.quadraticCurveTo(ctrlX - widthBase * 0.25, ctrlY, tipX, tipY);
          ctx.quadraticCurveTo(ctrlX + widthBase * 0.25, ctrlY, screenX + widthBase * 0.5, rootY);
        }
        ctx.fill();
      });

      // 2. Draw Floating Breeze Spores
      ctx.fillStyle = palette.spore;
      breezeSpores.forEach(spore => {
        spore.x += spore.speedX + (currentSpeed * 0.4);
        if (spore.x > width + 20) spore.x = -20;
        const bobY = spore.y + Math.sin(time * spore.wobbleSpeed + spore.phase) * spore.wobbleAmp;

        ctx.beginPath();
        ctx.arc(spore.x, bobY, spore.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Update & Draw Obstacles (on foreground hill)
      const foreHill = HILLS[2];
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        const screenX = obs.worldX - worldOffset;
        const groundY = getHillY(obs.worldX, foreHill);

        // Remove off-screen obstacles
        if (screenX < -50) {
          obstacles.splice(i, 1);
          continue;
        }

        // Draw Obstacle (Rock or Stump)
        if (obs.type === "rock") {
          // Mossy Boulder
          ctx.fillStyle = palette.obstacleRock;
          ctx.beginPath();
          ctx.ellipse(screenX, groundY - obs.height * 0.45, obs.width * 0.5, obs.height * 0.5, 0.15, 0, Math.PI * 2);
          ctx.fill();

          // Highlight facet
          ctx.fillStyle = palette.obstacleHighlight;
          ctx.beginPath();
          ctx.ellipse(screenX - 3, groundY - obs.height * 0.6, obs.width * 0.25, obs.height * 0.25, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Wooden Stump / Log
          ctx.fillStyle = palette.obstacleRock;
          ctx.beginPath();
          ctx.roundRect(screenX - obs.width * 0.5, groundY - obs.height, obs.width, obs.height, [4, 4, 1, 1]);
          ctx.fill();

          // Bark ring lines
          ctx.strokeStyle = palette.obstacleHighlight;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(screenX - obs.width * 0.3, groundY - obs.height * 0.65);
          ctx.lineTo(screenX + obs.width * 0.3, groundY - obs.height * 0.65);
          ctx.stroke();
        }

        // Collision Check with Tire
        if (gameState === "PLAYING") {
          const obsCenterX = screenX;
          const obsCenterY = groundY - obs.height * 0.5;
          const dx = tire.x - obsCenterX;
          const dy = tire.y - obsCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < tire.radius + (obs.width * 0.45)) {
            gameOver();
          }
        }
      }

      // 4. Update & Draw Tire Player
      const tireGroundY = getHillY(tire.x + worldOffset, foreHill);

      if (gameState === "PLAYING") {
        if (!tire.isGrounded) {
          tire.y += tire.vy;
          tire.vy += GRAVITY;

          // Check landing on foreground hill slope
          if (tire.y + tire.radius >= tireGroundY) {
            tire.y = tireGroundY - tire.radius;
            tire.vy = 0;
            tire.isGrounded = true;
            createDustPuff(tire.x, tire.y + tire.radius, 5);
          }
        } else {
          tire.y = tireGroundY - tire.radius;
          // Spawn faint dust while rolling
          if (Math.random() < 0.25) {
            createDustPuff(tire.x - tire.radius * 0.5, tire.y + tire.radius, 1);
          }
        }

        // Tire roll rotation
        tire.angle += (currentSpeed / tire.radius);
      } else if (gameState === "IDLE") {
        // Rest gracefully on the hill slope
        tire.y = tireGroundY - tire.radius;
        tire.angle += 0.015;
      }

      // Draw Dust Particles
      for (let i = tire.dustParticles.length - 1; i >= 0; i--) {
        const p = tire.dustParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          tire.dustParticles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = palette.dust;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Render Tire Sprite
      drawTire(ctx, tire.x, tire.y, tire.radius, tire.angle, palette);

      animationFrameId = requestAnimationFrame(render);
    }

    function drawTire(ctx, x, y, r, angle, palette) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Outer Rubber Tire
      ctx.fillStyle = palette.tireRubber;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      // Deep Rubber Treads (6 notches around circumference)
      ctx.fillStyle = palette.tireTread;
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        ctx.save();
        ctx.rotate(a);
        ctx.fillRect(r - 3.5, -2.5, 4, 5);
        ctx.restore();
      }

      // Inner Metallic Rim
      ctx.fillStyle = palette.tireRim;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Spokes (5-spoke alloy rim design)
      ctx.strokeStyle = palette.tireRubber;
      ctx.lineWidth = 2.2;
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * (r * 0.6), Math.sin(a) * (r * 0.6));
        ctx.stroke();
      }

      // Center Hubcap with signature Forest Green accent
      ctx.fillStyle = palette.tireHub;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // Window Resize Handling
    window.addEventListener("resize", resize);
    resize();
    animationFrameId = requestAnimationFrame(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
