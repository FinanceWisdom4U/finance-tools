# Finance Tools

A collection of free, open-source Indian finance calculators built with React.
Each tool is a standalone component — add new tools by dropping a JSX file and registering a route.

---

## Live Tools

| Tool | Path |
|---|---|
| New Regime Salary Calculator | `/finance-tools/new-regime-salary-calculator` |

---

## Tech Stack

- **React 18** — UI framework
- **React Router v6** — client-side routing
- **GitHub Actions** — automated build on every push
- **Hostinger** — static file hosting (manual upload or FTP deploy)

---

## Project Structure

```
finance-tools/
├── public/
│   ├── index.html              ← app entry point
│   └── .htaccess               ← fixes React Router on Apache/Hostinger
├── src/
│   ├── index.js                ← React root
│   ├── App.jsx                 ← routing + tool registry
│   └── tools/
│       └── NewRegimeSalaryCalc.jsx   ← tool #1
├── .github/
│   └── workflows/
│       └── deploy.yml          ← GitHub Actions build pipeline
└── package.json
```

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
5. Copies `public/.htaccess` into `build/` manually (react-scripts skips dotfiles)
6. Uploads `build/` as a downloadable artifact (retained 7 days)

> FTP auto-deploy to Hostinger is present in `deploy.yml` but commented out.
> Enable it by uncommenting and adding `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`
> in **Repo → Settings → Secrets and variables → Actions**.

---

## Manual Deploy to Hostinger

**Step 1** — Download build artifact:
```
GitHub → Actions → latest green run → Artifacts → download "build"
```

**Step 2** — Unzip the downloaded `build.zip`

**Step 3** — Enable hidden files on Windows (to see `.htaccess`):
```
File Explorer → View → Show → Hidden items ✅
```

**Step 4** — Upload ALL contents to Hostinger:
```
hPanel → Files → File Manager → public_html/finance-tools/
Upload: index.html, asset-manifest.json, .htaccess, static/
```

**Step 5** — If `.htaccess` is still not visible, create it manually in Hostinger:
```
File Manager → public_html/finance-tools/ → New File → .htaccess
```
Paste this content:
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QL]
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

FTP_SERVER    → your Hostinger FTP server hostname
FTP_USERNAME  → your FTP username
FTP_PASSWORD  → your FTP password
```

---

## Known Issues & Fixes

| Issue | Fix |
|---|---|
| `Dependencies lock file is not found` | Remove `cache: "npm"` from setup-node step in `deploy.yml` |
| `'ComponentName' is not defined` | Import name in `App.jsx` must match export name in tool file |
| ESLint errors fail the build | Add `DISABLE_ESLINT_PLUGIN: true` env to build step |
| `.htaccess` missing from build zip | Add `cp public/.htaccess build/.htaccess` step after build |
| Page refresh gives 404 on Hostinger | `.htaccess` is missing — create it manually in File Manager |

---

## License

MIT — free to use, modify and distribute.
