import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const modules=new Map();
function load(name){
 if(modules.has(name))return modules.get(name);
 const src=fs.readFileSync(new URL('../src/lib/regional/'+name+'.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2017}}).outputText;
 const m={exports:{}};
 new Function('require','module','exports',code)(path=>path==='./model'?load('model'):require(path),m,m.exports);
 modules.set(name,m.exports);return m.exports;
}
const {planBOM,demoScenario,validateScenario,PlanError}=load('planner');
function single(q=10){const s=demoScenario(false);return {...s,label:'Synthetic test',lines:[{...s.lines[0],quantity:q}],offers:s.offers.filter(o=>o.lineId===s.lines[0].id)};}
function offer(id,supplierId,stock,price4){return {id,lineId:'line-0',supplierId,mpn:'PART-1',manufacturer:'Test',stock,moq:1,minQuantity:1,maxQuantity:100,tiers:[{minQty:1,unitPrice4:String(price4)}],currency:'NGN',fx6:'1000000',shipping2:'0',fees2:'0',validUntil:'2099-01-01T00:00:00.000Z',identityConfirmed:true,destinationConfirmed:true,evidence:'illustrative'};}
function two(){return {label:'Synthetic split',country:'NG',currency:'NGN',lines:[{id:'line-0',mpn:'PART-1',manufacturer:'Test',quantity:10}],suppliers:[{id:'a',name:'A',region:'local',setupMinor:'0'},{id:'b',name:'B',region:'international',setupMinor:'0'}],offers:[offer('a1','a',4,10000),offer('b1','b',6,10000)]};}
test('demo has local, international and mixed comparisons with correct currencies',()=>{const r=planBOM(demoScenario(false));assert.equal(r.currency,'NGN');assert.equal(r.scenarios.length,3);assert.equal(r.scenarios[0].complete,true);assert.equal(r.scenarios[0].method,'exact');assert.ok(r.recommended);});
test('exact algorithm splits a line when no single supplier has enough stock',()=>{const r=planBOM(two());const m=r.scenarios[0];assert.equal(m.complete,true);assert.equal(m.method,'exact');assert.equal(m.allocations.length,2);assert.equal(m.allocations.reduce((s,a)=>s+a.quantity,0),10);assert.equal(m.totalMinor,'1000');});
test('local and international coverage is honestly incomplete when split across both is required',()=>{const r=planBOM(two());assert.equal(r.scenarios[1].complete,false);assert.equal(r.scenarios[1].totalMinor,null);assert.equal(r.scenarios[2].complete,false);assert.equal(r.scenarios[2].totalMinor,null);});
test('one supplier setup cost charged only once across several BOM lines',()=>{const s=two();s.lines.push({id:'line-1',mpn:'PART-2',manufacturer:'Test',quantity:10});s.offers.push({...offer('b2','b',10,10000),lineId:'line-1',mpn:'PART-2'});s.offers[0].stock=10;s.offers[1].stock=10;s.suppliers[0].setupMinor='250';s.suppliers[1].setupMinor='50';const r=planBOM(s);const m=r.scenarios[0];assert.equal(m.complete,true);assert.equal(m.setupMinor,'50');assert.equal(m.totalMinor,'2050');});
test('MOQ cannot be bypassed when constructing split allocations',()=>{const s=two();s.offers[0].moq=5;const r=planBOM(s);assert.equal(r.scenarios[0].complete,false);assert.equal(r.scenarios[0].totalMinor,null);});
test('tiered prices apply at minimum price-break quantity',()=>{const s=single(10);s.suppliers=s.suppliers.slice(0,1);s.suppliers[0].setupMinor='0';s.offers=s.offers.slice(0,1);s.offers[0].stock=100;s.offers[0].tiers=[{minQty:1,unitPrice4:'10000'},{minQty:10,unitPrice4:'7500'}];const ten=planBOM(s).scenarios[0];assert.equal(ten.totalMinor,'750');s.lines[0].quantity=9;assert.equal(planBOM(s).scenarios[0].totalMinor,'900');});
test('source conversion is fixed-point, includes explicit per-offer freight',()=>{const s=single(10);s.suppliers=s.suppliers.slice(0,1);s.suppliers[0].setupMinor='0';s.offers=s.offers.slice(0,1);const o=s.offers[0];o.tiers=[{minQty:1,unitPrice4:'13750'}];o.currency='USD';o.fx6='1500000000';o.shipping2='1550';o.fees2='200';const r=planBOM(s).scenarios[0];assert.equal(r.totalMinor,'4687500');});
test('zero and null commercial evidence never becomes zero-cost offer',()=>{const s=single(5);s.offers=s.offers.slice(0,1);s.offers[0].shipping2=null;const r=planBOM(s).scenarios[0];assert.equal(r.complete,false);assert.equal(r.totalMinor,null);});
test('expired offers and missing confirmation are not eligible',()=>{const s=single(5);s.offers=s.offers.slice(0,1);s.offers[0].validUntil='2020-01-01T00:00:00.000Z';assert.equal(planBOM(s).scenarios[0].complete,false);s.offers[0].validUntil='2099-01-01T00:00:00.000Z';s.offers[0].identityConfirmed=false;assert.equal(planBOM(s).scenarios[0].complete,false);});
test('exact quote for quantity 10 is never applied to 5',()=>{const s=single(5);s.offers=s.offers.slice(0,1);s.offers[0].minQuantity=10;s.offers[0].maxQuantity=10;assert.equal(planBOM(s).scenarios[0].complete,false);});
test('scenario validator rejects wrong MPN manufacturer, invalid ranges and negative money',()=>{const s=two();s.offers[0].mpn='OTHER';assert.throws(()=>validateScenario(s),PlanError);s.offers[0].mpn='PART-1';s.offers[0].manufacturer='not test';assert.throws(()=>validateScenario(s),PlanError);s.offers[0].manufacturer='Test';s.suppliers[0].setupMinor='-10';assert.throws(()=>validateScenario(s),PlanError);});
test('50-line stress fixture completes with disclosed heuristic and no network',()=>{const result=planBOM(demoScenario(true));const mixed=result.scenarios[0];assert.equal(mixed.method,'heuristic');assert.equal(mixed.complete,true);assert.equal(mixed.allocations.reduce((s,a)=>s+a.quantity,0),demoScenario(true).lines.reduce((s,l)=>s+l.quantity,0));});
test('bounded arrays reject inputs that might exhaust server resources',()=>{const s=demoScenario(true);s.lines.push({...s.lines[0],id:'51'});assert.throws(()=>planBOM(s),PlanError);});
test('duplicate supplier and offer identifiers are refused',()=>{const s=two();s.offers.push({...s.offers[0]});assert.throws(()=>planBOM(s),PlanError);});
test('a missing line is reported by MPN instead of inventing a price',()=>{const s=two();s.lines.push({id:'line-1',mpn:'MISSING-IC',manufacturer:'Test',quantity:3});const r=planBOM(s);assert.equal(r.recommended,null);assert.equal(r.scenarios[0].complete,false);assert.equal(r.scenarios[0].uncovered[0].mpn,'MISSING-IC');});
