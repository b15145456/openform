#!/bin/sh
set -eu
command -v kubectl >/dev/null || { echo 'kubectl is required'; exit 1; }
kubectl get crd applications.argoproj.io >/dev/null 2>&1 || { echo 'Argo CD is not installed'; exit 1; }
echo 'Applying OpenForm Argo CD Application...'
kubectl apply -f deploy/argocd/application.yaml
echo 'OpenForm registered. Argo CD will reconcile deploy/k8s from GitHub main.'
