/**
 * Phase 7: deterministic, evidence-grounded procurement decision agent.
 * Returns proposals only. It cannot authorize crawls, place orders, infer
 * missing commercial values or approve electrical substitutions.
 */
import {coverage,syntheticEvidence,type EvidenceSnapshot,type EvidenceRow} from './intelligence';

export type AgentDocument={
  documentId:string;lineIndex:number;name:string;sha256:string;version:number;
  pageCount:number;truncated:boolean;
};
export type AgentHit={
  lineIndex:number;documentId:string;document:string;sha256:string;version:number;
  page:number;excerpt:string;citation:string;rank:number;
};
export type AgentAction='obtain_quote'|'revalidate_quote'|'verify_research'|'upload_datasheet'|'review_document'|'diversify_supplier';
export type AgentPriority='critical'|'high'|'medium'|'low';
export type AgentEvidenceStrength='customer_reported_quote'|'unverified_research'|'document_observation'|'none';
export type AgentTask={
  id:string;lineId:string;mpn:string;quantity:number;action:AgentAction;
  title:string;reason:string;priority:AgentPriority;urgencyScore:number;
  evidenceStrength:AgentEvidenceStrength;citations:string[];
  approvalRequired:true;handoff:'research_queue'|'regional_sourcing'|'datasheet_workbench';
};
export type AgentPlan={
  version:'rules-v1';kind:'synthetic_demo'|'workspace_advisory';
  label:string;revision:number;destination:string;generatedAt:string;
  coverage:{total:number;priced:number;unpriced:number;researchCandidates:number};
  documentsIndexed:number;retrievedExcerpts:number;tasks:AgentTask[];
  summary:string;warnings:string[];automaticActions:0;
};
const PRIORITY=(score:number):AgentPriority=>score>=85?'critical':score>=65?'high':score>=40?'medium':'low';
const validTime=(x:string|null)=>x?Date.parse(x):NaN;
function sourceIds(rs:EvidenceRow[],max=8){return rs.map(x=>x.id).slice(0,max);}
function boundedScore(v:number){return Math.max(0,Math.min(100,Math.round(v)));}
function evidenceStrength(rs:EvidenceRow[],hasDoc:boolean):AgentEvidenceStrength{
 if(rs.some(r=>r.status==='eligible_customer_reported'))return 'customer_reported_quote';
 if(rs.some(r=>r.kind==='smartcrawl'||r.kind==='supplier_worker_live'||r.kind==='supplier_worker_reference'))return 'unverified_research';
 return hasDoc?'document_observation':'none';
}
export function planResearch(snapshot:EvidenceSnapshot,documents:AgentDocument[]=[],hits:AgentHit[]=[],now=Date.now()):AgentPlan{
 if(!snapshot||!Array.isArray(snapshot.lines)||snapshot.lines.length<1||snapshot.lines.length>50||!Array.isArray(snapshot.records)||snapshot.records.length>300)throw Error('Invalid evidence snapshot');
 if(!Array.isArray(documents)||documents.length>5||!Array.isArray(hits)||hits.length>20)throw Error('Document retrieval limit exceeded');
 const evidenceIds=new Set(snapshot.records.map(r=>r.id));
 const validLineIds=new Set(snapshot.lines.map(l=>l.id));
 const docMap=new Map<string,AgentDocument>();
 for(const d of documents){
  if(!d||!Number.isInteger(d.lineIndex)||d.lineIndex<0||d.lineIndex>=snapshot.lines.length||!/^[a-f0-9]{64}$/.test(d.sha256)||!Number.isInteger(d.version)||d.version<1||d.version>20)throw Error('Invalid document provenance');
  docMap.set(d.documentId,d);
 }
 const acceptedHits:AgentHit[]=[];
 for(const h of hits){
  const d=docMap.get(h.documentId);
  if(!d||h.lineIndex!==d.lineIndex||h.sha256!==d.sha256||h.version!==d.version||!Number.isInteger(h.page)||h.page<1||h.page>d.pageCount||typeof h.excerpt!=='string'||h.excerpt.length>300)throw Error('Untrusted document search result');
  const expected='sha256:'+d.sha256+':v'+d.version+':p'+h.page;
  if(h.citation!==expected)throw Error('Document citation does not match source');
  acceptedHits.push(h);
 }
 const tasks:AgentTask[]=[];
 const used=new Set<string>();
 for(const [i,line] of snapshot.lines.entries()){
  if(!validLineIds.has(line.id)||!/^line-\d{1,3}$/.test(line.id)||!Number.isSafeInteger(line.quantity)||line.quantity<1||typeof line.mpn!=='string'||!line.mpn.trim())throw Error('Invalid BOM line');
  const rs=snapshot.records.filter(r=>r.lineId===line.id);
  const complete=rs.filter(r=>r.status==='eligible_customer_reported');
  const expired=rs.filter(r=>r.kind==='customer_quote'&&r.status!=='eligible_customer_reported');
  const research=rs.filter(r=>r.kind==='smartcrawl'||r.kind==='supplier_worker_live'||r.kind==='supplier_worker_reference');
  const associated=documents.filter(d=>d.lineIndex===i);
  const extracts=acceptedHits.filter(h=>h.lineIndex===i);
  const strength=evidenceStrength(rs,associated.length>0);
  // "Urgency score" is a transparent review heuristic, not a probability of failure.
  const anyRecent=rs.some(r=>Number.isFinite(validTime(r.observedAt))&&now-validTime(r.observedAt)<30*86400000&&validTime(r.observedAt)<=now);
  const base=boundedScore((complete.length?18:65)+(expired.length?12:0)+(research.length?5:0)+(associated.length?0:8)+(anyRecent?0:8));
  const create=(action:AgentAction,title:string,reason:string,adjustment:number,handoff:AgentTask['handoff'],citations:string[])=>{
   const score=boundedScore(base+adjustment),id=line.id+':'+action;
   if(used.has(id))return;used.add(id);
   const unique=[...new Set(citations)].slice(0,8);
   // Never accept unverified source IDs or detached document citations.
   if(!unique.every(ref=>evidenceIds.has(ref)||acceptedHits.some(h=>h.citation===ref)))throw Error('Action cites non-existent source');
   tasks.push({id,lineId:line.id,mpn:line.mpn,quantity:line.quantity,action,title,reason,urgencyScore:score,
    priority:PRIORITY(score),evidenceStrength:strength,citations:unique,approvalRequired:true,handoff});
  };
  if(!complete.length){
   create('obtain_quote','Get a complete quotation for '+line.mpn,
    'No current complete customer-reported quote for this exact BOM quantity and destination. Supplier price, stock and delivered cost cannot be assumed.',12,'regional_sourcing',sourceIds(rs));
  }
  if(expired.length){
   create('revalidate_quote','Review incomplete or expired quote for '+line.mpn,
    'Existing customer quotation lacks confirmed current terms. Recheck exact MPN, quantity, stock, shipping, fees, FX and expiration.',9,'regional_sourcing',sourceIds(expired));
  }
  if(complete.length&&new Set(complete.map(r=>r.supplier.trim().toUpperCase())).size===1){
   create('diversify_supplier','Review alternate supplier coverage for '+line.mpn,
    'Only one distinct supplier has a complete customer-reported quotation for this BOM line. Consider obtaining a second confirmed source; this does not prove the first supplier is unreliable.',18,'regional_sourcing',sourceIds(complete));
  }
  if(research.length){
   create('verify_research','Verify supplier research for '+line.mpn,
    'Source observations and distributor-worker results are candidates only, not authenticated supplier offers. Use a permissioned exact product URL and request approval before crawling.',0,'research_queue',sourceIds(research));
  }
  if(!associated.length){
   create('upload_datasheet','Obtain a source datasheet for '+line.mpn,
    'No persisted datasheet text is linked to this BOM line. An engineering reviewer should verify the original manufacturer document.',-24,'datasheet_workbench',sourceIds(rs));
  }else if(associated.some(d=>d.truncated)){
   create('review_document','Review partial datasheet for '+line.mpn,
    'At least one uploaded PDF text extraction was truncated. Do not infer that missing specifications are absent.',-12,'datasheet_workbench',extracts.map(h=>h.citation));
  }
 }
 tasks.sort((a,b)=>b.urgencyScore-a.urgencyScore||a.lineId.localeCompare(b.lineId)||a.action.localeCompare(b.action));
 const cov=coverage(snapshot);
 return {version:'rules-v1',kind:snapshot.demo?'synthetic_demo':'workspace_advisory',label:snapshot.label,
  revision:snapshot.revision,destination:snapshot.country,generatedAt:new Date(now).toISOString(),coverage:cov,
  documentsIndexed:documents.length,retrievedExcerpts:acceptedHits.length,tasks:tasks.slice(0,120),automaticActions:0,
  summary:cov.priced+' of '+cov.total+' BOM lines have complete customer-reported quotations. '+cov.unpriced+' need commercial evidence. '+documents.length+' saved datasheets inform engineering review, not supplier verification.',
  warnings:[
   'Urgency scores are transparent heuristics, not calibrated risk probabilities.',
   'Only a human may approve supplier contact, crawling, substitutions or purchases.',
   'Customer-reported quotes, crawler observations and uploaded PDFs have different levels of provenance; none is a guaranteed commercial offer.',
   'No action has been executed by this plan.'
  ]};
}
/** Known source labels permit a compact, deterministic advisory answer without LLM hallucination. */
export function answerAgent(plan:AgentPlan,question:string){
 if(typeof question!=='string'||!question.trim()||question.length>240)throw Error('Question must contain 1–240 characters');
 const q=question.toLowerCase();
 const related=/datasheet|component|compatib|electrical|pdf/.test(q)?plan.tasks.filter(t=>['upload_datasheet','review_document'].includes(t.action)):
  /research|crawl|supplier|source/.test(q)?plan.tasks.filter(t=>t.action==='verify_research'||t.action==='obtain_quote'||t.action==='diversify_supplier'):
  /price|quote|cost|budget/.test(q)?plan.tasks.filter(t=>t.action==='obtain_quote'||t.action==='revalidate_quote'):plan.tasks;
 const actions=related.slice(0,8);
 return {question,summary:plan.summary,actions,disclaimer:'This is a read-only review plan. Citations refer only to available evidence and page excerpts. No purchase, crawl, price confirmation or engineering substitution has occurred.'};
}
export function syntheticAgentPlan(now=Date.now()):AgentPlan{
 return planResearch(syntheticEvidence(now),[],[],now);
}
