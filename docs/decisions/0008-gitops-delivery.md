# ADR-0008: GitOps delivery
- Status: Accepted
- Date: 2026-09-12

OpenForm uses GitHub Actions for CI, Docker for packaging, GHCR for image distribution, Argo CD for continuous delivery, Kubernetes/k3s as runtime, and Traefik as ingress. Git remains desired-state authority. CI does not directly run `kubectl apply` against production.
