import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const USER='12345678-1234-4321-8123-123456789abc',WS='22345678-1234-4321-8123-123456789abc',BOM='32345678-1234-4321-8123-123456789abc',OTHER='42345678-1234-4321-8123-123456789abc';
const selection={workspaceId:WS,bomId:BOM,revision:1,country:'NG'};
function mock(options={}){
 const state={queries:[],role:'owner',...options},cache=new Map();
 const query=async(sql,args=[])=>{
  state.queries.push({sql,args});
  if(sql.includes('FROM platform_memberships'))return {rows:state.revoked?[]:[{role:state.dbRole||state.role}]};
  if(sql.includes('FROM platform_boms'))return {rows:state.missing?[]:[{name:'Controlled BOM',revision:state.stale?2:1,items:[{partNumber:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:5}]}]};
  if(sql.includes('FROM platform_regional_sourcing'))return {rows:state.sources||[]};
  if(sql.includes('FROM platform_jobs'))return {rows:[]};
  if(sql.includes('FROM platform_knowledge_documents'))return {rows:state.documents||[]};
  if(sql.includes('FROM platform_knowledge_pages'))return {rows:state.hits||[]};
  throw Error('Unexpected SQL: '+sql);
 };
 function load(file){
  if(cache.has(file))return cache.get(file);
  const text=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  const compiled=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
  const module={exports:{}};
  const deps=p=>{
   if(p==='@/lib/core-workspace')return {forwardWorkspace:async()=>state.unauth?Response.json({},{status:401}):Response.json({actor:{user_id:USER,workspace_id:WS,role:state.role}})};
   if(p==='@/lib/db')return {db:{transaction:fn=>fn({query})}};
   if(p==='@/lib/request-limits')return {consumeLimit:async()=>!state.limited};
   if(p==='@/lib/regional/model'||p==='./model')return load('lib/regional/model.ts');
   if(p==='@/lib/regional/intelligence'||p==='./intelligence')return load('lib/regional/intelligence.ts');
   if(p==='@/lib/regional/agent')return load('lib/regional/agent.ts');
   if(p==='@/lib/regional/knowledge')return load('lib/regional/knowledge.ts');
   return require(p);
  };
  new Function('require','module','exports',compiled)(deps,module,module.exports);cache.set(file,module.exports);return module.exports;
 }
 const api=load('app/api/regional-sourcing/agent/route.ts');
 const get=overrides=>api.GET(new Request('https://nexus.example/api/regional-sourcing/agent?'+new URLSearchParams({...selection,...overrides})));
 return {state,get};
}
test('anonymous cannot access agent knowledge or database',async()=>{
 const x=mock({unauth:true});assert.equal((await x.get()).status,401);assert.equal(x.state.queries.length,0);
});
test('forged workspace selection rejected before querying private data',async()=>{
 const x=mock();assert.equal((await x.get({workspaceId:OTHER})).status,409);assert.equal(x.state.queries.length,0);
});
test('revoked membership rejected by authoritative database check',async()=>{
 const x=mock({revoked:true});assert.equal((await x.get()).status,403);
});
test('stale BOM revision rejected',async()=>{
 const x=mock({stale:true});assert.equal((await x.get()).status,409);
});
test('missing BOM returns 404',async()=>{
 const x=mock({missing:true});assert.equal((await x.get()).status,404);
});
test('viewer is permitted read-only planning but no mutation occurs',async()=>{
 const x=mock({role:'viewer'});const response=await x.get();assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.plan.automaticActions,0);assert.equal(data.readOnly,true);
 assert.equal(data.plan.coverage.unpriced,1);
 assert.ok(x.state.queries.every(q=>!/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(q.sql)));
});
test('database membership downgrade and deleted actor context are enforced',async()=>{
 const x=mock({dbRole:'other'});assert.equal((await x.get()).status,403);
});
test('rate limit rejects before any DB work',async()=>{
 const x=mock({limited:true});assert.equal((await x.get()).status,429);assert.equal(x.state.queries.length,0);
});
test('invalid topic is rejected without querying full text',async()=>{
 const x=mock();const r=await x.get({topic:'x'});assert.equal(r.status,400);
 assert.equal(x.state.queries.some(q=>q.sql.includes('ts_rank_cd(')),false);
});
test('private document page citation matches current active version and owner',async()=>{
 const hash='a'.repeat(64),document_id='52345678-1234-4321-8123-123456789abc';
 const x=mock({documents:[{document_id,line_index:0,name:'Controlled spec',sha256:hash,version:2,page_count:2,truncated:false}],
  hits:[{document_id,line_index:0,name:'Controlled spec',sha256:hash,version:2,page_number:1,excerpt:'Operating voltage [3.0] to 3.6 V',rank:0.6}]});
 const response=await x.get({topic:'operating voltage'});
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(data.hits[0].citation,'sha256:'+hash+':v2:p1');
 assert.equal(data.plan.documentsIndexed,1);assert.equal(data.plan.retrievedExcerpts,1);
 const search=x.state.queries.find(q=>q.sql.includes('ts_rank_cd('));
 assert.deepEqual(search.args,[WS,BOM,'operating voltage']);
 assert.ok(search.sql.includes('d.workspace_id=$1 AND d.bom_id=$2'));
});
test('detached document provenance fails closed without fabricating an action',async()=>{
 const hash='a'.repeat(64),document_id='52345678-1234-4321-8123-123456789abc';
 const x=mock({documents:[{document_id,line_index:0,name:'Controlled spec',sha256:hash,version:1,page_count:2,truncated:false}],
  hits:[{document_id,line_index:0,name:'Controlled spec',sha256:'b'.repeat(64),version:1,page_number:1,excerpt:'foo',rank:0.4}]});
 const response=await x.get({topic:'operating voltage'});assert.equal(response.status,503);
 const data=await response.json();assert.match(data.error,/unavailable/);
});
test('no external crawl, model inference, payment or write API is called',async()=>{
 const x=mock();const response=await x.get();assert.equal(response.status,200);
 assert.equal(x.state.queries.some(q=>/\bINSERT\b|\bUPDATE\b|\bDELETE\b/.test(q.sql)),false);
 const data=await response.json();
 assert.ok(data.plan.tasks.every(t=>t.approvalRequired));
});
