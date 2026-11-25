import {forwardWorkspace} from '@/lib/core-workspace';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {allowsMutation} from '@/lib/request-origin';
import {record,uuid,InputError} from '@/lib/regional/model';
import {KnowledgeError,listKnowledge,removeDocument,revisionNumber,type Member} from '@/lib/regional/knowledge';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
function reply(v:unknown,status=200){return Response.json(v,{status,headers});}
function failure(e:unknown){
 if(e instanceof KnowledgeError)return reply({error:e.message},e.status);
 if(e instanceof InputError||e instanceof SyntaxError)return reply({error:'Invalid knowledge request'},400);
 if(e instanceof Error&&e.message==='BODY_LIMIT')return reply({error:'Request too large'},413);
 return reply({error:'Knowledge base unavailable. No search results were fabricated.'},503);
}
async function actor():Promise<Member>{
 const res=await forwardWorkspace('context',undefined,{method:'GET'});
 if(!res.ok)throw new KnowledgeError(res.status===401?401:503,res.status===401?'Sign in to access knowledge base':'Workspace temporarily unavailable');
 const a=record(record(await res.json()).actor);
 if(!['owner','design_engineer','viewer'].includes(String(a.role)))throw new KnowledgeError(403,'Workspace role unavailable');
 return {userId:uuid(a.user_id),workspaceId:uuid(a.workspace_id),role:String(a.role)};
}
export async function GET(req:Request){
 try{
  const a=await actor();
  if(!await consumeLimit('regional_knowledge_read',a.workspaceId,25,60))throw new KnowledgeError(429,'Knowledge request limit reached');
  const p=new URL(req.url).searchParams;
  if(uuid(p.get('workspaceId'))!==a.workspaceId)throw new KnowledgeError(409,'Active workspace changed');
  const bomId=uuid(p.get('bomId')),rev=revisionNumber(p.get('revision'));
  const q=p.has('query')?p.get('query'):null;
  if(q!==null&&(q.length<2||q.length>160))throw new KnowledgeError(400,'Invalid search query');
  return reply(await listKnowledge(a,bomId,rev,q,p.get('documentId')));
 }catch(e){return failure(e);}
}
export async function DELETE(req:Request){
 try{
  if(!allowsMutation(req))throw new KnowledgeError(403,'Cross-site document deletion is not allowed');
  const a=await actor();
  if(a.role==='viewer'||a.userId==='00000000-0000-0000-0000-000000000001')throw new KnowledgeError(403,'Read-only workspace');
  if(!await consumeLimit('regional_knowledge_delete',a.workspaceId,10,3600))throw new KnowledgeError(429,'Deletion limit reached');
  const body=record(await limitedJson(req,2048));
  if(uuid(body.workspaceId)!==a.workspaceId)throw new KnowledgeError(409,'Active workspace changed');
  const result=await removeDocument(a,uuid(body.bomId),revisionNumber(body.revision),uuid(body.documentId));
  return reply(result);
 }catch(e){return failure(e);}
}
