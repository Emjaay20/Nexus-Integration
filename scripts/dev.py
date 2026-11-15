#!/usr/bin/env python3
"""One local environment, with an isolated database and no distributor credentials."""
import os, pathlib, secrets, signal, subprocess, sys, time
root=pathlib.Path(__file__).resolve().parents[1]
subprocess.run(['docker','compose','-f',str(root/'deploy/local/compose.yaml'),'up','-d','--wait','db'],check=True)
state=root/'.nexus';state.mkdir(exist_ok=True)
secret_file=state/'dev-secret'
if not secret_file.exists():
 fd=os.open(secret_file,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
 with os.fdopen(fd,'w') as file:file.write(secrets.token_urlsafe(48))
secret=secret_file.read_text().strip()
env=os.environ.copy();env.update(HOST='127.0.0.1',INGEST_HOST='127.0.0.1',DATABASE_URL='postgresql://nexus_dev:nexus_local_only@127.0.0.1:15432/nexus_dev',AUTH_SECRET=secret,CORE_AUTH_SECRET=secret,AUTH_URL='http://localhost:3100',RUST_BACKEND_URL='http://127.0.0.1:18088',GO_INGEST_URL='http://127.0.0.1:18090',NEXT_PUBLIC_PUSHER_KEY='',PUSHER_APP_ID='',PUSHER_SECRET='',NEXT_PUBLIC_PUSHER_CLUSTER='')
for key in ['DIGIKEY_CLIENT_ID','DIGIKEY_CLIENT_SECRET','MOUSER_API_KEY','NEXAR_CLIENT_ID','NEXAR_CLIENT_SECRET','GEMINI_API_KEY','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET']:env[key]=''
children=[]
def stop(*_):
 for process in children:
  if process.poll() is None:
   try:os.killpg(process.pid,signal.SIGTERM)
   except ProcessLookupError:pass
 for process in children:
  try:process.wait(timeout=5)
  except subprocess.TimeoutExpired:os.killpg(process.pid,signal.SIGKILL)
 sys.exit(0)
signal.signal(signal.SIGINT,stop);signal.signal(signal.SIGTERM,stop)
try:
 for command,cwd,overrides in [(['go','run','.'],root/'services/ingest',{'INGEST_PORT':'18090'}),(['cargo','run','--bin','platform-core'],root,{'PORT':'18088'}),(['npm','run','dev','--','--port','3100','--hostname','127.0.0.1'],root/'apps/web',{})]:
  children.append(subprocess.Popen(command,cwd=cwd,env=env|overrides,start_new_session=True))
 print('\nNexus: http://localhost:3100 · Rust :18088 · Go :18090 · local PostgreSQL :15432\nCreate a local account to edit BOMs; the public demo account is read-only.\n',flush=True)
 while True:
  for process in children:
   if process.poll() is not None:raise RuntimeError(f'Development service exited with status {process.returncode}')
  time.sleep(1)
finally:stop()
