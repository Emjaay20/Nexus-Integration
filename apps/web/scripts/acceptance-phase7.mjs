/**
 * Phase 7 staging smoke / optional real PDF acceptance.
 * READ-ONLY by default. Never targets the production Nexus hostname.
 * NEXUS_STAGE_COOKIE and NEXUS_STAGE_OTHER_COOKIE are secrets; never print them.
 */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const cfg=process.env;
function required(name){const v=cfg[name];if(!v)throw Error(name+' required');return v;}
function url(path,query={}){
 const value=new URL(path,base);
 for(const [k,v] of Object.entries(query))value.searchParams.set(k,String(v));
 return value;
}
const base=new URL(required('NEXUS_STAGE_BASE_URL'));
if(!['https:','http:'].includes(base.protocol)||base.username||base.password)throw Error('Invalid staging URL');
if(base.hostname==='nexus-integration.aetherhost.app'||base.hostname==='194.163.172.101')throw Error('Production is not accepted by this staging harness');
if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))throw Error('Use HTTPS for staging');
const cookie=required('NEXUS_STAGE_COOKIE'),workspaceId=required('NEXUS_STAGE_WORKSPACE_ID'),bomId=required('NEXUS_STAGE_BOM_ID'),rev=Number(required('NEXUS_STAGE_BOM_REVISION')),otherWorkspace=required('NEXUS_STAGE_OTHER_WORKSPACE_ID');
const destination=cfg.NEXUS_STAGE_COUNTRY||'NG';
assert.match(workspaceId,/^[0-9a-f-]{36}$/i);assert.match(bomId,/^[0-9a-f-]{36}$/i);assert.match(otherWorkspace,/^[0-9a-f-]{36}$/i);
if(workspaceId===otherWorkspace)throw Error('Other workspace must differ');
if(!Number.isSafeInteger(rev)||rev<1)throw Error('Invalid BOM revision');
const selection={workspaceId,bomId,revision:rev,country:destination};
async function request(path,query={},auth=cookie,init={}){
 const res=await fetch(url(path,query),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000),
  headers:{...(auth?{Cookie:auth}:{}),...(init.headers||{})},...init});
 let data;try{data=await res.json();}catch{data={};}
 return {status:res.status,data};
}
function expectStatus(value,status,name){
 assert.equal(value.status,status,name+' expected status '+status+' got '+value.status);
}
const checks=[];
const check=(label)=>{checks.push(label);};
for(const path of ['/api/regional-sourcing/agent','/api/regional-sourcing/knowledge','/api/regional-sourcing/evidence']){
 const out=await request(path,selection,null);
 expectStatus(out,401,'anonymous '+path);check('anonymous '+path+' is private');
}
const owned=await request('/api/regional-sourcing/agent',selection);
expectStatus(owned,200,'authorized agent');
assert.equal(owned.data.plan.automaticActions,0);
assert.ok(owned.data.plan.tasks.every(t=>t.approvalRequired===true));
check('workspace-owned agent is read-only');
const knowledge=await request('/api/regional-sourcing/knowledge',selection);
expectStatus(knowledge,200,'knowledge');
check('authorized knowledge library loads');
const evidence=await request('/api/regional-sourcing/evidence',selection);
expectStatus(evidence,200,'evidence');
const evidenceIds=new Set((owned.data.records||[]).map(r=>r.id));
assert.ok(owned.data.plan.tasks.every(t=>t.citations.every(c=>evidenceIds.has(c)||(owned.data.hits||[]).some(h=>h.citation===c))));
check('all agent citations resolve to current evidence');
const mismatch=await request('/api/regional-sourcing/agent',{...selection,workspaceId:otherWorkspace});
expectStatus(mismatch,409,'forged workspace');
check('forged active workspace rejected');
const stale=await request('/api/regional-sourcing/agent',{...selection,revision:rev+1});
expectStatus(stale,409,'stale BOM');
check('stale revision rejected');
const otherCookie=cfg.NEXUS_STAGE_OTHER_COOKIE;
if(otherCookie){
 const foreign=await request('/api/regional-sourcing/knowledge',selection,otherCookie);
 assert.ok([403,404,409].includes(foreign.status),'foreign user must not read original documents');
 check('separate tenant cannot access documents');
}
if(cfg.NEXUS_STAGE_PDF_PATH){
 if(cfg.NEXUS_STAGE_ALLOW_WRITES!=='true')throw Error('Set NEXUS_STAGE_ALLOW_WRITES=true only on a disposable staging BOM');
 const line=Number(cfg.NEXUS_STAGE_BOM_LINE||'0');
 if(!Number.isInteger(line)||line<0||line>=50)throw Error('Invalid BOM line');
 async function upload(filePath,documentId){
  const bytes=await readFile(filePath);if(bytes.length>1500000||bytes.length<32)throw Error('PDF must be 32 bytes–1.5MB');
  const form=new FormData();form.set('workspaceId',workspaceId);form.set('bomId',bomId);form.set('revision',String(rev));form.set('line',String(line));form.set('persist','true');
  if(documentId)form.set('documentId',documentId);
  form.set('file',new Blob([bytes],{type:'application/pdf'}),'staging-acceptance.pdf');
  const result=await request('/api/regional-sourcing/datasheet',{},cookie,{method:'POST',body:form});
  expectStatus(result,200,'staging PDF upload');assert.ok(result.data.saved?.documentId);return result.data.saved;
 }
 const first=await upload(cfg.NEXUS_STAGE_PDF_PATH);
 check('real PDF text persisted to staging');
 if(cfg.NEXUS_STAGE_PDF_V2_PATH){
  const second=await upload(cfg.NEXUS_STAGE_PDF_V2_PATH,first.documentId);
  assert.equal(second.documentId,first.documentId);assert.ok(second.version>=first.version);
  check('second PDF version accepted and linked');
 }
 const history=await request('/api/regional-sourcing/knowledge',{...selection,documentId:first.documentId});
 expectStatus(history,200,'PDF version history');assert.ok(history.data.versions?.length>=1);
 check('stored document version history accessible');
 const query=cfg.NEXUS_STAGE_PDF_SEARCH_QUERY;
 if(query){
  const search=await request('/api/regional-sourcing/knowledge',{...selection,query});
  expectStatus(search,200,'document full-text search');assert.ok(search.data.hits?.some(h=>String(h.citation).startsWith('sha256:')));
  check('document search returns original version/page citation');
 }
}
console.log(JSON.stringify({status:'passed',stagingHost:base.host,checks,readOnly:cfg.NEXUS_STAGE_ALLOW_WRITES!=='true',note:'Checks operate against a caller-provided staging environment; no supplier crawls or payments were executed.'},null,2));
