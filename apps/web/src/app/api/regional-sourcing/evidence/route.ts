import {forwardWorkspace} from '@/lib/core-workspace';
import {db} from '@/lib/db';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {allowsMutation} from '@/lib/request-origin';
import {country,countryCurrency,record,uuid,InputError} from '@/lib/regional/model';
import {buildEvidence,findings,groundedAnswer,type EvidenceSnapshot,type EvidenceLine,type SourceRecord,type WorkerPart} from '@/lib/regional/intelligence';
import {modelEnabled,prioritize} from '@/lib/regional/copilot-priority';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const HEADERS={'Cache-Control':'no-store'};
const DEMO='00000000-0000-0000-0000-000000000001';
class EvidenceError extends Error{constructor(readonly status:number,message:string){super(message);}}
function out(body:unknown,status=200){return Response.json(body,{status,headers:HEADERS});}
function failure(e:unknown){
 if(e instanceof EvidenceError)return out({error:e.message},e.status);
 if(e instanceof InputError)return out({error:e.message},400);
 if(e instanceof SyntaxError)return out({error:'Malformed JSON'},400);
 if(e instanceof Error&&e.message==='BODY_LIMIT')return out({error:'Request too large'},413);
 return out({error:'Evidence service temporarily unavailable. No results were fabricated.'},503);
}
function revision(v:unknown):number{const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>Number.MAX_SAFE_INTEGER)throw new EvidenceError(400,'Invalid BOM revision');return n;}
async function actor(){
 const context=await forwardWorkspace('context',undefined,{method:'GET'});
 if(!context.ok)throw new EvidenceError(context.status===401?401:503,context.status===401?'Sign in to load evidence':'Workspace unavailable');
 const a=record(record(await context.json()).actor);
 if(!['owner','design_engineer','viewer'].includes(String(a.role)))throw new EvidenceError(403,'Workspace access unavailable');
 return {userId:uuid(a.user_id),workspaceId:uuid(a.workspace_id)};
}
async function budget(scope:string,id:string,max:number,seconds:number){
 if(!await consumeLimit('regional_intelligence_'+scope,id,max,seconds))throw new EvidenceError(429,'Evidence request limit reached');
}
async function snapshot(a:{userId:string;workspaceId:string},body:Record<string,unknown>):Promise<EvidenceSnapshot>{
 if(uuid(body.workspaceId)!==a.workspaceId)throw new EvidenceError(409,'Active workspace changed');
 const bomId=uuid(body.bomId),rev=revision(body.revision),destination=country(body.country);
 return await db.transaction(async tx=>{
  const member=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2 FOR SHARE OF m,c',[a.userId,a.workspaceId]);
  if(!member.rows.length||!['owner','design_engineer','viewer'].includes(member.rows[0].role))throw new EvidenceError(403,'Workspace membership revoked');
  const b=await tx.query('SELECT id,name,revision,items FROM platform_boms WHERE id=$1 AND workspace_id=$2 FOR SHARE',[bomId,a.workspaceId]);
  if(!b.rows.length)throw new EvidenceError(404,'BOM not found');
  if(Number(b.rows[0].revision)!==rev)throw new EvidenceError(409,'BOM revision changed. Reload the latest saved version.');
  const items=b.rows[0].items;
  if(!Array.isArray(items)||items.length<1||items.length>50)throw new EvidenceError(400,'Evidence view supports 1–50 BOM lines');
  const lines:EvidenceLine[]=items.map((v,i)=>{
   const p=record(v),qty=Number(p.quantity);
   if(typeof p.partNumber!=='string'||!p.partNumber.trim()||!Number.isSafeInteger(qty)||qty<1||qty>1000000)throw new EvidenceError(409,'Invalid saved BOM item');
   return {id:'line-'+String(i),mpn:p.partNumber,manufacturer:typeof p.manufacturer==='string'?p.manufacturer:'',quantity:qty};
  });
  const source=await tx.query('SELECT line_index,quantity,kind,state,supplier_id,source_url,result,created_at,updated_at FROM platform_regional_sourcing WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND country=$4 AND state=$5 ORDER BY created_at DESC LIMIT 301',[a.workspaceId,bomId,rev,destination,'completed']);
  if(source.rows.length>300)throw new EvidenceError(409,'More than 300 observations. Refine this BOM before generating evidence.');
  const workers=await tx.query("SELECT updated_at,result FROM platform_jobs WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND state='completed' ORDER BY updated_at DESC LIMIT 1",[a.workspaceId,bomId,rev]);
  const worker=workers.rows[0];
  const results=worker?.result&&typeof worker.result==='object'&&!Array.isArray(worker.result)?(worker.result as Record<string,unknown>).results:null;
  const parts=Array.isArray(results)&&results.length===lines.length?results as WorkerPart[]:[];
  return buildEvidence({label:String(b.rows[0].name),country:destination,currency:countryCurrency[destination],revision:rev,lines,rows:source.rows as SourceRecord[],worker:parts.length?{parts,updatedAt:worker.updated_at}:null});
 });
}
export async function GET(req:Request){
 try{
  const a=await actor();await budget('read',a.workspaceId,30,60);
  const p=new URL(req.url).searchParams;
  const s=await snapshot(a,{workspaceId:p.get('workspaceId'),bomId:p.get('bomId'),revision:p.get('revision'),country:p.get('country')});
  return out({snapshot:s,findings:findings(s)});
 }catch(e){return failure(e);}
}
export async function POST(req:Request){
 try{
  if(!allowsMutation(req))throw new EvidenceError(403,'Cross-site requests are not allowed');
  const a=await actor();
  const input=record(await limitedJson(req,8192));
  if(input.action!=='ask'||typeof input.question!=='string'||!input.question.trim()||input.question.length>500)throw new EvidenceError(400,'Ask a question of 1–500 characters');
  await budget('ask',a.workspaceId,20,3600);
  await budget('ask_global','global',500,3600);
  const s=await snapshot(a,input);
  const question=input.question;
  let ordered:string[]|null=null;
  if(input.allowModel===true&&a.userId!==DEMO&&modelEnabled()){
   await budget('model',a.workspaceId,5,3600);
   await budget('model_global','global',100,3600);
   ordered=await prioritize(question,findings(s));
  }
  return out({answer:groundedAnswer(s,question,ordered||undefined),snapshotRevision:s.revision});
 }catch(e){return failure(e);}
}
