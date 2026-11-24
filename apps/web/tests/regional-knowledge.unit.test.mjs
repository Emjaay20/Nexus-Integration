import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const USER='12345678-1234-4321-8123-123456789abc',WORKSPACE='22345678-1234-4321-8123-123456789abc',BOM='32345678-1234-4321-8123-123456789abc';
const document=()=>({id:'pdf-'+'a'.repeat(16),name:'Example text datasheet',sha256:'a'.repeat(64),pages:[{page:1,text:'Operating voltage: 3.0 to 3.6 V',truncated:false},{page:2,text:'Pin count: 32',truncated:false}],properties:[],truncated:false});
const actor={userId:USER,workspaceId:WORKSPACE,role:'owner'},loc={bomId:BOM,revision:1,line:0};
function fixture(opts={}){
 const state={queries:[],documents:new Map(),versions:new Map(),pages:[],role:'owner',...opts};
 const run=async(sql,args=[])=>{
  state.queries.push({sql,args});
  if(sql.includes('FROM platform_memberships'))return {rows:state.revoked?[]:[{role:state.role}]};
  if(sql.includes('FROM platform_boms'))return {rows:state.missingBom?[]:[{revision:state.stale?2:1,name:'Private BOM',items:[{partNumber:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:5}]}]};
  if(sql.startsWith('SELECT count(*)::int AS total FROM platform_knowledge_documents'))return {rows:[{total:state.documents.size}]};
  if(sql.startsWith('INSERT INTO platform_knowledge_documents')){state.documents.set(args[0],{id:args[0],workspace_id:args[1],bom_id:args[2],line_index:args[3],mpn:args[4],active_version:0});return {rows:[],rowCount:1};}
  if(sql.startsWith('SELECT id,line_index,mpn,active_version FROM platform_knowledge_documents'))return {rows:state.documents.has(args[2])?[state.documents.get(args[2])]:[]};
  if(sql.startsWith('SELECT active_version FROM platform_knowledge_documents'))return {rows:state.documents.has(args[1])?[state.documents.get(args[1])]:[]};
  if(sql.startsWith('SELECT id,sha256 FROM platform_knowledge_versions'))return {rows:state.versions.has(args[1])?[state.versions.get(args[1])]:[]};
  if(sql.startsWith('INSERT INTO platform_knowledge_versions')){state.versions.set(args[2],{id:args[0],sha256:args[4],version:args[3]});return {rows:[]};}
  if(sql.startsWith('INSERT INTO platform_knowledge_pages')){state.pages.push(args);return {rows:[]};}
  if(sql.startsWith('UPDATE platform_knowledge_documents')){const d=state.documents.get(args[3]);d.active_version=args[0];return {rows:[]};}
  if(sql.startsWith('INSERT INTO platform_audit'))return {rows:[]};
  if(sql.startsWith('SELECT d.id,d.line_index'))return {rows:[...state.documents.values()]};
  if(sql.startsWith('SELECT v.id,v.document_id'))return {rows:[]};
  if(sql.includes('ts_rank_cd('))return {rows:[]};
  if(sql.startsWith('DELETE FROM platform_knowledge_documents')){if(!state.documents.has(args[2]))return {rows:[]};state.documents.delete(args[2]);return {rows:[{id:args[2]}]};}
  throw Error('Unexpected query '+sql);
 };
 const mock={transaction:fn=>fn({query:run})},requireModel:{record:x=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid');return x},uuid:x=>{if(typeof x!=='string'||!/^[a-f0-9]{8}-[a-f0-9-]{27}$/i.test(x))throw Error('invalid uuid');return x}}};
 const source=fs.readFileSync(new URL('../src/lib/regional/knowledge.ts',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const m={exports:{}};new Function('require','module','exports',compiled)(p=>p==='@/lib/db'?{db:mock}:p==='./model'?mock.requireModel:require(p),m,m.exports);
 return {state,api:m.exports};
}
test('saving first document creates immutable version and separate pages',async()=>{const x=fixture();const r=await x.api.storeDocument(actor,loc,document());assert.equal(r.version,1);assert.equal(x.state.pages.length,2);assert.equal(x.state.documents.size,1);assert.ok(x.state.queries.some(q=>q.sql.includes('FOR UPDATE')));});
test('re-uploading identical digest is idempotent',async()=>{const x=fixture();const one=await x.api.storeDocument(actor,loc,document());const two=await x.api.storeDocument(actor,loc,document(),one.documentId);assert.equal(two.unchanged,true);assert.equal(x.state.pages.length,2);});
test('new digest increments existing document version',async()=>{const x=fixture();const one=await x.api.storeDocument(actor,loc,document());const revised={...document(),id:'pdf-'+'b'.repeat(16),sha256:'b'.repeat(64)};const two=await x.api.storeDocument(actor,loc,revised,one.documentId);assert.equal(two.version,2);assert.equal(x.state.pages.length,4);});
test('wrong existing document ID is not treated as a new document',async()=>{const x=fixture();await assert.rejects(x.api.storeDocument(actor,loc,document(),USER),/does not belong/);});
test('viewer cannot store document',async()=>{const x=fixture({role:'viewer'});await assert.rejects(x.api.storeDocument(actor,loc,document()),/membership/);});
test('revoked membership prevents DB document insert',async()=>{const x=fixture({revoked:true});await assert.rejects(x.api.storeDocument(actor,loc,document()),/membership/);assert.equal(x.state.documents.size,0);});
test('stale BOM revisions do not persist new document',async()=>{const x=fixture({stale:true});await assert.rejects(x.api.storeDocument(actor,loc,document()),/revision changed/);assert.equal(x.state.pages.length,0);});
test('per-BOM document quota rejects sixth document',async()=>{const x=fixture();for(let i=0;i<5;i++){const d={...document(),sha256:String(i).repeat(64),id:'pdf-'+String(i).repeat(16)};await x.api.storeDocument(actor,loc,d);}await assert.rejects(x.api.storeDocument(actor,loc,document()),/At most five/);});
test('document contents exceeding PostgreSQL page budget are rejected',async()=>{const x=fixture();const d=document();d.pages[0].text='€'.repeat(6000);await assert.rejects(x.api.storeDocument(actor,loc,d),/budget/);});
test('document page search always binds workspace and BOM',async()=>{const x=fixture();await x.api.listKnowledge(actor,BOM,1,'operating voltage',null);const q=x.state.queries.find(z=>z.sql.includes('ts_rank_cd('));assert.ok(q);assert.deepEqual(q.args,[WORKSPACE,BOM,'operating voltage']);});
test('missing document is not silently deleted',async()=>{const x=fixture();await assert.rejects(x.api.removeDocument(actor,BOM,1,USER),/not found/);});
test('deleting versioned document uses tenant-scoped predicate',async()=>{const x=fixture();const d=await x.api.storeDocument(actor,loc,document());await x.api.removeDocument(actor,BOM,1,d.documentId);assert.equal(x.state.documents.size,0);const q=x.state.queries.find(z=>z.sql.startsWith('DELETE FROM platform_knowledge_documents'));assert.deepEqual(q.args,[WORKSPACE,BOM,d.documentId]);});
