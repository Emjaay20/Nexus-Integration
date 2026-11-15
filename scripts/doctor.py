#!/usr/bin/env python3
import json, pathlib, shutil, subprocess
root=pathlib.Path(__file__).resolve().parents[1]
result={}
for tool in ['cargo','go','node','npm','docker','kind','kubectl','helm']:
 executable=shutil.which(tool)
 result[tool]={'installed':bool(executable)}
 if executable:
  args=[tool,'version'] if tool in ['go','kind'] else [tool,'version','--client=true'] if tool=='kubectl' else [tool,'version','--short'] if tool=='helm' else [tool,'--version']
  run=subprocess.run(args,capture_output=True,text=True,timeout=10)
  result[tool]['version']=(run.stdout or run.stderr).strip().splitlines()[0][:160]
result['web_dependencies']=(root/'apps/web/node_modules').exists()
print(json.dumps(result,indent=2))
