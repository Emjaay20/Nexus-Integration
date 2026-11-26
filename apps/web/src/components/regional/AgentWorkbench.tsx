'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import type {Country} from '@/lib/regional/model';
import type {EvidenceRow,EvidenceSnapshot} from '@/lib/regional/intelligence';
import {answerAgent,planResearch,type AgentPlan,type AgentHit,type AgentDocument,type AgentTask} from '@/lib/regional/agent';

type Selection={workspaceId:string;bomId:string;revision:number;country:Country};
type Payload={plan:AgentPlan;records:EvidenceRow[];documents:AgentDocument[];hits:AgentHit[]};
const field={width:'100%',maxWidth:560,padding:10,background:'transparent',color:'inherit',border:'1px solid var(--border, #aaa)',borderRadius:6};
const title=(s:string)=>s.replaceAll('_',' ');
function exportPlan(plan:AgentPlan){
 const data=JSON.stringify({...plan,exportDisclaimer:'Review plan only; no action has been executed or approved.'},null,2);
 const url=URL.createObjectURL(new Blob([data],{type:'application/json;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='nexus-agent-review-plan.json';link.click();URL.revokeObjectURL(url);
}
function actionHandoff(task:AgentTask,canWrite:boolean){
 if(!canWrite)return <small>Viewer access is read-only. Contact a workspace engineer to approve any action.</small>;
 if(task.handoff==='research_queue')return <a href="#nexus-research-queue">Review approved supplier research queue</a>;
 if(task.handoff==='datasheet_workbench')return <a href="#nexus-datasheet-workbench">Open datasheet workbench</a>;
 return <Link href="/regional-sourcing">Review and record a supplier quotation</Link>;
}
export default function AgentWorkbench({selection,snapshot,canWrite}:{selection:Selection|null;snapshot:EvidenceSnapshot;canWrite:boolean}){
 const [payload,setPayload]=useState<Payload|null>(null);
 const [topic,setTopic]=useState('operating voltage'),[question,setQuestion]=useState('What should I review first?');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const selectionKey=selection?[selection.workspaceId,selection.bomId,selection.revision,selection.country].join(':'):'demo';
 const [activeKey,setActiveKey]=useState('');
 const view=useMemo(()=>{
  const plan=payload?.plan;
  if(!plan)return null;
  try{return answerAgent(plan,question);}catch{return null;}
 },[payload,question]);
 async function load(sel:Selection|null,topicFilter:string,signal?:AbortSignal){
  if(!sel){
   return {plan:planResearch(snapshot),records:snapshot.records,documents:[],hits:[]} as Payload;
  }
  const params=new URLSearchParams({workspaceId:sel.workspaceId,bomId:sel.bomId,revision:String(sel.revision),country:sel.country});
  if(topicFilter.trim())params.set('topic',topicFilter.trim());
  const response=await fetch('/api/regional-sourcing/agent?'+params.toString(),{cache:'no-store',signal:signal||AbortSignal.timeout(15000)});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'The review plan is unavailable');
  return {plan:data.plan,records:data.records,documents:data.documents,hits:data.hits} as Payload;
 }
 useEffect(()=>{
  const controller=new AbortController();
  setPayload(null);setActiveKey('');setError('');setBusy(true);
  void load(selection,snapshot.demo?'':topic,controller.signal).then(data=>{
   if(controller.signal.aborted)return;
   setPayload(data);setActiveKey(selectionKey);setNotice(selection?'Review-only plan generated from current workspace evidence. No research was submitted.':'Loaded a fictional, deterministic procurement decision plan.');
  }).catch(e=>{if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Unable to create plan');}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
  return ()=>controller.abort();
 // Topic is applied only on explicit Refresh; switching workspaces invalidates all previously fetched data.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[selectionKey,snapshot]);
 async function refresh(){
  setBusy(true);setError('');
  try{const data=await load(selection,snapshot.demo?'':topic,AbortSignal.timeout(15000));setPayload(data);setActiveKey(selectionKey);setNotice('Grounded plan refreshed. No external action executed.');}
  catch(e){setError(e instanceof Error?e.message:'Unable to retrieve updated evidence');}finally{setBusy(false);}
 }
 const current=activeKey===selectionKey?payload:null;
 return <section id="nexus-agent-workbench" className="result-section">
  <h2>Phase 7 — Evidence-backed procurement agent</h2>
  <p>Generate a transparent, read-only research plan. Each proposal has evidence references, a review urgency score and a manual handoff. Urgency scores are <strong>not calibrated probabilities</strong>. This agent does not crawl websites or approve substitutions on its own.</p>
  {snapshot.demo&&<p className="note">Synthetic demonstration: all source labels and supplier observations are fictional.</p>}
  {error&&<p role="alert" className="note error">{error}</p>}
  {notice&&<p role="status" className="note">{notice}</p>}
  <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'end'}}>
   {!snapshot.demo&&<label className="field">Find cited datasheet text by topic<input style={field} value={topic} maxLength={100} onChange={e=>setTopic(e.target.value)}/></label>}
   <button className="btn btn-primary btn-sm" disabled={busy||!snapshot.demo&&topic.trim().length>0&&topic.trim().length<2} onClick={()=>void refresh()}>{busy?'Analysing…':'Refresh evidence-based plan'}</button>
   {current&&<button className="btn btn-secondary btn-sm" onClick={()=>exportPlan(current.plan)}>Export review plan JSON</button>}
  </div>
  {current&&<>
   <h3>{current.plan.label}</h3>
   <p>{current.plan.summary}</p>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,170px),1fr))',gap:12}}>
    <article className="note"><strong>{current.plan.coverage.priced}/{current.plan.coverage.total}</strong><p>Lines with customer-reported quotation coverage</p></article>
    <article className="note"><strong>{current.plan.documentsIndexed}</strong><p>Persisted datasheets in review</p></article>
    <article className="note"><strong>{current.plan.retrievedExcerpts}</strong><p>Cited document page excerpts</p></article>
    <article className="note"><strong>{current.plan.tasks.length}</strong><p>Proposed manual actions</p></article>
   </div>
   <h3>Prioritized review tasks</h3>
   {current.plan.tasks.length===0?<p>There are no current evidence-gap actions. This does not guarantee stock, compatibility or supplier delivery.</p>:current.plan.tasks.slice(0,50).map(task=><article key={task.id} className="note">
    <p><strong>{task.title}</strong> · {task.priority} · review urgency {task.urgencyScore}/100</p>
    <p>{task.reason}</p>
    <p><small>Evidence strength: {title(task.evidenceStrength)} · Quantity {task.quantity} · Human approval required</small></p>
    {task.citations.length>0?<p><small>Evidence: {task.citations.map(c=>'['+c+']').join(', ')}</small></p>:<p><small>Evidence gap: no qualifying source citation</small></p>}
    {actionHandoff(task,canWrite)}
   </article>)}
   <h3>Ask the grounded decision agent</h3>
   <label className="field">Question<input style={field} value={question} maxLength={240} onChange={e=>setQuestion(e.target.value)}/></label>
   {view&&<article className="note"><p>{view.summary}</p>
    <p>Relevant manual tasks: {view.actions.length}</p>
    {view.actions.map(t=><p key={t.id}><strong>{t.title}</strong> · {t.priority} · {t.citations.length?t.citations.map(c=>'['+c+']').join(', '):'citation unavailable'}</p>)}
    <p><small>{view.disclaimer}</small></p>
   </article>}
   {current.hits.length>0&&<><h3>Page-backed research excerpts</h3>
    {current.hits.map((h,i)=><article className="note" key={h.citation+':'+i}>
     <strong>{h.document} — page {h.page}</strong><p>{h.excerpt}</p>
     <small>[{h.citation}] · Indexed text from uploaded document, not authenticated manufacturer evidence</small>
    </article>)}
   </>}
   <p className="note">{current.plan.warnings.join(' ')}</p>
  </>}
 </section>;
}
