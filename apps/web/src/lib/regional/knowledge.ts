/** Persistent, tenant-isolated PDF text knowledge. All queries must bind workspace and BOM.
 * No raw PDF bytes are persisted; page text is customer-provided and unverified.
 */
import {randomUUID} from 'node:crypto';
import {db} from '@/lib/db';
import {record,uuid} from './model';
import type {DatasheetDocument} from './document-intelligence';
type Tx=Parameters<Parameters<typeof db.transaction>[0]>[0];
export class KnowledgeError extends Error{constructor(readonly status:number,message:string){super(message)}}
export type Member={userId:string;workspaceId:string;role:string};
export type Location={bomId:string;revision:number;line:number};
export function revisionNumber(v:unknown){const n=Number(v);if(!Number.isSafeInteger(n)||n<1||n>Number.MAX_SAFE_INTEGER)throw new KnowledgeError(400,'Invalid BOM revision');return n;}
export function lineNumber(v:unknown){const n=Number(v);if(!Number.isSafeInteger(n)||n<0||n>=50)throw new KnowledgeError(400,'Invalid BOM line');return n;}
export async function requireBom(tx:Tx,actor:Member,bomId:string,rev:number,write=false){
 const membership=await tx.query('SELECT m.role FROM platform_memberships m JOIN platform_user_context c ON c.user_id=m.user_id AND c.workspace_id=m.workspace_id WHERE m.user_id=$1 AND m.workspace_id=$2 FOR SHARE OF m,c',[actor.userId,actor.workspaceId]);
 const role=membership.rows[0]?.role;
 if(!role||!['owner','design_engineer','viewer'].includes(role)||write&&!['owner','design_engineer'].includes(role)||write&&actor.userId==='00000000-0000-0000-0000-000000000001')throw new KnowledgeError(403,'Workspace membership does not permit this operation');
 const result=await tx.query('SELECT id,revision,name,items FROM platform_boms WHERE id=$1 AND workspace_id=$2 '+(write?'FOR UPDATE':'FOR SHARE'),[bomId,actor.workspaceId]);
 if(!result.rows.length)throw new KnowledgeError(404,'BOM not found');
 const bom=result.rows[0];
 if(Number(bom.revision)!==rev)throw new KnowledgeError(409,'BOM revision changed. Reload before continuing.');
 if(!Array.isArray(bom.items)||bom.items.length<1||bom.items.length>50)throw new KnowledgeError(409,'Invalid saved BOM');
 return bom as {id:string;revision:number;name:string;items:unknown[]};
}
function validateDoc(doc:DatasheetDocument){
 if(!doc||!/^[a-f0-9]{64}$/.test(doc.sha256)||doc.id!=='pdf-'+doc.sha256.slice(0,16)||!Array.isArray(doc.pages)||doc.pages.length<1||doc.pages.length>12||!Array.isArray(doc.properties))throw new KnowledgeError(422,'Invalid extracted document');
 let total=0;
 for(const [i,p] of doc.pages.entries()){
  if(p.page!==i+1||typeof p.text!=='string'||p.text.length>10000||Buffer.byteLength(p.text,'utf8')>12000)throw new KnowledgeError(422,'PDF text page exceeds storage budget');
  total+=Buffer.byteLength(p.text,'utf8');
 }
 if(total>60000||doc.properties.length>50)throw new KnowledgeError(422,'Extracted text exceeds budget');
 if(typeof doc.name!=='string'||!doc.name.trim()||doc.name.length>160)throw new KnowledgeError(422,'Invalid document name');
}
export async function storeDocument(actor:Member,loc:Location,doc:DatasheetDocument,existingId:string|null=null){
 validateDoc(doc);
 return db.transaction(async tx=>{
  const bom=await requireBom(tx,actor,loc.bomId,loc.revision,true);
  const part=record(bom.items[loc.line]);const mpn=part.partNumber;
  if(typeof mpn!=='string'||!mpn.trim()||mpn.length>128)throw new KnowledgeError(400,'Invalid BOM part');
  let id:string;
  if(existingId){
   id=uuid(existingId);
   const previous=await tx.query('SELECT id,line_index,mpn,active_version FROM platform_knowledge_documents WHERE workspace_id=$1 AND bom_id=$2 AND id=$3 FOR UPDATE',[actor.workspaceId,loc.bomId,id]);
   if(!previous.rows.length||Number(previous.rows[0].line_index)!==loc.line||String(previous.rows[0].mpn).toUpperCase()!==mpn.toUpperCase())throw new KnowledgeError(409,'Document does not belong to the selected BOM component');
  }else{
   // Serializes per BOM capacity across all concurrently uploaded documents.
   const count=await tx.query('SELECT count(*)::int AS total FROM platform_knowledge_documents WHERE workspace_id=$1 AND bom_id=$2',[actor.workspaceId,loc.bomId]);
   if(Number(count.rows[0].total)>=5)throw new KnowledgeError(409,'At most five documents can be saved per BOM');
   id=randomUUID();
   await tx.query('INSERT INTO platform_knowledge_documents(id,workspace_id,bom_id,line_index,mpn,name,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,actor.workspaceId,loc.bomId,loc.line,mpn,doc.name,actor.userId]);
  }
  // New logical docs have version zero. Existing docs are row locked.
  const parent=await tx.query('SELECT active_version FROM platform_knowledge_documents WHERE workspace_id=$1 AND id=$2 FOR UPDATE',[actor.workspaceId,id]);
  const current=Number(parent.rows[0].active_version);
  if(current){
   const prev=await tx.query('SELECT id,sha256 FROM platform_knowledge_versions WHERE workspace_id=$1 AND document_id=$2 AND version=$3',[actor.workspaceId,id,current]);
   if(prev.rows[0]?.sha256===doc.sha256)return {documentId:id,version:current,sha256:doc.sha256,unchanged:true,pageCount:doc.pages.length};
  }
  if(current>=20)throw new KnowledgeError(409,'Version limit reached; archive or remove this document');
  const version=current+1,versionId=randomUUID();
  await tx.query('INSERT INTO platform_knowledge_versions(id,workspace_id,document_id,version,sha256,source_name,page_count,truncated,properties,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[versionId,actor.workspaceId,id,version,doc.sha256,doc.name,doc.pages.length,doc.truncated,JSON.stringify(doc.properties),actor.userId]);
  for(const p of doc.pages)await tx.query('INSERT INTO platform_knowledge_pages(workspace_id,version_id,page_number,text_content) VALUES($1,$2,$3,$4)',[actor.workspaceId,versionId,p.page,p.text]);
  await tx.query('UPDATE platform_knowledge_documents SET active_version=$1,name=$2,updated_at=now() WHERE workspace_id=$3 AND id=$4',[version,doc.name,actor.workspaceId,id]);
  await tx.query("INSERT INTO platform_audit(id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,'knowledge.document.save','allow','extracted PDF text saved with version provenance',$5)",[randomUUID(),actor.workspaceId,actor.userId,loc.bomId,randomUUID()]);
  return {documentId:id,version,sha256:doc.sha256,unchanged:false,pageCount:doc.pages.length};
 });
}
export async function listKnowledge(actor:Member,bomId:string,rev:number,query:string|null,docId:string|null){
 return db.transaction(async tx=>{
  await requireBom(tx,actor,bomId,rev,false);
  if(docId){
   const id=uuid(docId);
   const versions=await tx.query('SELECT v.id,v.document_id,v.version,v.sha256,v.source_name,v.page_count,v.truncated,v.properties,v.created_at,d.line_index,d.mpn FROM platform_knowledge_versions v JOIN platform_knowledge_documents d ON d.id=v.document_id AND d.workspace_id=v.workspace_id WHERE v.workspace_id=$1 AND d.bom_id=$2 AND v.document_id=$3 ORDER BY v.version DESC LIMIT 20',[actor.workspaceId,bomId,id]);
   return {documents:[],versions:versions.rows,hits:[]};
  }
  const docs=await tx.query('SELECT d.id,d.line_index,d.mpn,d.name,d.active_version,d.updated_at,v.sha256,v.page_count,v.truncated FROM platform_knowledge_documents d LEFT JOIN platform_knowledge_versions v ON v.workspace_id=d.workspace_id AND v.document_id=d.id AND v.version=d.active_version WHERE d.workspace_id=$1 AND d.bom_id=$2 ORDER BY d.updated_at DESC,d.id DESC LIMIT 5',[actor.workspaceId,bomId]);
  let hits:unknown[]=[];
  if(query!==null){
   if(typeof query!=='string'||query.length<2||query.length>160||!/[\p{L}\p{N}]/u.test(query))throw new KnowledgeError(400,'Search query must contain 2–160 meaningful characters');
   const result=await tx.query("SELECT d.id AS document_id,d.name,v.sha256,v.version,p.page_number,substring(p.text_content,1,280) AS excerpt,round(ts_rank_cd(p.text_search,plainto_tsquery('simple',$3))::numeric,4) AS rank FROM platform_knowledge_documents d JOIN platform_knowledge_versions v ON v.document_id=d.id AND v.workspace_id=d.workspace_id AND v.version=d.active_version JOIN platform_knowledge_pages p ON p.version_id=v.id AND p.workspace_id=v.workspace_id WHERE d.workspace_id=$1 AND d.bom_id=$2 AND p.text_search @@ plainto_tsquery('simple',$3) ORDER BY rank DESC,d.id,p.page_number LIMIT 20",[actor.workspaceId,bomId,query]);
   hits=result.rows.map(r=>({...r,citation:'sha256:'+r.sha256+':v'+r.version+':p'+r.page_number}));
  }
  return {documents:docs.rows,hits,versions:[]};
 });
}
export async function removeDocument(actor:Member,bomId:string,rev:number,docId:string){
 return db.transaction(async tx=>{
  await requireBom(tx,actor,bomId,rev,true);
  const id=uuid(docId);
  const removed=await tx.query('DELETE FROM platform_knowledge_documents WHERE workspace_id=$1 AND bom_id=$2 AND id=$3 RETURNING id',[actor.workspaceId,bomId,id]);
  if(!removed.rows.length)throw new KnowledgeError(404,'Document not found');
  await tx.query("INSERT INTO platform_audit(id,workspace_id,actor_id,resource_id,action,decision,reason,request_id) VALUES($1,$2,$3,$4,'knowledge.document.delete','allow','deleted stored document and versions',$5)",[randomUUID(),actor.workspaceId,actor.userId,bomId,randomUUID()]);
  return {deleted:true};
 });
}
