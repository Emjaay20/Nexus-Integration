#!/usr/bin/env bash
# Tests the exact built image in a disposable cluster. Does not touch a user's cluster.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IMAGE="${NEXUS_VERIFY_IMAGE:-nexus-platform:verify}"
CLUSTER="nexus-verify-$(python3 -c 'import uuid; print(uuid.uuid4().hex[:10])')"
VERIFY_KUBECONFIG="$(mktemp)"
export KUBECONFIG="$VERIFY_KUBECONFIG"
CONTEXT="kind-${CLUSTER}"
NAMESPACE=nexus-verify
for tool in docker kind kubectl helm; do command -v "$tool" >/dev/null || { echo "Missing $tool. Run make doctor."; exit 1; }; done
mkdir -p "$ROOT/.nexus/evidence"
cleanup() { kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true; rm -f "$VERIFY_KUBECONFIG"; }
trap cleanup EXIT
kind create cluster --name "$CLUSTER" --wait 90s
kind load docker-image "$IMAGE" --name "$CLUSTER"
kubectl --context "$CONTEXT" create namespace "$NAMESPACE"
# Local fixture credentials only. Production secrets are never copied into this cluster.
kubectl --context "$CONTEXT" -n "$NAMESPACE" create secret generic nexus-runtime --from-literal=DATABASE_URL=postgresql://nexus_verify:nexus_verify@postgres:5432/nexus_verify --from-literal=AUTH_SECRET=kind-fixture-only-more-than-thirty-two-bytes --from-literal=CORE_AUTH_SECRET=kind-fixture-only-more-than-thirty-two-bytes --from-literal=AUTH_TRUST_HOST=true
kubectl --context "$CONTEXT" -n "$NAMESPACE" apply -f - <<'YAML'
apiVersion: apps/v1
kind: Deployment
metadata: {name: postgres}
spec:
  replicas: 1
  selector: {matchLabels: {app: postgres}}
  template:
    metadata: {labels: {app: postgres}}
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - {name: POSTGRES_USER, value: nexus_verify}
            - {name: POSTGRES_PASSWORD, value: nexus_verify}
            - {name: POSTGRES_DB, value: nexus_verify}
          readinessProbe:
            exec: {command: [pg_isready, -U, nexus_verify]}
            initialDelaySeconds: 3
            periodSeconds: 2
---
apiVersion: v1
kind: Service
metadata: {name: postgres}
spec:
  selector: {app: postgres}
  ports: [{port: 5432}]
YAML
kubectl --context "$CONTEXT" -n "$NAMESPACE" rollout status deployment/postgres --timeout=120s
REPOSITORY="${IMAGE%:*}"; TAG="${IMAGE##*:}"
helm --kube-context "$CONTEXT" upgrade --install nexus "$ROOT/deploy/helm" -n "$NAMESPACE" --set image.repository="$REPOSITORY" --set image.tag="$TAG" --set replicaCount=2 --wait --timeout=180s
kubectl --context "$CONTEXT" -n "$NAMESPACE" run traffic --image=curlimages/curl:8.12.1 --restart=Never --command -- sh -c 'failures=0; total=120; for i in $(seq 1 "$total"); do curl -fsS --max-time 3 http://nexus:3000/api/health >/dev/null || failures=$((failures+1)); sleep .25; done; echo "{\"requests\":$total,\"failures\":$failures}"; test "$failures" -eq 0'
kubectl --context "$CONTEXT" -n "$NAMESPACE" wait --for=condition=Ready pod/traffic --timeout=120s
kubectl --context "$CONTEXT" -n "$NAMESPACE" rollout restart deployment/nexus
kubectl --context "$CONTEXT" -n "$NAMESPACE" rollout status deployment/nexus --timeout=120s
kubectl --context "$CONTEXT" -n "$NAMESPACE" wait --for=jsonpath='{.status.phase}'=Succeeded pod/traffic --timeout=180s
kubectl --context "$CONTEXT" -n "$NAMESPACE" logs traffic | tee "$ROOT/.nexus/evidence/rolling-update.json"
# A deliberately unpullable image must roll back while the existing replicas keep serving.
if helm --kube-context "$CONTEXT" upgrade nexus "$ROOT/deploy/helm" -n "$NAMESPACE" --set image.repository="$REPOSITORY" --set image.tag=deliberately-missing-image --set replicaCount=2 --wait --atomic --timeout=30s; then
 echo 'Expected the broken release to fail'; exit 1
fi
kubectl --context "$CONTEXT" -n "$NAMESPACE" rollout status deployment/nexus --timeout=120s
helm --kube-context "$CONTEXT" status nexus -n "$NAMESPACE" -o json > "$ROOT/.nexus/evidence/rollback.json"
python3 - "$ROOT/.nexus/evidence/rollback.json" <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))['info']['status']=='deployed'
print('Kubernetes: readiness, rolling availability, and atomic rollback passed')
PY
