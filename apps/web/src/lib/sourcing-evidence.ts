export type EvidencePart = {
  query_mpn?: string; normalized_mpn?: string; manufacturer?: string; required_quantity?: number;
  best_unit_price_at_qty?: number; best_distributor?: string; data_source?: string;
  total_stock?: number; lifecycle_status?: string; warnings?: string[];
};
export type Snapshot = { id: string; bom_id: string; bom_revision: number; state: string; progress: number; total: number; result: { results: EvidencePart[] } | null };
export function complete(snapshot: Snapshot): boolean {
  return snapshot.state==='completed' && snapshot.progress===snapshot.total && snapshot.total>0 && snapshot.total<=500 && snapshot.result?.results.length===snapshot.total;
}
export function safeCell(value: unknown): string {
  let s=value==null?'':String(value);
  if (/^[\s\uFEFF]*[=+@-]/.test(s) || /^[\t\r\n]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
function source(p: EvidencePart): string { return p.data_source==='live'||p.data_source==='reference'?p.data_source:'unavailable'; }
function quantity(p: EvidencePart): number | null { return Number.isSafeInteger(p.required_quantity)&&Number(p.required_quantity)>0?Number(p.required_quantity):null; }
function price(p: EvidencePart): number|null {return source(p)!=='unavailable'&&typeof p.best_unit_price_at_qty==='number'&&Number.isFinite(p.best_unit_price_at_qty)&&p.best_unit_price_at_qty>0?p.best_unit_price_at_qty:null;}
export function evidenceCsv(s: Snapshot): string {
  if(!complete(s))throw new Error('A complete saved sourcing job is required');
  const rows:unknown[][]=[['job_id','bom_id','bom_revision','query_mpn','normalized_mpn','manufacturer','required_quantity','data_source','unit_price_usd_reported','extended_usd_indicative','best_distributor_reported','stock_reported','lifecycle_reported','warnings','qualification']];
  for(const p of s.result!.results){const q=quantity(p),v=price(p);const ext=q!==null&&v!==null?q*v:null;
    rows.push([s.id,s.bom_id,s.bom_revision,p.query_mpn,p.normalized_mpn,p.manufacturer,q,source(p),v,ext!==null&&Number.isFinite(ext)?ext.toFixed(4):null,p.best_distributor,source(p)!=='unavailable'?p.total_stock:null,p.lifecycle_status,p.warnings?.join('; '),'Advisory; not an approved quotation or qualified replacement']);}
  return rows.map(r=>r.map(safeCell).join(',')).join('\r\n');
}
export function quantityDiff(old: Snapshot, current: Snapshot) {
  if(!complete(old)||!complete(current)||old.bom_id!==current.bom_id||old.bom_revision>=current.bom_revision)throw new Error('Select an earlier completed revision of the same BOM');
  const group=(s:Snapshot)=>{const result=new Map<string,number>();for(const p of s.result!.results){const q=quantity(p),part=(p.query_mpn||p.normalized_mpn||'').trim().toUpperCase();if(!part||q===null)throw new Error('Snapshot contains incomplete quantity data');const k=part;result.set(k,(result.get(k)??0)+q);}return result;};
  const a=group(old),b=group(current);return [...new Set([...a.keys(),...b.keys()])].sort().map(part=>({part,before:a.get(part)??0,after:b.get(part)??0})).filter(v=>v.before!==v.after);
}
