import { useState, useMemo } from "react";

// ── formatters ────────────────────────────────────────────────────────────────
const fi = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
const fL = n => n>=1e7?`₹${(n/1e7).toFixed(2)} Cr`:n>=1e5?`₹${(n/1e5).toFixed(2)} L`:fi(n);
const fN = n => new Intl.NumberFormat("en-IN",{maximumFractionDigits:0}).format(n);
const tN = s => parseInt(String(s).replace(/,/g,"").replace(/\D/g,""))||0;

// ── tax engine (New Regime FY 2026-27) ───────────────────────────────────────
function slabTax(ti){
  if(ti<=0)return 0;
  const s=[[400000,0],[800000,.05],[1200000,.1],[1600000,.15],[2000000,.2],[2400000,.25],[Infinity,.3]];
  let t=0,p=0; for(const[l,r]of s){if(ti<=p)break;t+=(Math.min(ti,l)-p)*r;p=l;}
  return ti<=1200000?0:t;
}
function srRate(ti){return ti>10000000?.15:ti>5000000?.10:0;}  // simplified: >1Cr=15%, >50L=10%, new regime cap 25% for >2Cr
function calcTax(ti){
  if(ti<=0)return 0;
  const base=slabTax(ti),sr=srRate(ti);
  const noR=Math.round(base*(1+sr)*1.04);
  if(sr===0)return noR;
  const thrs=[5000000,10000000,20000000,50000000];
  let thr=0; for(const t of thrs){if(ti>t)thr=t;}
  return Math.min(noR, calcTax(thr)+(ti-thr));
}

// ── tokens ────────────────────────────────────────────────────────────────────
const T={
  bg:"#F2EEE8",cv:"#FDFCFA",card:"#FFFFFF",border:"#E2DDD6",b2:"#C8C0B6",
  ink:"#12100E",i2:"#3D342C",i3:"#9A8D83",i4:"#CABDB5",
  em:"#047857",eBg:"#ECFDF5",eDk:"#064E3B",eLt:"#A7F3D0",
  ro:"#B91C1C",rBg:"#FFF1F1",
  am:"#92400E",aR:"#D97706",aBg:"#FFFBEB",
  bl:"#1E40AF",bBg:"#EFF6FF",bLt:"#DBEAFE",
  vi:"#5B21B6",vBg:"#F5F3FF",
  teal:"#0D9488",tBg:"#F0FDFA",
  sh:"0 1px 3px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)",
  sh2:"0 4px 24px rgba(0,0,0,0.08),0 1px 6px rgba(0,0,0,0.04)",
  sh3:"0 14px 48px rgba(0,0,0,0.12),0 4px 14px rgba(0,0,0,0.06)",
  gEm:"linear-gradient(135deg,#047857,#10B981)",
  gBl:"linear-gradient(135deg,#1E40AF,#3B82F6)",
  gAm:"linear-gradient(135deg,#92400E,#F59E0B)",
  gRo:"linear-gradient(135deg,#991B1B,#EF4444)",
  gVi:"linear-gradient(135deg,#5B21B6,#8B5CF6)",
  gTl:"linear-gradient(135deg,#0D9488,#14B8A6)",
};

const MONTHS=["Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec","Jan","Feb","Mar"];

// ── small components ──────────────────────────────────────────────────────────
const Bdg=({c,bg,l,grad})=><span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:grad?"#fff":c,background:grad||bg,padding:"4px 11px",borderRadius:100,whiteSpace:"nowrap",boxShadow:grad?`0 2px 10px ${c}50,inset 0 1px 0 rgba(255,255,255,.25)`:`inset 0 0 0 1.5px ${c}30`}}>{l}</span>;

function Tog({on,set,col}){
  const g=col==="em"||!col?T.gEm:col===T.vi?T.gVi:col===T.ro||col===T.ro?T.gRo:`linear-gradient(135deg,${col},${col})`;
  return <div onClick={()=>set(!on)} style={{width:48,height:27,borderRadius:14,
    background:on?g:T.b2,position:"relative",cursor:"pointer",flexShrink:0,
    transition:"all .22s",
    boxShadow:on?`0 2px 8px ${(col||T.em)}44,0 0 0 3px ${(col||T.em)}18`:"0 1px 3px rgba(0,0,0,0.15)"}}>
    <div style={{width:21,height:21,borderRadius:11,
      background:on?"#fff":"#f8f6f4",position:"absolute",
      top:3,left:on?24:3,transition:"left .22s cubic-bezier(.34,1.56,.64,1)",
      boxShadow:on?"0 2px 8px rgba(0,0,0,.25)":"0 1px 4px rgba(0,0,0,.15)"}}/>
  </div>;
}

function Seg({opts,val,set}){
  return <div style={{display:"flex",background:T.bg,borderRadius:13,padding:4,border:`1px solid ${T.border}`,gap:3,boxShadow:"inset 0 1px 3px rgba(0,0,0,0.06)"}}>
    {opts.map(([v,l])=>{const act=val===v; return <button key={v} onClick={()=>set(v)} style={{
      flex:1,padding:"9px 8px",border:"none",borderRadius:10,cursor:"pointer",
      background:act?T.cv:"transparent",
      color:act?T.ink:T.i3,fontWeight:act?700:400,fontSize:13,
      boxShadow:act?"0 2px 10px rgba(0,0,0,0.09),0 1px 3px rgba(0,0,0,0.05)":"none",
      fontFamily:"inherit",transition:"all .18s",letterSpacing:act?"-0.015em":"0.005em"
    }}>{l}</button>;})}
  </div>;
}

function MoneyIn({label,hint,val,set,acc,ph="0"}){
  const[foc,setFoc]=useState(false);
  const a=acc||T.bl;
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
      <label style={{fontSize:12,fontWeight:700,color:T.i2,letterSpacing:"0.01em"}}>{label}</label>
      {hint&&<span style={{fontSize:11,color:T.i3}}>{hint}</span>}
    </div>
    <div style={{display:"flex",alignItems:"center",background:T.cv,
      border:`2px solid ${foc?a:T.border}`,borderRadius:12,padding:"10px 16px",gap:8,
      transition:"border-color .15s",boxShadow:foc?`0 0 0 3px ${a}18`:"none"}}>
      <span style={{color:foc?a:T.i3,fontSize:18,fontWeight:300,transition:"color .15s"}}>₹</span>
      <input value={val} placeholder={ph}
        onChange={e=>{const r=e.target.value.replace(/,/g,"").replace(/\D/g,"");set(r?fN(parseInt(r)):"");}}
        onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
        className="money-input" style={{flex:1,background:"none",border:"none",outline:"none",fontSize:20,fontWeight:800,color:T.ink,fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em"}}/>
      {val&&<span style={{fontSize:12,color:T.i3,background:T.bg,border:`1px solid ${T.border}`,padding:"4px 10px",borderRadius:8,fontWeight:600}}>{fL(tN(val))}</span>}
    </div>
  </div>;
}

function Card({title,icon,acc,children}){
  const a=acc||T.bl;
  return <div style={{background:T.card,borderRadius:20,border:`1px solid ${T.border}`,boxShadow:T.sh2,overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"15px 22px",
      borderBottom:`1px solid ${T.border}55`,
      background:`linear-gradient(105deg,${a}0d 0%,transparent 70%)`,
      position:"relative"}}>
      <div style={{position:"absolute",left:0,top:"20%",bottom:"20%",width:3.5,
        background:`linear-gradient(180deg,${a},${a}44)`,borderRadius:"0 3px 3px 0"}}/>
      <div style={{width:38,height:38,borderRadius:12,
        background:`linear-gradient(135deg,${a}22,${a}0c)`,
        border:`1.5px solid ${a}30`,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:18,flexShrink:0}}>{icon}</div>
      <span style={{fontSize:14,fontWeight:800,color:T.ink,letterSpacing:"-0.03em",flex:1,fontFamily:"'Sora',sans-serif"}}>{title}</span>
    </div>
    <div className="card-inner" style={{padding:"10px 16px 18px"}}>{children}</div>
  </div>;
}

function Row({label,sub,val,bold,col,indent,topB,noB,muted}){
  const vc=col||(bold?T.ink:T.i2);
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:bold?"11px 0":"8px 0",paddingLeft:indent?14:0,
    borderTop:topB?`2px solid ${T.border}`:"none",
    borderBottom:noB?"none":`1px solid ${T.border}50`,
    marginTop:topB?10:0,opacity:muted?.3:1,gap:10,position:"relative"}}>
    {indent&&<div style={{position:"absolute",left:6,top:"15%",bottom:"15%",width:2.5,
      background:col?`${col}45`:`${T.border}`,borderRadius:2}}/>}
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:bold?14:13,color:bold?T.ink:T.i2,fontWeight:bold?700:400,
        lineHeight:1.35,letterSpacing:bold?"-0.02em":"0"}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:T.i3,marginTop:2,lineHeight:1.5}}>{sub}</div>}
    </div>
    <div style={{
      fontSize:bold?18:14,fontWeight:bold?800:600,color:vc,
      fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em",flexShrink:0,
      background:bold?`${vc}10`:"transparent",
      padding:bold?"5px 12px":"0",borderRadius:bold?9:0,
      border:bold?`1px solid ${vc}20`:"none"
    }}>{val}</div>
  </div>;
}

function SlabRow({range,rate,active,current}){
  return <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:11,
    background:current?"linear-gradient(to right,#FFFBEB,#FEF3C7)":active?"rgba(0,0,0,0.015)":"transparent",
    marginBottom:3,border:current?`1.5px solid ${T.aR}50`:"1px solid transparent",
    transition:"all .15s",boxShadow:current?`0 2px 8px ${T.aR}20`:"none"}}>
    <div style={{width:9,height:9,borderRadius:"50%",flexShrink:0,
      background:current?T.aR:active?T.b2:T.border,
      boxShadow:current?`0 0 0 3px ${T.aR}28`:"none",transition:"all .15s"}}/>
    <span style={{flex:1,fontSize:12,color:active?T.i2:T.i3,fontWeight:current?700:active?400:400}}>{range}</span>
    <span style={{fontSize:13,fontWeight:current?800:active?500:400,
      color:current?T.am:active?T.i2:T.i4,fontFamily:"'Courier New',monospace",letterSpacing:"-0.01em"}}>{rate}</span>
    {current&&<Bdg l="Your slab" c={T.am} grad={T.gAm}/>}
  </div>;
}

function CtcBar({segs}){
  const tot=segs.reduce((s,x)=>s+x.v,0); if(tot<=0)return null;
  return <div>
    <div style={{display:"flex",height:14,borderRadius:8,overflow:"hidden",gap:1.5,marginBottom:8}}>
      {segs.filter(s=>s.v>0).map(s=><div key={s.l} style={{flex:s.v,background:s.c,transition:"flex .4s ease"}}/>)}
    </div>
    <div style={{display:"flex",flexWrap:"wrap",gap:"4px 14px"}}>
      {segs.filter(s=>s.v>0).map(s=><div key={s.l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.i3}}>
        <div style={{width:8,height:8,borderRadius:2,background:s.c}}/><span>{s.l}</span>
        <span style={{color:T.i2,fontWeight:600,fontFamily:"'Courier New',monospace"}}>{fL(s.v)}</span>
        <span style={{color:T.i4}}>({((s.v/tot)*100).toFixed(0)}%)</span>
      </div>)}
    </div>
  </div>;
}

function Donut({segs,size=140}){
  const tot=segs.reduce((s,x)=>s+x.v,0); if(tot<=0)return null;
  const r=55,cx=70,cy=70,circ=2*Math.PI*r; let off=0;
  const arcs=segs.filter(s=>s.v>0).map(s=>{const d=s.v/tot*circ;const a={...s,dash:d,gap:circ-d,off};off+=d;return a;});
  return <svg width={size} height={size} viewBox="0 0 140 140">
    {arcs.map((a,i)=><circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.c} strokeWidth={20}
      strokeDasharray={`${a.dash} ${a.gap}`} strokeDashoffset={-a.off+circ*.25} style={{transition:"stroke-dasharray .4s"}}/>)}
    <circle cx={cx} cy={cy} r={44} fill="white"/>
  </svg>;
}

function SBar({segs,h=28}){
  const tot=segs.reduce((s,x)=>s+x.v,0); if(tot<=0)return null;
  return <div style={{display:"flex",height:h,borderRadius:8,overflow:"hidden",gap:2}}>
    {segs.filter(s=>s.v>0).map(s=><div key={s.l} title={`${s.l}: ${fL(s.v)}`}
      style={{flex:s.v,background:s.c,display:"flex",alignItems:"center",justifyContent:"center",transition:"flex .4s"}}>
      {s.v/tot>.1&&<span style={{fontSize:10,fontWeight:700,color:"#fff",opacity:.9}}>{((s.v/tot)*100).toFixed(0)}%</span>}
    </div>)}
  </div>;
}

function BarChart({data}){
  const[hov,setHov]=useState(null); if(!data?.length)return null;
  const mx=Math.max(...data.map(d=>d.total),1);
  const f_=n=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n);
  const d_=hov!==null?data[hov]:null;
  // Tooltip rendered at top of chart (not above each bar) — avoids overflow-x:auto clipping
  const TIP_H=d_?(d_.bonus>0||d_.hasPerk?86:66):0;
  return <div style={{overflowX:"auto"}}>
    <div style={{minWidth:500,padding:"0 4px",position:"relative"}}>
      {/* ── floating tooltip pinned to top of chart area ── */}
      {d_&&<div style={{
        position:"absolute",top:0,left:"50%",transform:"translateX(-50%)",
        zIndex:10,background:T.ink,color:"#fff",borderRadius:12,
        padding:"9px 14px",fontSize:11,whiteSpace:"nowrap",
        boxShadow:"0 4px 20px rgba(0,0,0,.28)",pointerEvents:"none",
        display:"flex",gap:16,alignItems:"flex-start"
      }}>
        <div>
          <div style={{fontWeight:800,marginBottom:3,color:"#E2E8F0",letterSpacing:"0.02em"}}>{MONTHS[hov]}</div>
          <div>Salary <strong style={{color:"#6EE7B7"}}>{f_(d_.inHand)}</strong></div>
          {d_.bonus>0&&<div>Bonus <strong style={{color:"#FCD34D"}}>{f_(d_.bonus)}</strong></div>}
          {d_.hasPerk&&<div>Perk <strong style={{color:"#FDE68A"}}>{f_(d_.perkNet)}</strong></div>}
        </div>
        <div>
          <div style={{color:"#FCA5A5",marginBottom:3}}>TDS <strong>{f_(d_.tds)}</strong></div>
          <div style={{paddingTop:3,borderTop:"1px solid rgba(255,255,255,.2)"}}>
            Total <strong style={{color:"#fff"}}>{f_(d_.total)}</strong>
          </div>
        </div>
      </div>}
      <div style={{display:"flex",alignItems:"flex-end",gap:3,height:200,position:"relative",marginTop:TIP_H>0?TIP_H+8:8}}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:T.border}}/>
        {data.map((d,i)=>{
          const iH=(d.inHand/mx)*170,bH=(d.bonus/mx)*170,pH=(d.perkNet/mx)*170,hv=hov===i;
          return <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",position:"relative"}}
            onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
            <div style={{width:"100%",position:"relative",display:"flex",flexDirection:"column",justifyContent:"flex-end",height:170}}>
              <div style={{width:"100%",height:iH,background:hv?"#059669":T.em,borderRadius:(bH>0||pH>0)?"0":"4px 4px 0 0",transition:"all .15s"}}/>
              {bH>0&&<div style={{position:"absolute",bottom:iH,width:"100%",height:bH,background:hv?"#34D399":"#6EE7B7",borderRadius:pH>0?"0":"4px 4px 0 0"}}/>}
              {pH>0&&<div style={{position:"absolute",bottom:iH+bH,width:"100%",height:pH,background:hv?"#F59E0B":"#FDE68A",borderRadius:"4px 4px 0 0"}}/>}
            </div>
            <div style={{fontSize:10,marginTop:3,color:hv?T.em:d.hasBonus?T.bl:d.hasPerk?T.aR:T.i3,fontWeight:hv||(d.hasBonus||d.hasPerk)?700:400}}>
              {MONTHS[i]}{d.hasPerk&&!d.hasBonus?" 🎁":""}
            </div>
          </div>;
        })}
      </div>
      <div style={{display:"flex",gap:14,marginTop:8,flexWrap:"wrap"}}>
        {[[T.em,"Monthly salary (after deductions)"],["#6EE7B7","Bonus (TDS adjusted)"],["#FDE68A","Perk / one-time (net)"]].map(([c,l])=>
          <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:T.i3}}>
            <div style={{width:9,height:9,borderRadius:2,background:c}}/>{l}
          </div>)}
      </div>
    </div>
  </div>;
}

const PRESETS=[{l:"₹6L",b:600000},{l:"₹8L",b:800000},{l:"₹12L",b:1200000},{l:"₹20L",b:2000000},{l:"₹30L",b:3000000},{l:"₹50L",b:5000000},{l:"₹1Cr",b:10000000}];
const SLABS=[[0,400000,"₹0 – ₹4 L","0%"],[400000,800000,"₹4 L – ₹8 L","5%"],[800000,1200000,"₹8 L – ₹12 L","10%"],[1200000,1600000,"₹12 L – ₹16 L","15%"],[1600000,2000000,"₹16 L – ₹20 L","20%"],[2000000,2400000,"₹20 L – ₹24 L","25%"],[2400000,Infinity,"Above ₹24 L","30%"]];

// ════════════════════════════════════════════════════════════════════════════
export default function NewRegimeSalaryCalc(){
  const[mode,setMode]=useState("breakdown");
  const[baseStr,setBaseStr]=useState("");
  const[bonusPct,setBonusPct]=useState(0);
  const[bonusManual,setBonusManual]=useState("");
  const[erPfStr,setErPfStr]=useState("");
  const[erPfOverride,setErPfOverride]=useState(false);
  const[basicPct,setBasicPct]=useState(50);
  const[pfCap,setPfCap]=useState(false);
  const[pt,setPt]=useState(true);
  const[npsOn,setNpsOn]=useState(false);
  const[npsPct,setNpsPct]=useState(10);
  const[joinMonth,setJoinMonth]=useState(0); // 0=Apr (full year), 1=May... 11=Mar
  const[bSched,setBSched]=useState("march");
  const[bSplit,setBSplit]=useState(50);
  const[cm1,setCm1]=useState(11);     // custom month 1 (default March)
  const[cm2,setCm2]=useState(5);      // custom month 2 (default Sep, only if two)
  const[customTwo,setCustomTwo]=useState(false); // false=one month, true=two months
  const[perks,setPerks]=useState([]);
  const addPerk=()=>setPerks(p=>[...p,{id:Date.now(),label:"",amount:"",monthIdx:0,taxable:false}]);
  const updPerk=(id,f,v)=>setPerks(p=>p.map(pk=>pk.id===id?{...pk,[f]:v}:pk));
  const delPerk=id=>setPerks(p=>p.filter(pk=>pk.id!==id));
  // Additional salary deductions (no tax benefit — just reduce in-hand)
  const[dedns,setDedns]=useState([]);
  const DEDN_OPTS=["Medical Insurance","Group Term Life","Loan EMI","Club Membership","Car Lease","Advance Recovery","Other"];
  const addDedn=()=>setDedns(d=>[...d,{id:Date.now(),type:"Medical Insurance",amount:"",freq:"monthly",months:Array(12).fill(true)}]);
  const updDedn=(id,f,v)=>setDedns(d=>d.map(x=>x.id===id?{...x,[f]:v}:x));
  const delDedn=id=>setDedns(d=>d.filter(x=>x.id!==id));
  const togDednMonth=(id,mi)=>setDedns(d=>d.map(x=>x.id===id?{...x,months:x.months.map((m,i)=>i===mi?!m:m)}:x));

  const baseA=tN(baseStr);
  const bmNum=tN(bonusManual);
  const bonusA=bmNum>0?bmNum:Math.round(baseA*bonusPct/100);
  const effBPct=baseA>0?Math.round(bonusA/baseA*100):0;
  const basicC=baseA*basicPct/100;
  const pfWC=pfCap?Math.min(basicC/12,15000):basicC/12;
  const erPfAuto=pfWC*.12*12;
  const erPfMan=tN(erPfStr);
  const erPfDisp=mode==="breakdown"?(erPfMan>0?erPfMan:erPfAuto):erPfAuto;
  const ctcBar=mode==="breakdown"?baseA+bonusA+erPfDisp:baseA+bonusA;

  const r=useMemo(()=>{
    if(baseA<=0)return null;
    const bA=baseA*basicPct/100, bM=bA/12;
    const pfW=pfCap?Math.min(bM,15000):bM, eeM=pfW*.12, eeA=eeM*12;
    const erF=mode==="breakdown"?(erPfMan>0?erPfMan:eeA):eeA;
    const payB=mode==="base_only"?baseA-erF:baseA;
    const allowA=Math.max(0,payB-bA), allowM=allowA/12;
    const specA=allowA;
    const ptA=pt?2400:0;
    const npsA=npsOn?Math.min(bA*npsPct/100,bA*.14):0;
    // ── Sec 17(2)(vii): ER PF + ER NPS aggregate cap ₹7.5L ─────────────────
    const retirementAggregate=erF+npsA;
    const RETIRE_CAP=750000;
    const retirementExcess=Math.max(0,retirementAggregate-RETIRE_CAP);
    // NPS benefit is zero once ER PF alone ≥ cap
    const npsEffectiveShelter=Math.max(0,Math.min(npsA,RETIRE_CAP-erF)); // NPS portion within cap
    // Total taxable perks (all months combined) affect annual tax
    const totalTaxPerks=perks.filter(p=>p.taxable).reduce((s,p)=>s+tN(p.amount),0);
    const totalExPerks =perks.filter(p=>!p.taxable).reduce((s,p)=>s+tN(p.amount),0);
    const txGross=payB+bonusA+totalTaxPerks;  // full taxable gross incl. perks
    const stdD=75000;
    // retirementExcess added back as taxable perquisite u/s 17(2)(vii)
    const taxable=Math.max(0,txGross-stdD-npsA+retirementExcess);
    const taxA=calcTax(taxable);
    // taxSaved: compare against scenario with no NPS (ER PF alone, cap still applies)
    const taxSaved=npsOn?Math.max(0,calcTax(Math.max(0,txGross-stdD+Math.max(0,erF-RETIRE_CAP)))-taxA):0;
    const sr=srRate(taxable);
    const baseTx=slabTax(taxable);
    const preCess=taxA/1.04;
    const surcharge=Math.round(preCess-baseTx);
    const cess=Math.round(taxA-preCess);
    const erDed=mode==="base_only"?erF:0;
    // Salary deductions — no tax benefit, just reduce in-hand per month
    const dednMonthly=dedns.reduce((sum,d)=>{
      const amt=tN(d.amount); if(amt<=0)return sum;
      if(d.freq==="monthly") return sum+amt;
      if(d.freq==="annual")  return sum+(amt/12);
      return sum;
    },0);
    const dednAnnual=dednMonthly*12;
    const totDA=eeA+erDed+ptA+npsA+taxA;  // tax already includes perk tax
    const inHandA=baseA+bonusA+totalTaxPerks+totalExPerks-totDA-dednAnnual;
    // Joining month prorating — joinMonth 0=Apr..11=Mar, full year=0
    // months worked this FY = 12 - joinMonth
    const workedMonths = 12 - joinMonth;
    const frac = workedMonths / 12; // fraction of FY worked

    // Prorated annual figures (tax, PF etc. all scale with months worked)
    const payBPro   = payB * frac;          // prorated payslip base
    const bonusPro  = bonusA;               // bonus doesn't prorate — paid if entitled
    const txGrossPro= payBPro + (bonusA > 0 ? bonusA * frac : 0) + totalTaxPerks * frac;
    const npsAPro   = npsA * frac;
    const stdDPro   = Math.min(stdD, stdD * frac); // std dedn also prorated (proportional)
    const taxablePro= Math.max(0, txGrossPro - stdDPro - npsAPro);
    // TDS projected on annual equivalent, then paid over worked months only
    // Employer projects: if this salary continues all year, annual tax = calcTax(annualised)
    const annualisedTaxable = Math.max(0, payB + (bonusA>0?bonusA:0) + totalTaxPerks - stdD - npsA + retirementExcess);
    const taxAPro   = joinMonth === 0 ? taxA : Math.round(calcTax(annualisedTaxable) * frac);
    const taxBase_  = Math.max(0, payB - stdD - npsA + retirementExcess);
    const annTaxMnb = joinMonth === 0 ? calcTax(taxBase_) : Math.round(calcTax(taxBase_) * frac);

    // Monthly in-hand (regular months — base TDS)
    const inHandMnb = baseA/12-(erDed/12+eeM+ptA/12+npsA/12+annTaxMnb/workedMonths+dednMonthly);

    // Annual in-hand adjusted for partial year
    const inHandAPro = payBPro + totalTaxPerks*frac + totalExPerks*frac - (eeA*frac + erDed*frac + ptA*frac + npsAPro + taxAPro + dednAnnual*frac) + (bonusA>0?bonusA:0);
    const ctcA=mode==="breakdown"?baseA+bonusA+erF:baseA+bonusA;
    const slabBnds=[0,400000,800000,1200000,1600000,2000000,2400000];
    let slabIdx=0; for(let i=slabBnds.length-1;i>=0;i--){if(taxable>slabBnds[i]){slabIdx=i;break;}}
    return{bA,bM,allowA,allowM,specA,bonusA,payB,erF,erM:erF/12,erDed,
      eeM,eeA,ptA,ptM:ptA/12,npsA,npsM:npsA/12,
      taxA,taxM:taxA/12,taxable,stdD,sr,baseTx,surcharge,cess,
      totDA,totDM:totDA/12,inHandA,inHandAPro,inHandMnb,annTaxMnb,workedMonths,taxAPro,
      ctcA,txGross,
      retirementAggregate,retirementExcess,npsEffectiveShelter,RETIRE_CAP,
      effTax:txGross>0?((taxA/txGross)*100).toFixed(1):"0",
      // Marginal rate = slab rate at top of taxable income + surcharge + cess
      marginalRate:(()=>{
        const s=srRate(taxable);
        const slabRate=taxable>2400000?.30:taxable>2000000?.25:taxable>1600000?.20:taxable>1200000?.15:taxable>800000?.10:taxable>400000?.05:0;
        return taxable>0?((slabRate*(1+s)*1.04)*100).toFixed(0):"0";
      })(),
      ihPct:ctcA>0?((inHandA/ctcA)*100).toFixed(1):"0",
      taxSaved,slabIdx,dednMonthly,dednAnnual};
  },[baseA,bonusA,basicPct,pfCap,pt,npsOn,npsPct,mode,erPfMan,perks,dedns,joinMonth]);

  // ── monthly chart data — unified event-based TDS model ──────────────────────
  const chartData=useMemo(()=>{
    if(!r)return null;
    // Build sorted list of ALL taxable income events (bonus tranches + taxable perks)
    // Each event: {idx: monthIdx(0=Apr..11=Mar), amount, type:'bonus'|'perk', label}
    const events=[];
    if(bonusA>0){
      let allocs=[];
      if(bSched==="march")allocs=[{idx:11,f:1}];
      else if(bSched==="sep_mar")allocs=[{idx:5,f:bSplit/100},{idx:11,f:1-bSplit/100}];
      else if(bSched==="oct_apr")allocs=[{idx:6,f:bSplit/100},{idx:0,f:1-bSplit/100}];
      else if(customTwo) allocs=[{idx:cm1,f:bSplit/100},{idx:cm2,f:1-bSplit/100}];
      else allocs=[{idx:cm1,f:1.0}];   // single custom month = 100%
      allocs.forEach(a=>events.push({idx:a.idx,amount:bonusA*a.f,type:"bonus",label:"Bonus"}));
    }
    perks.filter(p=>tN(p.amount)>0).forEach(p=>{
      events.push({idx:p.monthIdx,amount:tN(p.amount),type:p.taxable?"perk_tax":"perk_ex",label:p.label||"Perk"});
    });
    // Sort by month; group same-month events
    events.sort((a,b)=>a.idx-b.idx);

    // Base taxable = payslip only (no bonus, no perks)
    const taxBase=Math.max(0, r.payB - r.stdD - r.npsA);
    // For TDS spread, use prorated annual tax over worked months only
    const annTaxBase= joinMonth===0 ? calcTax(taxBase) : Math.round(calcTax(taxBase) * r.workedMonths/12);
    const annTaxFull= r.taxAPro; // prorated full tax (with bonus/perks)
    const nonTdsM=r.ptM+r.npsM+(mode==="base_only"?r.erF/12:0);
    const bPayM=baseA/12;

    // Build month array
    const ms=Array.from({length:12},(_,i)=>({
      tds:0, bonusGross:0, perkTaxGross:0, perkExGross:0,
      hasBonus:false, hasPerk:false, perkLabels:[]
    }));

    // Process events: at each event month, employer revises annual projection
    // Accumulated taxable income from events seen so far
    let taxableAccum=0;  // running total of bonus+taxable perks seen
    let tdsSoFar=0;
    let lastEventIdx=-1;

    // Get unique sorted event months
    const eventMonths=[...new Set(events.map(e=>e.idx))].sort((a,b)=>a-b);

    // Fill TDS month by month — only from joinMonth onwards
    for(let mo=0;mo<12;mo++){
      if(mo<joinMonth){ ms[mo].tds=0; continue; } // not yet joined
      const eventsThisMo=events.filter(e=>e.idx===mo);

      if(eventsThisMo.length===0){
        // No event: TDS = (revised annual tax - collected so far) / remaining worked months
        const projectedTax = joinMonth===0
          ? calcTax(Math.max(0, taxBase+taxableAccum))
          : Math.round(calcTax(Math.max(0, taxBase+taxableAccum)) * r.workedMonths/12);
        const remaining=12-mo;
        ms[mo].tds=(projectedTax-tdsSoFar)/remaining;
        tdsSoFar+=ms[mo].tds;
      } else {
        // Event(s) this month: record the income, then recalculate TDS for this month
        let bonusThisMo=0, perkTaxThisMo=0, perkExThisMo=0, labels=[];
        eventsThisMo.forEach(e=>{
          if(e.type==="bonus"){bonusThisMo+=e.amount; ms[mo].hasBonus=true;}
          else if(e.type==="perk_tax"){perkTaxThisMo+=e.amount; ms[mo].hasPerk=true; labels.push(e.label);}
          else{perkExThisMo+=e.amount; ms[mo].hasPerk=true; labels.push(e.label);}
        });
        taxableAccum+=bonusThisMo+perkTaxThisMo;
        ms[mo].bonusGross=bonusThisMo;
        ms[mo].perkTaxGross=perkTaxThisMo;
        ms[mo].perkExGross=perkExThisMo;
        ms[mo].perkLabels=labels;

        // Now employer knows the new annual total — spread remaining tax evenly
        const revisedAnnTax=calcTax(Math.max(0, taxBase+taxableAccum));
        const remaining=12-mo;
        ms[mo].tds=(revisedAnnTax-tdsSoFar)/remaining;
        tdsSoFar+=ms[mo].tds;
      }
    }

    return ms.map((m,i)=>{
      // Per-month deductions (only for months where that deduction applies)
      const mDednAmt=dedns.reduce((s,d)=>{
        const amt=tN(d.amount); if(amt<=0)return s;
        const applies=d.freq==="monthly"?d.months[i]:d.months[i]; // for annual, spread /12
        if(!applies)return s;
        return s+(d.freq==="monthly"?amt:amt/12);
      },0);
      // grossSalary = what you receive BEFORE TDS deduction (always ≥ 0)
      const grossSalary = i<joinMonth ? 0 : bPayM-r.eeM-nonTdsM-mDednAmt;
      // inHand = after TDS (can be negative in bonus month catch-up — but we show gross+tds separately)
      const tdsAmt = i<joinMonth ? 0 : m.tds;
      const perkNet=m.perkTaxGross+m.perkExGross;
      const total = Math.round(grossSalary - tdsAmt + m.bonusGross + perkNet);
      return{
        inHand:  Math.round(grossSalary),   // table "Salary" col = gross before TDS
        bonus:   Math.round(m.bonusGross),
        perkNet: Math.round(perkNet),
        perkTaxGross:Math.round(m.perkTaxGross),
        perkExGross: Math.round(m.perkExGross),
        tds:     Math.round(tdsAmt),
        hasBonus:m.hasBonus, hasPerk:m.hasPerk,
        perkLabels:m.perkLabels,
        total,  // Salary - TDS + Bonus + Perk
      };
    });
  },[r,bonusA,bSched,bSplit,cm1,cm2,customTwo,perks,dedns,mode,joinMonth]);

  const isTwice=bSched!=="march"&&bonusA>0;

  return <div style={{minHeight:"100vh",background:`radial-gradient(ellipse at top,#EDE9E3 0%,${T.bg} 60%)`,fontFamily:"'Outfit',sans-serif",color:T.ink}}>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" rel="stylesheet"/>
    <style>{`
      *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      html,body{overflow-x:hidden;-webkit-text-size-adjust:100%}
      input[type=range]{height:5px;outline:none;width:100%}
      input[type=range]::-webkit-slider-thumb{width:22px;height:22px;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.25);cursor:pointer}
      button{touch-action:manipulation}
      button:active{opacity:0.8;transform:scale(0.97)}
      ::-webkit-scrollbar{width:4px;height:4px}
      ::-webkit-scrollbar-thumb{background:#C4BDB3;border-radius:10px}
      @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

      /* ── Mobile ≤ 480px ── */
      @media(max-width:480px){
        /* Header */
        .hdr-h1{font-size:16px !important}
        .hdr-pad{padding:14px 16px 12px !important}
        /* Mode tabs */
        .ctc-mode-tab{padding:9px 10px !important}
        .ctc-mode-tab .title{font-size:12px !important}
        .ctc-mode-tab .sub{display:none !important}
        /* Card */
        .card-inner{padding:8px 14px 14px !important}
        .card-hdr{padding:11px 14px !important}
        /* Presets — scroll horizontally instead of wrap */
        .preset-row{flex-wrap:nowrap !important;overflow-x:auto !important;padding-bottom:4px;-webkit-overflow-scrolling:touch}
        .preset-row::-webkit-scrollbar{height:0}
        /* Joining month row — horizontal scroll */
        .month-row{flex-wrap:nowrap !important;overflow-x:auto !important;padding-bottom:4px;-webkit-overflow-scrolling:touch}
        .month-row::-webkit-scrollbar{height:0}
        /* Bonus timing pills */
        .timing-row{flex-wrap:nowrap !important;overflow-x:auto !important;-webkit-overflow-scrolling:touch}
        .timing-row::-webkit-scrollbar{height:0}
        /* Money input font */
        .money-input{font-size:22px !important}
        /* Row values */
        .row-val{font-size:13px !important}
        /* In-hand hero */
        .inhand-big{font-size:34px !important}
        /* Table horizontal scroll */
        .tbl-wrap{overflow-x:auto !important;-webkit-overflow-scrolling:touch}
        /* Basic % live values — stack on mobile */
        .basic-live{display:none !important}
      }
      @media(max-width:480px){
        .main-wrap{padding:10px 10px 48px !important;gap:10px !important}
        .inhand-pills{grid-template-columns:1fr 1fr !important}
        .timing-row button{padding:5px 11px !important;font-size:11px !important}
        .preset-row button{padding:4px 10px !important;font-size:11px !important}
        /* NPS cap panel — stack amounts on mobile */
        .cap-header{flex-direction:column !important;align-items:flex-start !important;gap:4px !important}
        .cap-header .cap-amt{font-size:15px !important}
        /* Retirement cap meter — smaller font */
        .retire-row{flex-wrap:wrap !important;gap:4px !important}
        /* NPS deducted/saved cards */
        .nps-cards{grid-template-columns:1fr 1fr !important}
        .nps-cards .nps-card-val{font-size:17px !important}
      }
      @media(max-width:360px){
        .ctc-mode-tab .title{font-size:11px !important}
        .hdr-h1{font-size:14px !important}
        .inhand-big{font-size:28px !important}
        .main-wrap{padding:8px 8px 48px !important}
        .nps-cards{grid-template-columns:1fr !important}
      }
    `}</style>


    {/* header */}
    <div className="hdr-pad" style={{background:"linear-gradient(135deg,#0C1A2E 0%,#1A2D1A 45%,#0C1A0C 100%)",padding:"22px 24px 20px",position:"relative",overflow:"hidden"}}>
      {/* decorative circles */}
      <div style={{position:"absolute",right:-40,top:-40,width:180,height:180,borderRadius:"50%",background:"rgba(255,255,255,0.025)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",right:60,bottom:-60,width:120,height:120,borderRadius:"50%",background:"rgba(4,120,87,0.15)",pointerEvents:"none"}}/>
      <div style={{maxWidth:700,margin:"0 auto",position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
          <div style={{width:42,height:42,borderRadius:13,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>🇮🇳</div>
          <div>
            <h1 className="hdr-h1" style={{margin:0,fontSize:20,fontWeight:800,color:"#fff",letterSpacing:"-0.03em",lineHeight:1.1,fontFamily:"'Sora',sans-serif"}}>In-Hand Salary Calculator</h1>
            <p style={{margin:"3px 0 0",fontSize:12,color:"rgba(255,255,255,0.45)",fontWeight:400}}>New Tax Regime · FY 2026–27 · India</p>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <Bdg l="New Tax Regime" c="#FEF3C7" grad="linear-gradient(135deg,#92400E,#B45309)"/>
            <Bdg l="FY 2026–27" c="#BFDBFE" grad="linear-gradient(135deg,#1E3A8A,#2563EB)"/>
            <Bdg l="PF · NPS · Surcharge · Perks" c="rgba(255,255,255,0.55)" bg="rgba(255,255,255,0.09)"/>
          </div>
          <button
            onClick={()=>{ setBaseStr(""); setBonusPct(0); setBonusManual(""); setErPfStr(""); setMode("breakdown");
              setBasicPct(50); setPfCap(false); setPt(true); setNpsOn(false); setNpsPct(10);
              setJoinMonth(0); setBSched("march"); setBSplit(50); setPerks([]); setDedns([]);
              setCustomTwo(false); setCm1(11); setCm2(5); setErPfOverride(false); }}
            style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:20,
              background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",
              color:"rgba(255,255,255,0.8)",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",
              transition:"all .15s"}}
            title="Reset all inputs to defaults">
            ↺ Clear
          </button>
        </div>
      </div>
    </div>

    <div className="main-wrap" style={{maxWidth:700,margin:"0 auto",padding:"12px 12px 48px",display:"flex",flexDirection:"column",gap:12}}>

      {/* ── INPUT ── */}
      <div style={{background:T.cv,borderRadius:16,border:`1px solid ${T.border}`,boxShadow:T.sh2,overflow:"hidden"}}>
        {/* ── CTC mode selector ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",borderBottom:`1px solid ${T.border}`}}>
          {[
            {v:"breakdown", label:"CTC Breakdown",
             chips:[{t:"Base",c:T.bl},{t:"ER PF",c:T.em,small:true},{t:"Bonus",c:"#60A5FA"}]},
            {v:"base_only",  label:"Base Only",
             chips:[{t:"Base",c:T.bl},{t:"(incl. ER PF)",c:T.em,small:true},{t:"Bonus",c:"#60A5FA"}]},
          ].map(({v,label,chips})=>{
            const act=mode===v;
            return <button key={v} onClick={()=>setMode(v)} className="ctc-mode-tab"
              style={{padding:"11px 12px 10px",border:"none",borderBottom:`3px solid ${act?T.bl:"transparent"}`,
                background:act?T.bBg:T.bg,cursor:"pointer",textAlign:"left",fontFamily:"inherit",
                borderRight:v==="breakdown"?`1px solid ${T.border}`:"none",transition:"background .15s"}}>
              <div style={{fontSize:13,fontWeight:800,color:act?T.bl:T.i2,letterSpacing:"-0.025em",marginBottom:5}}>
                {label}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:"3px 2px"}}>
                {chips.map((ch,ci)=>[
                  ci>0&&<span key={`p${ci}`} style={{fontSize:10,color:T.i4,padding:"0 1px"}}>+</span>,
                  <span key={ch.t} style={{
                    fontSize:ch.small?9:10,fontWeight:700,
                    color:act?(ch.small?"#fff":T.bl):T.i3,
                    background:act?(ch.small?T.em:T.bl+"18"):"transparent",
                    border:`1px solid ${act?(ch.small?T.em:T.bl+"50"):T.border}`,
                    padding:ch.small?"1px 5px":"1px 6px",
                    borderRadius:4,whiteSpace:"nowrap",letterSpacing:"0.01em"
                  }}>{ch.t}</span>
                ])}
              </div>
            </button>;
          })}
        </div>
        <div style={{padding:"14px 20px 18px"}}>
          <div style={{fontSize:12,color:T.i3,padding:"8px 12px",background:T.bg,borderRadius:8,marginBottom:14,lineHeight:1.6,borderLeft:`3px solid ${mode==="breakdown"?T.bl:T.em}`}}>
            {mode==="breakdown"
              ?<>Your offer letter shows <strong style={{color:T.bl}}>CTC = Base + ER&nbsp;PF + Bonus</strong> as separate line items.</>
              :<>Your offer letter shows <strong style={{color:T.em}}>Base already includes ER&nbsp;PF</strong> — only Base + Bonus listed.</>}
          </div>

          {/* Joining month */}
          <div style={{marginBottom:14,padding:"10px 14px",background:T.bg,borderRadius:12,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:joinMonth>0?10:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:15}}>📆</span>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:T.ink,letterSpacing:"-0.01em"}}>Joining Month</span>
                  <span style={{fontSize:11,color:T.i3,marginLeft:6}}>
                    {joinMonth===0?"Full year (Apr–Mar)":MONTHS[joinMonth]+" → Mar  ("+( 12-joinMonth)+" months)"}
                  </span>
                </div>
              </div>
              {joinMonth>0&&<button onClick={()=>setJoinMonth(0)} style={{fontSize:11,color:T.bl,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",padding:"0 4px"}}>Reset</button>}
            </div>
            {joinMonth>0&&<div style={{fontSize:11,color:T.am,padding:"5px 10px",background:T.aBg,borderRadius:7,borderLeft:`3px solid ${T.aR}`,marginBottom:10}}>
              Pro-rata: {12-joinMonth} of 12 months · tax &amp; PF scaled accordingly · full-year monthly in-hand stays same
            </div>}
            <div className="month-row" style={{display:"flex",gap:4,flexWrap:"wrap",marginTop:2}}>
              {MONTHS.map((m,i)=><button key={i} onClick={()=>setJoinMonth(i)} style={{
                padding:"4px 8px",borderRadius:14,fontFamily:"inherit",cursor:"pointer",fontSize:11,
                fontWeight:joinMonth===i?700:400,transition:"all .12s",flexShrink:0,
                border:`1.5px solid ${joinMonth===i?T.bl:T.border}`,
                background:joinMonth===i?T.bl:"transparent",
                color:joinMonth===i?"#fff":i===0?T.em:T.i2
              }}>{i===0?`${m} ★`:m}</button>)}
            </div>
          </div>

          {/* presets */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,color:T.i3,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:6}}>Quick Presets (Base)</div>
            <div className="preset-row" style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              {PRESETS.map(p=><button key={p.l} onClick={()=>{setBaseStr(fN(p.b));setErPfStr("");}} style={{padding:"4px 12px",borderRadius:20,border:`1px solid ${tN(baseStr)===p.b?T.bl:T.border}`,background:tN(baseStr)===p.b?T.bBg:T.cv,color:tN(baseStr)===p.b?T.bl:T.i2,fontSize:12,cursor:"pointer",fontWeight:tN(baseStr)===p.b?600:400,fontFamily:"inherit"}}>{p.l}</button>)}
            </div>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <MoneyIn label="Base / Fixed Annual Pay" hint="Basic + Taxable Allowances" val={baseStr} set={setBaseStr} acc={T.bl}/>

            {/* ── Basic Salary % ── */}
            {baseA>0&&<div style={{borderRadius:14,border:`1.5px solid ${T.bl}22`,overflow:"hidden",boxShadow:`0 2px 10px ${T.bl}0c`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                padding:"11px 16px",background:`linear-gradient(105deg,${T.bBg},${T.cv})`}}>
                <div>
                  <span style={{fontSize:13,fontWeight:800,color:T.ink,letterSpacing:"-0.02em",fontFamily:"'Sora',sans-serif"}}>Basic Salary %</span>
                  <span style={{fontSize:11,color:T.i3,marginLeft:7}}>sets PF &amp; allowances split</span>
                </div>
                <div className="basic-live" style={{display:"flex",gap:12,fontSize:12}}>
                  <span style={{color:T.i3}}>Basic&nbsp;
                    <span style={{fontWeight:800,color:T.bl,fontFamily:"'Courier New',monospace",fontSize:13}}>
                      {fi(baseA*basicPct/100/12)}
                    </span>
                  </span>
                  <span style={{color:T.i3}}>Allow&nbsp;
                    <span style={{fontWeight:800,color:T.teal,fontFamily:"'Courier New',monospace",fontSize:13}}>
                      {fi(Math.max(0,baseA-baseA*basicPct/100-erPfAuto)/12)}
                    </span>
                  </span>
                </div>
              </div>
              <div style={{padding:"10px 12px",background:T.cv}}>
                <Seg opts={[["50","50% — New Labour Law"],["40","40% — Standard"]]} val={String(basicPct)} set={v=>setBasicPct(+v)}/>
              </div>
            </div>}

            {/* ── Bonus / Variable Pay ── */}
            <div style={{borderRadius:14,border:`1.5px solid ${T.border}`,overflow:"hidden"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:4,
                padding:"11px 16px",background:`linear-gradient(105deg,${T.bg},${T.cv})`}}>
                <span style={{fontSize:13,fontWeight:800,color:T.ink,letterSpacing:"-0.02em",fontFamily:"'Sora',sans-serif"}}>Bonus / Variable Pay</span>
                <span style={{fontSize:11,color:T.i3}}>Annual · excluded from monthly</span>
              </div>
              <div style={{padding:"12px 14px",background:T.cv,display:"flex",flexDirection:"column",gap:10}}>
                {/* Slider row */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                  <span style={{fontSize:12,color:T.i3}}>
                    {bonusA===0
                      ? <span style={{color:T.i4}}>No bonus — slide or enter below</span>
                      : <><strong style={{color:T.bl,fontSize:14}}>{effBPct}%</strong><span style={{color:T.i3}}> of Base</span></>}
                  </span>
                  <span style={{fontSize:16,fontWeight:800,color:bonusA>0?T.bl:T.i4,fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em"}}>
                    {bonusA>0?fi(bonusA):"₹ 0"}
                  </span>
                </div>
                <input type="range" min={0} max={50} step={1} value={Math.min(effBPct,50)}
                  onChange={e=>{setBonusPct(+e.target.value);setBonusManual("");}}
                  style={{width:"100%",accentColor:T.bl,cursor:"pointer"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.i4}}><span>0%</span><span>50% of Base</span></div>
                {/* Manual input */}
                <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10}}>
                  <div style={{fontSize:11,fontWeight:600,color:T.i3,marginBottom:6,letterSpacing:"0.02em"}}>OR ENTER EXACT AMOUNT</div>
                  <div style={{display:"flex",alignItems:"center",background:T.bg,border:`1.5px solid ${bonusManual?T.bl:T.b2}`,borderRadius:10,padding:"8px 14px",gap:8,transition:"border-color .15s",boxShadow:bonusManual?`0 0 0 3px ${T.bl}15`:"none"}}>
                    <span style={{color:bonusManual?T.bl:T.i3,fontSize:16,fontWeight:300}}>₹</span>
                    <input value={bonusManual} placeholder={bonusPct>0?fN(Math.round(baseA*bonusPct/100)):"0"}
                      onChange={e=>{const r=e.target.value.replace(/,/g,"").replace(/\D/g,"");setBonusManual(r?fN(parseInt(r)):"");if(!r)setBonusPct(0);}}
                      style={{flex:1,background:"none",border:"none",outline:"none",fontSize:18,fontWeight:800,color:T.ink,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em"}}/>
                    {bonusManual&&<button onClick={()=>{setBonusManual("");setBonusPct(0);}} style={{background:"none",border:"none",color:T.i3,cursor:"pointer",fontSize:15,lineHeight:1}}>✕</button>}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bonus Timing ── appears only when bonus is set */}
            {bonusA>0&&<div style={{borderRadius:14,border:`1.5px solid ${T.bl}30`,overflow:"hidden",boxShadow:`0 2px 10px ${T.bl}0a`}}>
              <div style={{display:"flex",alignItems:"center",gap:8,padding:"11px 16px",
                background:`linear-gradient(105deg,${T.bBg},${T.cv})`}}>
                <span style={{fontSize:16}}>📅</span>
                <span style={{fontSize:13,fontWeight:800,color:T.ink,letterSpacing:"-0.02em",fontFamily:"'Sora',sans-serif"}}>When is bonus paid?</span>
                <span style={{marginLeft:"auto",fontSize:12,fontWeight:700,color:T.bl,fontFamily:"'Courier New',monospace"}}>{fi(bonusA)}</span>
              </div>
              <div style={{padding:"12px 14px",background:T.cv,display:"flex",flexDirection:"column",gap:10}}>
                <div className="timing-row" style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {[["march","Once — March"],["sep_mar","Sep + Mar"],["oct_apr","Oct + Apr"],["custom","Custom"]].map(([v,l])=>{
                    const act=bSched===v;
                    return <button key={v} onClick={()=>setBSched(v)} style={{
                      padding:"6px 16px",borderRadius:20,fontFamily:"inherit",cursor:"pointer",
                      fontSize:12,fontWeight:act?700:500,transition:"all .15s",
                      border:`1.5px solid ${act?T.bl:T.border}`,
                      background:act?T.bl:"transparent",
                      color:act?"#fff":T.i2,
                      boxShadow:act?`0 2px 10px ${T.bl}35`:"none"
                    }}>{l}</button>;})}
                </div>
                {isTwice&&bSched!=="custom"&&<div style={{background:T.bg,borderRadius:10,padding:"11px 14px",border:`1px solid ${T.border}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7,alignItems:"center"}}>
                    <span style={{fontSize:12,color:T.i2}}>Split — <strong style={{color:T.bl}}>{bSplit}%</strong> first &amp; <strong style={{color:T.bl}}>{100-bSplit}%</strong> second</span>
                    <span style={{fontSize:12,color:T.i3,fontFamily:"'Courier New',monospace"}}>{fi(bonusA*bSplit/100)} / {fi(bonusA*(100-bSplit)/100)}</span>
                  </div>
                  <input type="range" min={10} max={90} step={5} value={bSplit} onChange={e=>setBSplit(+e.target.value)} style={{width:"100%",accentColor:T.bl,cursor:"pointer"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.i3,marginTop:4}}>
                    <span>10 / 90</span><span style={{color:T.bl,fontWeight:700}}>{bSplit} / {100-bSplit}</span><span>90 / 10</span>
                  </div>
                </div>}
                {bSched==="custom"&&<div style={{background:T.bg,borderRadius:10,padding:"12px 14px",border:`1px solid ${T.border}`,display:"flex",flexDirection:"column",gap:12}}>
                  {/* one vs two months toggle */}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,fontWeight:600,color:T.i2}}>Payment schedule</span>
                    <div style={{display:"flex",background:T.cv,borderRadius:20,padding:2,border:`1px solid ${T.border}`,gap:2}}>
                      {[[false,"One month"],[true,"Two months"]].map(([v,l])=>
                        <button key={String(v)} onClick={()=>setCustomTwo(v)} style={{
                          padding:"4px 12px",borderRadius:18,border:"none",cursor:"pointer",
                          fontSize:11,fontWeight:customTwo===v?700:400,fontFamily:"inherit",
                          background:customTwo===v?T.bl:"transparent",
                          color:customTwo===v?"#fff":T.i2,transition:"all .12s"}}>{l}</button>)}
                    </div>
                  </div>
                  {/* month picker(s) */}
                  {(customTwo?[[`Bonus month`,cm1,setCm1,bSplit],[`Second month`,cm2,setCm2,100-bSplit]]:[[`Bonus month`,cm1,setCm1,100]]).map(([l,v,s,pct])=>
                    <div key={l}>
                      <div style={{fontSize:12,fontWeight:600,color:T.i2,marginBottom:7,display:"flex",alignItems:"center",flexWrap:"wrap",gap:4}}>
                        <span>{l}</span>
                        <span style={{fontWeight:800,color:T.bl,fontFamily:"'Courier New',monospace",background:T.bBg,padding:"1px 7px",borderRadius:6,fontSize:11}}>{customTwo?`${pct}%`:"100%"}</span>
                        <span style={{color:T.i3,fontWeight:400}}>= {fi(bonusA*(customTwo?pct/100:1))}</span>
                      </div>
                      <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                        {MONTHS.map((m,i)=><button key={i} onClick={()=>s(i)} style={{
                          padding:"5px 10px",borderRadius:16,fontFamily:"inherit",cursor:"pointer",fontSize:11,
                          fontWeight:v===i?700:400,transition:"all .12s",
                          border:`1.5px solid ${v===i?T.bl:T.border}`,
                          background:v===i?T.bl:"transparent",
                          color:v===i?"#fff":T.i2}}>{m}</button>)}
                      </div>
                    </div>)}
                  {/* split slider — only for two months */}
                  {customTwo&&<div>
                    <div style={{fontSize:12,fontWeight:600,color:T.i2,marginBottom:6}}>Split&nbsp;
                      <span style={{fontWeight:800,color:T.bl}}>{bSplit}%</span> / <span style={{fontWeight:800,color:T.bl}}>{100-bSplit}%</span>
                      <span style={{color:T.i3,fontWeight:400,marginLeft:6}}>{fi(bonusA*bSplit/100)} / {fi(bonusA*(100-bSplit)/100)}</span>
                    </div>
                    <input type="range" min={10} max={90} step={5} value={bSplit} onChange={e=>setBSplit(+e.target.value)} style={{width:"100%",accentColor:T.bl,cursor:"pointer"}}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.i4,marginTop:3}}><span>10/90</span><span>50/50</span><span>90/10</span></div>
                  </div>}
                </div>}
              </div>
            </div>}

            <div style={{background:T.bg,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden"}}>
                {/* Header row: label + auto value */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:T.ink,letterSpacing:"-0.01em"}}>Employer PF</div>
                    <div style={{fontSize:11,color:T.i3,marginTop:2}}>
                      {mode==="base_only"
                        ? <>12% of Basic{pfCap?", capped ₹1,800/mo":""} — <strong style={{color:T.em}}>embedded inside your Base</strong>, exempt u/s 10(12)</>
                        : <>12% of Basic{pfCap?", capped ₹1,800/mo":""} — <strong style={{color:T.em}}>added on top of Base</strong>, part of CTC</>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0,marginLeft:12}}>
                    <div style={{fontSize:16,fontWeight:800,color:T.em,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em"}}>{fi(erPfAuto)}</div>
                    <div style={{fontSize:10,color:T.i3,marginTop:1}}>per year · {fi(erPfAuto/12)}/mo</div>
                  </div>
                </div>
                {/* Override checkbox — only for breakdown mode where ER PF is explicit CTC component */}
                {mode==="breakdown"&&<div style={{borderTop:`1px solid ${T.border}`,padding:"9px 14px",display:"flex",alignItems:"center",gap:10,
                  background:erPfOverride?`${T.am}08`:T.cv,cursor:"pointer"}}
                  onClick={()=>{setErPfOverride(o=>!o);if(erPfOverride)setErPfStr("");}}>
                  <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${erPfOverride?T.am:T.b2}`,
                    background:erPfOverride?T.am:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                    flexShrink:0,transition:"all .15s"}}>
                    {erPfOverride&&<span style={{color:"#fff",fontSize:12,lineHeight:1,fontWeight:700}}>✓</span>}
                  </div>
                  <div>
                    <span style={{fontSize:12,fontWeight:600,color:erPfOverride?T.am:T.i2}}>My offer letter shows a different ER PF amount</span>
                    <span style={{fontSize:11,color:T.i3,marginLeft:6}}>override auto-calculation</span>
                  </div>
                </div>}
                {mode==="breakdown"&&erPfOverride&&<div style={{padding:"10px 14px",borderTop:`1px solid ${T.border}`,background:T.cv}}>
                  <MoneyIn label="ER PF as per offer letter" hint="Annual amount" val={erPfStr} set={setErPfStr} acc={T.am} ph={fN(Math.round(erPfAuto))}/>
                </div>}
              </div>

            {/* ── PERKS ── */}
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:14,marginTop:2}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:perks.length>0?10:0}}>
                <div>
                  <span style={{fontSize:12,fontWeight:600,color:T.i2}}>Additional Perks / One-time</span>
                  <span style={{fontSize:11,color:T.i3,marginLeft:6}}>Optional — taxable perks adjust annual tax</span>
                </div>
                <button onClick={addPerk} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:20,border:`1px solid ${T.bl}`,background:T.bBg,color:T.bl,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>
              </div>
              {perks.length>0&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
                {perks.map(pk=><div key={pk.id} style={{display:"flex",flexDirection:"column",gap:6,padding:"10px 12px",background:T.bg,borderRadius:10,border:`1px solid ${pk.taxable?T.ro+"40":T.em+"40"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <input value={pk.label} onChange={e=>updPerk(pk.id,"label",e.target.value)} placeholder="e.g. Joining bonus, Phone, Sodexo" style={{flex:1,padding:"6px 10px",border:`1px solid ${T.b2}`,borderRadius:7,fontSize:12,fontFamily:"inherit",outline:"none",background:T.cv,color:T.ink}}/>
                    <button onClick={()=>delPerk(pk.id)} style={{background:"none",border:"none",color:T.i3,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>✕</button>
                  </div>
                  <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{display:"flex",alignItems:"center",flex:1,minWidth:100,background:T.cv,border:`1px solid ${T.b2}`,borderRadius:7,padding:"6px 10px",gap:4}}>
                      <span style={{color:T.i3,fontSize:13}}>₹</span>
                      <input value={pk.amount} onChange={e=>{const r2=e.target.value.replace(/,/g,"").replace(/\D/g,"");updPerk(pk.id,"amount",r2?fN(parseInt(r2)):"");}} placeholder="0" style={{flex:1,background:"none",border:"none",outline:"none",fontSize:13,fontWeight:600,color:T.ink,fontFamily:"'Courier New',monospace"}}/>
                    </div>
                    <select value={pk.monthIdx} onChange={e=>updPerk(pk.id,"monthIdx",+e.target.value)} style={{padding:"6px 9px",border:`1px solid ${T.b2}`,borderRadius:7,fontSize:12,fontFamily:"inherit",background:T.cv,color:T.ink,cursor:"pointer",outline:"none"}}>
                      {MONTHS.map((m,mi)=><option key={mi} value={mi}>{m}</option>)}
                    </select>
                    <div onClick={()=>updPerk(pk.id,"taxable",!pk.taxable)} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:"5px 10px",borderRadius:16,background:pk.taxable?T.rBg:T.eBg,border:`1px solid ${pk.taxable?T.ro:T.em}30`,flexShrink:0}}>
                      <div style={{width:28,height:16,borderRadius:8,background:pk.taxable?T.ro:T.em,position:"relative"}}>
                        <div style={{width:10,height:10,borderRadius:5,background:"#fff",position:"absolute",top:3,left:pk.taxable?15:3,transition:"left .15s"}}/>
                      </div>
                      <span style={{fontSize:11,fontWeight:600,color:pk.taxable?T.ro:T.em}}>{pk.taxable?"Taxable":"Exempt"}</span>
                    </div>
                  </div>
                  {pk.taxable&&tN(pk.amount)>0&&r&&<div style={{fontSize:11,color:T.ro,paddingLeft:2}}>
                    ⚡ This ₹{fN(tN(pk.amount))} taxable perk is added to annual income — employer will spread extra TDS from {MONTHS[pk.monthIdx]} onwards
                  </div>}
                </div>)}
                {perks.some(p=>tN(p.amount)>0)&&<div style={{padding:"8px 12px",background:T.bg,borderRadius:8,border:`1px solid ${T.border}`,display:"flex",gap:14,flexWrap:"wrap",alignItems:"center"}}>
                  {[["Taxable perks",perks.filter(p=>p.taxable).reduce((s,p)=>s+tN(p.amount),0),T.ro],["Exempt perks",perks.filter(p=>!p.taxable).reduce((s,p)=>s+tN(p.amount),0),T.em],["Total",perks.reduce((s,p)=>s+tN(p.amount),0),T.bl]].filter(([,v])=>v>0).map(([l,v,col])=>
                    <div key={l}><div style={{fontSize:10,color:T.i3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:1}}>{l}</div><div style={{fontSize:13,fontWeight:700,color:col,fontFamily:"'Courier New',monospace"}}>{fi(v)}</div></div>)}
                </div>}
              </div>}
            </div>

            {/* CTC bar */}
            {baseA>0&&<div style={{background:T.bg,borderRadius:12,padding:"14px 16px",border:`1px solid ${T.border}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:T.i2}}>Total CTC</div>
                  <div style={{fontSize:11,color:T.i3,marginTop:1}}>{mode==="base_only"?"Base + Bonus":"Base + Bonus + ER PF"}</div>
                </div>
                <span style={{fontSize:20,fontWeight:800,color:T.ink,fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em",flexShrink:0}}>{fL(ctcBar)}</span>
              </div>
              {mode==="breakdown"
                ?<CtcBar segs={[{l:"Base",v:baseA,c:T.bl},{l:"Bonus",v:bonusA,c:"#60A5FA"},{l:"ER PF",v:erPfDisp,c:T.em}]}/>
                :(()=>{const bA2=baseA*basicPct/100;const allA=Math.max(0,baseA-bA2-erPfAuto);
                  return <CtcBar segs={[{l:"Basic",v:bA2,c:T.bl},{l:"Allowances",v:allA,c:"#93C5FD"},{l:"ER PF",v:erPfAuto,c:T.em},{l:"Bonus",v:bonusA,c:"#FCD34D"}]}/>;})()}
            </div>}
          </div>
        </div>
      </div>

      {/* ── SETTINGS ── */}
      <Card title="Salary Settings" icon="⚙️" acc="#334155">
        <div style={{display:"flex",flexDirection:"column",gap:14,marginTop:14}}>
          {/* Toggle rows */}
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {[[pfCap,setPfCap,T.em,T.gEm,"💰","PF Wage Cap",
               r?(pfCap?`Capped at ₹1,800/mo (12% × ₹15K)`:`Full 12% × Basic = ${fi(r.eeM)}/mo`):"12% of Basic",
               "EPFO statutory ceiling"],
              [pt,setPt,"#334155","linear-gradient(135deg,#334155,#475569)","🏛️","Professional Tax",
               "₹200/month • Most states: MH, KA, TN…",
               "Maharashtra, Karnataka, Tamil Nadu…"]
            ].map(([on,set,col,grad,ico,main,activeVal,hint])=>
              <div key={main} onClick={()=>set(!on)}
                style={{display:"flex",alignItems:"center",gap:14,padding:"13px 16px",
                  background:on?`${col}0c`:T.bg,borderRadius:14,
                  border:`1.5px solid ${on?col+"50":T.border}`,cursor:"pointer",
                  transition:"all .2s",userSelect:"none",
                  boxShadow:on?`0 3px 16px ${col}1a,${T.sh}`:T.sh}}>
                <div style={{width:40,height:40,borderRadius:12,flexShrink:0,
                  background:on?`linear-gradient(135deg,${col}28,${col}10)`:T.bg,
                  border:`1.5px solid ${on?col+"45":T.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:19,transition:"all .2s",
                  boxShadow:on?`0 2px 8px ${col}25`:"none"}}>{ico}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:on?T.ink:T.i2,letterSpacing:"-0.02em"}}>{main}</div>
                  <div style={{fontSize:12,marginTop:2,
                    color:on?col:T.i3,fontWeight:on?600:400,
                    transition:"color .2s"}}>{on?activeVal:hint}</div>
                </div>
                <Tog on={on} set={()=>{}} col={col}/>
              </div>)}
          </div>
        </div>
      </Card>

      {/* ── NPS ── */}
      <Card title="Employer NPS — u/s 80CCD(2)" icon="🏦" acc={T.vi}>
        <div style={{marginTop:14}}>
          <div onClick={()=>setNpsOn(!npsOn)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",
              background:npsOn?`${T.vi}0e`:T.bg,borderRadius:14,
              border:`1.5px solid ${npsOn?T.vi+"50":T.border}`,cursor:"pointer",
              marginBottom:npsOn?16:0,transition:"all .2s",userSelect:"none",
              boxShadow:npsOn?`0 4px 18px ${T.vi}20,${T.sh}`:T.sh}}>
            <div style={{width:40,height:40,borderRadius:12,flexShrink:0,
              background:npsOn?`linear-gradient(135deg,${T.vi}28,${T.vi}0e)`:`${T.border}55`,
              border:`1.5px solid ${npsOn?T.vi+"40":T.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,
              boxShadow:npsOn?`0 2px 8px ${T.vi}30`:"none",transition:"all .2s"}}>🏦</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:npsOn?T.ink:T.i2,letterSpacing:"-0.02em"}}>Employer NPS u/s 80CCD(2)</div>
              <div style={{fontSize:12,marginTop:2,color:npsOn?T.vi:T.i3,fontWeight:npsOn?600:400}}>
                {npsOn?"✦ Active — reducing your taxable income":"Only NPS benefit allowed in new regime"}
              </div>
            </div>
            <Tog on={npsOn} set={()=>{}} col={T.vi}/>
          </div>
          {npsOn&&r&&(()=>{
            const erPfOnly=r.erF;
            const capRemaining=Math.max(0,r.RETIRE_CAP-erPfOnly);
            const npsFullyWasted=erPfOnly>=r.RETIRE_CAP;
            const npsPartlyWasted=!npsFullyWasted&&r.retirementExcess>0;
            return <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{background:`linear-gradient(135deg,${T.vBg},#EDE9FE)`,border:`1.5px solid ${T.vi}22`,borderRadius:14,padding:"14px 16px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:600,color:T.i2}}>NPS % of Basic</span>
                  <span style={{fontSize:15,fontWeight:800,color:T.vi,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em"}}>{npsPct}% <span style={{fontSize:12,fontWeight:500,color:T.i3}}>= {fi(r.npsM)}/mo</span></span>
                </div>
                <input type="range" min={1} max={14} value={npsPct} onChange={e=>setNpsPct(+e.target.value)} style={{width:"100%",accentColor:npsFullyWasted?T.ro:npsPartlyWasted?T.aR:T.vi,cursor:"pointer"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:T.i3,marginTop:4}}><span>1%</span><span style={{color:T.vi,fontWeight:600}}>Max 14% of Basic</span></div>
              </div>

              {/* ── Sec 17(2)(vii) cap status — only when cap is reachable at max NPS ── */}
              {(r.erF+r.bA*0.14>r.RETIRE_CAP||r.retirementExcess>0)&&(()=>{
                const pct=Math.min(100,(r.retirementAggregate/r.RETIRE_CAP)*100);
                const barCol=npsFullyWasted?T.ro:npsPartlyWasted?T.aR:T.em;
                return <div style={{borderRadius:14,overflow:"hidden",border:`1.5px solid ${barCol}30`,boxShadow:`0 2px 12px ${barCol}15`}}>
                  <div style={{padding:"12px 14px 10px",background:`linear-gradient(105deg,${barCol}0d,transparent)`,borderBottom:`1px solid ${barCol}20`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:barCol,letterSpacing:"-0.01em"}}>Sec 17(2)(vii) — ₹7.5L Retirement Cap</div>
                        <div style={{fontSize:11,color:T.i3,marginTop:1}}>ER PF + ER NPS aggregate limit · excess is taxable perquisite</div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                        <div style={{fontSize:15,fontWeight:800,color:barCol,fontFamily:"'Courier New',monospace"}}>{fL(r.retirementAggregate)}</div>
                        <div style={{fontSize:10,color:T.i3}}>of ₹7.5L cap</div>
                      </div>
                    </div>
                    {/* progress bar */}
                    <div style={{height:8,background:`${barCol}18`,borderRadius:6,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${Math.min(pct,100)}%`,background:barCol,borderRadius:6,transition:"width .4s ease",
                        boxShadow:`0 0 8px ${barCol}60`}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.i3,marginTop:4}}>
                      <span>ER PF: {fL(r.erF)}</span>
                      <span style={{color:barCol,fontWeight:600}}>{pct.toFixed(0)}% of cap used</span>
                      <span>₹7.5L cap</span>
                    </div>
                  </div>
                  <div style={{padding:"10px 14px",background:npsFullyWasted?"#FFF1F1":npsPartlyWasted?"#FFFBEB":"#F0FDF4"}}>
                    {npsFullyWasted&&<div style={{fontSize:12,color:T.ro,lineHeight:1.6}}>
                      <strong>ER PF alone (₹{fL(r.erF)}) already exceeds ₹7.5L</strong> — your employer's NPS contribution gives <strong>zero tax benefit</strong>. The entire NPS amount (₹{fL(r.npsA)}) is added back as taxable perquisite. Consider negotiating a lower NPS % or redirecting to take-home.
                    </div>}
                    {npsPartlyWasted&&<div style={{fontSize:12,color:T.am,lineHeight:1.6}}>
                      Only <strong style={{color:T.em}}>{fL(capRemaining)}</strong> of NPS is sheltered within the ₹7.5L cap.
                      The remaining <strong style={{color:T.ro}}>{fL(r.retirementExcess)}</strong> is taxed as perquisite u/s 17(2)(vii).
                      Reducing NPS to <strong>{Math.floor(capRemaining/r.bA*100)}% of Basic</strong> would maximise benefit with no wasted contribution.
                    </div>}
                    {!npsFullyWasted&&!npsPartlyWasted&&<div style={{fontSize:12,color:T.em,lineHeight:1.6}}>
                      Within ₹7.5L cap — full NPS deduction applies u/s 80CCD(2). You have <strong>{fL(capRemaining)}</strong> remaining headroom.
                    </div>}
                  </div>
                </div>;
              })()}

              <div className="nps-cards" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                <div style={{background:"linear-gradient(135deg,#FFF1F1,#FFE4E4)",border:`1.5px solid ${T.ro}25`,borderRadius:12,padding:"12px 16px"}}>
                  <div style={{fontSize:10,color:T.ro,fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Deducted / year</div>
                  <div className="nps-card-val" style={{fontSize:20,fontWeight:800,color:T.ro,fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em"}}>−{fL(r.npsA)}</div>
                  {r.retirementExcess>0&&<div style={{fontSize:10,color:T.i3,marginTop:3}}>{fL(r.npsEffectiveShelter)} effective · {fL(r.retirementExcess)} taxed back</div>}
                </div>
                <div style={{background:r.taxSaved>0?"linear-gradient(135deg,#ECFDF5,#D1FAE5)":"linear-gradient(135deg,#F1F5F9,#E2E8F0)",border:`1.5px solid ${r.taxSaved>0?T.em:"#CBD5E1"}25`,borderRadius:12,padding:"12px 16px"}}>
                  <div style={{fontSize:10,color:r.taxSaved>0?T.em:"#94A3B8",fontWeight:700,letterSpacing:"0.07em",textTransform:"uppercase",marginBottom:5}}>Tax saved / year</div>
                  <div className="nps-card-val" style={{fontSize:20,fontWeight:800,color:r.taxSaved>0?T.em:"#94A3B8",fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em"}}>{r.taxSaved>0?`+${fL(r.taxSaved)}`:"₹0"}</div>
                  {r.taxSaved===0&&<div style={{fontSize:10,color:T.ro,marginTop:3}}>Cap breached — no benefit</div>}
                </div>
              </div>
              <div style={{fontSize:11,color:T.am,padding:"9px 14px",background:"linear-gradient(to right,#FFFBEB,#FEF3C7)",borderRadius:10,borderLeft:`4px solid ${T.aR}`,boxShadow:`0 2px 8px ${T.aR}15`}}>⚠️ NPS corpus locked till age 60 · 40% must be annuitised at retirement</div>
            </div>;
          })()}
        </div>
      </Card>

      {/* ── ADDITIONAL DEDUCTIONS ── */}
      <Card title="Additional Salary Deductions" icon="🏥" acc={T.ro} key="dedns">
        <div style={{marginTop:10}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10,marginBottom:dedns.length>0?14:0}}>
            <div>
              <div style={{fontSize:12,color:T.i3,lineHeight:1.6}}>
                Medical insurance, loan EMI, car lease etc. — <strong style={{color:T.ro}}>no tax benefit in new regime</strong>, but deducted from salary. Reduces your in-hand.
              </div>
            </div>
            <button onClick={addDedn} style={{flexShrink:0,display:"flex",alignItems:"center",gap:4,padding:"5px 12px",borderRadius:20,border:`1px solid ${T.ro}`,background:T.rBg,color:T.ro,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add</button>
          </div>
          {dedns.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
            {dedns.map(d=><div key={d.id} style={{background:T.bg,borderRadius:12,border:`1px solid ${T.border}`,padding:"12px 14px"}}>
              {/* Row 1: type + amount + freq + delete */}
              <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
                <select value={d.type} onChange={e=>updDedn(d.id,"type",e.target.value)}
                  style={{flex:2,minWidth:140,padding:"6px 9px",border:`1px solid ${T.b2}`,borderRadius:7,fontSize:12,fontFamily:"inherit",background:T.cv,color:T.ink,cursor:"pointer",outline:"none"}}>
                  {DEDN_OPTS.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
                <div style={{display:"flex",alignItems:"center",flex:1,minWidth:100,background:T.cv,border:`1px solid ${T.b2}`,borderRadius:7,padding:"6px 10px",gap:4}}>
                  <span style={{color:T.i3,fontSize:13}}>₹</span>
                  <input value={d.amount} onChange={e=>{const r2=e.target.value.replace(/,/g,"").replace(/\D/g,"");updDedn(d.id,"amount",r2?fN(parseInt(r2)):"");}} placeholder="0"
                    style={{flex:1,background:"none",border:"none",outline:"none",fontSize:13,fontWeight:600,color:T.ink,fontFamily:"'Courier New',monospace"}}/>
                </div>
                <div style={{display:"flex",background:T.bg,borderRadius:8,border:`1px solid ${T.border}`,padding:2,gap:2}}>
                  {[["monthly","/mo"],["annual","/yr"]].map(([v,l])=>
                    <button key={v} onClick={()=>updDedn(d.id,"freq",v)} style={{padding:"4px 10px",border:"none",borderRadius:6,background:d.freq===v?T.cv:"transparent",color:d.freq===v?T.ink:T.i3,fontSize:11,fontWeight:d.freq===v?600:400,cursor:"pointer",fontFamily:"inherit",boxShadow:d.freq===v?T.sh:"none"}}>{l}</button>)}
                </div>
                <button onClick={()=>delDedn(d.id)} style={{background:"none",border:"none",color:T.i3,cursor:"pointer",fontSize:15,padding:"0 2px",flexShrink:0}}>✕</button>
              </div>
              {/* Row 2: month selector */}
              <div>
                <div style={{fontSize:11,color:T.i3,marginBottom:5}}>
                  {d.freq==="monthly"?"Applied months (tap to toggle):":"Applied months (for proration):"}
                  &nbsp;<button onClick={()=>setDedns(ds=>ds.map(x=>x.id===d.id?{...x,months:Array(12).fill(true)}:x))} style={{fontSize:11,color:T.bl,background:"none",border:"none",cursor:"pointer",padding:"0 4px",fontFamily:"inherit"}}>All</button>
                  <button onClick={()=>setDedns(ds=>ds.map(x=>x.id===d.id?{...x,months:Array(12).fill(false)}:x))} style={{fontSize:11,color:T.i3,background:"none",border:"none",cursor:"pointer",padding:"0 4px",fontFamily:"inherit"}}>None</button>
                </div>
                <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                  {MONTHS.map((m,mi)=><button key={mi} onClick={()=>togDednMonth(d.id,mi)}
                    style={{padding:"4px 8px",borderRadius:16,border:`1px solid ${d.months[mi]?T.ro:T.border}`,background:d.months[mi]?T.rBg:T.cv,color:d.months[mi]?T.ro:T.i3,fontSize:11,fontWeight:d.months[mi]?600:400,cursor:"pointer",fontFamily:"inherit",transition:"all .12s"}}>{m}</button>)}
                </div>
              </div>
              {/* impact line */}
              {tN(d.amount)>0&&<div style={{marginTop:8,fontSize:11,color:T.ro}}>
                −{fi(d.freq==="monthly"?tN(d.amount)*d.months.filter(Boolean).length/12*12:tN(d.amount)*d.months.filter(Boolean).length/12)}/mo avg &nbsp;·&nbsp; −{fi(d.freq==="monthly"?tN(d.amount)*d.months.filter(Boolean).length:tN(d.amount)*d.months.filter(Boolean).length/12)}/yr &nbsp;·&nbsp; <span style={{color:T.i4}}>no tax benefit in new regime</span>
              </div>}
            </div>)}
            {/* total deductions summary */}
            {dedns.some(d=>tN(d.amount)>0)&&r&&<div style={{padding:"10px 12px",background:T.rBg,borderRadius:10,border:`1px solid ${T.ro}20`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:11,color:T.i3,marginBottom:2}}>Total extra deductions</div>
                <div style={{fontSize:16,fontWeight:700,color:T.ro,fontFamily:"'Courier New',monospace"}}>−{fi(r.dednMonthly)}/mo &nbsp;·&nbsp; −{fi(r.dednAnnual)}/yr</div>
              </div>
              <div style={{fontSize:12,color:T.i3}}>Reduces in-hand · 0% tax saving in new regime</div>
            </div>}
          </div>}
        </div>
      </Card>

      {!r&&<div style={{textAlign:"center",padding:"32px 0",color:T.i3,fontSize:14}}>Enter your Base salary above ↑</div>}

      {r&&<>
      {/* ── MONTHLY STRUCTURE ── */}
      <Card title="Monthly Salary Structure" icon="📋" acc={T.bl}>
        {mode==="base_only"?<>
          <div style={{marginTop:8,marginBottom:2}}><div style={{fontSize:11,fontWeight:600,color:T.i3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Base = Basic + Taxable Allowances + ER PF</div></div>
          <Row label="Basic Salary" sub={`${basicPct}% of Base`} val={fi(r.bM)} indent/>
          <Row label="Taxable Allowances" sub="HRA + FBP + Other — all taxable in new regime" val={fi(r.allowM)} col={T.bl} indent/>
          <Row label="Employer PF (ER)" sub={`12% of Basic${pfCap?" (₹15K cap)":""} — exempt u/s 10(12)`} val={fi(r.erM)} col={T.em} indent/>
          <Row label="Base /mo" sub="= Basic + Allowances + ER PF" val={fi(baseA/12)} bold topB/>
          <div style={{marginTop:12,marginBottom:2}}><div style={{fontSize:11,fontWeight:600,color:T.i3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Monthly Payslip (excluding ER PF)</div></div>
          <Row label="Basic Salary" val={fi(r.bM)} indent/>
          <Row label="Taxable Allowances" sub="All taxable — no HRA exemption in new regime" val={fi(r.allowM)} indent/>
          <Row label="Monthly Gross" sub="Base − ER PF ÷ 12" val={fi((baseA-r.erF)/12)} bold topB noB/>
        </>:<>
          <div style={{marginTop:8,marginBottom:2}}><div style={{fontSize:11,fontWeight:600,color:T.i3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Payslip Components /mo</div></div>
          <Row label="Basic Salary" sub={`${basicPct}% of Base`} val={fi(r.bM)} indent/>
          <Row label="Taxable Allowances" sub="HRA + FBP + Other — all taxable in new regime" val={fi(r.allowM)} col={T.bl} indent/>
          <Row label="Monthly Gross" sub="Base ÷ 12 (bonus excluded)" val={fi(baseA/12)} bold topB/>
          <div style={{marginTop:12,marginBottom:2}}><div style={{fontSize:11,fontWeight:600,color:T.i3,letterSpacing:"0.05em",textTransform:"uppercase"}}>Employer Cost (on top of Base)</div></div>
          <Row label="Employer PF (ER)" sub={erPfMan>0?"As per offer letter":`12% of ${pfCap?"₹15K":"Basic"}`} val={fi(r.erM)} col={T.em} indent noB/>
        </>}
      </Card>

      {/* ── DEDUCTIONS ── */}
      <Card title="Monthly Deductions" icon="📤" acc={T.ro}>
        <div style={{margin:"8px 0 6px",padding:"8px 12px",background:T.eBg,borderRadius:8,borderLeft:`3px solid ${T.em}`,fontSize:12,color:T.i3,lineHeight:1.5}}>
          <strong style={{color:T.em}}>Employer PF {fi(r.erM)}/mo</strong> — {mode==="base_only"?"embedded in Base, deducted from your gross":"employer's cost on top of Base"}. Exempt u/s 10(12) — goes to your EPF corpus.
        </div>
        {mode==="base_only"&&<Row label="Employer PF (ER)" sub="Embedded in Base" val={`−${fi(r.erM)}`} col={T.em} indent/>}
        <Row label="Employee PF (EE)" sub={pfCap?"12% × min(Basic,₹15K)":"12% × Basic"} val={`−${fi(r.eeM)}`} col={T.ro} indent/>
        {r.ptA>0&&<Row label="Professional Tax" sub="₹200/month" val={`−${fi(r.ptM)}`} col={T.ro} indent/>}
        {npsOn&&<Row label="Employer NPS 80CCD(2)" sub={`${npsPct}% of Basic`} val={`−${fi(r.npsM)}`} col={T.vi} indent/>}
        <Row label="Income Tax (TDS)"
          sub={bonusA>0
            ? `Regular months (Apr–Feb): base salary TDS only · Bonus month: catch-up spike`
            : `Annual tax ÷ 12`}
          val={`−${fi(r.annTaxMnb/12)}`} col={T.ro} indent/>
        {r.dednMonthly>0&&<Row label="Salary Deductions" sub="Medical, EMI, etc. — no tax benefit" val={`−${fi(r.dednMonthly)}`} col={T.ro} indent/>}
        {bonusA>0&&<div style={{fontSize:11,color:T.i3,padding:"6px 10px",background:T.aBg,borderRadius:7,marginTop:4,borderLeft:`3px solid ${T.aR}`}}>
          💡 Bonus month TDS = full-year tax − TDS already collected · rest of months stay at base TDS
        </div>}
        <Row label="Regular Month Deductions"
          sub={mode==="base_only"?"ER PF + EE PF + base TDS + Other · Bonus months differ":"EE PF + base TDS + Other · Bonus months differ"}
          val={`−${fi((mode==="base_only"?r.erF/12:0)+r.eeM+r.ptM+r.npsM+r.annTaxMnb/12+r.dednMonthly)}`}
          bold col={T.ro} topB noB/>
      </Card>

      {/* ── MONTHLY IN-HAND ── */}
      <div style={{background:"linear-gradient(135deg,#064E3B 0%,#065F46 60%,#047857 100%)",border:"none",borderRadius:20,padding:"22px 24px",boxShadow:T.sh3}}>
        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,0.6)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>💰 Monthly In-Hand</div>
        <div className="inhand-big" style={{fontSize:48,fontWeight:800,color:"#fff",fontFamily:"'Courier New',monospace",letterSpacing:"-0.03em",lineHeight:1}}>{fi(r.inHandMnb)}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",marginTop:6,marginBottom:18}}>
          per month · bonus excluded &nbsp;·&nbsp;
          <strong style={{color:"rgba(255,255,255,0.9)"}}>{fL(r.inHandAPro)}</strong>
          {joinMonth>0
            ? <span style={{color:"rgba(255,255,255,0.45)",fontSize:11}}> this FY ({r.workedMonths} months · joined {MONTHS[joinMonth]})</span>
            : <span style={{color:"rgba(255,255,255,0.45)",fontSize:11}}> annual (full year)</span>}
        </div>
        <div className="inhand-pills" style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
          {[[`${r.ihPct}%`,"In-hand / CTC","rgba(255,255,255,0.13)","rgba(255,255,255,0.95)","rgba(255,255,255,0.15)"],
            [`${r.effTax}%`,"Eff. Tax Rate","rgba(252,165,165,0.18)","#FCA5A5","rgba(252,165,165,0.2)"],
            [`${r.marginalRate}%`,"Marginal Rate","rgba(251,191,36,0.18)","#FBBF24","rgba(251,191,36,0.2)"],
            [fi(r.eeM),"Emp PF /mo","rgba(147,197,253,0.18)","#93C5FD","rgba(147,197,253,0.2)"]].map(([v,l,bg,vc,br])=>
            <div key={l} style={{background:bg,borderRadius:12,padding:"12px 8px",textAlign:"center",border:`1px solid ${br}`}}>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.07em"}}>{l}</div>
              <div style={{fontSize:16,fontWeight:800,color:vc,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em"}}>{v}</div>
            </div>)}
        </div>
      </div>

      {/* ── TAX WORKINGS ── */}
      <Card title="Income Tax Workings" icon="🧾" acc={T.am}>
        <Row label="Annual Gross (Base + Bonus)" sub="All allowances fully taxable in new regime" val={fi(baseA+bonusA)}/>
        {mode==="base_only"&&<Row label="ER PF (exempt u/s 10(12))" val={`−${fi(r.erF)}`} col={T.i3} indent/>}
        <Row label="− Standard Deduction" sub="₹75,000 flat" val={`−${fi(r.stdD)}`} col={T.em} indent/>
        {npsOn&&<Row label="− Employer NPS 80CCD(2)" sub={`${npsPct}% of Basic · u/s 80CCD(2)`} val={`−${fi(r.npsA)}`} col={T.vi} indent/>}
        {r.retirementExcess>0&&<Row
          label="+ Sec 17(2)(vii) Perquisite"
          sub={`ER PF ${fL(r.erF)}${r.npsA>0?` + NPS ${fL(r.npsA)}`:""}  = ${fL(r.retirementAggregate)} exceeds ₹7.5L cap — excess added back as taxable`}
          val={`+${fi(r.retirementExcess)}`} col={T.ro} indent/>}
        <Row label="Taxable Income" val={fi(r.taxable)} bold/>
        <div style={{margin:"14px 0 10px",background:T.bg,borderRadius:14,border:`1px solid ${T.border}`,overflow:"hidden",boxShadow:T.sh}}>
          <div style={{padding:"10px 16px 7px",fontSize:11,fontWeight:700,color:T.am,textTransform:"uppercase",letterSpacing:"0.08em",borderBottom:`1px solid ${T.border}`,background:`linear-gradient(to right,${T.aBg},transparent)`}}>📊 FY 2026–27 New Regime Slabs</div>
          <div style={{padding:"6px 4px 8px"}}>
            {SLABS.map(([lo,,range,rate],i)=><SlabRow key={range} range={range} rate={rate} active={r.taxable>lo} current={i===r.slabIdx&&r.taxable>0}/>)}
            <div style={{fontSize:11,color:T.i3,marginTop:6,paddingTop:6,borderTop:`1px solid ${T.border}`,paddingLeft:10}}>
              Surcharge: 10% (&gt;₹50L) · 15% (&gt;₹1Cr) · 25% (&gt;₹2Cr, capped) · Rebate u/s 87A if ≤₹12L
            </div>
          </div>
        </div>
        <Row label="Slab Tax" val={fi(r.baseTx)} col={T.ro} indent/>
        {r.sr>0&&<Row label={`Surcharge (${r.sr*100}%)`} sub={r.taxable>10000000?"Taxable > ₹1Cr":"Taxable > ₹50L"} val={fi(r.surcharge)} col={T.ro} indent/>}
        <Row label="4% Health & Education Cess" val={fi(r.cess)} col={T.ro} indent/>
        <Row label="Total Income Tax" val={fi(r.taxA)} bold col={T.ro} topB/>
        {npsOn&&r.taxSaved>0&&<Row label="Tax saved via NPS" val={`+${fi(r.taxSaved)}`} col={T.em}/>}
        <Row label="Effective tax rate on gross" sub="Average across all slabs (not marginal)" val={`${r.effTax}%`} col={T.am}/>
        <Row label="Marginal rate (top slab + surcharge + cess)" sub="Rate on each additional ₹ earned at your income level" val={`${r.marginalRate}%`} col={T.aR} noB/>
      </Card>

      {/* ── RETIREMENT ── */}
      {(()=>{
        const tot=r.erF+r.eeA+r.npsA;
        const capPct=Math.min(100,(r.retirementAggregate/r.RETIRE_CAP)*100);
        const capExceeded=r.retirementExcess>0;
        const capBarCol=capExceeded?T.ro:capPct>=80?T.aR:T.em;
        // Only show cap meter when this person's salary makes the cap relevant:
        // either ER PF alone exceeds cap, OR even at max NPS 14%, aggregate could breach it
        const showCapMeter=r.erF>r.RETIRE_CAP||(r.erF+r.bA*0.14>r.RETIRE_CAP);
        return <div style={{background:T.cv,borderRadius:16,border:`1px solid ${T.border}`,boxShadow:T.sh2,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 22px",borderBottom:`1px solid ${T.border}`,background:"linear-gradient(105deg,#ECFDF5,#F0FDF9)"}}>
            <div style={{width:28,height:28,borderRadius:7,background:T.em+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🏛️</div>
            <span style={{fontSize:13,fontWeight:700,color:T.ink}}>Annual Retirement Savings</span>
            {capExceeded&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",color:"#fff",background:T.ro,padding:"3px 9px",borderRadius:20}}>7.5L Cap Hit</span>}
            <span style={{marginLeft:"auto",fontSize:14,fontWeight:800,color:T.em,fontFamily:"'Courier New',monospace"}}>{fL(tot)}</span>
          </div>
          <div style={{padding:"14px 20px 16px"}}>
            <SBar segs={[{l:"ER PF",v:r.erF,c:"#10B981"},{l:"EE PF",v:r.eeA,c:T.bl},{l:"NPS",v:r.npsA,c:T.vi}]} h={16}/>

            {/* ── 7.5L cap meter — only shown when cap is reachable ── */}
            {showCapMeter&&<div style={{marginTop:14,padding:"12px 14px",borderRadius:12,border:`1.5px solid ${capBarCol}30`,background:`${capBarCol}07`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:capBarCol}}>Sec 17(2)(vii) Employer Cap</span>
                  <span style={{fontSize:11,color:T.i3,marginLeft:6}}>ER PF + ER NPS</span>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:13,fontWeight:800,color:capBarCol,fontFamily:"'Courier New',monospace"}}>{fL(r.retirementAggregate)}</span>
                  <span style={{fontSize:11,color:T.i3}}> / ₹7.5L</span>
                </div>
              </div>
              <div style={{height:10,background:`${capBarCol}18`,borderRadius:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.min(capPct,100)}%`,background:capExceeded?`linear-gradient(90deg,${T.aR},${T.ro})`:capPct>=80?T.aR:T.em,borderRadius:6,transition:"width .4s",position:"relative"}}>
                  {capPct>=100&&<div style={{position:"absolute",right:0,top:0,bottom:0,width:4,background:"rgba(255,255,255,0.5)",borderRadius:"0 6px 6px 0"}}/>}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:T.i3,marginTop:5}}>
                <span>ER PF: <strong style={{color:"#10B981"}}>{fL(r.erF)}</strong>{r.npsA>0&&<> · NPS: <strong style={{color:T.vi}}>{fL(r.npsA)}</strong></>}</span>
                <span style={{color:capBarCol,fontWeight:700}}>{capPct.toFixed(0)}% used</span>
              </div>
              {capExceeded&&<div style={{marginTop:8,padding:"8px 11px",borderRadius:8,background:T.rBg,border:`1px solid ${T.ro}25`,fontSize:11,color:T.ro,lineHeight:1.6}}>
                <strong>₹{fL(r.retirementExcess)} added as taxable perquisite</strong> in your income · increases tax by approx. {fL(calcTax(r.taxable)-calcTax(Math.max(0,r.taxable-r.retirementExcess)))}
              </div>}
              {!capExceeded&&<div style={{marginTop:6,fontSize:11,color:T.em}}>
                ✓ Within cap — all employer contributions fully sheltered
              </div>}
            </div>}

            <div style={{marginTop:12}}>
              {[["Employer PF (ER)",r.erF,r.erM,"#10B981",mode==="base_only"?"In Base, goes to EPF":"On top of Base, goes to EPF"],
                ["Employee PF (EE)",r.eeA,r.eeM,T.bl,"Deducted from salary, goes to EPF"],
                ...(r.npsA>0?[["Employer NPS",r.npsA,r.npsM,T.vi,`${npsPct}% of Basic · u/s 80CCD(2)${r.retirementExcess>0?" · partially taxed back":""}`]]:[])]
                .map(([l,ann,mon,c,sub],i,arr)=>
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                    <div style={{width:9,height:9,borderRadius:3,background:c,flexShrink:0,marginTop:3}}/>
                    <div><div style={{fontSize:13,fontWeight:500,color:T.ink}}>{l}</div><div style={{fontSize:11,color:T.i3,marginTop:1}}>{sub}</div></div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:c,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{fL(ann)}<span style={{fontSize:11,color:T.i3}}>/yr</span></div>
                    <div style={{fontSize:11,color:T.i3,whiteSpace:"nowrap"}}>{fi(mon)}/mo</div>
                  </div>
                </div>)}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:4,borderTop:`1.5px solid ${T.border}`}}>
                <div><div style={{fontSize:13,fontWeight:700,color:T.ink}}>Total Retirement Savings</div><div style={{fontSize:11,color:T.i3,marginTop:1}}>EPF corpus (ER+EE){r.npsA>0?" + NPS":""} — locked till 58/60</div></div>
                <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:16,fontWeight:800,color:T.em,fontFamily:"'Courier New',monospace",whiteSpace:"nowrap"}}>{fL(tot)}/yr</div><div style={{fontSize:12,color:T.i3,whiteSpace:"nowrap"}}>{fi(tot/12)}/mo</div></div>
              </div>
            </div>
          </div>
        </div>;
      })()}

      {/* ── ANNUAL PICTURE ── */}
      {(()=>{
        const txB=calcTax(Math.max(0,(r.payB-r.stdD-r.npsA)));
        const txBnus=bonusA>0?Math.max(0,r.taxA-txB):0;
        const bNet=bonusA>0?Math.max(0,bonusA-txBnus):0;
        const segs=[
          {l:"In-hand (Base)",v:r.inHandA-bNet,c:T.em},
          {l:"Bonus (after tax)",v:bNet,c:"#34D399"},
          ...(mode==="base_only"?[{l:"ER PF",v:r.erF,c:"#10B981"}]:[]),
          {l:"EE PF",v:r.eeA,c:T.bl},{l:"Income Tax",v:r.taxA,c:T.ro},
          ...(r.npsA>0?[{l:"NPS",v:r.npsA,c:T.vi}]:[]),
          ...(r.ptA>0?[{l:"Prof Tax",v:r.ptA,c:"#94A3B8"}]:[]),
        ].filter(s=>s.v>0);
        const annGross=baseA+bonusA;
        return <div style={{background:T.cv,borderRadius:16,border:`1px solid ${T.border}`,boxShadow:T.sh2,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 20px",borderBottom:`1px solid ${T.border}`,background:T.bg}}>
            <div style={{width:28,height:28,borderRadius:7,background:T.em+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📅</div>
            <span style={{fontSize:13,fontWeight:700,color:T.ink}}>Annual Picture</span>
            {bonusA>0&&<Bdg l="Bonus included" c={T.em} bg={T.eBg}/>}
          </div>
          <div style={{padding:"16px 20px 18px"}}>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.em,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:4}}>Annual In-Hand (after tax)</div>
              <div style={{fontSize:36,fontWeight:800,color:T.eDk,fontFamily:"'Courier New',monospace",letterSpacing:"-0.02em",lineHeight:1}}>{fL(r.inHandA)}</div>
              {bonusA>0&&<div style={{fontSize:13,color:T.i3,marginTop:4}}>Base: {fL(r.inHandA-bNet)} + Bonus net: <span style={{color:T.em,fontWeight:600}}>{fL(bNet)}</span></div>}
            </div>
            <SBar segs={segs} h={28}/>
            <div style={{marginTop:14}}>
              {segs.map((s,i)=><div key={s.l} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<segs.length-1?`1px solid ${T.border}`:"none"}}>
                <div style={{width:9,height:9,borderRadius:3,background:s.c,flexShrink:0}}/>
                <span style={{flex:1,fontSize:13,color:T.i2}}>{s.l}</span>
                <span style={{fontSize:13,fontWeight:600,color:T.ink,fontFamily:"'Courier New',monospace"}}>{fL(s.v)}</span>
                <span style={{fontSize:11,color:T.i3,width:36,textAlign:"right"}}>{((s.v/annGross)*100).toFixed(0)}%</span>
              </div>)}
              <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 0",marginTop:4,borderTop:`1.5px solid ${T.border}`}}>
                <span style={{fontSize:13,fontWeight:600,color:T.ink}}>Annual Gross (Base + Bonus)</span>
                <span style={{fontSize:14,fontWeight:800,color:T.ink,fontFamily:"'Courier New',monospace"}}>{fL(annGross)}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:14,alignItems:"center",marginTop:16,padding:"14px",background:T.bg,borderRadius:12,flexWrap:"wrap"}}>
              <Donut segs={segs} size={130}/>
              <div style={{flex:1,minWidth:140,display:"flex",flexDirection:"column",gap:7}}>
                {[["Annual Gross",fL(annGross),T.ink],["ER PF",fL(r.erF),"#10B981"],["EE PF",fL(r.eeA),T.bl],["Income Tax",fL(r.taxA),T.ro],["In-Hand",fL(r.inHandA),T.em]].map(([l,v,c])=>
                  <div key={l} style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontSize:12,color:T.i3}}>{l}</span>
                    <span style={{fontSize:13,fontWeight:700,color:c,fontFamily:"'Courier New',monospace"}}>{v}</span>
                  </div>)}
              </div>
            </div>
          </div>
        </div>;
      })()}


      {/* ── MONTHLY CHART ── */}
      {chartData&&<div style={{background:T.cv,borderRadius:16,border:`1px solid ${T.border}`,boxShadow:T.sh2,overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"13px 20px",borderBottom:`1px solid ${T.border}`,background:T.bg}}>
          <div style={{width:28,height:28,borderRadius:7,background:T.bl+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📈</div>
          <span style={{fontSize:13,fontWeight:700,color:T.ink}}>Monthly Take-home — FY Apr → Mar</span>
          <span style={{marginLeft:"auto",fontSize:11,color:T.i3}}>{fi(r.inHandMnb)}/mo baseline</span>
        </div>
        <div style={{padding:"16px 20px 18px"}}>

          <BarChart data={chartData}/>
          {(()=>{
            const hasBonus=chartData.some(d=>d.bonus>0);
            const hasPerk=chartData.some(d=>d.hasPerk);
            const showTotal=hasBonus||hasPerk; // Total column only when it differs from Salary
            const cols=[
              {key:"month", label:"Month",     align:"left"},
              {key:"salary",label:"Salary",     align:"right"},
              ...(hasBonus?[{key:"bonus",label:"Bonus",align:"right"}]:[]),
              ...(hasPerk ?[{key:"perk", label:"Perk",  align:"right"}]:[]),
              {key:"tds",  label:"TDS",         align:"right"},
              ...(showTotal?[{key:"total",label:"Total",align:"right"}]:[]),
            ];
            const tdS={padding:"6px 6px",fontFamily:"'Courier New',monospace"};
            return <div className="tbl-wrap" style={{marginTop:14,overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{borderBottom:`1.5px solid ${T.border}`}}>
                  {cols.map(col=><th key={col.key} style={{padding:"5px 6px",textAlign:col.align,fontWeight:600,color:T.i3,fontSize:11,whiteSpace:"nowrap"}}>{col.label}</th>)}
                </tr></thead>
                <tbody>
                  {chartData.map((d,i)=><tr key={i} style={{borderBottom:`1px solid ${T.border}`,background:d.hasBonus?"#F0FDF4":d.hasPerk?"#FFFBEB":"transparent"}}>
                    <td style={{padding:"6px 6px",fontWeight:(d.hasBonus||d.hasPerk)?700:400,color:d.hasBonus?T.em:d.hasPerk?T.aR:T.i2}}>{MONTHS[i]}</td>
                    <td style={{...tdS,textAlign:"right",color:T.i2}}>{fi(d.inHand)}</td>
                    {hasBonus&&<td style={{...tdS,textAlign:"right",color:d.bonus>0?T.em:T.i4}}>{d.bonus>0?fi(d.bonus):"—"}</td>}
                    {hasPerk &&<td style={{...tdS,textAlign:"right",color:d.hasPerk?T.aR:T.i4}}>{d.hasPerk?fi(d.perkNet):"—"}</td>}
                    <td style={{...tdS,textAlign:"right",color:T.ro}}>{fi(d.tds)}</td>
                    {showTotal&&<td style={{...tdS,textAlign:"right",fontWeight:700,color:(d.hasBonus||d.hasPerk)?T.eDk:T.ink}}>{fi(d.total)}</td>}
                  </tr>)}
                  <tr style={{borderTop:`1.5px solid ${T.border}`,background:T.bg}}>
                    <td style={{padding:"7px 6px",fontWeight:700,color:T.ink}}>Year</td>
                    <td style={{...tdS,textAlign:"right",color:T.i2}}>{fi(chartData.reduce((s,d)=>s+d.inHand,0))}</td>
                    {hasBonus&&<td style={{...tdS,textAlign:"right",color:T.em}}>{fi(chartData.reduce((s,d)=>s+d.bonus,0))}</td>}
                    {hasPerk &&<td style={{...tdS,textAlign:"right",color:T.aR}}>{fi(chartData.reduce((s,d)=>s+d.perkNet,0))}</td>}
                    <td style={{...tdS,textAlign:"right",color:T.ro}}>{fi(chartData.reduce((s,d)=>s+d.tds,0))}</td>
                    {showTotal&&<td style={{...tdS,textAlign:"right",fontWeight:800,color:T.em}}>{fi(chartData.reduce((s,d)=>s+d.total,0))}</td>}
                  </tr>
                </tbody>
              </table>
            </div>;
          })()}
        </div>
      </div>}

      </>}

      <div style={{textAlign:"center",fontSize:11,color:T.i3,lineHeight:1.9}}>
        Estimates only · New Tax Regime FY 2026–27 · EPFO PF wage ceiling ₹15,000/mo<br/>
        HRA + FBP + Other = Taxable Allowances (no HRA exemption in new regime)<br/>
        Surcharge: 10% (&gt;₹50L) · 15% (&gt;₹1Cr) · 25% (&gt;₹2Cr, new regime cap) · 4% Cess<br/>
        Sec 17(2)(vii): ER PF + ER NPS + Superannuation &gt; ₹7.5L/yr — excess taxable as perquisite<br/>
        Gratuity (4.81% of Basic) paid separately after 5 yrs — not in CTC above
      </div>
    </div>
  </div>;
}
