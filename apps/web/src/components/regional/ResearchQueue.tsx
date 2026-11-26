'use client';
import {useState} from 'react';
import type {Country} from '@/lib/regional/model';
import type {EvidenceLine,EvidenceSnapshot} from '@/lib/regional/intelligence';
type Supplier={id:string;name:string;origin:string;researchEnabled:boolean};
type Selection={workspaceId:string;bomId:string;revision:number;country:Country};
type Task={key:string;index:number;mpn:string;quantity:number;supplierId:string;url:string;attempted:boolean;state:string;rowId:string|null;message:string};
type SavedRow={id:string;kind:string;state:string;sourceUrl:string|null;supplierId:string;errorCode?:string|null;result?:{evidence?:string;price?:string|null}|null};
const input={width:'100%',padding:'8px 10px',border:'1px solid var(--border, #aaa)',background:'transparent',color:'inherit',borderRadius:6};
async function sourceApi(body:Record<string,unknown>){
 const response=await fetch('/api/regional-sourcing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Research operation failed');
 return data as SavedRow;
}
export default function ResearchQueue({selection,lines,suppliers,snapshot}:{selection:Selection;lines:EvidenceLine[];suppliers:Supplier[];snapshot:EvidenceSnapshot}){
 const approved=suppliers.filter(s=>s.researchEnabled);
 const [line,setLine]=useState(0),[supplier,setSupplier]=useState(''),[url,setUrl]=useState(''),[tasks,setTasks]=useState<Task[]>([]);
 const [saved,setSaved]=useState<SavedRow[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const existing=new Set(snapshot.records.filter(r=>r.status==='eligible_customer_reported').map(r=>r.lineId));
 const missing=lines.map((l,i)=>({...l,index:i})).filter(l=>!existing.has(l.id));
 const active=approved.find(s=>s.id===supplier);
 function add(){
  setError('');const item=missing.find(x=>x.index===line);
  if(!item||!active){setError('Select a missing part and an authorised supplier');return;}
  let parsed:URL;try{parsed=new URL(url);}catch{setError('Enter a valid exact product URL');return;}
  if(parsed.origin!==active.origin||parsed.protocol!=='https:'||parsed.search||parsed.hash||parsed.username||parsed.password||!parsed.pathname||parsed.pathname==='/'){
   setError('Product URL must be an exact HTTPS page at the selected supplier, without query parameters');return;
  }
  if(tasks.length>=3){setError('At most three research tasks per batch');return;}
  if(tasks.some(t=>t.index===line&&t.supplierId===supplier&&t.url===parsed.href)){setError('This research task is already queued');return;}
  setTasks(v=>[...v,{key:crypto.randomUUID(),index:line,mpn:item.mpn,quantity:item.quantity,supplierId:supplier,url:parsed.href,attempted:false,state:'queued',rowId:null,message:''}]);
  setUrl('');setNotice('Review the queued items and submit explicitly. No crawl has started.');
 }
 async function submit(){
  if(busy||!tasks.some(t=>!t.attempted))return;setBusy(true);setError('');setNotice('');
  const queued=tasks.filter(t=>!t.attempted).slice(0,3);
  // Mark attempts before networking. An unknown result is never silently retried.
  setTasks(rows=>rows.map(t=>queued.some(q=>q.key===t.key)?{...t,attempted:true,state:'sending'}:t));
  let submitted=0;
  for(const task of queued){
   try{
    const result=await sourceApi({action:'research',workspaceId:selection.workspaceId,bomId:selection.bomId,revision:selection.revision,line:task.index,country:selection.country,quantity:task.quantity,supplierId:task.supplierId,url:task.url,requestKey:task.key,allowModel:false});
    submitted++;
    setTasks(rows=>rows.map(t=>t.key===task.key?{...t,rowId:result.id,state:result.state,message:'Saved request state: '+result.state}:t));
   }catch(e){
    // A timeout may mean SmartCrawl received the request. Do not resend.
    setTasks(rows=>rows.map(t=>t.key===task.key?{...t,state:'unknown',message:'Outcome unknown; use Reload saved research instead of retrying.'}:t));
    setError('At least one submission could not be confirmed. Review saved records before further requests: '+(e instanceof Error?e.message:'Request failed'));
    break; // fail closed; no additional tasks after ambiguous response
   }
  }
  setBusy(false);setNotice(String(submitted)+' research request(s) recorded; refresh them individually when ready.');
 }
 async function reload(){
  const item=lines[line];if(!item)return;setBusy(true);setError('');
  try{
   const query=new URLSearchParams({workspaceId:selection.workspaceId,bomId:selection.bomId,revision:String(selection.revision),line:String(line),country:selection.country,quantity:String(item.quantity)});
   const r=await fetch('/api/regional-sourcing?'+query,{cache:'no-store',signal:AbortSignal.timeout(15000)});
   const payload=await r.json();if(!r.ok)throw Error(payload.error||'Research lookup failed');
   setSaved((payload.rows as SavedRow[]).filter(x=>x.kind==='research'));setNotice('Loaded persisted research states for the selected BOM line.');
  }catch(e){setError(e instanceof Error?e.message:'Could not read saved research');}finally{setBusy(false);}
 }
 async function refresh(row:SavedRow){
  const item=lines[line];if(!item)return;setBusy(true);setError('');
  try{const result=await sourceApi({action:'refresh',workspaceId:selection.workspaceId,bomId:selection.bomId,revision:selection.revision,line,country:selection.country,quantity:item.quantity,id:row.id});
   setSaved(v=>v.map(x=>x.id===row.id?result:x));setNotice('Checked existing SmartCrawl job. Reload evidence after completion.');
  }catch(e){setError(e instanceof Error?e.message:'Poll failed');}finally{setBusy(false);}
 }
 return <section id="nexus-research-queue" className="result-section">
  <h2>Automated research queue (authorised sources only)</h2>
  <p>Select missing BOM lines and exact product URLs at operator-approved suppliers. This batches up to three explicit research submissions using the existing audited SmartCrawl workflow. No search-engine scraping, price guessing, or background retries.</p>
  {!approved.length?<p className="note">No suppliers have authorised SmartCrawl access configured. Manual quotation entry and the synthetic demonstrations remain available. Configure source-specific permissions before crawling.</p>:<>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,190px),1fr))',gap:12}}>
    <label className="field">BOM line needing evidence<select style={input} value={line} onChange={e=>{setLine(Number(e.target.value));setSaved([]);}}>{missing.map(l=><option key={l.id} value={l.index}>{l.mpn} · qty {l.quantity}</option>)}</select></label>
    <label className="field">Authorised supplier<select style={input} value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Select approved source</option>{approved.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
   </div>
   <label className="field">Exact product URL<input style={input} type="url" value={url} placeholder={active?.origin||'https://approved-supplier.example/product/part'} onChange={e=>setUrl(e.target.value)}/></label>
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
    <button className="btn btn-secondary btn-sm" disabled={!missing.length||busy||tasks.length>=3} onClick={add}>Add to research queue</button>
    <button className="btn btn-primary btn-sm" disabled={busy||!tasks.some(t=>!t.attempted)} onClick={()=>void submit()}>Submit queued research</button>
    <button className="btn btn-secondary btn-sm" disabled={busy||!missing.length} onClick={()=>void reload()}>Reload saved research for line</button>
   </div>
   {tasks.map(t=><p className="note" key={t.key}>{t.mpn} — {t.supplierId} · {t.state} {t.message} {!t.attempted&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>setTasks(v=>v.filter(x=>x.key!==t.key))}>Remove</button>}</p>)}
   {saved.map(r=><article className="note" key={r.id}><strong>{r.supplierId}</strong> · state {r.state}<p>{r.result?.evidence||r.errorCode||'No extracted evidence yet'}</p>{r.state==='submitted'&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void refresh(r)}>Check existing crawler job</button>}{r.state==='submission_unknown'&&<p>Submission outcome unknown; operator reconciliation required. Do not resubmit.</p>}</article>)}
  </>}
  {error&&<p role="alert" className="note error">{error}</p>}{notice&&<p role="status" className="note">{notice}</p>}
 </section>;
}
