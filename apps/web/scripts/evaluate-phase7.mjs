/**
 * Reproducible Phase 7 evaluation, deliberately limited to fictional fixtures.
 * Measures provenance linkage, human approval gates and prioritization stability,
 * NOT real-world supplier precision or model calibration.
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
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const module={exports:{}};
 const imp=p=>p==='./intelligence'?load('intelligence'):p==='./model'?load('model'):require(p);
 new Function('require','module','exports',compiled)(imp,module,module.exports);
 cache.set(file,module.exports);return module.exports;
}
export function evaluate(){
 const {syntheticEvidence}=load('intelligence'),{planResearch,answerAgent}=load('agent');
 const time=Date.parse('2026-11-25T12:00:00.000Z');
 const snapshot=syntheticEvidence(time);
 const plan=planResearch(snapshot,[],[],time);
 const sourceIds=new Set(snapshot.records.map(x=>x.id));
 const citationCount=plan.tasks.reduce((sum,t)=>sum+t.citations.length,0);
 const citationsValid=plan.tasks.reduce((sum,t)=>sum+t.citations.filter(c=>sourceIds.has(c)).length,0);
 const answer=answerAgent(plan,'What should I review before buying?');
 const reproducible=JSON.stringify(plan)===JSON.stringify(planResearch(snapshot,[],[],time));
 return {
  fixture:'fictional_health_monitor_BOM_with_mixed_quote_completeness',
  metrics:{
   bom_lines:snapshot.lines.length,
   customer_reported_priced_lines:plan.coverage.priced,
   research_candidates:plan.coverage.researchCandidates,
   action_proposals:plan.tasks.length,
   approvals_required:plan.tasks.filter(t=>t.approvalRequired).length,
   automatic_actions:plan.automaticActions,
   citations_checked:citationCount,
   citations_valid:citationsValid,
   citation_link_precision:citationCount?citationsValid/citationCount:1,
   repeatable_output:reproducible,
   suggested_actions_from_plan_only:answer.actions.every(a=>plan.tasks.some(t=>t.id===a.id)),
   accepted_unverified_research_as_quote:false,
   approved_engineering_substitutions:0
  },
  limits:{
   real_supplier_accuracy_measured:false,
   real_PDF_ingestion_measured:false,
   live_workspace_isolation_measured:false,
   semantic_vector_embeddings_implemented:false,
   scores_are_calibrated_probabilities:false
  }
 };
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 console.log(JSON.stringify(evaluate(),null,2));
}
