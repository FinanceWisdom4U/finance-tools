import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import NewRegimeSalaryCalc from "./tools/NewRegimeSalaryCalc";

/* ─── Tool Registry ───────────────────────────────────────────
   To add a new tool:
   1. Create src/tools/YourTool.jsx
   2. import YourTool from "./tools/YourTool"
   3. Add an entry in TOOLS array
   4. Add a <Route> below
─────────────────────────────────────────────────────────────── */
const TOOLS = [
  { path: "new-regime-salary-calculator", label: "New Regime Salary Calculator", desc: "In-hand salary with new tax regime" },
  // { path: "sip-calculator",    label: "SIP Calculator",    desc: "Mutual fund SIP returns" },
  // { path: "emi-calculator",    label: "EMI Calculator",    desc: "Loan EMI & prepayment" },
];

function Home() {
  return (
    <div style={{ maxWidth: 680, margin: "60px auto", padding: "0 20px", fontFamily: "system-ui,sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Finance Tools</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Free calculators for smart financial decisions</p>
      <div style={{ display: "grid", gap: 16 }}>
        {TOOLS.map(t => (
          <Link key={t.path} to={t.path} style={{ textDecoration: "none" }}>
            <div style={{ padding: "20px 24px", border: "1px solid #e5e7eb", borderRadius: 12,
              background: "#fff", cursor: "pointer", transition: "box-shadow .15s" }}
              onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.08)"}
              onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>
              <div style={{ fontWeight: 600, fontSize: 16, color: "#111" }}>{t.label}</div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>{t.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/finance-tools">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new-regime-salary-calculator" element={<NewRegimeSalaryCalc />} />
        {/* Add new tool routes here */}
      </Routes>
    </BrowserRouter>
  );
}
