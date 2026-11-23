#!/usr/bin/env python3
"""Read-only AetherHost portfolio probe. No credentials or write requests."""
import argparse,json,sys,time,urllib.request,urllib.error,urllib.parse

def check(name,url,expected,kind):
    start=time.monotonic(); result={'name':name,'url':url,'expected':expected};
    try:
        req=urllib.request.Request(url,headers={'User-Agent':'PortfolioReadOnlySmoke/1.0','Accept':'application/json, text/html'})
        try: response=urllib.request.urlopen(req,timeout=12)
        except urllib.error.HTTPError as exc: response=exc
        with response as r:
            final=r.geturl(); data=r.read(262144); status=r.status
        result.update(status=status,final_url=final)
        same_host=urllib.parse.urlparse(final).netloc==urllib.parse.urlparse(url).netloc
        ok=status in expected
        if kind=='json':
            try:
                payload=json.loads(data);ok=ok and isinstance(payload,dict)
                if isinstance(payload,dict):
                    result['reported_status']=payload.get('status');ok=ok and str(payload.get('status','')).lower() not in ('degraded','unhealthy','offline','error','not_ready')
            except (ValueError,UnicodeError):ok=False
        elif kind=='console':
            ok=ok and same_host and b'404 page not found' not in data.lower()
            # External identity redirects require explicit review, not a claimed pass.
        result['pass']=ok
    except Exception as e:result.update({'pass':False,'error':str(e)})
    result['elapsed_ms']=round((time.monotonic()-start)*1000);return result

def main():
    p=argparse.ArgumentParser();p.add_argument('--nexus',default='https://nexus-integration.aetherhost.app');p.add_argument('--flowmeet',default='https://flowmeet.aetherhost.app');p.add_argument('--preflight',default='https://preflight.aetherhost.com.ng');p.add_argument('--aether',default='https://aetherhost.app');p.add_argument('--candidate',action='store_true',help='Include new Nexus route guard check after patch')
    a=p.parse_args();checks=[('Nexus home',a.nexus+'/',[200],'html'),('Nexus readiness',a.nexus+'/api/health',[200],'json'),('Nexus status',a.nexus+'/status',[200],'html'),('Nexus Studio',a.nexus+'/platform-core',[200],'html'),('Nexus anonymous workspace API',a.nexus+'/api/workspace/context',[401],'json'),('FlowMeet home',a.flowmeet+'/',[200],'html'),('FlowMeet health',a.flowmeet+'/api/health',[200],'json'),('Preflight home',a.preflight+'/',[200],'html'),('Preflight readiness',a.preflight+'/health/ready',[200],'json'),('AetherHost home',a.aether+'/',[200],'html'),('AetherHost console',a.aether+'/console',[200,401,403],'console')]
    if a.candidate: checks.append(('Nexus public proxy rejects private route',a.nexus+'/api/platform-core/api/v1/workspace/boms',[404],'json'))
    results=[check(*c) for c in checks];print(json.dumps({'checks':results,'pass':all(r['pass'] for r in results)},indent=2));return 0 if all(r['pass'] for r in results) else 1
if __name__=='__main__':sys.exit(main())
