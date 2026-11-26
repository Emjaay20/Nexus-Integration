import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate} from '../scripts/evaluate-phase7.mjs';
test('Phase 7 synthetic agent plan is reproducible, citation-grounded and never self-activating',()=>{
 const result=evaluate();
 assert.equal(result.fixture,'fictional_health_monitor_BOM_with_mixed_quote_completeness');
 assert.equal(result.metrics.bom_lines,5);
 assert.equal(result.metrics.customer_reported_priced_lines,1);
 assert.ok(result.metrics.action_proposals>0);
 assert.equal(result.metrics.action_proposals,result.metrics.approvals_required);
 assert.equal(result.metrics.citation_link_precision,1);
 assert.equal(result.metrics.automatic_actions,0);
 assert.equal(result.metrics.repeatable_output,true);
 assert.equal(result.metrics.suggested_actions_from_plan_only,true);
 assert.equal(result.limits.semantic_vector_embeddings_implemented,false);
 assert.equal(result.limits.real_supplier_accuracy_measured,false);
});
