import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";

/* ═══════════════════════════════════════════
   PPF CONSTANTS — Public Provident Fund rules
═══════════════════════════════════════════*/
const MAX_ANNUAL     = 150000;    // Statutory annual deposit cap
const MAX_MONTHLY    = 12500;     // 1,50,000 / 12
const MIN_KEEP_ALIVE = 500;       // Min yearly deposit to keep PPF account active
const MIN_LOCK_IN    = 15;        // Years
const EXT_BLOCK      = 5;         // Extension block size (years)
const DEFAULT_RATE   = 7.1;       // Current PPF rate (Q4 FY 2025-26)
const DEFAULT_MAX_TENURE = 35;    // Default upper pill (lock-in + 4 extensions)
const MAX_TENURE     = 75;        // Cap: e.g. open at 18 → run till 93
const buildMilestones = tenure => {
  const m=[]; for(let y=MIN_LOCK_IN; y<=tenure; y+=EXT_BLOCK) m.push(y); return m;
};
const buildTenureOpts = max => {
  const o=[]; for(let y=MIN_LOCK_IN; y<=max; y+=EXT_BLOCK) o.push(y); return o;
};

/* ═══════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════*/
const AC = "#059669";    // Principal (green)
const IC = "#F59E0B";    // Interest (amber)
const PU = "#6366F1";
const BL = "#2563EB";

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════*/
const tN = v => { if(!v&&v!==0) return 0; const n=parseFloat(String(v).replace(/,/g,"")); return isNaN(n)?0:n; };
function fmtL(val){
  if(!val&&val!==0) return "—";
  const v=Math.abs(val),s=val<0?"-":"";
  if(v>=1e7) return `${s}₹${(v/1e7).toFixed(2)} Cr`;
  if(v>=1e5) return `${s}₹${(v/1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(v).toLocaleString("en-IN")}`;
}
function fmtINR(val){
  if(!val&&val!==0) return "—";
  return `₹${Math.round(Math.abs(val)).toLocaleString("en-IN")}`;
}

/* ═══════════════════════════════════════════
   CALCULATION — year-by-year schedule
   `annualContributions` = length-`years` array of per-year deposit amounts.
   Yearly mode  (lump-sum before 5 April): interest = (opening + deposit) * r
   Monthly mode (equal deposit 1st of each month, min-balance method):
     interest = opening*r + deposit*r*(6.5/12)
   Phase-2 years (<=MIN_KEEP_ALIVE deposit) always use yearly formula since
   a ₹500/yr maintenance deposit is realistically a one-shot payment.
═══════════════════════════════════════════*/
function buildSchedule({ startYear, annualContributions, rate, years, frequency }){
  const r=rate/100; const rows=[];
  let opening=0, cumPrincipal=0, cumInterest=0;
  for(let i=1;i<=years;i++){
    const deposit=annualContributions[i-1]||0;
    const useMonthly = frequency==="monthly" && deposit>MIN_KEEP_ALIVE;
    const interest = useMonthly
      ? opening*r + deposit*r*(6.5/12)
      : (opening+deposit)*r;
    const closing=opening+deposit+interest;
    cumPrincipal+=deposit; cumInterest+=interest;
    rows.push({
      yr:i, fy:startYear+i-1, opening, deposit, interest, closing, cumPrincipal, cumInterest,
      phase:i<=MIN_LOCK_IN?"Lock-in":`Extension ${Math.ceil((i-MIN_LOCK_IN)/EXT_BLOCK)}`,
    });
    opening=closing;
  }
  return rows;
}

/* ═══════════════════════════════════════════
   PRIMITIVES (matching other tools)
═══════════════════════════════════════════*/
const LB=({children})=>(
  <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:3,fontFamily:"Outfit,sans-serif"}}>{children}</label>
);
const HT=({children})=>(
  <div style={{fontSize:11,color:"#94A3B8",marginBottom:5,fontFamily:"Outfit,sans-serif",lineHeight:1.4}}>{children}</div>
);
const ST=({children,accent})=>(
  <div style={{display:"flex",alignItems:"center",gap:6,marginTop:16,marginBottom:8}}>
    <span style={{height:1,flex:1,background:`${accent}33`}}/>
    <span style={{fontSize:10,fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:accent,fontFamily:"Outfit,sans-serif",whiteSpace:"nowrap"}}>{children}</span>
    <span style={{height:1,flex:1,background:`${accent}33`}}/>
  </div>
);

function MoneyInput({label,value,onChange,hint,placeholder="0",accent=PU,warn=null}){
  const[foc,setFoc]=useState(false);
  const raw=tN(value);
  const fmtHint=raw>0?fmtL(raw):null;
  const bdr=warn?"#DC2626":(foc?accent:"#E2E8F0");
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,gap:8,flexWrap:"wrap"}}>
        <LB>{label}</LB>
        {fmtHint&&<span className="ppf-num" style={{fontSize:12,fontWeight:800,color:warn?"#DC2626":accent,fontFamily:"Courier New,monospace",background:warn?"#FEE2E2":`${accent}14`,padding:"2px 8px",borderRadius:12,whiteSpace:"nowrap"}}>= {fmtHint}</span>}
      </div>
      {hint&&<HT>{hint}</HT>}
      <div style={{display:"flex",alignItems:"center",border:`2px solid ${bdr}`,borderRadius:12,overflow:"hidden",background:foc?"#fff":"#F8FAFC",transition:"all .15s",boxShadow:foc?`0 0 0 4px ${accent}1F`:"none"}}>
        <span style={{padding:"0 12px",color:foc?accent:"#64748B",fontSize:17,fontWeight:700,borderRight:`1px solid ${bdr}`,background:foc?"#F8F9FF":"#F1F5F9",alignSelf:"stretch",display:"flex",alignItems:"center",transition:"all .15s",flexShrink:0}}>₹</span>
        <input type="text" inputMode="numeric" value={value}
          onChange={e=>onChange(e.target.value.replace(/\D/g,""))}
          onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)} placeholder={placeholder}
          className="ppf-num"
          style={{flex:1,padding:"12px 14px",border:"none",background:"transparent",fontSize:17,fontFamily:"Courier New,monospace",outline:"none",color:"#0F172A",minWidth:0,fontWeight:700,letterSpacing:"-0.02em"}}/>
      </div>
      {warn&&<div style={{fontSize:11,color:"#DC2626",marginTop:5,fontFamily:"Outfit,sans-serif",fontWeight:600,background:"#FEF2F2",padding:"6px 10px",borderRadius:8,border:"1px solid #FECACA"}}>⚠ {warn}</div>}
    </div>
  );
}

function SliderRow({label,value,onChange,min,max,step=1,suffix="%",accent=BL,hint=null}){
  return(
    <div style={{marginBottom:14,color:accent}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4,gap:8}}>
        <LB>{label}</LB>
        <span className="ppf-num" style={{fontSize:13,fontWeight:800,color:"#fff",background:accent,padding:"3px 10px",borderRadius:20,fontFamily:"Courier New,monospace",whiteSpace:"nowrap",boxShadow:`0 2px 6px ${accent}33`}}>{value}{suffix}</span>
      </div>
      {hint&&<HT>{hint}</HT>}
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",cursor:"pointer",color:accent}}/>
    </div>
  );
}

function Pills({opts,val,onChange,accent=BL}){
  return(
    <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
      {opts.map(o=>{
        const on=val===o.v;
        return(
          <button key={o.v} className="ppf-pill" onClick={()=>onChange(o.v)} style={{padding:"8px 16px",borderRadius:22,border:on?"none":"1.5px solid #E2E8F0",cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif",fontWeight:700,background:on?accent:"#fff",color:on?"#fff":"#475569",boxShadow:on?`0 2px 8px ${accent}40`:"none",minHeight:36,lineHeight:1}}>{o.l}</button>
        );
      })}
    </div>
  );
}

function YearSelect({value,onChange,accent=BL}){
  const d=new Date();
  const now=d.getMonth()<3?d.getFullYear()-1:d.getFullYear();
  const years=[]; for(let y=now+10;y>=now-30;y--) years.push(y);
  return(
    <div style={{marginBottom:12}}>
      <LB>Starting Financial Year</LB>
      <HT>Pick any year from 30 yrs back up to 10 yrs ahead (to plan a future start).</HT>
      <select value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",padding:"12px 14px",border:"2px solid #E2E8F0",borderRadius:12,fontSize:15,fontFamily:"Courier New,monospace",fontWeight:700,color:"#0F172A",background:"#F8FAFC",outline:"none",cursor:"pointer",minHeight:44}}>
        {years.map(y=>{
          const offset=y-now;
          const tag=offset===0?" · this year":offset>0?` · +${offset} yr${offset>1?"s":""}`:` · ${-offset} yr${-offset>1?"s":""} back`;
          return <option key={y} value={y}>FY {y}-{String(y+1).slice(-2)}{tag}</option>;
        })}
      </select>
    </div>
  );
}


/* ═══════════════════════════════════════════
   CHART — Stacked Area (Principal + Interest)
═══════════════════════════════════════════*/
function GrowthChart({rows}){
  const [hover,setHover]=useState(null);
  const [isMobile,setIsMobile]=useState(()=>typeof window!=="undefined"&&window.innerWidth<640);
  useEffect(()=>{
    const onResize=()=>setIsMobile(window.innerWidth<640);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);
  const W=isMobile?480:820;
  const H=isMobile?400:340;
  const pad=isMobile
    ?{top:20,right:14,bottom:46,left:52}
    :{top:24,right:20,bottom:42,left:72};
  const IW=W-pad.left-pad.right, IH=H-pad.top-pad.bottom;
  const n=rows.length;
  const maxY=Math.max(...rows.map(r=>r.closing),1);
  const niceMax=(()=>{const p=Math.pow(10,Math.floor(Math.log10(maxY))); return Math.ceil(maxY/p)*p||1;})();
  const x=i=>pad.left+(i/n)*IW;
  const y=v=>pad.top+IH-(v/niceMax)*IH;

  const principalPath=[
    `M ${pad.left},${y(0)}`,
    ...rows.map((r,i)=>`L ${x(i+1)},${y(r.cumPrincipal)}`),
    `L ${x(n)},${y(0)} Z`,
  ].join(" ");
  const totalPath=[
    `M ${pad.left},${y(0)}`,
    ...rows.map((r,i)=>`L ${x(i+1)},${y(r.closing)}`),
    `L ${x(n)},${y(0)} Z`,
  ].join(" ");
  const totalLine=rows.map((r,i)=>`${x(i+1)},${y(r.closing)}`).join(" ");
  const principalLine=rows.map((r,i)=>`${x(i+1)},${y(r.cumPrincipal)}`).join(" ");

  const yTicks=[0,.25,.5,.75,1].map(f=>niceMax*f);
  const tickStep=(()=>{const t=isMobile?6:10; const raw=n/t; if(raw<=5)return 5; if(raw<=10)return 10; return 15;})();
  const xTicks=rows.filter(r=>r.yr%tickStep===0||r.yr===1||r.yr===n);

  function pickIdx(clientX,rect){
    const relX=(clientX-rect.left)*(W/rect.width);
    if(relX<pad.left||relX>pad.left+IW) return null;
    return Math.max(0,Math.min(n-1,Math.round((relX-pad.left)/IW*n)-1));
  }
  function onMove(e){
    const idx=pickIdx(e.clientX,e.currentTarget.getBoundingClientRect());
    setHover(idx);
  }
  function onTouch(e){
    if(!e.touches||!e.touches[0]) return;
    const idx=pickIdx(e.touches[0].clientX,e.currentTarget.getBoundingClientRect());
    if(idx!=null){ setHover(idx); e.preventDefault(); }
  }
  const hv=hover!=null?rows[hover]:null;

  return(
    <div style={{width:"100%"}}>
      <div style={{display:"flex",gap:12,marginBottom:10,flexWrap:"wrap"}}>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#475569",fontFamily:"Outfit,sans-serif"}}>
          <span style={{width:14,height:10,background:AC,borderRadius:2,display:"inline-block"}}/>Principal
        </span>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#475569",fontFamily:"Outfit,sans-serif"}}>
          <span style={{width:14,height:10,background:IC,borderRadius:2,display:"inline-block"}}/>Interest
        </span>
        <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12,color:"#475569",fontFamily:"Outfit,sans-serif"}}>
          <span style={{width:14,height:2,background:"#1E293B",display:"inline-block"}}/>Balance
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:"auto",display:"block",background:"#FAFAFA",borderRadius:10,border:"1px solid #E2E8F0",touchAction:"pan-y"}} onMouseMove={onMove} onMouseLeave={()=>setHover(null)} onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={()=>setHover(null)}>
        {yTicks.map((t,i)=>(
          <g key={i}>
            <line x1={pad.left} x2={pad.left+IW} y1={y(t)} y2={y(t)} stroke="#E5E7EB" strokeDasharray={i===0?"":"3 3"}/>
            <text x={pad.left-6} y={y(t)+4} fontSize={isMobile?13:11} fill="#64748B" textAnchor="end" fontFamily="Courier New,monospace">{fmtL(t).replace("₹","")}</text>
          </g>
        ))}
        <path d={totalPath} fill={IC} fillOpacity="0.85"/>
        <path d={principalPath} fill={AC} fillOpacity="0.95"/>
        <polyline points={totalLine} fill="none" stroke="#1E293B" strokeWidth={isMobile?2:1.5}/>
        <polyline points={principalLine} fill="none" stroke="#047857" strokeWidth={isMobile?1.5:1} strokeDasharray="4 3"/>
        {n>=15&&(()=>{
          const atEnd=15===n;
          const lx=atEnd?x(15)-4:x(15)+4;
          const anchor=atEnd?"end":"start";
          return(
            <g>
              <line x1={x(15)} x2={x(15)} y1={pad.top} y2={pad.top+IH} stroke={PU} strokeDasharray="4 4" strokeWidth="1"/>
              <text x={lx} y={pad.top+12} fontSize={isMobile?12:10} fill={PU} fontFamily="Outfit,sans-serif" fontWeight="700" textAnchor={anchor}>15-yr Lock-in</text>
            </g>
          );
        })()}
        <line x1={pad.left} x2={pad.left+IW} y1={pad.top+IH} y2={pad.top+IH} stroke="#94A3B8"/>
        {xTicks.map(t=>(
          <g key={t.yr}>
            <line x1={x(t.yr)} x2={x(t.yr)} y1={pad.top+IH} y2={pad.top+IH+4} stroke="#94A3B8"/>
            <text x={x(t.yr)} y={pad.top+IH+(isMobile?20:18)} fontSize={isMobile?13:11} fill="#64748B" textAnchor="middle" fontFamily="Outfit,sans-serif" fontWeight="600">Y{t.yr}</text>
            <text x={x(t.yr)} y={pad.top+IH+(isMobile?36:32)} fontSize={isMobile?11:9} fill="#94A3B8" textAnchor="middle" fontFamily="Courier New,monospace">{t.fy}</text>
          </g>
        ))}
        {hv&&(
          <g>
            <line x1={x(hv.yr)} x2={x(hv.yr)} y1={pad.top} y2={pad.top+IH} stroke="#64748B" strokeDasharray="2 2"/>
            <circle cx={x(hv.yr)} cy={y(hv.closing)} r={isMobile?5:4} fill="#1E293B"/>
            <circle cx={x(hv.yr)} cy={y(hv.cumPrincipal)} r={isMobile?4:3} fill={AC}/>
          </g>
        )}
      </svg>
      {hv&&(
        <div style={{marginTop:10,padding:"10px 14px",background:"linear-gradient(135deg,#1E293B,#0F172A)",color:"#fff",borderRadius:12,fontFamily:"Outfit,sans-serif",boxShadow:"0 4px 14px rgba(15,23,42,.2)"}}>
          <div style={{fontSize:12,fontWeight:800,marginBottom:6,color:"#fff"}}>Year {hv.yr} <span style={{color:"rgba(255,255,255,.55)",fontWeight:500}}>· FY {hv.fy}-{String(hv.fy+1).slice(-2)}</span></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
            <div><div style={{fontSize:10,color:"#93C5FD",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Principal</div><div className="ppf-num" style={{fontSize:13,fontFamily:"Courier New,monospace",fontWeight:700,marginTop:2}}>{fmtL(hv.cumPrincipal)}</div></div>
            <div><div style={{fontSize:10,color:"#FCD34D",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Interest</div><div className="ppf-num" style={{fontSize:13,fontFamily:"Courier New,monospace",fontWeight:700,marginTop:2}}>{fmtL(hv.cumInterest)}</div></div>
            <div><div style={{fontSize:10,color:"#6EE7B7",textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:700}}>Balance</div><div className="ppf-num" style={{fontSize:13,fontFamily:"Courier New,monospace",fontWeight:800,marginTop:2}}>{fmtL(hv.closing)}</div></div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════
   SUMMARY TABLE — milestones at 15/20/25/30/35 yrs
═══════════════════════════════════════════*/
function SummaryTable({rows,milestones}){
  const mile=milestones.filter(m=>m<=rows.length).map(m=>rows[m-1]);
  const th={padding:"10px 12px",fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"right",borderBottom:"2px solid #E2E8F0",fontFamily:"Outfit,sans-serif"};
  const td={padding:"10px 12px",fontSize:13,color:"#1E293B",textAlign:"right",borderBottom:"1px solid #F1F5F9",fontFamily:"Courier New,monospace",fontWeight:600};
  return(
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch",borderRadius:10,border:"1px solid #E2E8F0"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
        <thead>
          <tr>
            <th style={{...th,textAlign:"left"}}>Milestone</th>
            <th style={th}>FY</th>
            <th style={th}>Maturity Amount</th>
            <th style={th}>Total Deposits</th>
            <th style={th}>Total Interest</th>
            <th style={th}>Interest %</th>
          </tr>
        </thead>
        <tbody>
          {mile.map(r=>{
            const pct=r.closing>0?(r.cumInterest/r.closing*100).toFixed(1):"0.0";
            const isLockIn=r.yr===MIN_LOCK_IN;
            return(
              <tr key={r.yr} style={{background:isLockIn?"#F0FDF4":"transparent"}}>
                <td style={{...td,textAlign:"left",fontWeight:700,color:isLockIn?AC:"#1E293B",fontFamily:"Outfit,sans-serif"}}>
                  {r.yr} Years {isLockIn&&<span style={{fontSize:10,marginLeft:6,padding:"2px 6px",background:AC,color:"#fff",borderRadius:8}}>MATURITY</span>}
                </td>
                <td style={td}>{r.fy}-{String(r.fy+1).slice(-2)}</td>
                <td style={{...td,fontWeight:800,color:AC}}>{fmtL(r.closing)}</td>
                <td style={td}>{fmtL(r.cumPrincipal)}</td>
                <td style={{...td,color:IC,fontWeight:700}}>{fmtL(r.cumInterest)}</td>
                <td style={td}>{pct}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCHEDULE TABLE — year-by-year breakdown
═══════════════════════════════════════════*/
function ScheduleTable({rows}){
  const th={padding:"9px 10px",fontSize:10,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"right",borderBottom:"2px solid #E2E8F0",fontFamily:"Outfit,sans-serif",background:"#F8FAFC",position:"sticky",top:0};
  const td={padding:"8px 10px",fontSize:12,color:"#1E293B",textAlign:"right",borderBottom:"1px solid #F1F5F9",fontFamily:"Courier New,monospace"};
  return(
    <div style={{maxHeight:420,overflow:"auto",WebkitOverflowScrolling:"touch",border:"1px solid #E2E8F0",borderRadius:10}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:720}}>
        <thead>
          <tr>
            <th style={{...th,textAlign:"left"}}>Yr</th>
            <th style={{...th,textAlign:"left"}}>FY</th>
            <th style={{...th,textAlign:"left"}}>Phase</th>
            <th style={th}>Opening</th>
            <th style={th}>Deposit</th>
            <th style={th}>Interest</th>
            <th style={th}>Closing</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>{
            const ext=r.yr>MIN_LOCK_IN;
            return(
              <tr key={r.yr} style={{background:r.yr===MIN_LOCK_IN?"#F0FDF4":(ext?"#FEFCE8":"transparent")}}>
                <td style={{...td,textAlign:"left",fontWeight:700,color:"#64748B"}}>{r.yr}</td>
                <td style={{...td,textAlign:"left",color:"#64748B"}}>{r.fy}-{String(r.fy+1).slice(-2)}</td>
                <td style={{...td,textAlign:"left",fontSize:10,fontFamily:"Outfit,sans-serif",color:ext?"#B45309":AC,fontWeight:600}}>{r.phase}</td>
                <td style={td}>{fmtINR(r.opening)}</td>
                <td style={td}>{fmtINR(r.deposit)}</td>
                <td style={{...td,color:IC,fontWeight:700}}>{fmtINR(r.interest)}</td>
                <td style={{...td,fontWeight:800,color:AC}}>{fmtINR(r.closing)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN — PPF Calculator
═══════════════════════════════════════════*/
export default function PPFCalculator(){
  const today=new Date();
  const currentYear=today.getMonth()<3?today.getFullYear()-1:today.getFullYear();
  const [startYear,setStartYear]=useState(currentYear);
  const [freq,setFreq]=useState("yearly");
  const [amount,setAmount]=useState("150000");
  const [rate,setRate]=useState(DEFAULT_RATE);
  const [tenure,setTenure]=useState(15);
  const [maxTenureShown,setMaxTenureShown]=useState(DEFAULT_MAX_TENURE);
  const [plan,setPlan]=useState("uniform");
  const [fullYears,setFullYears]=useState(5);
  const [afterMode,setAfterMode]=useState("min");

  const tenureOpts=useMemo(()=>buildTenureOpts(Math.max(maxTenureShown,tenure)),[maxTenureShown,tenure]);
  const milestones=useMemo(()=>buildMilestones(tenure),[tenure]);

  const addBlock=()=>{
    const next=Math.min(MAX_TENURE,Math.max(tenure,maxTenureShown)+EXT_BLOCK);
    setTenure(next);
    setMaxTenureShown(m=>Math.max(m,next));
  };

  const amountN=tN(amount);
  const annualN=freq==="monthly"?amountN*12:amountN;
  const overCap=annualN>MAX_ANNUAL;
  const annualWarn=overCap
    ? (freq==="monthly"
        ? `Max ₹${MAX_MONTHLY.toLocaleString("en-IN")}/mo (₹${MAX_ANNUAL.toLocaleString("en-IN")}/yr cap). Excess earns no interest.`
        : `Max ₹${MAX_ANNUAL.toLocaleString("en-IN")}/yr. Excess earns no interest.`)
    : null;

  const switchFreq=next=>{
    if(next===freq) return;
    const cur=tN(amount);
    if(next==="monthly") setAmount(String(Math.round(cur/12)));
    else setAmount(String(cur*12));
    setFreq(next);
  };

  const phase1Annual=Math.min(annualN,MAX_ANNUAL);
  const phase2Annual=afterMode==="min"?MIN_KEEP_ALIVE:0;
  const efFullYears=Math.max(1,Math.min(fullYears,tenure-1));

  const contributions=useMemo(()=>Array.from({length:tenure},(_,i)=>
    plan==="uniform" || i<efFullYears ? phase1Annual : phase2Annual
  ),[tenure,plan,efFullYears,phase1Annual,phase2Annual]);

  const schedule=useMemo(()=>buildSchedule({
    startYear,
    annualContributions:contributions,
    rate,
    years:tenure,
    frequency:freq,
  }),[startYear,rate,tenure,contributions,freq]);

  const last=schedule[schedule.length-1];
  const lockInRow=schedule[MIN_LOCK_IN-1];

  const exportCSV=()=>{
    const header=["Year","FY","Phase","Opening","Deposit","Interest","Closing","Cum. Principal","Cum. Interest"];
    const lines=[header.join(",")];
    schedule.forEach(r=>lines.push([r.yr,`${r.fy}-${String(r.fy+1).slice(-2)}`,r.phase,r.opening.toFixed(2),r.deposit.toFixed(2),r.interest.toFixed(2),r.closing.toFixed(2),r.cumPrincipal.toFixed(2),r.cumInterest.toFixed(2)].join(",")));
    const blob=new Blob([lines.join("\n")],{type:"text/csv"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=`ppf-schedule-${startYear}-${tenure}yr.csv`;
    a.click(); URL.revokeObjectURL(url);
  };
  const reset=()=>{setStartYear(currentYear);setFreq("yearly");setAmount("150000");setRate(DEFAULT_RATE);setTenure(15);setMaxTenureShown(DEFAULT_MAX_TENURE);setPlan("uniform");setFullYears(5);setAfterMode("min");};

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#ECFDF5 0%,#F0FDF4 30%,#F8FAFC 100%)",fontFamily:"Outfit,sans-serif",paddingBottom:60}}>

      {/* HEADER */}
      <div className="ppf-header" style={{background:"linear-gradient(135deg,#064E3B 0%,#047857 40%,#1E40AF 100%)",padding:"26px 16px 22px",color:"#fff",boxShadow:"0 4px 20px rgba(6,78,59,.2)"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginBottom:8,flexWrap:"wrap"}}>
            <nav className="bc" aria-label="Breadcrumb" style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:6,fontSize:12,fontFamily:"Outfit,sans-serif",lineHeight:1.2}}>
              <a href="https://financewisdom4u.com/" rel="noopener" style={{color:"#A7F3D0",textDecoration:"none",fontWeight:700,display:"inline-flex",alignItems:"center",gap:5}}>
                <span aria-hidden="true" style={{fontSize:14,lineHeight:1}}>🏠</span> FinanceWisdom4U
              </a>
              <span style={{color:"rgba(167,243,208,.5)"}}>›</span>
              <Link to="/" style={{color:"#A7F3D0",textDecoration:"none",fontWeight:600}}>All Tools</Link>
              <span className="bc-leaf" style={{color:"rgba(167,243,208,.5)"}}>›</span>
              <span className="bc-leaf" style={{color:"rgba(255,255,255,.7)",fontWeight:500}} aria-current="page">PPF Calculator</span>
            </nav>
            <button onClick={reset} style={{padding:"6px 14px",borderRadius:20,border:"1.5px solid rgba(255,255,255,.35)",background:"rgba(255,255,255,.08)",color:"#D1FAE5",fontSize:12,cursor:"pointer",fontFamily:"Outfit,sans-serif",fontWeight:600,backdropFilter:"blur(4px)",flexShrink:0}}>↺ Reset</button>
          </div>
          <h1 style={{fontSize:26,fontWeight:800,fontFamily:"Sora,sans-serif",margin:0,letterSpacing:"-0.5px",lineHeight:1.15}}>PPF Calculator</h1>
          <div style={{fontSize:12,color:"#A7F3D0",marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
            {["Public Provident Fund","7.1% p.a. default","15-yr Lock-in","5-yr Extensions","Tax-free (EEE)"].map(b=>(
              <span key={b} className="ppf-tag" style={{background:"rgba(255,255,255,.14)",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,padding:"3px 9px",fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="ppf-container" style={{maxWidth:1100,margin:"0 auto",padding:"16px 14px"}}>

        {/* INPUT CARD */}
        <div className="ppf-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
          <div className="ppf-card ppf-soft-shadow" style={{background:"#fff",borderRadius:16,padding:18,border:"1.5px solid #A7F3D0",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${AC},#34D399)`}}/>
            <ST accent={AC}>Account Details</ST>
            <YearSelect value={startYear} onChange={setStartYear}/>
            <div style={{marginBottom:10}}>
              <LB>Contribution Frequency</LB>
              <HT>Statutory cap of ₹{MAX_ANNUAL.toLocaleString("en-IN")}/yr applies either way.</HT>
              <Pills opts={[{v:"yearly",l:"Yearly"},{v:"monthly",l:"Monthly"}]} val={freq} onChange={switchFreq} accent={AC}/>
            </div>
            <MoneyInput
              label={freq==="monthly"?"Monthly Contribution":"Annual Contribution"}
              value={amount} onChange={setAmount}
              hint={freq==="monthly"
                ? `Assumed deposited on 1st of each month. Max ₹${MAX_MONTHLY.toLocaleString("en-IN")}/mo (₹${MAX_ANNUAL.toLocaleString("en-IN")}/yr cap).`
                : `Assumed deposited before 5 April each year for full-year interest. Max ₹${MAX_ANNUAL.toLocaleString("en-IN")}/yr.`}
              placeholder={freq==="monthly"?"12500":"150000"}
              accent={AC} warn={annualWarn}/>
            <div style={{marginBottom:10}}>
              <LB>Tenure</LB>
              <HT>15-yr statutory lock-in, then unlimited 5-year extension blocks. Use <strong>+5</strong> to extend further (e.g. starting at 18 → run till 93).</HT>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:12}}>
                {tenureOpts.map(y=>{
                  const on=tenure===y;
                  return(
                    <button key={y} className="ppf-pill" onClick={()=>setTenure(y)} style={{padding:"8px 14px",borderRadius:22,border:on?"none":"1.5px solid #E2E8F0",cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif",fontWeight:700,background:on?AC:"#fff",color:on?"#fff":"#475569",boxShadow:on?`0 2px 8px ${AC}40`:"none",minHeight:36,lineHeight:1}}>{y} yrs</button>
                  );
                })}
                {Math.max(tenure,maxTenureShown)<MAX_TENURE&&(
                  <button className="ppf-pill" onClick={addBlock} title="Add 5 more years" aria-label="Add 5 more years" style={{padding:"8px 14px",borderRadius:22,border:`1.5px dashed ${AC}`,cursor:"pointer",fontSize:13,fontFamily:"Outfit,sans-serif",fontWeight:800,background:`${AC}10`,color:AC,minHeight:36,lineHeight:1}}>+5 yrs</button>
                )}
              </div>
            </div>
            <div style={{marginBottom:10}}>
              <LB>Contribution Plan</LB>
              <HT>Keep same amount every year, or front-load for N years then drop to ₹500/yr (minimum to keep account active) or stop altogether.</HT>
              <Pills opts={[{v:"uniform",l:"Uniform"},{v:"phased",l:"Front-load"}]} val={plan} onChange={setPlan} accent={AC}/>
            </div>
            {plan==="phased"&&(
              <div style={{padding:"12px 14px",background:"linear-gradient(135deg,#F0FDF4 0%,#ECFDF5 100%)",borderRadius:12,border:"1px dashed #86EFAC",marginBottom:4}}>
                <SliderRow label="Full contribution for first" value={efFullYears} onChange={setFullYears} min={1} max={tenure-1} step={1} suffix={` of ${tenure} yrs`} accent={AC} hint={`Years 1–${efFullYears} deposit the ${freq==="monthly"?"monthly":"annual"} amount above; years ${efFullYears+1}–${tenure} use the option below.`}/>
                <LB>After that</LB>
                <Pills opts={[{v:"min",l:`Min ₹${MIN_KEEP_ALIVE}/yr`},{v:"stop",l:"Stop (₹0/yr)"}]} val={afterMode} onChange={setAfterMode} accent={AC}/>
                <HT>{afterMode==="min"
                  ? "Account stays active; corpus keeps compounding on the existing balance."
                  : "Account becomes inactive after one missed year (per PPF rules) but balance still earns interest. You can't take loans or extend with fresh subscription."}</HT>
              </div>
            )}
          </div>

          <div className="ppf-card ppf-soft-shadow" style={{background:"#fff",borderRadius:16,padding:18,border:"1.5px solid #BFDBFE",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${BL},#60A5FA)`}}/>
            <ST accent={BL}>Return Assumptions</ST>
            <SliderRow label="Interest Rate" value={rate} onChange={setRate} min={4} max={12} step={0.1} suffix="% p.a." accent={BL} hint="Default = 7.1% (current GoI rate). Adjust to project other scenarios — actual rate is reset quarterly."/>
            {/* Live input summary */}
            <div style={{marginTop:10,padding:"14px 14px",background:"linear-gradient(135deg,#F8FAFC 0%,#F1F5F9 100%)",borderRadius:12,border:"1px solid #E2E8F0"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{display:"inline-block",width:6,height:6,borderRadius:"50%",background:BL}}/>
                <span style={{fontSize:10,fontWeight:800,color:"#475569",textTransform:"uppercase",letterSpacing:"0.08em"}}>Inputs Summary</span>
              </div>
              {[
                ["Start",`FY ${startYear}-${String(startYear+1).slice(-2)}`,false],
                ["Frequency",freq==="monthly"?"Monthly":"Yearly",false],
                [freq==="monthly"?"Per month":"Per year",fmtL(Math.min(amountN,freq==="monthly"?MAX_MONTHLY:MAX_ANNUAL)),false],
                ["Tenure",`${tenure} years`,false],
                ["Rate",`${rate}% p.a.`,false],
                ...(plan==="phased"?[["Plan",`Full × ${efFullYears}yr → ${afterMode==="min"?`₹${MIN_KEEP_ALIVE}/yr`:"₹0"}`,true]]:[]),
                ["Total deposits",fmtL(last.cumPrincipal),true],
              ].map(([k,v,hi],i,a)=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<a.length-1?"1px dashed #E2E8F0":"none",gap:10}}>
                  <span style={{fontSize:12,color:"#64748B",fontFamily:"Outfit,sans-serif"}}>{k}</span>
                  <span className="ppf-num" style={{fontSize:12,fontWeight:hi?800:700,color:hi?AC:"#0F172A",fontFamily:"Courier New,monospace",textAlign:"right",whiteSpace:"nowrap"}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* HERO RESULT */}
        <div className="ppf-hero" style={{background:"linear-gradient(135deg,#064E3B 0%,#047857 45%,#1E40AF 100%)",borderRadius:18,padding:"24px 22px",boxShadow:"0 10px 40px rgba(5,150,105,.28)",marginBottom:16,color:"#fff",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",top:-40,right:-40,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(252,211,77,.18),transparent 70%)",pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.65)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:14}}>Projected Corpus · {tenure} Years</div>
            <div className="hero-grid" style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:16,alignItems:"flex-end"}}>
              <div className="hero-primary">
                <div style={{fontSize:11,fontWeight:700,color:"#A7F3D0",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Maturity Amount</div>
                <div className="ppf-num" style={{fontSize:"clamp(26px, 7vw, 36px)",fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.8px",lineHeight:1,whiteSpace:"nowrap"}}>{fmtL(last.closing)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:6}}>FY {last.fy}-{String(last.fy+1).slice(-2)}</div>
              </div>
              <div style={{paddingLeft:12,borderLeft:"1px solid rgba(255,255,255,.18)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#93C5FD",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>You Deposited</div>
                <div className="ppf-num" style={{fontSize:"clamp(18px, 4.6vw, 22px)",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.3px",lineHeight:1.1,whiteSpace:"nowrap"}}>{fmtL(last.cumPrincipal)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:5}}>Principal</div>
              </div>
              <div style={{paddingLeft:12,borderLeft:"1px solid rgba(255,255,255,.18)"}}>
                <div style={{fontSize:10,fontWeight:700,color:"#FCD34D",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>Interest Earned</div>
                <div className="ppf-num" style={{fontSize:"clamp(18px, 4.6vw, 22px)",fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.3px",lineHeight:1.1,whiteSpace:"nowrap"}}>{fmtL(last.cumInterest)}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:5}}>{last.closing>0?((last.cumInterest/last.closing)*100).toFixed(1):"0.0"}% · tax-free</div>
              </div>
            </div>
            {tenure>MIN_LOCK_IN&&lockInRow&&(
              <div style={{marginTop:16,padding:"12px 14px",background:"rgba(255,255,255,.1)",borderRadius:12,fontSize:12,color:"rgba(255,255,255,.9)",fontFamily:"Outfit,sans-serif",lineHeight:1.5,border:"1px solid rgba(255,255,255,.08)"}}>
                <span style={{marginRight:4}}>💡</span>At 15-yr lock-in: <strong className="ppf-num" style={{fontFamily:"Courier New,monospace"}}>{fmtL(lockInRow.closing)}</strong>. Extending {tenure-MIN_LOCK_IN} more year{tenure-MIN_LOCK_IN>1?"s":""} adds <strong className="ppf-num" style={{fontFamily:"Courier New,monospace",color:"#FCD34D"}}>{fmtL(last.closing-lockInRow.closing)}</strong> (<span className="ppf-num">{(((last.closing/lockInRow.closing)-1)*100).toFixed(1)}%</span> more).
              </div>
            )}
          </div>
        </div>

        {/* CHART */}
        <div className="ppf-section ppf-soft-shadow" style={{background:"#fff",borderRadius:16,padding:"18px 16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3,fontFamily:"Outfit,sans-serif"}}>Corpus Growth Over Time</div>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:12,fontFamily:"Outfit,sans-serif"}}>Green area = your deposits (principal). Amber area = compound interest. Hover or tap to see yearly numbers.</div>
          <GrowthChart rows={schedule}/>
        </div>

        {/* SUMMARY TABLE */}
        <div className="ppf-section ppf-soft-shadow" style={{background:"#fff",borderRadius:16,padding:"18px 16px",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3,fontFamily:"Outfit,sans-serif"}}>Milestone Comparison</div>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:10,fontFamily:"Outfit,sans-serif"}}>Projected maturity and interest at each statutory milestone (15 yrs + 5-yr extensions). Swipe horizontally to see all columns.</div>
          <SummaryTable rows={schedule} milestones={milestones}/>
        </div>

        {/* SCHEDULE TABLE */}
        <div className="ppf-section ppf-soft-shadow" style={{background:"#fff",borderRadius:16,padding:"18px 16px",marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:10}}>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3,fontFamily:"Outfit,sans-serif"}}>Year-by-Year Schedule</div>
              <div style={{fontSize:11,color:"#94A3B8",fontFamily:"Outfit,sans-serif"}}>Green row = 15-yr maturity · Yellow = extension blocks · Swipe for more.</div>
            </div>
            <button onClick={exportCSV} style={{padding:"9px 16px",borderRadius:10,border:`1.5px solid ${AC}`,background:`${AC}0F`,color:AC,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Outfit,sans-serif",whiteSpace:"nowrap",minHeight:36}}>⬇ Export CSV</button>
          </div>
          <ScheduleTable rows={schedule}/>
        </div>

        {/* FOOTNOTE */}
        <details className="ppf-section" style={{fontSize:12,color:"#475569",fontFamily:"Outfit,sans-serif",lineHeight:1.65,background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #E2E8F0"}}>
          <summary style={{fontWeight:700,color:"#1E293B",cursor:"pointer",fontSize:13,listStyle:"none",display:"flex",alignItems:"center",gap:8}}>
            <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:22,height:22,borderRadius:"50%",background:`${AC}15`,color:AC,fontSize:12,fontWeight:800}}>ⓘ</span>
            Assumptions &amp; PPF Rules
            <span style={{marginLeft:"auto",fontSize:11,color:"#94A3B8",fontWeight:500}}>tap to expand</span>
          </summary>
          <div style={{marginTop:12,display:"grid",gap:10}}>
            <div><strong style={{color:AC}}>Yearly mode</strong> — lump-sum deposited before 5 April, earning full-year interest on (opening + deposit).</div>
            <div><strong style={{color:AC}}>Monthly mode</strong> — equal deposit on the 1st of each month; interest credited via the official min-balance method (~6.5 months of interest on that year's deposit). Same ₹1.5 L/yr yields a smaller corpus when spread monthly.</div>
            <div><strong style={{color:AC}}>Front-load plan</strong> — PPF requires a minimum ₹{MIN_KEEP_ALIVE}/yr to keep the account active. Skipping this makes it discontinued (balance still earns interest, but loans/partial withdrawals and extension-with-subscription are blocked until revival with a ₹50/yr penalty + arrears).</div>
            <div><strong style={{color:AC}}>Rate</strong> — GoI-notified and revised quarterly.</div>
            <div><strong style={{color:AC}}>Tax</strong> — PPF is EEE: deposit, interest and maturity are all tax-free under Sec 80C.</div>
          </div>
        </details>
      </div>

      <style>{`
        *{box-sizing:border-box;}
        html,body{-webkit-text-size-adjust:100%;}
        @media(max-width:720px){
          .ppf-grid{grid-template-columns:1fr!important;}
          .hero-grid{grid-template-columns:1fr 1fr!important;gap:14px 10px!important;}
          .hero-grid>.hero-primary{grid-column:1 / -1;}
          .ppf-card{padding:14px!important;}
          .ppf-hero{padding:18px 16px!important;}
          .ppf-section{padding:14px 12px!important;}
        }
        @media(max-width:480px){
          .bc-leaf{display:none!important;}
          .hero-grid{grid-template-columns:1fr!important;}
          .ppf-container{padding:10px 10px!important;}
          .ppf-card{padding:12px!important;border-radius:12px!important;}
          .ppf-hero{padding:16px 14px!important;border-radius:14px!important;}
          .ppf-section{padding:12px 10px!important;border-radius:12px!important;}
          .ppf-header{padding:20px 14px 16px!important;}
          .ppf-header h1{font-size:20px!important;}
          .ppf-tag{font-size:9px!important;padding:2px 7px!important;}
        }
        input[type=range]{height:6px;border-radius:3px;-webkit-appearance:none;appearance:none;background:#E2E8F0;}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid currentColor;box-shadow:0 2px 6px rgba(0,0,0,.15);cursor:pointer;margin-top:-8px;}
        input[type=range]::-moz-range-thumb{width:22px;height:22px;border-radius:50%;background:#fff;border:3px solid currentColor;box-shadow:0 2px 6px rgba(0,0,0,.15);cursor:pointer;}
        table td,table th{word-break:normal;white-space:nowrap;}
        select{-webkit-appearance:auto;}
        .ppf-pill{transition:all .15s ease;touch-action:manipulation;}
        .ppf-pill:active{transform:scale(.96);}
        .ppf-scroll-hint{position:relative;}
        .ppf-scroll-hint::after{content:"";position:absolute;top:0;right:0;bottom:0;width:24px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.95));pointer-events:none;border-radius:0 10px 10px 0;}
        .ppf-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum";}
        .ppf-soft-shadow{box-shadow:0 1px 2px rgba(15,23,42,.04),0 4px 12px rgba(15,23,42,.05);}
      `}</style>
    </div>
  );
}

