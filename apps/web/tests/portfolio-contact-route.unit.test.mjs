import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=path=>fs.readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
function compile(source,deps){
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const module={exports:{}};new Function('require','module','exports',code)(deps,module,module.exports);return module.exports;
}
const model=compile(read('lib/portfolio/flowmeet.ts'),require);
const base={name:'Engineering Contact',email:'contact@example.com',company:'Systems team',region:'Lagos',interest:'recruiting',consent:true,website:'',requestKey:'nexus-idempotent-key-0123456789'};
function harness(state={}){
 const log={outbound:[],rate:[],...state};
 const processRoute=compile(read('app/api/portfolio/contact/route.ts'),p=>{
  if(p==='@/lib/request-origin')return {allowsMutation:()=>log.allowOrigin!==false};
  if(p==='@/lib/request-limits')return {limitedJson:async req=>req.json(),consumeLimit:async (scope,identity,limit,seconds)=>{log.rate.push([scope,identity,limit,seconds]);return log.allowRate!==false;}};
  if(p==='@/lib/portfolio/flowmeet')return {...model,captureConfigured:()=>log.enabled!==false};
  return require(p);
 });
 const current=globalThis.fetch;
 function setFetch(){
  globalThis.fetch=async(url,init)=>{
   log.outbound.push({url,headers:init.headers,body:JSON.parse(init.body)});
   if(log.outboundThrows)throw Error('network failed');
   return Response.json(log.upstream??{success:true,lead:{id:'test'}},{status:log.upstreamStatus||201});
  };
 }
 async function run(data=base){setFetch();try{
  const request=new Request('https://nexus.example/api/portfolio/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  return await processRoute.POST(request);
 }finally{globalThis.fetch=current;}}
 return {log,run,api:processRoute};
}
test('successful enquiry forwards ONLY supported, labelled FlowMeet fields',async()=>{
 const x=harness();const result=await x.run();assert.equal(result.status,200);
 const body=await result.json();assert.equal(body.ok,true);
 assert.equal(x.log.outbound.length,1);
 const sent=x.log.outbound[0];assert.equal(sent.url,'https://flowmeet.aetherhost.app/api/leads');
 assert.equal(sent.headers['Idempotency-Key'],base.requestKey);
 assert.equal(sent.body.role,'Nexus / Recruiting / interview');
 assert.equal(sent.body.send_booking_email,false);
 assert.equal('workspaceId' in sent.body,false);
 assert.equal('requestKey' in sent.body,false);
});
test('no API traffic on honeypot spam',async()=>{
 const x=harness();const response=await x.run({...base,website:'spam.example'});
 assert.equal(response.status,200);assert.equal(x.log.outbound.length,0);
});
test('invalid origin returns 403 without calling FlowMeet',async()=>{
 const x=harness({allowOrigin:false});const res=await x.run();
 assert.equal(res.status,403);assert.equal(x.log.outbound.length,0);
});
test('disabled capture fails closed and suggests booking handoff',async()=>{
 const x=harness({enabled:false});const res=await x.run();
 assert.equal(res.status,503);assert.match((await res.json()).error,/booking link/);
 assert.equal(x.log.outbound.length,0);
});
test('invalid and unconsented contact is rejected before quota and network use',async()=>{
 const x=harness();const res=await x.run({...base,consent:false});
 assert.equal(res.status,400);assert.equal(x.log.rate.length,0);assert.equal(x.log.outbound.length,0);
});
test('public request budgets can reject without upstream side effects',async()=>{
 const x=harness({allowRate:false});const res=await x.run();
 assert.equal(res.status,429);assert.equal(x.log.outbound.length,0);
});
test('FlowMeet idempotency conflict is exposed as a safe retry failure',async()=>{
 const x=harness({upstreamStatus:409,upstream:{error:'conflict'}});const res=await x.run();
 assert.equal(res.status,409);assert.equal(x.log.outbound.length,1);
});
test('upstream failure or ambiguous response is never claimed as delivered',async()=>{
 for(const state of [{upstreamStatus:503},{upstream:{success:false}},{outboundThrows:true}]){
  const x=harness(state);const res=await x.run();assert.equal(res.status,503);
  const value=await res.json();assert.notEqual(value.ok,true);
 }
});
