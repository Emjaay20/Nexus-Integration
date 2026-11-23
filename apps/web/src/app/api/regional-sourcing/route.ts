import {createHash,randomUUID} from 'node:crypto';
import {forwardWorkspace} from '@/lib/core-workspace';
import {db} from '@/lib/db';
import {allowsMutation} from '@/lib/request-origin';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {COUNTRIES,SUPPLIERS,countryCurrency,selection,record,uuid,parseQuote,parsePolicies,supplierFor,approvedUrl,landedCost,InputError,type Selection,type Part,type Quote} from '@/lib/regional/model';
import {getCrawlerConfig,startResearch,pollResearch} from '@/lib/regional/crawler';
export const dynamic='force-dynamic';
export const runtime='nodejs';
class HttpError extends Error {constructor(readonly status:number,message:string){super(message);}}
type Actor={userId:string;workspaceId:string;role:string};
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
const DEMO='00000000-0000-0000-0000-000000000001';
const HEADERS={'Cache-Control':'no-store'};
function response(value:unknown,status=200){return Response.json(value,{status,headers:HEADERS});}
async function actor():Promise<Actor>{
  const res=await forwardWorkspace('context',undefined,{method:'GET'});
  if(!res.ok)throw new HttpError(res.status===401?401:503,res.status===401?'Sign in first':'Workspace unavailable');
  const body=record(await res.json());const a=record(body.actor);const role=a.role;
  if(role!=='owner'&&role!=='design_engineer'&&role!=='viewer')throw new HttpError(403,'Workspace role unavailable');
  return {userId:uuid(a.user_id),workspaceId:uuid(a.workspace_id),role};
}
async function authorize(tx:Tx,a:Actor,write:boolean,s?:Selection):Promise<Part|null>{
  // Verify current authoritative membership and active workspace inside the same transaction.
  const m=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2 FOR SHARE OF m,c',[a.userId,a.workspaceId]);
  const role=m.rows[0]?.role;if(!['owner','design_engineer','viewer'].includes(role)||write&&(role==='viewer'||a.userId===DEMO))throw new HttpError(403,'Permission or active workspace changed');
  if(!s)return null;
  const b=await tx.query('SELECT revision,items FROM platform_boms WHERE workspace_id=$1 AND id=$2 FOR SHARE',[a.workspaceId,s.bomId]);
  if(!b.rows.length)throw new HttpError(404,'BOM not found');
  if(Number(b.rows[0].revision)!==s.revision)throw new HttpError(409,'BOM revision changed. Reload before continuing.');
  const items=b.rows[0].items;
  if(!Array.isArray(items)||s.line>=items.length)throw new HttpError(400,'Invalid BOM line');
  const p=items[s.line];if(typeof p?.partNumber!=='string'||!p.partNumber||typeof p.quantity!=='number'||!Number.isSafeInteger(p.quantity)||p.quantity<1)throw new HttpError(409,'Saved BOM line is invalid');
  return {partNumber:p.partNumber,manufacturer:typeof p.manufacturer==='string'?p.manufacturer:'',quantity:p.quantity};
}
function checkWorkspace(a:Actor,value:unknown){if(uuid(value)!==a.workspaceId)throw new HttpError(409,'Active workspace changed. Reload this page.');}
function publicRow(r:Record<string,unknown>){return {id:r.id,kind:r.kind,state:r.state,supplierId:r.supplier_id,sourceUrl:r.source_url,createdAt:r.created_at,updatedAt:r.updated_at,result:r.result,errorCode:r.error_code,...(r.kind==='quote'&&r.result?{cost:landedCost(r.result as Quote,Number(r.quantity))}:{})};}
async function bound(a:Actor,scope:string,limit:number,seconds:number){if(!await consumeLimit(`regional_${scope}`,a.workspaceId,limit,seconds))throw new HttpError(429,'Workspace research limit reached. Try again later.');}
async function globalBound(scope:string,limit:number,seconds:number){if(!await consumeLimit(`regional_${scope}`,'global',limit,seconds))throw new HttpError(429,'Regional sourcing service is busy. Try again later.');}
async function audit(tx:Tx,a:Actor,bom:string,action:string,request:string){await tx.query('INSERT INTO platform_audit (id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,$5,\'allow\',\'regional procurement operation\',$6)',[randomUUID(),a.workspaceId,a.userId,bom,action,request]);}
function policies(){try{return parsePolicies(process.env.NEXUS_REGIONAL_CRAWL_POLICIES);}catch{throw new HttpError(503,'Regional supplier policies require operator review');}}
function failure(e:unknown){if(e instanceof HttpError)return response({error:e.message},e.status);if(e instanceof InputError)return response({error:e.message},400);if(e instanceof SyntaxError)return response({error:'Invalid request JSON'},400);if(e instanceof Error&&e.message==='BODY_LIMIT')return response({error:'Request too large'},413);if(e instanceof Error&&e.message==='EMPTY_BODY')return response({error:'Request body required'},400);return response({error:'Regional sourcing temporarily unavailable. No unconfirmed success is reported.'},503);}
export async function GET(req:Request){try{
  const a=await actor();await bound(a,'read',120,60);const u=new URL(req.url);
  if(!u.searchParams.has('bomId'))return await db.transaction(async tx=>{await authorize(tx,a,false);const rows=await tx.query('SELECT id,name,revision FROM platform_boms WHERE workspace_id=$1 ORDER BY updated_at DESC,id DESC LIMIT 100',[a.workspaceId]);return response({workspaceId:a.workspaceId,role:a.role,boms:rows.rows.map(x=>({...x,revision:Number(x.revision)})),suppliers:SUPPLIERS.map(s=>({...s,researchEnabled:!!getCrawlerConfig()&&policies().has(s.id)})),countries:COUNTRIES,countryCurrency});});
  checkWorkspace(a,u.searchParams.get('workspaceId'));
  // Selection-less BOM request is used solely to populate the line picker.
  if(!u.searchParams.has('line'))return await db.transaction(async tx=>{await authorize(tx,a,false);const b=await tx.query('SELECT id,name,revision,items FROM platform_boms WHERE workspace_id=$1 AND id=$2',[a.workspaceId,uuid(u.searchParams.get('bomId'))]);if(!b.rows.length)throw new HttpError(404,'BOM not found');const row=b.rows[0];return response({id:row.id,name:row.name,revision:Number(row.revision),items:row.items});});
  const s=selection({bomId:u.searchParams.get('bomId'),revision:Number(u.searchParams.get('revision')),line:Number(u.searchParams.get('line')),country:u.searchParams.get('country'),quantity:Number(u.searchParams.get('quantity'))});
  return await db.transaction(async tx=>{const part=await authorize(tx,a,false,s);const r=await tx.query('SELECT id,kind,state,supplier_id,source_url,created_at,updated_at,result,error_code,quantity FROM platform_regional_sourcing WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND line_index=$4 AND country=$5 AND quantity=$6 ORDER BY created_at DESC,id DESC LIMIT 101',[a.workspaceId,s.bomId,s.revision,s.line,s.country,s.quantity]);return response({part,rows:r.rows.slice(0,100).map(publicRow),truncated:r.rows.length>100});});
}catch(e){return failure(e);}}
export async function POST(req:Request){try{
  if(!allowsMutation(req))throw new HttpError(403,'Cross-site changes are not allowed');
  const a=await actor();if(a.role==='viewer'||a.userId===DEMO)throw new HttpError(403,'Workspace is read only');
  const input=record(await limitedJson(req,16384));checkWorkspace(a,input.workspaceId);const s=selection(input);const action=input.action;
  await bound(a,'write',30,60);
  if(action==='refresh'){
    const id=uuid(input.id);
    await bound(a,'poll',20,60);await globalBound('poll_global',100,60);
    const token=randomUUID();
    const claim=await db.transaction(async tx=>{
      await authorize(tx,a,true,s);
      const found=await tx.query('SELECT * FROM platform_regional_sourcing WHERE workspace_id=$1 AND id=$2 AND bom_id=$3 AND bom_revision=$4 AND line_index=$5 AND country=$6 AND quantity=$7 FOR UPDATE',[a.workspaceId,id,s.bomId,s.revision,s.line,s.country,s.quantity]);
      if(!found.rows.length)throw new HttpError(404,'Research not found');
      const row=found.rows[0];
      if(row.kind!=='research'||row.state!=='submitted')return {row,claimed:false};
      const result=await tx.query("UPDATE platform_regional_sourcing SET poll_token=$1,poll_until=now()+interval '45 seconds' WHERE id=$2 AND workspace_id=$3 AND (poll_until IS NULL OR poll_until<now()) RETURNING *",[token,id,a.workspaceId]);
      return result.rows.length?{row:result.rows[0],claimed:true}:{row,claimed:false};
    });
    const row=claim.row;
    if(!claim.claimed)return response(publicRow(row));
    try{
      const supplier=supplierFor(row.supplier_id),policy=policies().get(supplier.id),config=getCrawlerConfig();
      if(!policy||!config||policy.authorizationRef!==row.policy_ref)throw new HttpError(409,'Source authorization changed. Operator review required.');
      let outcome;try{outcome=await pollResearch(config,row.crawler_job_id,supplier,{...policy,allowModel:policy.allowModel&&row.model_allowed===true},row.source_url,row.part as Part);}catch{throw new HttpError(503,'Research status could not be verified. Refresh the same record, do not submit again.');}
      return await db.transaction(async tx=>{
        await authorize(tx,a,true,s);
        if(outcome.state!=='submitted'){
          const changed=await tx.query("UPDATE platform_regional_sourcing SET state=$1,result=$2,error_code=$3,updated_at=now(),poll_token=NULL,poll_until=NULL WHERE id=$4 AND workspace_id=$5 AND state='submitted' AND poll_token=$6",[outcome.state,outcome.observation?JSON.stringify(outcome.observation):null,outcome.error||null,id,a.workspaceId,token]);
          if(changed.rowCount===1)await audit(tx,a,s.bomId,'regional.research.refresh',randomUUID());
        }
        const r=await tx.query('SELECT * FROM platform_regional_sourcing WHERE id=$1 AND workspace_id=$2',[id,a.workspaceId]);return response(publicRow(r.rows[0]));
      });
    }finally{
      // Release only our own lease; a crashed caller leaves a bounded 45-second lease.
      await db.query('UPDATE platform_regional_sourcing SET poll_token=NULL,poll_until=NULL WHERE id=$1 AND workspace_id=$2 AND poll_token=$3',[id,a.workspaceId,token]).catch(()=>{});
    }
  }
  if(action!=='quote'&&action!=='research')throw new InputError('Unknown action');
  const key=uuid(input.requestKey);const supplier=supplierFor(input.supplierId);const policy=action==='research'?policies().get(supplier.id):undefined;const config=action==='research'?getCrawlerConfig():null;
  if(action==='research'&&(!policy||!config))throw new HttpError(409,'Automated collection not authorized or SmartCrawl not configured. Save a supplier quote instead.');
  const quote=action==='quote'?parseQuote(input.quote,supplier,s):null;
  const url=action==='research'?approvedUrl(supplier,input.url,policy!):quote?.sourceUrl||null;
  const allowModel=action==='research'&&input.allowModel===true&&policy?.allowModel===true;
  if(action==='research')await globalBound('submit_global',40,3600);
  const digest=createHash('sha256').update(JSON.stringify({s,action,supplier:supplier.id,url,quote,policy:policy?.authorizationRef||null,allowModel})).digest('hex');
  // The reserved record must commit before contacting the crawler. One key maps to one payload.
  const reservation=await db.transaction(async tx=>{
    const part=await authorize(tx,a,true,s);await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`regional:${a.workspaceId}`]);
    const existing=await tx.query('SELECT * FROM platform_regional_sourcing WHERE workspace_id=$1 AND request_key=$2',[a.workspaceId,key]);
    if(existing.rows.length){if(existing.rows[0].fingerprint!==digest)throw new HttpError(409,'Request key already used with different parameters');return {row:existing.rows[0],created:false};}
    if(action==='research'){
      const pending=await tx.query("SELECT id FROM platform_regional_sourcing WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND line_index=$4 AND country=$5 AND quantity=$6 AND supplier_id=$7 AND source_url=$8 AND state IN ('submitting','submission_unknown','submitted') LIMIT 1",[a.workspaceId,s.bomId,s.revision,s.line,s.country,s.quantity,supplier.id,url]);
      if(pending.rows.length)throw new HttpError(409,'An unresolved request already exists for this product page. Refresh saved records instead of submitting again.');
    }
    const count=await tx.query('SELECT count(*)::int AS count FROM platform_regional_sourcing WHERE workspace_id=$1 AND kind=$2 AND created_at>now()-interval \'24 hours\'',[a.workspaceId,action]);
    if(count.rows[0].count>=(action==='research'?10:100))throw new HttpError(429,'Daily workspace limit reached');
    const id=randomUUID();const inserted=await tx.query('INSERT INTO platform_regional_sourcing(id,workspace_id,actor_id,bom_id,bom_revision,line_index,country,quantity,part,supplier_id,request_key,fingerprint,kind,state,source_url,policy_ref,result,model_allowed) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *',[id,a.workspaceId,a.userId,s.bomId,s.revision,s.line,s.country,s.quantity,JSON.stringify(part),supplier.id,key,digest,action,action==='quote'?'completed':'submitting',url,policy?.authorizationRef||null,quote?JSON.stringify(quote):null,allowModel]);
    await audit(tx,a,s.bomId,`regional.${action}.reserve`,key);return {row:inserted.rows[0],created:true};
  });
  if(!reservation.created||action==='quote')return response(publicRow(reservation.row),reservation.created?201:200);
  let crawlerId:string|null=null;try{crawlerId=await startResearch(config!,supplier,policy!,url!);}catch{/* no replay; an upstream job may have been created */}
  // System finalization of the already-authorized reservation; never re-send on ambiguous failure.
  await db.query('UPDATE platform_regional_sourcing SET state=$1,crawler_job_id=$2,error_code=$3,updated_at=now() WHERE id=$4 AND workspace_id=$5 AND state=\'submitting\'',[crawlerId?'submitted':'submission_unknown',crawlerId,crawlerId?null:'submission_not_confirmed',reservation.row.id,a.workspaceId]);
  return await db.transaction(async tx=>{await authorize(tx,a,false,s);const r=await tx.query('SELECT * FROM platform_regional_sourcing WHERE id=$1 AND workspace_id=$2',[reservation.row.id,a.workspaceId]);return response(publicRow(r.rows[0]),202);});
}catch(e){return failure(e);}}
