# Changelog

All meaningful OpenForm iterations and deployments should be recorded here.

## [0.1.0-alpha.1] - 2026-09-12

### Added

- Established GitHub as the canonical source of truth for OpenForm.
- Added initial product specification.
- Added initial architecture specification separating authoring and runtime planes.
- Added initial OpenForm Definition contract.
- Added initial OpenForm Record Language exchange contract.
- Added ADR-0001 for source-of-truth governance.
- Added ADR-0002 defining LLM-assisted authoring as separate from deterministic runtime.
- Added chronological project log.

### Architecture

- LLM calls are explicit authoring operations, not automatic runtime behavior.
- OpenForm Definitions are versioned artifacts consumed by deterministic runtime components.
- OpenForm Records are separate from definitions and carry stable semantic type and definition identity.

### Release process

From this iteration onward, deployable changes must update release notes. Release notes should describe user-visible changes, contract/schema changes, migrations or compatibility impact, and deployment-relevant changes.

### Known gaps

- JSON Schemas are not yet formalized.
- Identifier/namespace conventions are not finalized.
- Compatibility policy is not finalized.
- Runtime/API implementation and automated deployment pipeline are not yet defined in the repository.
