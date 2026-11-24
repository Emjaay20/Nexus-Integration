import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const USER='12345678-1234-4321-8123-123456789abc';
const WS='22345678-1234-4321-8123-123456789abc';
const BOM='32345678-1234-4321-8123-123456789abc';
const B={workspaceId:WS,bomId:BOM,revision:1,line:0,country:'NG',quantity:10,supplierId:'microscale',action:'feed_preview'};
function setup(options={}){
 const state={authRole:'owner',dbRole:'owner',network:0,queries:[],...options};
 const modules={};
 const sourceFile='app/api/regional-sourcing/market/route.ts';
 function load(file){if(modules[file])return modules[file];const code=ts.transpileModule(fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};
 const mocked=p=>{
  if(p==='@/lib/core-workspace')return {forwardWorkspace:async()=>state.anonymous?Response.json({}, {status:401}):Response.json({actor:{user_id:USER,workspace_id:WS,role:state.authRole}})};
  if(p==='@/lib/db')return {db:{transaction:async fn=>fn({query:async (sql)=>{state.queries.push(sql);if(sql.includes('platform_memberships'))return {rows:state.revoked?[]:[{role:state.dbRole}]};if(sql.includes('platform_boms'))return {rows:state.stale?[]:[{revision:1,items:[{partNumber:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:10}]}]};throw Error('unexpected database request');}})}};
  if(p==='@/lib/request-limits')return {consumeLimit:async()=>!state.throttled,limitedJson:req=>req.json()};
  if(p==='@/lib/request-origin')return {allowsMutation:()=>!state.crossSite};
  if(p==='@/lib/regional/fx')return {fxCurrency:v=>{if(!['USD','NGN'].includes(v))throw Error('invalid currency');return v;},getFxReference:async()=>{state.network++;return {base:'USD',quote:'NGN',rate:'1350.000000',date:'2026-11-23',source:'CBN',referenceOnly:true}} ,FxError:class FxError extends Error {}};
  if(p==='@/lib/regional/feed')return {feedAvailable:()=>state.enabled===true,feedPolicies:()=>new Map([['microscale',{allowedCountries:['NG'],authorizationRef:'approved-fixture'}]]),getFeedCandidates:async()=>{state.network++;return [{mpn:'ESP32-WROOM-32E',reviewRequired:true}]},FeedError:class FeedError extends Error{}};
  if(p==='@/lib/regional/model')return load('lib/regional/model.ts');
  return require(p);
 };
 new Function('require','module','exports',code)(mocked,m,m.exports);modules[file]=m.exports;return m.exports;}
 const api=load(sourceFile);
 const get=()=>api.GET(new Request('https://nexus.test/api/regional-sourcing/market?base=USD&quote=NGN'));
 const post=(data=B)=>api.POST(new Request('https://nexus.test/api/regional-sourcing/market',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}));
 return {state,get,post};
}
test('market unauthenticated users cannot use FX nor supplier feed',async()=>{const x=setup({anonymous:true,enabled:true});assert.equal((await x.get()).status,401);assert.equal((await x.post()).status,401);assert.equal(x.state.network,0);});
test('viewer cannot preview feed, despite valid session',async()=>{const x=setup({authRole:'viewer',enabled:true});assert.equal((await x.post()).status,403);assert.equal(x.state.network,0);});
test('cross-site feed submissions blocked',async()=>{const x=setup({enabled:true,crossSite:true});assert.equal((await x.post()).status,403);assert.equal(x.state.network,0);});
test('forged workspace and stale BOM do not contact partner',async()=>{for(const [o,data,status] of [[{enabled:true},{...B,workspaceId:USER},409],[{enabled:true,stale:true},B,404],[{enabled:true,dbRole:'viewer'},B,403]]){const x=setup(o);assert.equal((await x.post(data)).status,status);assert.equal(x.state.network,0);}});
test('partner feed defaults off and requires explicit enablement',async()=>{const x=setup({enabled:false});assert.equal((await x.post()).status,409);assert.equal(x.state.network,0);});
test('authorized feed preview uses DB membership and BOM before network',async()=>{const x=setup({enabled:true});const res=await x.post();assert.equal(res.status,200);assert.equal((await res.json()).candidates[0].reviewRequired,true);assert.equal(x.state.network,1);assert.equal(x.state.queries.length,2);});
test('FX lookup disabled until operator enables it',async()=>{const x=setup();const old=process.env.NEXUS_REGIONAL_FX_ENABLED;delete process.env.NEXUS_REGIONAL_FX_ENABLED;try{assert.equal((await x.get()).status,409);assert.equal(x.state.network,0);}finally{if(old===undefined)delete process.env.NEXUS_REGIONAL_FX_ENABLED;else process.env.NEXUS_REGIONAL_FX_ENABLED=old;}});
test('FX enabled lookup is limited to signed-in workspace user',async()=>{const x=setup();const old=process.env.NEXUS_REGIONAL_FX_ENABLED;process.env.NEXUS_REGIONAL_FX_ENABLED='true';try{const res=await x.get();assert.equal(res.status,200);assert.equal((await res.json()).rate,'1350.000000');assert.equal(x.state.network,1);}finally{if(old===undefined)delete process.env.NEXUS_REGIONAL_FX_ENABLED;else process.env.NEXUS_REGIONAL_FX_ENABLED=old;}});
test('throttled market access fails closed',async()=>{const x=setup({throttled:true,enabled:true});assert.equal((await x.get()).status,429);assert.equal((await x.post()).status,429);assert.equal(x.state.network,0);});
