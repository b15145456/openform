# Changelog

## [0.2.0-alpha.3] - 2026-09-12

### Added
- Industry-standard GitOps delivery path: GitHub Actions → Docker → GHCR → Argo CD → Kubernetes/k3s → Traefik.
- Multi-stage production container with nginx and health endpoint.
- Kubernetes Deployment, Service, Ingress, probes and resource limits.
- Argo CD Application with automated prune/self-heal.
- CI publishes immutable commit-SHA image and `latest` only after tests/build succeed.

### Deployment status
- GitOps manifests are ready for cluster bootstrap.
- Production host remains intentionally `openform.example.com` until the real DNS name is supplied.
- Actual Argo CD sync requires access to the target Kubernetes/Argo CD environment.

## [0.2.0-alpha.2] - 2026-09-12
- Runtime Definition validation, dynamic controls, tests and mobile Mattress workflow.

## [0.1.0-alpha.1] - 2026-09-12
- Initial OpenForm specifications and GitHub source-of-truth governance.
