import {forwardWorkspace} from '@/lib/core-workspace';
import {db} from '@/lib/db';
import {consumeLimit} from '@/lib/request-limits';
import {country,countryCurrency,record,uuid,InputError} from '@/lib/regional/model';
import {buildEvidence,type EvidenceLine,type SourceRecord,type WorkerPart} from '@/lib/regional/intelligence';
import {KnowledgeError,requireBom,revisionNumber,type Member} from '@/lib/regional/knowledge';
import {planResearch,type AgentDocument,type AgentHit} from '@/lib/regional/agent';

export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
function reply(value:unknown,status=200){return Response.json(value,{status,headers});}
function fail(error:unknown){
 if(error instanceof KnowledgeError)return reply({error:error.message},error.status);
 if(error instanceof InputError)return reply({error:error.message},400);
 return reply({error:'Agent review unavailable. No actions were executed or inferred.'},503);
}
async function actor():Promise<Member>{
 const r=await forwardWorkspace('context',undefined,{method:'GET'});
 if(!r.ok)throw new KnowledgeError(r.status===401?401:503,r.status===401?'Sign in to review procurement evidence':'Workspace unavailable');
 const a=record(record(await r.json()).actor);
 if(!['owner','design_engineer','viewer'].includes(String(a.role)))throw new KnowledgeError(403,'Workspace role unavailable');
 return {userId:uuid(a.user_id),workspaceId:uuid(a.workspace_id),role:String(a.role)};
}
function topicValue(s:string|null){
 if(s===null)return null;
 const t=s.trim();
 if(t.length<2||t.length>100||!/[a-z0-9]/i.test(t))throw new KnowledgeError(400,'Search topic must contain 2–100 characters');
 return t;
}
export async function GET(req:Request){
 try{
  const a=await actor();
  if(!await consumeLimit('regional_agent_read',a.workspaceId,20,60)||!await consumeLimit('regional_agent_global','global',300,60))throw new KnowledgeError(429,'Agent review limit reached');
  const p=new URL(req.url).searchParams;
  if(uuid(p.get('workspaceId'))!==a.workspaceId)throw new KnowledgeError(409,'Active workspace changed');
  const bomId=uuid(p.get('bomId')),rev=revisionNumber(p.get('revision')),dest=country(p.get('country')),topic=topicValue(p.get('topic'));
  const data=await db.transaction(async tx=>{
   const bom=await requireBom(tx,a,bomId,rev,false);
   const lines:EvidenceLine[]=bom.items.map((v,i)=>{
    const part=record(v),quantity=Number(part.quantity);
    if(typeof part.partNumber!=='string'||!part.partNumber.trim()||part.partNumber.length>128||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000000)throw new KnowledgeError(409,'Invalid saved BOM');
    return {id:'line-'+i,mpn:part.partNumber,manufacturer:typeof part.manufacturer==='string'?part.manufacturer:'',quantity};
   });
   const sources=await tx.query('SELECT line_index,quantity,kind,state,supplier_id,source_url,result,created_at,updated_at FROM platform_regional_sourcing WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND country=$4 AND state=$5 ORDER BY created_at DESC LIMIT 301',[a.workspaceId,bomId,rev,dest,'completed']);
   if(sources.rows.length>300)throw new KnowledgeError(409,'Evidence limit exceeded; narrow BOM research results');
   const workerResults=await tx.query("SELECT updated_at,result FROM platform_jobs WHERE workspace_id=$1 AND bom_id=$2 AND bom_revision=$3 AND state='completed' ORDER BY updated_at DESC LIMIT 1",[a.workspaceId,bomId,rev]);
   const worker=workerResults.rows[0];
   const results=worker?.result&&typeof worker.result==='object'&&!Array.isArray(worker.result)?(worker.result as Record<string,unknown>).results:null;
   const parts=Array.isArray(results)&&results.length===lines.length?results as WorkerPart[]:[];
   const docs=await tx.query('SELECT d.id AS document_id,d.line_index,d.name,v.sha256,v.version,v.page_count,v.truncated FROM platform_knowledge_documents d JOIN platform_knowledge_versions v ON v.workspace_id=d.workspace_id AND v.document_id=d.id AND v.version=d.active_version WHERE d.workspace_id=$1 AND d.bom_id=$2 ORDER BY d.updated_at DESC LIMIT 5',[a.workspaceId,bomId]);
   const documents:AgentDocument[]=docs.rows.map(row=>({documentId:String(row.document_id),lineIndex:Number(row.line_index),name:String(row.name),sha256:String(row.sha256),version:Number(row.version),pageCount:Number(row.page_count),truncated:row.truncated===true}));
   let hits:AgentHit[]=[];
   if(topic!==null&&documents.length){
    const match=await tx.query("SELECT d.id AS document_id,d.line_index,d.name,v.sha256,v.version,p.page_number,substring(ts_headline('simple',p.text_content,plainto_tsquery('simple',$3),'StartSel=[,StopSel=],MaxWords=35,MinWords=12,MaxFragments=1'),1,280) AS excerpt,ts_rank_cd(p.text_search,plainto_tsquery('simple',$3)) AS rank FROM platform_knowledge_documents d JOIN platform_knowledge_versions v ON v.document_id=d.id AND v.workspace_id=d.workspace_id AND v.version=d.active_version JOIN platform_knowledge_pages p ON p.version_id=v.id AND p.workspace_id=v.workspace_id WHERE d.workspace_id=$1 AND d.bom_id=$2 AND p.text_search @@ plainto_tsquery('simple',$3) ORDER BY rank DESC,d.id,p.page_number LIMIT 15",[a.workspaceId,bomId,topic]);
    hits=match.rows.map(row=>({
      documentId:String(row.document_id),lineIndex:Number(row.line_index),document:String(row.name),
      sha256:String(row.sha256),version:Number(row.version),page:Number(row.page_number),
      excerpt:String(row.excerpt).slice(0,280),rank:Number(row.rank),
      citation:'sha256:'+String(row.sha256)+':v'+String(row.version)+':p'+String(row.page_number)
    }));
   }
   return {label:String(bom.name),lines,rows:sources.rows as SourceRecord[],worker:parts.length?{parts,updatedAt:worker.updated_at}:null,documents,hits};
  });
  const snapshot=buildEvidence({label:data.label,country:dest,currency:countryCurrency[dest],revision:rev,lines:data.lines,rows:data.rows,worker:data.worker});
  const plan=planResearch(snapshot,data.documents,data.hits);
  return reply({plan,records:snapshot.records,documents:data.documents,hits:data.hits,source:'workspace_evidence',readOnly:true,
   notice:'This endpoint never starts a crawl, changes stored data, approves a substitute or places a purchase order.'});
 }catch(error){return fail(error);}
}
