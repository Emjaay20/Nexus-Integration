'use client';
import {useEffect,useState} from 'react';
import type {Country} from '@/lib/regional/model';
import type {EvidenceSnapshot,EvidenceLine} from '@/lib/regional/intelligence';
type Selection={workspaceId:string;bomId:string;revision:number;country:Country};
type Supplier={id:string;name:string;origin:string;researchEnabled:boolean};
type Schedule={id:string;line_index:number;country:string;supplier_id:string;source_url:string;interval_hours:number;max_runs:number;run_count:number;next_run_at:string;state:string;last_error_code:string|null};
const field={width:'100%',padding:9,borderRadius:6,background:'transparent',color:'inherit',border:'1px solid var(--border, #aaa)'};
export default function ScheduleManager({selection,lines,suppliers,snapshot}:{selection:Selection;lines:EvidenceLine[];suppliers:Supplier[];snapshot:EvidenceSnapshot}){
 const [schedules,setSchedules]=useState<Schedule[]>([]),[schedulerEnabled,setSchedulerEnabled]=useState(false);
 const [line,setLine]=useState(0),[supplier,setSupplier]=useState(''),[url,setUrl]=useState(''),[hours,setHours]=useState(24),[maxRuns,setMaxRuns]=useState(3),[startNow,setStartNow]=useState(false),[consent,setConsent]=useState(false);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const eligible=suppliers.filter(x=>x.researchEnabled),complete=new Set(snapshot.records.filter(r=>r.status==='eligible_customer_reported').map(r=>r.lineId));
 const missing=lines.map((l,i)=>({...l,index:i})).filter(l=>!complete.has(l.id));
 const current=eligible.find(s=>s.id===supplier);
 async function load(){
  const query=new URLSearchParams({workspaceId:selection.workspaceId,bomId:selection.bomId,revision:String(selection.revision)});
  const response=await fetch('/api/regional-sourcing/schedules?'+query,{cache:'no-store'});
  const result=await response.json();if(!response.ok)throw Error(result.error||'Cannot load schedules');
  setSchedules(result.schedules||[]);setSchedulerEnabled(result.schedulerEnabled===true);
 }
 useEffect(()=>{let live=true;void load().catch(e=>{if(live)setError(e instanceof Error?e.message:'Unable to load schedules');});return()=>{live=false;};},[selection.workspaceId,selection.bomId,selection.revision]);
 async function create(){
  if(!consent||!current||!missing.some(x=>x.index===line))return;setBusy(true);setError('');
  try{
   const item=lines[line];
   const body={action:'create',workspaceId:selection.workspaceId,bomId:selection.bomId,revision:selection.revision,line,country:selection.country,quantity:item.quantity,supplierId:supplier,url,intervalHours:hours,maxRuns,startNow};
   const response=await fetch('/api/regional-sourcing/schedules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Schedule request failed');
   setConsent(false);setNotice('Research schedule saved; no crawl is guaranteed until a configured, authorised scheduler tick processes it.');await load();
  }catch(e){setError(e instanceof Error?e.message:'Cannot save schedule');}finally{setBusy(false);}
 }
 async function change(id:string,action:'pause'|'resume'|'delete'){
  if(action==='delete'&&!window.confirm('Delete the research schedule? Existing recorded research remains unchanged.'))return;
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/regional-sourcing/schedules',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({workspaceId:selection.workspaceId,bomId:selection.bomId,revision:selection.revision,id,action})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to update schedule');await load();setNotice('Schedule '+action+' successful');
  }catch(e){setError(e instanceof Error?e.message:'Operation failed');}finally{setBusy(false);}
 }
 return <section className="result-section"><h2>Controlled recurring supplier research</h2>
  <p>Schedule a review of one exact product URL at a permitted supplier. Every automated run is bounded, attributed, and separately recorded. No quotes are automatically approved. Scheduled submissions do not run until the operator explicitly enables a private server-to-server scheduler.</p>
  {!schedulerEnabled&&<p className="note">Scheduler dispatch is currently disabled in the application environment. You can review schedules, but automatic research will not run until an operator configures it.</p>}
  {error&&<p role="alert" className="note error">{error}</p>}{notice&&<p role="status" className="note">{notice}</p>}
  {eligible.length===0?<p>Automatic research cannot be scheduled: no supplier URL is authorised by the current operator policies.</p>:<>
   <div style={{display:'grid',gap:12,gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,185px),1fr))'}}>
    <label className="field">Missing BOM line<select style={field} value={line} onChange={e=>setLine(Number(e.target.value))}>{missing.map(l=><option key={l.id} value={l.index}>{l.mpn}</option>)}</select></label>
    <label className="field">Authorised supplier<select style={field} value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Select supplier</option>{eligible.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label className="field">Repeat every<select style={field} value={hours} onChange={e=>setHours(Number(e.target.value))}><option value={24}>24 hours</option><option value={72}>3 days</option><option value={168}>7 days</option><option value={720}>30 days</option></select></label>
    <label className="field">Maximum research attempts<select style={field} value={maxRuns} onChange={e=>setMaxRuns(Number(e.target.value))}><option value={1}>1</option><option value={3}>3</option><option value={6}>6</option><option value={12}>12</option></select></label>
   </div>
   <label className="field">Exact approved product URL<input style={field} type="url" value={url} onChange={e=>setUrl(e.target.value)} placeholder={current?.origin||'https://approved-source.example/product/part'} /></label>
   <p><label><input type="checkbox" checked={startNow} onChange={e=>setStartNow(e.target.checked)}/> Due at the next authorised scheduler tick instead of after the first interval</label></p>
   <p><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I approve recurring research for this exact supplier page, subject to source permissions and the stated maximum attempts</label></p>
   <button className="btn btn-primary btn-sm" disabled={!consent||!current||!url||!missing.some(x=>x.index===line)||busy} onClick={()=>void create()}>Create bounded research schedule</button>
  </>}
  <h3>Persisted schedule status</h3>
  <button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void load().catch(e=>setError(e instanceof Error?e.message:'Reload failed'))}>Reload schedules</button>
  {!schedules.length?<p>No research schedules saved for this BOM revision.</p>:schedules.map(s=><article key={s.id} className="note">
   <p><strong>{lines[s.line_index]?.mpn||'BOM line '+s.line_index}</strong> · {s.supplier_id} · {s.state}</p>
   <p>{s.run_count}/{s.max_runs} attempts · every {s.interval_hours}h · next due {new Date(s.next_run_at).toLocaleString()}</p>
   <p><small>Source URL: {s.source_url} · {s.last_error_code?'Review: '+s.last_error_code:''}</small></p>
   <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    {s.state==='active'&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void change(s.id,'pause')}>Pause</button>}
    {['paused','review_required'].includes(s.state)&&<button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void change(s.id,'resume')}>Resume after permission review</button>}
    <button className="btn btn-secondary btn-sm" disabled={busy} onClick={()=>void change(s.id,'delete')}>Delete schedule</button>
   </div>
  </article>)}
 </section>;
}
