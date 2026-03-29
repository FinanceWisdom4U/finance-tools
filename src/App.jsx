import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import NewRegimeSalaryCalc from "./tools/NewRegimeSalaryCalc";

const TOOLS = [
  { path: "new-regime-salary-calculator", label: "New Regime Salary Calculator", desc: "In-hand salary with new tax regime" },
  // { path: "sip-calculator",    label: "SIP Calculator",    desc: "Mutual fund SIP returns" },
  // { path: "emi-calculator",    label: "EMI Calculator",    desc: "Loan EMI & prepayment" },
];

const SITE = "FinanceWisdom4U";

// Map pathname → page title (basename-relative paths)
const PAGE_TITLES = {
  "/": `Finance Tools – ${SITE}`,
  "/new-regime-salary-calculator": `New Regime Salary Calculator FY 2026-27 – ${SITE}`,
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

function Home() {
  return (
    <div style={{ maxWidth: 680, margin: "60px auto", padding: "0 20px", fontFamily: "system-ui,sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Finance Tools</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Free calculators for smart financial decisions</p>
      <div style={{ display: "grid", gap: 16 }}>
        {TOOLS.map(t => (
          <Link key={t.path} to={`/${t.path}`} style={{ textDecoration: "none" }}>
            <div
              style={{ padding: "20px 24px", border: "1px solid #e5e7eb", borderRadius: 12,
                background: "#fff", cursor: "pointer", transition: "box-shadow .15s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
            >
              <div style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>{t.label}</div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>{t.desc}</div>
            </div>
          </Link>
        ))}
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
        {/* Add new tool routes here */}
      </Routes>
    </BrowserRouter>
  );
}
