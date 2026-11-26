import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const modules=new Map();
function load(name){
 if(modules.has(name))return modules.get(name);
 const source=fs.readFileSync(new URL('../src/lib/regional/'+name+'.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports',code)(p=>p==='./intelligence'?load('intelligence'):p==='./model'?load('model'):require(p),m,m.exports);
 modules.set(name,m.exports);return m.exports;
}
const {syntheticEvidence,buildEvidence}=load('intelligence');
const {planResearch,answerAgent,syntheticAgentPlan}=load('agent');
const NOW=Date.parse('2026-11-25T12:00:00.000Z');
function demo(){return syntheticEvidence(NOW)}
function doc(lineIndex=1,hash='a'.repeat(64),truncated=false){return {documentId:'abc-'+lineIndex,lineIndex,name:'Synthetic datasheet',sha256:hash,version:2,pageCount:2,truncated};}
function hit(d,lineIndex=d.lineIndex){return {documentId:d.documentId,lineIndex,document:d.name,sha256:d.sha256,version:d.version,page:1,excerpt:'Operating voltage [3.0] to 3.6 V',citation:'sha256:'+d.sha256+':v2:p1',rank:0.2};}
test('synthetic demo has explicit non-commercial classifications and no automatic actions',()=>{
 const plan=syntheticAgentPlan(NOW);
 assert.equal(plan.kind,'synthetic_demo');assert.equal(plan.coverage.total,5);assert.equal(plan.coverage.priced,1);assert.equal(plan.automaticActions,0);
 assert.ok(plan.tasks.length>=8);assert.ok(plan.tasks.every(t=>t.approvalRequired===true));
});
test('all cited source IDs resolve to evidence and task priorities use deterministic bounds',()=>{
 const s=demo(),ids=new Set(s.records.map(r=>r.id));
 const p=planResearch(s,[],[],NOW);
 assert.ok(p.tasks.every(t=>t.urgencyScore>=0&&t.urgencyScore<=100));
 assert.ok(p.tasks.every(t=>t.citations.every(c=>ids.has(c))));
 assert.equal(p.tasks[0].priority,'critical');
 assert.match(p.warnings.join(' '),/not calibrated/);
});
test('existing customer-reported complete quote is not called a missing quote',()=>{
 const p=planResearch(demo(),[],[],NOW);
 assert.equal(p.tasks.some(t=>t.lineId==='line-0'&&t.action==='obtain_quote'),false);
 assert.equal(p.tasks.some(t=>t.lineId==='line-1'&&t.action==='obtain_quote'),true);
});
test('research observations trigger verification and never become accepted quotes',()=>{
 const p=planResearch(demo(),[],[],NOW);
 const research=p.tasks.find(t=>t.lineId==='line-1'&&t.action==='verify_research');
 assert.ok(research);
 assert.equal(research.handoff,'research_queue');
 assert.equal(research.evidenceStrength,'unverified_research');
 assert.ok(research.citations.some(id=>id.startsWith('R')));
 assert.equal(p.coverage.priced,1);
});
test('incomplete quotes demand renewal, not fabricated pricing',()=>{
 const p=planResearch(demo(),[],[],NOW);
 const renewal=p.tasks.find(t=>t.lineId==='line-2'&&t.action==='revalidate_quote');
 assert.ok(renewal);assert.equal(renewal.approvalRequired,true);
 assert.equal(p.coverage.unpriced,4);
});
test('document coverage suppresses missing-datasheet proposal for that line',()=>{
 const d=doc(1),p=planResearch(demo(),[d],[hit(d)],NOW);
 assert.equal(p.documentsIndexed,1);assert.equal(p.retrievedExcerpts,1);
 assert.equal(p.tasks.some(t=>t.lineId==='line-1'&&t.action==='upload_datasheet'),false);
});
test('truncated PDF requires review with page-backed citation',()=>{
 const d=doc(1, 'a'.repeat(64),true),p=planResearch(demo(),[d],[hit(d)],NOW);
 const action=p.tasks.find(t=>t.action==='review_document'&&t.lineId==='line-1');
 assert.ok(action);assert.deepEqual(action.citations,[hit(d).citation]);
});
test('rejects forged source identity and wrong document revision',()=>{
 const d=doc();
 assert.throws(()=>planResearch(demo(),[d],[{...hit(d),sha256:'b'.repeat(64)}],NOW),/Untrusted/);
 assert.throws(()=>planResearch(demo(),[d],[{...hit(d),citation:'sha256:fake:v2:p1'}],NOW),/citation/);
 assert.throws(()=>planResearch(demo(),[d],[{...hit(d),page:3}],NOW),/Untrusted/);
 assert.throws(()=>planResearch(demo(),[d],[{...hit(d),lineIndex:0}],NOW),/Untrusted/);
});
test('unassociated document references fail closed instead of exposing foreign pages',()=>{
 const d=doc(5);
 assert.throws(()=>planResearch(demo(),[d]),/provenance/);
});
test('question answering is deterministic and returns only existing tasks',()=>{
 const p=planResearch(demo(),[],[],NOW);
 const a=answerAgent(p,'What are the quote risks?');
 assert.ok(a.actions.every(t=>p.tasks.some(x=>x.id===t.id)));
 assert.ok(a.actions.every(t=>['obtain_quote','revalidate_quote'].includes(t.action)));
 assert.deepEqual(answerAgent(p,'What are the quote risks?'),a);
});
test('questions about compatibility never approve substitute components',()=>{
 const p=planResearch(demo(),[],[],NOW),a=answerAgent(p,'Can I replace this electronic component?');
 assert.ok(a.actions.every(t=>['upload_datasheet','review_document'].includes(t.action)));
 assert.match(a.disclaimer,/no purchase/i);
});
test('question bounds and malformed snapshot fail closed',()=>{
 const p=planResearch(demo(),[],[],NOW);
 assert.throws(()=>answerAgent(p,'x'.repeat(241)));
 assert.throws(()=>planResearch({...demo(),records:Array(301).fill(demo().records[0])}),/Invalid/);
});
test('empty BOM and detached foreign document cannot be accepted',()=>{
 assert.throws(()=>planResearch({...demo(),lines:[]}),/Invalid/);
 assert.throws(()=>planResearch(demo(),[doc(0)], [hit(doc(1))]),/Untrusted/);
});
test('agent does not add pricing, purchases, crawls or file side effects',()=>{
 const p=planResearch(demo(),[],[],NOW);
 assert.equal(p.automaticActions,0);
 assert.ok(p.tasks.every(t=>t.handoff==='regional_sourcing'||t.handoff==='research_queue'||t.handoff==='datasheet_workbench'));
 assert.ok(p.tasks.every(t=>!('price' in t)&&!('execute' in t)));
});

test('single-source exposure is flagged without claiming an actual supplier outage',()=>{
 const s=demo(),p=planResearch(s,[],[],NOW);
 const t=p.tasks.find(x=>x.action==='diversify_supplier'&&x.lineId==='line-0');
 assert.ok(t);assert.ok(t.citations.length===1&&t.citations[0].startsWith('Q'));
 assert.match(t.reason,/Only one distinct supplier/);
 assert.match(t.reason,/does not prove/);
 assert.equal(t.approvalRequired,true);
});
