import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import NewRegimeSalaryCalc from "./tools/NewRegimeSalaryCalc";
import OfferCompare from "./tools/OfferCompare";
import PPFCalculator from "./tools/PPFCalculator";

const TOOLS = [
  { path: "new-regime-salary-calculator", label: "Salary Calculator",  desc: "In-hand salary under the New Tax Regime — slabs, PF, HRA, NPS, bonus TDS.",                  icon: "💰", color: "#047857", tags: ["Tax", "Salary", "FY 2026-27"] },
  { path: "offer-comparison-calculator",  label: "Offer Comparison",   desc: "Compare two job offers or evaluate a hike — 4-yr TC, RSU vesting, layered in-hand.",       icon: "📊", color: "#1E40AF", tags: ["Career", "Hike", "RSU"] },
  { path: "ppf-calculator",               label: "PPF Calculator",     desc: "Project PPF corpus — 15-yr lock-in + 5-yr extensions, year-by-year schedule, CSV export.", icon: "🏦", color: "#059669", tags: ["Investment", "Tax-free", "PPF"] },
  // { path: "sip-calculator",     label: "SIP Calculator",     desc: "Mutual fund SIP returns",  icon: "📈", color: "#7C3AED", tags: ["MF", "SIP"] },
  // { path: "emi-calculator",     label: "EMI Calculator",     desc: "Loan EMI & prepayment",   icon: "🏠", color: "#B45309", tags: ["Loan", "EMI"] },
];

const SITE = "FinanceWisdom4U";

// Map pathname → page title (basename-relative paths)
const PAGE_TITLES = {
  "/": `Finance Tools – ${SITE}`,
  "/new-regime-salary-calculator": `New Regime Salary Calculator FY 2026-27 – ${SITE}`,
  "/offer-comparison-calculator":  `Offer Comparison Calculator – Compare Offers & Hike – ${SITE}`,
  "/ppf-calculator":               `PPF Calculator – Corpus, Interest & Maturity Projection – ${SITE}`,
};

/* ─── Google Analytics Route Tracker ───────────────────────────
   Fires a GA pageview on every route change with correct title.
─────────────────────────────────────────────────────────────── */
function AnalyticsTracker() {
  const location = useLocation();
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] ?? `Finance Tools – ${SITE}`;
    document.title = title;
    if (window.gtag) {
      window.gtag("config", "G-LS24317CNQ", {
        page_path: "/finance-tools" + location.pathname,
        page_title: title,
      });
    }
  }, [location]);
  return null;
}

function ToolCard({ path, label, desc, icon, color, tags }) {
  return (
    <Link to={`/${path}`} style={{ textDecoration: "none", display: "block" }}>
      <div
        style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1.5px solid #E2E8F0", position: "relative", overflow: "hidden", transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease", height: "100%", display: "flex", flexDirection: "column" }}
        onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 10px 24px ${color}22`; e.currentTarget.style.borderColor = color; }}
        onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#E2E8F0"; }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color }}/>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, lineHeight: 1 }}>{icon}</div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", lineHeight: 1.25, fontFamily: "'Sora','Outfit',sans-serif" }}>{label}</div>
          </div>
        </div>
        <div style={{ color: "#64748B", fontSize: 12.5, lineHeight: 1.5, flex: 1, marginBottom: 12 }}>{desc}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {(tags || []).slice(0, 3).map(t => (
              <span key={t} style={{ background: `${color}10`, color: color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 8, letterSpacing: "0.02em" }}>{t}</span>
            ))}
          </div>
          <span style={{ color: color, fontSize: 18, fontWeight: 700, flexShrink: 0 }} aria-hidden="true">→</span>
        </div>
      </div>
    </Link>
  );
}

function Home() {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#ECFDF5 0%,#F0FDF4 25%,#F8FAFC 100%)", fontFamily: "'Outfit',system-ui,sans-serif", paddingBottom: 30 }}>
      {/* HEADER */}
      <div style={{ background: "linear-gradient(135deg,#064E3B 0%,#047857 40%,#1E40AF 100%)", padding: "30px 18px 34px", color: "#fff", boxShadow: "0 4px 20px rgba(6,78,59,.2)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, marginBottom: 14, lineHeight: 1.2 }}>
            <a href="https://financewisdom4u.com/" rel="noopener" style={{ color: "#A7F3D0", textDecoration: "none", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span aria-hidden="true" style={{ fontSize: 14, lineHeight: 1 }}>🏠</span> FinanceWisdom4U
            </a>
            <span style={{ color: "rgba(167,243,208,.5)" }}>›</span>
            <span style={{ color: "rgba(255,255,255,.78)", fontWeight: 500 }} aria-current="page">All Tools</span>
          </nav>
          <h1 style={{ fontSize: "clamp(26px,5vw,34px)", fontWeight: 800, fontFamily: "'Sora','Outfit',sans-serif", margin: 0, letterSpacing: "-0.5px", lineHeight: 1.1 }}>Finance Tools</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.78)", marginTop: 8, marginBottom: 0, maxWidth: 540, lineHeight: 1.55 }}>Free, fast, no-signup calculators for Indian tax, salary, investment &amp; retirement planning.</p>
          <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[`${TOOLS.length} calculators`, "100% free", "No signup", "Mobile-friendly"].map(t => (
              <span key={t} style={{ background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, padding: "3px 10px", fontSize: 11, fontWeight: 600, color: "#D1FAE5" }}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* TOOL GRID */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "26px 14px 0" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Available Calculators</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {TOOLS.map(t => <ToolCard key={t.path} {...t} />)}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ maxWidth: 1000, margin: "32px auto 0", padding: "18px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
        Built by <a href="https://financewisdom4u.com/" rel="noopener" style={{ color: "#047857", fontWeight: 700, textDecoration: "none" }}>FinanceWisdom4U</a> · For educational purposes — not financial advice
      </div>
    </div>
  );
}

/* ─── App Router ─────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter basename="/finance-tools">
      <AnalyticsTracker />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-regime-salary-calculator" element={<NewRegimeSalaryCalc />} />
        <Route path="/offer-comparison-calculator"  element={<OfferCompare />} />
        <Route path="/ppf-calculator"               element={<PPFCalculator />} />
      </Routes>
    </BrowserRouter>
  );
}
