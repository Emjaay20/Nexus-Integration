import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const U='12345678-1234-4321-8123-123456789abc',W='22345678-1234-4321-8123-123456789abc',B='32345678-1234-4321-8123-123456789abc';
const selected={workspaceId:W,bomId:B,revision:1,country:'NG'};
function fixture(options={}){
 const state={queries:[],role:'owner',...options};const modules=new Map();
 function load(file){
  if(modules.has(file))return modules.get(file);
  const src=fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
  const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
  const m={exports:{}};
  const imp=p=>{
   if(p==='@/lib/core-workspace')return {forwardWorkspace:async()=>state.anonymous?Response.json({},{status:401}):Response.json({actor:{user_id:U,workspace_id:W,role:state.role}})};
   if(p==='@/lib/request-origin')return {allowsMutation:()=>!state.crossSite};
   if(p==='@/lib/request-limits')return {consumeLimit:async()=>!state.rateLimited,limitedJson:async req=>req.json()};
   if(p==='@/lib/db')return {db:{transaction:async f=>f({query:async sql=>{
    state.queries.push(sql);
    if(sql.includes('platform_memberships'))return {rows:state.revoked?[]:[{role:state.role}]};
    if(sql.includes('FROM platform_boms'))return {rows:state.missingBom?[]:[{name:'Private BOM',revision:state.stale?2:1,items:[{partNumber:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:5}]}]};
    if(sql.includes('FROM platform_regional_sourcing'))return {rows:state.rows||[]};
    if(sql.includes('FROM platform_jobs'))return {rows:state.jobs||[]};
    throw Error('Unexpected SQL');
   }})}};
   if(p==='@/lib/regional/model'||p==='./model')return load('lib/regional/model.ts');
   if(p==='@/lib/regional/intelligence')return load('lib/regional/intelligence.ts');
   if(p==='@/lib/regional/copilot-priority')return {modelEnabled:()=>false,prioritize:async()=>{throw Error('No model calls expected')}};
   return require(p);
  };
  new Function('require','module','exports',code)(imp,m,m.exports);modules.set(file,m.exports);return m.exports;
 }
 const api=load('app/api/regional-sourcing/evidence/route.ts');
 const get=(overrides={})=>api.GET(new Request('https://nexus.test/api/regional-sourcing/evidence?'+new URLSearchParams({...selected,...overrides})));
 const post=(overrides={})=>api.POST(new Request('https://nexus.test/api/regional-sourcing/evidence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'ask',question:'What is missing?',...selected,...overrides})}));
 return {get,post,state};
}
test('anonymous callers get 401 and no database access',async()=>{const x=fixture({anonymous:true});assert.equal((await x.get()).status,401);assert.equal((await x.post()).status,401);assert.equal(x.state.queries.length,0);});
test('forged workspace IDs rejected before database reads',async()=>{const x=fixture();assert.equal((await x.get({workspaceId:U})).status,409);assert.equal(x.state.queries.length,0);});
test('revocation denies access even with valid prior session',async()=>{const x=fixture({revoked:true});assert.equal((await x.get()).status,403);});
test('stale revision rejected, without exposing stored quote',async()=>{const x=fixture({stale:true});assert.equal((await x.get()).status,409);});
test('missing BOM returns 404',async()=>{const x=fixture({missingBom:true});assert.equal((await x.get()).status,404);});
test('viewer can read evidence and use grounded copilot without writing',async()=>{const x=fixture({role:'viewer'});const a=await x.get();assert.equal(a.status,200);const d=await a.json();assert.equal(d.snapshot.lines.length,1);assert.equal(d.snapshot.records.length,0);const b=await x.post();assert.equal(b.status,200);const answer=await b.json();assert.equal(answer.answer.mode,'grounded_rules');assert.equal(answer.answer.coverage.unpriced,1);assert.equal(x.state.queries.filter(sql=>/\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(sql)).length,0);});
test('CSRF rejects cross-site POST without DB reads',async()=>{const x=fixture({crossSite:true});assert.equal((await x.post()).status,403);assert.equal(x.state.queries.length,0);});
test('read rate limit rejects request before database query',async()=>{const x=fixture({rateLimited:true});assert.equal((await x.get()).status,429);assert.equal(x.state.queries.length,0);});
test('missing or oversized question is rejected',async()=>{const x=fixture();assert.equal((await x.post({question:'x'.repeat(501)})).status,400);assert.equal((await x.post({question:''})).status,400);});
test('completed quote used as reported evidence with citations',async()=>{const x=fixture({rows:[{line_index:0,quantity:5,kind:'research',state:'completed',supplier_id:'fixture',source_url:null,result:{method:'jsonld',price:'9.99',currency:'USD',evidence:'Synthetic candidate'},created_at:new Date(),updated_at:new Date()}]});const r=await x.get();assert.equal(r.status,200);const d=await r.json();assert.equal(d.snapshot.records[0].kind,'smartcrawl');assert.equal(d.snapshot.records[0].landedMinor,null);assert.ok(d.findings.some(f=>f.citations.includes('R1')));});
