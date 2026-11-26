'use client';
import Link from 'next/link';
import DatasheetWorkbench from '@/components/regional/DatasheetWorkbench';
import ResearchQueue from '@/components/regional/ResearchQueue';
import ScheduleManager from '@/components/regional/ScheduleManager';
import AgentWorkbench from '@/components/regional/AgentWorkbench';
import {useEffect,useState} from 'react';
import {COUNTRIES,type Country} from '@/lib/regional/model';
import {syntheticEvidence,findings,groundedAnswer,coverage,extractDatasheetText,type EvidenceSnapshot,type Finding,type CopilotAnswer,type DatasheetCandidate} from '@/lib/regional/intelligence';
type Directory={workspaceId:string;role:string;suppliers:{id:string;name:string;origin:string;researchEnabled:boolean}[];boms:{id:string;name:string;revision:number}[]};
const countryNames:Record<Country,string>={NG:'Nigeria',US:'United States',GB:'United Kingdom',DE:'Germany',ZA:'South Africa',CN:'China'};
const style={width:'100%',padding:'9px 10px',background:'transparent',color:'inherit',border:'1px solid var(--border, #aaa)',borderRadius:6};
function cell(v:unknown){let text=v==null?'':String(v);if(/^[\s\uFEFF]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
function download(snapshot:EvidenceSnapshot){
 const rows:unknown[][]=[['citation','BOM line','MPN','source type','status','supplier','unit price reported','currency','landed minor units','observed at','expires at','source URL','provenance','evidence excerpt']];
 for(const r of snapshot.records)rows.push([r.id,r.lineId,r.mpn,r.kind,r.status,r.supplier,r.unitPrice,r.currency,r.landedMinor,r.observedAt,r.expiresAt,r.sourceUrl,r.provenance,r.content]);
 const data=rows.map(x=>x.map(cell).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='nexus-procurement-evidence.csv';a.click();URL.revokeObjectURL(url);
}
const sampleDatasheet='SYNTHETIC DATASHEET EXCERPT — NOT A MANUFACTURER SPECIFICATION\nOperating voltage: 3.0 to 3.6 V\nOperating temperature: -40 to +85 C\nPackage: QFN-32\nPin count: 32\nAbsolute maximum supply voltage: 4.0 V';
export default function Intelligence(){
 const [snapshot,setSnapshot]=useState<EvidenceSnapshot|null>(null),[notes,setNotes]=useState<Finding[]>([]);
 const [dir,setDir]=useState<Directory|null>(null),[bomId,setBomId]=useState(''),[destination,setDestination]=useState<Country>('NG');
 const [question,setQuestion]=useState('What are the biggest procurement risks?'),[response,setResponse]=useState<CopilotAnswer|null>(null);
 const [consent,setConsent]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [datasheet,setDatasheet]=useState(''),[specs,setSpecs]=useState<DatasheetCandidate[]>([]);
 const [activeSelection,setActiveSelection]=useState<{workspaceId:string;bomId:string;revision:number;country:Country}|null>(null);
 useEffect(()=>{const demo=syntheticEvidence();setSnapshot(demo);setNotes(findings(demo));fetch('/api/regional-sourcing',{cache:'no-store'}).then(async res=>res.ok?res.json():null).then(d=>{if(d?.boms)setDir(d);}).catch(()=>{});},[]);
 const selected=dir?.boms.find(x=>x.id===bomId);
 const cov=snapshot?coverage(snapshot):null;
 function resetDemo(){const demo=syntheticEvidence();setSnapshot(demo);setNotes(findings(demo));setResponse(null);setActiveSelection(null);setError('');setMessage('Synthetic evidence loaded: no real supplier offers or datasheets are implied.');}
 async function loadSaved(){if(!dir||!selected)return;setLoading(true);setError('');setMessage('');
  try{const query=new URLSearchParams({workspaceId:dir.workspaceId,bomId:selected.id,revision:String(selected.revision),country:destination});
   const res=await fetch('/api/regional-sourcing/evidence?'+query,{cache:'no-store',signal:AbortSignal.timeout(15000)});
   const data=await res.json();if(!res.ok)throw Error(data.error||'Evidence unavailable');
   setSnapshot(data.snapshot);setNotes(data.findings);setResponse(null);setActiveSelection({workspaceId:dir.workspaceId,bomId:selected.id,revision:selected.revision,country:destination});setMessage('Loaded saved workspace evidence. Candidate observations remain unverified.');
  }catch(e){setError(e instanceof Error?e.message:'Unable to read evidence');}finally{setLoading(false);}
 }
 async function ask(){if(!snapshot||!question.trim())return;setLoading(true);setError('');setResponse(null);
  try{if(snapshot.demo){setResponse(groundedAnswer(snapshot,question));}
   else{if(!dir||!selected)throw Error('Select a saved BOM');
    const body={action:'ask',workspaceId:dir.workspaceId,bomId:selected.id,revision:selected.revision,country:destination,question,allowModel:consent};
    const res=await fetch('/api/regional-sourcing/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});
    const data=await res.json();if(!res.ok)throw Error(data.error||'Copilot unavailable');setResponse(data.answer);
   }
  }catch(e){setError(e instanceof Error?e.message:'Unable to answer');}finally{setLoading(false);}
 }
 function parseSpecs(){try{setSpecs(extractDatasheetText(datasheet));setError('');if(!datasheet.trim())setMessage('Paste a text excerpt to find candidate specifications.');else setMessage('Text-only extraction completed; verify every property against the original document.');}catch(e){setError(e instanceof Error?e.message:'Invalid text');}}
 return <main id="main-content" className="wrap">
  <header className="pagehead"><div className="eyebrow">NEXUS / EVIDENCE INTELLIGENCE / PHASE 4</div>
   <h1>Procurement Evidence &amp; Copilot</h1><p>Understand where every sourcing observation came from. Compare customer quotes with SmartCrawl research and distributor-worker references without confusing candidates with verified offers.</p>
   <p><Link className="btn btn-secondary" href="/regional-sourcing">Regional Sourcing</Link> <Link className="btn btn-secondary" href="/regional-sourcing/planner">Whole-BOM Planner</Link></p>
  </header>
  {error&&<p className="note error" role="alert">{error}</p>}{message&&<p className="note" role="status">{message}</p>}
  <section className="result-section"><h2>1. Select evidence source</h2>
   <p>The public demo uses fictional suppliers and synthetic observations. Private evidence requires an authorised workspace.</p>
   <button className="btn btn-secondary" onClick={resetDemo}>Load synthetic demo</button>
   {dir?<div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,200px),1fr))',gap:12}}>
    <label className="field">Your BOM<select value={bomId} style={style} onChange={e=>{setBomId(e.target.value);setResponse(null);}}><option value="">Choose a saved BOM</option>{dir.boms.map(b=><option key={b.id} value={b.id}>{b.name} (rev {b.revision})</option>)}</select></label>
    <label className="field">Delivery country<select value={destination} style={style} onChange={e=>{setDestination(e.target.value as Country);setResponse(null);}}>{COUNTRIES.map(c=><option key={c} value={c}>{countryNames[c]}</option>)}</select></label>
    <div style={{display:'flex',alignItems:'end'}}><button className="btn btn-primary" disabled={!selected||loading} onClick={()=>void loadSaved()}>{loading?'Loading…':'Load saved evidence'}</button></div>
   </div>:<p className="note">Sign in and save a BOM to use real workspace records. The demo is available without credentials.</p>}
  </section>
  {snapshot&&cov&&<>
   <section className="result-section"><h2>2. Evidence coverage</h2>
    <p><strong>{snapshot.label}</strong> · revision {snapshot.revision} · {snapshot.country} / {snapshot.currency} · {snapshot.demo?'SYNTHETIC DEMO':'Workspace records'}</p>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,160px),1fr))',gap:12}}>
     <article className="note"><h3>{cov.total}</h3><p>BOM lines</p></article>
     <article className="note"><h3>{cov.priced}</h3><p>Complete customer-reported quotes</p></article>
     <article className="note"><h3>{cov.unpriced}</h3><p>Lines without complete quotes</p></article>
     <article className="note"><h3>{cov.researchCandidates}</h3><p>SmartCrawl review candidates</p></article>
    </div>
    <div style={{height:13,borderRadius:6,overflow:'hidden',background:'var(--border, #888)'}} role="progressbar" aria-valuenow={cov.priced} aria-valuemin={0} aria-valuemax={cov.total} aria-label="Complete customer quotation coverage"><div style={{width:String(cov.priced/cov.total*100)+'%',height:'100%',background:'#23947a'}}/></div>
    <p>Quotation coverage is not proof of confirmed orders, genuine components, real-time stock or delivery eligibility.</p>
    <button className="btn btn-secondary btn-sm" onClick={()=>download(snapshot)}>Export evidence and citations CSV</button>
   </section>
   <section className="result-section"><h2>3. Traceable source records</h2>
    {!snapshot.records.length?<p>No stored observations for this BOM and destination yet.</p>:<div style={{display:'grid',gap:12}}>
     {snapshot.records.map(r=><article key={r.id} className="note">
      <p><strong>[{r.id}] {r.mpn}</strong> · {r.supplier}</p>
      <p><strong>{r.kind.replaceAll('_',' ')}</strong> · {r.status.replaceAll('_',' ')}</p>
      {r.unitPrice&&<p>Reported unit price: {r.currency} {r.unitPrice} {r.landedMinor&&' · indicative complete quotation cost (minor units): '+r.landedMinor}</p>}
      <p>{r.content}</p>
      <small>{r.provenance} · Observed: {r.observedAt?new Date(r.observedAt).toLocaleString():'unknown'}{r.expiresAt?' · Expiry: '+new Date(r.expiresAt).toLocaleString():''}</small>
      {r.sourceUrl&&<p><a href={r.sourceUrl} rel="noopener noreferrer" target="_blank">Review original source ↗</a></p>}
      <p><small>Requires engineering or commercial review before purchasing.</small></p>
     </article>)}
    </div>}
   </section>
   <section className="result-section"><h2>4. Grounded procurement copilot</h2>
    <p>Questions are answered from the displayed evidence. The optional LLM can prioritise existing action items but cannot introduce new facts, prices, citations or component substitutions.</p>
    <label className="field">Your question<input style={style} value={question} maxLength={500} onChange={e=>setQuestion(e.target.value)}/></label>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
     {['What are the biggest procurement risks?','Which parts are missing confirmed costs?','What supplier research should I review?','Can I substitute these components?'].map(q=><button type="button" key={q} className="btn btn-secondary btn-sm" onClick={()=>setQuestion(q)}>{q}</button>)}
    </div>
    {!snapshot.demo&&<p><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Permit optional Groq prioritisation of grounded action titles (if enabled by the operator). No raw documents or BOM are sent.</label></p>}
    <button className="btn btn-primary" style={{marginTop:12}} disabled={loading||!question.trim()} onClick={()=>void ask()}>{loading?'Analysing…':'Ask procurement copilot'}</button>
    {response&&<article className="note" style={{marginTop:18}}><h3>{response.mode==='model_prioritized'?'LLM-prioritised, grounded response':'Deterministic grounded response'}</h3>
      <p>{response.summary}</p>{response.findings.map(f=><div key={f.id} style={{marginTop:14}}><strong>{f.title}</strong><p>{f.detail}</p><small>{f.citations.length?'Supporting records: '+f.citations.map(c=>'['+c+']').join(', '):'No supporting quotation available — evidence gap'}</small></div>)}
      <p>{response.disclaimer}</p></article>}
   </section>
   <section className="result-section"><h2>5. Datasheet text extraction</h2>
    <p>Paste a short, lawfully obtained manufacturer datasheet excerpt to extract candidate operating voltage, temperature, package and pin count. This parser does not fetch PDFs, verify document authenticity or approve substitute components.</p>
    <button className="btn btn-secondary btn-sm" onClick={()=>{setDatasheet(sampleDatasheet);setSpecs([]);}}>Load synthetic excerpt</button>
    <label className="field">Datasheet excerpt<textarea style={{...style,minHeight:160,fontFamily:'monospace'}} value={datasheet} onChange={e=>{setDatasheet(e.target.value);setSpecs([]);}} maxLength={12000} placeholder="Operating voltage: 3.0 to 3.6 V"/></label>
    <button className="btn btn-primary" onClick={parseSpecs}>Extract review candidates</button>
    {specs.length>0?<div className="note" style={{marginTop:14}}>{specs.map(c=><p key={c.property}><strong>{c.property.replaceAll('_',' ')}:</strong> {c.value} · source line {c.line}<br/><small>Excerpt: {c.excerpt} · NOT verified</small></p>)}</div>:<p className="note">No extracted specifications yet. Unsupported formats and ambiguous text should remain unclassified.</p>}
   </section>
   <AgentWorkbench selection={activeSelection} snapshot={snapshot} canWrite={dir?.role!=='viewer'}/>
   <DatasheetWorkbench selection={activeSelection&&snapshot.demo===false?{workspaceId:activeSelection.workspaceId,bomId:activeSelection.bomId,revision:activeSelection.revision}:null} lines={snapshot.lines} canWrite={dir?.role!=='viewer'}/>
   {activeSelection&&dir?.role!=='viewer'&&snapshot.demo===false&&<ResearchQueue key={activeSelection.bomId+':'+activeSelection.revision+':'+activeSelection.country} selection={activeSelection} lines={snapshot.lines} suppliers={dir?.suppliers||[]} snapshot={snapshot}/>}
   {activeSelection&&dir?.role!=='viewer'&&snapshot.demo===false&&<ScheduleManager key={'schedule:'+activeSelection.bomId+':'+activeSelection.revision+':'+activeSelection.country} selection={activeSelection} lines={snapshot.lines} suppliers={dir?.suppliers||[]} snapshot={snapshot}/>} 
   <section className="result-section"><h2>6. Next action: fill evidence gaps</h2>
     {notes.filter(n=>n.kind==='missing_quote').slice(0,10).map(n=><p key={n.id}><strong>{n.title}</strong> — {n.detail}</p>)}
     <p>Missing parts can be researched in <Link href="/regional-sourcing">Regional Sourcing</Link> using a permitted SmartCrawl product URL, or a quotation can be entered manually. Research is never automatically turned into a priced supplier offer.</p>
   </section>
  </>}
 </main>;
}
