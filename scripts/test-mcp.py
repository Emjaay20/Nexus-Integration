#!/usr/bin/env python3
"""Black-box protocol check. No model or production credentials required."""
import json, subprocess, sys
p = subprocess.Popen([sys.argv[1] if len(sys.argv)>1 else 'target/debug/platform-mcp'], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
def request(method, params=None):
 request.counter += 1
 p.stdin.write(json.dumps({'jsonrpc':'2.0','id':request.counter,'method':method,'params':params or {}})+'\n');p.stdin.flush()
 result=json.loads(p.stdout.readline());assert result['id']==request.counter;return result
request.counter=0
assert request('tools/list')['error']['code']==-32002
assert request('initialize',{'protocolVersion':'2025-11-25','capabilities':{},'clientInfo':{'name':'nexus-protocol-test','version':'1'}})['result']['protocolVersion']=='2025-11-25'
p.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized"}\n');p.stdin.flush()
tools=request('tools/list')['result']['tools'];assert len(tools)==4 and all(t['annotations']['readOnlyHint'] for t in tools)
parsed=request('tools/call',{'name':'parse_bom','arguments':{'raw_content':'Qty,MPN\n10,ABC123'}})['result'];assert parsed['structuredContent']['total_components']==10
assert request('tools/call',{'name':'execute_shell','arguments':{'command':'anything'}})['result']['isError']
diag=request('tools/call',{'name':'diagnose_environment'})['result']['structuredContent'];assert diag['secrets_redacted'] is True and all(isinstance(v,bool) for v in diag['configuration_present'].values())
assert request('resources/read',{'uri':'nexus://platform/contracts'})['result']['contents']
assert request('ping')['result']=={}
p.stdin.close();assert p.wait(timeout=5)==0
print('MCP: initialize, tools/list, tools/call, resources/read, error handling, and redaction passed')
