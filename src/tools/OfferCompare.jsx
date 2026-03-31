import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";

/* ═══════════════════════════════════════════
   TAX ENGINE — New Regime FY 2026-27
═══════════════════════════════════════════*/
function slabTax(ti){
  if(ti<=0)return 0;
  const s=[[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]];
  let t=0,p=0;for(const[l,r]of s){if(ti<=p)break;t+=(Math.min(ti,l)-p)*r;p=l;}
  return ti<=1200000?0:t;
}
function srRate(ti){return ti>10000000?.15:ti>5000000?.10:0;}
function calcTax(ti){
  if(ti<=0)return 0;
  const base=slabTax(ti),sr=srRate(ti);
  const noR=Math.round(base*(1+sr)*1.04);
  if(sr===0)return noR;
  const thrs=[5000000,10000000,20000000,50000000];
  let thr=0;for(const t of thrs){if(ti>t)thr=t;}
  return Math.min(noR,calcTax(thr)+(ti-thr));
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════*/
const tN=v=>{if(!v&&v!==0)return 0;const n=parseFloat(String(v).replace(/,/g,""));return isNaN(n)?0:n;};
const toINR=(val,cur,fx)=>cur==="usd"?tN(val)*(tN(fx)||84):tN(val);
const parseM=s=>s.replace(/[^0-9.]/g,"");

function fmtL(val){
  if(!val&&val!==0)return"—";
  const v=Math.abs(val),s=val<0?"-":"";
  if(v>=1e7)return`${s}₹${(v/1e7).toFixed(2)} Cr`;
  if(v>=1e5)return`${s}₹${(v/1e5).toFixed(2)} L`;
  return`${s}₹${Math.round(v).toLocaleString("en-IN")}`;
}
function fmtD(val){
  const v=Math.abs(val),s=val>=0?"+":"-";
  if(v>=1e7)return`${s}₹${(v/1e7).toFixed(2)} Cr`;
  if(v>=1e5)return`${s}₹${(v/1e5).toFixed(2)} L`;
  if(v>=1000)return`${s}₹${(v/1000).toFixed(1)}k`;
  return`${s}₹${Math.round(v)}`;
}

// Returns full breakdown with proper base-vs-bonus TDS split
function calcInHand(base,bonus,bPct,pfCap){
  const basicA=base*(bPct||50)/100;
  const pfWageA=pfCap?Math.min(basicA/12,15000)*12:basicA;
  const eeA=Math.round(pfWageA*.12);
  const erA=eeA;
  // Base-only tax (for regular months)
  const baseTaxable=Math.max(0,base-75000);
  const baseTax=calcTax(baseTaxable);
  // Total tax including bonus
  const totalTaxable=Math.max(0,base+bonus-75000);
  const totalTax=calcTax(totalTaxable);
  const bonusTax=totalTax-baseTax;           // Extra TDS hit in bonus month
  const gross=base+bonus;
  const inHand=Math.round(gross-totalTax-eeA);
  // Monthly split: bonus received in 1 month, rest are base-only months
  const regularMonthly=Math.round((base-baseTax-eeA)/12);
  const bonusMonthNet=bonus>0?Math.round(regularMonthly+bonus-bonusTax):regularMonthly;
  return{gross,eeA,erA,taxA:totalTax,inHand,taxable:totalTaxable,baseTax,bonusTax,regularMonthly,bonusMonthNet};
}
function getPf(base,bPct,pfCap){
  const{erA}=calcInHand(base,0,bPct,pfCap);return erA;
}
function getInHand(base,bonus,bPct,pfCap){
  return calcInHand(base,bonus,bPct,pfCap).inHand;
}
function getRetentionForYear(list,year){
  return(list||[]).filter(r=>r.year===year).reduce((s,r)=>s+tN(r.amount),0);
}

const VP={
  equal:     {label:"Equal",       4:[25,25,25,25],3:[33,33,34]},
  cliff1:    {label:"1-yr Cliff",  4:[0,34,33,33], 3:[0,50,50]},
  backloaded:{label:"Back-loaded", 4:[10,20,30,40],3:[20,30,50]},
  google:    {label:"Google-style",4:[33,33,22,12],3:[33,33,34]},
  custom:    {label:"Custom",      4:[25,25,25,25],3:[33,33,34]},
};

function calcRsuArr(on,mode,annual,grant,sched,yrs,custom,cur,fx){
  if(!on)return[0,0,0,0];
  if(mode==="yearly"){const v=toINR(annual,cur,fx);return[v,v,v,v];}
  const g=toINR(grant,cur,fx);
  const raw=sched==="custom"?custom:(VP[sched]?.[yrs]||[25,25,25,25]);
  return[0,1,2,3].map(i=>(yrs===3&&i===3)?0:g*(raw[i]||0)/100);
}

/* ═══════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════*/
const CA="#2563EB";
const NA="#059669";
const WA="#B45309";
const PU="#6366F1";

/* ═══════════════════════════════════════════
   PRIMITIVE COMPONENTS
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

function MoneyInput({label,value,onChange,hint,placeholder="0",currency="inr",fx=84,compact=false,accent}){
  const[foc,setFoc]=useState(false);
  const prefix=currency==="usd"?"$":"₹";
  const raw=tN(value);
  const fmtHint=raw>0?(currency==="usd"?`≈ ${fmtL(raw*(tN(fx)||84))} @ ₹${tN(fx)||84}/USD`:`= ${fmtL(raw)}`):null;
  const bdr=foc?(accent||"#6366F1"):"#E2E8F0";
  return(
    <div style={{marginBottom:compact?10:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:3}}>
        <LB>{label}</LB>
        {fmtHint&&<span style={{fontSize:12,fontWeight:700,color:accent||"#6366F1",fontFamily:"Courier New,monospace"}}>{fmtHint}</span>}
      </div>
      {hint&&<HT>{hint}</HT>}
      <div style={{display:"flex",alignItems:"center",border:`2px solid ${bdr}`,borderRadius:10,overflow:"hidden",background:foc?"#fff":"#F8FAFC",transition:"border-color .15s",boxShadow:foc?`0 0 0 3px ${(accent||"#6366F1")}18`:"none"}}>
        <span style={{padding:"0 10px",color:foc?(accent||"#6366F1"):"#94A3B8",fontSize:16,fontWeight:500,borderRight:`1px solid ${bdr}`,background:foc?"#F8F9FF":"#F1F5F9",alignSelf:"stretch",display:"flex",alignItems:"center",transition:"all .15s",flexShrink:0}}>{prefix}</span>
        <input type="text" inputMode="numeric" value={value}
          onChange={e=>onChange(e.target.value.replace(/\D/g,""))}
          onFocus={()=>setFoc(true)}
          onBlur={()=>setFoc(false)}
          placeholder={placeholder}
          style={{flex:1,padding:compact?"8px 10px":"11px 12px",border:"none",background:"transparent",fontSize:15,fontFamily:"Courier New,monospace",outline:"none",color:"#1E293B",minWidth:0,fontWeight:600,letterSpacing:"-0.02em"}}/>
      </div>
    </div>
  );
}

function SliderRow({label,value,onChange,min,max,step=1,suffix="%",accent=CA,amountHint=null}){
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <LB>{label}</LB>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          {amountHint&&<span style={{fontSize:11,color:"#64748B",fontFamily:"Courier New,monospace"}}>{amountHint}</span>}
          <span style={{fontSize:13,fontWeight:700,color:"#1E293B",fontFamily:"Courier New,monospace"}}>{value}{suffix}</span>
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:"100%",accentColor:accent,cursor:"pointer"}}/>
    </div>
  );
}

function Toggle({on,onToggle,label,accent=CA,size="md"}){
  const w=size==="sm"?30:36,h=size==="sm"?17:20,d=size==="sm"?13:16;
  return(
    <div onClick={onToggle} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:10,userSelect:"none"}}>
      <div style={{width:w,height:h,borderRadius:h/2,padding:2,background:on?accent:"#CBD5E1",transition:"background .2s",display:"flex",alignItems:"center",flexShrink:0}}>
        <div style={{width:d,height:d,borderRadius:d/2,background:"#fff",transform:on?`translateX(${w-d-4}px)`:"translateX(0)",transition:"transform .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
      </div>
      {label&&<span style={{fontSize:13,color:"#475569",fontFamily:"Outfit,sans-serif",lineHeight:1.3}}>{label}</span>}
    </div>
  );
}

function Pills({opts,val,onChange,accent}){
  return(
    <div style={{display:"flex",gap:4,marginBottom:12,flexWrap:"wrap"}}>
      {opts.map(o=>(
        <button key={o.v} onClick={()=>onChange(o.v)} style={{padding:"5px 13px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,fontFamily:"Outfit,sans-serif",fontWeight:600,background:val===o.v?accent:"#E2E8F0",color:val===o.v?"#fff":"#475569",transition:"all .15s"}}>{o.l}</button>
      ))}
    </div>
  );
}

function CurrPill({currency,onChange,fx,onFx}){
  const[fetching,setFetching]=useState(false);
  const fetchRate=()=>{
    setFetching(true);
    fetch("https://open.er-api.com/v6/latest/USD")
      .then(r=>r.json()).then(d=>{const r=d?.rates?.INR;if(r)onFx(String(Math.round(r)));})
      .catch(()=>{}).finally(()=>setFetching(false));
  };
  // Fetch on mount always so rate is fresh
  useEffect(()=>{fetchRate();},[]);// eslint-disable-line
  return(
    <div style={{marginBottom:10}}>
      <Pills opts={[{v:"usd",l:"$ USD"},{v:"inr",l:"₹ INR"}]} val={currency} onChange={onChange} accent={PU}/>
      {currency==="usd"&&(
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
          <span style={{fontSize:11,color:"#64748B",whiteSpace:"nowrap"}}>1 USD =</span>
          <input type="text" value={fx} onChange={e=>onFx(parseM(e.target.value))} style={{width:52,padding:"5px 6px",border:"1.5px solid #E2E8F0",borderRadius:7,fontSize:13,fontFamily:"Courier New,monospace",textAlign:"center",outline:"none",fontWeight:700}}/>
          <span style={{fontSize:11,color:"#64748B"}}>₹</span>
          <button onClick={fetchRate} disabled={fetching} style={{padding:"4px 9px",borderRadius:8,border:"1px solid #E2E8F0",background:"#F8FAFC",color:PU,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>
            {fetching?"…":"↻ Live"}
          </button>
        </div>
      )}
    </div>
  );
}

function VestPreview({sched,yrs,custom,accent}){
  const pts=sched==="custom"?custom:(VP[sched]?.[yrs]||[]);
  return(
    <div style={{display:"flex",gap:3,marginBottom:8}}>
      {[0,1,2,3].map(i=>{
        const p=(yrs===3&&i===3)?0:(pts[i]||0);
        return(
          <div key={i} style={{flex:1,textAlign:"center",padding:"3px 0",borderRadius:5,background:p>0?`${accent}22`:"#F1F5F9",fontSize:10,fontWeight:700,color:p>0?accent:"#94A3B8",fontFamily:"Courier New,monospace"}}>
            Y{i+1}:{p}%
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PF CONFIG
═══════════════════════════════════════════*/
function PfSection({accent,pfInBase,onPfInBase,basicAuto,onBasicAuto,basicPct,onBasicPct,pfCap,onPfCap}){
  return(
    <div style={{background:`${accent}0D`,border:`1px solid ${accent}33`,borderRadius:10,padding:"12px 14px",marginBottom:4}}>
      <div style={{fontSize:11,fontWeight:700,color:accent,marginBottom:8,fontFamily:"Outfit,sans-serif"}}>PF Configuration</div>
      <LB>Is ER PF included in the quoted base?</LB>
      <Pills opts={[{v:true,l:"Inside Base"},{v:false,l:"On-Top of Base"}]} val={pfInBase} onChange={onPfInBase} accent={accent}/>
      <HT>{pfInBase?"ER PF is baked into the quoted base. ER PF = 12% of basic.":"ER PF is added on top of the quoted base. ER PF = 12% of basic."}</HT>
      <LB>Basic salary calculation</LB>
      <Pills opts={[{v:true,l:"50% of base (auto)"},{v:false,l:"Custom %"}]} val={basicAuto} onChange={onBasicAuto} accent={accent}/>
      {!basicAuto&&<SliderRow label="Basic % of base salary" value={basicPct} onChange={onBasicPct} min={20} max={80} accent={accent}/>}
      <Toggle on={pfCap} onToggle={onPfCap} label="PF wage capped at ₹15,000/mo" accent={accent} size="sm"/>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RSU PANEL
═══════════════════════════════════════════*/
function RsuPanel({accent,on,onToggle,mode,onMode,ltiType,onLtiType,annual,onAnnual,grant,onGrant,sched,onSched,yrs,onYrs,custom,onCustom,currency,onCurrency,fx,onFx}){
  const customSum=(custom||[]).reduce((a,b)=>a+b,0);
  const customOk=Math.abs(customSum-100)<1;
  return(
    <>
      <Toggle on={on} onToggle={onToggle} label="Has RSU / LTI" accent={accent}/>
      {on&&(
        <>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,flexWrap:"wrap"}}>
            <span style={{fontSize:11,color:"#64748B"}}>Type:</span>
            {["rsu","esop","cash"].map(t=>(
              <button key={t} onClick={()=>onLtiType(t)} style={{padding:"3px 10px",borderRadius:12,border:"1.5px solid",borderColor:ltiType===t?accent:"#E2E8F0",background:ltiType===t?`${accent}22`:"#fff",color:ltiType===t?accent:"#64748B",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>{t.toUpperCase()}</button>
            ))}
          </div>
          <CurrPill currency={currency} onChange={onCurrency} fx={fx} onFx={onFx}/>
          {onMode&&<Pills opts={[{v:"yearly",l:"📅 Yearly Avg"},{v:"detailed",l:"📋 Grant Details"}]} val={mode} onChange={onMode} accent={accent}/>}
          {mode==="yearly"?(
            <MoneyInput label={`Annual ${ltiType.toUpperCase()} Vesting Value`} value={annual} onChange={onAnnual} hint="Average value vesting each year" placeholder="e.g. 500000" currency={currency} fx={fx}/>
          ):(
            <>
              <MoneyInput label={`Total ${ltiType.toUpperCase()} Grant`} value={grant} onChange={onGrant} hint="Total grant — split per schedule below" placeholder="e.g. 2000000" currency={currency} fx={fx}/>
              <div style={{marginBottom:8}}>
                <LB>Vesting Period</LB>
                <Pills opts={[{v:4,l:"4 Years"},{v:3,l:"3 Years"}]} val={yrs} onChange={onYrs} accent={accent}/>
              </div>
              <div style={{marginBottom:8}}>
                <LB>Schedule</LB>
                <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:6}}>
                  {Object.entries(VP).map(([k,v])=>(
                    <button key={k} onClick={()=>onSched(k)} style={{padding:"4px 9px",borderRadius:12,border:"1.5px solid",borderColor:sched===k?accent:"#E2E8F0",background:sched===k?`${accent}22`:"#fff",color:sched===k?accent:"#64748B",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>{v.label}</button>
                  ))}
                </div>
                {sched!=="custom"&&<VestPreview sched={sched} yrs={yrs} custom={custom} accent={accent}/>}
                {sched==="custom"&&(
                  <div style={{marginTop:4}}>
                    <div style={{display:"flex",gap:4}}>
                      {Array.from({length:yrs}).map((_,i)=>(
                        <div key={i} style={{flex:1,textAlign:"center"}}>
                          <div style={{fontSize:10,color:"#64748B",marginBottom:2}}>Y{i+1}</div>
                          <input type="number" min={0} max={100} value={custom[i]||0}
                            onChange={e=>{const a=[...custom];a[i]=Number(e.target.value);onCustom(a);}}
                            style={{width:"100%",textAlign:"center",padding:"5px 2px",border:`1.5px solid ${customOk?"#A7F3D0":"#FCA5A5"}`,borderRadius:6,fontSize:12,fontFamily:"Courier New,monospace",background:customOk?"#F0FDF4":"#FFF1F1",outline:"none"}}/>
                        </div>
                      ))}
                      {yrs===3&&(<div style={{flex:1,textAlign:"center"}}><div style={{fontSize:10,color:"#94A3B8",marginBottom:2}}>Y4</div><div style={{padding:"5px 2px",background:"#F1F5F9",borderRadius:6,fontSize:12,color:"#94A3B8",textAlign:"center"}}>0</div></div>)}
                    </div>
                    <div style={{marginTop:4,fontSize:11,textAlign:"right",color:customOk?"#059669":"#DC2626",fontFamily:"Courier New,monospace"}}>Sum: {customSum}% {customOk?"✓":"(must = 100%)"}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   RETENTION BONUS SECTION
═══════════════════════════════════════════*/
function RetentionSection({accent,on,onToggle,list,onList}){
  const usedYears=list.map(r=>r.year);
  const canAdd=[2,3,4].some(y=>!usedYears.includes(y));
  function addYear(){const next=[2,3,4].find(y=>!usedYears.includes(y));if(!next)return;onList([...list,{year:next,amount:""}]);}
  function remove(idx){onList(list.filter((_,i)=>i!==idx));}
  function update(idx,field,val){const a=[...list];a[idx]={...a[idx],[field]:val};onList(a);}
  return(
    <>
      <Toggle on={on} onToggle={onToggle} label="Has Retention Bonus (Year 2+)" accent={accent}/>
      {on&&(
        <div style={{background:`${accent}0D`,border:`1px solid ${accent}33`,borderRadius:10,padding:"12px 14px",marginBottom:8}}>
          <HT>Retention bonuses will be marked exceptional in comparison — not recurring income.</HT>
          {list.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:6,alignItems:"flex-end",marginBottom:8}}>
              <div style={{width:72,flexShrink:0}}>
                <LB>Year</LB>
                <select value={r.year} onChange={e=>update(i,"year",Number(e.target.value))}
                  style={{width:"100%",padding:"8px 4px",border:"1.5px solid #E2E8F0",borderRadius:7,fontSize:13,background:"#fff",fontFamily:"Outfit,sans-serif",outline:"none"}}>
                  {[2,3,4].map(y=><option key={y} value={y} disabled={usedYears.includes(y)&&r.year!==y}>Year {y}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <LB>Amount (₹)</LB>
                <div style={{display:"flex",alignItems:"center",border:"1.5px solid #E2E8F0",borderRadius:7,overflow:"hidden",background:"#F8FAFC"}}>
                  <span style={{padding:"0 7px",color:"#94A3B8",fontSize:13,borderRight:"1px solid #E2E8F0",background:"#F1F5F9"}}>₹</span>
                  <input type="text" inputMode="numeric" value={r.amount} onChange={e=>update(i,"amount",parseM(e.target.value))} placeholder="e.g. 500000"
                    style={{flex:1,padding:"8px 8px",border:"none",background:"transparent",fontSize:13,fontFamily:"Courier New,monospace",outline:"none",minWidth:0}}/>
                </div>
                {tN(r.amount)>0&&<div style={{fontSize:10,color:"#64748B",fontFamily:"Courier New,monospace",marginTop:1}}>{fmtL(tN(r.amount))}</div>}
              </div>
              <button onClick={()=>remove(i)} style={{padding:"8px 10px",borderRadius:7,border:"1px solid #FCA5A5",background:"#FFF1F1",color:"#DC2626",fontSize:13,cursor:"pointer",flexShrink:0}}>✕</button>
            </div>
          ))}
          {canAdd&&(
            <button onClick={addYear} style={{padding:"6px 14px",borderRadius:20,border:`1.5px dashed ${accent}`,background:"transparent",color:accent,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Outfit,sans-serif"}}>
              + Add Retention Year
            </button>
          )}
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════════════
   CURRENT TC PREVIEW
═══════════════════════════════════════════*/
function PFRow({label,v,accent}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
      <span style={{fontSize:12,color:"#475569",fontFamily:"Outfit,sans-serif"}}>{label}</span>
      <span style={{fontSize:12,fontFamily:"Courier New,monospace",color:"#1E293B",fontWeight:600}}>{fmtL(v)}</span>
    </div>
  );
}

function TCPreview({base,bonus,rsuY1,erPf,pfInBase,showInhand,basicPct,pfCap}){
  if(!tN(base))return null;
  const bN=tN(base),bonN=bonus>0?bonus:0;
  const basicA=bN*(basicPct||50)/100;
  const erPfInside=pfInBase?(pfCap?Math.min(basicA*0.12,21600):basicA*0.12):0;
  const erPfOnTop=!pfInBase?erPf:0;
  const rN=rsuY1||0;
  const tc=bN+bonN+erPfOnTop+rN;
  return(
    <div style={{marginTop:16,padding:14,background:"linear-gradient(135deg,#EFF6FF,#F0F9FF)",borderRadius:12,border:"1.5px solid #BFDBFE"}}>
      <div style={{fontSize:11,fontWeight:700,color:CA,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,fontFamily:"Outfit,sans-serif"}}>📊 Your Current Year 1 TC</div>
      <PFRow label="Base Salary" v={bN}/>
      {pfInBase&&erPfInside>0&&<PFRow label={`  └ incl. ER PF (12% of basic)`} v={erPfInside}/>}
      {bonN>0&&<PFRow label="Bonus" v={bonN}/>}
      {erPfOnTop>0&&<PFRow label="ER PF (on-top of base)" v={erPfOnTop}/>}
      {rN>0&&<PFRow label="RSU / LTI (Y1)" v={rN}/>}
      <div style={{borderTop:"1.5px solid #BFDBFE",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:800,color:CA,fontFamily:"Sora,sans-serif"}}>{pfInBase?"Base + ER PF + Bonus":"Total CTC"}</span>
        <span style={{fontSize:16,fontWeight:800,color:CA,fontFamily:"Sora,sans-serif"}}>{fmtL(tc)}</span>
      </div>
      {showInhand&&(
        <div style={{marginTop:5,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:"#64748B",fontFamily:"Outfit,sans-serif"}}>Est. in-hand/yr</span>
          <span style={{fontSize:11,fontFamily:"Courier New,monospace",color:"#475569"}}>{fmtL(getInHand(bN,bonN,basicPct,pfCap))}</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   NEW OFFER TC PREVIEW
═══════════════════════════════════════════*/
function NewTCPreview({base,bonus,rsuY1,erPf,joining,relocation,retentionY1,pfInBase,showInhand,basicPct,pfCap}){
  if(!tN(base))return null;
  const bN=tN(base),bonN=bonus>0?bonus:0;
  const basicA2=bN*(basicPct||50)/100;
  const erPfInside=pfInBase?(pfCap?Math.min(basicA2*0.12,21600):basicA2*0.12):0;
  const erPfOnTop=!pfInBase?erPf:0;
  const rN=rsuY1||0;
  const jN=joining||0,relN=relocation||0,retN=retentionY1||0;
  const tc=bN+bonN+erPfOnTop+jN+relN+retN+rN;
  return(
    <div style={{marginTop:16,padding:14,background:"linear-gradient(135deg,#ECFDF5,#F0FDF9)",borderRadius:12,border:"1.5px solid #A7F3D0"}}>
      <div style={{fontSize:11,fontWeight:700,color:NA,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10,fontFamily:"Outfit,sans-serif"}}>📊 New Offer Year 1 TC</div>
      <PFRow label="Base Salary" v={bN}/>
      {pfInBase&&erPfInside>0&&<PFRow label={`  └ incl. ER PF (12% of basic)`} v={erPfInside}/>}
      {bonN>0&&<PFRow label="Bonus" v={bonN}/>}
      {erPfOnTop>0&&<PFRow label="ER PF (on-top of base)" v={erPfOnTop}/>}
      {jN>0&&<PFRow label="Joining Bonus ⚡" v={jN}/>}
      {relN>0&&<PFRow label="Relocation ⚡" v={relN}/>}
      {retN>0&&<PFRow label="Retention (Y1) 🔁" v={retN}/>}
      {rN>0&&<PFRow label="RSU / LTI (Y1)" v={rN}/>}
      <div style={{borderTop:"1.5px solid #A7F3D0",marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:800,color:NA,fontFamily:"Sora,sans-serif"}}>{pfInBase?"Base + ER PF + Bonus":"Total CTC"}</span>
        <span style={{fontSize:16,fontWeight:800,color:NA,fontFamily:"Sora,sans-serif"}}>{fmtL(tc)}</span>
      </div>
      {(jN>0||relN>0)&&(
        <div style={{marginTop:6,fontSize:10,color:WA,fontStyle:"italic",fontFamily:"Outfit,sans-serif"}}>
          ⚡ Excl. one-time: {fmtL(tc-jN-relN)} (Years 2–4 base)
        </div>
      )}
      {showInhand&&(
        <div style={{marginTop:5,display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:11,color:"#64748B",fontFamily:"Outfit,sans-serif"}}>Est. in-hand/yr</span>
          <span style={{fontSize:11,fontFamily:"Courier New,monospace",color:"#475569"}}>{fmtL(getInHand(bN,bonN,basicPct,pfCap))}</span>
        </div>
      )}
    </div>
  );
}


function DBar({pct,maxP=60}){
  const barW=Math.min(Math.abs(pct),maxP)/maxP*70;
  const c=pct>=0?"#059669":"#DC2626";
  return(
    <div style={{display:"inline-flex",alignItems:"center",gap:5}}>
      <div style={{width:70,height:6,background:"#F1F5F9",borderRadius:3,overflow:"hidden",flexShrink:0}}>
        <div style={{width:barW,height:"100%",background:c,borderRadius:3,transition:"width .35s"}}/>
      </div>
      <span style={{fontSize:10,color:c,fontWeight:700,fontFamily:"Courier New,monospace",whiteSpace:"nowrap"}}>{pct>=0?"+":""}{Number(pct).toFixed(1)}%</span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   YEAR ACCORDION
═══════════════════════════════════════════*/
function YearAccordion({yd,showPf,hasJoining,hasRelocation,hasRsu,hasRetention,ltiNote,joiningAmt,relocationAmt,retentionAmt,expanded,onToggle,showInhand}){
  const{year,cur,new:nw,delta,deltaPct}=yd;
  const dPos=delta>=0;

  const rows=[];
  rows.push({key:"base",label:"Base Salary",c:cur.base,n:nw.base,tag:null,note:null});

  if(cur.bonus>0||nw.bonus>0)
    rows.push({key:"bb",label:"Base + Bonus",c:cur.base+cur.bonus,n:nw.base+nw.bonus,tag:null,note:null});

  if(hasJoining){
    const prv=rows[rows.length-1];
    const nV=year===1?prv.n+nw.joining:prv.n;
    rows.push({key:"join",label:"+ Joining Bonus",c:prv.c,n:nV,
      tag:year===1?"one-time":"inactive",
      note:year===1?`⚡ ONE-TIME — ${fmtL(joiningAmt)} applies only to Year 1. Years 2–4 will not include this.`:`Joining bonus was Year 1 only — not included here.`
    });
  }

  if(hasRelocation){
    const prv=rows[rows.length-1];
    const nV=year===1?prv.n+nw.relocation:prv.n;
    rows.push({key:"reloc",label:"+ Relocation Allowance",c:prv.c,n:nV,
      tag:year===1?"one-time":"inactive",
      note:year===1?`🏠 ONE-TIME — ${fmtL(relocationAmt)} relocation allowance. Taxable as salary. Does not recur in subsequent years.`:`Relocation was Year 1 only.`
    });
  }

  if(hasRetention&&retentionAmt>0){
    const prv=rows[rows.length-1];
    rows.push({key:"ret",label:`+ Retention Bonus (Y${year})`,c:prv.c,n:prv.n+retentionAmt,
      tag:"periodic",
      note:`🔁 RETENTION — ${fmtL(retentionAmt)} in Year ${year}. Conditional on continued employment. Confirm terms before relying on this.`
    });
  }

  if(hasRsu){
    const prv=rows[rows.length-1];
    rows.push({key:"rsu",label:"+ RSU / LTI",c:prv.c+cur.rsu,n:prv.n+nw.rsu,tag:null,note:ltiNote||null});
  }

  if(showPf&&(cur.erPf>0||nw.erPf>0)){
    const prv=rows[rows.length-1];
    rows.push({key:"pf",label:"+ ER PF (on top)",c:prv.c+cur.erPf,n:prv.n+nw.erPf,tag:"pf",note:null});
  }

  rows.push({key:"total",label:"Total TC",c:cur.tc,n:nw.tc,tag:"total",note:null});
  if(showInhand)rows.push({key:"ih",label:"Est. In-hand / yr",c:cur.inHand,n:nw.inHand,tag:"dim",note:"New Tax Regime estimate — standard deduction applied"});

  const TH=(al,col)=>({textAlign:al,padding:"7px 8px",color:col,fontFamily:"Outfit,sans-serif",fontSize:11,fontWeight:700,whiteSpace:"nowrap"});

  return(
    <div style={{borderRadius:12,border:"1.5px solid #E2E8F0",marginBottom:10,overflow:"hidden"}}>
      <div onClick={onToggle} style={{padding:"12px 14px",cursor:"pointer",background:expanded?"linear-gradient(135deg,#EFF6FF,#F0FDF4)":"#FAFAFA",display:"flex",alignItems:"center",gap:10,userSelect:"none",transition:"background .2s"}}>
        <div style={{width:34,height:34,borderRadius:10,flexShrink:0,
          background:expanded?`linear-gradient(135deg,${CA},#3B82F6)`:"#E2E8F0",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,fontFamily:"Sora,sans-serif",color:expanded?"#fff":"#64748B",
          boxShadow:expanded?"0 4px 12px rgba(30,64,175,.3)":"none",transition:"all .2s"}}>Y{year}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:13,fontWeight:700,color:"#1E293B",fontFamily:"Outfit,sans-serif"}}>Year {year}{year===1?" — Base Year":""}</div>
          <div style={{fontSize:11,color:"#64748B",fontFamily:"Courier New,monospace",marginTop:1}}>
            <span style={{color:CA,fontWeight:600}}>{fmtL(cur.tc)}</span>
            <span style={{color:"#94A3B8"}}> → </span>
            <span style={{color:NA,fontWeight:600}}>{fmtL(nw.tc)}</span>
          </div>
        </div>
        <div style={{padding:"5px 12px",borderRadius:14,fontSize:12,fontWeight:800,flexShrink:0,
          background:dPos?"linear-gradient(135deg,#10B981,#34D399)":"linear-gradient(135deg,#EF4444,#F87171)",
          color:"#fff",fontFamily:"Courier New,monospace",
          boxShadow:dPos?"0 4px 12px rgba(16,185,129,.35)":"0 4px 12px rgba(239,68,68,.35)"}}>
          {dPos?"+":""}{fmtL(delta)}
        </div>
        <span style={{color:"#94A3B8",fontSize:12,flexShrink:0}}>{expanded?"▲":"▼"}</span>
      </div>

      {expanded&&(
        <div style={{background:"#fff"}}>
          <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:460}}>
              <thead>
                <tr style={{background:"#F8FAFF",borderBottom:"2px solid #EEF2FF"}}>
                  <th style={{...TH("left","#64748B"),minWidth:150}}>Layer</th>
                  <th style={{...TH("right",CA),minWidth:80}}>Current</th>
                  <th style={{...TH("right",NA),minWidth:80}}>New Offer</th>
                  <th style={{...TH("right","#475569"),minWidth:72}}>Δ Amt</th>
                  <th style={{...TH("left","#475569"),minWidth:100,paddingLeft:6}}>Δ %</th>
                </tr>
              </thead>
              <tbody>
                {rows.flatMap(row=>{
                  const d=row.n-row.c,pct=row.c>0?d/row.c*100:0;
                  const isOneTime=row.tag==="one-time"&&year===1;
                  const isInactive=row.tag==="inactive";
                  const isPeriodic=row.tag==="periodic";
                  const isTotal=row.tag==="total";
                  const isDim=row.tag==="dim";
                  const mr=(
                    <tr key={row.key} style={{borderBottom:row.note?"none":"1px solid #F8FAFF",background:isTotal?"#F0F4FF":isOneTime?"#FFFBEB":isPeriodic?"#FFF7ED":isDim?"#FAFAFA":"transparent"}}>
                      <td style={{padding:"7px 8px",fontFamily:"Outfit,sans-serif",fontWeight:isTotal?800:isDim?400:600,color:isOneTime?WA:isPeriodic?"#D97706":isTotal?"#1E293B":isDim?"#94A3B8":"#475569",fontSize:isTotal?12:11,borderLeft:`3px solid ${isTotal?PU:isOneTime?"#F59E0B":isPeriodic?"#F59E0B":"transparent"}`}}>
                        {isOneTime&&<span style={{marginRight:3}}>⚡</span>}
                        {isPeriodic&&<span style={{marginRight:3}}>🔁</span>}
                        {row.label}
                        {isTotal&&<span style={{fontSize:9,background:"#E0E7FF",color:"#4338CA",borderRadius:5,padding:"1px 5px",marginLeft:5,fontWeight:700}}>ALL-IN</span>}
                      </td>
                      <td style={{textAlign:"right",padding:"7px 7px",fontFamily:"Courier New,monospace",color:"#1E40AF",fontWeight:isTotal?700:400,fontSize:isTotal?12:11}}>{fmtL(row.c)}</td>
                      <td style={{textAlign:"right",padding:"7px 7px",fontFamily:"Courier New,monospace",color:"#065F46",fontWeight:isTotal?700:400,fontSize:isTotal?12:11}}>{isInactive?<span style={{color:"#94A3B8",fontSize:10}}>—</span>:fmtL(row.n)}</td>
                      <td style={{textAlign:"right",padding:"7px 7px",fontFamily:"Courier New,monospace",fontWeight:isTotal?700:600,fontSize:isTotal?12:11,color:isOneTime&&year===1?WA:d>=0?"#15803D":"#DC2626"}}>
                        {(isOneTime&&year===1)||isInactive
                          ?<span style={{fontSize:9,background:isInactive?"#F1F5F9":"#FEF3C7",color:isInactive?"#94A3B8":"#92400E",borderRadius:5,padding:"2px 5px",fontFamily:"Outfit,sans-serif",fontWeight:700}}>{isInactive?"N/A":"ONE-TIME"}</span>
                          :fmtD(d)}
                      </td>
                      <td style={{padding:"7px 5px"}}>
                        {isDim?<span style={{fontSize:10,color:"#94A3B8",fontFamily:"Outfit,sans-serif"}}>est.</span>
                          :(isOneTime&&year===1)||isInactive?<span style={{fontSize:10,color:WA,fontStyle:"italic",fontFamily:"Outfit,sans-serif"}}>{isInactive?"":"exceptional"}</span>
                          :<DBar pct={pct}/>}
                      </td>
                    </tr>
                  );
                  const nt=row.note?(
                    <tr key={`${row.key}-n`} style={{background:isOneTime||isPeriodic?"#FFFBEB":"#F8FAFF",borderBottom:"1px solid #F1F5F9"}}>
                      <td colSpan={5} style={{padding:"2px 8px 7px 24px",fontSize:10,color:isOneTime||isPeriodic?WA:"#6366F1",fontStyle:"italic",fontFamily:"Outfit,sans-serif",lineHeight:1.4}}>↳ {row.note}</td>
                    </tr>
                  ):null;
                  return nt?[mr,nt]:[mr];
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════*/
export default function OfferCompare(){
  const[curBase,setCurBase]=useState("");
  const[curBonusPct,setCurBonusPct]=useState(0);
  const[curBonusManual,setCurBonusManual]=useState("");
  const[curBonusManualOn,setCurBonusManualOn]=useState(false);
  const[curPfInBase,setCurPfInBase]=useState(false);
  const[curBasicAuto,setCurBasicAuto]=useState(true);
  const[curBasicPct,setCurBasicPct]=useState(50);
  const[curPfCap,setCurPfCap]=useState(false);
  const[curRsuOn,setCurRsuOn]=useState(false);
  const[curRsuMode,setCurRsuMode]=useState("yearly");
  const[curRsuLti,setCurRsuLti]=useState("rsu");
  const[curRsuAnnual,setCurRsuAnnual]=useState("");
  const[curRsuGrant,setCurRsuGrant]=useState("");
  const[curRsuSched,setCurRsuSched]=useState("equal");
  const[curRsuYrs,setCurRsuYrs]=useState(4);
  const[curRsuCustom,setCurRsuCustom]=useState([25,25,25,25]);
  const[curRsuCur,setCurRsuCur]=useState("usd");
  const[curRsuFx,setCurRsuFx]=useState("84");
  const[curIncrOn,setCurIncrOn]=useState(false);
  const[curIncrPct,setCurIncrPct]=useState(10);

  const[newBase,setNewBase]=useState("");
  const[newBonusPct,setNewBonusPct]=useState(0);
  const[newBonusManual,setNewBonusManual]=useState("");
  const[newBonusManualOn,setNewBonusManualOn]=useState(false);
  const[newPfInBase,setNewPfInBase]=useState(false);
  const[newBasicAuto,setNewBasicAuto]=useState(true);
  const[newBasicPct,setNewBasicPct]=useState(50);
  const[newPfCap,setNewPfCap]=useState(false);
  const[newJoining,setNewJoining]=useState("");
  const[newRelocation,setNewRelocation]=useState("");
  const[newRetentionOn,setNewRetentionOn]=useState(false);
  const[newRetentionList,setNewRetentionList]=useState([{year:2,amount:""}]);
  const[newRsuOn,setNewRsuOn]=useState(false);
  const[newRsuLti,setNewRsuLti]=useState("rsu");
  const[newRsuGrant,setNewRsuGrant]=useState("");
  const[newRsuSched,setNewRsuSched]=useState("equal");
  const[newRsuYrs,setNewRsuYrs]=useState(4);
  const[newRsuCustom,setNewRsuCustom]=useState([25,25,25,25]);
  const[newRsuCur,setNewRsuCur]=useState("usd");
  const[newRsuFx,setNewRsuFx]=useState("84");
  const[newIncrOn,setNewIncrOn]=useState(false);
  const[newIncrPct,setNewIncrPct]=useState(10);

  const[showInhand,setShowInhand]=useState(true);
  const[expandYear,setExpandYear]=useState(1);

  // ── Increment / Hike quick-fill (reactive)
  const[hikeMode,setHikeMode]=useState(false);
  const[hikePct,setHikePct]=useState(30);
  // Increment timing: "y1" = applies from Year 1 (immediate), "y2" = applies from Year 2 onwards
  const[curIncrFrom,setCurIncrFrom]=useState("y2");
  const[newIncrFrom,setNewIncrFrom]=useState("y2");

  // Sync settings (not base) once when hike mode is toggled on
  useEffect(()=>{
    if(!hikeMode)return;
    setNewBonusPct(curBonusPct);setNewBonusManual(curBonusManual);setNewBonusManualOn(curBonusManualOn);
    setNewPfInBase(curPfInBase);setNewBasicAuto(curBasicAuto);setNewBasicPct(curBasicPct);setNewPfCap(curPfCap);
    setNewIncrOn(curIncrOn);setNewIncrPct(curIncrPct);setNewIncrFrom(curIncrFrom);
    // Also set initial base
    const b=tN(curBase);if(b)setNewBase(String(Math.round(b*(1+hikePct/100))));
  },[hikeMode]);// eslint-disable-line

  // Direct handlers used by slider and manual input — no useEffect feedback loop
  const onHikeSlider=v=>{
    setHikePct(v);
    const b=tN(curBase);if(b)setNewBase(String(Math.round(b*(1+v/100))));
  };
  const onHikePctInput=v=>{
    const n=Math.min(150,Math.max(1,Number(v)||1));
    setHikePct(n);
    const b=tN(curBase);if(b)setNewBase(String(Math.round(b*(1+n/100))));
  };
  const onNewBaseManual=v=>{
    setNewBase(v);
    if(hikeMode&&tN(curBase)>0&&tN(v)>0){
      const rev=Math.round((tN(v)/tN(curBase)-1)*100);
      if(rev>=1&&rev<=150)setHikePct(rev);
    }
  };

  const curEffBasic=curBasicAuto?50:curBasicPct;
  const newEffBasic=newBasicAuto?50:newBasicPct;

  const curRsuArr=useMemo(()=>calcRsuArr(curRsuOn,curRsuMode,curRsuAnnual,curRsuGrant,curRsuSched,curRsuYrs,curRsuCustom,curRsuCur,curRsuFx),
    [curRsuOn,curRsuMode,curRsuAnnual,curRsuGrant,curRsuSched,curRsuYrs,curRsuCustom,curRsuCur,curRsuFx]);
  const newRsuArr=useMemo(()=>calcRsuArr(newRsuOn,"detailed",null,newRsuGrant,newRsuSched,newRsuYrs,newRsuCustom,newRsuCur,newRsuFx),
    [newRsuOn,newRsuGrant,newRsuSched,newRsuYrs,newRsuCustom,newRsuCur,newRsuFx]);

  const ltiNote=useMemo(()=>{
    if(!curRsuOn||!newRsuOn||curRsuLti===newRsuLti)return null;
    const nm={rsu:"RSU (equity)",esop:"ESOP (options)",cash:"Cash LTI"};
    return`⚠ Comparing ${nm[curRsuLti]||curRsuLti} vs ${nm[newRsuLti]||newRsuLti} — vesting risk, liquidity & tax treatment differ significantly`;
  },[curRsuOn,newRsuOn,curRsuLti,newRsuLti]);

  const results=useMemo(()=>{
    if(!tN(curBase)||!tN(newBase))return null;
    const years=[1,2,3,4].map(Y=>{
      const idx=Y-1;
      // incrFrom "y1" = Year 1 already has increment (offer letter includes new hike)
      // incrFrom "y2" = Year 1 is base; increment starts from Year 2
      const cIdxEff=curIncrFrom==="y1"?idx:Math.max(0,idx-1);
      const nIdxEff=newIncrFrom==="y1"?idx:Math.max(0,idx-1);
      const cG=curIncrOn?Math.pow(1+curIncrPct/100,cIdxEff):1;
      const nG=newIncrOn?Math.pow(1+newIncrPct/100,nIdxEff):1;
      const cBase=tN(curBase)*cG;
      const cBonus=tN(curBonusManual)>0?tN(curBonusManual)*cG:cBase*curBonusPct/100;
      const cErPf=!curPfInBase?getPf(cBase,curEffBasic,curPfCap):0;
      const cRsu=curRsuArr[idx];
      const cTc=cBase+cBonus+cErPf+cRsu;
      const nBase=tN(newBase)*nG;
      const nBonus=tN(newBonusManual)>0?tN(newBonusManual)*nG:nBase*newBonusPct/100;
      const nErPf=!newPfInBase?getPf(nBase,newEffBasic,newPfCap):0;
      const nJoin=Y===1?tN(newJoining):0;
      const nReloc=Y===1?tN(newRelocation):0;
      const nRet=newRetentionOn?getRetentionForYear(newRetentionList,Y):0;
      const nRsu=newRsuArr[idx];
      const nTc=nBase+nBonus+nErPf+nJoin+nReloc+nRet+nRsu;
      return{
        year:Y,
        cur:{base:cBase,bonus:cBonus,erPf:cErPf,rsu:cRsu,joining:0,relocation:0,retention:0,tc:cTc,inHand:getInHand(cBase,cBonus,curEffBasic,curPfCap)},
        new:{base:nBase,bonus:nBonus,erPf:nErPf,rsu:nRsu,joining:nJoin,relocation:nReloc,retention:nRet,tc:nTc,inHand:getInHand(nBase,nBonus,newEffBasic,newPfCap)},
        delta:nTc-cTc,deltaPct:cTc>0?((nTc-cTc)/cTc*100).toFixed(1):"0.0"
      };
    });
    const cumCur=years.reduce((s,y)=>s+y.cur.tc,0);
    const cumNew=years.reduce((s,y)=>s+y.new.tc,0);
    let rC=0,rN=0,beY=null;
    for(const y of years){rC+=y.cur.tc;rN+=y.new.tc;if(rN>rC&&!beY)beY=y.year;}
    return{years,cumCur,cumNew,cumDelta:cumNew-cumCur,breakEvenYear:beY};
  },[
    curBase,curBonusPct,curBonusManual,curPfInBase,curEffBasic,curPfCap,curRsuArr,curIncrOn,curIncrPct,curIncrFrom,
    newBase,newBonusPct,newBonusManual,newPfInBase,newEffBasic,newPfCap,
    newJoining,newRelocation,newRetentionOn,newRetentionList,newRsuArr,newIncrOn,newIncrPct,newIncrFrom
  ]);

  const hasJoining=tN(newJoining)>0;
  const hasRelocation=tN(newRelocation)>0;
  const hasRsu=curRsuOn||newRsuOn;
  const hasRetention=newRetentionOn&&newRetentionList.some(r=>tN(r.amount)>0);

  const clearAll=()=>{
    setCurBase("");setCurBonusPct(0);setCurBonusManual("");setCurBonusManualOn(false);setCurPfInBase(false);setCurBasicAuto(true);setCurBasicPct(50);setCurPfCap(false);
    setCurRsuOn(false);setCurRsuAnnual("");setCurRsuGrant("");setCurIncrOn(false);setCurIncrPct(10);setCurIncrFrom("y2");
    setNewBase("");setNewBonusPct(0);setNewBonusManual("");setNewBonusManualOn(false);setNewPfInBase(false);setNewBasicAuto(true);setNewBasicPct(50);setNewPfCap(false);
    setNewJoining("");setNewRelocation("");setNewRetentionOn(false);setNewRetentionList([{year:2,amount:""}]);
    setNewRsuOn(false);setNewRsuGrant("");setNewIncrOn(false);setNewIncrPct(10);setNewIncrFrom("y2");
    setShowInhand(true);setExpandYear(1);setHikeMode(false);setHikePct(30);
  };

  const prevBonus=tN(curBonusManual)>0?tN(curBonusManual):tN(curBase)*curBonusPct/100;
  const prevErPf=!curPfInBase?getPf(tN(curBase),curEffBasic,curPfCap):0;
  const prevRsuY1=curRsuArr[0];

  return(
    <div style={{minHeight:"100vh",background:"#F0F4FF",fontFamily:"Outfit,sans-serif",paddingBottom:60}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 45%,#334155 100%)",padding:"24px 14px 20px",color:"#fff"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <h1 style={{fontSize:20,fontWeight:800,fontFamily:"Sora,sans-serif",margin:0,letterSpacing:"-0.4px",lineHeight:1.2}}>Offer Comparison Calculator</h1>
          <div style={{fontSize:11,color:"#93C5FD",marginTop:5,display:"flex",gap:5,flexWrap:"wrap"}}>
            {["New Tax Regime","FY 2026-27","4-Year View","Layered TC Analysis"].map(b=>(
              <span key={b} style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"2px 8px",fontSize:10,fontWeight:600}}>{b}</span>
            ))}
          </div>
          <button onClick={clearAll} style={{marginTop:8,padding:"4px 14px",borderRadius:20,border:"1.5px solid rgba(255,255,255,.3)",background:"transparent",color:"#CBD5FE",fontSize:11,cursor:"pointer",fontFamily:"Outfit,sans-serif",fontWeight:600}}>
            ↺ Clear All
          </button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"14px 12px"}}>

        {/* HIKE / INCREMENT QUICK-FILL BANNER */}
        <div style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:14,border:"1.5px solid #E2E8F0"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:hikeMode?12:0,cursor:"pointer",userSelect:"none"}} onClick={()=>setHikeMode(!hikeMode)}>
            <span style={{fontSize:16}}>📈</span>
            <span style={{fontSize:13,fontWeight:700,color:"#334155",flex:1}}>Evaluating an increment / hike offer?</span>
            <span style={{fontSize:11,fontWeight:600,color:PU,background:"#EDE9FE",padding:"3px 10px",borderRadius:10,cursor:"pointer",flexShrink:0}}>{hikeMode?"Hide ▲":"Quick Fill ▼"}</span>
          </div>
          {hikeMode&&(
            <div style={{padding:"12px 0 0"}}>
              {!tN(curBase)&&<div style={{fontSize:12,color:"#F59E0B",background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"8px 12px",marginBottom:10}}>Enter your current base salary in the <strong>Current</strong> panel first — New Offer updates live.</div>}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6,gap:8,flexWrap:"wrap"}}>
                <label style={{fontSize:13,fontWeight:700,color:"#334155"}}>Expected Hike %</label>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {tN(curBase)>0&&(
                    <span style={{fontSize:13,fontFamily:"Courier New,monospace",color:"#64748B"}}>
                      {fmtL(tN(curBase))} <span style={{color:"#94A3B8"}}>→</span> <strong style={{color:NA,fontSize:15}}>{fmtL(Math.round(tN(curBase)*(1+hikePct/100)))}</strong>
                    </span>
                  )}
                  <span style={{fontSize:22,fontWeight:900,color:PU,fontFamily:"Sora,sans-serif",minWidth:52,textAlign:"right"}}>{hikePct}%</span>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <input type="range" min={1} max={150} step={1} value={hikePct} onChange={e=>onHikeSlider(Number(e.target.value))}
                  style={{flex:1,accentColor:PU,cursor:"pointer",height:6}}/>
                <input type="number" min={1} max={150} value={hikePct} onChange={e=>onHikePctInput(e.target.value)}
                  style={{width:60,padding:"5px 8px",border:`2px solid ${PU}`,borderRadius:8,fontSize:14,fontWeight:700,color:PU,fontFamily:"Courier New,monospace",textAlign:"center",outline:"none",background:"#EDE9FE"}}/>
                <span style={{fontSize:13,fontWeight:700,color:PU,marginLeft:-6}}>%</span>
              </div>
              <div style={{position:"relative",height:16,marginTop:2,marginBottom:8}}>
                {[[1,"1%"],[30,"30%"],[50,"50%"],[100,"100%"],[150,"150%"]].map(([v,l])=>(
                  <span key={v} style={{position:"absolute",left:`${(v-1)/149*100}%`,transform:"translateX(-50%)",fontSize:10,color:Math.abs(hikePct-v)<=2?"#6366F1":"#94A3B8",fontWeight:Math.abs(hikePct-v)<=2?700:400,whiteSpace:"nowrap"}}>{l}</span>
                ))}
              </div>
              {tN(curBase)>0&&(
                <div style={{background:"linear-gradient(135deg,#EDE9FE,#F0F9FF)",borderRadius:10,padding:"10px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:10,color:"#6366F1",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:2}}>New Offer Base (auto-filled)</div>
                    <div style={{fontSize:18,fontWeight:800,color:NA,fontFamily:"Sora,sans-serif"}}>{fmtL(Math.round(tN(curBase)*(1+hikePct/100)))}</div>
                  </div>
                  <div style={{fontSize:11,color:"#64748B",textAlign:"right"}}>
                    <div>Monthly raise: <strong style={{color:NA}}>{fmtL(Math.round(tN(curBase)*hikePct/100/12))}</strong></div>
                    <div style={{marginTop:2,color:"#94A3B8"}}>New Offer updates automatically</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* INPUT GRID */}
        <div className="offer-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:18}}>

          {/* CURRENT OFFER */}
          <div style={{background:"#EFF6FF",borderRadius:14,padding:16,border:"2px solid #BFDBFE",boxShadow:"0 2px 8px rgba(37,99,235,.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:CA,flexShrink:0}}/>
              <div style={{fontSize:14,fontWeight:800,color:CA,fontFamily:"Sora,sans-serif"}}>Current Offer</div>
            </div>
            <ST accent={CA}>Base &amp; Bonus</ST>
            <MoneyInput label="Annual Base Salary" value={curBase} onChange={v=>{setCurBase(v);if(curBonusPct>0&&tN(v)>0)setCurBonusManual(String(Math.round(tN(v)*curBonusPct/100)));}} placeholder="e.g. 1000000" accent={CA}/>
            <SliderRow label="Bonus % of Base" value={curBonusPct}
              onChange={v=>{setCurBonusPct(v);if(tN(curBase)>0){setCurBonusManual(String(Math.round(tN(curBase)*v/100)));setCurBonusManualOn(true);}}}
              min={0} max={100} accent={CA}
              amountHint={tN(curBase)>0&&curBonusPct>0?fmtL(Math.round(tN(curBase)*curBonusPct/100)):null}/>
            {!curBonusManualOn&&<div onClick={()=>setCurBonusManualOn(true)} style={{fontSize:11,color:CA,cursor:"pointer",marginTop:-8,marginBottom:12,textAlign:"right",fontFamily:"Outfit,sans-serif"}}>✏ Enter exact amount →</div>}
            {curBonusManualOn&&<MoneyInput label="Exact Bonus Amount" value={curBonusManual}
              onChange={v=>{setCurBonusManual(v);if(tN(curBase)>0&&tN(v)>0)setCurBonusPct(Math.min(100,Math.round(tN(v)/tN(curBase)*100)));if(!v){setCurBonusManualOn(false);}}}
              placeholder="Overrides % if set" hint="Updates slider % automatically" compact accent={CA}/>}
            <ST accent={CA}>Provident Fund</ST>
            <PfSection accent={CA} pfInBase={curPfInBase} onPfInBase={v=>setCurPfInBase(v===true||v==="true")}
              basicAuto={curBasicAuto} onBasicAuto={v=>setCurBasicAuto(v===true||v==="true")}
              basicPct={curBasicPct} onBasicPct={setCurBasicPct} pfCap={curPfCap} onPfCap={()=>setCurPfCap(!curPfCap)}/>
            <ST accent={CA}>RSU / LTI</ST>
            <RsuPanel accent={CA} on={curRsuOn} onToggle={()=>setCurRsuOn(!curRsuOn)}
              mode={curRsuMode} onMode={setCurRsuMode} ltiType={curRsuLti} onLtiType={setCurRsuLti}
              annual={curRsuAnnual} onAnnual={setCurRsuAnnual} grant={curRsuGrant} onGrant={setCurRsuGrant}
              sched={curRsuSched} onSched={setCurRsuSched} yrs={curRsuYrs} onYrs={setCurRsuYrs}
              custom={curRsuCustom} onCustom={setCurRsuCustom} currency={curRsuCur} onCurrency={setCurRsuCur} fx={curRsuFx} onFx={setCurRsuFx}/>
            <ST accent={CA}>Salary Growth</ST>
            <Toggle on={curIncrOn} onToggle={()=>setCurIncrOn(!curIncrOn)} label="Apply YoY increment" accent={CA} size="sm"/>
            {curIncrOn&&<>
              <SliderRow label="Annual increment %" value={curIncrPct} onChange={setCurIncrPct} min={0} max={50} accent={CA}/>
              <div style={{marginBottom:12}}>
                <LB>Increment applies from</LB>
                <Pills opts={[{v:"y1",l:"Year 1 (offer already hiked)"},{v:"y2",l:"Year 2 onwards"}]} val={curIncrFrom} onChange={setCurIncrFrom} accent={CA}/>
                <HT>{curIncrFrom==="y1"?"Your current base already reflects this year's increment.":"Year 1 = current base; increment kicks in from Year 2."}</HT>
              </div>
            </>}
            <TCPreview base={curBase} bonus={prevBonus} rsuY1={prevRsuY1} erPf={prevErPf} pfInBase={curPfInBase} showInhand={showInhand} basicPct={curEffBasic} pfCap={curPfCap}/>
          </div>

          {/* NEW OFFER */}
          <div style={{background:"#ECFDF5",borderRadius:14,padding:16,border:"2px solid #A7F3D0",boxShadow:"0 2px 8px rgba(5,150,105,.07)"}}>
            <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:NA,flexShrink:0}}/>
              <div style={{fontSize:14,fontWeight:800,color:NA,fontFamily:"Sora,sans-serif"}}>New Offer</div>
            </div>
            <ST accent={NA}>Base &amp; Bonus</ST>
            <MoneyInput label="Annual Base Salary" value={newBase} onChange={v=>{onNewBaseManual(v);if(newBonusPct>0&&tN(v)>0)setNewBonusManual(String(Math.round(tN(v)*newBonusPct/100)));}} placeholder={hikeMode?"Type to override or use slider ↑":"e.g. 1500000"} accent={NA}/>
            {hikeMode&&tN(curBase)>0&&<div style={{fontSize:11,color:"#6366F1",marginTop:-10,marginBottom:10,fontFamily:"Outfit,sans-serif"}}>💡 Editing this updates the hike % slider automatically</div>}
            <SliderRow label="Bonus % of Base" value={newBonusPct}
              onChange={v=>{setNewBonusPct(v);if(tN(newBase)>0){setNewBonusManual(String(Math.round(tN(newBase)*v/100)));setNewBonusManualOn(true);}}}
              min={0} max={100} accent={NA}
              amountHint={tN(newBase)>0&&newBonusPct>0?fmtL(Math.round(tN(newBase)*newBonusPct/100)):null}/>
            {!newBonusManualOn&&<div onClick={()=>setNewBonusManualOn(true)} style={{fontSize:11,color:NA,cursor:"pointer",marginTop:-8,marginBottom:12,textAlign:"right",fontFamily:"Outfit,sans-serif"}}>✏ Enter exact amount →</div>}
            {newBonusManualOn&&<MoneyInput label="Exact Bonus Amount" value={newBonusManual}
              onChange={v=>{setNewBonusManual(v);if(tN(newBase)>0&&tN(v)>0)setNewBonusPct(Math.min(100,Math.round(tN(v)/tN(newBase)*100)));if(!v){setNewBonusManualOn(false);}}}
              placeholder="Overrides % if set" hint="Updates slider % automatically" compact accent={NA}/>}
            <ST accent={NA}>Provident Fund</ST>
            <PfSection accent={NA} pfInBase={newPfInBase} onPfInBase={v=>setNewPfInBase(v===true||v==="true")}
              basicAuto={newBasicAuto} onBasicAuto={v=>setNewBasicAuto(v===true||v==="true")}
              basicPct={newBasicPct} onBasicPct={setNewBasicPct} pfCap={newPfCap} onPfCap={()=>setNewPfCap(!newPfCap)}/>
            <ST accent={NA}>One-time Bonuses</ST>
            <MoneyInput label="Joining / Sign-on Bonus" value={newJoining} onChange={setNewJoining} placeholder="Optional — Year 1 only" accent={NA}/>
            <MoneyInput label="Relocation Allowance" value={newRelocation} onChange={setNewRelocation} placeholder="Optional — Year 1 only" hint="One-time. Flagged as exceptional in comparison." compact accent={NA}/>
            {(tN(newJoining)>0||tN(newRelocation)>0)&&(
              <div style={{fontSize:11,color:WA,background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"7px 10px",marginTop:-6,marginBottom:10,lineHeight:1.4}}>
                ⚡ One-time amounts total {fmtL((tN(newJoining)||0)+(tN(newRelocation)||0))} — applies to Year 1 only. Years 2–4 TC will be lower by this amount.
              </div>
            )}
            <ST accent={NA}>Retention Bonus</ST>
            <RetentionSection accent={NA} on={newRetentionOn} onToggle={()=>setNewRetentionOn(!newRetentionOn)} list={newRetentionList} onList={setNewRetentionList}/>
            <ST accent={NA}>RSU / LTI Grant</ST>
            <RsuPanel accent={NA} on={newRsuOn} onToggle={()=>setNewRsuOn(!newRsuOn)}
              mode="detailed" onMode={null} ltiType={newRsuLti} onLtiType={setNewRsuLti}
              annual="" onAnnual={()=>{}} grant={newRsuGrant} onGrant={setNewRsuGrant}
              sched={newRsuSched} onSched={setNewRsuSched} yrs={newRsuYrs} onYrs={setNewRsuYrs}
              custom={newRsuCustom} onCustom={setNewRsuCustom} currency={newRsuCur} onCurrency={setNewRsuCur} fx={newRsuFx} onFx={setNewRsuFx}/>
            <ST accent={NA}>Salary Growth</ST>
            <Toggle on={newIncrOn} onToggle={()=>setNewIncrOn(!newIncrOn)} label="Apply YoY increment" accent={NA} size="sm"/>
            {newIncrOn&&<>
              <SliderRow label="Annual increment %" value={newIncrPct} onChange={setNewIncrPct} min={0} max={50} accent={NA}/>
              <div style={{marginBottom:12}}>
                <LB>Increment applies from</LB>
                <Pills opts={[{v:"y1",l:"Year 1 (offer is after hike)"},{v:"y2",l:"Year 2 onwards"}]} val={newIncrFrom} onChange={v=>!hikeMode&&setNewIncrFrom(v)} accent={NA}/>
                <HT>{newIncrFrom==="y1"?"New offer base already includes this increment.":"Year 1 = offer base; increment applies Year 2+."}</HT>
              </div>
            </>}
            <NewTCPreview
              base={newBase} bonus={tN(newBonusManual)>0?tN(newBonusManual):tN(newBase)*newBonusPct/100}
              rsuY1={newRsuArr[0]} erPf={!newPfInBase?getPf(tN(newBase),newEffBasic,newPfCap):0}
              joining={tN(newJoining)} relocation={tN(newRelocation)}
              retentionY1={newRetentionOn?getRetentionForYear(newRetentionList,1):0}
              pfInBase={newPfInBase} showInhand={showInhand} basicPct={newEffBasic} pfCap={newPfCap}
            />
          </div>

        </div>{/* /grid */}

        {/* RESULTS */}
        {!results&&(
          <div style={{textAlign:"center",padding:"36px 16px",background:"#fff",borderRadius:14,border:"2px dashed #E2E8F0"}}>
            <div style={{fontSize:30,marginBottom:8}}>📊</div>
            <div style={{fontSize:14,fontWeight:600,color:"#64748B"}}>Enter base salary on both sides to unlock the comparison</div>
            <div style={{fontSize:12,color:"#94A3B8",marginTop:4}}>Fill Annual Base Salary fields above</div>
          </div>
        )}

        {results&&(()=>{
          const y1=results.years[0];
          const pos=results.cumDelta>=0;
          return(
            <>
              {/* HERO */}
              <div style={{background:"linear-gradient(135deg,#1e3a8a 0%,#1e40af 50%,#065F46 100%)",borderRadius:16,padding:"20px 20px",boxShadow:"0 8px 32px rgba(30,64,175,.25)",marginBottom:14,color:"#fff"}}>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Year 1 Total Compensation</div>
                <div className="hero-grid" style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:"#93C5FD",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Current</div>
                    <div style={{fontSize:26,fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.6px",lineHeight:1}}>{fmtL(y1.cur.tc)}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:4}}>~{fmtL(calcInHand(y1.cur.base,y1.cur.bonus,curEffBasic,curPfCap).regularMonthly)}<span style={{fontSize:10}}>/mo in-hand</span></div>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <div style={{padding:"8px 14px",borderRadius:20,fontSize:13,fontWeight:900,background:y1.delta>=0?"rgba(52,211,153,.25)":"rgba(248,113,113,.25)",color:y1.delta>=0?"#6EE7B7":"#FCA5A5",fontFamily:"Courier New,monospace",border:`2px solid ${y1.delta>=0?"rgba(52,211,153,.5)":"rgba(248,113,113,.5)"}`,whiteSpace:"nowrap",boxShadow:y1.delta>=0?"0 0 20px rgba(52,211,153,.2)":"0 0 20px rgba(248,113,113,.2)"}}>
                      {y1.delta>=0?"▲ +":"▼ "}{fmtL(Math.abs(y1.delta))}
                    </div>
                    <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:4}}>{y1.delta>=0?"+":""}{Number(y1.deltaPct).toFixed(1)}% vs current</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#6EE7B7",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>New Offer</div>
                    <div style={{fontSize:26,fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.6px",lineHeight:1}}>{fmtL(y1.new.tc)}</div>
                    <div style={{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:4}}>~{fmtL(calcInHand(y1.new.base,y1.new.bonus,newEffBasic,newPfCap).regularMonthly)}<span style={{fontSize:10}}>/mo in-hand</span></div>
                  </div>
                </div>
              </div>

              {/* YEAR ACCORDIONS */}
              <div style={{background:"#fff",borderRadius:14,padding:"16px 14px",boxShadow:"0 2px 10px rgba(0,0,0,.06)",marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3,fontFamily:"Outfit,sans-serif"}}>Year-by-Year Layered Comparison</div>
                <div style={{fontSize:11,color:"#94A3B8",marginBottom:10,fontFamily:"Outfit,sans-serif"}}>Each layer builds on the previous — tap a year to expand</div>
                <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
                  {[{c:WA,l:"⚡ One-time"},{c:"#D97706",l:"🔁 Retention"},{c:"#8B5CF6",l:"RSU/LTI"},{c:PU,l:"ALL-IN"}].map(x=>(
                    <span key={x.l} style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,color:"#64748B",fontFamily:"Outfit,sans-serif"}}>
                      <span style={{width:7,height:7,borderRadius:1,background:x.c,display:"inline-block",flexShrink:0}}/>{x.l}
                    </span>
                  ))}
                </div>
                {results.years.map(y=>(
                  <YearAccordion key={y.year} yd={y} showPf={false} hasJoining={hasJoining}
                    hasRelocation={hasRelocation} hasRsu={hasRsu} hasRetention={hasRetention}
                    ltiNote={ltiNote} joiningAmt={tN(newJoining)} relocationAmt={tN(newRelocation)}
                    retentionAmt={y.new.retention} expanded={expandYear===y.year}
                    onToggle={()=>setExpandYear(expandYear===y.year?null:y.year)} showInhand={showInhand}/>
                ))}
              </div>

              {/* VERDICT (replaces cumulative + breakeven) */}
              {(()=>{
                const be=results.breakEvenYear;
                const cumPos=results.cumDelta>=0;
                const[bg,bdrGrad,icon,tc,bc,title,body]=!be
                  ?["linear-gradient(135deg,#FFF7ED,#FEF3C7)","linear-gradient(135deg,#F97316,#F59E0B)","⚠️","#C2410C","#78350F",
                    "Current package stays ahead all 4 years",
                    `New offer never surpasses current in cumulative TC over 4 years. 4-yr gap: ${fmtL(Math.abs(results.cumDelta))} in favour of current. Consider negotiating base, joining bonus, or RSU grant.`]
                  :be===1
                  ?["linear-gradient(135deg,#F0FDF4,#DCFCE7)","linear-gradient(135deg,#10B981,#34D399)","🚀","#065F46","#166534",
                    "New offer is better from Day 1!",
                    `You gain ${fmtL(Math.abs(results.cumDelta))} more over 4 years. The switch makes clear financial sense — financially you're ahead from the very first year.`]
                  :["linear-gradient(135deg,#FFFBEB,#FEF3C7)","linear-gradient(135deg,#F59E0B,#FCD34D)","📅","#92400E","#78350F",
                    `New offer breaks even from Year ${be}`,
                    `Slight dip in Year${be>2?"s":""} 1${be>2?"–"+(be-1):""}. 4-year net: ${fmtL(Math.abs(results.cumDelta))} ${cumPos?"ahead — worth the switch":"behind — negotiate harder"}.`];
                return(
                  <div style={{background:bg,border:"2px solid transparent",backgroundClip:"padding-box",borderRadius:16,padding:0,marginBottom:14,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",inset:0,background:bdrGrad,zIndex:0,borderRadius:16}}/>
                    <div style={{position:"relative",zIndex:1,background:bg,margin:"2px",borderRadius:14,padding:"18px 20px"}}>
                      <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                        <span style={{fontSize:32,flexShrink:0,lineHeight:1}}>{icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:900,color:tc,fontFamily:"Sora,sans-serif",marginBottom:6,fontSize:18,letterSpacing:"-0.4px",lineHeight:1.2}}>{title}</div>
                          <div style={{fontSize:13,color:bc,lineHeight:1.6}}>{body}</div>
                          <div style={{marginTop:12,display:"flex",gap:8,flexWrap:"wrap"}}>
                            <div style={{padding:"6px 14px",borderRadius:10,background:"rgba(255,255,255,.7)",border:"1px solid rgba(0,0,0,.08)"}}>
                              <div style={{fontSize:10,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>4-Year Net</div>
                              <div style={{fontSize:16,fontWeight:800,color:cumPos?NA:"#DC2626",fontFamily:"Courier New,monospace"}}>{cumPos?"+":"-"}{fmtL(Math.abs(results.cumDelta))}</div>
                            </div>
                            <div style={{padding:"6px 14px",borderRadius:10,background:"rgba(255,255,255,.7)",border:"1px solid rgba(0,0,0,.08)"}}>
                              <div style={{fontSize:10,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Avg/Year Diff</div>
                              <div style={{fontSize:16,fontWeight:800,color:cumPos?NA:"#DC2626",fontFamily:"Courier New,monospace"}}>{cumPos?"+":"-"}{fmtL(Math.abs(results.cumDelta/4))}</div>
                            </div>
                            <div style={{padding:"6px 14px",borderRadius:10,background:"rgba(255,255,255,.7)",border:"1px solid rgba(0,0,0,.08)"}}>
                              <div style={{fontSize:10,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Monthly Delta (Y1)</div>
                              <div style={{fontSize:16,fontWeight:800,color:results.years[0].delta>=0?NA:"#DC2626",fontFamily:"Courier New,monospace"}}>{results.years[0].delta>=0?"+":"-"}{fmtL(Math.abs(results.years[0].delta/12))}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* INCREMENT */}
              {(curIncrOn||newIncrOn)&&(
                <div style={{background:"#fff",borderRadius:14,padding:"14px",boxShadow:"0 2px 10px rgba(0,0,0,.06)",marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10,fontFamily:"Outfit,sans-serif"}}>Increment Impact — Year 4 Projection</div>
                  <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                    {curIncrOn&&<div style={{padding:12,borderRadius:10,background:"#EFF6FF",border:"1px solid #BFDBFE"}}><div style={{fontSize:10,fontWeight:700,color:CA,fontFamily:"Outfit,sans-serif",marginBottom:2}}>Current · {curIncrPct}% p.a.</div><div style={{fontSize:16,fontWeight:800,color:"#1E293B",fontFamily:"Sora,sans-serif"}}>{fmtL(results.years[3].cur.tc)}</div><div style={{fontSize:11,color:"#64748B",marginTop:1}}>from {fmtL(tN(curBase))} today</div></div>}
                    {newIncrOn&&<div style={{padding:12,borderRadius:10,background:"#ECFDF5",border:"1px solid #A7F3D0"}}><div style={{fontSize:10,fontWeight:700,color:NA,fontFamily:"Outfit,sans-serif",marginBottom:2}}>New · {newIncrPct}% p.a.</div><div style={{fontSize:16,fontWeight:800,color:"#1E293B",fontFamily:"Sora,sans-serif"}}>{fmtL(results.years[3].new.tc)}</div><div style={{fontSize:11,color:"#64748B",marginTop:1}}>from {fmtL(tN(newBase))} today</div></div>}
                  </div>
                </div>
              )}

              {/* IN-HAND — salary-calc style breakdown */}
              {(()=>{
                const curIH=calcInHand(y1.cur.base,y1.cur.bonus,curEffBasic,curPfCap);
                const newIH=calcInHand(y1.new.base,y1.new.bonus,newEffBasic,newPfCap);
                const gain=newIH.inHand-curIH.inHand;
                const sides=[
                  {label:"Current",d:curIH,color:CA,grad:"linear-gradient(135deg,#1D4ED8,#3B82F6)"},
                  {label:"New Offer",d:newIH,color:NA,grad:"linear-gradient(135deg,#059669,#34D399)"},
                ];
                return(
                  <div style={{borderRadius:16,overflow:"hidden",marginBottom:14,boxShadow:"0 4px 24px rgba(99,102,241,.12)"}}>
                    <div style={{background:"linear-gradient(135deg,#4F46E5,#7C3AED)",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:800,color:"#fff",fontFamily:"Sora,sans-serif"}}>💰 In-Hand Breakdown (Year 1)</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:2}}>New Tax Regime · Std deduction ₹75,000 · EE PF deducted · ER PF excluded (employer cost)</div>
                      </div>
                      <Link to="/new-regime-salary-calculator" style={{display:"inline-flex",alignItems:"center",gap:4,padding:"6px 14px",borderRadius:10,background:"rgba(255,255,255,.15)",color:"#E0E7FF",fontSize:12,fontWeight:700,textDecoration:"none",border:"1px solid rgba(255,255,255,.2)"}}>
                        Full Calculator →
                      </Link>
                    </div>
                    <div style={{background:"#fff",padding:"16px 18px"}}>
                      <div className="two-col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                        {sides.map(s=>(
                          <div key={s.label} style={{borderRadius:12,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}>
                            <div style={{background:s.grad,padding:"9px 14px"}}>
                              <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.8)",textTransform:"uppercase",letterSpacing:"0.06em"}}>{s.label}</div>
                              <div style={{fontSize:22,fontWeight:900,color:"#fff",fontFamily:"Sora,sans-serif",letterSpacing:"-0.4px",marginTop:2}}>{fmtL(s.d.inHand/12)}<span style={{fontSize:11,fontWeight:400,opacity:.8}}>/mo</span></div>
                            </div>
                            <div style={{padding:"10px 14px",background:`${s.color}06`}}>
                              {[
                                ["Annual Gross",    s.d.gross,   "#334155"],
                                ["− EE PF",        -s.d.eeA,    "#1D4ED8"],
                                ["− Income Tax",   -s.d.taxA,   "#DC2626"],
                                ["= Annual In-Hand",s.d.inHand, s.color],
                              ].map(([l,v,c])=>(
                                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:l.startsWith("=")?`2px solid ${s.color}30`:"1px solid #F1F5F9"}}>
                                  <span style={{fontSize:11,color:l.startsWith("=")?s.color:"#64748B",fontWeight:l.startsWith("=")?700:400,fontFamily:"Outfit,sans-serif"}}>{l}</span>
                                  <span style={{fontSize:12,fontWeight:l.startsWith("=")?800:600,color:c,fontFamily:"Courier New,monospace"}}>{fmtL(Math.abs(v))}</span>
                                </div>
                              ))}
                              <div style={{marginTop:8,padding:"8px 10px",background:`${s.color}0D`,borderRadius:8,border:`1px solid ${s.color}30`}}>
                                <div style={{fontSize:10,fontWeight:700,color:s.color,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Monthly Take-home</div>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:s.d.bonusMonthNet!==s.d.regularMonthly?4:0}}>
                                  <span style={{fontSize:11,color:"#64748B",fontFamily:"Outfit,sans-serif"}}>{s.d.bonusMonthNet!==s.d.regularMonthly?"Regular months (11)":"Monthly (all 12)"}</span>
                                  <span style={{fontSize:14,fontWeight:800,color:s.color,fontFamily:"Courier New,monospace"}}>{fmtL(s.d.regularMonthly)}</span>
                                </div>
                                {s.d.bonusMonthNet!==s.d.regularMonthly&&(
                                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                                    <span style={{fontSize:11,color:"#64748B",fontFamily:"Outfit,sans-serif"}}>Bonus month <span style={{fontSize:10,color:"#94A3B8"}}>(incl. bonus − extra TDS)</span></span>
                                    <span style={{fontSize:14,fontWeight:800,color:s.color,fontFamily:"Courier New,monospace"}}>{fmtL(s.d.bonusMonthNet)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{background:"linear-gradient(135deg,#EDE9FE,#F0F9FF)",borderRadius:10,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                        <div>
                          <div style={{fontSize:10,color:"#6366F1",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>Regular month gain</div>
                          <div style={{fontSize:22,fontWeight:900,color:(newIH.regularMonthly-curIH.regularMonthly)>=0?NA:"#DC2626",fontFamily:"Courier New,monospace"}}>{(newIH.regularMonthly-curIH.regularMonthly)>=0?"+":"-"}{fmtL(Math.abs(newIH.regularMonthly-curIH.regularMonthly))}</div>
                          <div style={{fontSize:11,color:"#64748B",marginTop:2}}>Annual in-hand: {gain>=0?"+":"-"}{fmtL(Math.abs(gain))}</div>
                        </div>
                        <div style={{fontSize:10,color:"#94A3B8",maxWidth:220,textAlign:"right",lineHeight:1.5}}>
                          ⚠ Monthly shows base-only TDS (regular months).<br/>Bonus month shown separately above.<br/>Excludes HRA, PT, NPS &amp; perks.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </>
          );
        })()}
      </div>

      <style>{`
        *{box-sizing:border-box;}
        @media(max-width:640px){
          .offer-grid{grid-template-columns:1fr!important;}
          .hero-grid{grid-template-columns:1fr!important;gap:8px!important;}
          .hero-grid>div:nth-child(2){order:-1;}
          .two-col{grid-template-columns:1fr 1fr!important;}
        }
        @media(max-width:380px){
          .two-col{grid-template-columns:1fr!important;}
        }
        input[type=range]{height:4px;border-radius:2px;}
        input[type=range]::-webkit-slider-thumb{width:16px;height:16px;}
        table td,table th{word-break:break-word;}
        select{-webkit-appearance:auto;}
      `}</style>
    </div>
  );
}
