/** Deterministic evidence intelligence. No web observation becomes a verified supplier quote. */
import {landedCost,type Country,type Quote} from './model';
export type EvidenceKind='customer_quote'|'smartcrawl'|'supplier_worker_live'|'supplier_worker_reference';
export type EvidenceRow={id:string;lineId:string;mpn:string;kind:EvidenceKind;status:'eligible_customer_reported'|'review_required'|'incomplete'|'reference_only';supplier:string;sourceUrl:string|null;observedAt:string|null;expiresAt:string|null;unitPrice:string|null;currency:string|null;landedMinor:string|null;content:string;provenance:string;reviewRequired:true};
export type EvidenceLine={id:string;mpn:string;manufacturer:string;quantity:number};
export type SourceRecord={line_index:number;quantity:number;kind:string;state:string;supplier_id:string;source_url:string|null;result:unknown;created_at:unknown;updated_at:unknown};
export type WorkerPart={query_mpn?:unknown;normalized_mpn?:unknown;best_distributor?:unknown;data_source?:unknown;best_unit_price_at_qty?:unknown};
export type EvidenceSnapshot={label:string;country:Country;currency:string;demo:boolean;revision:number;lines:EvidenceLine[];records:EvidenceRow[];generatedAt:string;truncated:boolean};
export type Finding={id:string;kind:'missing_quote'|'review_research'|'review_quote'|'unverified_supplier'|'coverage';severity:'attention'|'information';title:string;detail:string;citations:string[];lineId:string|null};
export type CopilotAnswer={mode:'grounded_rules'|'model_prioritized';question:string;summary:string;findings:Finding[];coverage:{total:number;priced:number;unpriced:number;researchCandidates:number};disclaimer:string};
export type DatasheetCandidate={property:'operating_voltage'|'operating_temperature'|'package'|'pin_count';value:string;line:number;excerpt:string;reviewRequired:true};
function str(v:unknown,n=200):string{return typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').slice(0,n):'';}
function timestamp(v:unknown):string|null{const x=v instanceof Date?v.toISOString():v;return typeof x==='string'&&Number.isFinite(Date.parse(x))?new Date(x).toISOString():null;}
function https(v:unknown):string|null{if(typeof v!=='string'||v.length>2048)return null;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function buildEvidence(input:{label:string;country:Country;currency:string;revision:number;lines:EvidenceLine[];rows:SourceRecord[];worker?:{parts:WorkerPart[];updatedAt:unknown}|null;demo?:boolean;truncated?:boolean},now=Date.now()):EvidenceSnapshot{
 if(!Array.isArray(input.lines)||input.lines.length<1||input.lines.length>50)throw Error('Expected 1–50 BOM lines');
 if(!Array.isArray(input.rows)||input.rows.length>300)throw Error('Too many evidence records');
 const ids=new Set<string>();
 for(const l of input.lines){if(!/^line-\d{1,3}$/.test(l.id)||ids.has(l.id)||!str(l.mpn,128)||!Number.isSafeInteger(l.quantity)||l.quantity<1)throw Error('Invalid BOM lines');ids.add(l.id);}
 const lines=new Map(input.lines.map(l=>[Number(l.id.slice(5)),l]));const records:EvidenceRow[]=[];
 for(const r of input.rows){
  const l=lines.get(Number(r.line_index));if(!l||!['quote','research'].includes(r.kind))continue;
  const quote=r.kind==='quote';const id=(quote?'Q':'R')+String(records.length+1);
  let status:EvidenceRow['status']=quote?'incomplete':'review_required',unitPrice:string|null=null,currency:string|null=null,landedMinor:string|null=null,expiresAt:string|null=null;
  let content=quote?'Customer-reported quotation; not independently verified.':'No unambiguous product facts extracted.';
  const raw=r.result&&typeof r.result==='object'&&!Array.isArray(r.result)?r.result as Record<string,unknown>:{};
  if(quote){
   const q=raw as unknown as Quote;expiresAt=timestamp(q.validUntil);currency=str(q.currency,8)||null;
   unitPrice=typeof q.unitPrice4==='number'&&Number.isSafeInteger(q.unitPrice4)&&q.unitPrice4>0?(q.unitPrice4/10000).toFixed(4):null;
   try{const cost=landedCost(q,l.quantity,now);if(cost.totalMinor!==null&&r.quantity===l.quantity){status='eligible_customer_reported';landedMinor=cost.totalMinor;}else content='Incomplete or expired quote: '+str(cost.reason,120);}catch{content='Invalid quote fields: manual review required.';}
  }else{unitPrice=/^\d+(?:\.\d{1,4})?$/.test(str(raw.price,40))?str(raw.price,40):null;currency=/^[A-Z]{3}$/.test(str(raw.currency,4))?str(raw.currency,4):null;content=str(raw.evidence,300)||content;}
  records.push({id,lineId:l.id,mpn:l.mpn,kind:quote?'customer_quote':'smartcrawl',status,supplier:str(r.supplier_id,100),sourceUrl:https(r.source_url)||https(raw.sourceUrl),observedAt:quote?timestamp(r.created_at):timestamp(raw.retrievedAt)||timestamp(r.updated_at),expiresAt,unitPrice,currency,landedMinor,content,provenance:quote?'Customer-reported quotation':str(raw.method,30)==='llm_candidate'?'Unverified LLM candidate':'SmartCrawl observation',reviewRequired:true});
 }
 for(const [i,l] of input.lines.entries()){
  const w=input.worker?.parts[i];if(!w||records.length>=300)break;
  const mpn=str(w.query_mpn??w.normalized_mpn,128).trim();
  if(mpn.toUpperCase()!==l.mpn.trim().toUpperCase()||!['live','reference'].includes(str(w.data_source)))continue;
  const live=w.data_source==='live',val=typeof w.best_unit_price_at_qty==='number'&&Number.isFinite(w.best_unit_price_at_qty)&&w.best_unit_price_at_qty>0?w.best_unit_price_at_qty:null;
  records.push({id:'S'+(i+1),lineId:l.id,mpn:l.mpn,kind:live?'supplier_worker_live':'supplier_worker_reference',status:'reference_only',supplier:str(w.best_distributor,100)||'Distributor unreported',sourceUrl:null,observedAt:timestamp(input.worker?.updatedAt),expiresAt:null,unitPrice:val===null?null:String(val),currency:val===null?null:'USD',landedMinor:null,content:live?'Worker live-labelled observation; not a delivered quote.':'Reference distributor data, not current inventory.',provenance:live?'Distributor-worker reported live':'Distributor-worker reference',reviewRequired:true});
 }
 return {label:str(input.label,160)||'BOM',country:input.country,currency:str(input.currency,8),demo:input.demo===true,revision:input.revision,lines:input.lines,records,generatedAt:new Date(now).toISOString(),truncated:input.truncated===true};
}
export function coverage(s:EvidenceSnapshot){
 const priced=new Set(s.records.filter(r=>r.status==='eligible_customer_reported').map(r=>r.lineId));
 return {total:s.lines.length,priced:priced.size,unpriced:s.lines.length-priced.size,researchCandidates:s.records.filter(r=>r.kind==='smartcrawl').length};
}
export function findings(s:EvidenceSnapshot):Finding[]{
 const result:Finding[]=[];
 for(const l of s.lines){
  const rs=s.records.filter(r=>r.lineId===l.id),eligible=rs.some(r=>r.status==='eligible_customer_reported'),research=rs.filter(r=>r.kind==='smartcrawl');
  if(!eligible)result.push({id:'missing-'+l.id,kind:'missing_quote',severity:'attention',title:'Missing qualified quote: '+l.mpn,detail:'Research the exact part or obtain a supplier quotation. Unconfirmed freight, taxes, stock and currency remain unknown.',citations:rs.slice(0,8).map(r=>r.id),lineId:l.id});
  if(research.length)result.push({id:'research-'+l.id,kind:'review_research',severity:'information',title:'Review research: '+l.mpn,detail:'SmartCrawl and LLM observations are unverified. Confirm identity and commercial details before saving a quotation.',citations:research.slice(0,8).map(r=>r.id),lineId:l.id});
  if(rs.some(r=>r.kind==='customer_quote'&&r.status==='incomplete'))result.push({id:'incomplete-'+l.id,kind:'review_quote',severity:'attention',title:'Incomplete quotation: '+l.mpn,detail:'Recheck quote expiry, stock, MOQ, destination, exchange rates, shipping and fees.',citations:rs.filter(r=>r.kind==='customer_quote').slice(0,8).map(r=>r.id),lineId:l.id});
 }
 const worker=s.records.filter(r=>r.kind==='supplier_worker_live'||r.kind==='supplier_worker_reference');
 if(worker.length)result.push({id:'worker-provenance',kind:'unverified_supplier',severity:'information',title:'Confirm distributor-worker evidence',detail:'Worker observations are not purchase-ready quotations. Live-labelled and reference data remain separate.',citations:worker.slice(0,8).map(r=>r.id),lineId:null});
 if(!result.length)result.push({id:'coverage',kind:'coverage',severity:'information',title:'Every line has a complete customer-reported quote',detail:'Quotation coverage is not a guarantee of supplier delivery, authenticity or compatible components.',citations:s.records.slice(0,8).map(r=>r.id),lineId:null});
 return result.slice(0,80);
}
export function groundedAnswer(s:EvidenceSnapshot,question:string,priorities?:string[]):CopilotAnswer{
 if(typeof question!=='string'||!question.trim()||question.length>500)throw Error('Question must be 1–500 characters');
 const cov=coverage(s),all=findings(s),q=question.toLowerCase();
 const mode=/price|cost|budget|cheap/.test(q)?'cost':/research|crawl|supplier/.test(q)?'research':'risk';
 const rank=(f:Finding)=>mode==='cost'?f.kind==='review_quote'?0:f.kind==='missing_quote'?1:2:mode==='research'?f.kind==='review_research'?0:f.kind==='missing_quote'?1:2:f.kind==='missing_quote'?0:f.kind==='review_quote'?1:2;
 const base=all.slice().sort((a,b)=>rank(a)-rank(b));
 let ordered=base;
 if(priorities?.length&&priorities.length<=base.length&&new Set(priorities).size===priorities.length&&priorities.every(id=>base.some(f=>f.id===id))){
  const selected=new Set(priorities);ordered=[...priorities.map(id=>base.find(f=>f.id===id)!),...base.filter(f=>!selected.has(f.id))];
 }else priorities=undefined;
 const summary=/datasheet|replace|alternate|compatib|pinout/i.test(q)?'No proposed substitution is electrically or mechanically qualified. Datasheet findings are only review candidates.':String(cov.priced)+'/'+String(cov.total)+' BOM lines have complete customer-reported quotations; '+String(cov.unpriced)+' remain unpriced. '+String(cov.researchCandidates)+' research observations require review.';
 return {mode:priorities?.length?'model_prioritized':'grounded_rules',question,summary,coverage:cov,findings:ordered.slice(0,12),disclaimer:'Advisory only: research findings, customer quotes and synthetic fixtures are not confirmed supplier offers, purchase approvals or qualified substitutes.'};
}
export function extractDatasheetText(raw:string):DatasheetCandidate[]{
 if(typeof raw!=='string'||raw.length>12000)throw Error('Paste at most 12,000 characters');
 const patterns:[DatasheetCandidate['property'],RegExp][]=[
  ['operating_voltage',/^\s*(?:recommended\s+)?(?:operating\s+(?:supply\s+)?voltage|supply\s+voltage\s+\(operating\))\s*[:=]\s*(\-?\d+(?:\.\d+)?\s*(?:to|[-–])\s*\+?\d+(?:\.\d+)?\s*V)\s*$/i],
  ['operating_temperature',/^\s*operating\s+temperature(?:\s+range)?\s*[:=]\s*(\-?\d+\s*(?:to|[-–])\s*\+?\d+\s*°?C)\s*$/i],
  ['package',/^\s*(?:package|package\s+type)\s*[:=]\s*([A-Za-z0-9][A-Za-z0-9\- /]{0,35})\s*$/i],
  ['pin_count',/^\s*(?:pins|pin\s+count)\s*[:=]\s*(\d{1,3})\s*$/i]
 ];
 const output:DatasheetCandidate[]=[];
 for(const [i,line] of raw.split(/\r?\n/).slice(0,150).entries()){
  if(/absolute\s+maximum|not\s+recommended/i.test(line))continue;
  for(const [property,re] of patterns){const m=re.exec(line);if(m&&!output.some(x=>x.property===property))output.push({property,value:m[1].trim(),line:i+1,excerpt:line.trim().slice(0,180),reviewRequired:true});}
 }
 return output;
}
export function syntheticEvidence(now=Date.now()):EvidenceSnapshot{
 const lines:EvidenceLine[]=[{id:'line-0',mpn:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:5},{id:'line-1',mpn:'MAX30100',manufacturer:'Maxim Integrated',quantity:5},{id:'line-2',mpn:'DHT11',manufacturer:'',quantity:5},{id:'line-3',mpn:'SH1106',manufacturer:'',quantity:5},{id:'line-4',mpn:'LM1117-3.3',manufacturer:'',quantity:10}];
 const date=new Date(now).toISOString(),validUntil=new Date(now+86400000).toISOString();
 const rows:SourceRecord[]=[
 {line_index:0,quantity:5,kind:'quote',state:'completed',supplier_id:'FICTIONAL Nigerian supplier',source_url:null,created_at:date,updated_at:date,result:{currency:'NGN',unitPrice4:54000000,shipping2:80000,fees2:0,fx6:1000000,stock:20,moq:1,validUntil,quotedQuantity:5,identityConfirmed:true,destinationConfirmed:true}},
 {line_index:1,quantity:5,kind:'research',state:'completed',supplier_id:'FICTIONAL catalog',source_url:null,created_at:date,updated_at:date,result:{method:'jsonld',price:'3.20',currency:'USD',evidence:'SYNTHETIC: MAX30100 listed at USD 3.20 (not a verified offer)',retrievedAt:date}},
 {line_index:2,quantity:5,kind:'quote',state:'completed',supplier_id:'FICTIONAL exporter',source_url:null,created_at:date,updated_at:date,result:{currency:'USD',unitPrice4:14000,shipping2:null,fees2:null,fx6:null,stock:null,moq:2,validUntil,quotedQuantity:5,identityConfirmed:false,destinationConfirmed:false}}
 ];
 return buildEvidence({label:'FICTIONAL IoT health-monitoring BOM (portfolio only)',country:'NG',currency:'NGN',revision:1,lines,rows,demo:true},now);
}
