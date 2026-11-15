#!/usr/bin/env python3
"""Reproducible client-observed parsing benchmark; no latency claims without a run."""
import argparse, concurrent.futures, json, pathlib, platform, statistics, subprocess, time, urllib.request, urllib.parse
p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:3100');p.add_argument('--requests',type=int,default=100);p.add_argument('--concurrency',type=int,default=8);p.add_argument('--output',default='.nexus/evidence/benchmark.json');args=p.parse_args()
assert urllib.parse.urlparse(args.url).hostname in ('localhost', '127.0.0.1', '::1'), 'Benchmarks are restricted to localhost'
assert 1<=args.requests<=10000 and 1<=args.concurrency<=32
payload=json.dumps({'raw_content':'MPN,Quantity,Manufacturer\n'+'\n'.join(f'RC0603FR-0710KL,{i+1},Yageo' for i in range(100))}).encode()
def run(_):
 start=time.perf_counter()
 try:
  with urllib.request.urlopen(urllib.request.Request(args.url+'/api/platform-core/api/v1/bom/parse',data=payload,headers={'Content-Type':'application/json'}),timeout=15) as r:
   body=json.load(r);ok=r.status==200 and body['valid_lines']==100
 except Exception:ok=False
 return (time.perf_counter()-start)*1000,ok
for i in range(5):run(i)
start=time.perf_counter()
with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:results=list(pool.map(run,range(args.requests)))
elapsed=time.perf_counter()-start;values=sorted(t for t,_ in results)
def percentile(p):return round(values[min(len(values)-1,int((len(values)-1)*p))],2)
result={'scope':'client-observed HTTP parsing; 100 BOM rows per request','requests':args.requests,'concurrency':args.concurrency,'errors':sum(not ok for _,ok in results),'p50_ms':percentile(.5),'p95_ms':percentile(.95),'p99_ms':percentile(.99),'requests_per_second':round(len(values)/elapsed,2),'machine':platform.machine(),'python':platform.python_version(),'commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'working_tree_dirty':bool(subprocess.check_output(['git','status','--porcelain'],text=True).strip())}
path=pathlib.Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
if result['errors']:raise SystemExit(1)
