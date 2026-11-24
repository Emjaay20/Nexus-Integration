import {forwardWorkspace} from '@/lib/core-workspace';
import {db} from '@/lib/db';
import {consumeLimit} from '@/lib/request-limits';
import {allowsMutation} from '@/lib/request-origin';
import {record,uuid} from '@/lib/regional/model';
import {extractPDF,PdfError} from '@/lib/regional/pdf-extract';
import {KnowledgeError,storeDocument} from '@/lib/regional/knowledge';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const headers={'Cache-Control':'no-store'};
class UploadError extends Error{constructor(readonly status:number,message:string){super(message)}}
function reply(value:unknown,status=200){return Response.json(value,{status,headers});}
function fail(e:unknown){
 if(e instanceof UploadError)return reply({error:e.message},e.status);
 if(e instanceof KnowledgeError)return reply({error:e.message},e.status);
 if(e instanceof PdfError)return reply({error:'PDF text extraction unavailable or unsupported',reason:e.code},422);
 return reply({error:'Datasheet processing temporarily unavailable. No document evidence was saved.'},503);
}
function boundedInt(x:FormDataEntryValue|null,max:number,label:string):number{
 const n=typeof x==='string'?Number(x):NaN;
 if(!Number.isSafeInteger(n)||n<0||n>max)throw new UploadError(400,'Invalid '+label);
 return n;
}
async function boundedFormData(req:Request,max:number):Promise<FormData>{
 const ct=req.headers.get('content-type')||'';
 if(!ct.startsWith('multipart/form-data;')||!ct.includes('boundary='))throw new UploadError(415,'Upload a multipart PDF form');
 const length=req.headers.get('content-length');
 if(length&&Number(length)>max)throw new UploadError(413,'PDF request exceeds limit');
 const reader=req.body?.getReader();if(!reader)throw new UploadError(400,'No PDF uploaded');
 const chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;
   if(total>max){await reader.cancel();throw new UploadError(413,'PDF request exceeds limit');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(total);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.byteLength;}
 try{return await new Response(bytes,{headers:{'content-type':ct}}).formData();}
 catch{throw new UploadError(400,'Invalid multipart PDF content');}
}
export async function POST(req:Request){
 try{
  if(!allowsMutation(req))throw new UploadError(403,'Cross-site PDF submissions are not allowed');
  const ctx=await forwardWorkspace('context',undefined,{method:'GET'});
  if(!ctx.ok)throw new UploadError(ctx.status===401?401:503,ctx.status===401?'Sign in to analyse a datasheet':'Workspace unavailable');
  const actor=record(record(await ctx.json()).actor);
  const userId=uuid(actor.user_id),workspaceId=uuid(actor.workspace_id);
  if(!['owner','design_engineer'].includes(String(actor.role))||userId==='00000000-0000-0000-0000-000000000001')throw new UploadError(403,'Workspace is read only');
  if(!await consumeLimit('regional_pdf_upload',workspaceId,8,3600)||!await consumeLimit('regional_pdf_global','global',100,3600))throw new UploadError(429,'PDF analysis limit reached');
  const form=await boundedFormData(req,1650000);
  const provided=uuid(form.get('workspaceId')),bomId=uuid(form.get('bomId'));
  if(workspaceId!==provided)throw new UploadError(409,'Active workspace changed');
  const revision=boundedInt(form.get('revision'),Number.MAX_SAFE_INTEGER,'revision');
  const line=boundedInt(form.get('line'),49,'BOM line');
  if(revision<1)throw new UploadError(400,'Invalid revision');
  const file=form.get('file');
  if(!(file instanceof File)||file.type!=='application/pdf'||file.size>1500000||file.size<32)throw new UploadError(415,'Upload a PDF text layer up to 1.5 MB');
  // Authoritative DB membership and BOM revision are checked before any potentially expensive PDF decoding.
  const part=await db.transaction(async tx=>{
   const m=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2 FOR SHARE OF m,c',[userId,workspaceId]);
   if(!m.rows.length||!['owner','design_engineer'].includes(m.rows[0].role))throw new UploadError(403,'Membership revoked');
   const bom=await tx.query('SELECT revision,items FROM platform_boms WHERE workspace_id=$1 AND id=$2 FOR SHARE',[workspaceId,bomId]);
   if(!bom.rows.length)throw new UploadError(404,'BOM not found');
   if(Number(bom.rows[0].revision)!==revision)throw new UploadError(409,'BOM revision changed');
   const items=bom.rows[0].items;
   const entry=Array.isArray(items)?items[line]:null;
   if(!entry||typeof entry.partNumber!=='string'||!entry.partNumber.trim())throw new UploadError(400,'Invalid BOM line');
   return {line,mpn:entry.partNumber,manufacturer:typeof entry.manufacturer==='string'?entry.manufacturer:''};
  });
  const bytes=new Uint8Array(await file.arrayBuffer());
  const doc=await extractPDF(bytes,file.name);
  // An explicit opt-in persists only extracted text, properties and hashes—not the PDF file itself.
  const persist=form.get('persist')==='true';
  const existing=form.get('documentId');
  if(existing!==null&&(!persist||typeof existing!=='string'))throw new UploadError(400,'Document versioning requires explicit save');
  const saved=persist?await storeDocument({userId,workspaceId,role:String(actor.role)},{bomId,revision,line},doc,existing?uuid(existing):null):null;
  return reply({document:doc,part,saved,disclaimer:'Uploaded document is not authenticated. Source PDF bytes are removed after extraction; only extracted text is persisted when you explicitly select Save to knowledge base. No engineering alternative is qualified.'});
 }catch(e){return fail(e);}
}
