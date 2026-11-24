import {forwardWorkspace} from '@/lib/core-workspace';
import {consumeLimit,limitedJson} from '@/lib/request-limits';
import {allowsMutation} from '@/lib/request-origin';
import {record,uuid,InputError} from '@/lib/regional/model';
import {KnowledgeError,revisionNumber,type Member} from '@/lib/regional/knowledge';
import {createSchedule,listSchedules,changeSchedule} from '@/lib/regional/research-schedules';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
function result(v:unknown,status=200){return Response.json(v,{status,headers});}
function fail(e:unknown){
 if(e instanceof KnowledgeError)return result({error:e.message},e.status);
 if(e instanceof InputError||e instanceof SyntaxError)return result({error:'Invalid research schedule request'},400);
 if(e instanceof Error&&e.message==='BODY_LIMIT')return result({error:'Request too large'},413);
 return result({error:'Research scheduling unavailable. No job was confirmed.'},503);
}
async function actor():Promise<Member>{
 const r=await forwardWorkspace('context',undefined,{method:'GET'});
 if(!r.ok)throw new KnowledgeError(r.status===401?401:503,r.status===401?'Sign in to manage research':'Workspace temporarily unavailable');
 const a=record(record(await r.json()).actor);
 if(!['owner','design_engineer','viewer'].includes(String(a.role)))throw new KnowledgeError(403,'Invalid workspace role');
 return {userId:uuid(a.user_id),workspaceId:uuid(a.workspace_id),role:String(a.role)};
}
export async function GET(request:Request){
 try{
  const a=await actor();
  if(!await consumeLimit('regional_schedule_read',a.workspaceId,40,60))throw new KnowledgeError(429,'Research lookup rate exceeded');
  const p=new URL(request.url).searchParams;
  if(uuid(p.get('workspaceId'))!==a.workspaceId)throw new KnowledgeError(409,'Active workspace changed');
  const data=await listSchedules(a,uuid(p.get('bomId')),revisionNumber(p.get('revision')));
  return result({schedules:data,schedulerEnabled:process.env.NEXUS_RESEARCH_SCHEDULER_ENABLED==='true'});
 }catch(e){return fail(e);}
}
export async function POST(request:Request){
 try{
  if(!allowsMutation(request))throw new KnowledgeError(403,'Cross-site scheduling is not allowed');
  const a=await actor();
  if(a.role==='viewer')throw new KnowledgeError(403,'Read-only workspace');
  if(!await consumeLimit('regional_schedule_write',a.workspaceId,10,3600))throw new KnowledgeError(429,'Schedule creation limit reached');
  const input=record(await limitedJson(request,8192));
  if(input.action!=='create')throw new KnowledgeError(400,'Invalid schedule action');
  const data=await createSchedule(a,input);
  return result({schedule:data},201);
 }catch(e){return fail(e);}
}
export async function PATCH(request:Request){
 try{
  if(!allowsMutation(request))throw new KnowledgeError(403,'Cross-site scheduling is not allowed');
  const a=await actor();
  if(a.role==='viewer')throw new KnowledgeError(403,'Read-only workspace');
  if(!await consumeLimit('regional_schedule_manage',a.workspaceId,30,3600))throw new KnowledgeError(429,'Schedule management limit reached');
  const body=record(await limitedJson(request,2048));
  if(uuid(body.workspaceId)!==a.workspaceId)throw new KnowledgeError(409,'Active workspace changed');
  if(!['pause','resume','delete'].includes(String(body.action)))throw new KnowledgeError(400,'Invalid management action');
  return result(await changeSchedule(a,uuid(body.bomId),revisionNumber(body.revision),uuid(body.id),body.action as 'pause'|'resume'|'delete'));
 }catch(e){return fail(e);}
}
