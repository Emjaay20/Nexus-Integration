#!/usr/bin/env python3
"""Prepare a reviewable Flux change using the tested-image release artifact."""
import argparse,pathlib,re
p=argparse.ArgumentParser();p.add_argument('artifact',help='tested-image.txt downloaded from the verified-image CI job');args=p.parse_args()
ref=pathlib.Path(args.artifact).read_text().strip()
match=re.fullmatch(r'ghcr\.io/emjaay20/nexus-integration@(sha256:[0-9a-f]{64})',ref)
if not match:raise SystemExit('Expected the Nexus tested-image artifact containing an immutable SHA256 reference')
manifest=pathlib.Path('deploy/flux/helm-release.yaml');text=manifest.read_text();text,count=re.subn(r'      digest: "[^"]+"',f'      digest: "{match[1]}"',text)
assert count==1;manifest.write_text(text)
print('Prepared deploy/flux/helm-release.yaml. Review the Git diff before committing the promotion.')
