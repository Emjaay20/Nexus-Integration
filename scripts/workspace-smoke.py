#!/usr/bin/env python3
"""Exercise browser-session -> BFF -> signed identity -> Rust -> PostgreSQL -> Go.
Creates disposable accounts only on localhost, never in the hosted application.
"""
import argparse,http.cookiejar,json,pathlib,secrets,time,urllib.error,urllib.parse,urllib.request,uuid,os
p=argparse.ArgumentParser();p.add_argument('--url',default='http://localhost:3100');args=p.parse_args();base=args.url.rstrip('/')
assert urllib.parse.urlparse(base).hostname in ('localhost','127.0.0.1'), 'Smoke accounts are restricted to localhost'
def session():return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
def call(client,path,method='GET',data=None,headers=None):
 r=urllib.request.Request(base+path,data=None if data is None else json.dumps(data).encode(),method=method,headers={'Content-Type':'application/json',**(headers or {})})
 try:
  with client.open(r,timeout=20) as response:return response.status,json.load(response)
 except urllib.error.HTTPError as error:return error.code,json.loads(error.read())
def account(label):
 client=session();email=f'{label.lower().replace(" ","-")}-{uuid.uuid4().hex[:10]}@nexus.local';password=secrets.token_urlsafe(18)
 status,result=call(client,'/api/auth/register','POST',{'email':email,'password':password,'name':label,'organization':'Same untrusted organization label','role':'platform_admin'})
 assert status==201,(status,result)
 _,csrf=call(client,'/api/auth/csrf')
 encoded=urllib.parse.urlencode({'email':email,'password':password,'csrfToken':csrf['csrfToken'],'callbackUrl':base+'/workspace','json':'true'}).encode()
 response=client.open(urllib.request.Request(base+'/api/auth/callback/credentials',data=encoded,headers={'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'}),timeout=20)
 assert response.status==200
 status,context=call(client,'/api/workspace/context');assert status==200,(status,context)
 return client,context,{'email':email,'password':password}
a,ac,credentials=account('Platform Owner');b,bc,_=account('Platform Viewer')
assert ac['actor']['workspace_id']!=bc['actor']['workspace_id']
status,_=call(session(),'/api/workspace/boms',headers={'X-User-ID':ac['actor']['user_id'],'X-Role':'owner'});assert status==401
body={'name':'Verified controller board','raw_content':'Quantity,Manufacturer,MPN\n10,STMicroelectronics,STM32F401RET6\n40,Texas Instruments,LM1117-3.3'}
status,bom=call(a,'/api/workspace/boms','POST',body);assert status==201,(status,bom)
path='/api/workspace/boms/'+bom['id'];status,_=call(b,path);assert status==404
status,_=call(a,'/api/workspace/members/'+bc['actor']['user_id'],'PUT',{'role':'viewer'});assert status==200
status,_=call(b,'/api/workspace/context','POST',{'workspace_id':ac['actor']['workspace_id']});assert status==200
status,_=call(b,path);assert status==200
status,_=call(b,path,'PUT',body|{'revision':1});assert status==403
status,_=call(a,'/api/workspace/members/'+bc['actor']['user_id'],'PUT',{'role':'design_engineer'});assert status==200
status,revised=call(b,path,'PUT',body|{'revision':1});assert status==200 and revised['revision']==2
status,_=call(a,path,'PUT',body|{'revision':1});assert status==409
key=str(uuid.uuid4());payload={'bom_id':bom['id'],'revision':2}
status,job=call(a,'/api/workspace/jobs','POST',payload,{'Idempotency-Key':key});assert status==202,(status,job)
status,duplicate=call(a,'/api/workspace/jobs','POST',payload,{'Idempotency-Key':key});assert duplicate['id']==job['id']
for _ in range(40):
 status,job=call(a,'/api/workspace/jobs/'+job['id'])
 if job['state'] in ('completed','failed'):break
 time.sleep(.5)
assert job['state']=='completed',job
assert job['progress']==2 and all(row['data_source']=='reference' for row in job['result']['results'])
assert sorted(row['required_quantity'] for row in job['result']['results'])==[10,40]
status,_=call(a,'/api/workspace/members/'+bc['actor']['user_id'],'PUT',{'role':'viewer'});assert status==200
status,_=call(b,path,'PUT',body|{'revision':2});assert status==403
status,events=call(a,'/api/workspace/audit');assert status==200 and any(e['decision']=='deny' for e in events)
status,summary=call(a,'/api/workspace/boms');assert all('items' not in row and row['item_count']==2 for row in summary)
# The historical demo UUID has zero version bits and must still be a read-only identity.
demo=session();_,csrf=call(demo,'/api/auth/csrf')
encoded=urllib.parse.urlencode({'email':'demo@nexus.dev','password':'demo1234','csrfToken':csrf['csrfToken'],'callbackUrl':base+'/workspace','json':'true'}).encode()
demo.open(urllib.request.Request(base+'/api/auth/callback/credentials',data=encoded,headers={'Content-Type':'application/x-www-form-urlencoded','X-Auth-Return-Redirect':'1'}),timeout=20)
status,demo_context=call(demo,'/api/workspace/context');assert status==200 and demo_context['actor']['role']=='viewer',(status,demo_context)
status,demo_boms=call(demo,'/api/workspace/boms');assert status==200 and demo_boms
status,_=call(demo,'/api/workspace/boms','POST',body);assert status==403
root=pathlib.Path('.nexus');root.mkdir(exist_ok=True)
fd=os.open(root/'smoke-account.json',os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
with os.fdopen(fd,'w') as file:json.dump(credentials,file)
result={'readonly_demo':'passed','tenant_isolation':'passed','authenticated_identity':'passed','role_enforcement_and_revocation':'passed','revision_conflict':'passed','durable_job':'passed','idempotency':'passed','audit':'passed','bounded_list_payloads':'passed','bom_id':bom['id'],'request_id':job['request_id']}
(root/'evidence').mkdir(exist_ok=True);(root/'evidence/workspace-smoke.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
