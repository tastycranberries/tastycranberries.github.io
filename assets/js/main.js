/* =====================================================================
   Site behaviour. All personal content lives in content.js.
   ===================================================================== */
(function () {
  "use strict";

  const P = window.ACADEMIC_PROFILE || ACADEMIC_PROFILE;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isRealUrl = (u) => !!u && u !== "#";

  document.addEventListener("DOMContentLoaded", () => {
    initMode();
    renderProfile();
    renderResearch();
    initPublications();
    renderNews();
    initExperience();
    renderTeaching();
    renderService();
    renderContact();
    initCiteDialog();
    initTopbar();
    initScrollSpy();
    initSkyChart();
    renderMath(document.body);
  });

  /* ---------------- Reading mode (day plate / observatory red light) ---------------- */
  const modeListeners = [];
  function initMode() {
    const btn = $("#mode-toggle");
    const sync = () => btn.setAttribute("aria-pressed", String(document.documentElement.dataset.mode === "night"));
    sync();
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.mode === "night" ? "day" : "night";
      document.documentElement.dataset.mode = next;
      try { localStorage.setItem("site-mode", next); } catch (e) { /* storage unavailable */ }
      sync();
      modeListeners.forEach((fn) => fn());
    });
  }

  /* ---------------- Profile ---------------- */
  function renderProfile() {
    document.title = P.name;
    $("#profile-name").textContent = P.name;
    $("#brand-name").textContent = P.name;
    $("#brand-initials").textContent = P.initials || P.name.split(" ").map((w) => w[0]).join("").slice(0, 2);
    $("#footer-name").textContent = P.name;
    $("#footer-year").textContent = new Date().getFullYear();
    $("#profile-role").textContent = P.role || "";

    const aff = $("#profile-affiliation");
    aff.textContent = P.affiliation || "";
    if (isRealUrl(P.affiliationUrl)) { aff.href = P.affiliationUrl; aff.target = "_blank"; aff.rel = "noopener"; }
    else aff.removeAttribute("href");

    const status = $("#profile-status");
    if (P.status) status.textContent = P.status; else status.remove();

    const avatar = $("#profile-avatar");
    if (P.avatar) { avatar.src = P.avatar; avatar.alt = `Portrait of ${P.name}`; }

    $("#profile-bio").innerHTML = (P.bio || []).map((p) => `<p>${p}</p>`).join("");

    $("#profile-links").innerHTML = (P.links || [])
      .filter((l) => isRealUrl(l.url))
      .map((l) => {
        const external = /^https?:/.test(l.url);
        return `<li class="${l.isCv ? "is-cv" : ""}"><a href="${esc(l.url)}"${external || l.isCv ? ' target="_blank" rel="noopener"' : ""}>
          <i class="${esc(l.icon)}" aria-hidden="true"></i>${esc(l.label)}</a></li>`;
      }).join("");
  }

  /* ---------------- Research ---------------- */
  function renderResearch() {
    $("#research-list").innerHTML = (P.researchFocus || []).map((r) => `
      <article class="research-item">
        <h3>${esc(r.title)}</h3>
        <p>${r.description}</p>
        ${r.tags && r.tags.length ? `<ul class="tags" aria-label="Keywords">${r.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </article>`).join("");
  }

  /* ---------------- Publications ---------------- */
  const LINK_LABELS = { pdf: "PDF", arxiv: "arXiv", code: "Code", project: "Project page", slides: "Slides", video: "Video", poster: "Poster" };
  const pubState = { filter: "all", query: "" };

  function initPublications() {
    const pubs = (P.publications || []).slice().sort((a, b) => b.year - a.year);
    const counts = { all: pubs.length, conference: 0, journal: 0, preprint: 0 };
    pubs.forEach((p) => { if (counts[p.type] !== undefined) counts[p.type]++; });
    $$("[data-count]").forEach((el) => { el.textContent = counts[el.dataset.count] ?? 0; });
    $$("#pub-filters button").forEach((b) => { if (b.dataset.filter !== "all" && !counts[b.dataset.filter]) b.hidden = true; });

    $("#pub-filters").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      pubState.filter = btn.dataset.filter;
      $$("#pub-filters button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      drawPublications(pubs);
    });

    const input = $("#pub-search");
    let t;
    input.addEventListener("input", () => {
      clearTimeout(t);
      t = setTimeout(() => { pubState.query = input.value.trim(); drawPublications(pubs); }, 120);
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Escape") { input.value = ""; pubState.query = ""; drawPublications(pubs); } });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || $("#cite-dialog").open) return;
      e.preventDefault();
      input.focus({ preventScroll: true });
      $("#publications").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });

    $("#pub-list").addEventListener("click", (e) => {
      const toggle = e.target.closest("[data-abstract]");
      if (toggle) {
        const panel = document.getElementById(toggle.getAttribute("aria-controls"));
        const open = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(open));
        panel.classList.toggle("is-open", open);
        panel.inert = !open;
        return;
      }
      const cite = e.target.closest("[data-cite]");
      if (cite) {
        const pub = pubs.find((p) => p.id === cite.dataset.cite);
        if (pub) openCite(pub, cite);
      }
    });

    $("#pub-status").addEventListener("click", (e) => {
      if (!e.target.closest("[data-clear]")) return;
      input.value = ""; pubState.query = ""; pubState.filter = "all";
      $$("#pub-filters button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === "all")));
      drawPublications(pubs);
      input.focus();
    });

    drawPublications(pubs);
  }

  function highlight(text, q) {
    // Escape, then mark matches only outside $…$ math so KaTeX still renders.
    const parts = String(text).split(/(\$[^$]+\$)/g);
    const re = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : null;
    return parts.map((part) => {
      if (/^\$[^$]+\$$/.test(part)) return esc(part);
      const safe = esc(part);
      return re ? safe.replace(new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), (m) => `<mark>${m}</mark>`) : safe;
    }).join("");
  }

  function drawPublications(pubs) {
    const q = pubState.query.toLowerCase();
    const list = pubs.filter((p) => {
      if (pubState.filter !== "all" && p.type !== pubState.filter) return false;
      if (!q) return true;
      return [p.title, p.venue, p.badge, p.abstract, p.year, (p.authors || []).join(" ")].join(" ").toLowerCase().includes(q);
    });

    const status = $("#pub-status");
    const total = pubs.length;
    if (pubState.query || pubState.filter !== "all") {
      const noun = total === 1 ? "paper" : "papers";
      status.innerHTML = `Showing ${list.length} of ${total} ${noun}${pubState.query ? ` matching “${esc(pubState.query)}”` : ""}. <button type="button" class="text-btn" data-clear>Clear filters</button>`;
    } else {
      status.textContent = `${total} ${total === 1 ? "paper" : "papers"}, newest first.`;
    }

    const container = $("#pub-list");
    if (!list.length) {
      container.innerHTML = `<p class="pub-empty">No papers match these filters. Try a broader term, or clear the filters to see everything.</p>`;
      return;
    }

    const byYear = new Map();
    list.forEach((p) => { if (!byYear.has(p.year)) byYear.set(p.year, []); byYear.get(p.year).push(p); });

    container.innerHTML = Array.from(byYear.entries()).map(([year, items]) => `
      <section class="pub-year" aria-label="${year}">
        <div class="pub-year-label">${year}</div>
        <div class="pub-year-items">${items.map((p) => pubHTML(p, pubState.query)).join("")}</div>
      </section>`).join("");

    renderMath(container);
  }

  function pubHTML(p, q) {
    const links = p.links || {};
    const primary = [links.project, links.arxiv, links.pdf].find(isRealUrl);
    const title = highlight(p.title, q);
    const authors = (p.authors || []).map((a) => {
      const h = highlight(a, q);
      return a === P.name ? `<span class="me">${h}</span>` : h;
    }).join(", ");
    const linkItems = Object.entries(links).filter(([, u]) => isRealUrl(u))
      .map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(LINK_LABELS[k] || k)}</a>`).join("");
    const absId = `abs-${p.id}`;

    return `<article class="pub">
      <h3 class="pub-title">${primary ? `<a href="${esc(primary)}" target="_blank" rel="noopener">${title}</a>` : title}</h3>
      <p class="pub-authors">${authors}</p>
      <p class="pub-venue">${highlight(p.venue, q)}${p.badge ? `<span class="pub-badge">${esc(p.badge)}</span>` : ""}</p>
      <div class="pub-actions">
        ${p.abstract ? `<button type="button" data-abstract aria-expanded="false" aria-controls="${absId}">Abstract <i class="fa-solid fa-chevron-down chev" aria-hidden="true"></i></button>` : ""}
        ${linkItems}
        ${p.bibtex ? `<button type="button" data-cite="${esc(p.id)}">Cite</button>` : ""}
      </div>
      ${p.abstract ? `<div class="pub-abstract" id="${absId}" inert><div><p>${p.abstract}</p></div></div>` : ""}
    </article>`;
  }

  /* ---------------- Citation dialog ---------------- */
  let citeReturnFocus = null;
  function initCiteDialog() {
    const dlg = $("#cite-dialog");
    $("#cite-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener("close", () => { if (citeReturnFocus) citeReturnFocus.focus(); });
    $("#cite-copy").addEventListener("click", async () => {
      const ok = await copyText($("#cite-code").textContent);
      $("#cite-status").textContent = ok ? "Copied BibTeX" : "Copy failed. Select the text and copy it manually.";
    });
  }
  function openCite(pub, trigger) {
    citeReturnFocus = trigger;
    $("#cite-code").textContent = pub.bibtex;
    $("#cite-status").textContent = "";
    $("#cite-dialog").showModal();
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove(); return ok;
    }
  }

  /* ---------------- News ---------------- */
  function renderNews() {
    const VISIBLE = 3;
    const items = P.news || [];
    const list = $("#news-list");
    list.innerHTML = items.map((n, i) => `
      <li class="entry news-item${i >= VISIBLE ? " is-extra" : ""}">
        <div class="entry-when"><span>${esc(n.date)}</span>${n.tagLabel ? `<span class="entry-kind">${esc(n.tagLabel)}</span>` : ""}</div>
        <p class="entry-text">${n.content}</p>
      </li>`).join("");

    const more = $("#news-more");
    if (items.length <= VISIBLE) return;
    more.hidden = false;
    const label = () => { more.textContent = list.classList.contains("is-expanded") ? "Show fewer updates" : `Show all ${items.length} updates`; };
    label();
    more.setAttribute("aria-controls", "news-list");
    more.addEventListener("click", () => {
      const expanded = list.classList.toggle("is-expanded");
      more.setAttribute("aria-expanded", String(expanded));
      label();
    });
  }

  /* ---------------- Experience / Education tabs ---------------- */
  function initExperience() {
    $("#panel-work").innerHTML = (P.experience || []).map((x) => entryHTML(x.period, x.role, x.org, x.desc)).join("");
    $("#panel-edu").innerHTML = (P.education || []).map((x) => entryHTML(x.period, x.degree, x.org, x.desc)).join("");

    const tabs = $$('[role="tab"]', $("#experience"));
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
        select(next); next.focus();
      });
    });
  }

  function entryHTML(when, title, org, desc, kind) {
    return `<li class="entry">
      <div class="entry-when"><span>${esc(String(when ?? "").replace(/\s—\s/g, "–"))}</span>${kind ? `<span class="entry-kind">${esc(kind)}</span>` : ""}</div>
      <div>
        <h3>${esc(title)}</h3>
        ${org ? `<p class="entry-org">${esc(org)}</p>` : ""}
        ${desc ? `<p class="entry-desc">${desc}</p>` : ""}
      </div>
    </li>`;
  }

  /* ---------------- Teaching ---------------- */
  function renderTeaching() {
    $("#teaching-list").innerHTML = (P.teaching || [])
      .map((c) => entryHTML(c.semester, `${c.code ? c.code + ", " : ""}${c.title}`, c.role, c.desc)).join("");
  }

  /* ---------------- Service & honours ---------------- */
  function renderService() {
    const ledger = (arr) => (arr || []).map((s) => {
      const i = s.indexOf(" — ");
      const what = i > -1 ? s.slice(0, i) : s;
      const when = i > -1 ? s.slice(i + 3).replace(/ — /g, "–") : "";
      return `<li><span>${esc(what)}</span>${when ? `<span class="ledger-when">${esc(when)}</span>` : ""}</li>`;
    }).join("");
    const svc = P.service || {};
    $("#honors-list").innerHTML = ledger(svc.honors);
    $("#review-list").innerHTML = ledger(svc.reviewing);
  }

  /* ---------------- Contact ---------------- */
  function renderContact() {
    const email = (P.links || []).find((l) => /^mailto:/.test(l.url || ""));
    const cv = (P.links || []).find((l) => l.isCv && isRealUrl(l.url));
    const a = $("#contact-email");
    const copy = $("#copy-email");
    if (email) {
      const addr = email.url.replace(/^mailto:/, "");
      a.href = email.url; a.textContent = addr;
      copy.addEventListener("click", async () => {
        const ok = await copyText(addr);
        copy.textContent = ok ? "Copied" : "Copy failed";
        setTimeout(() => { copy.textContent = "Copy address"; }, 1800);
      });
    } else { a.remove(); copy.remove(); }
    if (cv) $("#contact-cv").href = cv.url; else $("#contact-cv").remove();
  }

  /* ---------------- Top bar & scroll spy ---------------- */
  function initTopbar() {
    const bar = $("#topbar");
    const hero = $("#top");
    new IntersectionObserver(([e]) => bar.classList.toggle("is-scrolled", !e.isIntersecting), {
      rootMargin: `-${bar.offsetHeight + 1}px 0px 0px 0px`, threshold: 0
    }).observe(hero);
  }

  function initScrollSpy() {
    const links = $$(".site-nav a");
    const nav = $(".site-nav");
    const byId = new Map(links.map((l) => [l.getAttribute("href").slice(1), l]));
    const setActive = (id) => {
      links.forEach((l) => l.removeAttribute("aria-current"));
      const link = byId.get(id);
      if (!link) return;
      link.setAttribute("aria-current", "true");
      if (nav.scrollWidth > nav.clientWidth) {
        nav.scrollTo({ left: link.offsetLeft - nav.clientWidth / 2 + link.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });
      }
    };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: "-40% 0px -55% 0px" });
    $$("main .sec").forEach((s) => obs.observe(s));
    new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(null); }, { threshold: 0.6 }).observe($("#top"));
  }

  /* ---------------- KaTeX ---------------- */
  function renderMath(root) {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(root, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
      throwOnError: false
    });
  }

  /* =====================================================================
     Star atlas hero
     Real positions (J2000, approximate) for the bright stars around Orion.
     Projection: sinusoidal, RA increasing to the left as on a sky chart.
     ===================================================================== */
  const STARS = [
    // name, designation, RA (deg), Dec (deg), visual magnitude
    ["Betelgeuse", "α Orionis", 88.79, 7.41, 0.50],
    ["Rigel", "β Orionis", 78.63, -8.20, 0.13],
    ["Bellatrix", "γ Orionis", 81.28, 6.35, 1.64],
    ["Mintaka", "δ Orionis", 83.00, -0.30, 2.23],
    ["Alnilam", "ε Orionis", 84.05, -1.20, 1.69],
    ["Alnitak", "ζ Orionis", 85.19, -1.94, 1.77],
    ["Saiph", "κ Orionis", 86.94, -9.67, 2.09],
    ["Meissa", "λ Orionis", 83.78, 9.93, 3.39],
    ["Hatysa", "ι Orionis", 83.86, -5.91, 2.77],
    ["Tabit", "π³ Orionis", 72.46, 6.96, 3.19],
    ["Aldebaran", "α Tauri", 68.98, 16.51, 0.85],
    ["Elnath", "β Tauri", 81.57, 28.61, 1.65],
    ["Tianguan", "ζ Tauri", 84.41, 21.14, 3.00],
    ["Ain", "ε Tauri", 67.15, 19.18, 3.53],
    ["Prima Hyadum", "γ Tauri", 64.95, 15.63, 3.65],
    ["Sirius", "α Canis Majoris", 101.29, -16.72, -1.46],
    ["Mirzam", "β Canis Majoris", 95.68, -17.96, 1.98],
    ["Procyon", "α Canis Minoris", 114.83, 5.22, 0.34],
    ["Gomeisa", "β Canis Minoris", 111.79, 8.29, 2.89],
    ["Arneb", "α Leporis", 83.18, -17.82, 2.58],
    ["Nihal", "β Leporis", 82.06, -20.76, 2.84],
    ["Cursa", "β Eridani", 76.96, -5.09, 2.79],
    ["Alhena", "γ Geminorum", 99.43, 16.40, 1.93],
    ["Tejat", "μ Geminorum", 95.74, 22.51, 2.87],
    ["Mebsuta", "ε Geminorum", 100.98, 25.13, 2.98],
    ["Alpha Monocerotis", "α Monocerotis", 115.31, -9.55, 3.93]
  ];
  const NEBULA = { name: "Orion Nebula", desig: "Messier 42", ra: 83.82, dec: -5.39 };
  const LINES = [
    ["Betelgeuse", "Meissa"], ["Meissa", "Bellatrix"], ["Betelgeuse", "Alnitak"], ["Bellatrix", "Mintaka"],
    ["Mintaka", "Alnilam"], ["Alnilam", "Alnitak"], ["Alnitak", "Saiph"], ["Mintaka", "Rigel"],
    ["Bellatrix", "Tabit"], ["Sirius", "Mirzam"], ["Procyon", "Gomeisa"], ["Arneb", "Nihal"],
    ["Aldebaran", "Prima Hyadum"], ["Aldebaran", "Tianguan"], ["Ain", "Elnath"], ["Prima Hyadum", "Ain"],
    ["Alhena", "Tejat"], ["Tejat", "Mebsuta"]
  ];

  function initSkyChart() {
    const canvas = $("#sky");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const hero = $("#top");
    const roRA = $("#ro-ra"), roDec = $("#ro-dec"), roTarget = $("#ro-target");
    const defaultTarget = roTarget.textContent;
    const DEG = Math.PI / 180;

    // Stable faint field stars from a seeded generator
    let seed = 20260601;
    const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const field = [];
    for (let i = 0; i < 1400; i++) {
      const ra = 10 + rand() * 170;
      const dec = Math.asin(rand() * 1.5 - 0.75) / DEG;   // uniform on the sphere band
      const mag = 3.8 + Math.pow(rand(), 0.55) * 3.0;
      field.push([ra, dec, mag]);
    }
    const named = STARS.map(([name, desig, ra, dec, mag]) => ({ name, desig, ra, dec, mag }));
    const byName = new Map(named.map((s) => [s.name, s]));

    let W = 0, H = 0, dpr = 1, scale = 1, cx = 0, cy = 0;
    const RA0 = 84, DEC0 = -1;
    let colors = {};
    let staticLayer = document.createElement("canvas");
    let drawProgress = reduceMotion ? 1 : 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0, on: false, snap: null };

    const project = (ra, dec) => [cx - (ra - RA0) * Math.cos(dec * DEG) * scale, cy - (dec - DEC0) * scale];
    const unproject = (x, y) => {
      const dec = DEC0 - (y - cy) / scale;
      const ra = RA0 - (x - cx) / (scale * Math.cos(dec * DEG));
      return [((ra % 360) + 360) % 360, dec];
    };
    const radius = (mag) => Math.max(0.55, 4.7 - 1.02 * mag) * Math.min(1.25, Math.max(0.85, scale / 14));

    function readColors() {
      const cs = getComputedStyle(document.documentElement);
      const v = (n) => cs.getPropertyValue(n).trim();
      colors = { star: v("--chart-star"), line: v("--chart-line"), grid: v("--chart-grid"), bg: v("--chart-bg") };
    }

    function resize() {
      const rect = hero.getBoundingClientRect();
      W = rect.width; H = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      staticLayer.width = canvas.width; staticLayer.height = canvas.height;
      const narrow = W < 700;
      scale = Math.max(H / (narrow ? 40 : 46), W / 120);
      cx = W * (narrow ? 0.55 : 0.64);
      cy = H * (narrow ? 0.34 : 0.4);
      paintStatic();
      frame();
    }

    function paintStatic() {
      const g = staticLayer.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      g.font = `500 11px ${getComputedStyle(document.body).getPropertyValue("--sans") || "sans-serif"}`;

      // Coordinate grid: meridians every hour of RA, parallels every 10°
      g.lineWidth = 1;
      g.strokeStyle = `rgba(${colors.grid}, .09)`;
      g.fillStyle = `rgba(${colors.grid}, .42)`;
      for (let ra = 0; ra <= 360; ra += 15) {
        g.beginPath();
        let started = false;
        for (let dec = -60; dec <= 60; dec += 2) {
          const [x, y] = project(ra, dec);
          if (!started) { g.moveTo(x, y); started = true; } else g.lineTo(x, y);
        }
        g.stroke();
        const top = unproject(0, 26)[1];
        const [lx] = project(ra, top);
        if (lx > 30 && lx < W - 30) { g.textAlign = "center"; g.fillText(`${ra / 15}h`, lx, 22); }
      }
      for (let dec = -50; dec <= 50; dec += 10) {
        g.beginPath();
        for (let ra = 0; ra <= 200; ra += 2) {
          const [x, y] = project(ra, dec);
          ra === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
        const [, ly] = project(RA0, dec);
        if (ly > 40 && ly < H * 0.55) { g.textAlign = "right"; g.fillText(`${dec > 0 ? "+" : dec < 0 ? "−" : ""}${Math.abs(dec)}°`, W - 14, ly - 4); }
      }
      // Celestial equator a touch stronger
      g.strokeStyle = `rgba(${colors.grid}, .2)`;
      g.setLineDash([2, 4]);
      g.beginPath();
      for (let ra = 0; ra <= 200; ra += 2) { const [x, y] = project(ra, 0); ra === 0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.stroke();
      g.setLineDash([]);

      // Field stars
      field.forEach(([ra, dec, mag]) => {
        const [x, y] = project(ra, dec);
        if (x < -5 || x > W + 5 || y < -5 || y > H + 5) return;
        g.fillStyle = `rgba(${colors.star}, ${Math.max(0.25, 1 - (mag - 3.8) / 3.6).toFixed(2)})`;
        g.beginPath(); g.arc(x, y, radius(mag), 0, Math.PI * 2); g.fill();
      });

      // Orion Nebula as a soft patch
      const [nx, ny] = project(NEBULA.ra, NEBULA.dec);
      const neb = g.createRadialGradient(nx, ny, 0, nx, ny, scale * 1.4);
      neb.addColorStop(0, `rgba(${colors.line}, .32)`);
      neb.addColorStop(1, `rgba(${colors.line}, 0)`);
      g.fillStyle = neb;
      g.beginPath(); g.ellipse(nx, ny, scale * 1.4, scale * 1.1, -0.4, 0, Math.PI * 2); g.fill();

      // Named stars with a paper-coloured halo so lines stop short of them
      named.forEach((s) => {
        const [x, y] = project(s.ra, s.dec);
        s.x = x; s.y = y; s.r = radius(s.mag);
      });
    }

    function paintLinesAndStars(g, progress) {
      g.lineWidth = 1.1;
      g.strokeStyle = `rgba(${colors.line}, .5)`;
      LINES.forEach(([a, b], i) => {
        const A = byName.get(a), B = byName.get(b);
        const local = Math.min(1, Math.max(0, progress * LINES.length * 0.6 - i * 0.6 + 0.6));
        if (local <= 0) return;
        const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy);
        const ux = dx / len, uy = dy / len;
        const gapA = A.r + 5, gapB = B.r + 5;
        if (len <= gapA + gapB) return;
        const sx = A.x + ux * gapA, sy = A.y + uy * gapA;
        const ex = A.x + ux * (gapA + (len - gapA - gapB) * local), ey = A.y + uy * (gapA + (len - gapA - gapB) * local);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
      });
      named.forEach((s) => {
        g.fillStyle = `rgba(${colors.star}, 1)`;
        g.beginPath(); g.arc(s.x, s.y, s.r, 0, Math.PI * 2); g.fill();
      });
    }

    function paintFade(g) {
      // Quiet the chart under the name so the type stays crisp
      const fade = g.createLinearGradient(0, H * 0.45, 0, H);
      fade.addColorStop(0, `rgba(${colors.bg}, 0)`);
      fade.addColorStop(1, `rgba(${colors.bg}, .82)`);
      g.fillStyle = fade;
      g.fillRect(0, 0, W, H);
    }

    function paintReticle(g) {
      if (!pointer.on) return;
      const { x, y } = pointer;
      const r = pointer.snap ? Math.max(14, pointer.snap.r + 10) : 18;
      g.strokeStyle = `rgba(${colors.line}, .95)`;
      g.lineWidth = 1.25;
      for (let q = 0; q < 4; q++) {
        const a0 = q * Math.PI / 2 + 0.22, a1 = (q + 1) * Math.PI / 2 - 0.22;
        g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke();
      }
      g.beginPath();
      g.moveTo(x - r - 10, y); g.lineTo(x - r - 3, y);
      g.moveTo(x + r + 3, y); g.lineTo(x + r + 10, y);
      g.moveTo(x, y - r - 10); g.lineTo(x, y - r - 3);
      g.moveTo(x, y + r + 3); g.lineTo(x, y + r + 10);
      g.stroke();
    }

    function frame() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(staticLayer, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintLinesAndStars(ctx, drawProgress);
      paintFade(ctx);
      paintReticle(ctx);
    }

    // One orchestrated moment: constellation figures draw in on load
    function intro() {
      if (reduceMotion) return;
      const start = performance.now(), dur = 1800;
      const step = (t) => {
        const k = Math.min(1, (t - start) / dur);
        drawProgress = 1 - Math.pow(1 - k, 3);
        frame();
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }

    // Pointer: reticle eases toward the cursor and snaps to named objects
    let raf = null;
    const fmtRA = (ra) => {
      let s = Math.round(ra / 15 * 3600);
      const h = Math.floor(s / 3600) % 24; s %= 3600;
      const m = Math.floor(s / 60); s %= 60;
      return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    };
    const fmtDec = (dec) => {
      const sign = dec < 0 ? "−" : "+";
      let a = Math.round(Math.abs(dec) * 60);
      return `${sign}${Math.floor(a / 60)}° ${String(a % 60).padStart(2, "0")}′`;
    };

    function updateReadout() {
      const [ra, dec] = pointer.snap ? [pointer.snap.ra, pointer.snap.dec] : unproject(pointer.tx, pointer.ty);
      roRA.textContent = fmtRA(ra);
      roDec.textContent = fmtDec(dec);
      if (pointer.snap) {
        const s = pointer.snap;
        roTarget.innerHTML = `<strong>${esc(s.name)}</strong>, ${esc(s.desig)}${s.mag !== undefined ? `, magnitude ${s.mag.toFixed(2)}` : ""}`;
      } else {
        roTarget.textContent = "Empty sky";
      }
    }

    function animatePointer() {
      const k = reduceMotion ? 1 : 0.28;
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;
      frame();
      if (Math.abs(pointer.tx - pointer.x) > 0.3 || Math.abs(pointer.ty - pointer.y) > 0.3) raf = requestAnimationFrame(animatePointer);
      else { pointer.x = pointer.tx; pointer.y = pointer.ty; frame(); raf = null; }
    }

    function onMove(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      let best = null, bestD = 24;
      named.forEach((s) => { const d = Math.hypot(s.x - x, s.y - y); if (d < bestD) { bestD = d; best = s; } });
      const [nx, ny] = project(NEBULA.ra, NEBULA.dec);
      if (!best && Math.hypot(nx - x, ny - y) < 22) best = { ...NEBULA, x: nx, y: ny, r: 6, mag: undefined };
      pointer.snap = best;
      pointer.tx = best ? best.x : x;
      pointer.ty = best ? best.y : y;
      if (!pointer.on) { pointer.x = pointer.tx; pointer.y = pointer.ty; pointer.on = true; }
      updateReadout();
      if (!raf) raf = requestAnimationFrame(animatePointer);
    }

    function onLeave() {
      pointer.on = false; pointer.snap = null;
      roRA.textContent = fmtRA(RA0); roDec.textContent = fmtDec(DEC0);
      roTarget.textContent = defaultTarget;
      frame();
    }

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onMove);
    canvas.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") onLeave(); });

    readColors();
    roRA.textContent = fmtRA(RA0); roDec.textContent = fmtDec(DEC0);
    if (matchMedia("(hover: none)").matches) roTarget.textContent = defaultTarget.replace("Move across", "Tap");
    resize();
    intro();

    let rt;
    new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 80); }).observe(hero);
    modeListeners.push(() => { readColors(); paintStatic(); frame(); });
    // Redraw once web fonts arrive so grid labels use them
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { paintStatic(); frame(); });
  }
})();
