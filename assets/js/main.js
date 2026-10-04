/**
 * ===================================================================
 * ACADEMIC WEBSITE INTERACTIVE LOGIC & RENDER ENGINE
 * ===================================================================
 */

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  renderProfile();
  renderResearchFocus();
  renderNews();
  renderPublications();
  renderExperienceEducation();
  renderTeaching();
  renderService();
  initBibtexModal();
  initMobileNav();
  initScrollSpy();
  renderLatexMath();
});

/* ---------------- Theme Management ---------------- */
function initTheme() {
  const themeToggleBtn = document.getElementById("theme-toggle");
  const storedTheme = localStorage.getItem("academic-site-theme");
  const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  const initialTheme = storedTheme ? storedTheme : (systemPrefersDark ? "dark" : "light");
  setTheme(initialTheme);

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = currentTheme === "dark" ? "light" : "dark";
      setTheme(nextTheme);
    });
  }

  // Listen to system theme change if no manual preference stored
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!localStorage.getItem("academic-site-theme")) {
      setTheme(e.matches ? "dark" : "light");
    }
  });
}

function setTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("academic-site-theme", theme);
}

/* ---------------- Profile & Bio Rendering ---------------- */
function renderProfile() {
  if (typeof ACADEMIC_PROFILE === "undefined") return;

  const p = ACADEMIC_PROFILE;
  
  // Title & Headers
  document.title = `${p.name} | Academic Researcher`;
  
  const brandName = document.getElementById("nav-brand-name");
  if (brandName) brandName.textContent = p.name;

  const profileName = document.getElementById("profile-name");
  if (profileName) profileName.textContent = p.name;

  const profileRole = document.getElementById("profile-role");
  if (profileRole) profileRole.textContent = p.role;

  const profileAffiliation = document.getElementById("profile-affiliation");
  if (profileAffiliation) {
    profileAffiliation.innerHTML = p.affiliationUrl 
      ? `<a href="${p.affiliationUrl}" target="_blank" rel="noopener">${p.affiliation}</a>`
      : p.affiliation;
  }

  const profileStatus = document.getElementById("profile-status");
  if (profileStatus && p.status) profileStatus.textContent = p.status;

  const avatar = document.getElementById("profile-avatar");
  if (avatar && p.avatar) {
    avatar.src = p.avatar;
    avatar.alt = p.name;
  }

  // Bio paragraphs
  const bioContainer = document.getElementById("profile-bio");
  if (bioContainer && Array.isArray(p.bio)) {
    bioContainer.innerHTML = p.bio.map(paragraph => `<p>${paragraph}</p>`).join("");
  }

  // Social & Academic Badges
  const linksContainer = document.getElementById("profile-links");
  if (linksContainer && Array.isArray(p.links)) {
    linksContainer.innerHTML = p.links.map(link => {
      const isCv = link.isCv ? "academic-badge badge-cv" : "academic-badge";
      const target = link.url.startsWith("mailto:") ? "" : 'target="_blank" rel="noopener"';
      return `
        <a href="${link.url}" class="${isCv}" ${target}>
          <i class="${link.icon}"></i>
          <span>${link.label}</span>
        </a>
      `;
    }).join("");
  }

  // Footer info
  const footerYear = document.getElementById("footer-year");
  if (footerYear) footerYear.textContent = new Date().getFullYear();

  const footerAuthor = document.getElementById("footer-author");
  if (footerAuthor) footerAuthor.textContent = p.name;
}

/* ---------------- Research Focus Rendering ---------------- */
function renderResearchFocus() {
  const container = document.getElementById("research-grid");
  if (!container || !ACADEMIC_PROFILE.researchFocus) return;

  container.innerHTML = ACADEMIC_PROFILE.researchFocus.map(item => `
    <div class="research-card">
      <div class="research-icon">
        <i class="${item.icon}"></i>
      </div>
      <h3>${item.title}</h3>
      <p>${item.description}</p>
      <div class="research-tags">
        ${item.tags.map(t => `<span class="research-tag">${t}</span>`).join("")}
      </div>
    </div>
  `).join("");
}

/* ---------------- News Timeline Rendering ---------------- */
function renderNews() {
  const container = document.getElementById("news-timeline");
  if (!container || !ACADEMIC_PROFILE.news) return;

  const newsItems = ACADEMIC_PROFILE.news;
  
  const newsCounter = document.getElementById("news-counter");
  if (newsCounter) newsCounter.textContent = `${newsItems.length} Recent Updates`;

  container.innerHTML = newsItems.map(item => `
    <div class="news-item">
      <div class="news-date">${item.date}</div>
      <div class="news-body">
        <span class="news-tag tag-${item.tag}">${item.tagLabel || item.tag}</span>
        <span>${item.content}</span>
      </div>
    </div>
  `).join("");
}

/* ---------------- Publications Engine ---------------- */
let currentFilter = "all";
let currentSearchQuery = "";

function renderPublications() {
  const container = document.getElementById("publications-list");
  if (!container || !ACADEMIC_PROFILE.publications) return;

  const pubs = ACADEMIC_PROFILE.publications;

  // Update counts
  updatePubCounts(pubs);

  // Setup Filter Tabs
  const filterTabs = document.querySelectorAll(".filter-tab");
  filterTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      filterTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.getAttribute("data-filter");
      filterAndRenderPublications(pubs, container);
    });
  });

  // Setup Search Input
  const searchInput = document.getElementById("pub-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearchQuery = e.target.value.toLowerCase().trim();
      filterAndRenderPublications(pubs, container);
    });
  }

  // Initial Render
  filterAndRenderPublications(pubs, container);
}

function updatePubCounts(pubs) {
  const countAll = document.getElementById("count-all");
  const countConf = document.getElementById("count-conf");
  const countJournal = document.getElementById("count-journal");
  const countPreprint = document.getElementById("count-preprint");

  if (countAll) countAll.textContent = pubs.length;
  if (countConf) countConf.textContent = pubs.filter(p => p.type === "conference").length;
  if (countJournal) countJournal.textContent = pubs.filter(p => p.type === "journal").length;
  if (countPreprint) countPreprint.textContent = pubs.filter(p => p.type === "preprint").length;
}

function filterAndRenderPublications(pubs, container) {
  const filtered = pubs.filter(pub => {
    const matchesFilter = currentFilter === "all" || pub.type === currentFilter;
    const searchText = `${pub.title} ${pub.authors.join(" ")} ${pub.venue} ${pub.abstract || ""}`.toLowerCase();
    const matchesSearch = !currentSearchQuery || searchText.includes(currentSearchQuery);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 2rem; margin-bottom: 0.75rem; opacity: 0.5;"></i>
        <p>No publications match your selected filter or search term.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(pub => {
    // Format authors highlighting self
    const authorsFormatted = pub.authors.map(author => {
      const isSelf = author.toLowerCase().includes("vance") || 
                     author.toLowerCase().includes(ACADEMIC_PROFILE.name.toLowerCase().replace("dr. ", ""));
      return isSelf ? `<span class="author-me">${author}</span>` : author;
    }).join(", ");

    // Venue badge style
    let badgeClass = "badge-conf";
    let badgeTypeLabel = "Conference";
    if (pub.type === "journal") {
      badgeClass = "badge-journal";
      badgeTypeLabel = "Journal";
    } else if (pub.type === "preprint") {
      badgeClass = "badge-preprint";
      badgeTypeLabel = "Preprint";
    }

    // Links
    const links = pub.links || {};
    let linkButtons = "";
    if (links.pdf && links.pdf !== "#") {
      linkButtons += `<a href="${links.pdf}" target="_blank" rel="noopener" class="pub-btn"><i class="fa-solid fa-file-pdf"></i> PDF</a>`;
    }
    if (links.arxiv) {
      linkButtons += `<a href="${links.arxiv}" target="_blank" rel="noopener" class="pub-btn"><i class="fa-solid fa-scroll"></i> arXiv</a>`;
    }
    if (links.code) {
      linkButtons += `<a href="${links.code}" target="_blank" rel="noopener" class="pub-btn"><i class="fa-brands fa-github"></i> Code</a>`;
    }
    if (links.project) {
      linkButtons += `<a href="${links.project}" target="_blank" rel="noopener" class="pub-btn"><i class="fa-solid fa-globe"></i> Project</a>`;
    }
    if (links.slides) {
      linkButtons += `<a href="${links.slides}" target="_blank" rel="noopener" class="pub-btn"><i class="fa-solid fa-chalkboard-user"></i> Slides</a>`;
    }

    // BibTeX & Abstract buttons
    const bibtexBtn = pub.bibtex ? `
      <button class="pub-btn btn-open-bibtex" data-pub-id="${pub.id}">
        <i class="fa-solid fa-quote-right"></i> BibTeX
      </button>
    ` : "";

    const abstractBtn = pub.abstract ? `
      <button class="pub-btn btn-toggle-abstract" data-pub-id="${pub.id}">
        <i class="fa-solid fa-align-left"></i> Abstract
      </button>
    ` : "";

    const distinctionBadge = pub.badge ? `
      <span class="award-badge"><i class="fa-solid fa-star"></i> ${pub.badge}</span>
    ` : "";

    return `
      <article class="pub-card" id="pub-${pub.id}">
        <div class="pub-badge-row">
          <span class="venue-badge ${badgeClass}">${badgeTypeLabel} · ${pub.year}</span>
          ${distinctionBadge}
        </div>
        <h3 class="pub-title">${pub.title}</h3>
        <div class="pub-authors">${authorsFormatted}</div>
        <div class="pub-venue-text">${pub.venue}, ${pub.year}</div>
        <div class="pub-actions">
          ${linkButtons}
          ${bibtexBtn}
          ${abstractBtn}
        </div>
        ${pub.abstract ? `
          <div class="pub-abstract-drawer" id="abstract-${pub.id}">
            <strong>Abstract:</strong> ${pub.abstract}
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  // Attach dynamic event listeners for abstracts & BibTeX
  attachPublicationEvents();
  renderLatexMath();
}

function attachPublicationEvents() {
  // Toggle abstract
  document.querySelectorAll(".btn-toggle-abstract").forEach(btn => {
    btn.addEventListener("click", () => {
      const pubId = btn.getAttribute("data-pub-id");
      const drawer = document.getElementById(`abstract-${pubId}`);
      if (drawer) {
        drawer.classList.toggle("open");
        btn.classList.toggle("active");
      }
    });
  });

  // Open BibTeX Modal
  document.querySelectorAll(".btn-open-bibtex").forEach(btn => {
    btn.addEventListener("click", () => {
      const pubId = btn.getAttribute("data-pub-id");
      const pub = ACADEMIC_PROFILE.publications.find(p => p.id === pubId);
      if (pub && pub.bibtex) {
        openBibtexModal(pub.bibtex);
      }
    });
  });
}

/* ---------------- BibTeX Modal Logic ---------------- */
function initBibtexModal() {
  const modal = document.getElementById("bibtex-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  const copyBtn = document.getElementById("copy-bibtex-btn");
  const copyStatus = document.getElementById("copy-status");

  if (!modal) return;

  // Close handlers
  if (closeBtn) closeBtn.addEventListener("click", closeBibtexModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBibtexModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("open")) {
      closeBibtexModal();
    }
  });

  // Copy to clipboard
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const content = document.getElementById("bibtex-content").textContent;
      navigator.clipboard.writeText(content).then(() => {
        if (copyStatus) {
          copyStatus.textContent = "Copied to clipboard!";
          setTimeout(() => { copyStatus.textContent = ""; }, 3000);
        }
      }).catch(() => {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = content;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        if (copyStatus) {
          copyStatus.textContent = "Copied!";
          setTimeout(() => { copyStatus.textContent = ""; }, 3000);
        }
      });
    });
  }
}

function openBibtexModal(bibtexString) {
  const modal = document.getElementById("bibtex-modal");
  const content = document.getElementById("bibtex-content");
  const copyStatus = document.getElementById("copy-status");

  if (content) content.textContent = bibtexString;
  if (copyStatus) copyStatus.textContent = "";
  if (modal) {
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeBibtexModal() {
  const modal = document.getElementById("bibtex-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
  }
}

/* ---------------- Experience & Education ---------------- */
function renderExperienceEducation() {
  const expContainer = document.getElementById("experience-timeline");
  const eduContainer = document.getElementById("education-timeline");

  if (expContainer && ACADEMIC_PROFILE.experience) {
    expContainer.innerHTML = ACADEMIC_PROFILE.experience.map(item => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-period">${item.period}</div>
        <div class="timeline-title">${item.role}</div>
        <div class="timeline-org">${item.org}</div>
        <div class="timeline-desc">${item.desc}</div>
      </div>
    `).join("");
  }

  if (eduContainer && ACADEMIC_PROFILE.education) {
    eduContainer.innerHTML = ACADEMIC_PROFILE.education.map(item => `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-period">${item.period}</div>
        <div class="timeline-title">${item.degree}</div>
        <div class="timeline-org">${item.org}</div>
        <div class="timeline-desc">${item.desc}</div>
      </div>
    `).join("");
  }
}

/* ---------------- Teaching ---------------- */
function renderTeaching() {
  const container = document.getElementById("teaching-grid");
  if (!container || !ACADEMIC_PROFILE.teaching) return;

  container.innerHTML = ACADEMIC_PROFILE.teaching.map(item => `
    <div class="teaching-card">
      <div class="teaching-card-header">
        <span class="teaching-code">${item.code}</span>
        <span class="teaching-semester">${item.semester}</span>
      </div>
      <div class="teaching-title">${item.title}</div>
      <div class="teaching-role">${item.role}</div>
      <div class="teaching-desc">${item.desc}</div>
    </div>
  `).join("");
}

/* ---------------- Academic Service & Honors ---------------- */
function renderService() {
  const reviewingList = document.getElementById("reviewing-list");
  const honorsList = document.getElementById("honors-list");

  if (reviewingList && ACADEMIC_PROFILE.service && ACADEMIC_PROFILE.service.reviewing) {
    reviewingList.innerHTML = ACADEMIC_PROFILE.service.reviewing.map(item => `
      <li><i class="fa-solid fa-check"></i> <span>${item}</span></li>
    `).join("");
  }

  if (honorsList && ACADEMIC_PROFILE.service && ACADEMIC_PROFILE.service.honors) {
    honorsList.innerHTML = ACADEMIC_PROFILE.service.honors.map(item => `
      <li><i class="fa-solid fa-trophy"></i> <span>${item}</span></li>
    `).join("");
  }
}

/* ---------------- Mobile Navigation ---------------- */
function initMobileNav() {
  const toggleBtn = document.getElementById("mobile-menu-toggle");
  const nav = document.getElementById("site-nav");

  if (toggleBtn && nav) {
    toggleBtn.addEventListener("click", () => {
      nav.classList.toggle("open");
    });

    // Close on navigation click
    nav.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        nav.classList.remove("open");
      });
    });
  }
}

/* ---------------- ScrollSpy for Active Nav Link ---------------- */
function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    let currentId = "";
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        currentId = section.getAttribute("id");
      }
    });

    if (currentId) {
      navLinks.forEach(link => {
        link.classList.remove("active");
        if (link.getAttribute("href") === `#${currentId}`) {
          link.classList.add("active");
        }
      });
    }
  });
}

/* ---------------- KaTeX LaTeX Math Auto-Rendering ---------------- */
function renderLatexMath() {
  if (typeof renderMathInElement === "function") {
    try {
      renderMathInElement(document.body, {
        delimiters: [
          { left: "$$", right: "$$", display: true },
          { left: "$", right: "$", display: false },
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.warn("KaTeX rendering warning:", e);
    }
  }
}
