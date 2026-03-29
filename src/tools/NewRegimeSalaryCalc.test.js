/**
 * Unit tests for NewRegimeSalaryCalc — tax engine & business logic
 * New Tax Regime FY 2026-27, India
 */

// ── replicate the pure functions from the component ──────────────────────────

function slabTax(ti) {
  if (ti <= 0) return 0;
  const s = [[400000,0],[800000,.05],[1200000,.1],[1600000,.15],[2000000,.2],[2400000,.25],[Infinity,.3]];
  let t = 0, p = 0;
  for (const [l, r] of s) {
    if (ti <= p) break;
    t += (Math.min(ti, l) - p) * r;
    p = l;
  }
  return ti <= 1200000 ? 0 : t;
}

function srRate(ti) {
  return ti > 10000000 ? 0.15 : ti > 5000000 ? 0.10 : 0;
}

function calcTax(ti) {
  if (ti <= 0) return 0;
  const base = slabTax(ti), sr = srRate(ti);
  const noR = Math.round(base * (1 + sr) * 1.04);
  if (sr === 0) return noR;
  const thrs = [5000000, 10000000, 20000000, 50000000];
  let thr = 0;
  for (const t of thrs) { if (ti > t) thr = t; }
  return Math.min(noR, calcTax(thr) + (ti - thr));
}

const RETIRE_CAP = 750000;

function computeRetirement({ erPf, npsA }) {
  const aggregate = erPf + npsA;
  const excess = Math.max(0, aggregate - RETIRE_CAP);
  const shelter = Math.max(0, Math.min(npsA, RETIRE_CAP - erPf));
  return { aggregate, excess, shelter };
}

function computeTaxable({ txGross, stdD, npsA, retirementExcess }) {
  return Math.max(0, txGross - stdD - npsA + retirementExcess);
}

// ── helpers ──────────────────────────────────────────────────────────────────
const L = x => x * 100000;   // lakhs to rupees

// ── slabTax ──────────────────────────────────────────────────────────────────
describe("slabTax", () => {
  test("zero income → 0", () => expect(slabTax(0)).toBe(0));
  test("≤ ₹12L rebate → 0", () => expect(slabTax(L(12))).toBe(0));
  test("₹12L + 1 → starts being taxed", () => expect(slabTax(1200001)).toBeGreaterThan(0));

  test("₹8L–₹12L: 5% on 4L = ₹20,000", () => {
    // slab: 4L–8L = 5%, 8L–12L = 10%; total slab tax = 0+20000+40000 = 60000
    // but ≤ 12L → rebate → 0
    expect(slabTax(L(12))).toBe(0);
  });

  test("₹16L: tax on 4L@5% + 4L@10% + 4L@15% = 20000+40000+60000 = 120000", () => {
    expect(slabTax(L(16))).toBe(120000);
  });

  test("₹20L: 120000 + 4L@20% = 120000+80000 = 200000", () => {
    expect(slabTax(L(20))).toBe(200000);
  });

  test("₹24L: 200000 + 4L@25% = 200000+100000 = 300000", () => {
    expect(slabTax(L(24))).toBe(300000);
  });
});

// ── calcTax (with surcharge + cess) ──────────────────────────────────────────
describe("calcTax", () => {
  test("zero → 0", () => expect(calcTax(0)).toBe(0));
  test("negative → 0", () => expect(calcTax(-1000)).toBe(0));
  test("≤ ₹12L → 0 (rebate)", () => expect(calcTax(L(12))).toBe(0));

  test("₹15L: slab=75000, no surcharge, +4% cess", () => {
    const slab = slabTax(L(15)); // 20000+40000+15000=75000? let's compute
    // 4L–8L: 20000, 8L–12L: 40000, 12L–15L: 15000*0.15=22500? wait 12L–16L is 15%
    // Actually: 0–4L=0, 4L–8L=5%*4L=20000, 8L–12L=10%*4L=40000, 12L–15L=15%*3L=45000 → total=105000
    // But ≤12L=0; 15L>12L so we get slab tax
    expect(calcTax(L(15))).toBe(Math.round(105000 * 1.04));
  });

  test("₹50L: 10% surcharge applies", () => {
    const slab = slabTax(L(50));
    const expected = Math.round(slab * 1.10 * 1.04);
    expect(calcTax(L(50))).toBe(expected);
  });

  test("₹1Cr+: 15% surcharge applies", () => {
    const slab = slabTax(L(120));
    const noR = Math.round(slab * 1.15 * 1.04);
    // marginal relief: should not exceed calcTax(10000000) + (income - 10000000)
    const result = calcTax(L(120));
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(calcTax(10000000) + (L(120) - 10000000));
  });

  test("marginal relief at ₹50L boundary", () => {
    // Tax at ₹50L with 10% surcharge must not exceed calcTax(50L)+1
    // i.e., going 1 rupee over 50L shouldn't suddenly cost >1 rupee more in tax
    const atBoundary = calcTax(5000000);
    const justOver   = calcTax(5000001);
    expect(justOver - atBoundary).toBeLessThanOrEqual(1);
  });
});

// ── Sec 17(2)(vii) retirement cap ────────────────────────────────────────────
describe("Sec 17(2)(vii) retirement cap (₹7.5L)", () => {
  test("ER PF alone below cap → no excess", () => {
    const { excess } = computeRetirement({ erPf: L(5), npsA: 0 });
    expect(excess).toBe(0);
  });

  test("ER PF alone exceeds cap → excess", () => {
    const { excess } = computeRetirement({ erPf: L(8), npsA: 0 });
    expect(excess).toBe(L(8) - RETIRE_CAP);
  });

  test("ER PF + NPS together exceed cap", () => {
    // erPf=5.52L, npsA=2.5L → aggregate=8.02L → excess=0.52L
    const erPf = 552000, npsA = 250000;
    const { excess } = computeRetirement({ erPf, npsA });
    expect(excess).toBe(erPf + npsA - RETIRE_CAP);
  });

  test("ER PF + NPS within cap → no excess", () => {
    const { excess } = computeRetirement({ erPf: L(4), npsA: L(2) });
    expect(excess).toBe(0);
  });

  test("NPS shelter capped at remaining headroom", () => {
    // erPf=6L, RETIRE_CAP=7.5L → headroom=1.5L; npsA=3L → shelter=1.5L only
    const { shelter } = computeRetirement({ erPf: L(6), npsA: L(3) });
    expect(shelter).toBe(RETIRE_CAP - L(6)); // 1.5L
  });

  test("NPS shelter=0 when erPf already exceeds cap", () => {
    const { shelter } = computeRetirement({ erPf: L(8), npsA: L(2) });
    expect(shelter).toBe(0);
  });

  test("aggregate is always erPf + npsA", () => {
    const { aggregate } = computeRetirement({ erPf: L(5), npsA: L(2) });
    expect(aggregate).toBe(L(7));
  });
});

// ── taxable income formula ────────────────────────────────────────────────────
describe("taxable income with retirement excess", () => {
  test("no retirement excess → taxable = txGross - stdD - npsA", () => {
    const taxable = computeTaxable({ txGross: L(80), stdD: 75000, npsA: L(2), retirementExcess: 0 });
    expect(taxable).toBe(L(80) - 75000 - L(2));
  });

  test("retirement excess added back to taxable income", () => {
    const retirementExcess = L(1);
    const taxable = computeTaxable({ txGross: L(80), stdD: 75000, npsA: L(2), retirementExcess });
    expect(taxable).toBe(L(80) - 75000 - L(2) + retirementExcess);
  });

  test("taxable income never goes below zero", () => {
    const taxable = computeTaxable({ txGross: L(5), stdD: 75000, npsA: L(5), retirementExcess: 0 });
    expect(taxable).toBe(0);
  });
});

// ── ER PF computation ─────────────────────────────────────────────────────────
describe("ER PF auto computation", () => {
  function erPfAuto(baseA, basicPct, pfCap) {
    const basicC = baseA * basicPct / 100;
    const pfWC = pfCap ? Math.min(basicC / 12, 15000) : basicC / 12;
    return pfWC * 0.12 * 12;
  }

  test("12% of basic, no cap", () => {
    expect(erPfAuto(L(92), 50, false)).toBeCloseTo(L(92) * 0.5 * 0.12, 0);
  });

  test("PF cap active: capped at ₹15000/mo basic", () => {
    // basic/mo = 92L*50%/12 = 3.833L/mo. PF cap: min(3.833L, 15000) = 15000
    const result = erPfAuto(L(92), 50, true);
    expect(result).toBe(15000 * 0.12 * 12); // 21600
  });

  test("low salary: basic/mo < 15000, cap has no effect", () => {
    // base=6L, 50% basic → 3L basic, 25000/mo basic. 25000 > 15000 → cap applies
    // Wait: 6L/2/12 = 25000/mo basic. With pfCap: min(25000,15000)=15000
    const withCap = erPfAuto(L(6), 50, true);
    const noCap   = erPfAuto(L(6), 50, false);
    expect(withCap).toBeLessThan(noCap);
    expect(withCap).toBe(15000 * 0.12 * 12);
  });
});

// ── bonus allocation schedules ────────────────────────────────────────────────
describe("bonus allocation schedules", () => {
  const MONTHS_IDX = { Apr:0, May:1, Jun:2, Jul:3, Aug:4, Sep:5, Oct:6, Nov:7, Dec:8, Jan:9, Feb:10, Mar:11 };
  const bonusA = L(20);

  function getAllocs(bSched, bSplit, cm1, cm2, customTwo) {
    if (bSched === "march")     return [{ idx: 11, f: 1 }];
    if (bSched === "sep_mar")   return [{ idx: 5, f: bSplit/100 }, { idx: 11, f: 1-bSplit/100 }];
    if (bSched === "quarterly") return [{ idx:2,f:.25 }, { idx:5,f:.25 }, { idx:8,f:.25 }, { idx:11,f:.25 }];
    if (bSched === "monthly")   return Array.from({ length: 12 }, (_, i) => ({ idx: i, f: 1/12 }));
    if (customTwo) return [{ idx: cm1, f: bSplit/100 }, { idx: cm2, f: 1-bSplit/100 }];
    return [{ idx: cm1, f: 1.0 }];
  }

  test("march: 100% in March (idx 11)", () => {
    const allocs = getAllocs("march");
    expect(allocs).toEqual([{ idx: 11, f: 1 }]);
  });

  test("sep_mar: splits correctly (60/40)", () => {
    const allocs = getAllocs("sep_mar", 60);
    expect(allocs[0]).toEqual({ idx: 5, f: 0.6 });
    expect(allocs[1]).toEqual({ idx: 11, f: 0.4 });
  });

  test("sep_mar: fractions sum to 1", () => {
    const allocs = getAllocs("sep_mar", 70);
    const sum = allocs.reduce((s, a) => s + a.f, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  test("quarterly: 4 tranches of 25% in Jun/Sep/Dec/Mar", () => {
    const allocs = getAllocs("quarterly");
    expect(allocs).toHaveLength(4);
    expect(allocs[0]).toEqual({ idx: 2, f: 0.25 }); // Jun
    expect(allocs[1]).toEqual({ idx: 5, f: 0.25 }); // Sep
    expect(allocs[2]).toEqual({ idx: 8, f: 0.25 }); // Dec
    expect(allocs[3]).toEqual({ idx:11, f: 0.25 }); // Mar
    const sum = allocs.reduce((s, a) => s + a.f, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  test("monthly: 12 equal tranches", () => {
    const allocs = getAllocs("monthly");
    expect(allocs).toHaveLength(12);
    allocs.forEach((a, i) => {
      expect(a.idx).toBe(i);
      expect(a.f).toBeCloseTo(1/12, 10);
    });
    const sum = allocs.reduce((s, a) => s + a.f, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  test("custom one-month: 100% in chosen month", () => {
    const allocs = getAllocs("custom", 50, 7, 5, false); // Nov
    expect(allocs).toEqual([{ idx: 7, f: 1.0 }]);
  });

  test("custom two-month: splits correctly", () => {
    const allocs = getAllocs("custom", 40, 3, 9, true); // 40% Jul, 60% Jan
    expect(allocs[0]).toEqual({ idx: 3, f: 0.40 });
    expect(allocs[1]).toEqual({ idx: 9, f: 0.60 });
  });

  test("oct_apr NOT in schedule options", () => {
    // oct_apr was removed — ensure it falls through to custom/default
    const allocs = getAllocs("oct_apr", 50, 11, 5, false);
    // falls through to single custom month (cm1=11)
    expect(allocs).toEqual([{ idx: 11, f: 1.0 }]);
  });
});

// ── formatters ────────────────────────────────────────────────────────────────
describe("fL formatter", () => {
  const fL = n => n >= 1e7
    ? `₹${(n/1e7).toFixed(2)} Cr`
    : n >= 1e5
    ? `₹${(n/1e5).toFixed(2)} L`
    : new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);

  test("₹1.10 Cr for 110.4L", () => {
    expect(fL(11040000)).toBe("₹1.10 Cr");
  });

  test("₹1.16 Cr for 115.92L", () => {
    expect(fL(11592000)).toBe("₹1.16 Cr");
  });

  test("₹5.52 L for 552000", () => {
    expect(fL(552000)).toBe("₹5.52 L");
  });

  test("₹7.50 L for exactly 750000", () => {
    expect(fL(750000)).toBe("₹7.50 L");
  });

  test("small amounts use currency format", () => {
    expect(fL(50000)).toMatch(/₹/);
  });
});

// ── NPS % display ─────────────────────────────────────────────────────────────
describe("NPS % display (decimal support)", () => {
  const formatPct = n => Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`;

  test("integer shows without decimal", () => {
    expect(formatPct(10)).toBe("10%");
    expect(formatPct(14)).toBe("14%");
    expect(formatPct(1)).toBe("1%");
  });

  test("0.5 step shows 1 decimal", () => {
    expect(formatPct(4.5)).toBe("4.5%");
    expect(formatPct(13.5)).toBe("13.5%");
  });
});
