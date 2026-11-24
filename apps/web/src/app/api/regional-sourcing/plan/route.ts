import {forwardWorkspace} from '@/lib/core-workspace';
import {db} from '@/lib/db';
import {consumeLimit} from '@/lib/request-limits';
import {country,countryCurrency,record,supplierFor,uuid,type Quote,InputError} from '@/lib/regional/model';
import {planBOM,type PlanScenario,type PlanLine,type PlanOffer,type PlanSupplier,PlanError} from '@/lib/regional/planner';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
class PlannerHttpError extends Error{constructor(readonly status:number,message:string){super(message);}}
function fail(e:unknown){
 if(e instanceof PlannerHttpError)return Response.json({error:e.message},{status:e.status,headers});
 if(e instanceof InputError||e instanceof PlanError)return Response.json({error:e.message},{status:400,headers});
 return Response.json({error:'Planning service unavailable. No estimate was fabricated.'},{status:503,headers});
}
function int(v:string|null,max:number,label:string):number{
 const n=Number(v);if(!v||!Number.isSafeInteger(n)||n<1||n>max)throw new PlannerHttpError(400,'Invalid '+label);return n;
}
export async function GET(req:Request){
 try{
  const context=await forwardWorkspace('context',undefined,{method:'GET'});
  if(!context.ok)throw new PlannerHttpError(context.status===401?401:503,context.status===401?'Sign in to load saved quotations':'Workspace temporarily unavailable');
  const actor=record(record(await context.json()).actor);
  const userId=uuid(actor.user_id),workspaceId=uuid(actor.workspace_id);
  const params=new URL(req.url).searchParams;
  if(uuid(params.get('workspaceId'))!==workspaceId)throw new PlannerHttpError(409,'Active workspace changed. Reload.');
  const bomId=uuid(params.get('bomId')),revision=int(params.get('revision'),Number.MAX_SAFE_INTEGER,'revision');
  const buildQty=int(params.get('buildQty')||'1',200,'production multiplier');
  const destination=country(params.get('country'));
  const allowed=await consumeLimit('regional_plan_read',workspaceId,20,60);
  if(!allowed)throw new PlannerHttpError(429,'Planning lookup limit reached');
  const data=await db.transaction(async tx=>{
   const membership=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2 FOR SHARE OF m,c',[userId,workspaceId]);
   if(!membership.rows.length||!['owner','design_engineer','viewer'].includes(membership.rows[0].role))throw new PlannerHttpError(403,'Membership changed');
   const result=await tx.query('SELECT name,revision,items FROM platform_boms WHERE id=$1 AND workspace_id=$2 FOR SHARE',[bomId,workspaceId]);
   if(!result.rows.length)throw new PlannerHttpError(404,'Saved BOM not found');
   const bom=result.rows[0];
   if(Number(bom.revision)!==revision)throw new PlannerHttpError(409,'BOM revision changed. Reload the latest revision.');
   if(!Array.isArray(bom.items)||bom.items.length<1||bom.items.length>50)throw new PlannerHttpError(400,'Planner supports 1 to 50 BOM lines');
   const records=await tx.query("SELECT line_index,quantity,part,supplier_id,result,created_at FROM platform_regional_sourcing WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND country=$4 AND kind='quote' AND state='completed' ORDER BY created_at DESC,id DESC LIMIT 501",[workspaceId,bomId,revision,destination]);
   if(records.rows.length>500)throw new PlannerHttpError(409,'More than 500 saved quotations. Export or narrow the set before planning.');
   return {name:String(bom.name),items:bom.items as unknown[],quotes:records.rows as Array<Record<string,unknown>>};
  });
  const lines:PlanLine[]=data.items.map((v,i)=>{
   const part=record(v),q=Number(part.quantity);
   if(typeof part.partNumber!=='string'||!Number.isSafeInteger(q)||q<1||q*buildQty>10000)throw new PlannerHttpError(400,'BOM line quantity exceeds planner limits');
   return {id:'line-'+i,mpn:part.partNumber,manufacturer:typeof part.manufacturer==='string'?part.manufacturer:'',quantity:q*buildQty};
  });
  const target=countryCurrency[destination],offers:PlanOffer[]=[],suppliers=new Map<string,PlanSupplier>();
  let ignored=0;
  for(const row of data.quotes){
   try{
    const idx=Number(row.line_index),line=lines[idx];
    if(!line||Number(row.quantity)!==line.quantity) {ignored++;continue;}
    const oldPart=record(row.part),q=record(row.result) as unknown as Quote;
    if(typeof oldPart.partNumber!=='string'||oldPart.partNumber.trim().toUpperCase()!==line.mpn.trim().toUpperCase()||q.quotedQuantity!==line.quantity){ignored++;continue;}
    if(typeof oldPart.manufacturer==='string'&&line.manufacturer&&oldPart.manufacturer.trim().toUpperCase()!==line.manufacturer.trim().toUpperCase()){ignored++;continue;}
    // Earlier saved quotes can lack a real FX conversion. Exclude rather than fabricating a rate.
    if(!Number.isSafeInteger(q.fx6)||q.fx6===null||q.fx6<=0||!Number.isSafeInteger(q.unitPrice4)||q.unitPrice4<=0){ignored++;continue;}
    if(typeof q.currency!=='string'||typeof q.validUntil!=='string'){ignored++;continue;}
    const supplier=supplierFor(row.supplier_id);
    const source:PlanOffer={
      id:'quote-'+offers.length,lineId:line.id,supplierId:supplier.id,mpn:line.mpn,manufacturer:line.manufacturer,
      stock:q.stock,moq:q.moq,minQuantity:line.quantity,maxQuantity:line.quantity,
      tiers:[{minQty:1,unitPrice4:String(q.unitPrice4)}],currency:q.currency,fx6:String(q.fx6),
      shipping2:q.shipping2===null?null:String(q.shipping2),fees2:q.fees2===null?null:String(q.fees2),
      validUntil:q.validUntil,identityConfirmed:q.identityConfirmed,destinationConfirmed:q.destinationConfirmed,
      evidence:'customer_reported'
    };
    offers.push(source);
    suppliers.set(supplier.id,{id:supplier.id,name:supplier.name,region:supplier.regions.includes(destination)?'local':'international',setupMinor:'0'});
   }catch{ignored++;}
  }
  if(!suppliers.size){suppliers.set('no-qualified-offers',{id:'no-qualified-offers',name:'No qualified supplier quotes',region:'local',setupMinor:'0'});}
  const scenario:PlanScenario={label:data.name+' · saved customer quotations',country:destination,currency:target,lines,suppliers:[...suppliers.values()],offers};
  const result=planBOM(scenario);
  return Response.json({scenario,result,ignoredQuotes:ignored,
   note:'Saved quotations apply only to the exact recorded quantity. Per-line shipping and fees are counted independently. No unverified consolidation savings or partial-quantity prices are assumed. Research observations are never used as verified offers.'},{headers});
 }catch(e){return fail(e);}
}
