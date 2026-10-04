/**
 * ===================================================================
 * "TREE JUMP" MINIGAME ENGINE (Modal Pop-Up Version)
 * ===================================================================
 * A Chrome-Dino style hill jump game where a rolling tire leaps over
 * forest trees of varying sizes.
 * Contained entirely within a dedicated, high-polish pop-up modal.
 */

(function () {
  let modal, canvas, ctx;
  let animationFrameId;
  let isRunning = false;
  let gameState = "IDLE"; // "IDLE" | "PLAYING" | "GAMEOVER"

  // Game dimensions
  let width = 720;
  let height = 340;

  // Score & Speed
  let score = 0;
  let highScore = parseInt(localStorage.getItem("academic-site-treejump-hi") || "0", 10);
  let baseSpeed = 4.2;
  let currentSpeed = 0;
  let worldOffset = 0;

  // Physics
  const GRAVITY = 0.65;
  const JUMP_FORCE = 12.8;

  // Player Tire
  const tire = {
    x: 100,
    y: 0,
    radius: 17,
    vy: 0,
    angle: 0,
    isGrounded: true,
    dustParticles: []
  };

  // Obstacles (Trees of different sizes)
  let obstacles = [];
  let nextObstacleDistance = 320;

  // Tree sizes: 'small', 'medium', 'tall'
  const TREE_TYPES = [
    { type: "small", width: 22, height: 26, tiers: 2 },
    { type: "medium", width: 30, height: 42, tiers: 3 },
    { type: "tall", width: 36, height: 56, tiers: 4 }
  ];

  // Ground contour
  function getGroundY(worldX) {
    const baseY = height * 0.76;
    return baseY + Math.sin(worldX * 0.0035 + 0.5) * 16 + Math.cos(worldX * 0.0018) * 10;
  }

  function init() {
    modal = document.getElementById("tree-jump-modal");
    if (!modal) return;

    canvas = document.getElementById("tree-jump-canvas");
    if (!canvas) return;
    ctx = canvas.getContext("2d");

    // Hook buttons
    const btnClose = document.getElementById("treejump-close-btn");
    const btnStart = document.getElementById("btn-treejump-start");
    const btnRestart = document.getElementById("btn-treejump-restart");

    if (btnClose) btnClose.addEventListener("click", closeModal);
    if (btnStart) btnStart.addEventListener("click", startGame);
    if (btnRestart) btnRestart.addEventListener("click", startGame);

    // Modal backdrop click to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Keyboard support: Escape closes, Space jumps
    window.addEventListener("keydown", (e) => {
      if (modal && modal.classList.contains("open")) {
        if (e.key === "Escape") {
          closeModal();
        } else if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
          e.preventDefault();
          handleJump();
        }
      }
    });

    // Pointer click / mobile touch on canvas to jump
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      handleJump();
    });

    // Expose open modal globally
    window.openTreeJumpModal = openModal;
  }

  function resizeCanvas() {
    const wrapper = canvas.parentElement;
    width = wrapper.clientWidth || 720;
    height = Math.min(360, Math.max(280, Math.floor(width * 0.52)));

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    tire.x = Math.max(70, Math.min(130, Math.floor(width * 0.16)));
  }

  function openModal() {
    if (!modal) init();
    if (!modal) return;

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden"; // prevent background page scroll

    resizeCanvas();
    resetGameToIdle();

    if (!isRunning) {
      isRunning = true;
      animationFrameId = requestAnimationFrame(render);
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    isRunning = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  }

  function handleJump() {
    if (gameState === "PLAYING") {
      if (tire.isGrounded) {
        tire.vy = -JUMP_FORCE;
        tire.isGrounded = false;
        createDustPuff(tire.x, tire.y + tire.radius, 7);
      }
    } else if (gameState === "GAMEOVER") {
      startGame();
    } else if (gameState === "IDLE") {
      startGame();
    }
  }

  function createDustPuff(x, y, count) {
    for (let i = 0; i < count; i++) {
      tire.dustParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 4,
        vx: -(1.5 + Math.random() * 2),
        vy: -(0.5 + Math.random() * 1.5),
        radius: 2 + Math.random() * 3,
        alpha: 0.7,
        decay: 0.035 + Math.random() * 0.02
      });
    }
  }

  function resetGameToIdle() {
    gameState = "IDLE";
    score = 0;
    currentSpeed = 0;
    obstacles = [];
    tire.vy = 0;
    tire.isGrounded = true;
    tire.dustParticles = [];

    const startDlg = document.getElementById("treejump-start-dialog");
    const overDlg = document.getElementById("treejump-gameover-dialog");
    const hud = document.getElementById("treejump-hud");
    const hiVal = document.getElementById("treejump-high-score-val");

    if (startDlg) startDlg.style.display = "flex";
    if (overDlg) overDlg.style.display = "none";
    if (hud) hud.style.display = "none";
    if (hiVal) hiVal.textContent = String(Math.floor(highScore / 5)).padStart(4, "0");
  }

  function startGame() {
    gameState = "PLAYING";
    score = 0;
    currentSpeed = baseSpeed;
    obstacles = [];
    nextObstacleDistance = 340;
    tire.vy = 0;
    tire.isGrounded = true;
    tire.dustParticles = [];

    const startDlg = document.getElementById("treejump-start-dialog");
    const overDlg = document.getElementById("treejump-gameover-dialog");
    const hud = document.getElementById("treejump-hud");
    const scoreVal = document.getElementById("treejump-score-val");
    const hiVal = document.getElementById("treejump-high-score-val");

    if (startDlg) startDlg.style.display = "none";
    if (overDlg) overDlg.style.display = "none";
    if (hud) hud.style.display = "flex";
    if (scoreVal) scoreVal.textContent = "0000";
    if (hiVal) hiVal.textContent = String(Math.floor(highScore / 5)).padStart(4, "0");
  }

  function gameOver() {
    gameState = "GAMEOVER";
    currentSpeed = 0;

    if (score > highScore) {
      highScore = score;
      localStorage.setItem("academic-site-treejump-hi", highScore);
    }

    const finalPts = Math.floor(score / 5);
    const bestPts = Math.floor(highScore / 5);

    const finalScoreEl = document.getElementById("treejump-final-score");
    const bestScoreEl = document.getElementById("treejump-best-score");
    const overDlg = document.getElementById("treejump-gameover-dialog");
    const hud = document.getElementById("treejump-hud");

    if (finalScoreEl) finalScoreEl.textContent = finalPts;
    if (bestScoreEl) bestScoreEl.textContent = bestPts;
    if (overDlg) overDlg.style.display = "flex";
    if (hud) hud.style.display = "none";

    createDustPuff(tire.x, tire.y, 16);
  }

  function getPalette() {
    const theme = document.documentElement.getAttribute("data-theme") || "light";

    switch (theme) {
      case "dark":
        return {
          sky: "#0c1510",
          distantHill: "#13231a",
          ground: "#1a3325",
          grassStalks: "#34734e",
          treeTrunk: "#4a3525",
          treeNeedles1: "#234d36",
          treeNeedles2: "#316b4a",
          treeHighlight: "#52b788",
          tireRubber: "#152019",
          tireRim: "#bad1c1",
          tireHub: "#52b788",
          dust: "rgba(140, 180, 155, 0.45)"
        };
      case "midnight":
        return {
          sky: "#070c17",
          distantHill: "#0f1c33",
          ground: "#162744",
          grassStalks: "#38bdf8",
          treeTrunk: "#303d52",
          treeNeedles1: "#1d3860",
          treeNeedles2: "#2a4c80",
          treeHighlight: "#7dd3fc",
          tireRubber: "#0d1522",
          tireRim: "#cbd5e1",
          tireHub: "#38bdf8",
          dust: "rgba(56, 189, 248, 0.4)"
        };
      case "amethyst":
        return {
          sky: "#0e0917",
          distantHill: "#1c122e",
          ground: "#291942",
          grassStalks: "#a855f7",
          treeTrunk: "#3b2650",
          treeNeedles1: "#3c2263",
          treeNeedles2: "#582f91",
          treeHighlight: "#c084fc",
          tireRubber: "#160f24",
          tireRim: "#ddd6fe",
          tireHub: "#c084fc",
          dust: "rgba(192, 132, 252, 0.4)"
        };
      case "ocean":
        return {
          sky: "#f0f6fc",
          distantHill: "#cbdff5",
          ground: "#3b82f6",
          grassStalks: "#1d4ed8",
          treeTrunk: "#5a4332",
          treeNeedles1: "#1e3a8a",
          treeNeedles2: "#2563eb",
          treeHighlight: "#93c5fd",
          tireRubber: "#1e293b",
          tireRim: "#e2e8f0",
          tireHub: "#1d4ed8",
          dust: "rgba(59, 130, 246, 0.4)"
        };
      case "terracotta":
        return {
          sky: "#fbf3eb",
          distantHill: "#f5d4be",
          ground: "#c2410c",
          grassStalks: "#9a3412",
          treeTrunk: "#543320",
          treeNeedles1: "#832e0c",
          treeNeedles2: "#b43d0e",
          treeHighlight: "#fb923c",
          tireRubber: "#2c1c14",
          tireRim: "#ffedd5",
          tireHub: "#ea580c",
          dust: "rgba(234, 88, 12, 0.4)"
        };
      case "teal":
        return {
          sky: "#edf8f6",
          distantHill: "#b9e9e1",
          ground: "#0f766e",
          grassStalks: "#115e59",
          treeTrunk: "#423b32",
          treeNeedles1: "#134e4a",
          treeNeedles2: "#0d9488",
          treeHighlight: "#5eead4",
          tireRubber: "#132523",
          tireRim: "#ccfbf1",
          tireHub: "#14b8a6",
          dust: "rgba(13, 148, 136, 0.4)"
        };
      case "slate":
        return {
          sky: "#f1f5f9",
          distantHill: "#cbd5e1",
          ground: "#475569",
          grassStalks: "#334155",
          treeTrunk: "#3b3d42",
          treeNeedles1: "#1e293b",
          treeNeedles2: "#334155",
          treeHighlight: "#94a3b8",
          tireRubber: "#0f172a",
          tireRim: "#e2e8f0",
          tireHub: "#475569",
          dust: "rgba(100, 116, 139, 0.4)"
        };
      case "rose":
        return {
          sky: "#fdf1f3",
          distantHill: "#fbcad2",
          ground: "#be185d",
          grassStalks: "#9f1239",
          treeTrunk: "#4a2d34",
          treeNeedles1: "#831843",
          treeNeedles2: "#db2777",
          treeHighlight: "#f472b6",
          tireRubber: "#241318",
          tireRim: "#ffe4e6",
          tireHub: "#e11d48",
          dust: "rgba(225, 29, 72, 0.4)"
        };
      case "amber":
        return {
          sky: "#fcf6e8",
          distantHill: "#fde3a4",
          ground: "#b45309",
          grassStalks: "#92400e",
          treeTrunk: "#543d22",
          treeNeedles1: "#78350f",
          treeNeedles2: "#d97706",
          treeHighlight: "#fcd34d",
          tireRubber: "#291f0f",
          tireRim: "#fef3c7",
          tireHub: "#d97706",
          dust: "rgba(217, 119, 6, 0.4)"
        };
      case "light":
      default:
        return {
          sky: "#f4f8f4",
          distantHill: "#c6ded0",
          ground: "#457b58",
          grassStalks: "#2a593c",
          treeTrunk: "#5c4033",
          treeNeedles1: "#1b4d32",
          treeNeedles2: "#2d6b47",
          treeHighlight: "#74c69d",
          tireRubber: "#1f2b23",
          tireRim: "#e2ede6",
          tireHub: "#1b4931",
          dust: "rgba(110, 155, 125, 0.45)"
        };
    }
  }

  /* ---------------- Drawing Helpers ---------------- */
  function drawTree(ctx, x, groundY, spec, palette) {
    const trunkW = Math.max(4, spec.width * 0.24);
    const trunkH = spec.height * 0.35;

    // 1. Wooden Trunk
    ctx.fillStyle = palette.treeTrunk;
    ctx.fillRect(x - trunkW * 0.5, groundY - trunkH, trunkW, trunkH);

    // 2. Multi-tier Triangular Pine Foliage
    const tiers = spec.tiers;
    const foliageTotalH = spec.height * 0.85;
    const tierH = foliageTotalH / tiers;

    for (let t = 0; t < tiers; t++) {
      const tierBottomY = groundY - trunkH * 0.6 - (t * (tierH * 0.65));
      const tierW = spec.width * (1 - t * 0.22);
      const tierTopY = tierBottomY - tierH * 1.15;

      ctx.fillStyle = t % 2 === 0 ? palette.treeNeedles1 : palette.treeNeedles2;
      ctx.beginPath();
      ctx.moveTo(x, tierTopY);
      ctx.lineTo(x + tierW * 0.5, tierBottomY);
      ctx.lineTo(x - tierW * 0.5, tierBottomY);
      ctx.closePath();
      ctx.fill();

      // Soft highlight edge on top tier
      if (t === tiers - 1) {
        ctx.fillStyle = palette.treeHighlight;
        ctx.beginPath();
        ctx.arc(x, tierTopY + 2, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
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

    // Treads
    ctx.fillStyle = "#0c130e";
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

    // Spokes
    ctx.strokeStyle = palette.tireRubber;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (r * 0.6), Math.sin(a) * (r * 0.6));
      ctx.stroke();
    }

    // Center Hubcap
    ctx.fillStyle = palette.tireHub;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /* ---------------- Main Render Loop ---------------- */
  function render(time) {
    if (!isRunning) return;

    ctx.clearRect(0, 0, width, height);

    const palette = getPalette();

    // Sky backdrop
    ctx.fillStyle = palette.sky;
    ctx.fillRect(0, 0, width, height);

    // Game physics updates
    if (gameState === "PLAYING") {
      currentSpeed = Math.min(8.5, baseSpeed + (score * 0.0035));
      worldOffset += currentSpeed;
      score += 1;
      document.getElementById("treejump-score-val").textContent = String(Math.floor(score / 5)).padStart(4, "0");

      // Spawn random tree obstacles
      nextObstacleDistance -= currentSpeed;
      if (nextObstacleDistance <= 0) {
        const template = TREE_TYPES[Math.floor(Math.random() * TREE_TYPES.length)];
        obstacles.push({
          worldX: worldOffset + width + 50,
          width: template.width,
          height: template.height,
          tiers: template.tiers
        });
        nextObstacleDistance = 340 + Math.random() * 320;
      }
    } else {
      worldOffset += 0.3; // subtle idle drift
    }

    // 1. Distant rolling hill silhouette
    ctx.fillStyle = palette.distantHill;
    ctx.beginPath();
    ctx.moveTo(0, height);
    const distY0 = height * 0.62 + Math.sin(worldOffset * 0.001) * 12;
    ctx.lineTo(0, distY0);
    for (let x = 0; x <= width + 10; x += 10) {
      const y = height * 0.62 + Math.sin((x + worldOffset * 0.4) * 0.0025) * 22;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 2. Main Ground Contour
    ctx.fillStyle = palette.ground;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, getGroundY(worldOffset));
    for (let x = 0; x <= width + 8; x += 8) {
      ctx.lineTo(x, getGroundY(x + worldOffset));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // 3. Grass Stalks along ground
    ctx.fillStyle = palette.grassStalks;
    ctx.beginPath();
    const grassStep = 8;
    const grassCount = Math.ceil(width / grassStep) + 2;
    for (let i = 0; i < grassCount; i++) {
      const gx = i * grassStep;
      const gWorldX = gx + worldOffset;
      const gy = getGroundY(gWorldX);
      const sway = Math.sin(time * 0.0025 + gWorldX * 0.01) * 5;

      ctx.moveTo(gx - 1, gy);
      ctx.lineTo(gx + sway, gy - 9);
      ctx.lineTo(gx + 1, gy);
    }
    ctx.fill();

    // 4. Update & Draw Tree Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const obs = obstacles[i];
      const screenX = obs.worldX - worldOffset;
      const groundY = getGroundY(obs.worldX);

      // Remove offscreen
      if (screenX < -60) {
        obstacles.splice(i, 1);
        continue;
      }

      // Draw Tree
      drawTree(ctx, screenX, groundY, obs, palette);

      // Collision Check
      if (gameState === "PLAYING") {
        // Tree collision box
        const treeTopY = groundY - obs.height;
        const treeLeft = screenX - obs.width * 0.45;
        const treeRight = screenX + obs.width * 0.45;

        // Tire circle bounds
        const tireLeft = tire.x - tire.radius * 0.8;
        const tireRight = tire.x + tire.radius * 0.8;
        const tireBottom = tire.y + tire.radius * 0.85;

        // Check AABB / Circle overlap
        const xOverlap = tireRight >= treeLeft && tireLeft <= treeRight;
        const yOverlap = tireBottom >= treeTopY;

        if (xOverlap && yOverlap) {
          gameOver();
        }
      }
    }

    // 5. Update & Draw Tire Player
    const groundAtTire = getGroundY(tire.x + worldOffset);

    if (gameState === "PLAYING") {
      if (!tire.isGrounded) {
        tire.y += tire.vy;
        tire.vy += GRAVITY;

        // Check landing
        if (tire.y + tire.radius >= groundAtTire) {
          tire.y = groundAtTire - tire.radius;
          tire.vy = 0;
          tire.isGrounded = true;
          createDustPuff(tire.x, tire.y + tire.radius, 5);
        }
      } else {
        tire.y = groundAtTire - tire.radius;
        if (Math.random() < 0.2) {
          createDustPuff(tire.x - tire.radius * 0.5, tire.y + tire.radius, 1);
        }
      }
      tire.angle += (currentSpeed / tire.radius);
    } else {
      tire.y = groundAtTire - tire.radius;
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

    // Render Tire
    drawTire(ctx, tire.x, tire.y, tire.radius, tire.angle, palette);

    animationFrameId = requestAnimationFrame(render);
  }

  // Self-init on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
