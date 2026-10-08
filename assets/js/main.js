/* =====================================================================
   Start screen behaviour. All personal content lives in content.js.
   ===================================================================== */
(function () {
  "use strict";

  const P = ACADEMIC_PROFILE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent; };
  const isReal = (u) => !!u && u !== "#";
  const dash = (s) => String(s ?? "").replace(/\s—\s/g, "–");

  const pubs = (P.publications || []).slice().sort((a, b) => b.year - a.year);
  const links = (P.links || []).filter((l) => isReal(l.url));
  const emailLink = links.find((l) => /^mailto:/.test(l.url));
  const cvLink = links.find((l) => l.isCv);

  /* ---------------- Sections (order = pivot order) ---------------- */
  const SECTIONS = {
    about:        { label: "about",        tint: "crimson",   render: renderAbout },
    publications: { label: "publications", tint: "cobalt",  render: renderPublications },
    research:     { label: "research",     tint: "teal",    render: renderResearch },
    news:         { label: "news",         tint: "magenta", render: renderNews },
    experience:   { label: "experience",   tint: "violet",  render: renderExperience },
    teaching:     { label: "teaching",     tint: "orange",  render: renderTeaching },
    service:      { label: "service",      tint: "amber",   render: renderService },
    contact:      { label: "contact",      tint: "cyan",    render: renderContact }
  };

  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    renderHead();
    renderTiles();
    initTiles();
    initPanel();
    initCite();
    startLiveTiles();
    routeFromHash(false);
  });

  /* ---------------- Theme (dark / light) ---------------- */
  function initTheme() {
    const root = document.documentElement;
    const sw = $("#theme-switch");
    const meta = $('meta[name="theme-color"]');
    const apply = (t, animate) => {
      if (animate && !reduceMotion) {
        root.classList.add("theme-anim");
        setTimeout(() => root.classList.remove("theme-anim"), 450);
      }
      root.setAttribute("data-theme", t);
      sw.setAttribute("aria-checked", String(t === "light"));
      if (meta) meta.content = t === "light" ? "#F3F5F9" : "#000000";
    };
    apply(root.getAttribute("data-theme") === "light" ? "light" : "dark", false);
    sw.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      apply(next, true);
      try { localStorage.setItem("site-theme", next); } catch (e) { /* storage unavailable */ }
    });
    // Follow the system setting until the visitor picks a theme themselves
    matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
      let saved = null;
      try { saved = localStorage.getItem("site-theme"); } catch (err) { /* ignore */ }
      if (!saved) apply(e.matches ? "light" : "dark", true);
    });
  }

  /* ---------------- Header ---------------- */
  function renderHead() {
    document.title = P.name;
    $("#profile-name").textContent = P.name;
    $("#profile-role").textContent = P.role || "";
    $("#profile-status").textContent = P.status || "";
    $("#profile-affiliation").textContent = P.affiliation || "";
    if (P.avatar) $("#account-pic").src = P.avatar;
    $("#footer-name").textContent = P.name;
    $("#footer-year").textContent = new Date().getFullYear();
  }

  /* ---------------- Tiles ---------------- */
  // A tile = size, tint, label, optional badge, faces (first face shows first).
  function face(kicker, title, text) {
    return `<span class="face">
      ${kicker ? `<span class="face-kicker">${esc(kicker)}</span>` : ""}
      ${title ? `<span class="face-title">${title}</span>` : ""}
      ${text ? `<span class="face-text">${text}</span>` : ""}
    </span>`;
  }
  const iconFace = (icon) => `<span class="face face--icon"><i class="${icon}" aria-hidden="true"></i></span>`;

  function tile({ open, href, size = "", tint, label, badge, faces, aria, live = true, interval = 0 }) {
    const cls = `tile ${size ? "tile--" + size : ""} t-${tint}${live && faces.length > 1 ? " is-live" : ""}`;
    const inner = `<span class="faces" aria-hidden="true">${faces.join("")}</span>
      <span class="tile-label" aria-hidden="true">${esc(label)}</span>
      ${badge !== undefined && badge !== "" ? `<span class="tile-badge" aria-hidden="true">${esc(badge)}</span>` : ""}`;
    if (href) {
      const ext = /^https?:|\.pdf$/i.test(href);
      return `<a class="${cls}" href="${esc(href)}"${ext ? ' target="_blank" rel="noopener"' : ""} aria-label="${esc(aria || label)}">${inner}</a>`;
    }
    return `<button type="button" class="${cls}" data-open="${open}"${interval ? ` data-interval="${interval}"` : ""} aria-label="${esc(aria || label)}">${inner}</button>`;
  }

  function renderTiles() {
    const news = P.news || [];
    const exp = P.experience || [];
    const edu = P.education || [];
    const teach = P.teaching || [];
    const svc = P.service || {};
    const honours = svc.honors || [];
    const topLinks = links.filter((l) => !l.isCv && !/^mailto:/.test(l.url)).slice(0, 4);

    const groups = [
      {
        title: "research",
        tiles: [
          tile({
            open: "publications", size: "large", tint: "cobalt", label: "publications", badge: pubs.length,
            aria: `Publications, ${pubs.length} papers`,
            interval: 5000,
            faces: pubs.map((p) => face(`${p.year}${p.badge ? ", " + p.badge : ""}`, esc(p.title), esc(shortVenue(p.venue))))
          }),
          tile({
            open: "research", size: "wide", tint: "teal", label: "research", badge: (P.researchFocus || []).length,
            aria: "Research interests",
            interval: 5000,
            faces: (P.researchFocus || []).map((r) => face("", esc(r.title), esc((r.tags || []).join(", "))))
          }),
          tile({
            open: "news", size: "wide", tint: "magenta", label: "news", badge: news.length,
            aria: `News, ${news.length} updates`,
            interval: 5000,
            faces: news.slice(0, 3).map((n) => face(`${n.date}${n.tagLabel ? ", " + n.tagLabel : ""}`, "", esc(strip(n.content))))
          })
        ]
      },
      {
        title: "career",
        tiles: [
          tile({
            open: "experience", size: "large", tint: "violet", label: "experience",
            aria: "Experience and education",
            faces: [iconFace("fa-solid fa-briefcase"), ...exp.slice(0, 3).map((x) => face(dash(x.period), esc(x.role), esc(x.org)))]
          }),
          tile({
            open: "experience:edu", tint: "emerald", label: "education",
            aria: "Education",
            faces: [iconFace("fa-solid fa-graduation-cap"), ...edu.slice(0, 2).map((x) => face(dash(x.period), "", esc(x.degree)))]
          }),
          tile({
            open: "teaching", tint: "orange", label: "teaching", badge: teach.length,
            aria: `Teaching, ${teach.length} courses`,
            faces: [iconFace("fa-solid fa-chalkboard-user"), ...teach.slice(0, 2).map((c) => face(c.semester, "", esc(c.code ? c.code + " " + c.title : c.title)))]
          }),
          tile({
            open: "service", size: "wide", tint: "amber", label: "service & honours", badge: honours.length || "",
            aria: "Service and honours",
            faces: [iconFace("fa-solid fa-award"), ...honours.slice(0, 3).map((h) => {
              const i = h.indexOf(" — ");
              return face(i > -1 ? dash(h.slice(i + 3)) : "Honour", esc(i > -1 ? h.slice(0, i) : h), "");
            })]
          })
        ]
      },
      {
        title: "connect",
        tiles: [
          tile({
            open: "about", size: "wide", tint: "crimson", label: "about me", aria: "About me", live: true,
            faces: [
              `<span class="face face--photo"><img src="${esc(P.avatar)}" alt=""><span class="face-photo-text"><span class="face-kicker">${esc(P.status || "")}</span><span class="face-title">${esc(P.name)}</span></span></span>`,
              face("", "", esc(strip((P.bio || [])[0] || "")))
            ]
          }),
          emailLink ? tile({ open: "contact", tint: "cyan", label: "contact", aria: "Contact", faces: [iconFace("fa-solid fa-envelope")] }) : "",
          cvLink ? tile({ href: cvLink.url, tint: "lime", label: "cv", aria: "Download CV (PDF)", faces: [iconFace("fa-solid fa-file-arrow-down")] }) : "",
          ...topLinks.map((l) => tile({ href: l.url, tint: "steel", label: l.label.toLowerCase().replace(/^google /, ""), aria: `${l.label} (opens in a new tab)`, faces: [iconFace(l.icon)] }))
        ]
      }
    ];

    $("#tiles").innerHTML = groups.map((g) => `
      <section class="group" aria-label="${g.title}">
        <h2 class="group-title">${g.title}</h2>
        <div class="grid">${g.tiles.join("")}</div>
      </section>`).join("");

    $$(".tile").forEach((t, i) => t.style.setProperty("--i", i));
  }

  function shortVenue(v) {
    const m = String(v || "").match(/\(([^)]+)\)/);
    return m ? m[1] : v;
  }

  /* ---------------- Tile interaction: Windows 8 press tilt + glass light ---------------- */
  function initTiles() {
    $$(".tile").forEach((t) => {
      t.addEventListener("pointermove", (e) => {
        const r = t.getBoundingClientRect();
        t.style.setProperty("--mx", `${e.clientX - r.left}px`);
        t.style.setProperty("--my", `${e.clientY - r.top}px`);
        if (t.classList.contains("is-pressed")) tilt(t, e);
      });
      t.addEventListener("pointerdown", (e) => { t.classList.add("is-pressed"); tilt(t, e); });
      const release = () => { t.classList.remove("is-pressed"); t.style.setProperty("--rx", "0deg"); t.style.setProperty("--ry", "0deg"); t.style.setProperty("--s", "1"); };
      t.addEventListener("pointerup", release);
      t.addEventListener("pointerleave", release);
      t.addEventListener("pointercancel", release);
      t.addEventListener("keydown", (e) => { if (e.key === " " || e.key === "Enter") t.style.setProperty("--s", ".96"); });
      t.addEventListener("keyup", release);
      if (t.dataset.open) t.addEventListener("click", () => openPanel(t.dataset.open, { from: t, push: true }));
    });
    $("#account").addEventListener("click", (e) => openPanel("about", { from: e.currentTarget, push: true }));
  }

  // Pressing near an edge pushes that edge in, pressing the middle sinks the tile
  function tilt(t, e) {
    if (reduceMotion) return;
    const r = t.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    const edge = Math.max(Math.abs(x), Math.abs(y));
    const k = 14 * Math.min(1, edge * 2.2) / Math.max(1, r.width / 180);
    t.style.setProperty("--ry", `${(x * k * 2).toFixed(2)}deg`);
    t.style.setProperty("--rx", `${(-y * k * 2).toFixed(2)}deg`);
    t.style.setProperty("--s", edge < 0.22 ? "0.95" : "0.98");
  }

  /* ---------------- Live tiles ---------------- */
  let livePaused = false;
  function startLiveTiles() {
    if (reduceMotion) return;
    $$(".tile.is-live").forEach((t, i) => {
      const faces = $(".faces", t);
      const n = faces.children.length;
      // A copy of the first face at the end lets the loop keep sliding upward
      // instead of rewinding through every face when it wraps around.
      faces.appendChild(faces.children[0].cloneNode(true));
      const fixed = Number(t.dataset.interval) || 0;
      const wait = fixed || 4200 + ((i * 1700) % 3400);
      let idx = 0, hover = false;
      t.addEventListener("pointerenter", () => { hover = true; });
      t.addEventListener("pointerleave", () => { hover = false; });

      faces.addEventListener("transitionend", () => {
        if (idx !== n) return;
        faces.style.transition = "none";
        faces.style.transform = "translateY(0)";
        void faces.offsetHeight;          // apply the jump before restoring the slide
        faces.style.transition = "";
        idx = 0;
      });

      const step = () => {
        if (!hover && !livePaused && !document.hidden) {
          idx += 1;
          faces.style.transform = `translateY(${-idx * 100}%)`;
        }
        setTimeout(step, wait);
      };
      // Stagger the first flip so neighbouring tiles don't change together
      setTimeout(step, fixed ? 2500 + i * 1600 : 1800 + i * 900);
    });
  }

  /* =====================================================================
     Panel (section view)
     ===================================================================== */
  const panel = () => $("#panel");
  let current = null;
  let suppressCancel = false;

  function initPanel() {
    const p = panel();
    $("#pivot").innerHTML = Object.entries(SECTIONS)
      .filter(([k]) => k !== "contact" || emailLink)
      .map(([k, s]) => `<button type="button" data-section="${k}">${s.label}</button>`).join("");
    $("#pivot").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-section]");
      if (b && b.dataset.section !== current) openPanel(b.dataset.section, { replace: true });
    });
    $("#panel-back").addEventListener("click", requestClose);
    p.addEventListener("cancel", (e) => { e.preventDefault(); if (suppressCancel) { suppressCancel = false; return; } requestClose(); });

    // Swipe left/right between sections on touch screens
    let sx = null, sy = null;
    p.addEventListener("touchstart", (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    p.addEventListener("touchend", (e) => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      sx = null;
      if (Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      if (e.target.closest(".pivot, .pub-tools, .cite-code")) return;
      const keys = $$("#pivot button").map((b) => b.dataset.section);
      const i = keys.indexOf(current);
      const next = keys[(i + (dx < 0 ? 1 : keys.length - 1)) % keys.length];
      openPanel(next, { replace: true });
    });

    window.addEventListener("popstate", () => routeFromHash(true));
    document.addEventListener("keydown", (e) => {
      if (!p.open || $("#cite-dialog").open) return;
      if (e.target.closest("input")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const keys = $$("#pivot button").map((b) => b.dataset.section);
        const i = keys.indexOf(current);
        if (e.target.closest('[role="tab"]')) return;
        openPanel(keys[(i + (e.key === "ArrowRight" ? 1 : keys.length - 1)) % keys.length], { replace: true });
      }
      if (e.key === "/" && current === "publications") { e.preventDefault(); $("#pub-search")?.focus(); }
    });
  }

  function routeFromHash(fromHistory) {
    const key = decodeURIComponent(location.hash.slice(1));
    const base = key.split(":")[0];
    if (SECTIONS[base]) openPanel(key, { fromHistory });
    else if (panel().open) closePanel();
  }

  function openPanel(key, { from = null, push = false, replace = false } = {}) {
    const [name, tab] = key.split(":");
    const s = SECTIONS[name];
    if (!s) return;
    const p = panel();
    const switching = p.open && current !== name;

    p.style.setProperty("--tint", `var(--${s.tint})`);
    document.documentElement.style.setProperty("--tint", `var(--${s.tint})`);
    $("#panel-title").textContent = s.label;
    $$("#pivot button").forEach((b) => {
      const on = b.dataset.section === name;
      b.setAttribute("aria-current", String(on));
      if (on) { const smooth = p.open && !reduceMotion; requestAnimationFrame(() => { const pv = $("#pivot"); pv.scrollTo({ left: Math.max(0, b.offsetLeft - pv.offsetLeft - 8), behavior: smooth ? "smooth" : "auto" }); }); }
    });

    const body = $("#panel-body");
    body.innerHTML = "";
    s.render(body, tab);
    renderMath(body);
    $(".panel-inner", p).scrollTop = 0;

    if (switching) {
      body.classList.remove("is-switching"); void body.offsetWidth; body.classList.add("is-switching");
    }

    const url = `#${name}${tab ? ":" + tab : ""}`;
    if (push && !p.open) history.pushState({ panel: true }, "", url);
    else if (push || replace) history.replaceState(history.state || { panel: true }, "", url);

    if (!p.open) {
      if (from) {
        const r = from.getBoundingClientRect();
        p.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
      } else p.style.transformOrigin = "50% 50%";
      livePaused = true;
      p.showModal();
      p.classList.remove("is-closing");
      p.classList.add("is-opening");
      p.addEventListener("animationend", () => p.classList.remove("is-opening"), { once: true });
      $("#panel-back").focus();
    }
    current = name;
  }

  function requestClose() {
    if (history.state && history.state.panel) history.back();   // popstate closes it
    else { history.replaceState(null, "", location.pathname + location.search); closePanel(); }
  }

  function closePanel() {
    const p = panel();
    if (!p.open) return;
    const done = () => {
      p.classList.remove("is-closing"); p.close(); livePaused = false;
      const t = $(`.tile[data-open^="${current}"]`);
      current = null;
      if (t) t.focus({ preventScroll: true });
    };
    if (reduceMotion) return done();
    p.classList.add("is-closing");
    p.addEventListener("animationend", done, { once: true });
  }

  /* ---------------- Section renderers ---------------- */
  function renderAbout(body) {
    body.innerHTML = `
      <div class="about">
        <img src="${esc(P.avatar)}" alt="Portrait of ${esc(P.name)}">
        <div>
          <div class="bio">${(P.bio || []).map((p) => `<p>${p}</p>`).join("")}</div>
          <p class="entry-org">${esc(P.role || "")}${P.affiliation ? `, ${isReal(P.affiliationUrl) ? `<a href="${esc(P.affiliationUrl)}" target="_blank" rel="noopener">${esc(P.affiliation)}</a>` : esc(P.affiliation)}` : ""}</p>
        </div>
      </div>
      <ul class="link-list">${links.map((l) => `<li><a href="${esc(l.url)}"${/^https?:|\.pdf$/i.test(l.url) ? ' target="_blank" rel="noopener"' : ""}><i class="${esc(l.icon)}" aria-hidden="true"></i>${esc(l.label)}</a></li>`).join("")}</ul>`;
  }

  function renderResearch(body) {
    body.innerHTML = (P.researchFocus || []).map((r) => `
      <article class="research-item">
        <h3>${esc(r.title)}</h3>
        <p>${r.description}</p>
        ${r.tags && r.tags.length ? `<ul class="tags" aria-label="Keywords">${r.tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      </article>`).join("");
  }

  function renderNews(body) {
    body.innerHTML = `<ol class="entries">${(P.news || []).map((n) => `
      <li class="entry">
        <div class="entry-when"><span>${esc(n.date)}</span>${n.tagLabel ? `<span class="entry-kind">${esc(n.tagLabel)}</span>` : ""}</div>
        <p class="entry-text">${n.content}</p>
      </li>`).join("")}</ol>`;
  }

  function entryHTML(when, title, org, desc) {
    return `<li class="entry">
      <div class="entry-when"><span>${esc(dash(when))}</span></div>
      <div><h3>${esc(title)}</h3>${org ? `<p class="entry-org">${esc(org)}</p>` : ""}${desc ? `<p class="entry-desc">${desc}</p>` : ""}</div>
    </li>`;
  }

  function renderExperience(body, tab) {
    const edu = tab === "edu";
    body.innerHTML = `
      <div class="segmented" role="tablist" aria-label="Positions or education">
        <button type="button" role="tab" id="tab-work" aria-controls="panel-work" aria-selected="${!edu}" tabindex="${edu ? -1 : 0}">Positions</button>
        <button type="button" role="tab" id="tab-edu" aria-controls="panel-edu" aria-selected="${edu}" tabindex="${edu ? 0 : -1}">Education</button>
      </div>
      <ol class="entries tab-panel" id="panel-work" role="tabpanel" aria-labelledby="tab-work"${edu ? " hidden" : ""}>
        ${(P.experience || []).map((x) => entryHTML(x.period, x.role, x.org, x.desc)).join("")}</ol>
      <ol class="entries tab-panel" id="panel-edu" role="tabpanel" aria-labelledby="tab-edu"${edu ? "" : " hidden"}>
        ${(P.education || []).map((x) => entryHTML(x.period, x.degree, x.org, x.desc)).join("")}</ol>`;
    const tabs = $$('[role="tab"]', body);
    const select = (t) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute("aria-controls")).hidden = !on;
      });
      history.replaceState(history.state, "", `#experience${t.id === "tab-edu" ? ":edu" : ""}`);
    };
    tabs.forEach((t, i) => {
      t.addEventListener("click", () => select(t));
      t.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.stopPropagation();
        const n = tabs[(i + 1) % tabs.length]; select(n); n.focus();
      });
    });
  }

  function renderTeaching(body) {
    body.innerHTML = `<ol class="entries">${(P.teaching || []).map((c) => entryHTML(c.semester, `${c.code ? c.code + ", " : ""}${c.title}`, c.role, c.desc)).join("")}</ol>`;
  }

  function renderService(body) {
    const ledger = (arr) => (arr || []).map((s) => {
      const i = s.indexOf(" — ");
      return `<li><span>${esc(i > -1 ? s.slice(0, i) : s)}</span>${i > -1 ? `<span class="ledger-when">${esc(dash(s.slice(i + 3)))}</span>` : ""}</li>`;
    }).join("");
    const svc = P.service || {};
    body.innerHTML = `
      <h3 class="sub-title">Honours and fellowships</h3><ul class="ledger">${ledger(svc.honors)}</ul>
      <h3 class="sub-title">Peer review</h3><ul class="ledger">${ledger(svc.reviewing)}</ul>`;
  }

  function renderContact(body) {
    const addr = emailLink ? emailLink.url.replace(/^mailto:/, "") : "";
    body.innerHTML = `
      <p class="lead">For collaborations, freelance projects in scientific machine learning, or questions about my work, write to me directly.</p>
      ${addr ? `<a class="email-link" href="${esc(emailLink.url)}">${esc(addr)}</a>` : ""}
      <div class="contact-row">
        ${addr ? `<button type="button" class="btn" id="copy-email">Copy address</button>` : ""}
        ${cvLink ? `<a class="btn btn-quiet" href="${esc(cvLink.url)}" target="_blank" rel="noopener">Download CV</a>` : ""}
      </div>`;
    const b = $("#copy-email", body);
    if (b) b.addEventListener("click", async () => {
      const ok = await copyText(addr);
      b.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(() => { b.textContent = "Copy address"; }, 1800);
    });
  }

  /* ---------------- Publications ---------------- */
  const LINK_LABELS = { pdf: "PDF", arxiv: "arXiv", code: "Code", project: "Project page", slides: "Slides", video: "Video", poster: "Poster" };
  const pubState = { filter: "all", query: "" };

  function renderPublications(body) {
    const counts = { all: pubs.length, conference: 0, journal: 0, preprint: 0 };
    pubs.forEach((p) => { if (counts[p.type] !== undefined) counts[p.type]++; });
    const btn = (k, label) => counts[k] || k === "all"
      ? `<button type="button" data-filter="${k}" aria-pressed="${pubState.filter === k}">${label} <span class="count">${counts[k]}</span></button>` : "";

    body.innerHTML = `
      <div class="pub-tools">
        <div class="segmented" id="pub-filters" role="group" aria-label="Filter by type">
          ${btn("all", "All")}${btn("conference", "Conference")}${btn("journal", "Journal")}${btn("preprint", "Preprint")}
        </div>
        <label class="search">
          <span class="visually-hidden">Search publications</span>
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input type="search" id="pub-search" placeholder="Search titles, venues, authors" autocomplete="off" value="${esc(pubState.query)}">
          <kbd aria-hidden="true">/</kbd>
        </label>
      </div>
      <p class="pub-status" id="pub-status" aria-live="polite"></p>
      <div id="pub-list"></div>`;

    $("#pub-filters", body).addEventListener("click", (e) => {
      const b = e.target.closest("button[data-filter]");
      if (!b) return;
      pubState.filter = b.dataset.filter;
      $$("#pub-filters button", body).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      drawPubs(body);
    });
    const input = $("#pub-search", body);
    let t;
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => { pubState.query = input.value.trim(); drawPubs(body); }, 120); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && input.value) { e.preventDefault(); e.stopPropagation(); suppressCancel = true; setTimeout(() => { suppressCancel = false; }, 300); input.value = ""; pubState.query = ""; drawPubs(body); }
    });

    $("#pub-list", body).addEventListener("click", (e) => {
      const tg = e.target.closest("[data-abstract]");
      if (tg) {
        const pnl = document.getElementById(tg.getAttribute("aria-controls"));
        const open = tg.getAttribute("aria-expanded") !== "true";
        tg.setAttribute("aria-expanded", String(open));
        pnl.classList.toggle("is-open", open); pnl.inert = !open;
        return;
      }
      const c = e.target.closest("[data-cite]");
      if (c) { const p = pubs.find((x) => x.id === c.dataset.cite); if (p) openCite(p, c); }
    });
    $("#pub-status", body).addEventListener("click", (e) => {
      if (!e.target.closest("[data-clear]")) return;
      pubState.filter = "all"; pubState.query = ""; input.value = "";
      $$("#pub-filters button", body).forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.filter === "all")));
      drawPubs(body); input.focus();
    });
    drawPubs(body);
  }

  function highlight(text, q) {
    const parts = String(text).split(/(\$[^$]+\$)/g);
    const re = q ? new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi") : null;
    return parts.map((part) => /^\$[^$]+\$$/.test(part) ? esc(part) : (re ? esc(part).replace(re, (m) => `<mark>${m}</mark>`) : esc(part))).join("");
  }

  function drawPubs(body) {
    const q = pubState.query.toLowerCase();
    const list = pubs.filter((p) => (pubState.filter === "all" || p.type === pubState.filter) &&
      (!q || [p.title, p.venue, p.badge, p.abstract, p.year, (p.authors || []).join(" ")].join(" ").toLowerCase().includes(q)));
    const total = pubs.length, noun = total === 1 ? "paper" : "papers";
    const status = $("#pub-status", body);
    status.innerHTML = (pubState.query || pubState.filter !== "all")
      ? `Showing ${list.length} of ${total} ${noun}${pubState.query ? ` matching “${esc(pubState.query)}”` : ""}. <button type="button" class="text-btn" data-clear>Clear filters</button>`
      : `${total} ${noun}, newest first. Press / to search.`;

    const box = $("#pub-list", body);
    if (!list.length) { box.innerHTML = `<p class="pub-empty">No papers match these filters. Try a broader term, or clear the filters to see everything.</p>`; return; }
    const byYear = new Map();
    list.forEach((p) => { if (!byYear.has(p.year)) byYear.set(p.year, []); byYear.get(p.year).push(p); });
    box.innerHTML = Array.from(byYear).map(([y, items]) => `
      <section class="pub-year" aria-label="${y}">
        <div class="pub-year-label">${y}</div>
        <div class="pub-year-items">${items.map((p) => pubHTML(p, pubState.query)).join("")}</div>
      </section>`).join("");
    renderMath(box);
  }

  function pubHTML(p, q) {
    const L = p.links || {};
    const primary = [L.project, L.arxiv, L.pdf].find(isReal);
    const title = highlight(p.title, q);
    const authors = (p.authors || []).map((a) => a === P.name ? `<span class="me">${highlight(a, q)}</span>` : highlight(a, q)).join(", ");
    const items = Object.entries(L).filter(([, u]) => isReal(u)).map(([k, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(LINK_LABELS[k] || k)}</a>`).join("");
    const id = `abs-${p.id}`;
    return `<article class="pub">
      <h3 class="pub-title">${primary ? `<a href="${esc(primary)}" target="_blank" rel="noopener">${title}</a>` : title}</h3>
      <p class="pub-authors">${authors}</p>
      <p class="pub-venue">${highlight(p.venue, q)}${p.badge ? `<span class="pub-badge">${esc(p.badge)}</span>` : ""}</p>
      <div class="pub-actions">
        ${p.abstract ? `<button type="button" data-abstract aria-expanded="false" aria-controls="${id}">Abstract <i class="fa-solid fa-chevron-down chev" aria-hidden="true"></i></button>` : ""}
        ${items}
        ${p.bibtex ? `<button type="button" data-cite="${esc(p.id)}">Cite</button>` : ""}
      </div>
      ${p.abstract ? `<div class="pub-abstract" id="${id}" inert><div><p>${p.abstract}</p></div></div>` : ""}
    </article>`;
  }

  /* ---------------- Citation dialog ---------------- */
  let citeReturn = null;
  function initCite() {
    const d = $("#cite-dialog");
    $("#cite-close").addEventListener("click", () => d.close());
    d.addEventListener("click", (e) => { if (e.target === d) d.close(); });
    d.addEventListener("close", () => citeReturn && citeReturn.focus());
    $("#cite-copy").addEventListener("click", async () => {
      $("#cite-status").textContent = (await copyText($("#cite-code").textContent)) ? "Copied BibTeX" : "Copy failed. Select the text and copy it manually.";
    });
  }
  function openCite(p, trigger) {
    citeReturn = trigger;
    $("#cite-code").textContent = p.bibtex;
    $("#cite-status").textContent = "";
    $("#cite-dialog").showModal();
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }
  }

  function renderMath(root) {
    if (typeof window.renderMathInElement !== "function") return;
    window.renderMathInElement(root, {
      delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }],
      throwOnError: false
    });
  }
})();
