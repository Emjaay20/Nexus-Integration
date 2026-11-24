/** Controlled scheduled research: explicit user opt-in, exact licensed URL, durable reservation.
 * No automatic replay on submission ambiguity. External cron must be explicitly configured.
 */
import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {db} from '@/lib/db';
import {consumeLimit} from '@/lib/request-limits';
import {approvedUrl,parsePolicies,record,selection,supplierFor,type Part,type Selection} from './model';
import {getCrawlerConfig,startResearch,pollResearch} from './crawler';
import {KnowledgeError,requireBom,type Member} from './knowledge';
const MAX_DISPATCH=3;
const DEMO='00000000-0000-0000-0000-000000000001';
export type ScheduleInput={workspaceId:string;bomId:string;revision:number;line:number;country:string;quantity:number;supplierId:string;url:string;intervalHours:number;maxRuns:number;startNow:boolean};
export function clockConfigured(env:NodeJS.ProcessEnv=process.env):boolean{
 return env.NEXUS_RESEARCH_SCHEDULER_ENABLED==='true'&&typeof env.NEXUS_RESEARCH_CRON_TOKEN==='string'&&env.NEXUS_RESEARCH_CRON_TOKEN.length>=32;
}
export function validToken(received:string|null,env:NodeJS.ProcessEnv=process.env):boolean{
 if(!clockConfigured(env)||typeof received!=='string'||!received.startsWith('Bearer '))return false;
 const actual=received.slice(7),expected=env.NEXUS_RESEARCH_CRON_TOKEN!;
 if(actual.length<32||actual.length>256)return false;
 const a=createHash('sha256').update(actual).digest(),b=createHash('sha256').update(expected).digest();
 return timingSafeEqual(a,b);
}
export function policyFor(supplierId:string,url:string,env:NodeJS.ProcessEnv=process.env){
 const config=getCrawlerConfig(env);if(!config)throw new KnowledgeError(409,'SmartCrawl is not enabled or its egress has not been verified');
 let policies;try{policies=parsePolicies(env.NEXUS_REGIONAL_CRAWL_POLICIES);}catch{throw new KnowledgeError(503,'Research authorization policy invalid');}
 const supplier=supplierFor(supplierId),policy=policies.get(supplier.id);
 if(!policy)throw new KnowledgeError(409,'Supplier research access has not been approved');
 return {supplier,policy,config,url:approvedUrl(supplier,url,policy)};
}
export function validatedInput(raw:Record<string,unknown>):{selection:Selection;supplierId:string;url:string;intervalHours:number;maxRuns:number;startNow:boolean}{
 const s=selection({bomId:raw.bomId,revision:raw.revision,line:raw.line,country:raw.country,quantity:raw.quantity});
 if(typeof raw.supplierId!=='string'||typeof raw.url!=='string')throw new KnowledgeError(400,'Supplier and exact product URL required');
 const {url}=policyFor(raw.supplierId,raw.url);
 const intervalHours=raw.intervalHours,maxRuns=raw.maxRuns;
 if(typeof intervalHours!=='number'||!Number.isInteger(intervalHours)||intervalHours<24||intervalHours>720)throw new KnowledgeError(400,'Research interval must be 24–720 hours');
 if(typeof maxRuns!=='number'||!Number.isInteger(maxRuns)||maxRuns<1||maxRuns>12)throw new KnowledgeError(400,'Scheduled runs must be 1–12');
 if(typeof raw.startNow!=='boolean')throw new KnowledgeError(400,'Explicit start timing required');
 return {selection:s,supplierId:raw.supplierId,url,intervalHours,maxRuns,startNow:raw.startNow};
}
export async function createSchedule(actor:Member,raw:Record<string,unknown>){
 if(actor.role==='viewer'||actor.userId===DEMO)throw new KnowledgeError(403,'Read-only workspace');
 if(raw.workspaceId!==actor.workspaceId)throw new KnowledgeError(409,'Active workspace changed');
 const input=validatedInput(raw),s=input.selection,source=policyFor(input.supplierId,input.url);
 return db.transaction(async tx=>{
  const bom=await requireBom(tx,actor,s.bomId,s.revision,true);
  const part=record(bom.items[s.line]);
  if(Number(part.quantity)!==s.quantity||typeof part.partNumber!=='string'||!part.partNumber.trim())throw new KnowledgeError(409,'Current BOM line and quantity changed');
  await tx.query('SELECT id FROM platform_boms WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[actor.workspaceId,s.bomId]);
  const count=await tx.query("SELECT count(*)::int AS total FROM platform_research_schedules WHERE workspace_id=$1 AND state IN ('active','paused')",[actor.workspaceId]);
  if(Number(count.rows[0].total)>=5)throw new KnowledgeError(429,'At most five active or paused schedules per workspace');
  const id=randomUUID();
  const saved=await tx.query("INSERT INTO platform_research_schedules(id,workspace_id,actor_id,bom_id,bom_revision,line_index,quantity,country,supplier_id,source_url,authorization_ref,interval_hours,max_runs,next_run_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now()+$14*interval '1 hour') ON CONFLICT(workspace_id,bom_id,bom_revision,line_index,country,supplier_id,source_url) DO NOTHING RETURNING id,state,next_run_at,interval_hours,max_runs",[id,actor.workspaceId,actor.userId,s.bomId,s.revision,s.line,s.quantity,s.country,source.supplier.id,source.url,source.policy.authorizationRef,input.intervalHours,input.maxRuns,input.startNow?0:input.intervalHours]);
  if(!saved.rows.length)throw new KnowledgeError(409,'A schedule already exists for this exact supplier product page and BOM line');
  await tx.query("INSERT INTO platform_audit(id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,'regional.schedule.create','allow','explicit bounded scheduled research configured',$5)",[randomUUID(),actor.workspaceId,actor.userId,s.bomId,randomUUID()]);
  return saved.rows[0];
 });
}
export async function listSchedules(actor:Member,bomId:string,revision:number){
 return db.transaction(async tx=>{
  await requireBom(tx,actor,bomId,revision);
  const rows=await tx.query('SELECT id,bom_id,bom_revision,line_index,quantity,country,supplier_id,source_url,interval_hours,max_runs,run_count,next_run_at,state,last_result_id,last_error_code,created_at FROM platform_research_schedules WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 ORDER BY created_at DESC LIMIT 30',[actor.workspaceId,bomId,revision]);
  return rows.rows;
 });
}
export async function changeSchedule(actor:Member,bomId:string,revision:number,id:string,action:'pause'|'resume'|'delete'){
 if(actor.role==='viewer'||actor.userId===DEMO)throw new KnowledgeError(403,'Read-only workspace');
 return db.transaction(async tx=>{
  await requireBom(tx,actor,bomId,revision,true);
  const existing=await tx.query('SELECT * FROM platform_research_schedules WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND id=$4 FOR UPDATE',[actor.workspaceId,bomId,revision,id]);
  if(!existing.rows.length)throw new KnowledgeError(404,'Research schedule not found');
  const row=existing.rows[0];
  if(action==='delete'){
   await tx.query('DELETE FROM platform_research_schedules WHERE workspace_id=$1 AND id=$2',[actor.workspaceId,id]);
  }else if(action==='pause'){
   if(row.state!=='active')throw new KnowledgeError(409,'Only active schedules can be paused');
   await tx.query("UPDATE platform_research_schedules SET state='paused',updated_at=now() WHERE workspace_id=$1 AND id=$2",[actor.workspaceId,id]);
  }else{
   if(!['paused','review_required'].includes(row.state)||Number(row.run_count)>=Number(row.max_runs))throw new KnowledgeError(409,'Schedule cannot be resumed');
   // Explicit user re-approval validates CURRENT supplier permission, not stale policy.
   const source=policyFor(row.supplier_id,row.source_url);
   if(source.policy.authorizationRef!==row.authorization_ref)throw new KnowledgeError(409,'Supplier authorization changed; create a new approved schedule');
   await tx.query("UPDATE platform_research_schedules SET state='active',next_run_at=now()+interval '24 hours',last_error_code=NULL,updated_at=now() WHERE workspace_id=$1 AND id=$2",[actor.workspaceId,id]);
  }
  await tx.query("INSERT INTO platform_audit(id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,$5,'allow','schedule management action',$6)",[randomUUID(),actor.workspaceId,actor.userId,bomId,'regional.schedule.'+action,randomUUID()]);
  return {id,action};
 });
}
type Reservation={scheduleId:string;workspaceId:string;rowId:string;supplierId:string;url:string;part:Part;policyRef:string};
async function reserveOne():Promise<Reservation|null>{
 return db.transaction(async tx=>{
  const found=await tx.query("SELECT * FROM platform_research_schedules WHERE state='active' AND next_run_at<=now() ORDER BY next_run_at,id FOR UPDATE SKIP LOCKED LIMIT 1");
  if(!found.rows.length)return null;
  const row=found.rows[0],workspaceId=String(row.workspace_id),scheduleId=String(row.id);
  const review=async(reason:string)=>{
   await tx.query("UPDATE platform_research_schedules SET state='review_required',last_error_code=$1,updated_at=now() WHERE id=$2 AND workspace_id=$3",[reason,scheduleId,workspaceId]);
   return null;
  };
  const membership=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2',[row.actor_id,workspaceId]);
  if(!['owner','design_engineer'].includes(membership.rows[0]?.role)||String(row.actor_id)===DEMO)return review('actor_not_authorized');
  const bom=await tx.query('SELECT revision,items FROM platform_boms WHERE id=$1 AND workspace_id=$2',[row.bom_id,workspaceId]);
  if(!bom.rows.length||Number(bom.rows[0].revision)!==Number(row.bom_revision))return review('bom_revision_changed');
  const partRaw=Array.isArray(bom.rows[0].items)?bom.rows[0].items[Number(row.line_index)]:null;
  if(!partRaw||typeof partRaw.partNumber!=='string'||Number(partRaw.quantity)!==Number(row.quantity))return review('bom_line_changed');
  let source;
  try{source=policyFor(String(row.supplier_id),String(row.source_url));}catch{return review('supplier_authorization_disabled');}
  if(source.policy.authorizationRef!==row.authorization_ref)return review('supplier_policy_changed');
  const pending=await tx.query("SELECT id FROM platform_regional_sourcing WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND line_index=$4 AND country=$5 AND quantity=$6 AND supplier_id=$7 AND source_url=$8 AND kind='research' AND state IN ('submitting','submission_unknown','submitted') LIMIT 1",[workspaceId,row.bom_id,row.bom_revision,row.line_index,row.country,row.quantity,row.supplier_id,row.source_url]);
  if(pending.rows.length)return review('previous_research_unresolved');
  const quota=await tx.query("SELECT count(*)::int AS total FROM platform_regional_sourcing WHERE workspace_id=$1 AND kind='research' AND created_at>now()-interval '24 hours'",[workspaceId]);
  if(Number(quota.rows[0].total)>=10){
   await tx.query("UPDATE platform_research_schedules SET next_run_at=now()+interval '24 hours',last_error_code='daily_quota',updated_at=now() WHERE id=$1 AND workspace_id=$2",[scheduleId,workspaceId]);return null;
  }
  if(Number(row.run_count)>=Number(row.max_runs))return review('run_limit_reached');
  const requestKey=randomUUID(),rowId=randomUUID();
  const part:Part={partNumber:String(partRaw.partNumber),manufacturer:typeof partRaw.manufacturer==='string'?partRaw.manufacturer:'',quantity:Number(row.quantity)};
  const sel={bomId:row.bom_id,revision:Number(row.bom_revision),line:Number(row.line_index),country:String(row.country),quantity:Number(row.quantity)};
  const digest=createHash('sha256').update(JSON.stringify({s:sel,action:'research',supplier:row.supplier_id,url:source.url,policy:source.policy.authorizationRef,allowModel:false})).digest('hex');
  await tx.query("INSERT INTO platform_regional_sourcing(id,workspace_id,actor_id,bom_id,bom_revision,line_index,country,quantity,part,supplier_id,request_key,fingerprint,kind,state,source_url,policy_ref,result,model_allowed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'research','submitting',$13,$14,NULL,false)",[rowId,workspaceId,row.actor_id,row.bom_id,row.bom_revision,row.line_index,row.country,row.quantity,JSON.stringify(part),row.supplier_id,requestKey,digest,source.url,source.policy.authorizationRef]);
  await tx.query("UPDATE platform_research_schedules SET run_count=run_count+1,last_result_id=$1,last_error_code=NULL,next_run_at=now()+interval_hours*interval '1 hour',state=CASE WHEN run_count+1>=max_runs THEN 'completed' ELSE 'active' END,updated_at=now() WHERE id=$2 AND workspace_id=$3",[rowId,scheduleId,workspaceId]);
  await tx.query("INSERT INTO platform_audit(id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,'regional.schedule.reserve','allow','one automated attempt reserved without retry',$5)",[randomUUID(),workspaceId,row.actor_id,row.bom_id,randomUUID()]);
  return {scheduleId,workspaceId,rowId,supplierId:source.supplier.id,url:source.url,part,policyRef:source.policy.authorizationRef};
 });
}
export async function tickResearch(max=MAX_DISPATCH){
 if(!clockConfigured())throw new KnowledgeError(503,'Scheduled research disabled');
 if(!Number.isSafeInteger(max)||max<1||max>3)throw new KnowledgeError(400,'Invalid batch size');
 if(!await consumeLimit('regional_scheduler_ticks','global',12,3600))throw new KnowledgeError(429,'Scheduler tick rate limit');
 const outcome:{scheduleId:string;result:'submitted'|'submission_unknown'}[]=[];
 for(let i=0;i<max;i++){
  // Enforce existing global research submission budget before reserving a task.
  if(!await consumeLimit('regional_submit_global','global',40,3600))break;
  const reservation=await reserveOne();if(!reservation)break;
  const {scheduleId,workspaceId,rowId}=reservation;
  let jobId:string|null=null;
  try{
   const source=policyFor(reservation.supplierId,reservation.url);
   if(source.policy.authorizationRef===reservation.policyRef)jobId=await startResearch(source.config,source.supplier,source.policy,reservation.url);
  }catch{/* provider may have accepted the submission; never retry automatically */}
  await db.query("UPDATE platform_regional_sourcing SET state=$1,crawler_job_id=$2,error_code=$3,updated_at=now() WHERE id=$4 AND workspace_id=$5 AND state='submitting'",[jobId?'submitted':'submission_unknown',jobId,jobId?null:'submission_not_confirmed',rowId,workspaceId]);
  outcome.push({scheduleId,result:jobId?'submitted':'submission_unknown'});
 }
 return {processed:outcome.length,results:outcome};
}
