# OpenForm GitOps deployment

Pipeline: GitHub → GitHub Actions → GHCR → Argo CD → Kubernetes/k3s → Traefik.

## Bootstrap once
1. Install Argo CD in the target cluster.
2. If this repository is private, configure Argo CD repository credentials for `b15145456/openform`.
3. Replace `openform.example.com` in `deploy/k8s/ingress.yaml` with the production DNS name.
4. Apply `deploy/argocd/application.yaml` once to register the application.
5. Point DNS at the Traefik ingress address.

After bootstrap, Argo CD continuously reconciles `deploy/k8s` from `main`.

Images are published to `ghcr.io/b15145456/openform` by GitHub Actions after tests/build pass.
