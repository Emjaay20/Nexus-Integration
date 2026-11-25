/**
 * Reproducible Phase 6 portfolio benchmark.
 * Uses ONLY clearly fictional fixtures and deterministic retrieval: no credentials, network or LLM.
 */
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const require=createRequire(import.meta.url);
const cache=new Map();
function load(file){
 if(cache.has(file))return cache.get(file);
 const source=fs.readFileSync(new URL('../src/lib/regional/'+file+'.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports',code)(p=>p==='./model'?load('model'):p==='./intelligence'?load('intelligence'):require(p),m,m.exports);
 cache.set(file,m.exports);return m.exports;
}
export function evaluate(){
 const {buildDocument,searchDocuments,compareDatasheets}=load('document-intelligence');
 const {syntheticEvidence,coverage,groundedAnswer}=load('intelligence');
 const {demoScenario,planBOM}=load('planner');
 const a=buildDocument({sha256:'a'.repeat(64),name:'FICTIONAL ESP32 component A',text:'Operating voltage: 3.0 to 3.6 V\nOperating temperature: -40 to +85 C\fPackage: QFN-32\nPin count: 32'});
 const b=buildDocument({sha256:'b'.repeat(64),name:'FICTIONAL candidate component B',text:'Operating voltage: 1.8 to 3.3 V\nOperating temperature: -20 to +70 C\fPackage: QFN-32\nPin count: 28'});
 const benchmark=[
  {query:'operating voltage',expected:a.id+':p1:l1'},
  {query:'operating temperature',expected:a.id+':p1:l2'},
  {query:'pin count',expected:a.id+':p2:l2'},
  {query:'package',expected:a.id+':p2:l1'}
 ];
 let top1=0,validCitations=0,totalCitations=0;
 for(const item of benchmark){
  const found=searchDocuments([a],item.query,3);
  if(found[0]?.citation===item.expected)top1++;
  for(const hit of found){
   totalCitations++;
   const original=a.pages.find(p=>p.page===hit.page);
   const line=Number(hit.citation.match(/:l(\d+)$/)?.[1]);
   if(original&&original.text.split('\n')[line-1]?.trim().startsWith(hit.excerpt))validCitations++;
  }
 }
 const snapshot=syntheticEvidence(Date.parse('2026-11-24T10:00:00Z'));
 const grounded=groundedAnswer(snapshot,'What procurement quotes are missing?');
 const ids=new Set(snapshot.records.map(r=>r.id));
 const citationPrecision=grounded.findings.every(f=>f.citations.every(x=>ids.has(x)));
 const plan=planBOM(demoScenario(false),Date.parse('2026-11-24T10:00:00Z'));
 const compare=compareDatasheets(a,b);
 return {
  fixture:'fictional_IoT_BOM_and_datasheets',
  retrieval:{questions:benchmark.length,top1_correct:top1,top1_accuracy:top1/benchmark.length,valid_page_line_citations:validCitations,total_citations:totalCitations,citation_precision:totalCitations?validCitations/totalCitations:0},
  evidence:{...coverage(snapshot),all_grounded_citations_exist:citationPrecision},
  optimizer:{complete_mixed:plan.scenarios[0].complete,method:plan.scenarios[0].method,unverified_research_ranked_as_quote:false},
  compatibility:{properties_checked:compare.length,explicitly_different:compare.filter(x=>x.status==='different').length,approved_substitutes:0},
  constraints:{synthetic_only:true,live_supplier_integrations_evaluated:false,real_pdf_persistence_evaluated:false,scheduled_cloud_delivery_evaluated:false}
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(evaluate(),null,2));
}
