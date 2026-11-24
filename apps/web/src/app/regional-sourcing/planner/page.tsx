'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {COUNTRIES,type Country} from '@/lib/regional/model';
import {demoScenario,planBOM,validateScenario,type PlanScenario,type PlanResult,type PlanVariant} from '@/lib/regional/planner';

type BomSummary={id:string;name:string;revision:number};
type Directory={workspaceId:string;boms:BomSummary[]};
const labels:Record<Country,string>={NG:'Nigeria',US:'United States',GB:'United Kingdom',DE:'Germany',ZA:'South Africa',CN:'China'};
const field={width:'100%',maxWidth:420,padding:10,borderRadius:6,background:'transparent',color:'inherit',border:'1px solid var(--border, #aaa)'};
function amount(value:string|undefined,currency:string){if(value===undefined)return 'Unavailable';const n=BigInt(value);return currency+' '+(n/BigInt(100)).toLocaleString()+'.'+(n%BigInt(100)).toString().padStart(2,'0');}
function csvCell(value:unknown){let str=value==null?'':String(value);if(/^[\s\uFEFF]*[=+@-]/.test(str))str="'"+str;return '"'+str.replaceAll('"','""')+'"';}
function downloadCSV(result:PlanResult){
 const rows:unknown[][]=[['plan','method','line','mpn','supplier','quantity','cost_minor','currency','evidence']];
 for(const variant of result.scenarios){
   for(const a of variant.allocations)rows.push([variant.mode,variant.method,a.lineId,a.mpn,a.supplier,a.quantity,a.costMinor,result.currency,a.evidence]);
   for(const u of variant.uncovered)rows.push([variant.mode,variant.method,u.lineId,u.mpn,'UNAVAILABLE',u.quantity,'',result.currency,u.reason]);
 }
 const csv=rows.map(x=>x.map(csvCell).join(',')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='nexus-phase3-advisory-plan.csv';link.click();
 URL.revokeObjectURL(url);
}
function methodLabel(method:PlanVariant['method']){return method==='exact'?'Exact bounded search':'Heuristic estimate — not guaranteed cheapest';}
export default function ProcurementPlanner(){
 const [scenario,setScenario]=useState<PlanScenario>(()=>demoScenario(false));
 const [draft,setDraft]=useState('');
 const [result,setResult]=useState<PlanResult|null>(null);
 const [directory,setDirectory]=useState<Directory|null>(null);
 const [selectedBom,setSelectedBom]=useState('');
 const [country,setCountry]=useState<Country>('NG');
 const [buildQty,setBuildQty]=useState(1);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;fetch('/api/regional-sourcing',{cache:'no-store'}).then(async r=>r.ok?await r.json():null).then(data=>{if(alive&&data?.boms)setDirectory(data);}).catch(()=>{});return()=>{alive=false;};},[]);
 const missing=useMemo(()=>result?.scenarios.find(x=>x.mode==='all')?.uncovered||[],[result]);
 function calculate(raw:PlanScenario){
   try{const checked=validateScenario(raw);setScenario(checked);setResult(planBOM(checked));setError('');setNotice('Calculations are advisory. Verify supplier quotes, shipping, taxes, FX and component compatibility before purchasing.');}
   catch(e){setError(e instanceof Error?e.message:'Invalid procurement scenario');}
 }
 async function loadSaved(){
   const b=directory?.boms.find(x=>x.id===selectedBom);if(!b||!directory)return;
   setBusy(true);setError('');setNotice('');
   try{
     const query=new URLSearchParams({workspaceId:directory.workspaceId,bomId:b.id,revision:String(b.revision),country,buildQty:String(buildQty)});
     const r=await fetch('/api/regional-sourcing/plan?'+query.toString(),{cache:'no-store',signal:AbortSignal.timeout(15000)});
     const payload=await r.json();if(!r.ok)throw Error(payload.error||'Saved quotations unavailable');
     const data=validateScenario(payload.scenario as PlanScenario);
     setScenario(data);setResult(planBOM(data));setDraft('');
     setNotice(payload.note+(payload.ignoredQuotes?' '+payload.ignoredQuotes+' saved records were excluded.':''));
   }catch(e){setError(e instanceof Error?e.message:'Cannot load saved quotations');}
   finally{setBusy(false);}
 }
 return <main id="main-content" className="wrap">
  <header className="pagehead">
   <div className="eyebrow">NEXUS / PROCUREMENT INTELLIGENCE / PHASE 3</div>
   <h1>Whole-BOM sourcing planner</h1>
   <p>Compare local, international and mixed purchasing strategies, including supplier-level fixed costs, quantity breaks, minimum orders and stock limits. Sample scenarios are synthetic and never represent live supplier offers.</p>
   <Link className="btn btn-secondary" href="/regional-sourcing">Back to Regional Sourcing</Link>
  </header>
  <section className="result-section">
   <h2>1. Choose procurement evidence</h2>
   <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
    <button className="btn btn-primary" onClick={()=>{setDraft('');calculate(demoScenario(false));}}>Run 5-line demo</button>
    <button className="btn btn-secondary" onClick={()=>{setDraft('');calculate(demoScenario(true));}}>Run 50-line stress demo</button>
    <button className="btn btn-secondary" onClick={()=>setDraft(JSON.stringify(scenario,null,2))}>Edit scenario JSON</button>
   </div>
   {draft!==''&&<div style={{marginTop:16}}>
    <label className="field">Edit your scenario (max 150 KB)<textarea aria-label="Procurement scenario JSON" style={{...field,maxWidth:'100%',fontFamily:'monospace',minHeight:260}} value={draft} onChange={e=>setDraft(e.target.value)} />
    </label><button className="btn btn-primary" onClick={()=>{try{if(new TextEncoder().encode(draft).length>150000)throw Error('Scenario exceeds 150 KB');calculate(JSON.parse(draft) as PlanScenario);}catch(e){setError(e instanceof Error?e.message:'Invalid JSON');}}}>Validate and calculate</button>
   </div>}
   <div style={{marginTop:20}}>
    <h3>Or use quotations saved in your workspace</h3>
    <p>Only valid quotations for the exact BOM line quantity and selected country are eligible. No automated price or shipping estimates are substituted for missing values.</p>
    {!directory?<p className="note">Sign in and save quotations in <Link href="/regional-sourcing">Regional Sourcing</Link> to load your own BOM here. The public synthetic demo works without signing in.</p>:<>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,180px),1fr))',gap:12}}>
       <label className="field">Saved BOM<select style={field} value={selectedBom} onChange={e=>setSelectedBom(e.target.value)}><option value="">Select BOM</option>{directory.boms.map(b=><option key={b.id} value={b.id}>{b.name} · revision {b.revision}</option>)}</select></label>
       <label className="field">Destination<select style={field} value={country} onChange={e=>setCountry(e.target.value as Country)}>{COUNTRIES.map(c=><option key={c} value={c}>{labels[c]}</option>)}</select></label>
       <label className="field">Production multiplier<input style={field} type="number" min={1} max={200} value={buildQty} onChange={e=>setBuildQty(Number(e.target.value))}/></label>
      </div>
      <button className="btn btn-primary" disabled={busy||!selectedBom||!Number.isSafeInteger(buildQty)||buildQty<1||buildQty>200} onClick={()=>void loadSaved()}>{busy?'Loading…':'Optimise saved quotations'}</button>
    </>}
   </div>
  </section>
  {error&&<p className="note error" role="alert">{error}</p>}
  {notice&&<p className="note" role="status">{notice}</p>}
  <section className="result-section">
   <h2>2. Optimisation report</h2>
   <p><strong>{scenario.label}</strong> · {scenario.lines.length} BOM lines · {scenario.offers.length} source offers · {scenario.suppliers.length} suppliers · {scenario.country} / {scenario.currency}</p>
   {!result?<button className="btn btn-primary" onClick={()=>calculate(scenario)}>Calculate demo</button>:<>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,210px),1fr))',gap:12}}>
      {result.scenarios.map(v=><article key={v.mode} className="note">
       <h3>{v.mode==='all'?'Mixed / unrestricted':v.mode==='local'?'Local suppliers only':'International only'}</h3>
       <p><strong>{v.complete?amount(v.totalMinor!,result.currency):'Coverage incomplete'}</strong></p>
       <p>{v.complete?'All lines covered':'Partial subtotal '+amount(v.pricedMinor,result.currency)}</p>
       <p>{methodLabel(v.method)}</p>
       <p>Suppliers used: {v.activeSuppliers.length} · Fixed costs: {amount(v.setupMinor,result.currency)}</p>
       {result.recommended===v.mode&&<p><strong>Lowest complete option among calculated scenarios</strong></p>}
      </article>)}
    </div>
    <p className="note">An exact result is optimal only within the entered quotes, costs and constraints. Large cases use a transparent heuristic. Neither constitutes a supplier-confirmed purchasing commitment. Prices may be hypothetical.</p>
    <button className="btn btn-secondary" onClick={()=>downloadCSV(result)}>Export evidence-labelled CSV</button>
    {result.scenarios.map(v=><details key={v.mode} style={{marginTop:14}}>
      <summary><strong>{v.mode} allocations</strong> · {v.allocations.length} entries · {v.uncovered.length} unfilled lines</summary>
      <div style={{overflowX:'auto'}}>
       <table style={{width:'100%',borderCollapse:'collapse'}}>
        <thead><tr><th align="left">Part</th><th align="left">Supplier</th><th align="right">Qty</th><th align="right">Line cost</th><th align="left">Evidence</th></tr></thead>
        <tbody>{v.allocations.map((a,i)=><tr key={a.offerId+'-'+i}><td>{a.mpn}</td><td>{a.supplier}</td><td align="right">{a.quantity}</td><td align="right">{amount(a.costMinor,result.currency)}</td><td>{a.evidence.replaceAll('_',' ')}</td></tr>)}</tbody>
       </table>
      </div>
      {v.uncovered.map(x=><p key={x.lineId} className="note">{x.mpn} · {x.quantity} unfilled: {x.reason}</p>)}
    </details>)}
   </>}
  </section>
  <section className="result-section">
   <h2>3. Missing evidence &amp; SmartCrawl fallback</h2>
   {!result?<p>Run an optimisation to identify supplier-data gaps.</p>:missing.length===0?<p>All BOM lines have an indicative sourcing allocation in the mixed scenario. Review evidence labels before treating them as commercial quotes.</p>:<>
    <p>{missing.length} BOM lines cannot be fully sourced from the currently supplied evidence. Research should target only these gaps.</p>
    <ul>{missing.slice(0,15).map(x=><li key={x.lineId}><strong>{x.mpn}</strong> — {x.reason}</li>)}</ul>
    <p>Use <Link href="/regional-sourcing">Regional Sourcing</Link> to record a quote or research an exact supplier product page with SmartCrawl, where the source and egress access have been authorised. LLM candidates remain unranked until manually verified.</p>
   </>}
   <p className="note">A proof of concept still respects supplier access restrictions. There are no background crawls, purchases or unverified substitute-component approvals in this planner.</p>
  </section>
 </main>;
}
