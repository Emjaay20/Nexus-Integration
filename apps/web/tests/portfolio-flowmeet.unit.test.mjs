import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../src/lib/portfolio/flowmeet.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
const module={exports:{}};new Function('require','module','exports',code)(require,module,module.exports);
const {bookingUrl,bookingSlug,FALLBACK_BOOKING_URL,FLOWMEET_LEADS_URL,parseContact,toFlowMeetLead,captureConfigured}=module.exports;
const basic={name:'  Engineering Visitor  ',email:'VISITOR@example.com',company:'Prototype Lab',region:'Nigeria',interest:'demo_request',consent:true,website:'',requestKey:'nexus-1234567890-abcdef'};
test('known shared founder calendar is the fallback, never invents unprovisioned Nexus slug',()=>{
 assert.equal(bookingUrl(undefined),FALLBACK_BOOKING_URL);
 assert.equal(bookingSlug(FALLBACK_BOOKING_URL),'aetherhost');
 assert.equal(bookingUrl('https://flowmeet.aetherhost.app/book/nexus'),'https://flowmeet.aetherhost.app/book/nexus');
});
test('booking URLs are host and path constrained',()=>{
 for(const url of ['javascript:alert(1)','https://evil.example/book/nexus','https://flowmeet.aetherhost.app.evil.com/book/nexus','http://flowmeet.aetherhost.app/book/nexus','https://flowmeet.aetherhost.app/contact','https://flowmeet.aetherhost.app/book/nexus?inject=1','https://user:pass@flowmeet.aetherhost.app/book/nexus'])assert.throws(()=>bookingUrl(url));
});
test('properly shapes a privacy-consented FlowMeet contact',()=>{
 const value=parseContact(basic);
 assert.equal(value.email,'visitor@example.com');assert.equal(value.name,'Engineering Visitor');
 assert.deepEqual(toFlowMeetLead(value),{name:'Engineering Visitor',email:'visitor@example.com',company:'Prototype Lab',role:'Nexus / Nexus demonstration',region:'Nigeria',send_booking_email:false});
 assert.equal(FLOWMEET_LEADS_URL,'https://flowmeet.aetherhost.app/api/leads');
});
test('caller cannot specify workspace, automated booking or supplier action',()=>{
 const lead=toFlowMeetLead(parseContact({...basic,workspaceId:'foreign',send_booking_email:true,isAdmin:true}));
 assert.equal(lead.send_booking_email,false);
 assert.equal('workspace_id' in lead,false);
 assert.equal('message' in lead,false);
});
test('explicit data-sharing consent is mandatory',()=>{
 assert.throws(()=>parseContact({...basic,consent:false}),/Permission/);
 assert.throws(()=>parseContact({...basic,consent:'true'}),/Permission/);
});
test('invalid names, email and interests fail closed',()=>{
 for(const patch of [{name:''},{email:'not-an-address'},{interest:'free_money'},{requestKey:'short'},{email:12}])assert.throws(()=>parseContact({...basic,...patch}));
});
test('no raw contact secrets are required in the frontend',()=>{
 assert.equal(captureConfigured({}),false);
 assert.equal(captureConfigured({NEXUS_FLOWMEET_CAPTURE_ENABLED:'true',NEXUS_FLOWMEET_API_KEY:'not-enough'}),false);
 assert.equal(captureConfigured({NEXUS_FLOWMEET_CAPTURE_ENABLED:'true',NEXUS_FLOWMEET_API_KEY:'a'.repeat(32)}),true);
});
test('long fields are bounded and control characters removed',()=>{
 const item=parseContact({...basic,company:'AB'.repeat(100),region:'North\nNigeria'});
 assert.equal(item.company.length,120);assert.equal(item.region.includes('\n'),false);
});
