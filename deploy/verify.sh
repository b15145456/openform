#!/bin/sh
set -eu
kubectl -n openform rollout status deployment/openform --timeout=120s
kubectl -n openform get pods,svc,ingress
kubectl -n argocd get application openform -o jsonpath='{.status.sync.status}{" / "}{.status.health.status}{"\n"}'
