# Production deployment

OpenForm uses GitOps: GitHub Actions tests/builds, publishes an immutable image to GHCR, then commits that SHA into the Kubernetes desired state. Argo CD observes `main` and performs the cluster deployment. CI never receives cluster credentials.

## One-time operator prerequisites
- A Kubernetes/k3s cluster with Traefik.
- Argo CD installed and reachable by the cluster operator.
- Production DNS hostname pointing at Traefik.
- If the GitHub repository or GHCR package is private, configure Argo CD repository credentials and a Kubernetes GHCR imagePullSecret.

## Bootstrap
Replace `openform.example.com` in `deploy/k8s/ingress.yaml`, commit it, then run `./deploy/bootstrap.sh` from a workstation with the target kubeconfig. Verify with `./deploy/verify.sh`.

After bootstrap, normal releases require only a push to `main`: CI → GHCR → Git manifest promotion → Argo CD reconciliation.
