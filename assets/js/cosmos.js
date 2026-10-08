/* =====================================================================
   Cosmos background
   A still, realistic night sky: black gradient, a faint Milky Way band,
   thousands of stars coloured by temperature, and a few bright ones
   with soft glow. Only a small set of stars twinkles gently.
   ===================================================================== */
(function () {
  "use strict";

  const canvas = document.getElementById("cosmos");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, scale = 1, paintedW = 0, paintedH = 0;
  let twinklers = [];

  // Twinkles go on a light overlay so the large 4K sky is drawn only once
  const overlay = document.createElement("canvas");
  overlay.className = "cosmos";
  overlay.setAttribute("aria-hidden", "true");
  canvas.after(overlay);
  const octx = overlay.getContext("2d");

  // Seeded random so the sky looks the same on every visit
  let seed = 7;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) / 2;   // roughly normal, -1..1

  // Star colours by spectral type, weighted toward the common ones
  const COLORS = [
    [155, 176, 255, 0.04],   // O/B blue
    [202, 215, 255, 0.12],   // A blue-white
    [248, 247, 255, 0.34],   // F white
    [255, 244, 234, 0.25],   // G yellow-white
    [255, 210, 161, 0.17],   // K orange
    [255, 189, 140, 0.08]    // M red-orange
  ];
  function starColor() {
    let r = rnd(), acc = 0;
    for (const c of COLORS) { acc += c[3]; if (r <= acc) return c; }
    return COLORS[2];
  }

  // Render scale: at least 4K (3840 x 2160 device pixels), never below the
  // screen's own density, capped at 4x to protect memory on small phones.
  function renderScale() {
    const need = Math.max(1, 3840 / (W * dpr), 2160 / (H * dpr));
    let k = Math.ceil(need - 0.001);
    // keep within about twice the pixels of a 4K frame (~16.6 megapixels)
    while (k > 1 && W * H * (dpr * k) * (dpr * k) > 16.6e6) k--;
    return Math.min(4, dpr * k);
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    dpr = window.devicePixelRatio || 1;
    overlay.width = Math.round(W * dpr); overlay.height = Math.round(H * dpr);
    // Phones resize the viewport when the address bar slides; don't repaint for that
    const minor = W === paintedW && Math.abs(H - paintedH) < 140 && H <= paintedH;
    if (!minor) {
      scale = renderScale();
      canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
      paintSky();
      paintedW = W; paintedH = H;
    }
    frame(performance.now());
  }

  function addGrain(g) {
    const size = 256;
    const tile = document.createElement("canvas");
    tile.width = tile.height = size;
    const t = tile.getContext("2d");
    const img = t.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    t.putImageData(img, 0, 0);
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);      // grain at true device pixels
    g.globalAlpha = 0.018;
    g.fillStyle = g.createPattern(tile, "repeat");
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.restore();
  }

  function paintSky() {
    seed = 7;
    // Soft glows (gradient, Milky Way, dust, nebulae) are painted on a small
    // canvas and blended up; they have no fine detail, and this avoids the
    // dither pattern browsers add to very dark gradients.
    const soft = document.createElement("canvas");
    const SOFT = 0.5;
    soft.width = Math.ceil(W * SOFT); soft.height = Math.ceil(H * SOFT);
    let g = soft.getContext("2d");
    g.setTransform(SOFT, 0, 0, SOFT, 0, 0);

    // Base: near-black with the faintest cool lift toward one corner
    const base = g.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, "#000000");
    base.addColorStop(0.55, "#03040A");
    base.addColorStop(1, "#070912");
    g.fillStyle = base; g.fillRect(0, 0, W, H);

    // Milky Way: a soft diagonal band
    const ang = -0.52, cx = W * 0.55, cy = H * 0.5;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const span = Math.hypot(W, H);
    const bandW = Math.max(W, H) * 0.16;
    g.save();
    g.translate(cx, cy); g.rotate(ang);
    const band = g.createLinearGradient(0, -bandW * 1.6, 0, bandW * 1.6);
    band.addColorStop(0, "rgba(120,130,170,0)");
    band.addColorStop(0.5, "rgba(150,155,190,0.07)");
    band.addColorStop(1, "rgba(120,130,170,0)");
    g.fillStyle = band; g.fillRect(-span, -bandW * 1.6, span * 2, bandW * 3.2);
    // patchy glow along the band
    for (let i = 0; i < 26; i++) {
      const x = (rnd() - 0.5) * span, y = gauss() * bandW * 0.7, r = bandW * (0.4 + rnd() * 0.9);
      const warm = rnd() < 0.35;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, warm ? "rgba(190,160,140,0.045)" : "rgba(150,165,210,0.05)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // dark dust lanes through the middle of the band
    for (let i = 0; i < 18; i++) {
      const x = (rnd() - 0.5) * span, y = gauss() * bandW * 0.25, rx = bandW * (0.5 + rnd()), ry = bandW * (0.08 + rnd() * 0.12);
      const rg = g.createRadialGradient(x, y, 0, x, y, rx);
      rg.addColorStop(0, "rgba(0,0,0,0.35)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.save(); g.translate(x, y); g.scale(1, ry / rx);
      g.fillStyle = rg; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    g.restore();

    // Two very faint, distant nebula tints for depth
    const blob = (x, y, r, rgba) => {
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, rgba); rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    };
    blob(W * 0.85, H * 0.18, Math.max(W, H) * 0.35, "rgba(70, 60, 140, 0.07)");
    blob(W * 0.12, H * 0.85, Math.max(W, H) * 0.3, "rgba(40, 80, 120, 0.06)");

    // Blend the soft layer up to full 4K resolution
    g = ctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.drawImage(soft, 0, 0, canvas.width, canvas.height);

    // Fine film grain: breaks up 8-bit banding in the dark areas
    addGrain(g);
    g.setTransform(scale, 0, 0, scale, 0, 0);

    // Stars. Density scales with screen area; more stars inside the band.
    const area = W * H;
    const count = Math.round(area / 380);
    // Each star is a tiny point-spread disc: bright core fading to nothing,
    // the way a real star looks through a lens, so edges are never hard pixels.
    const dot = (x, y, r, c, a) => {
      const R = r * 1.9;
      const rg = g.createRadialGradient(x, y, 0, x, y, R);
      rg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${a})`);
      rg.addColorStop(0.35, `rgba(${c[0]},${c[1]},${c[2]},${(a * 0.75).toFixed(3)})`);
      rg.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
    };

    // faint background field
    for (let i = 0; i < count; i++) {
      let x, y;
      if (rnd() < 0.45) {
        // place along the band
        const t = (rnd() - 0.5) * span, d = gauss() * bandW * 0.9;
        x = cx + t * ca - d * sa; y = cy + t * sa + d * ca;
        if (x < 0 || x > W || y < 0 || y > H) continue;
      } else { x = rnd() * W; y = rnd() * H; }
      const m = Math.pow(rnd(), 2.6);           // most stars are faint
      const r = 0.35 + m * 0.9;
      dot(x, y, r, starColor(), (0.25 + m * 0.6).toFixed(3));
    }

    // brighter stars with a soft halo
    twinklers = [];
    const bright = Math.round(area / 9000);
    for (let i = 0; i < bright; i++) {
      const x = rnd() * W, y = rnd() * H, c = starColor();
      const m = Math.pow(rnd(), 1.8);
      const r = 0.8 + m * 1.4;
      const halo = r * (4 + m * 6);
      const hg = g.createRadialGradient(x, y, 0, x, y, halo);
      hg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${0.18 + m * 0.2})`);
      hg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = hg; g.beginPath(); g.arc(x, y, halo, 0, Math.PI * 2); g.fill();
      dot(x, y, r, c, 0.95);
      if (rnd() < 0.5) twinklers.push({ x, y, r, c, sp: 0.6 + rnd() * 1.6, ph: rnd() * 6.28 });
    }

    // a handful of the brightest stars get faint diffraction spikes
    const hero = Math.max(3, Math.round(area / 220000));
    for (let i = 0; i < hero; i++) {
      const x = rnd() * W, y = rnd() * H, c = starColor();
      const len = 10 + rnd() * 14;
      g.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(x - len, y); g.lineTo(x + len, y); g.moveTo(x, y - len); g.lineTo(x, y + len); g.stroke();
      const hg = g.createRadialGradient(x, y, 0, x, y, len * 0.9);
      hg.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},0.35)`);
      hg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = hg; g.beginPath(); g.arc(x, y, len * 0.9, 0, Math.PI * 2); g.fill();
      dot(x, y, 1.9, c, 1);
    }
  }

  // Twinkling: a subtle brightness change on a subset of bright stars
  function frame(t) {
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, overlay.width, overlay.height);
    if (reduceMotion) return;
    octx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = t / 1000;
    for (const st of twinklers) {
      const k = Math.sin(s * st.sp + st.ph);
      const R = st.r * (k > 0 ? 2.6 : 1.9);
      const rg = octx.createRadialGradient(st.x, st.y, 0, st.x, st.y, R);
      if (k > 0) {
        rg.addColorStop(0, `rgba(${st.c[0]},${st.c[1]},${st.c[2]},${(k * 0.4).toFixed(3)})`);
        rg.addColorStop(1, `rgba(${st.c[0]},${st.c[1]},${st.c[2]},0)`);
      } else {
        rg.addColorStop(0, `rgba(0,0,0,${(-k * 0.3).toFixed(3)})`);
        rg.addColorStop(1, "rgba(0,0,0,0)");
      }
      octx.fillStyle = rg; octx.beginPath(); octx.arc(st.x, st.y, R, 0, Math.PI * 2); octx.fill();
    }
  }

  // ~24 fps is plenty for twinkling and keeps laptops cool
  let last = 0, running = false;
  function loop(t) {
    if (!running) return;
    if (t - last > 42) { frame(t); last = t; }
    requestAnimationFrame(loop);
  }
  function start() { if (!running && !reduceMotion) { running = true; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  let rt;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

  resize();
  start();
})();
