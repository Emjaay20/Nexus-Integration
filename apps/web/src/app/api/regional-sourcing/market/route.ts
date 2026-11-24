import {forwardWorkspace} from '@/lib/core-workspace';
import {db} from '@/lib/db';
import {allowsMutation} from '@/lib/request-origin';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {fxCurrency,getFxReference,FxError} from '@/lib/regional/fx';
import {feedAvailable,feedPolicies,getFeedCandidates,FeedError} from '@/lib/regional/feed';
import {record,selection,supplierFor,uuid,InputError} from '@/lib/regional/model';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const HEADERS={'Cache-Control':'no-store'};
class MarketError extends Error{constructor(readonly status:number,message:string){super(message);}}
function result(body:unknown,status=200){return Response.json(body,{status,headers:HEADERS});}
async function actor(){
  const res=await forwardWorkspace('context',undefined,{method:'GET'});
  if(!res.ok)throw new MarketError(res.status===401?401:503,res.status===401?'Sign in first':'Workspace unavailable');
  const a=record(record(await res.json()).actor);
  const role = typeof a.role === 'string' ? a.role : '';
  if(!['owner','design_engineer','viewer'].includes(role))throw new MarketError(403,'Workspace role unavailable');
  return {workspaceId:uuid(a.workspace_id),userId:uuid(a.user_id),role};
}
async function budget(scope:string,identity:string,max:number,seconds:number){if(!await consumeLimit('regional_market_'+scope,identity,max,seconds))throw new MarketError(429,'Regional market lookup limit reached');}
function fail(e:unknown){
  if(e instanceof MarketError)return result({error:e.message},e.status);
  if(e instanceof FxError)return result({error:'Reference FX rate unavailable',reason:e.code},503);
  if(e instanceof FeedError)return result({error:'Supplier feed unavailable or invalid',reason:e.code},e.code==='partner_feed_not_authorized'?409:503);
  if(e instanceof InputError)return result({error:e.message},400);
  if(e instanceof SyntaxError)return result({error:'Invalid request JSON'},400);
  if(e instanceof Error&&e.message==='BODY_LIMIT')return result({error:'Request too large'},413);
  return result({error:'Regional market temporarily unavailable'},503);
}
export async function GET(req:Request){
  try{
    const a=await actor();await budget('fx',a.workspaceId,12,3600);await budget('fx_global','all',400,3600);
    if(process.env.NEXUS_REGIONAL_FX_ENABLED!=='true')throw new MarketError(409,'FX reference provider is not enabled');
    const u=new URL(req.url);const base=fxCurrency(u.searchParams.get('base')),quote=fxCurrency(u.searchParams.get('quote'));
    return result(await getFxReference(base,quote));
  }catch(e){return fail(e);}
}
export async function POST(req:Request){
  try{
    if(!allowsMutation(req))throw new MarketError(403,'Cross-site changes are not allowed');
    const a=await actor();if(a.role==='viewer'||a.userId==='00000000-0000-0000-0000-000000000001')throw new MarketError(403,'Workspace read only');
    const input=record(await limitedJson(req,8_192));
    if(input.action!=='feed_preview')throw new InputError('Unknown market action');
    if(uuid(input.workspaceId)!==a.workspaceId)throw new MarketError(409,'Active workspace changed');
    const s=selection(input);const supplier=supplierFor(input.supplierId);
    const policies=feedPolicies(process.env.NEXUS_REGIONAL_FEED_POLICIES),policy=policies.get(supplier.id);
    if(!policy||!feedAvailable()||!policy.allowedCountries.includes(s.country))throw new MarketError(409,'Partner feed not authorised for this destination');
    await budget('feed',a.workspaceId,10,3600);await budget('feed_global','all',100,3600);
    const part=await db.transaction(async tx=>{
      // Role and active workspace are authoritative in PostgreSQL, not from a browser or cookie.
      const m=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2 FOR SHARE OF m,c',[a.userId,a.workspaceId]);
      if(!m.rows.length||!['owner','design_engineer'].includes(m.rows[0].role))throw new MarketError(403,'Workspace membership changed');
      const b=await tx.query('SELECT revision,items FROM platform_boms WHERE id=$1 AND workspace_id=$2 FOR SHARE',[s.bomId,a.workspaceId]);
      if(!b.rows.length)throw new MarketError(404,'BOM not found');
      if(Number(b.rows[0].revision)!==s.revision)throw new MarketError(409,'BOM revision changed');
      const items=b.rows[0].items;
      if(!Array.isArray(items)||!items[s.line]||typeof items[s.line].partNumber!=='string'||!items[s.line].partNumber.trim()||!Number.isSafeInteger(items[s.line].quantity)||items[s.line].quantity<1)throw new MarketError(409,'BOM line invalid');
      return {partNumber:items[s.line].partNumber as string,manufacturer:typeof items[s.line].manufacturer==='string'?items[s.line].manufacturer as string:''};
    });
    const candidates=await getFeedCandidates(supplier,policy,part,s.country);
    return result({supplierId:supplier.id,country:s.country,partNumber:part.partNumber,candidates,reviewRequired:true});
  }catch(e){return fail(e);}
}
