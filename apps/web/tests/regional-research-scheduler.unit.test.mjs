import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const U='12345678-1234-4321-8123-123456789abc',W='22345678-1234-4321-8123-123456789abc',B='32345678-1234-4321-8123-123456789abc';
const ENV={NEXUS_RESEARCH_SCHEDULER_ENABLED:'true',NEXUS_RESEARCH_CRON_TOKEN:'fixture-scheduler-token-at-least-32-chars',NEXUS_REGIONAL_SMARTCRAWL_ENABLED:'true',NEXUS_SMARTCRAWL_CATALOG_EGRESS_VERIFIED:'true',NEXUS_REGIONAL_CRAWL_POLICIES:JSON.stringify({digikey:{authorizationRef:'approved-contract',pathPrefixes:['/product/'],allowModel:false}})};
Object.assign(process.env,ENV);
const actor={userId:U,workspaceId:W,role:'owner'};
const input={workspaceId:W,bomId:B,revision:1,line:0,country:'NG',quantity:5,supplierId:'digikey',url:'https://www.digikey.com/product/ESP32-WROOM-32E',intervalHours:24,maxRuns:3,startNow:true};
function fixture(overrides={}){
 const state={sent:0,schedules:[],research:[],queries:[],role:'owner',...overrides};
 const modules=new Map();
 function loader(name){
  if(modules.has(name))return modules.get(name);
  const src=fs.readFileSync(new URL('../src/lib/regional/'+name+'.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
  const m={exports:{}};
  const imp=p=>{
   if(p==='@/lib/request-limits')return {consumeLimit:async()=>!state.blocked};
   if(p==='@/lib/db')return {db:{transaction:async f=>f({query:q}),query:q}};
   if(p==='./model')return loader('model');
   if(p==='./crawler')return {getCrawlerConfig:(env=process.env)=>env.NEXUS_REGIONAL_SMARTCRAWL_ENABLED==='true'&&env.NEXUS_SMARTCRAWL_CATALOG_EGRESS_VERIFIED==='true'?{base:'https://crawl.fixture',key:'test-secret-key-32-characters'}:null,
     startResearch:async()=>{state.sent++;if(state.ambiguous)throw Error('Upstream might have received request');return 'crawl-fixture-1';},
     pollResearch:async()=>({state:'completed',observation:{method:'unstructured',reviewRequired:true,sourceUrl:input.url,retrievedAt:new Date().toISOString(),hash:'a'.repeat(64)}})};
   if(p==='./knowledge')return {KnowledgeError:class KnowledgeError extends Error{constructor(status,msg){super(msg);this.status=status;}},requireBom:async()=>({revision:state.revision||1,items:[{partNumber:'ESP32-WROOM-32E',quantity:5,manufacturer:'Espressif'}]})};
   return require(p);
  };
  new Function('require','module','exports',code)(imp,m,m.exports);modules.set(name,m.exports);return m.exports;
 }
 async function q(sql,args=[]){
  state.queries.push({sql,args});
  if(sql.startsWith('SELECT id FROM platform_boms'))return {rows:[{id:B}]};
  if(sql.startsWith('SELECT count(*)::int AS total FROM platform_research_schedules'))return {rows:[{total:state.schedules.filter(s=>['active','paused'].includes(s.state)).length}]};
  if(sql.startsWith('INSERT INTO platform_research_schedules')){const saved={id:args[0],workspace_id:args[1],actor_id:args[2],bom_id:args[3],bom_revision:args[4],line_index:args[5],quantity:args[6],country:args[7],supplier_id:args[8],source_url:args[9],authorization_ref:args[10],interval_hours:args[11],max_runs:args[12],run_count:0,next_run_at:Date.now()-1000,state:'active'};state.schedules.push(saved);return {rows:[saved]};}
  if(sql.startsWith('INSERT INTO platform_audit'))return {rows:[]};
  if(sql.startsWith('SELECT id,bom_id,bom_revision,line_index'))return {rows:state.schedules};
  if(sql.startsWith('SELECT * FROM platform_research_schedules WHERE workspace_id'))return {rows:state.schedules.filter(s=>s.id===args[3])};
  if(sql.startsWith('DELETE FROM platform_research_schedules')){state.schedules=state.schedules.filter(s=>s.id!==args[1]);return {rows:[]};}
  if(sql.startsWith('UPDATE platform_research_schedules SET state=')){const s=state.schedules.find(x=>x.id===args.at(-2)||x.id===args[1]);if(s)s.state=sql.includes("state='paused'")?'paused':sql.includes("state='active'")?'active':'review_required';return {rows:[]};}
  if(sql.includes('FROM platform_research_schedules WHERE state='))return {rows:state.schedules.filter(s=>s.state==='active'&&s.next_run_at<=Date.now()).slice(0,1)};
  if(sql.startsWith('SELECT m.role FROM platform_memberships'))return {rows:state.revoked?[]:[{role:state.role}]};
  if(sql.startsWith('SELECT revision,items FROM platform_boms'))return {rows:[{revision:state.revision||1,items:[{partNumber:'ESP32-WROOM-32E',quantity:5}]}]};
  if(sql.startsWith('SELECT id FROM platform_regional_sourcing'))return {rows:state.research.some(r=>r.state==='submitted'||r.state==='submission_unknown')?[{id:state.research[0].id}]:[]};
  if(sql.startsWith('SELECT count(*)::int AS total FROM platform_regional_sourcing'))return {rows:[{total:0}]};
  if(sql.startsWith('INSERT INTO platform_regional_sourcing')){state.research.push({id:args[0],workspace_id:args[1],state:'submitting'});return {rows:[]};}
  if(sql.startsWith('UPDATE platform_research_schedules SET run_count')){const s=state.schedules.find(x=>x.id===args[1]);s.run_count++;s.last_result_id=args[0];s.next_run_at=Date.now()+86400000;return {rows:[]};}
  if(sql.startsWith('UPDATE platform_regional_sourcing SET state=')){const r=state.research.find(x=>x.id===args[3]);if(r)r.state=args[0];return {rows:[]};}
  if(sql.includes('JOIN platform_research_schedules s ON s.workspace_id=r.workspace_id'))return {rows:[]};
  throw Error('unexpected query: '+sql);
 }
 return {api:loader('research-schedules'),state};
}
test('scheduler defaults disabled without operator toggle and secret',()=>{const x=fixture();assert.equal(x.api.clockConfigured({}),false);assert.equal(x.api.validToken('Bearer '+ENV.NEXUS_RESEARCH_CRON_TOKEN,{}),false);});
test('service token is compared without accepting prefix or guessed token',()=>{const x=fixture();assert.equal(x.api.validToken('Bearer '+ENV.NEXUS_RESEARCH_CRON_TOKEN,ENV),true);assert.equal(x.api.validToken('Bearer wrong-token-with-adequate-length-0123456',ENV),false);});
test('approved supplier URL must match exact origin, path and policy',()=>{const x=fixture();assert.ok(x.api.validatedInput(input));assert.throws(()=>x.api.validatedInput({...input,url:'https://evil.test/product/part'}));assert.throws(()=>x.api.validatedInput({...input,url:'https://www.digikey.com/other/part'}));});
test('schedule refuses unconfigured crawler before any database work',()=>{const x=fixture();assert.throws(()=>x.api.policyFor('digikey',input.url,{...ENV,NEXUS_REGIONAL_SMARTCRAWL_ENABLED:'false'}));});
test('schedule interval and run limits are bounded',()=>{const x=fixture();assert.throws(()=>x.api.validatedInput({...input,intervalHours:1}));assert.throws(()=>x.api.validatedInput({...input,maxRuns:13}));assert.throws(()=>x.api.validatedInput({...input,startNow:undefined}));});
test('explicit schedule creation persists limited run count and bound URL',async()=>{const x=fixture();const s=await x.api.createSchedule(actor,input);assert.equal(s.state,'active');assert.equal(x.state.sent,0);assert.equal(x.state.schedules[0].authorization_ref,'approved-contract');});
test('viewer cannot create scheduled research',async()=>{const x=fixture();await assert.rejects(x.api.createSchedule({...actor,role:'viewer'},input),/Read-only/);});
test('forged workspace rejected without database writes',async()=>{const x=fixture();await assert.rejects(x.api.createSchedule(actor,{...input,workspaceId:U}),/workspace/);assert.equal(x.state.schedules.length,0);});
test('one tick reserves and dispatches at most one unique research job',async()=>{const x=fixture();await x.api.createSchedule(actor,input);const r=await x.api.tickResearch();assert.equal(r.processed,1);assert.equal(x.state.sent,1);assert.equal(x.state.research[0].state,'submitted');const again=await x.api.tickResearch();assert.equal(again.processed,0);assert.equal(x.state.sent,1);});
test('ambiguous upstream submission never results in automatic POST retry',async()=>{const x=fixture({ambiguous:true});await x.api.createSchedule(actor,input);const first=await x.api.tickResearch();assert.equal(first.results[0].result,'submission_unknown');assert.equal(x.state.research[0].state,'submission_unknown');await x.api.tickResearch();assert.equal(x.state.sent,1);});
test('revoked scheduled actor cannot dispatch new research',async()=>{const x=fixture({revoked:true});await x.api.createSchedule(actor,input);const r=await x.api.tickResearch();assert.equal(r.processed,0);assert.equal(x.state.sent,0);});
test('changing BOM revision invalidates stored schedule before network',async()=>{const x=fixture();await x.api.createSchedule(actor,input);x.state.revision=2;const r=await x.api.tickResearch();assert.equal(r.processed,0);assert.equal(x.state.sent,0);});
