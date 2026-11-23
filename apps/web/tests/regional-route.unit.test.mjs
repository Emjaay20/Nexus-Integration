import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const user='12345678-1234-4321-8123-123456789abc',workspace='22345678-1234-4321-8123-123456789abc',bom='32345678-1234-4321-8123-123456789abc',key='42345678-1234-4321-8123-123456789abc';
const base={workspaceId:workspace,bomId:bom,revision:1,line:0,country:'NG',quantity:20};
const part={partNumber:'ESP32-WROOM-32E',manufacturer:'Espressif',quantity:1};
function setup(opts={}){
  let state={rows:[],network:0,events:0,sql:[],...opts};
  const sql=async(q,p=[])=>{state.sql.push(q);
    if(q.includes('platform_memberships m JOIN'))return {rows:state.noMembership?[]:[{role:state.dbRole||'owner'}],rowCount:1};
    if(q.includes('SELECT revision,items FROM platform_boms'))return {rows:state.missingBom?[]:[{revision:state.revision||1,items:[part]}],rowCount:1};
    if(q.includes('pg_advisory_xact_lock'))return {rows:[],rowCount:1};
    if(q.includes('WHERE workspace_id=$1 AND request_key=$2'))return {rows:state.rows.filter(r=>r.workspace_id===p[0]&&r.request_key===p[1]),rowCount:1};
    if(q.includes('SELECT id FROM platform_regional_sourcing'))return {rows:state.rows.filter(r=>r.kind==='research'&&['submitting','submission_unknown','submitted'].includes(r.state)),rowCount:1};
    if(q.includes('count(*)::int'))return {rows:[{count:state.daily||0}],rowCount:1};
    if(q.includes('INSERT INTO platform_regional_sourcing')){const [id,workspace_id,actor_id,bom_id,bom_revision,line_index,country,quantity,pi,supplier_id,request_key,fingerprint,kind,status,source_url,policy_ref,result,model_allowed]=p;const r={id,workspace_id,actor_id,bom_id,bom_revision,line_index,country,quantity,part:JSON.parse(pi),supplier_id,request_key,fingerprint,kind,state:status,source_url,policy_ref,result:result?JSON.parse(result):null,model_allowed,created_at:new Date(),updated_at:new Date()};state.rows.push(r);return {rows:[r],rowCount:1};}
    if(q.includes('INSERT INTO platform_audit')){state.events++;return {rows:[],rowCount:1};}
    if(q.includes('SET state=$1,crawler_job_id=')){const r=state.rows.find(r=>r.id===p[3]&&r.workspace_id===p[4]);Object.assign(r,{state:p[0],crawler_job_id:p[1],error_code:p[2]});return {rows:[],rowCount:1};}
    if(q.includes('SELECT * FROM platform_regional_sourcing WHERE id=$1 AND workspace_id=$2'))return {rows:state.rows.filter(r=>r.id===p[0]&&r.workspace_id===p[1]),rowCount:1};
    throw new Error('unexpected mocked query: '+q);
  };
  const mods={};
  function load(file){if(mods[file])return mods[file];const code=ts.transpileModule(fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2017,module:ts.ModuleKind.CommonJS}}).outputText;const m={exports:{}};
    const deps=p=>{
      if(p==='@/lib/core-workspace')return {forwardWorkspace:async()=>state.unauth?Response.json({}, {status:401}):Response.json({actor:{user_id:user,workspace_id:workspace,role:state.role||'owner'}})};
      if(p==='@/lib/db')return {db:{query:sql,transaction:async f=>f({query:sql})}};
      if(p==='@/lib/request-limits')return {consumeLimit:async()=>!state.throttled,limitedJson:req=>req.json()};
      if(p==='@/lib/request-origin')return {allowsMutation:()=>!state.crossSite};
      if(p==='@/lib/regional/model')return load('lib/regional/model.ts');
      if(p==='@/lib/regional/crawler')return {getCrawlerConfig:()=>state.enabled?{base:'https://crawler.example',key:'test'}:null,startResearch:async()=>{state.network++;if(state.networkError)throw new Error('lost response');return 'crawler_job';}};
      return require(p);
    };new Function('require','module','exports',code)(deps,m,m.exports);mods[file]=m.exports;return m.exports;
  }
  const api=load('app/api/regional-sourcing/route.ts');return {state,post:body=>api.POST(new Request('https://nexus.example/api/regional-sourcing',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}))};
}
const quote={...base,action:'quote',supplierId:'microscale',requestKey:key,quote:{currency:'NGN',unitPrice:'5500',shipping:'0',fees:'0',stock:20,moq:1,deliveryDays:2,validUntil:new Date(Date.now()+86400_000).toISOString(),note:'Fixture only',identityConfirmed:true,destinationConfirmed:true}};
test('unauthenticated, viewer and cross-site operations fail before DB writes',async()=>{for(const [o,code] of [[{unauth:true},401],[{role:'viewer'},403],[{crossSite:true},403]]){const {state,post}=setup(o);assert.equal((await post(quote)).status,code);assert.equal(state.rows.length,0);assert.equal(state.network,0);}});
test('active workspace, revoked membership, revision checks fail closed',async()=>{for(const [o,body,code] of [[{}, {...quote,workspaceId:user},409],[{dbRole:'viewer'},quote,403],[{noMembership:true},quote,403],[{missingBom:true},quote,404],[{revision:2},quote,409]]){const {state,post}=setup(o);assert.equal((await post(body)).status,code);assert.equal(state.rows.length,0);}});
test('quote save, identical replay, conflicting key',async()=>{const {state,post}=setup();const a=await post(quote);assert.equal(a.status,201);assert.equal((await a.json()).cost.totalMinor,'11000000');assert.equal((await post(quote)).status,200);assert.equal((await post({...quote,quantity:21})).status,409);assert.equal(state.rows.length,1);assert.equal(state.events,1);});
test('disabled crawler never sends a request',async()=>{const {state,post}=setup();assert.equal((await post({...base,action:'research',supplierId:'microscale',requestKey:key,url:'https://www.microscale.net/products/example'})).status,409);assert.equal(state.network,0);});
test('budget rejection prevents inserts',async()=>{const {state,post}=setup({daily:100});assert.equal((await post(quote)).status,429);assert.equal(state.rows.length,0);});
test('ambiguous submission is persisted, same or fresh key cannot automatically fetch twice',async()=>{const env=process.env.NEXUS_REGIONAL_CRAWL_POLICIES;process.env.NEXUS_REGIONAL_CRAWL_POLICIES=JSON.stringify({microscale:{authorizationRef:'fixture only',pathPrefixes:['/products/'],allowModel:false}});try{const {state,post}=setup({enabled:true,networkError:true});const input={...base,action:'research',supplierId:'microscale',requestKey:key,url:'https://www.microscale.net/products/example'};const a=await post(input);assert.equal(a.status,202);assert.equal((await a.json()).state,'submission_unknown');assert.equal((await post(input)).status,200);assert.equal((await post({...input,requestKey:user})).status,409);assert.equal(state.network,1);assert.equal(state.rows.length,1);}finally{if(env===undefined)delete process.env.NEXUS_REGIONAL_CRAWL_POLICIES;else process.env.NEXUS_REGIONAL_CRAWL_POLICIES=env;}});
