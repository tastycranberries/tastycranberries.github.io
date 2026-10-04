/**
 * ===================================================================
 * SOOTHING NATURE ROLLING HILLS & SWAYING GRASS BACKGROUND
 * ===================================================================
 * Renders visible, gentle rolling hills with swaying meadow grass
 * along the slopes as wind blows through, with floating breeze particles.
 * 100% background layer: pointer-events none, zero distraction.
 */

(function initNatureBackground() {
  function start() {
    let canvas = document.getElementById("nature-background");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "nature-background";
      canvas.className = "nature-background";
      canvas.setAttribute("aria-hidden", "true");
      document.body.prepend(canvas); // prepend to guarantee it stays in background
    }

    const ctx = canvas.getContext("2d");
    let width, height;
    let animationFrameId;
    let isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 3 Rolling Hill Ridges
    const HILLS = [
      {
        speedFactor: 0.65,
        baseYRatio: 0.32,  // Top/Distant hill ridge
        freq1: 0.0022,
        amp1: 34,
        freq2: 0.0011,
        amp2: 22,
        phase: 0.5,
        grassStep: 12,
        grassHeightMin: 12,
        grassHeightMax: 18
      },
      {
        speedFactor: 0.85,
        baseYRatio: 0.52,  // Mid hill ridge
        freq1: 0.0032,
        amp1: 38,
        freq2: 0.0016,
        amp2: 18,
        phase: 2.2,
        grassStep: 9,
        grassHeightMin: 14,
        grassHeightMax: 24
      },
      {
        speedFactor: 1.15,
        baseYRatio: 0.72,  // Foreground hill ridge
        freq1: 0.0044,
        amp1: 28,
        freq2: 0.0020,
        amp2: 14,
        phase: 4.4,
        grassStep: 7,
        grassHeightMin: 16,
        grassHeightMax: 28
      }
    ];

    let hillBlades = [];
    let breezeSpores = [];

    function getHillY(x, h) {
      const baseY = height * h.baseYRatio;
      return baseY + Math.sin(x * h.freq1 + h.phase) * h.amp1 + Math.cos(x * h.freq2 + h.phase * 0.7) * h.amp2;
    }

    function resize() {
      width = window.innerWidth;
      // Generous height so rolling hills are clearly visible across bottom third of screen
      height = Math.max(300, Math.min(480, Math.floor(window.innerHeight * 0.48)));

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      buildScene();
      if (isReducedMotion) {
        renderStatic();
      }
    }

    function buildScene() {
      hillBlades = [];

      // Plant grass blades along the slopes of each hill
      HILLS.forEach((hill, hillIdx) => {
        const blades = [];
        const count = Math.ceil(width / hill.grassStep) + 2;

        for (let i = 0; i < count; i++) {
          const x = i * hill.grassStep + (Math.random() - 0.5) * (hill.grassStep * 0.6);
          const bladeHeight = hill.grassHeightMin + Math.random() * (hill.grassHeightMax - hill.grassHeightMin);
          const lean = (Math.random() - 0.5) * 8 + 4; // natural prevailing wind slant
          const stiffness = 0.65 + Math.random() * 0.35;
          const phase = Math.random() * Math.PI * 2;
          const speed = 0.0015 + Math.random() * 0.0009;

          blades.push({
            x,
            height: bladeHeight,
            widthBase: hillIdx === 0 ? 1.6 : 2.2,
            lean,
            stiffness,
            phase,
            speed
          });
        }
        hillBlades.push(blades);
      });

      // Floating gentle pollen / meadow spores drifting across
      breezeSpores = [];
      const sporeCount = Math.max(6, Math.floor(width / 140));
      for (let i = 0; i < sporeCount; i++) {
        breezeSpores.push({
          x: Math.random() * width,
          y: height * 0.15 + Math.random() * (height * 0.7),
          radius: 1.2 + Math.random() * 1.6,
          speedX: 0.4 + Math.random() * 0.6,
          wobbleSpeed: 0.0025 + Math.random() * 0.0025,
          wobbleAmp: 8 + Math.random() * 10,
          phase: Math.random() * Math.PI * 2
        });
      }
    }

    function getPalette() {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      if (isDark) {
        return {
          hills: [
            "rgba(18, 38, 27, 0.70)",   // Back hill: distant pine ridge
            "rgba(24, 48, 34, 0.82)",   // Mid hill: deep spruce
            "rgba(30, 58, 41, 0.92)"    // Fore hill: dark evergreen slope
          ],
          grass: [
            "rgba(55, 110, 78, 0.75)",
            "rgba(72, 140, 98, 0.85)",
            "rgba(82, 175, 125, 0.95)"  // Glowing soothing jade blades
          ],
          spore: "rgba(165, 230, 195, 0.55)"
        };
      } else {
        return {
          hills: [
            "rgba(160, 192, 168, 0.55)", // Back hill: misty soft sage ridge
            "rgba(118, 164, 130, 0.72)", // Mid hill: rolling meadow green
            "rgba(72, 128, 88, 0.88)"    // Fore hill: rich lush forest slope
          ],
          grass: [
            "rgba(40, 88, 55, 0.80)",
            "rgba(28, 76, 45, 0.90)",
            "rgba(20, 64, 36, 1.00)"     // Deep imperial forest grass blades
          ],
          spore: "rgba(95, 155, 115, 0.55)"
        };
      }
    }

    function render(time) {
      if (document.hidden) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const palette = getPalette();

      // Continuous rolling wind wave + soft occasional gusts
      const windWave = Math.sin(time * 0.0011) * 18;
      const windGust = Math.sin(time * 0.00038 + Math.cos(time * 0.00016)) * 26;
      const currentWind = windWave + windGust;

      // Draw each hill layer + grass along its slope
      HILLS.forEach((hill, hillIdx) => {
        // 1. Draw smooth rolling hill curve
        ctx.fillStyle = palette.hills[hillIdx];
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, getHillY(0, hill));

        const step = 8;
        for (let x = 0; x <= width + step; x += step) {
          ctx.lineTo(x, getHillY(x, hill));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // 2. Draw grass blades swaying along this hill slope
        ctx.fillStyle = palette.grass[hillIdx];
        ctx.beginPath();

        const blades = hillBlades[hillIdx] || [];
        for (let i = 0; i < blades.length; i++) {
          const b = blades[i];
          const rootX = b.x;
          const rootY = getHillY(rootX, hill);

          // Slope calculation for natural blade perpendicular angle
          const slope = (getHillY(rootX + 4, hill) - getHillY(rootX - 4, hill)) / 8;
          const normalTilt = -slope * 14;

          // Wind sway deflection
          const grassWave = Math.sin(time * b.speed + b.phase + (rootX * 0.006)) * 12;
          const totalSway = normalTilt + b.lean + (currentWind * hill.speedFactor + grassWave) * b.stiffness;

          const tipX = rootX + totalSway;
          const tipY = rootY - b.height;
          const ctrlX = rootX + totalSway * 0.45;
          const ctrlY = rootY - b.height * 0.6;

          ctx.moveTo(rootX - b.widthBase * 0.5, rootY);
          ctx.quadraticCurveTo(ctrlX - b.widthBase * 0.25, ctrlY, tipX, tipY);
          ctx.quadraticCurveTo(ctrlX + b.widthBase * 0.25, ctrlY, rootX + b.widthBase * 0.5, rootY);
        }
        ctx.fill();
      });

      // 3. Draw gentle floating breeze spores
      ctx.fillStyle = palette.spore;
      breezeSpores.forEach(spore => {
        spore.x += spore.speedX + (currentWind > 0 ? currentWind * 0.025 : 0);
        if (spore.x > width + 20) spore.x = -20;

        const bobY = spore.y + Math.sin(time * spore.wobbleSpeed + spore.phase) * spore.wobbleAmp;

        ctx.beginPath();
        ctx.arc(spore.x, bobY, spore.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    }

    function renderStatic() {
      ctx.clearRect(0, 0, width, height);
      const palette = getPalette();

      HILLS.forEach((hill, hillIdx) => {
        ctx.fillStyle = palette.hills[hillIdx];
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, getHillY(0, hill));
        for (let x = 0; x <= width + 8; x += 8) {
          ctx.lineTo(x, getHillY(x, hill));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = palette.grass[hillIdx];
        ctx.beginPath();
        const blades = hillBlades[hillIdx] || [];
        for (let i = 0; i < blades.length; i++) {
          const b = blades[i];
          const rootX = b.x;
          const rootY = getHillY(rootX, hill);
          const tipX = rootX + b.lean;
          const tipY = rootY - b.height;
          ctx.moveTo(rootX - b.widthBase * 0.5, rootY);
          ctx.quadraticCurveTo(rootX, rootY - b.height * 0.5, tipX, tipY);
          ctx.quadraticCurveTo(rootX, rootY - b.height * 0.5, rootX + b.widthBase * 0.5, rootY);
        }
        ctx.fill();
      });
    }

    window.addEventListener("resize", resize);

    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
      isReducedMotion = e.matches;
      if (isReducedMotion) {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        renderStatic();
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    });

    resize();
    if (!isReducedMotion) {
      animationFrameId = requestAnimationFrame(render);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
