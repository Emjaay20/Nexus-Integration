import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const USER='12345678-1234-4321-8123-123456789abc',WORKSPACE='22345678-1234-4321-8123-123456789abc',BOM='32345678-1234-4321-8123-123456789abc';
function harness(options={}){
 const state={db:0,extractions:0,...options},cache=new Map();
 const dep=p=>{
  if(p==='@/lib/core-workspace')return {forwardWorkspace:async()=>state.anonymous?Response.json({},{status:401}):Response.json({actor:{user_id:USER,workspace_id:WORKSPACE,role:state.role||'owner'}})};
  if(p==='@/lib/request-origin')return {allowsMutation:()=>!state.crossSite};
  if(p==='@/lib/request-limits')return {consumeLimit:async()=>!state.rateLimited};
  if(p==='@/lib/db')return {db:{transaction:async fn=>fn({query:async sql=>{
   state.db++;
   if(sql.includes('platform_memberships'))return {rows:state.revoked?[]:[{role:state.dbRole||'owner'}]};
   if(sql.includes('platform_boms'))return {rows:state.missingBom?[]:[{revision:state.stale?2:1,items:[{partNumber:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:5}]}]};
   throw Error('Unexpected SQL '+sql);
  }})}};
  if(p==='@/lib/regional/model')return {uuid:v=>{if(typeof v!=='string'||!/^[a-f0-9-]{36}$/i.test(v))throw Error('UUID invalid');return v},record:v=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Expected record');return v}};
  if(p==='@/lib/regional/pdf-extract')return {PdfError:class PdfError extends Error{},extractPDF:async(bytes,name)=>{state.extractions++;return {name,sha256:'a'.repeat(64),pages:[{page:1,text:'Operating voltage: 3 to 5 V',truncated:false}],properties:[]}}};
  if(p==='@/lib/regional/knowledge')return {KnowledgeError:class KnowledgeError extends Error{},storeDocument:async()=>{state.saved=(state.saved||0)+1;return {documentId:BOM,version:1,sha256:'a'.repeat(64)}}};
  return require(p);
 };
 const file=ts.transpileModule(fs.readFileSync(new URL('../src/app/api/regional-sourcing/datasheet/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const module={exports:{}};new Function('require','module','exports',file)(dep,module,module.exports);
 const make=(change={})=>{
  const data=new FormData();data.set('workspaceId',change.workspaceId||WORKSPACE);data.set('bomId',change.bomId||BOM);
  data.set('revision',change.revision||'1');data.set('line',change.line||'0');
  if(change.persist)data.set('persist','true');if(change.documentId)data.set('documentId',change.documentId);
  const mime=change.mime||'application/pdf';data.set('file',new File([Buffer.from('%PDF-1.4\n'+'0'.repeat(40))],'component.pdf',{type:mime}));
  return new Request('https://nexus.example/api/regional-sourcing/datasheet',{method:'POST',body:data});
 };
 return {state,post:async change=>module.exports.POST(make(change)),raw:async req=>module.exports.POST(req)};
}
test('anonymous user cannot send PDF to extraction or DB',async()=>{const x=harness({anonymous:true});assert.equal((await x.post()).status,401);assert.equal(x.state.extractions,0);assert.equal(x.state.db,0);});
test('viewers cannot upload PDFs',async()=>{const x=harness({role:'viewer'});assert.equal((await x.post()).status,403);assert.equal(x.state.extractions,0);});
test('cross-site requests blocked before reading or DB',async()=>{const x=harness({crossSite:true});assert.equal((await x.post()).status,403);assert.equal(x.state.db,0);});
test('workspace forgery fails before database lookup',async()=>{const x=harness();assert.equal((await x.post({workspaceId:USER})).status,409);assert.equal(x.state.db,0);});
test('revoked DB membership prevents extraction',async()=>{const x=harness({revoked:true});assert.equal((await x.post()).status,403);assert.equal(x.state.extractions,0);});
test('DB-authoritative viewer role prevents extraction even if session was owner',async()=>{const x=harness({dbRole:'viewer'});assert.equal((await x.post()).status,403);assert.equal(x.state.extractions,0);});
test('stale revision and missing BOM fail before parsing PDF',async()=>{for(const state of [{stale:true},{missingBom:true}]){const x=harness(state);const r=await x.post();assert.ok([404,409].includes(r.status));assert.equal(x.state.extractions,0);}});
test('invalid line index fails without extraction',async()=>{const x=harness();assert.equal((await x.post({line:'49'})).status,400);assert.equal(x.state.extractions,0);});
test('non-PDF mime rejected before DB',async()=>{const x=harness();assert.equal((await x.post({mime:'text/plain'})).status,415);assert.equal(x.state.db,0);});
test('rate limits precede PDF bytes and database operations',async()=>{const x=harness({rateLimited:true});assert.equal((await x.post()).status,429);assert.equal(x.state.db,0);});
test('accepted PDF is associated with checked workspace BOM line',async()=>{const x=harness();const r=await x.post();assert.equal(r.status,200);const body=await r.json();assert.equal(body.part.mpn,'ESP32-WROOM-32E');assert.equal(body.document.pages[0].page,1);assert.equal(x.state.extractions,1);});
test('invalid content-type fails without PDF decoding',async()=>{const x=harness();const r=await x.raw(new Request('https://nexus.example/api/regional-sourcing/datasheet',{method:'POST',body:'not a multipart PDF'}));assert.equal(r.status,415);assert.equal(x.state.extractions,0);});

test('PDF text is not persisted without explicit opt-in',async()=>{const x=harness();const r=await x.post();assert.equal(r.status,200);assert.equal(x.state.saved||0,0);});
test('explicit PDF persistence stores extracted text once',async()=>{const x=harness();const r=await x.post({persist:true});assert.equal(r.status,200);const data=await r.json();assert.equal(data.saved.version,1);assert.equal(x.state.saved,1);});
test('cannot select an existing document version without consenting to persistence',async()=>{const x=harness();const r=await x.post({documentId:BOM});assert.equal(r.status,400);assert.equal(x.state.saved||0,0);});
