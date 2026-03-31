# Finance Tools

A collection of free, open-source Indian finance calculators built with React.
Each tool is a standalone component — add new tools by dropping a JSX file and registering a route.

---

## Live Tools

| Tool | Path | Description |
|---|---|---|
| New Regime Salary Calculator | `/finance-tools/new-regime-salary-calculator` | Compute take-home salary under the New Tax Regime FY 2026-27 — slabs, PF, HRA, NPS, bonus TDS |
| Offer Comparison Calculator | `/finance-tools/offer-comparison` | Compare a current offer vs a new offer across 4 years — base, bonus, RSU/LTI, joining bonus, increments, in-hand breakdown |

---

## Tech Stack

- **React 18** — UI framework
- **React Router v6** — client-side routing
- **GitHub Actions** — automated build on every push
- **Apache / LiteSpeed** — static file hosting (manual upload or FTP deploy)

---

## Project Structure

```
finance-tools/
├── public/
│   ├── index.html              ← app entry point
│   └── .htaccess               ← fixes React Router inside finance-tools/
├── src/
│   ├── index.js                ← React root
│   ├── App.jsx                 ← routing + tool registry
│   └── tools/
│       ├── NewRegimeSalaryCalc.jsx   ← tool #1: salary calculator
│       ├── NewRegimeSalaryCalc.test.js
│       └── OfferCompare.jsx          ← tool #2: offer comparison
├── .github/
│   └── workflows/
│       ├── deploy.yml          ← GitHub Actions build + artifact upload
│       └── pages.yml           ← GitHub Pages dev preview
└── package.json
```

---

## Tool: Offer Comparison Calculator

**Path:** `/finance-tools/offer-comparison`
**File:** `src/tools/OfferCompare.jsx`

Side-by-side job offer comparison across 4 years with full TC and in-hand breakdown.

### Features

- **Current vs New Offer** — base, bonus, ER PF, RSU/LTI, joining bonus, relocation, retention
- **Quick Fill / Hike Mode** — enter a hike % (0–500%) to auto-fill the new offer base; slider covers 0–100%, manual entry allows beyond 100%
- **RSU / LTI vesting** — 3 or 4 year schedules: Equal, 1-yr Cliff, Back-loaded, Google-style, Custom; supports RSU / ESOP / Cash LTI
- **Year-by-year layered comparison** — expandable accordion per year with delta table
- **In-hand breakdown** — New Tax Regime FY 2026-27, standard deduction ₹75,000, EE PF deducted, ER PF shown as employer cost; correct TDS split for regular months vs bonus month
- **PF configuration** — "On-Top of Base" (default) or "Inside Base" (ER PF baked into quoted CTC); both modes compute cashable base correctly
- **Annual increment projection** — optional per-side YoY increment; apply from Year 1 or Year 2
- **Cumulative 4-year summary** — total TC delta, breakeven year, verdict
- **Mobile responsive** — single-column stacked layout below 640px, in-hand cards stack at 480px

### Tax Engine (New Regime FY 2026-27)

Slabs: 0–4L @ 0%, 4–8L @ 5%, 8–12L @ 10%, 12–16L @ 15%, 16–20L @ 20%, 20–24L @ 25%, 24L+ @ 30%
Rebate: full rebate if taxable income ≤ ₹12L
Surcharge: >50L = 10%, >1Cr = 15%, >2Cr = 25% (new regime cap; 37% abolished Budget 2023)
Marginal relief applied at each surcharge threshold.
Cess: 4% on (tax + surcharge).

---

## Adding a New Tool

**Step 1** — Create your tool component:
```
src/tools/YourToolName.jsx
```

Make sure it has a default export:
```jsx
export default function YourToolName() {
  return <div>...</div>;
}
```

**Step 2** — Register it in `src/App.jsx`:

```jsx
// 1. Add import at top
import YourToolName from "./tools/YourToolName";

// 2. Add entry in TOOLS array
const TOOLS = [
  { path: "your-tool-name", label: "Your Tool Label", desc: "Short description" },
];

// 3. Add Route inside <Routes>
<Route path="/your-tool-name" element={<YourToolName />} />
```

**Step 3** — Commit and push → GitHub Actions builds automatically.

---

## Build Pipeline (GitHub Actions)

Every push to `main` triggers `.github/workflows/deploy.yml` which:

1. Checks out the code
2. Sets up Node.js 18
3. Runs `npm install`
4. Runs `npm run build` (with ESLint disabled for CI)
5. Copies `public/.htaccess` into `build/` manually (react-scripts skips dotfiles by default)
6. Uploads `build/` as a downloadable artifact (retained 7 days)

> FTP auto-deploy is present in `deploy.yml` but commented out.
> Enable it by uncommenting and adding `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
> in **Repo → Settings → Secrets and variables → Actions**.

---

## Manual Deploy to Hosting Server

**Step 1** — Download build artifact:
```
GitHub → Actions → latest green run → Artifacts → download "build"
```

**Step 2** — Unzip the downloaded `build.zip`

**Step 3** — Enable hidden files on Windows to see `.htaccess`:
```
File Explorer → View → Show → Hidden items ✅
```

**Step 4** — Upload ALL contents to your server:
```
File Manager → public_html/finance-tools/
Upload: index.html, asset-manifest.json, .htaccess, static/
```

**Step 5** — If `.htaccess` is missing from zip, create it manually on the server:
```
File Manager → public_html/finance-tools/ → New File → .htaccess
```

Paste this exact content (each rule on its own line):
```apache
Options -MultiViews
RewriteEngine On
RewriteBase /finance-tools/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

---

## Critical — Root `.htaccess` Configuration

This is the most important step for direct URL access to work (e.g. sharing a tool URL directly).

When hosted alongside a WordPress site on Apache/LiteSpeed, the root `public_html/.htaccess` must have a React exclusion block added **above** the `# BEGIN WordPress` section.

Add this block between `# END NON_LSCACHE` and `# BEGIN WordPress`:

```apache
# React Finance Tools — exclude from WordPress routing
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/finance-tools
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^finance-tools/.* /finance-tools/index.html [L]
</IfModule>
```

**Why this is needed:** WordPress's `RewriteRule . /index.php [L]` catches ALL unrecognised URLs
and serves a WordPress 404. Without the exclusion block, any direct link to a React route
(e.g. `/finance-tools/new-regime-salary-calculator`) gets intercepted by WordPress before
React Router can handle it.

**Important:** Never put this block inside `# BEGIN WordPress` / `# END WordPress` markers —
WordPress will overwrite it on every settings save.

### Full working .htaccess combination

**`public_html/finance-tools/.htaccess`** — React Router rules only:
```apache
Options -MultiViews
RewriteEngine On
RewriteBase /finance-tools/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

**`public_html/.htaccess`** — add above `# BEGIN WordPress`:
```apache
# React Finance Tools — exclude from WordPress routing
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteCond %{REQUEST_URI} ^/finance-tools
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^finance-tools/.* /finance-tools/index.html [L]
</IfModule>
```

---

## Enable Auto FTP Deploy (Optional)

When ready to automate deploys, edit `.github/workflows/deploy.yml` and uncomment:

```yaml
# - name: Deploy via FTP to Hostinger
#   uses: SamKirkland/FTP-Deploy-Action@v4.3.4
#   with:
#     server: ${{ secrets.FTP_SERVER }}
#     username: ${{ secrets.FTP_USERNAME }}
#     password: ${{ secrets.FTP_PASSWORD }}
#     local-dir: ./build/
#     server-dir: /public_html/finance-tools/
```

Then add secrets in:
```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret

FTP_SERVER    → your hosting FTP server hostname
FTP_USERNAME  → your FTP username
FTP_PASSWORD  → your FTP password
```

---

## Known Issues & Fixes

| Issue | Fix |
|---|---|
| `Dependencies lock file is not found` | Remove `cache: "npm"` from setup-node step in `deploy.yml` |
| `'ComponentName' is not defined` | Import name in `App.jsx` must exactly match the export name in the tool file |
| ESLint errors fail the build | Add `DISABLE_ESLINT_PLUGIN: true` env under the build step in `deploy.yml` |
| `.htaccess` missing from build zip | Add `cp public/.htaccess build/.htaccess` step after build in `deploy.yml` |
| Direct URL gives WordPress 404 | Add React exclusion block above `# BEGIN WordPress` in root `.htaccess` |
| Page refresh gives 404 inside app | `finance-tools/.htaccess` is missing or has wrong `RewriteBase` |
| Assets (JS/CSS) not loading | Check `homepage` field in `package.json` matches the actual deployment path |

---

## License

MIT — free to use, modify and distribute.
