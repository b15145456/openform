# Changelog

## [0.2.0-alpha.4] - 2026-09-12

### Added
- Automated immutable-image GitOps promotion after successful CI/container publishing.
- GitHub Actions build cache.
- RollingUpdate deployment policy and hardened pod/container security context.
- Kubernetes NetworkPolicy.
- Dependabot for npm, Actions and Docker dependencies.
- One-command Argo CD bootstrap and deployment verification scripts.
- Production deployment runbook.

### Deployment status
- Everything that can be repository-automated is configured.
- Remaining production bootstrap requires the target cluster, Argo CD and DNS/operator credentials.

## [0.2.0-alpha.3] - 2026-09-12
- Added GitHub Actions → Docker → GHCR → Argo CD → Kubernetes/k3s → Traefik GitOps delivery.

## [0.2.0-alpha.2] - 2026-09-12
- Runtime Definition validation, dynamic controls, tests and mobile Mattress workflow.

## [0.1.0-alpha.1] - 2026-09-12
- Initial OpenForm specifications and GitHub source-of-truth governance.
