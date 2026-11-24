import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../scripts/evaluate-phase6.mjs';
test('reproducible synthetic retrieval benchmark reports supported page citations and no fabricated purchasing proof',()=>{
 const report=evaluate();
 assert.equal(report.fixture,'fictional_IoT_BOM_and_datasheets');
 assert.equal(report.retrieval.questions,4);
 assert.equal(report.retrieval.top1_accuracy,1);
 assert.equal(report.retrieval.citation_precision,1);
 assert.equal(report.evidence.total,5);
 assert.equal(report.evidence.priced,1);
 assert.equal(report.evidence.unpriced,4);
 assert.equal(report.evidence.all_grounded_citations_exist,true);
 assert.equal(report.optimizer.complete_mixed,true);
 assert.equal(report.compatibility.approved_substitutes,0);
 assert.equal(report.constraints.live_supplier_integrations_evaluated,false);
});
