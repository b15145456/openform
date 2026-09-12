# OpenForm Project Handoff

Date: 2026-09-12
Source of Truth: `b15145456/openform` / `main`
Reviewed commit: `545ad20fede3a7be045bec441ef0003b0cd73ce7`

## 1. Product goal

OpenForm is an LLM-independent data-collection runtime. The intended model is:

`External LLM → OpenForm Definition → Validate → Dynamic Renderer → Record → Export/Import`

OpenForm must not depend on ChatGPT, Claude, Gemini, or another LLM at runtime. Definitions use stable machine IDs; labels are presentation only. GitHub is the authoritative project record.

Immediate product goal: a mobile-friendly Mattress data-collection app usable during store consultations, while evolving toward a general Definition-driven runtime.

## 2. Verification result — IMPORTANT

A repository audit on 2026-09-12 found that `main` is **not currently a runnable OpenForm application**.

Current `app/index.html` references `./app.js`, but `app/app.js` does not exist. The `app/` directory currently contains only `index.html` and `style.css`. There is also no root `package.json`, while the Dockerfile and CI expect npm commands (`npm install`, `npm test`, `npm run build`) and a generated `/app/dist` directory.

Therefore the current state must NOT be described as production-ready, successfully built, or deployable. The GitOps infrastructure is present, but the application runtime needs to be restored/implemented before deployment.

## 3. Requirements checklist

### Product architecture
- [x] Product/architecture documentation exists.
- [x] GitHub Source-of-Truth ADR exists.
- [x] LLM-authoring-not-runtime ADR exists.
- [ ] Definition-driven runtime executable on `main`.
- [ ] Definition validation executable on `main`.
- [ ] Record Spec implementation executable on `main`.
- [ ] Semantic Registry implementation completed.

### Definition field support required for v1
- [ ] text
- [ ] textarea
- [ ] number
- [ ] rating
- [ ] select (store option `value`, never UI label)
- [ ] multi_select
- [ ] boolean
- [ ] date
- [ ] time
- [ ] datetime
- [ ] duration
- [ ] image
- [ ] video
- [ ] audio
- [ ] location
- [ ] barcode
- [ ] signature
- [ ] collection
- [ ] recursively nested collection (critical: Workout → Exercises[] → Sets[])

Do not introduce arbitrary JavaScript, shell, SQL, executable expressions, or workflow execution into Definition v1.

### Mattress MVP
- [ ] Create record
- [ ] Edit record
- [ ] Delete record
- [ ] View previous records
- [ ] Local persistence
- [ ] JSON export
- [ ] CSV export
- [ ] YAML/JSON Definition import + validation + preview
- [ ] Mattress template with store, brand, model, size, price/all-in price, materials, spring, zones, edge support, firmness, back/side comfort, motion isolation, breathability, overall comfort, trial/return/warranty/indentation/delivery/notes.
- [ ] Mobile workflow manually verified.
- [ ] Comparison UI (can follow core MVP).

### Templates/examples/spec
- [ ] Confirm canonical `spec/definition.schema.json` and `spec/record.schema.json` exist and match runtime behavior.
- [ ] Semantic types registry and canonical units documented/validated.
- [ ] Mattress template.
- [ ] Workout template demonstrating nested collections.
- [ ] Inspection template.
- [ ] Corresponding examples.
- [ ] ADRs for stable field identity, nested collections, semantic types, declarative media capabilities and Definition/Record separation.

### Tests/quality
- [ ] Restore/create `package.json` and deterministic dependency lock file.
- [ ] Unit tests for Definition validation.
- [ ] Tests for stable IDs and select value semantics.
- [ ] Recursive nested-collection tests.
- [ ] Record serialization/export tests.
- [ ] Build succeeds locally/CI.
- [ ] Mobile smoke test.

## 4. Deployment status

The repository contains the target GitOps architecture:

`GitHub → GitHub Actions → Docker → GHCR → Argo CD → Kubernetes/k3s → Traefik`

Present infrastructure includes Docker/nginx config, Kubernetes Deployment/Service/Ingress/NetworkPolicy, Argo CD Application, health probes, Dependabot, bootstrap and verification scripts, and immutable-image promotion logic.

However deployment is blocked until the runtime/build is repaired. Additional production prerequisites:
- target k3s/Kubernetes cluster;
- Argo CD installed;
- real production hostname replacing `openform.example.com`;
- DNS pointed at Traefik;
- GitHub/GHCR credentials if repository/package is private;
- first Argo CD Application bootstrap and successful sync;
- production HTTP/mobile verification.

A temporary Vercel deployment was requested for immediate use, but the available Vercel deployment integration failed before a deployment was submitted. Do not treat Vercel as successfully deployed.

## 5. Recommended execution order

P0: Restore the executable OpenForm runtime on top of current `main`; make CI green; verify Mattress create/edit/delete/view/persist/export on mobile.

P1: Complete Definition v1 renderer/validation, especially recursive collection and all required field types; align schemas/spec/examples with runtime.

P2: Deploy a temporary immediately accessible build if desired, while retaining Argo CD as the target production path.

P3: Bootstrap k3s + Argo CD, configure DNS/GHCR access, sync production and run `deploy/verify.sh`.

P4: Add shared backend/auth only when multi-user shared records are required. Current intended MVP can remain local-first; multiple visitors do not automatically share localStorage records.

## 6. Acceptance criteria before saying “done”

Do not declare OpenForm complete or deployed unless all applicable checks are evidenced:
1. CI test and build are green.
2. Mattress workflow works end-to-end on a mobile viewport/device.
3. Refresh preserves records.
4. JSON and CSV exports are valid.
5. Imported Definition is validated before app creation.
6. Records store stable field IDs and Definition id/version.
7. Production deployment reports healthy/synced status.
8. The public URL returns the current OpenForm build.
9. CHANGELOG/release notes identify the deployed commit.

## 7. Next engineer instruction

Start from current `main`; do not resurrect an older tree wholesale or force-push. Reintroduce missing runtime files deliberately, preserving the current mobile CSS and GitOps work. Every material behavior/spec change must be committed to GitHub and reflected in CHANGELOG/spec/ADR as appropriate.
