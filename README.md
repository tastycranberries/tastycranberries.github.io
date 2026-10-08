# Academic Personal Website for GitHub Pages (`github.io`)

A clean, modern, zero-dependency personal website designed specifically for academic researchers, PhD candidates, postdocs, and professors. Built with responsive HTML5, modern CSS with Light/Dark themes, and dynamic data rendering via a single configuration file.

![Preview](assets/img/avatar-placeholder.svg)

---

## Key Features

- **Scholarship First**: Interactive publication list with category filters (*All, Conference, Journal, Preprint*), keyword search, and distinction badges (*Oral, Spotlight, Best Paper*).
- **BibTeX & LaTeX Ready**:
  - 1-click **"Copy BibTeX"** modal with automatic clipboard feedback.
  - Collapsible paper abstracts.
  - Native **LaTeX math rendering** powered by KaTeX (e.g., equations like $\mathcal{L}_{reg}$ and $\mathcal{M} \subset \mathbb{R}^d$ render directly in titles and abstracts).
- **Academic Profile Hub**:
  - Badges for **Google Scholar, arXiv, ORCID, GitHub, Twitter/X, LinkedIn, DBLP, and Curriculum Vitae (PDF)**.
  - Research interest cards with topic chips.
  - Chronological news & updates feed.
  - Two-column timeline for Experience and Education.
  - Teaching & mentoring section.
  - Program Committee (PC) reviewing & honors record.
- **Interactive star-atlas header**: a chart of the Orion region drawn from real star positions. Move the pointer (or tap) to read RA/Dec and identify bright stars.
- **Day and red-light modes**: a cool "photographic plate" day mode and an observatory red-light night mode. Follows the system setting until the visitor chooses.
- **Modern Polish**:
  - Section navigation that highlights where you are as you scroll.
  - Press `/` anywhere to jump to the publication search.
  - Fast load times, zero external build tools, zero npm dependencies.
  - GitHub Pages native out-of-the-box (`.nojekyll` included).

---

## Directory Structure

```text
academic-website/
├── index.html                   # Semantic HTML structure & layout
├── .nojekyll                    # Ensures GitHub Pages serves all assets directly
├── serve.py                     # Local preview server
├── README.md                    # Setup & GitHub Pages guide
└── assets/
    ├── css/
    │   └── style.css            # Colours, typography, layout and components
    ├── js/
    │   ├── content.js           # << YOUR DATA GOES HERE >>
    │   └── main.js              # Star chart, reading modes, filters, BibTeX dialog, KaTeX
    ├── img/
    │   ├── avatar-placeholder.svg
    │   └── favicon.svg
    └── pdf/
        └── cv-placeholder.pdf   # Replace with your actual CV PDF
```

---

## Quickstart: Local Preview

To preview the website locally on your computer:

```bash
python serve.py
```

This will automatically start a local server and open `http://localhost:8000` in your default browser.

---

## How to Customize Your Content

All personal content is centralized in **`assets/js/content.js`**. You do not need to touch complex HTML to update your information.

### 1. Update Profile & Bio
Open `assets/js/content.js` and edit the `ACADEMIC_PROFILE` object:

```javascript
name: "Your Name",
role: "PhD Candidate / Postdoctoral Researcher",
affiliation: "Your University / Research Lab",
affiliationUrl: "https://your-university.edu",
status: "Available for Academic Roles / Collaborations",
avatar: "assets/img/your-photo.jpg", // Place your headshot in assets/img/
bio: [
  "Your research statement and background...",
  "Your current focus..."
]
```

### 2. Update Social & Academic Links
In `assets/js/content.js`, update the `links` array with your URLs:

```javascript
links: [
  { label: "Google Scholar", icon: "fa-solid fa-graduation-cap", url: "https://scholar.google.com/citations?user=YOUR_ID" },
  { label: "arXiv", icon: "fa-solid fa-book-open", url: "https://arxiv.org/a/your_id" },
  { label: "ORCID", icon: "fa-brands fa-orcid", url: "https://orcid.org/0000-0000-0000-0000" },
  { label: "GitHub", icon: "fa-brands fa-github", url: "https://github.com/your-username" },
  { label: "Curriculum Vitae", icon: "fa-solid fa-file-pdf", url: "assets/pdf/cv.pdf", isCv: true }
]
```

### 3. Add Publications
Add papers to the `publications` array:

```javascript
{
  id: "author2026title",
  title: "Your Paper Title with LaTeX Support $O(N \\log N)$",
  authors: ["Your Name", "Co-author One", "Co-author Two"],
  venue: "NeurIPS / ICML / CVPR / Journal Name",
  year: 2026,
  type: "conference", // 'conference' | 'journal' | 'preprint'
  badge: "Oral / Spotlight", // or null
  links: {
    pdf: "https://...",
    arxiv: "https://arxiv.org/abs/...",
    code: "https://github.com/...",
    project: "https://..."
  },
  abstract: "Your paper abstract here...",
  bibtex: `@inproceedings{author2026title,
  title     = {Your Paper Title},
  author    = {Author, One and Author, Two},
  booktitle = {Conference},
  year      = {2026}
}`
}
```

---

## Deploying to GitHub Pages (`<username>.github.io`)

GitHub Pages hosts personal sites for free at `https://<username>.github.io`.

### Method A: Using Git (Command Line)

1. Create a new public repository on GitHub named:
   ```text
   <your-github-username>.github.io
   ```
   *(Example: if your GitHub username is `johndoe`, name the repository `johndoe.github.io`)*.

2. In your local `academic-website` folder, initialize git and push:
   ```bash
   git init
   git add .
   git commit -m "Initial academic website release"
   git branch -M main
   git remote add origin https://github.com/<your-github-username>/<your-github-username>.github.io.git
   git push -u origin main
   ```

3. Open **Settings > Pages** in your GitHub repository and ensure the source is set to:
   - **Branch**: `main`
   - **Folder**: `/ (root)`

4. Your website will be live at:
   ```text
   https://<your-github-username>.github.io
   ```

---

### Method B: Uploading via GitHub Web Interface (No Command Line Needed)

1. Create the repository `<your-github-username>.github.io` on [github.com/new](https://github.com/new).
2. Click **"uploading an existing file"** on the repo home page.
3. Drag and drop all files and folders from `academic-website/` into GitHub.
4. Commit the changes. GitHub Pages will build and publish your site automatically within 1–2 minutes!

---

## Custom Domain (Optional)

If you own a custom domain (e.g., `www.yourname.com`):
1. In your GitHub repository, go to **Settings > Pages > Custom domain**.
2. Enter your custom domain name and click **Save**.
3. In your DNS provider (e.g., Cloudflare, Namecheap, Google Domains), point your `CNAME` or `A` records to GitHub Pages:
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`
