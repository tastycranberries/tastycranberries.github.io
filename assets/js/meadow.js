/**
 * ===================================================================
 * SOOTHING MEADOW GRASS WIND ANIMATION
 * ===================================================================
 * Renders an ultra-subtle, low-opacity, atmospheric meadow with grass
 * gently swaying in the breeze at the bottom of the viewport.
 * Designed to be calming, low-glare, and zero-distraction.
 */

(function initMeadow() {
  const canvas = document.createElement("canvas");
  canvas.id = "meadow-canvas";
  canvas.className = "meadow-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  let width, height;
  let animationFrameId;
  let blades = [];
  let isReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Configuration
  const LAYERS = 3;
  const BLADES_PER_LAYER = 65;

  function resize() {
    width = window.innerWidth;
    height = Math.min(220, Math.floor(window.innerHeight * 0.32));
    
    // Scale for crisp rendering on high-DPI (Retina) screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);

    initBlades();
    if (isReducedMotion) {
      drawStatic();
    }
  }

  function initBlades() {
    blades = [];
    for (let layer = 0; layer < LAYERS; layer++) {
      const count = Math.floor(width / (width > 800 ? 16 : 10));
      const step = width / count;

      for (let i = 0; i < count; i++) {
        const x = i * step + (Math.random() - 0.5) * step * 0.8;
        const bladeHeight = height * (0.45 + layer * 0.22) + (Math.random() - 0.5) * 28;
        const widthBase = 2.0 + layer * 0.8 + Math.random() * 1.5;
        const lean = (Math.random() - 0.5) * 16;
        const speed = 0.0012 + Math.random() * 0.0010;
        const phase = Math.random() * Math.PI * 2;
        const stiffness = 0.55 + Math.random() * 0.45;

        blades.push({
          x,
          height: bladeHeight,
          widthBase,
          lean,
          speed,
          phase,
          stiffness,
          layer
        });
      }
    }
  }

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    if (isDark) {
      return [
        "rgba(45, 106, 79, 0.45)",  // Back layer: deep pine
        "rgba(82, 183, 136, 0.55)", // Mid layer: luminous jade
        "rgba(116, 198, 157, 0.65)" // Front layer: soft mint
      ];
    } else {
      return [
        "rgba(27, 73, 49, 0.50)",   // Back layer: deep imperial forest
        "rgba(45, 106, 79, 0.60)",  // Mid layer: oxford spruce
        "rgba(64, 145, 108, 0.70)"  // Front layer: calming sage
      ];
    }
  }

  function render(time) {
    if (document.hidden) {
      animationFrameId = requestAnimationFrame(render);
      return;
    }

    ctx.clearRect(0, 0, width, height);

    const colors = getThemeColors();

    // Wind calculation: gentle base sway + periodic soft gust
    const baseWind = Math.sin(time * 0.0008) * 18;
    const gust = Math.sin(time * 0.00028 + Math.cos(time * 0.00012)) * 24;
    const totalWind = baseWind + gust;

    // Draw blades layer by layer
    for (let layer = 0; layer < LAYERS; layer++) {
      ctx.fillStyle = colors[layer];
      ctx.beginPath();

      const layerBlades = blades.filter(b => b.layer === layer);

      for (let i = 0; i < layerBlades.length; i++) {
        const b = layerBlades[i];
        
        // Individual blade tip deflection under wind
        const bladeWave = Math.sin(time * b.speed + b.phase + (b.x * 0.004)) * 12;
        const totalDeflection = b.lean + (totalWind * 0.65 + bladeWave) * b.stiffness;

        const rootX = b.x;
        const rootY = height;
        const tipX = rootX + totalDeflection;
        const tipY = rootY - b.height;
        const ctrlX = rootX + totalDeflection * 0.45;
        const ctrlY = rootY - b.height * 0.55;

        // Draw slender grass blade tapered to tip
        ctx.moveTo(rootX - b.widthBase * 0.5, rootY);
        ctx.quadraticCurveTo(ctrlX - b.widthBase * 0.25, ctrlY, tipX, tipY);
        ctx.quadraticCurveTo(ctrlX + b.widthBase * 0.25, ctrlY, rootX + b.widthBase * 0.5, rootY);
      }

      ctx.fill();
    }

    animationFrameId = requestAnimationFrame(render);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    const colors = getThemeColors();
    for (let layer = 0; layer < LAYERS; layer++) {
      ctx.fillStyle = colors[layer];
      ctx.beginPath();
      const layerBlades = blades.filter(b => b.layer === layer);
      for (let i = 0; i < layerBlades.length; i++) {
        const b = layerBlades[i];
        const rootX = b.x;
        const rootY = height;
        const tipX = rootX + b.lean * 0.5;
        const tipY = rootY - b.height;
        ctx.moveTo(rootX - b.widthBase * 0.5, rootY);
        ctx.quadraticCurveTo(rootX, rootY - b.height * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(rootX, rootY - b.height * 0.5, rootX + b.widthBase * 0.5, rootY);
      }
      ctx.fill();
    }
  }

  // Handle media queries, resize & theme switches
  window.addEventListener("resize", resize);
  
  window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", (e) => {
    isReducedMotion = e.matches;
    if (isReducedMotion) {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      drawStatic();
    } else {
      animationFrameId = requestAnimationFrame(render);
    }
  });

  // Start animation
  resize();
  if (!isReducedMotion) {
    animationFrameId = requestAnimationFrame(render);
  }
})();
